import { resolveWitch, seerResult, wolfTargets } from "./abilities";
import type {
  GameState,
  NightAction,
  Player,
  Role,
  RoleId,
  Team,
} from "../domain/types";
const alive = (s: GameState) => s.players.filter((p) => p.alive);
const standard = (_s: GameState, p: Player) => p.alive;
const identity = (_s: GameState, a: NightAction) => a;
export const roles: Record<RoleId, Role> = {
  werewolf: {
    id: "werewolf",
    name: "Ma Sói",
    team: "wolves",
    description: "Cùng bầy chọn một người để tấn công mỗi đêm.",
    nightPriority: 10,
    hasNightAction: true,
    motif: "Trăng & nanh",
    resources: [],
    visibility: "secret",
    canAct: standard,
    getEligibleTargets: (s) =>
      alive(s).filter(
        (p) =>
          roles[p.role].team !== "wolves" && !wolfTargets(s).includes(p.id),
      ),
    resolveAction: identity,
  },
  wolf_cub: {
    id: "wolf_cub",
    name: "Sói con",
    team: "wolves",
    description:
      "Thức dậy cùng bầy Sói. Khi Sói con chết, đêm kế tiếp bầy Sói được cắn hai người.",
    nightPriority: 10,
    hasNightAction: true,
    motif: "Nanh sữa & trăng non",
    resources: [],
    deathTrigger: "cubRage",
    visibility: "secret",
    canAct: standard,
    // The cub hunts with the pack; its bite is the shared werewolf action.
    getEligibleTargets: (s, p) => roles.werewolf.getEligibleTargets(s, p),
    resolveAction: identity,
  },
  guard: {
    id: "guard",
    name: "Bảo vệ",
    team: "village",
    description: "Che chở một người khỏi Sói. Có thể bảo vệ chính mình.",
    nightPriority: 20,
    hasNightAction: true,
    motif: "Khiên & đèn",
    resources: [],
    visibility: "secret",
    canAct: standard,
    getEligibleTargets: (s, p) =>
      alive(s).filter(
        (t) =>
          s.settings.canProtectSamePlayerConsecutively ||
          p.roleState.lastProtected !== t.id,
      ),
    resolveAction: identity,
  },
  seer: {
    id: "seer",
    name: "Tiên tri",
    team: "village",
    description: "Soi một người còn sống để biết họ có phải Ma Sói.",
    nightPriority: 30,
    hasNightAction: true,
    motif: "Mắt & sao",
    resources: [],
    visibility: "secret",
    canAct: standard,
    getEligibleTargets: (s, p) => alive(s).filter((t) => t.id !== p.id),
    resolveAction: (s, a) => ({
      ...a,
      result: a.targetId ? seerResult(s, a.targetId) : undefined,
    }),
  },
  witch: {
    id: "witch",
    name: "Phù thủy",
    team: "village",
    description: "Một bình cứu, một bình độc. Mỗi bình dùng một lần.",
    nightPriority: 40,
    hasNightAction: true,
    motif: "Bình & thảo mộc",
    resources: ["heal", "poison"],
    visibility: "secret",
    canAct: (_s, p) =>
      p.alive && (!p.roleState.usage.heal || !p.roleState.usage.poison),
    getEligibleTargets: alive,
    resolveAction: resolveWitch,
  },
  hunter: {
    id: "hunter",
    name: "Thợ săn",
    team: "village",
    description: "Khi chết, có thể bắn một người còn sống.",
    nightPriority: 0,
    hasNightAction: false,
    motif: "Cung & rừng",
    resources: ["shot"],
    deathTrigger: "hunter",
    visibility: "secret",
    canAct: () => false,
    getEligibleTargets: alive,
    resolveAction: identity,
  },
  villager: {
    id: "villager",
    name: "Dân thường",
    team: "village",
    description: "Lắng nghe, suy luận và bỏ phiếu tìm ra bầy Sói.",
    nightPriority: 0,
    hasNightAction: false,
    motif: "Nhà & đèn",
    resources: [],
    visibility: "secret",
    canAct: () => false,
    getEligibleTargets: () => [],
    resolveAction: identity,
  },
  tanner: {
    id: "tanner",
    name: "Chán đời",
    team: "neutral",
    description:
      "Chỉ muốn rời làng. Thắng một mình nếu bị cả làng bỏ phiếu treo cổ.",
    nightPriority: 0,
    hasNightAction: false,
    motif: "Dây thừng & mặt buồn",
    resources: [],
    visibility: "secret",
    canAct: () => false,
    getEligibleTargets: () => [],
    resolveAction: identity,
  },
};
export const teamNames: Record<Team, string> = {
  village: "Phe Dân",
  wolves: "Phe Sói",
  neutral: "Chán đời",
};
export const roleList = Object.values(roles);
