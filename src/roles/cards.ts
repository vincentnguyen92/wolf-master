import type { GameSettings, RoleId } from "../domain/types";
export type CardId =
  | RoleId
  | "apprentice_seer"
  | "tough_guy"
  | "spellcaster"
  | "doppelganger"
  | "cupid"
  | "minion"
  | "sorceress"
  | "cursed";
export interface Card {
  id: CardId;
  name: string;
  en: string;
  /** Printed on the card; never edited in the app. */
  points: number;
  group: "village" | "wolves" | "other";
  /** The app role this card plays as; absent while the role has no rules yet. */
  role?: RoleId;
  /** House rules that belong to this card, shown on its back. */
  rules: { key: keyof GameSettings; label: string }[];
}
// The village's physical deck, in the order the cards are laid out.
export const cards: Card[] = [
  {
    id: "seer",
    name: "Tiên tri",
    en: "Seer",
    points: 7,
    group: "village",
    role: "seer",
    rules: [{ key: "seerSeesWolfCub", label: "Soi Sói con ra Sói" }],
  },
  {
    id: "apprentice_seer",
    name: "Tiên tri tập sự",
    en: "Apprentice Seer",
    points: 4,
    group: "village",
    rules: [],
  },
  {
    id: "witch",
    name: "Phù thủy",
    en: "Witch",
    points: 4,
    group: "village",
    role: "witch",
    rules: [
      { key: "canHealSelf", label: "Được tự cứu mình" },
      { key: "canUseBothPotionsSameNight", label: "Dùng hai bình cùng đêm" },
    ],
  },
  {
    id: "guard",
    name: "Người bảo vệ",
    en: "Bodyguard",
    points: 3,
    group: "village",
    role: "guard",
    rules: [
      {
        key: "canProtectSamePlayerConsecutively",
        label: "Che một người hai đêm liên tiếp",
      },
      { key: "guardCanProtectSelf", label: "Được tự che mình" },
    ],
  },
  {
    id: "hunter",
    name: "Thợ săn",
    en: "Hunter",
    points: 3,
    group: "village",
    role: "hunter",
    rules: [
      { key: "hunterShootsWhenExecuted", label: "Được bắn khi bị treo cổ" },
      { key: "hunterShootsWhenPoisoned", label: "Được bắn khi trúng độc" },
    ],
  },
  {
    id: "tough_guy",
    name: "Người cứng cỏi",
    en: "Tough Guy",
    points: 3,
    group: "village",
    rules: [],
  },
  {
    id: "villager",
    name: "Dân làng",
    en: "Villager",
    points: 1,
    group: "village",
    role: "villager",
    rules: [],
  },
  {
    id: "spellcaster",
    name: "Người phù phép",
    en: "Spellcaster",
    points: 1,
    group: "village",
    rules: [],
  },
  {
    id: "doppelganger",
    name: "Nhân bản",
    en: "Doppelgänger",
    points: -2,
    group: "village",
    rules: [],
  },
  {
    id: "cupid",
    name: "Thần tình yêu",
    en: "Cupid",
    points: -3,
    group: "village",
    rules: [],
  },
  {
    id: "wolf_cub",
    name: "Sói con",
    en: "Wolf Cub",
    points: -8,
    group: "wolves",
    role: "wolf_cub",
    rules: [],
  },
  {
    id: "werewolf",
    name: "Sói",
    en: "Werewolf",
    points: -6,
    group: "wolves",
    role: "werewolf",
    rules: [],
  },
  {
    id: "minion",
    name: "Kẻ phản bội",
    en: "Minion",
    points: -6,
    group: "wolves",
    rules: [],
  },
  {
    id: "sorceress",
    name: "Pháp sư",
    en: "Sorceress",
    points: -3,
    group: "wolves",
    rules: [],
  },
  {
    id: "tanner",
    name: "Kẻ chán đời",
    en: "Tanner",
    points: -2,
    group: "other",
    role: "tanner",
    rules: [
      {
        key: "tannerWinsOnAnyDeath",
        label: "Thắng khi chết vì bất kỳ lý do nào, như chữ trên lá",
      },
    ],
  },
  {
    id: "cursed",
    name: "Bị nguyền",
    en: "Cursed",
    points: -3,
    group: "other",
    rules: [],
  },
];
export const cardImage = (id: CardId) => `/assets/cards/${id}.webp`;
