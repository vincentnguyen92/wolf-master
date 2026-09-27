import type { GameEvent } from "../domain/types";
import { effectiveEvents, replay } from "../events/replay";
import { playerName } from "../story/narrative";
import { roles } from "../roles/registry";
export interface Statistic {
  label: string;
  value: string;
}
export function statistics(events: GameEvent[]): Statistic[] {
  const effective = effectiveEvents(events),
    s = replay(events),
    results: Statistic[] = [];
  const actions = effective
    .filter((e) => e.type === "NIGHT_ACTION")
    .map((e) => e.payload);
  const top = (label: string, ids: (string | undefined | null)[]) => {
    const counts: Record<string, number> = {};
    ids.forEach((id) => {
      if (id) counts[id] = (counts[id] ?? 0) + 1;
    });
    const max = Math.max(0, ...Object.values(counts));
    if (max)
      results.push({
        label,
        value: `${Object.keys(counts)
          .filter((id) => counts[id] === max)
          .map((id) => playerName(s, id))
          .join(", ")} · ${max} lượt`,
      });
  };
  top(
    "Bị Sói nhắm nhiều nhất",
    actions.filter((a) => a.kind === "werewolf").map((a) => a.targetId),
  );
  top(
    "Được bảo vệ nhiều nhất",
    actions.filter((a) => a.kind === "guard").map((a) => a.targetId),
  );
  // Only each voter's final ballot per round counts in statistics.
  const ballots = new Map<string, string | null>();
  effective.forEach((e) => {
    if (e.type === "VOTE_CAST")
      ballots.set(`${e.round}:${e.payload.voterId}`, e.payload.targetId);
  });
  top("Nhận nhiều phiếu nhất", [...ballots.values()]);
  top(
    "Bị đưa lên thanh minh nhiều nhất",
    effective.map((e) =>
      e.type === "SUSPECT_NOMINATED" ? e.payload.targetId : undefined,
    ),
  );
  const verdicts = effective.flatMap((e) =>
    e.type === "VERDICT_REACHED" ? [e.payload.executed] : [],
  );
  if (verdicts.length)
    results.push({
      label: "Treo cổ / Tha",
      value: `${verdicts.filter(Boolean).length} / ${verdicts.filter((v) => !v).length}`,
    });
  const checks = actions.filter((a) => a.kind === "seer" && a.targetId);
  if (checks.length)
    results.push({
      label: "Lượt soi / Sói phát hiện (không trùng)",
      value: `${checks.length} / ${new Set(checks.filter((a) => a.result).map((a) => a.targetId)).size}`,
    });
  const witches = actions.filter((a) => a.kind === "witch");
  if (witches.length)
    results.push({
      label: "Bình cứu / Bình độc đã dùng",
      value: `${witches.filter((a) => a.heal).length} / ${witches.filter((a) => a.poisonId).length}`,
    });
  const kills = effective.filter((e) => e.type === "PLAYER_KILLED");
  if (kills.some((e) => e.payload.cause === "VOTE_EXECUTION"))
    results.push({
      label: "Dân bị làng loại",
      value: String(
        kills.filter(
          (e) =>
            e.payload.cause === "VOTE_EXECUTION" &&
            roles[s.players.find((p) => p.id === e.payload.playerId)!.role]
              .team === "village",
        ).length,
      ),
    });
  if (kills.some((e) => e.payload.cause === "HUNTER_SHOT"))
    results.push({
      label: "Người chết do Thợ săn",
      value: String(
        kills.filter((e) => e.payload.cause === "HUNTER_SHOT").length,
      ),
    });
  const wolfByRound = new Map<number, string[]>();
  effective.forEach((e) => {
    if (
      e.type === "NIGHT_ACTION" &&
      e.payload.kind === "werewolf" &&
      e.payload.targetId
    )
      wolfByRound.set(e.round, [
        ...(wolfByRound.get(e.round) ?? []),
        e.payload.targetId,
      ]);
  });
  const blocks = effective.filter(
    (e) =>
      e.type === "NIGHT_ACTION" &&
      e.payload.kind === "guard" &&
      e.payload.targetId &&
      !!wolfByRound.get(e.round)?.includes(e.payload.targetId),
  ).length;
  if (blocks)
    results.push({
      label: "Lượt bảo vệ trúng mục tiêu Sói",
      value: String(blocks),
    });
  return results;
}
