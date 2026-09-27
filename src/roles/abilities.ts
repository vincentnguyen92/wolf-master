import type {
  DeathCause,
  GameSettings,
  GameState,
  NightAction,
  Player,
} from "../domain/types";
export function hunterMayShoot(settings: GameSettings, cause: DeathCause) {
  if (cause === "VOTE_EXECUTION") return settings.hunterShootsWhenExecuted;
  if (cause === "WITCH_POISON") return settings.hunterShootsWhenPoisoned;
  return true;
}
export function wolfTargets(state: GameState): string[] {
  return state.nightActions
    .filter((a) => a.kind === "werewolf" && a.targetId)
    .map((a) => a.targetId!);
}
export function healableVictims(state: GameState, actor: Player): string[] {
  if (actor.roleState.usage.heal) return [];
  return wolfTargets(state).filter(
    (id) => state.settings.canHealSelf || id !== actor.id,
  );
}
export function canWitchHeal(state: GameState, actor: Player): boolean {
  return healableVictims(state, actor).length > 0;
}
export function seerResult(state: GameState, targetId: string): boolean {
  const role = state.players.find((p) => p.id === targetId)?.role;
  return role === "werewolf" || role === "wolf_cub";
}
export function resolveWitch(
  state: GameState,
  action: NightAction,
): NightAction {
  const actor = state.players.find((p) => p.id === action.actorId)!;
  if (action.targetId)
    throw new Error("Phù thủy phải chọn bình cứu hoặc bình độc.");
  const healable = healableVictims(state, actor);
  // With a single wolf victim the heal target is implied; after the Wolf Cub
  // dies the pack bites twice and the witch must say whom she saves.
  const healedId = action.heal
    ? (action.healedId ?? (healable.length === 1 ? healable[0] : undefined))
    : undefined;
  if (action.heal && (!healedId || !healable.includes(healedId)))
    throw new Error("Không thể dùng bình cứu.");
  if (
    action.poisonId &&
    (actor.roleState.usage.poison ||
      !state.players.some((p) => p.alive && p.id === action.poisonId))
  )
    throw new Error("Không thể dùng bình độc.");
  if (
    !state.settings.canUseBothPotionsSameNight &&
    action.heal &&
    action.poisonId
  )
    throw new Error("Không được dùng hai bình trong cùng đêm.");
  return {
    ...action,
    healedId,
  };
}
