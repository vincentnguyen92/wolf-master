import { expect, it } from "vitest";
import { createGame, execute } from "../src/engine/engine";
import { replay } from "../src/events/replay";
import { demoConfig } from "../src/lib/demo";
import { rematchConfig } from "../src/lib/rematch";
it("rematch keeps names, roles and rules but not player ids", () => {
  const config = demoConfig();
  config.settings.canHealSelf = false;
  const state = replay(execute(createGame(config), { type: "start" }).events);
  const next = rematchConfig(state, "Làng mới");
  expect(next.name).toBe("Làng mới");
  expect(next.settings).toEqual(state.settings);
  expect(next.settings).not.toBe(state.settings);
  expect(next.players.map(({ name, role }) => ({ name, role }))).toEqual(
    config.players.map(({ name, role }) => ({ name, role })),
  );
  const oldIds = new Set(state.players.map((p) => p.id));
  expect(next.players.every((p) => !oldIds.has(p.id))).toBe(true);
  expect(() => createGame(next)).not.toThrow();
});
