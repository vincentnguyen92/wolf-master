import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import {
  GameDatabase,
  deleteGame,
  loadGames,
  saveGame,
} from "../src/storage/db";
import { createGame, execute } from "../src/engine/engine";
import { demoConfig } from "../src/lib/demo";
import { replay } from "../src/events/replay";
it("IndexedDB survives close/reopen and replay restores current action", async () => {
  const name = crypto.randomUUID();
  const first = new GameDatabase(name);
  let g = createGame(demoConfig());
  await saveGame(g, first);
  g = execute(g, { type: "start" });
  await saveGame(g, first);
  first.close();
  const reopened = new GameDatabase(name);
  const stored = (await loadGames(reopened))[0];
  expect(replay(stored.events)).toEqual(replay(g.events));
  await reopened.delete();
});
it("optimistic revision prevents another tab overwriting a game", async () => {
  const db = new GameDatabase(crypto.randomUUID());
  const g = createGame(demoConfig());
  await saveGame(g, db);
  const newer = execute(g, { type: "start" });
  await saveGame(newer, db);
  await expect(saveGame(newer, db)).rejects.toThrow("tab khác");
  await db.delete();
});
it("wizard draft survives database close before setup is confirmed", async () => {
  const name = crypto.randomUUID(),
    first = new GameDatabase(name),
    config = demoConfig();
  await first.drafts.put({
    id: "draft",
    config,
    step: 1,
    counts: {
      werewolf: 2,
      guard: 1,
      seer: 1,
      witch: 1,
      hunter: 1,
      villager: 2,
      wolf_cub: 0,
      tanner: 0,
    },
  });
  first.close();
  const reopened = new GameDatabase(name);
  expect((await reopened.drafts.get("draft"))?.config.players).toEqual(
    config.players,
  );
  await reopened.delete();
});
it("deleteGame removes the game and its wizard draft", async () => {
  const db = new GameDatabase(crypto.randomUUID());
  const keep = createGame(demoConfig()),
    gone = createGame(demoConfig());
  await saveGame(keep, db);
  await saveGame(gone, db);
  await db.drafts.put({
    id: gone.id,
    config: demoConfig(),
    step: 0,
    counts: {
      werewolf: 2,
      guard: 1,
      seer: 1,
      witch: 1,
      hunter: 1,
      villager: 2,
      wolf_cub: 0,
      tanner: 0,
    },
  });
  await deleteGame(gone.id, db);
  expect((await loadGames(db)).map((g) => g.id)).toEqual([keep.id]);
  expect(await db.drafts.get(gone.id)).toBeUndefined();
  await db.delete();
});
