import type { DeathCause, GameEvent, GameState } from "../domain/types";
import { effectiveEvents, replay } from "../events/replay";
import { roles, teamNames } from "../roles/registry";
import { hunterMayShoot } from "../roles/abilities";
export const deathLabels: Record<DeathCause, string> = {
  WOLF_ATTACK: "Sói tấn công",
  WITCH_POISON: "Bình độc",
  VOTE_EXECUTION: "Làng bỏ phiếu",
  HUNTER_SHOT: "Thợ săn bắn",
  OTHER: "Nguyên nhân khác",
};
export const playerName = (s: GameState, id?: string | null) =>
  s.players.find((p) => p.id === id)?.name ??
  (id ? "Người chơi không còn trong danh sách" : "không ai");
export function eventText(e: GameEvent, s: GameState): string {
  const name = (id?: string | null) => playerName(s, id);
  switch (e.type) {
    case "GAME_CREATED":
      return `Ngôi làng “${e.payload.name}” được lập.`;
    case "SETUP_UPDATED":
      return "Quản trò cập nhật danh sách, bộ vai hoặc luật chơi.";
    case "GAME_STARTED":
      return "Đêm đầu tiên buông xuống. Cả làng nhắm mắt.";
    case "NIGHT_STARTED":
      return `Đêm ${e.round + 1} bắt đầu. Ngôi làng lại chìm vào yên lặng.`;
    case "NIGHT_ACTION": {
      const a = e.payload;
      const sentences = {
        werewolf: a.targetId
          ? `Bầy Sói chọn ${name(a.targetId)} làm mục tiêu.`
          : "Bầy Sói không chọn mục tiêu.",
        guard: a.targetId
          ? `${name(a.actorId)} bảo vệ ${name(a.targetId)}.`
          : "Người bảo vệ bỏ qua lượt này.",
        seer: a.targetId
          ? `${name(a.actorId)} soi ${name(a.targetId)}: ${a.result ? "Sói" : "không phải Sói"}.`
          : "Tiên tri bỏ qua lượt này.",
        witch: [
          a.heal
            ? `${name(a.actorId)} dùng bình cứu cho ${name(a.healedId)}.`
            : "",
          a.poisonId
            ? `${name(a.actorId)} dùng bình độc lên ${name(a.poisonId)}.`
            : "",
          !a.heal && !a.poisonId ? "Phù thủy giữ lại bình thuốc." : "",
        ]
          .filter(Boolean)
          .join(" "),
      };
      return sentences[a.kind];
    }
    case "FAKE_CALL":
      return `Quản trò gọi giả ${roles[e.payload.kind].name} để giữ bí mật.`;
    case "WOLF_ATTACK_BLOCKED":
      return `Đòn cắn nhắm vào ${name(e.payload.targetId)} bị chặn bởi ${[e.payload.guardId ? "Người bảo vệ" : "", e.payload.witchId ? "bình cứu của Phù thủy" : ""].filter(Boolean).join(" và ")}.`;
    case "PLAYER_KILLED": {
      const player = s.players.find((p) => p.id === e.payload.playerId);
      const silenced =
        player &&
        roles[player.role].deathTrigger === "hunter" &&
        !hunterMayShoot(s.settings, e.payload.cause)
          ? " Theo luật của làng, Thợ săn không được bắn."
          : "";
      const rage =
        player && roles[player.role].deathTrigger === "cubRage"
          ? " Bầy Sói nổi giận: đêm kế tiếp chúng sẽ cắn hai người."
          : "";
      return `${name(e.payload.playerId)} (${player ? roles[player.role].name : "vai cũ"}) chết vì ${deathLabels[e.payload.cause].toLowerCase()}.${silenced}${rage}`;
    }
    case "HUNTER_SHOT":
      return e.payload.targetId
        ? `${name(e.payload.actorId)} bắn ${name(e.payload.targetId)} trong phát súng cuối cùng.`
        : `${name(e.payload.actorId)} chọn không bắn.`;
    case "DAY_STARTED":
      return e.payload.deaths.length
        ? `Trời sáng. Làng mất ${e.payload.deaths.map(name).join(", ")} trong đêm.`
        : "Trời sáng. Tất cả đều sống sót qua đêm.";
    case "DISCUSSION_STARTED":
      return "Cả làng bắt đầu thảo luận.";
    case "SUSPECT_NOMINATED":
      return e.payload.targetId
        ? `Làng nghi ngờ ${name(e.payload.targetId)} nhất và mời lên thanh minh.`
        : "Làng không đưa ai lên thanh minh.";
    case "VERDICT_REACHED":
      return e.payload.executed
        ? `Làng quyết định treo cổ ${name(e.payload.targetId)}.`
        : `Làng quyết định tha cho ${name(e.payload.targetId)}.`;
    case "VOTING_STARTED":
      return "Cuộc bỏ phiếu bắt đầu.";
    case "VOTE_CAST":
      return `${name(e.payload.voterId)} ${e.payload.targetId ? `bỏ phiếu cho ${name(e.payload.targetId)}` : "bỏ phiếu trắng"}.`;
    case "VOTING_RESOLVED":
      return e.payload.targetId
        ? `${name(e.payload.targetId)} bị làng chọn loại${e.payload.tied ? " sau khi quản trò xử lý hòa phiếu" : ""}.`
        : `Làng không loại ai${e.payload.tied ? " vì hòa phiếu" : ""}.`;
    case "GAME_ENDED":
      return `${teamNames[e.payload.team]} chiến thắng. ${e.payload.reason}`;
    case "ACTION_UNDONE":
      return "Quản trò hoàn tác một thao tác. Giao dịch gốc được giữ lại trong nhật ký.";
  }
}
export function eventGroup(e: GameEvent): string {
  if (e.type === "GAME_STARTED") return "Đêm 1";
  if (e.type === "NIGHT_STARTED") return `Đêm ${e.round + 1}`;
  if (e.type === "DAY_STARTED") return `Ngày ${e.round}`;
  return e.phase === "night"
    ? `Đêm ${e.round}`
    : e.phase === "day"
      ? `Ngày ${e.round}`
      : e.phase === "ended"
        ? "Kết thúc"
        : "Chuẩn bị";
}
export function storyRecap(events: GameEvent[]): string {
  const s = replay(events);
  let last = "";
  return [
    `BIÊN NIÊN SỬ • ${s.name}`,
    ...effectiveEvents(events)
      .filter(
        (e) => !["GAME_CREATED", "SETUP_UPDATED", "FAKE_CALL"].includes(e.type),
      )
      .map((e) => {
        const group = eventGroup(e),
          prefix = last === group ? "" : `\n${group.toUpperCase()}\n`;
        last = group;
        return prefix + eventText(e, s);
      }),
  ].join("\n");
}
// The story as lines for a speech voice. Headings are turned into words a
// voice reads naturally instead of capitals, and each line is spoken on its
// own so long stories are not cut off.
export function storySpeech(events: GameEvent[]): string[] {
  return storyRecap(events)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const text = line.replace(/^BIÊN NIÊN SỬ • /, "Biên niên sử. ");
      return text === text.toLocaleUpperCase("vi")
        ? `${text[0]}${text.slice(1).toLocaleLowerCase("vi")}.`
        : text;
    });
}
export function playerStory(events: GameEvent[], id: string): string[] {
  const s = replay(events);
  return effectiveEvents(events)
    .filter((e) => e.actorIds.includes(id) || e.targetIds.includes(id))
    .map((e) => `${eventGroup(e)}: ${eventText(e, s)}`);
}
