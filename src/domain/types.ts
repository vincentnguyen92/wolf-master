export type RoleId =
  | "werewolf"
  | "wolf_cub"
  | "villager"
  | "seer"
  | "guard"
  | "witch"
  | "hunter"
  | "tanner";
export type Team = "village" | "wolves" | "neutral";
export type Phase = "setup" | "night" | "day" | "ended";
export type Round = number;
export type DeathCause =
  "WOLF_ATTACK" | "WITCH_POISON" | "VOTE_EXECUTION" | "HUNTER_SHOT" | "OTHER";
export interface DeathRecord {
  playerId: string;
  cause: DeathCause;
  round: Round;
  phase: Phase;
}
export interface AbilityUsage {
  heal: boolean;
  poison: boolean;
  shot: boolean;
}
export interface RoleState {
  usage: AbilityUsage;
  lastProtected?: string;
}
export interface Player {
  id: string;
  name: string;
  role: RoleId;
  alive: boolean;
  roleState: RoleState;
  death?: DeathRecord;
}
export interface GameSettings {
  canProtectSamePlayerConsecutively: boolean;
  canHealSelf: boolean;
  canUseBothPotionsSameNight: boolean;
  hunterShootsWhenExecuted: boolean;
  hunterShootsWhenPoisoned: boolean;
  /** Keep calling dead or exhausted roles so the table cannot tell who is gone. */
  callAllRolesEachNight: boolean;
  guardCanProtectSelf: boolean;
  seerSeesWolfCub: boolean;
  /** As printed on the card: the tanner wins however they die. */
  tannerWinsOnAnyDeath: boolean;
}
export const defaultSettings: GameSettings = {
  canProtectSamePlayerConsecutively: false,
  canHealSelf: true,
  canUseBothPotionsSameNight: false,
  hunterShootsWhenExecuted: true,
  hunterShootsWhenPoisoned: true,
  callAllRolesEachNight: true,
  guardCanProtectSelf: true,
  seerSeesWolfCub: true,
  tannerWinsOnAnyDeath: false,
};
export interface SetupPlayer {
  id: string;
  name: string;
  role: RoleId;
}
export interface GameConfig {
  name: string;
  players: SetupPlayer[];
  settings: GameSettings;
}
export interface TargetSelection {
  targetId?: string;
}
export type NightKind = "werewolf" | "guard" | "seer" | "witch";
export interface NightAction extends TargetSelection {
  kind: NightKind;
  actorId: string;
  heal?: boolean;
  healedId?: string;
  poisonId?: string;
  result?: boolean;
}
export interface Vote {
  voterId: string;
  targetId: string | null;
}
export interface VictoryResult {
  team: Team;
  reason: string;
}
export interface AvailableAction {
  kind: NightKind | "hunter";
  actorId: string;
  actorIds: string[];
  eligibleIds: string[];
  /** Pretend call: the role is out of play, the moderator only acts it out. */
  fake?: boolean;
}
export interface GameState {
  id: string;
  name: string;
  settings: GameSettings;
  players: Player[];
  phase: Phase;
  round: Round;
  stage:
    | "setup"
    | "actions"
    | "morning"
    | "discussion"
    | "voting"
    | "defense"
    | "verdict"
    | "ended";
  nightActions: NightAction[];
  /** Roles already pretend-called tonight. */
  fakeCalls: NightKind[];
  votes: Vote[];
  pendingHunters: string[];
  morningDeaths: string[];
  /** Player the village put up to defend themselves today. */
  suspectId?: string;
  /** Night in which the pack attacks twice because the Wolf Cub died. */
  cubRageRound?: Round;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  victory?: VictoryResult;
}
export type EventData =
  | {
      type: "WOLF_ATTACK_BLOCKED";
      payload: { targetId: string; guardId?: string; witchId?: string };
    }
  | { type: "GAME_CREATED"; payload: GameConfig }
  | { type: "SETUP_UPDATED"; payload: GameConfig }
  | { type: "GAME_STARTED"; payload: Record<string, never> }
  | { type: "NIGHT_ACTION"; payload: NightAction }
  | { type: "FAKE_CALL"; payload: { kind: NightKind } }
  | { type: "PLAYER_KILLED"; payload: DeathRecord }
  | { type: "HUNTER_SHOT"; payload: { actorId: string; targetId?: string } }
  | { type: "DAY_STARTED"; payload: { deaths: string[] } }
  | { type: "DISCUSSION_STARTED"; payload: Record<string, never> }
  | { type: "SUSPECT_NOMINATED"; payload: { targetId?: string } }
  | {
      type: "VERDICT_REACHED";
      payload: { targetId: string; executed: boolean };
    }
  // Per-ballot voting from earlier versions; kept so old games still replay.
  | { type: "VOTING_STARTED"; payload: Record<string, never> }
  | { type: "VOTE_CAST"; payload: Vote }
  | { type: "VOTING_RESOLVED"; payload: { targetId?: string; tied: boolean } }
  | { type: "NIGHT_STARTED"; payload: Record<string, never> }
  | { type: "GAME_ENDED"; payload: VictoryResult }
  | { type: "ACTION_UNDONE"; payload: { transactionId: string } };
export type GameEvent = EventData & {
  id: string;
  gameId: string;
  transactionId: string;
  round: Round;
  phase: Phase;
  actorIds: string[];
  targetIds: string[];
  timestamp: string;
};
export interface Game {
  id: string;
  schemaVersion: 1;
  revision: number;
  events: GameEvent[];
  updatedAt: string;
}
export interface Role {
  id: RoleId;
  name: string;
  /** Balance points printed on the physical card. */
  points: number;
  team: Team;
  description: string;
  nightPriority: number;
  hasNightAction: boolean;
  motif: string;
  resources: string[];
  deathTrigger?: "hunter" | "cubRage";
  visibility: "secret";
  canAct(state: GameState, actor: Player): boolean;
  getEligibleTargets(state: GameState, actor: Player): Player[];
  resolveAction(state: GameState, action: NightAction): NightAction;
}
