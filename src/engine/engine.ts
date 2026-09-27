import type {
  EventData,
  Game,
  GameConfig,
  GameEvent,
  GameState,
  NightAction,
  NightKind,
} from "../domain/types";
import {
  replay,
  reduceEvent,
  lastReversibleTransaction,
} from "../events/replay";
import { roles } from "../roles/registry";
import { newId } from "../lib/id";
import { evaluateVictory, getCurrentAction, wolfTargets } from "./selectors";
export type Command =
  | { type: "setup"; config: GameConfig }
  | { type: "start" }
  | { type: "night"; action: NightAction }
  | { type: "fakeCall" }
  | { type: "resolveNight" }
  | { type: "hunter"; targetId?: string }
  | { type: "advance" }
  | { type: "nominate"; targetId?: string }
  | { type: "verdict"; execute: boolean }
  | { type: "end" }
  | { type: "undo" };
function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
export function validateConfig(c: GameConfig, starting = false) {
  ensure(c.name.trim(), "Hãy đặt tên cho ngôi làng.");
  ensure(
    new Set(c.players.map((p) => p.id)).size === c.players.length,
    "ID người chơi bị trùng.",
  );
  ensure(
    c.players.every((p) => p.name.trim() && p.role in roles),
    "Tên hoặc vai không hợp lệ.",
  );
  ensure(
    new Set(c.players.map((p) => p.name.trim().toLocaleLowerCase("vi")))
      .size === c.players.length,
    "Tên người chơi không được trùng nhau.",
  );
  if (starting) {
    ensure(c.players.length >= 4, "Cần ít nhất 4 người chơi.");
    const wolves = c.players.filter(
      (p) => roles[p.role].team === "wolves",
    ).length;
    ensure(
      c.players.some((p) => p.role === "werewolf") &&
        wolves < c.players.length - wolves,
      "Cần ít nhất 1 Ma Sói và số Sói ít hơn số người còn lại.",
    );
    for (const id of ["seer", "guard", "witch", "hunter", "wolf_cub", "tanner"])
      ensure(
        c.players.filter((p) => p.role === id).length <= 1,
        "MVP hỗ trợ tối đa một người cho mỗi vai đặc biệt.",
      );
  }
}
function eventFor(
  gameId: string,
  transactionId: string,
  state: GameState | undefined,
  data: EventData,
): GameEvent {
  const actorIds: string[] = [],
    targetIds: string[] = [];
  if (data.type === "NIGHT_ACTION" && data.payload.kind === "werewolf" && state)
    actorIds.push(
      ...state.players
        .filter((p) => p.alive && roles[p.role].team === "wolves")
        .map((p) => p.id),
    );
  else if ("actorId" in data.payload) actorIds.push(data.payload.actorId);
  if ("healedId" in data.payload && data.payload.healedId)
    targetIds.push(data.payload.healedId);
  if (data.type === "WOLF_ATTACK_BLOCKED") {
    if (data.payload.guardId) actorIds.push(data.payload.guardId);
    if (data.payload.witchId) actorIds.push(data.payload.witchId);
  }
  if ("voterId" in data.payload) actorIds.push(data.payload.voterId);
  if ("targetId" in data.payload && data.payload.targetId)
    targetIds.push(data.payload.targetId);
  if ("poisonId" in data.payload && data.payload.poisonId)
    targetIds.push(data.payload.poisonId);
  if ("playerId" in data.payload) targetIds.push(data.payload.playerId);
  return {
    ...structuredClone(data),
    id: newId(),
    gameId,
    transactionId,
    timestamp: new Date().toISOString(),
    phase: state?.phase ?? "setup",
    round: state?.round ?? 0,
    actorIds,
    targetIds,
  };
}
export function createGame(config: GameConfig): Game {
  validateConfig(config);
  const id = newId();
  const event = eventFor(id, newId(), undefined, {
    type: "GAME_CREATED",
    payload: config,
  });
  return {
    id,
    schemaVersion: 1,
    revision: 1,
    updatedAt: event.timestamp,
    events: [event],
  };
}
export function execute(game: Game, command: Command): Game {
  let s = replay(game.events);
  const transaction = newId();
  const added: GameEvent[] = [];
  const emit = (data: EventData) => {
    const e = eventFor(game.id, transaction, s, data);
    added.push(e);
    s = reduceEvent(s, e);
  };
  const kill = (
    id: string,
    cause: "WOLF_ATTACK" | "WITCH_POISON" | "VOTE_EXECUTION" | "HUNTER_SHOT",
  ) => {
    if (s.players.find((p) => p.id === id)?.alive)
      emit({
        type: "PLAYER_KILLED",
        payload: { playerId: id, cause, round: s.round, phase: s.phase },
      });
  };
  if (command.type === "undo") {
    const target = lastReversibleTransaction(game.events);
    ensure(target, "Chưa có thao tác để hoàn tác.");
    emit({ type: "ACTION_UNDONE", payload: { transactionId: target } });
  } else {
    ensure(s.phase !== "ended", "Ván đã kết thúc. Hãy hoàn tác nếu cần sửa.");
    const handlers: Record<Exclude<Command["type"], "undo">, () => void> = {
      setup: () => {
        if (command.type !== "setup") return;
        ensure(s.phase === "setup", "Không thể sửa bộ vai khi đang chơi.");
        validateConfig(command.config);
        emit({ type: "SETUP_UPDATED", payload: command.config });
      },
      start: () => {
        ensure(s.phase === "setup", "Ván đã bắt đầu.");
        validateConfig(
          { name: s.name, players: s.players, settings: s.settings },
          true,
        );
        emit({ type: "GAME_STARTED", payload: {} });
      },
      night: () => {
        if (command.type !== "night") return;
        const current = getCurrentAction(s),
          a = command.action;
        ensure(
          s.phase === "night" &&
            current?.kind === a.kind &&
            current.actorId === a.actorId &&
            !current.fake,
          "Vai này chưa được hành động.",
        );
        ensure(
          a.targetId === undefined || current.eligibleIds.includes(a.targetId),
          "Mục tiêu không hợp lệ.",
        );
        const role = roles[a.kind];
        ensure(
          (!a.heal || role.resources.includes("heal")) &&
            (!a.poisonId || role.resources.includes("poison")),
          "Vai này không có bình thuốc.",
        );
        emit({
          type: "NIGHT_ACTION",
          payload: roles[a.kind].resolveAction(s, {
            ...a,
            result: undefined,
            healedId: a.kind === "witch" && a.heal ? a.healedId : undefined,
          }),
        });
      },
      fakeCall: () => {
        const current = getCurrentAction(s);
        ensure(
          s.phase === "night" && current?.fake,
          "Lượt hiện tại không phải lượt gọi giả.",
        );
        emit({
          type: "FAKE_CALL",
          payload: { kind: current.kind as NightKind },
        });
      },
      resolveNight: () => {
        ensure(
          s.phase === "night" && !getCurrentAction(s),
          "Cần hoàn thành các lượt gọi trước khi kết đêm.",
        );
        const actions = s.nightActions;
        for (const victim of wolfTargets(s)) {
          const guardId = actions.find(
              (a) => a.kind === "guard" && a.targetId === victim,
            )?.actorId,
            witchId = actions.find(
              (a) => a.kind === "witch" && a.heal && a.healedId === victim,
            )?.actorId;
          if (guardId || witchId)
            emit({
              type: "WOLF_ATTACK_BLOCKED",
              payload: { targetId: victim, guardId, witchId },
            });
          else kill(victim, "WOLF_ATTACK");
        }
        actions
          .filter((a) => a.kind === "witch" && a.poisonId)
          .forEach((a) => kill(a.poisonId!, "WITCH_POISON"));
        const deaths = added
          .filter((e) => e.type === "PLAYER_KILLED")
          .map((e) => e.payload.playerId);
        emit({ type: "DAY_STARTED", payload: { deaths } });
      },
      hunter: () => {
        if (command.type !== "hunter") return;
        const action = getCurrentAction(s);
        ensure(action?.kind === "hunter", "Không có Thợ săn đang chờ.");
        ensure(
          !command.targetId || action.eligibleIds.includes(command.targetId),
          "Mục tiêu bắn không hợp lệ.",
        );
        emit({
          type: "HUNTER_SHOT",
          payload: { actorId: action.actorId, targetId: command.targetId },
        });
        if (command.targetId) kill(command.targetId, "HUNTER_SHOT");
      },
      advance: () => {
        ensure(
          s.phase === "day" && !s.pendingHunters.length,
          "Cần xử lý lượt đang chờ.",
        );
        ensure(
          !evaluateVictory(s),
          "Đã có phe thắng. Hãy xác nhận kết thúc ván.",
        );
        if (s.stage === "morning")
          emit({ type: "DISCUSSION_STARTED", payload: {} });
        else if (s.stage === "verdict")
          emit({ type: "NIGHT_STARTED", payload: {} });
        else if (s.stage === "defense")
          throw new Error("Hãy để làng quyết định treo cổ hay tha.");
        else
          throw new Error("Hãy chọn người bị nghi ngờ hoặc không đưa ai lên.");
      },
      nominate: () => {
        if (command.type !== "nominate") return;
        ensure(
          (s.stage === "discussion" || s.stage === "voting") &&
            !s.pendingHunters.length,
          "Chưa đến lúc chọn người bị nghi ngờ.",
        );
        ensure(
          !command.targetId ||
            s.players.some((p) => p.id === command.targetId && p.alive),
          "Người bị nghi ngờ phải còn sống.",
        );
        emit({
          type: "SUSPECT_NOMINATED",
          payload: { targetId: command.targetId },
        });
        // Nobody on trial means nobody can die today: straight to night.
        if (!command.targetId) emit({ type: "NIGHT_STARTED", payload: {} });
      },
      verdict: () => {
        if (command.type !== "verdict") return;
        const suspect = s.suspectId;
        ensure(s.stage === "defense" && suspect, "Chưa có ai đang thanh minh.");
        emit({
          type: "VERDICT_REACHED",
          payload: { targetId: suspect, executed: command.execute },
        });
        if (command.execute) kill(suspect, "VOTE_EXECUTION");
        else emit({ type: "NIGHT_STARTED", payload: {} });
      },
      end: () => {
        ensure(
          s.phase !== "night",
          "Hãy giải quyết hết đêm trước khi kết thúc.",
        );
        const result = evaluateVictory(s);
        ensure(result, "Chưa có phe thắng hoặc còn Thợ săn chờ xử lý.");
        emit({ type: "GAME_ENDED", payload: result });
      },
    };
    handlers[command.type]();
  }
  return {
    ...game,
    events: [...game.events, ...added],
    revision: game.revision + 1,
    updatedAt: added.at(-1)!.timestamp,
  };
}
