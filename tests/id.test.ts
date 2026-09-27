import { afterEach, expect, it, vi } from "vitest";
import { createGame, execute } from "../src/engine/engine";
import { replay } from "../src/events/replay";
import { demoConfig } from "../src/lib/demo";
import { newId } from "../src/lib/id";

afterEach(() => vi.unstubAllGlobals());

it("creates distinct UUID v4 IDs when randomUUID is unavailable", () => {
  const randomValues = globalThis.crypto.getRandomValues.bind(
    globalThis.crypto,
  );
  vi.stubGlobal("crypto", { getRandomValues: randomValues });

  const ids = Array.from({ length: 100 }, () => newId());
  expect(new Set(ids).size).toBe(100);
  for (const id of ids) {
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  }
});

it("creates and advances a game without randomUUID", () => {
  const randomValues = globalThis.crypto.getRandomValues.bind(
    globalThis.crypto,
  );
  vi.stubGlobal("crypto", { getRandomValues: randomValues });

  const game = createGame(demoConfig());
  const started = execute(game, { type: "start" });
  expect(new Set(started.events.map((event) => event.id)).size).toBe(2);
  expect(replay(started.events).phase).toBe("night");
  expect(started.events[0].gameId).toBe(game.id);
});
