import { eventText } from "../src/story/narrative";
import { describe, expect, it } from "vitest";
import { createGame, execute, type Command } from "../src/engine/engine";
import {
  defaultSettings,
  type Game,
  type GameEvent,
  type GameSettings,
  type RoleId,
} from "../src/domain/types";
import { replay, effectiveEvents } from "../src/events/replay";
import {
  evaluateVictory,
  getAvailableActions,
  getCurrentAction,
} from "../src/engine/selectors";
import { statistics } from "../src/statistics/statistics";
import { storyRecap, playerStory } from "../src/story/narrative";
function setup(
  settings: Partial<GameSettings> = {},
  distribution: RoleId[] = [
    "werewolf",
    "guard",
    "seer",
    "witch",
    "hunter",
    "villager",
    "villager",
    "werewolf",
  ],
): Game {
  return createGame({
    name: "Kiểm thử",
    settings: { ...defaultSettings, ...settings },
    players: distribution.map((role, i) => ({
      id: String(i),
      name: `P${i}`,
      role,
    })),
  });
}
const start = (settings: Partial<GameSettings> = {}) =>
  execute(setup(settings), { type: "start" });
function act(
  g: Game,
  targetId?: string,
  extra: { heal?: boolean; poisonId?: string } = {},
): Game {
  const a = getCurrentAction(replay(g.events))!;
  if (a.kind === "hunter") return execute(g, { type: "hunter", targetId });
  return execute(g, {
    type: "night",
    action: { kind: a.kind, actorId: a.actorId, targetId, ...extra },
  });
}
function night(
  g: Game,
  victim?: string,
  guard?: string,
  witch: { heal?: boolean; poisonId?: string } = {},
): Game {
  g = act(g, victim);
  g = act(g, guard);
  g = act(
    g,
    replay(g.events).players.find((p) => p.alive && p.role === "werewolf")?.id,
  );
  g = act(g, undefined, witch);
  return execute(g, { type: "resolveNight" });
}
function nextNight(g: Game): Game {
  g = execute(g, { type: "advance" });
  return execute(g, { type: "nominate" });
}
function hang(g: Game, suspect: string): Game {
  g = execute(g, { type: "advance" });
  g = execute(g, { type: "nominate", targetId: suspect });
  return execute(g, { type: "verdict", execute: true });
}
const alive = (g: Game, id: string) =>
  replay(g.events).players.find((p) => p.id === id)!.alive;
