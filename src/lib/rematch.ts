import type { GameConfig, GameState } from "../domain/types";
import { newId } from "./id";
// Carries the table (names, role composition, house rules) into a fresh game.
// Player ids are regenerated so the new event log shares nothing with the old
// one; roles are only kept so the wizard can restore the same composition and
// are dealt again at the "Gán vai" step.
export function rematchConfig(state: GameState, name: string): GameConfig {
  return {
    name,
    settings: { ...state.settings },
    players: state.players.map((p) => ({
      id: newId(),
      name: p.name,
      role: p.role,
    })),
  };
}
