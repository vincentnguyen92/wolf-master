import { describe, expect, it } from "vitest";
import { createGame, execute } from "../src/engine/engine";
import { replay } from "../src/events/replay";
import { evaluateVictory, getCurrentAction } from "../src/engine/selectors";
import { seerResult } from "../src/roles/abilities";
import { storyRecap } from "../src/story/narrative";
import { defaultSettings, type Game, type RoleId } from "../src/domain/types";
// 0 Sói · 1 Sói con · 2 Tiên tri · 3 Phù thủy · 4,5,7 Dân làng · 6 Kẻ chán đời
const table: RoleId[] = [
  "werewolf",
  "wolf_cub",
  "seer",
  "witch",
  "villager",
  "villager",
  "tanner",
  "villager",
];
function start(roles: RoleId[] = table): Game {
  const g = createGame({
    name: "Vai mới",
    settings: { ...defaultSettings },
    players: roles.map((role, i) => ({ id: String(i), name: `P${i}`, role })),
  });
  return execute(g, { type: "start" });
}
const state = (g: Game) => replay(g.events);
function act(
  g: Game,
  targetId?: string,
  extra: { heal?: boolean; healedId?: string; poisonId?: string } = {},
): Game {
  const a = getCurrentAction(state(g))!;
  if (a.kind === "hunter") throw new Error("Không có Thợ săn trong bàn này.");
  return execute(g, {
    type: "night",
    action: { kind: a.kind, actorId: a.actorId, targetId, ...extra },
  });
}
// Returns at night when nobody is hanged, or on the verdict screen otherwise.
function day(g: Game, lynch?: string): Game {
  g = execute(g, { type: "advance" });
  g = execute(g, { type: "nominate", targetId: lynch });
  return lynch ? execute(g, { type: "verdict", execute: true }) : g;
}
const alive = (g: Game, id: string) =>
  state(g).players.find((p) => p.id === id)!.alive;
describe("Sói con", () => {
  it("hunts with the pack, cannot be bitten and reads as a wolf", () => {
    const g = start(),
      a = getCurrentAction(state(g))!;
    expect(a.kind).toBe("werewolf");
    expect(a.actorIds).toEqual(["0", "1"]);
    expect(a.eligibleIds).not.toContain("0");
    expect(a.eligibleIds).not.toContain("1");
    expect(seerResult(state(g), "1")).toBe(true);
    expect(seerResult(state(g), "6")).toBe(false);
  });
  it("still lets the pack hunt when only the cub is left", () => {
    let g = act(start(), "4");
    g = act(g, "0");
    g = act(g, undefined, { poisonId: "0" });
    g = execute(g, { type: "resolveNight" });
    g = day(g);
    const a = getCurrentAction(state(g))!;
    expect(a.kind).toBe("werewolf");
    expect(a.actorIds).toEqual(["1"]);
  });
  it("dying at night makes the pack bite two people the next night", () => {
    let g = act(start(), "4");
    g = act(g, "1");
    g = act(g, undefined, { poisonId: "1" });
    g = execute(g, { type: "resolveNight" });
    expect(storyRecap(g.events)).toContain("cắn hai người");
    g = day(g);
    g = act(g, "5");
    expect(getCurrentAction(state(g))!.kind).toBe("werewolf");
    expect(getCurrentAction(state(g))!.eligibleIds).not.toContain("5");
    g = act(g, "7");
    expect(getCurrentAction(state(g))!.kind).toBe("seer");
    g = act(g, "6");
    g = act(g);
    g = execute(g, { type: "resolveNight" });
    expect(alive(g, "5")).toBe(false);
    expect(alive(g, "7")).toBe(false);
  });
  it("dying by vote enrages the same night, and only that night", () => {
    let g = act(start());
    g = act(g, "4");
    g = act(g);
    g = day(execute(g, { type: "resolveNight" }), "1");
    g = execute(g, { type: "advance" });
    g = act(g, "4");
    g = act(g, "5");
    g = act(g, "6");
    g = act(g);
    g = day(execute(g, { type: "resolveNight" }));
    g = act(g, "7");
    expect(getCurrentAction(state(g))!.kind).toBe("seer");
  });
  it("the witch chooses which of two victims to save", () => {
    let g = act(start(), "4");
    g = act(g, "1");
    g = act(g, undefined, { poisonId: "1" });
    g = day(execute(g, { type: "resolveNight" }));
    g = act(g, "5");
    g = act(g, "7");
    g = act(g, "6");
    expect(() => act(g, undefined, { heal: true })).toThrow("bình cứu");
    expect(() => act(g, undefined, { heal: true, healedId: "6" })).toThrow(
      "bình cứu",
    );
    g = act(g, undefined, { heal: true, healedId: "7" });
    g = execute(g, { type: "resolveNight" });
    expect(alive(g, "5")).toBe(false);
    expect(alive(g, "7")).toBe(true);
  });
});
describe("Kẻ chán đời", () => {
  it("wins alone when the village votes them out", () => {
    let g = act(start());
    g = act(g, "4");
    g = act(g);
    g = day(execute(g, { type: "resolveNight" }), "6");
    expect(evaluateVictory(state(g))?.team).toBe("neutral");
    expect(() => execute(g, { type: "advance" })).toThrow("phe thắng");
    g = execute(g, { type: "end" });
    expect(state(g).victory?.team).toBe("neutral");
    expect(storyRecap(g.events)).toContain("Kẻ chán đời chiến thắng");
  });
  it("does not win when killed any other way", () => {
    let g = act(start(), "6");
    g = act(g, "4");
    g = act(g);
    g = execute(g, { type: "resolveNight" });
    expect(alive(g, "6")).toBe(false);
    expect(evaluateVictory(state(g))).toBeUndefined();
  });
});
it("a table needs a grown Sói, not only a Sói con", () => {
  expect(() =>
    start(["wolf_cub", "seer", "villager", "villager", "villager"]),
  ).toThrow("lá Sói");
});
describe("house rules from the card backs", () => {
  const table: RoleId[] = [
    "werewolf",
    "wolf_cub",
    "seer",
    "guard",
    "villager",
    "villager",
    "tanner",
    "villager",
  ];
  const begin = (settings: Partial<typeof defaultSettings>) =>
    execute(
      createGame({
        name: "Luật lá bài",
        settings: { ...defaultSettings, ...settings },
        players: table.map((role, i) => ({
          id: String(i),
          name: `P${i}`,
          role,
        })),
      }),
      { type: "start" },
    );
  it("the seer may or may not see the cub as a wolf", () => {
    expect(seerResult(state(begin({})), "1")).toBe(true);
    expect(seerResult(state(begin({ seerSeesWolfCub: false })), "1")).toBe(
      false,
    );
  });
  it("the guard may be barred from guarding themselves", () => {
    let g = act(begin({ guardCanProtectSelf: false }), "4");
    expect(getCurrentAction(state(g))!.eligibleIds).not.toContain("3");
    g = act(begin({}), "4");
    expect(getCurrentAction(state(g))!.eligibleIds).toContain("3");
  });
  it("the tanner may win however they die, as printed on the card", () => {
    const bitten = (settings: Partial<typeof defaultSettings>) => {
      let g = act(begin(settings), "6");
      g = act(g);
      g = act(g, "0");
      return execute(g, { type: "resolveNight" });
    };
    expect(evaluateVictory(state(bitten({})))).toBeUndefined();
    expect(
      evaluateVictory(state(bitten({ tannerWinsOnAnyDeath: true })))?.team,
    ).toBe("neutral");
  });
});