describe("deterministic game engine", () => {
  it("wolf attack kills after resolution only", () => {
    let g = start();
    g = act(g, "5");
    expect(alive(g, "5")).toBe(true);
    g = act(g, "1");
    g = act(g, "0");
    g = act(g);
    g = execute(g, { type: "resolveNight" });
    expect(alive(g, "5")).toBe(false);
    expect(replay(g.events).players[5].death?.cause).toBe("WOLF_ATTACK");
  });
  it("guard blocks wolves", () =>
    expect(alive(night(start(), "5", "5"), "5")).toBe(true));
  it("witch heal blocks wolves", () =>
    expect(alive(night(start(), "5", "1", { heal: true }), "5")).toBe(true));
  it("poison kills through protection", () =>
    expect(alive(night(start(), undefined, "5", { poisonId: "5" }), "5")).toBe(
      false,
    ));
  it("heal does not stop poison and duplicate death is suppressed", () => {
    const g = night(start({ canUseBothPotionsSameNight: true }), "5", "1", {
      heal: true,
      poisonId: "5",
    });
    expect(replay(g.events).players[5].death?.cause).toBe("WITCH_POISON");
  });
  it("potion cannot be reused", () => {
    let g = nextNight(night(start(), "5", "1", { heal: true }));
    g = act(g, "6");
    g = act(g, "2");
    g = act(g, "0");
    expect(() => act(g, undefined, { heal: true })).toThrow("bình cứu");
  });
  it("guard cannot repeat consecutive target", () => {
    let g = nextNight(night(start(), undefined, "1"));
    g = act(g);
    expect(() => act(g, "1")).toThrow("Mục tiêu");
  });
  it("guard repetition is configurable", () => {
    let g = nextNight(
      night(start({ canProtectSamePlayerConsecutively: true }), undefined, "1"),
    );
    g = act(g);
    expect(() => act(g, "1")).not.toThrow();
  });
  it("seer gets wolf result", () => {
    let g = act(act(start()), "1");
    g = act(g, "0");
    expect(replay(g.events).nightActions.at(-1)?.result).toBe(true);
  });
  it("seer gets non-wolf result", () => {
    let g = act(act(start()), "1");
    g = act(g, "5");
    expect(replay(g.events).nightActions.at(-1)?.result).toBe(false);
  });
  it("hunter death queues a trigger", () =>
    expect(
      getCurrentAction(replay(night(start(), "4", "1").events))?.kind,
    ).toBe("hunter"));
  it("hunter shot kills target and is undoable as a batch", () => {
    const g = night(start(), "4", "1");
    const shot = execute(g, { type: "hunter", targetId: "0" });
    expect(alive(shot, "0")).toBe(false);
    expect(replay(shot.events).pendingHunters).toEqual([]);
    expect(replay(execute(shot, { type: "undo" }).events)).toEqual(
      replay(g.events),
    );
  });
  it("village victory", () => {
    const s = replay(start().events);
    s.players
      .filter((p) => p.role === "werewolf")
      .forEach((p) => (p.alive = false));
    expect(evaluateVictory(s)?.team).toBe("village");
  });
  it("wolf parity victory", () => {
    const s = replay(start().events);
    s.players.slice(1, 5).forEach((p) => (p.alive = false));
    expect(evaluateVictory(s)?.team).toBe("wolves");
  });
  it("victory waits for hunter", () => {
    const s = replay(start().events);
    s.players
      .filter((p) => p.role === "werewolf")
      .forEach((p) => (p.alive = false));
    s.pendingHunters = ["4"];
    expect(evaluateVictory(s)).toBeUndefined();
  });
  it("undo restores state without erasing history", () => {
    const g = start(),
      changed = act(g, "5"),
      undone = execute(changed, { type: "undo" });
    expect(replay(undone.events)).toEqual(replay(g.events));
    expect(undone.events.length).toBe(changed.events.length + 1);
  });
  it("repeated undo and new branch reconstruct correctly", () => {
    let g = start();
    g = act(g, "5");
    g = act(g, "1");
    g = execute(g, { type: "undo" });
    g = execute(g, { type: "undo" });
    g = act(g, "6");
    expect(replay(g.events).nightActions.map((a) => a.targetId)).toEqual(["6"]);
  });
  it("JSON replay reconstructs identical state", () => {
    const g = night(start(), "5", "5");
    expect(replay(JSON.parse(JSON.stringify(g.events)))).toEqual(
      replay(g.events),
    );
  });
  it("dead roles do not act and disappear from sequence when pretend calls are off", () => {
    const g = nextNight(
      night(start({ callAllRolesEachNight: false }), "2", "1"),
    );
    expect(
      getAvailableActions(replay(g.events)).map((a) => a.kind),
    ).not.toContain("seer");
    expect(() =>
      execute(g, {
        type: "night",
        action: { kind: "seer", actorId: "2", targetId: "0" },
      }),
    ).toThrow();
  });
  it("sequence excludes absent roles", () => {
    const g = execute(
      setup({}, ["werewolf", "villager", "villager", "villager"]),
      { type: "start" },
    );
    expect(getAvailableActions(replay(g.events)).map((a) => a.kind)).toEqual([
      "werewolf",
    ]);
  });
  it("self-heal setting is enforced", () => {
    let g = act(start({ canHealSelf: false }), "3");
    g = act(g, "1");
    g = act(g, "0");
    expect(() => act(g, undefined, { heal: true })).toThrow();
  });
  it("both-potion setting is enforced", () => {
    let g = act(start(), "5");
    g = act(g, "1");
    g = act(g, "0");
    expect(() => act(g, undefined, { heal: true, poisonId: "0" })).toThrow();
  });
  it("cannot attack a fellow wolf", () =>
    expect(() => act(start(), "7")).toThrow());
  it("rejects skipping unresolved night steps", () =>
    expect(() => execute(start(), { type: "resolveNight" })).toThrow());
  it("only a living suspect can be put on trial, one step at a time", () => {
    let g = night(start(), "5", "1");
    g = execute(g, { type: "advance" });
    expect(() => execute(g, { type: "nominate", targetId: "5" })).toThrow(
      "còn sống",
    );
    expect(() => execute(g, { type: "verdict", execute: true })).toThrow();
    expect(() => execute(g, { type: "advance" })).toThrow("nghi ngờ");
    g = execute(g, { type: "nominate", targetId: "0" });
    expect(replay(g.events).stage).toBe("defense");
    expect(() => execute(g, { type: "advance" })).toThrow("treo cổ hay tha");
  });
  it("sparing the suspect goes straight to night", () => {
    let g = night(start(), undefined, "1");
    g = execute(g, { type: "advance" });
    g = execute(g, { type: "nominate", targetId: "0" });
    g = execute(g, { type: "verdict", execute: false });
    const s = replay(g.events);
    expect(s.phase).toBe("night");
    expect(s.round).toBe(2);
    expect(s.players[0].alive).toBe(true);
    expect(storyRecap(g.events)).toContain("tha cho P0");
  });
  it("hanging the suspect kills them and waits on the verdict screen", () => {
    const g = hang(night(start(), undefined, "1"), "7");
    const s = replay(g.events);
    expect(s.stage).toBe("verdict");
    expect(s.players[7].death?.cause).toBe("VOTE_EXECUTION");
    expect(replay(execute(g, { type: "undo" }).events).players[7].alive).toBe(
      true,
    );
    expect(replay(execute(g, { type: "advance" }).events).phase).toBe("night");
  });
  it("games recorded with per-player ballots still replay and continue", () => {
    let g = night(start(), undefined, "1");
    g = execute(g, { type: "advance" });
    const discussion = g.events.at(-1)!;
    const legacy = (data: object) =>
      ({
        ...discussion,
        ...data,
        id: crypto.randomUUID(),
        transactionId: crypto.randomUUID(),
      }) as GameEvent;
    g = {
      ...g,
      events: [
        ...g.events,
        legacy({ type: "VOTING_STARTED", payload: {} }),
        legacy({
          type: "VOTE_CAST",
          payload: { voterId: "1", targetId: "7" },
        }),
      ],
    };
    expect(replay(g.events).stage).toBe("voting");
    expect(
      statistics(g.events).find((s) => s.label === "Nhận nhiều phiếu nhất")
        ?.value,
    ).toBe("P7 · 1 lượt");
    g = execute(g, { type: "nominate", targetId: "7" });
    expect(replay(g.events).stage).toBe("defense");
  });
  it("statistics count trials and verdicts", () => {
    let g = nextNight(night(start(), undefined, "1"));
    g = night(g);
    g = execute(g, { type: "advance" });
    g = execute(g, { type: "nominate", targetId: "7" });
    g = execute(g, { type: "verdict", execute: false });
    g = night(g);
    g = hang(g, "7");
    const stats = statistics(g.events);
    expect(
      stats.find((s) => s.label === "Bị đưa lên thanh minh nhiều nhất")?.value,
    ).toBe("P7 · 2 lượt");
    expect(stats.find((s) => s.label === "Treo cổ / Tha")?.value).toBe("1 / 1");
  });
  it("complete two-round simulation verifies stories, statistics, death and ending undo", () => {
    let g = setup();
    const send = (c: Command) => {
      g = execute(g, c);
    };
    send({ type: "start" });
    g = night(g, "5", "5");
    g = hang(g, "0");
    send({ type: "advance" });
    g = night(g, "6", "1", { poisonId: "7" });
    expect(evaluateVictory(replay(g.events))?.team).toBe("village");
    send({ type: "end" });
    const s = replay(g.events);
    expect(s.phase).toBe("ended");
    expect(s.round).toBe(2);
    expect(s.players[0].death?.cause).toBe("VOTE_EXECUTION");
    expect(s.players[6].death?.cause).toBe("WOLF_ATTACK");
    expect(s.players[7].death?.cause).toBe("WITCH_POISON");
    expect(storyRecap(g.events)).toContain("P7 (Ma Sói) chết vì bình độc");
    expect(playerStory(g.events, "2").length).toBe(2);
    expect(
      statistics(g.events).find(
        (x) => x.label === "Lượt bảo vệ trúng mục tiêu Sói",
      )?.value,
    ).toBe("1");
    expect(effectiveEvents(g.events).at(-1)?.type).toBe("GAME_ENDED");
    send({ type: "undo" });
    expect(replay(g.events).phase).toBe("day");
  });
});

