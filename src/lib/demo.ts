import { defaultSettings, type GameConfig, type RoleId } from "../domain/types";
import { newId } from "./id";
const distribution: RoleId[] = [
  "werewolf",
  "villager",
  "seer",
  "guard",
  "villager",
  "witch",
  "hunter",
  "werewolf",
];
export function demoConfig(): GameConfig {
  return {
    name: "Làng Trăng • Ván mẫu",
    settings: { ...defaultSettings },
    players: ["An", "Bình", "Cường", "Dũng", "Hà", "Lan", "Minh", "Phúc"].map(
      (name, i) => ({ id: newId(), name, role: distribution[i] }),
    ),
  };
}
export function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const range = i + 1,
      limit = Math.floor(4294967296 / range) * range;
    let value: number;
    do {
      value = crypto.getRandomValues(new Uint32Array(1))[0];
    } while (value >= limit);
    const j = value % range;
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
