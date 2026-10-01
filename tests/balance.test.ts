import { describe, expect, it } from "vitest";
import { balancedDeck, deckPoints } from "../src/lib/balance";
import { defaultDeckPrefs } from "../src/storage/deck";
import { roleList, roles } from "../src/roles/registry";
const total = (c: Record<string, number>) =>
  Object.values(c).reduce((a, b) => a + b, 0);
const wolves = (c: Record<string, number>) =>
  roleList.filter((r) => r.team === "wolves").reduce((s, r) => s + c[r.id], 0);
describe("balanced deck", () => {
  it("deals one card per player, sums to 0 and keeps wolves a minority", () => {
    for (let n = 4; n <= 20; n++) {
      const deck = balancedDeck(n, defaultDeckPrefs());
      expect(total(deck)).toBe(n);
      expect(deck.werewolf).toBeGreaterThanOrEqual(1);
      expect(wolves(deck) * 2).toBeLessThan(n);
      expect(Math.abs(deckPoints(deck))).toBeLessThanOrEqual(1);
    }
  });
  it("uses the points printed on the cards", () => {
    expect(roles.seer.points).toBe(7);
    expect(roles.werewolf.points).toBe(-6);
    expect(roles.wolf_cub.points).toBe(-8);
    expect(deckPoints({ ...balancedDeck(8, defaultDeckPrefs()) })).toBe(0);
  });
  it("never picks a card the village switched off, nor more than its limit", () => {
    const prefs = defaultDeckPrefs();
    prefs.cards.seer.auto = false;
    prefs.cards.wolf_cub.auto = false;
    for (let n = 5; n <= 12; n++) {
      const deck = balancedDeck(n, prefs);
      expect(deck.seer).toBe(0);
      expect(deck.wolf_cub).toBe(0);
      expect(deck.tanner).toBe(0);
    }
    prefs.cards.guard.max = 2;
    prefs.cards.werewolf.max = 1;
    const deck = balancedDeck(12, prefs);
    expect(deck.guard).toBeLessThanOrEqual(2);
    expect(deck.werewolf).toBe(1);
  });
});