it("undo night resolution restores all deaths and pending hunter together", () => {
  const before = act(act(act(act(start(), "4"), "1"), "0"), undefined, {
    poisonId: "5",
  });
  const after = execute(before, { type: "resolveNight" });
  expect(replay(after.events).pendingHunters).toEqual(["4"]);
  expect(replay(execute(after, { type: "undo" }).events)).toEqual(
    replay(before.events),
  );
});
it("undo potion action restores its resource", () => {
  const before = act(act(act(start(), "5"), "1"), "0");
  const used = act(before, undefined, { heal: true });
  expect(replay(used.events).players[3].roleState.usage.heal).toBe(true);
  expect(replay(execute(used, { type: "undo" }).events)).toEqual(
    replay(before.events),
  );
});
it("witch with both potions consumed is absent from next night when pretend calls are off", () => {
  const g = nextNight(
    night(
      start({
        canUseBothPotionsSameNight: true,
        callAllRolesEachNight: false,
      }),
      "5",
      "1",
      {
        heal: true,
        poisonId: "6",
      },
    ),
  );
  expect(
    getAvailableActions(replay(g.events)).map((a) => a.kind),
  ).not.toContain("witch");
});
it("poison resource cannot be reused", () => {
  let g = nextNight(night(start(), undefined, "1", { poisonId: "6" }));
  g = act(g);
  g = act(g, "2");
  g = act(g, "0");
  expect(() => act(g, undefined, { poisonId: "5" })).toThrow("bình độc");
});
it("one victim hit by wolf and poison generates a single death", () => {
  const g = night(start(), "5", "1", { poisonId: "5" });
  expect(
    effectiveEvents(g.events).filter(
      (e) => e.type === "PLAYER_KILLED" && e.payload.playerId === "5",
    ),
  ).toHaveLength(1);
  expect(replay(g.events).players[5].death?.cause).toBe("WOLF_ATTACK");
});
it("hunter poisoned can decline the mandatory trigger decision", () => {
  const g = night(start(), undefined, "1", { poisonId: "4" });
  expect(replay(g.events).pendingHunters).toEqual(["4"]);
  const resolved = execute(g, { type: "hunter" });
  expect(replay(resolved.events).pendingHunters).toEqual([]);
  expect(() => execute(resolved, { type: "hunter", targetId: "0" })).toThrow();
});
it("seer result cannot be forged by caller", () => {
  const g = act(act(start()), "1");
  const a = getCurrentAction(replay(g.events))!;
  const checked = execute(g, {
    type: "night",
    action: { kind: "seer", actorId: a.actorId, targetId: "0", result: false },
  });
  expect(replay(checked.events).nightActions.at(-1)?.result).toBe(true);
});
it("no role may borrow witch abilities", () => {
  const g = start();
  expect(() =>
    execute(g, {
      type: "night",
      action: { kind: "werewolf", actorId: "0", targetId: "5", poisonId: "6" },
    }),
  ).toThrow("bình thuốc");
});
it("events do not retain mutable references to caller config", () => {
  const config = {
    name: "Original",
    settings: { ...defaultSettings },
    players: [{ id: "a", name: "Original player", role: "villager" as RoleId }],
  };
  const g = createGame(config);
  config.players[0].name = "Changed";
  config.settings.canHealSelf = false;
  expect(replay(g.events).players[0].name).toBe("Original player");
  expect(replay(g.events).settings.canHealSelf).toBe(true);
});
it("healed player and every wolf receive relevant story entries", () => {
  const g = night(start(), "5", "1", { heal: true });
  expect(
    playerStory(g.events, "5").some((line) => line.includes("bình cứu cho P5")),
  ).toBe(true);
  expect(
    playerStory(g.events, "7").some((line) => line.includes("Bầy Sói chọn P5")),
  ).toBe(true);
});
it("game creation cannot be undone", () =>
  expect(() => execute(setup(), { type: "undo" })).toThrow("Chưa có thao tác"));
