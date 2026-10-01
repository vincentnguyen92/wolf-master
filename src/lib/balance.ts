import type { RoleId } from "../domain/types";
import { roleList } from "../roles/registry";
import type { DeckPrefs } from "../storage/deck";
export type Counts = Record<RoleId, number>;
export const deckPoints = (counts: Counts) =>
  roleList.reduce((sum, r) => sum + counts[r.id] * r.points, 0);
// Picks the deck for n players whose printed points add up closest to 0.
// Ties go to a natural wolf count (about one wolf per four players), then to
// the deck with more special roles so the night has something to do.
export function balancedDeck(n: number, prefs: DeckPrefs): Counts {
  const specials = roleList
    .filter(
      (r) =>
        r.id !== "werewolf" && r.id !== "villager" && prefs.cards[r.id].auto,
    )
    .map((r) => r.id);
  const target = Math.max(1, Math.round(n / 4));
  const villagerAllowed = prefs.cards.villager.auto;
  let best: { score: number[]; counts: Counts } | undefined;
  const better = (a: number[], b: number[]) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
    return false;
  };
  const tryDeck = (picked: Partial<Counts>, wolves: number) => {
    const counts = Object.fromEntries(
      roleList.map((r) => [r.id, picked[r.id] ?? 0]),
    ) as Counts;
    counts.werewolf = wolves;
    const used = Object.values(counts).reduce((a, b) => a + b, 0);
    counts.villager = n - used;
    if (counts.villager < 0 || (!villagerAllowed && counts.villager > 0))
      return;
    const wolfTeam = roleList
      .filter((r) => r.team === "wolves")
      .reduce((s, r) => s + counts[r.id], 0);
    if (wolfTeam * 2 >= n) return;
    const specialsUsed = specials.reduce((s, id) => s + counts[id], 0);
    const score = [
      Math.abs(deckPoints(counts)),
      Math.abs(wolfTeam - target),
      -specialsUsed,
    ];
    if (!best || better(score, best.score)) best = { score, counts };
  };
  // Every special role takes 0..max copies (max 0 means "up to one" here).
  const walk = (i: number, picked: Partial<Counts>) => {
    if (i === specials.length) {
      const maxWolves = prefs.cards.werewolf.max || n;
      for (let w = 1; w <= Math.min(maxWolves, n); w++) tryDeck(picked, w);
      return;
    }
    const id = specials[i];
    const max = prefs.cards[id].max || 1;
    for (let k = 0; k <= max; k++) walk(i + 1, { ...picked, [id]: k });
  };
  walk(0, {});
  if (!best) throw new Error(`Không chọn được bộ bài cho ${n} người.`);
  return best.counts;
}
export const pointsLabel = (p: number) => (p > 0 ? `+${p}` : String(p));
