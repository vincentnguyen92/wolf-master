import { roles } from "../roles/registry";
import { hunterMayShoot } from "../roles/abilities";
import {
  defaultSettings,
  type GameEvent,
  type GameState,
  type Player,
  type GameConfig,
} from "../domain/types";
export function makePlayers(config: GameConfig): Player[] {
  return config.players.map((p) => ({
    ...p,
    alive: true,
    roleState: { usage: { heal: false, poison: false, shot: false } },
  }));
}
export function effectiveEvents(events: GameEvent[]): GameEvent[] {
  const undone = new Set(
    events
      .filter((e) => e.type === "ACTION_UNDONE")
      .map((e) => e.payload.transactionId),
  );
  return events.filter(
    (e) => e.type !== "ACTION_UNDONE" && !undone.has(e.transactionId),
  );
}
const blank = (): GameState => ({
  id: "",
  name: "",
  settings: defaultSettings,
  players: [],
  phase: "setup",
  round: 0,
  stage: "setup",
  nightActions: [],
  fakeCalls: [],
  votes: [],
  pendingHunters: [],
  morningDeaths: [],
  createdAt: "",
});
export function reduceEvent(state: GameState, event: GameEvent): GameState {
  const s = structuredClone(state);
  switch (event.type) {
    case "GAME_CREATED":
      s.id = event.gameId;
      s.createdAt = event.timestamp;
    // Creation and setup deliberately share the same config reducer.
    // falls through
    case "SETUP_UPDATED":
      s.name = event.payload.name;
      // Games recorded before a setting existed keep its default behaviour.
      s.settings = { ...defaultSettings, ...event.payload.settings };
      s.players = makePlayers(event.payload);
      break;
    case "GAME_STARTED":
      s.phase = "night";
      s.stage = "actions";
      s.round = 1;
      s.startedAt = event.timestamp;
      break;
    case "NIGHT_ACTION": {
      const a = event.payload;
      s.nightActions.push(a);
      const actor = s.players.find((p) => p.id === a.actorId)!;
      if (a.kind === "guard") actor.roleState.lastProtected = a.targetId;
      if (a.kind === "witch") {
        if (a.heal) actor.roleState.usage.heal = true;
        if (a.poisonId) actor.roleState.usage.poison = true;
      }
      break;
    }
    case "FAKE_CALL":
      s.fakeCalls.push(event.payload.kind);
      break;
    case "PLAYER_KILLED": {
      const player = s.players.find((p) => p.id === event.payload.playerId)!;
      player.alive = false;
      player.death = event.payload;
      if (
        roles[player.role].deathTrigger === "hunter" &&
        !player.roleState.usage.shot &&
        hunterMayShoot(s.settings, event.payload.cause)
      )
        s.pendingHunters.push(player.id);
      // Whether the cub falls at night or by day, the rage lands on the next night.
      if (roles[player.role].deathTrigger === "cubRage")
        s.cubRageRound = s.round + 1;
      break;
    }
    case "HUNTER_SHOT": {
      s.pendingHunters = s.pendingHunters.filter(
        (id) => id !== event.payload.actorId,
      );
      s.players.find(
        (p) => p.id === event.payload.actorId,
      )!.roleState.usage.shot = true;
      break;
    }
    case "DAY_STARTED":
      s.phase = "day";
      s.stage = "morning";
      s.morningDeaths = event.payload.deaths;
      s.votes = [];
      break;
    case "DISCUSSION_STARTED":
      s.stage = "discussion";
      break;
    case "SUSPECT_NOMINATED":
      s.suspectId = event.payload.targetId;
      s.stage = event.payload.targetId ? "defense" : "verdict";
      break;
    case "VERDICT_REACHED":
      s.stage = "verdict";
      break;
    case "VOTING_STARTED":
      s.stage = "voting";
      break;
    case "VOTE_CAST":
      s.votes = [
        ...s.votes.filter((v) => v.voterId !== event.payload.voterId),
        event.payload,
      ];
      break;
    case "VOTING_RESOLVED":
      s.stage = "verdict";
      break;
    case "NIGHT_STARTED":
      s.phase = "night";
      s.stage = "actions";
      s.round++;
      s.nightActions = [];
      s.fakeCalls = [];
      s.votes = [];
      s.morningDeaths = [];
      s.suspectId = undefined;
      break;
    case "GAME_ENDED":
      s.phase = "ended";
      s.stage = "ended";
      s.endedAt = event.timestamp;
      s.victory = event.payload;
      break;
    case "WOLF_ATTACK_BLOCKED":
      break;
    case "ACTION_UNDONE":
      break;
  }
  return s;
}
export function replay(events: GameEvent[]): GameState {
  return effectiveEvents(events).reduce(reduceEvent, blank());
}
export function lastReversibleTransaction(
  events: GameEvent[],
): string | undefined {
  return effectiveEvents(events).findLast((e) => e.type !== "GAME_CREATED")
    ?.transactionId;
}
