import Dexie, { type Table } from "dexie";
import type { Game, GameConfig, RoleId } from "../domain/types";
export interface WizardSnapshot {
  id: string;
  config: GameConfig;
  step: number;
  counts: Record<RoleId, number>;
}
export class GameDatabase extends Dexie {
  games!: Table<Game, string>;
  drafts!: Table<WizardSnapshot, string>;
  constructor(name = "lang-trang-v1") {
    super(name);
    this.version(1).stores({ games: "id, updatedAt" });
    this.version(2).stores({ games: "id, updatedAt", drafts: "id" });
  }
}
export const db = new GameDatabase();
export async function saveGame(game: Game, database = db): Promise<void> {
  await database.transaction("rw", database.games, async () => {
    const existing = await database.games.get(game.id);
    if (existing && existing.revision !== game.revision - 1)
      throw new Error(
        "Ván này vừa thay đổi ở tab khác. Hãy tải lại trang để tiếp tục an toàn.",
      );
    await database.games.put(game);
  });
}
export async function deleteGame(id: string, database = db): Promise<void> {
  await database.transaction(
    "rw",
    database.games,
    database.drafts,
    async () => {
      await database.games.delete(id);
      await database.drafts.delete(id);
    },
  );
}
export async function loadGames(database = db): Promise<Game[]> {
  const games = await database.games.orderBy("updatedAt").reverse().toArray();
  if (games.some((g) => g.schemaVersion !== 1))
    throw new Error(
      "Dữ liệu thuộc phiên bản chưa hỗ trợ. Vui lòng cập nhật ứng dụng.",
    );
  return games;
}
