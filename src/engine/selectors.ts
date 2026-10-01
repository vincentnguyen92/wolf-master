import type {
  AvailableAction,
  GameState,
  NightKind,
  VictoryResult,
} from "../domain/types";
import { roleList, roles } from "../roles/registry";
export function getTriggeredActions(s: GameState): AvailableAction[] {
  return s.pendingHunters.map((id) => ({
    kind: "hunter",
    actorId: id,
    actorIds: [id],
    eligibleIds: s.players.filter((p) => p.alive).map((p) => p.id),
  }));
}
export function wolfAttacks(s: GameState): number {
  return s.phase === "night" && s.cubRageRound === s.round ? 2 : 1;
}
export function getAvailableActions(s: GameState): AvailableAction[] {
  if (s.phase === "ended" || s.phase === "setup") return [];
  if (s.pendingHunters.length) return getTriggeredActions(s);
  if (s.phase !== "night") return [];
  const actors = s.players
    .filter((p) => roles[p.role].hasNightAction && roles[p.role].canAct(s, p))
    .sort((a, b) => roles[a.role].nightPriority - roles[b.role].nightPriority);
  const pack = actors.filter((p) => roles[p.role].team === "wolves");
  const bites = s.nightActions.filter((a) => a.kind === "werewolf").length;
  return actors
    .filter((p) =>
      roles[p.role].team === "wolves"
        ? p === pack[0] && bites < wolfAttacks(s)
        : !s.nightActions.some((a) => a.actorId === p.id),
    )
    .map((p): AvailableAction => ({
      kind: (roles[p.role].team === "wolves"
        ? "werewolf"
        : p.role) as NightKind,
      actorId: p.id,
      actorIds:
        roles[p.role].team === "wolves" ? pack.map((a) => a.id) : [p.id],
      eligibleIds: roles[p.role].getEligibleTargets(s, p).map((t) => t.id),
    }))
    .concat(fakeCalls(s))
    .sort((a, b) => roles[a.kind].nightPriority - roles[b.kind].nightPriority);
}
// Roles dealt at the start but now dead or out of abilities still get a
// pretend call. The pack never needs one: with no wolf left the game is over.
function fakeCalls(s: GameState): AvailableAction[] {
  if (!s.settings.callAllRolesEachNight) return [];
  return roleList
    .filter((r) => r.hasNightAction && r.team !== "wolves")
    .flatMap((r) => {
      const holders = s.players.filter((p) => p.role === r.id);
      const kind = r.id as NightKind;
      if (
        !holders.length ||
        holders.some((p) => r.canAct(s, p)) ||
        s.nightActions.some((a) => holders.some((p) => p.id === a.actorId)) ||
        s.fakeCalls.includes(kind)
      )
        return [];
      return [
        {
          kind,
          actorId: holders[0].id,
          actorIds: [holders[0].id],
          eligibleIds: [],
          fake: true,
        },
      ];
    });
}
export const getCurrentAction = (s: GameState) => getAvailableActions(s)[0];
export function evaluateVictory(s: GameState): VictoryResult | undefined {
  if (s.phase === "setup" || s.pendingHunters.length) return;
  const tanner = s.players.find(
    (p) =>
      p.role === "tanner" &&
      p.death &&
      (p.death.cause === "VOTE_EXECUTION" || s.settings.tannerWinsOnAnyDeath),
  );
  if (tanner)
    return {
      team: "neutral",
      reason:
        tanner.death?.cause === "VOTE_EXECUTION"
          ? `${tanner.name} (Kẻ chán đời) bị làng treo cổ đúng như mong muốn.`
          : `${tanner.name} (Kẻ chán đời) đã chết đúng như mong muốn.`,
    };
  const alive = s.players.filter((p) => p.alive);
  const wolves = alive.filter((p) => roles[p.role].team === "wolves").length;
  if (wolves === 0)
    return { team: "village", reason: "Không còn Sói sống trong làng." };
  if (wolves >= alive.length - wolves)
    return {
      team: "wolves",
      reason: "Số Sói sống đã bằng hoặc vượt số người còn lại.",
    };
}
export { wolfTargets } from "../roles/abilities";
