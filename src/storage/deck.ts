import {
  defaultSettings,
  type GameSettings,
  type RoleId,
} from "../domain/types";
// The village's own deck preferences: which cards the app may pick by itself,
// how many of each, and the house rules. Kept on this device and copied into
// every new game, so changing them never alters a game already started.
export interface CardPrefs {
  auto: boolean;
  /** 0 means no limit beyond the number of players. */
  max: number;
}
export interface DeckPrefs {
  cards: Record<RoleId, CardPrefs>;
  settings: GameSettings;
}
const KEY = "lang-trang-deck";
const MANY: RoleId[] = ["werewolf", "villager"];
export function defaultDeckPrefs(): DeckPrefs {
  return {
    cards: {
      werewolf: { auto: true, max: 0 },
      wolf_cub: { auto: true, max: 1 },
      seer: { auto: true, max: 1 },
      guard: { auto: true, max: 1 },
      witch: { auto: true, max: 1 },
      hunter: { auto: true, max: 1 },
      villager: { auto: true, max: 0 },
      // Picked by hand only: a lone winner changes the game a lot.
      tanner: { auto: false, max: 1 },
    },
    settings: { ...defaultSettings },
  };
}
export const isMany = (id: RoleId) => MANY.includes(id);
export function readDeckPrefs(): DeckPrefs {
  const fallback = defaultDeckPrefs();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const saved = JSON.parse(raw) as Partial<DeckPrefs>;
    // Cards or rules added after the prefs were saved keep their defaults.
    return {
      cards: { ...fallback.cards, ...saved.cards },
      settings: { ...fallback.settings, ...saved.settings },
    };
  } catch {
    return fallback;
  }
}
export function writeDeckPrefs(prefs: DeckPrefs) {
  localStorage.setItem(KEY, JSON.stringify(prefs));
}