it("only dead roles with a death trigger enter pending queue", () => {
  const g = night(start(), "2", "1");
  expect(replay(g.events).pendingHunters).toEqual([]);
});
it("blocked wolf attack is factual even if the same target dies of poison", () => {
  const g = night(start(), "5", "5", { poisonId: "5" }),
    story = storyRecap(g.events);
  expect(story).toContain("Đòn cắn nhắm vào P5 bị chặn bởi Bảo vệ");
  expect(story).toContain("P5 (Dân thường) chết vì bình độc");
});
it("hunter executed at wolf parity gets to shoot before victory", () => {
  let g = execute(setup({}, ["werewolf", "hunter", "villager", "villager"]), {
    type: "start",
  });
  g = act(g, "2");
  g = hang(execute(g, { type: "resolveNight" }), "1");
  expect(evaluateVictory(replay(g.events))).toBeUndefined();
  expect(() => execute(g, { type: "end" })).toThrow();
  g = execute(g, { type: "hunter", targetId: "0" });
  expect(evaluateVictory(replay(g.events))?.team).toBe("village");
});
it("historical undone death remains renderable after player removal", () => {
  const g = night(start(), "5", "1");
  const death = g.events.find((e) => e.type === "PLAYER_KILLED")!;
  const state = replay(g.events);
  state.players = state.players.filter((p) => p.id !== "5");
  expect(() => eventText(death, state)).not.toThrow();
  expect(eventText(death, state)).toContain(
    "Người chơi không còn trong danh sách",
  );
});
describe("hunter settings", () => {
  const lynchHunter = (settings: Partial<GameSettings>) => {
    let g = execute(
      setup(settings, [
        "werewolf",
        "hunter",
        "villager",
        "villager",
        "villager",
      ]),
      { type: "start" },
    );
    g = act(g, "2");
    return hang(execute(g, { type: "resolveNight" }), "1");
  };
  it("hunter executed by the village can be denied the shot", () => {
    expect(replay(lynchHunter({}).events).pendingHunters).toEqual(["1"]);
    const g = lynchHunter({ hunterShootsWhenExecuted: false });
    expect(replay(g.events).pendingHunters).toEqual([]);
    expect(storyRecap(g.events)).toContain("Thợ săn không được bắn");
  });
  it("hunter poisoned by the witch can be denied the shot", () => {
    const g = night(
      start({ hunterShootsWhenPoisoned: false }),
      undefined,
      "1",
      { poisonId: "4" },
    );
    expect(replay(g.events).players[4].alive).toBe(false);
    expect(replay(g.events).pendingHunters).toEqual([]);
  });
  it("a wolf bite always lets the hunter shoot", () => {
    const g = night(
      start({
        hunterShootsWhenExecuted: false,
        hunterShootsWhenPoisoned: false,
      }),
      "4",
    );
    expect(replay(g.events).pendingHunters).toEqual(["4"]);
  });
  it("games saved before these settings keep letting the hunter shoot", () => {
    const g = setup();
    const created = g.events[0];
    if (created.type !== "GAME_CREATED") throw new Error("unexpected event");
    const legacy = { ...created.payload.settings } as Partial<GameSettings>;
    delete legacy.hunterShootsWhenExecuted;
    delete legacy.hunterShootsWhenPoisoned;
    created.payload.settings = legacy as GameSettings;
    const s = replay(g.events).settings;
    expect(s.hunterShootsWhenExecuted).toBe(true);
    expect(s.hunterShootsWhenPoisoned).toBe(true);
  });
});
describe("pretend calls", () => {
  const sequence = (g: Game) =>
    getAvailableActions(replay(g.events)).map(
      (a) => `${a.kind}${a.fake ? ":giả" : ""}`,
    );
  it("a dead role is still called in its usual place", () => {
    let g = nextNight(night(start(), "2", "1"));
    expect(sequence(g)).toEqual(["werewolf", "guard", "seer:giả", "witch"]);
    g = act(g, "5");
    g = act(g, "6");
    expect(getCurrentAction(replay(g.events))?.fake).toBe(true);
    expect(() => act(g, "0")).toThrow("chưa được hành động");
    expect(() => execute(g, { type: "resolveNight" })).toThrow();
    g = execute(g, { type: "fakeCall" });
    expect(getCurrentAction(replay(g.events))?.kind).toBe("witch");
    expect(
      getCurrentAction(replay(execute(g, { type: "undo" }).events))?.fake,
    ).toBe(true);
    expect(() => execute(g, { type: "fakeCall" })).toThrow("gọi giả");
    g = execute(act(g), { type: "resolveNight" });
    expect(storyRecap(g.events)).not.toContain("gọi giả");
  });
  it("a witch who empties her last potion tonight is only pretend-called from the next night", () => {
    let g = act(start({ canUseBothPotionsSameNight: true }), "5");
    g = act(g, "1");
    g = act(g, "0");
    g = act(g, undefined, { heal: true, poisonId: "6" });
    expect(sequence(g)).toEqual([]);
    g = nextNight(execute(g, { type: "resolveNight" }));
    expect(sequence(g)).toEqual(["werewolf", "guard", "seer", "witch:giả"]);
  });
  it("roles absent from the deck are never called", () => {
    let g = execute(
      setup({}, ["werewolf", "seer", "villager", "villager", "villager"]),
      { type: "start" },
    );
    expect(sequence(g)).toEqual(["werewolf", "seer"]);
    g = nextNight(execute(act(act(g, "1")), { type: "resolveNight" }));
    expect(sequence(g)).toEqual(["werewolf", "seer:giả"]);
  });
});
