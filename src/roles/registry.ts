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
    name: "Sói",
    points: -6,
    team: "wolves",
    description:
      "Hằng đêm, thức dậy cùng những con Sói khác. Chọn ra một người chơi để ăn thịt.",
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
    points: -8,
    team: "wolves",
    description:
      "Thức dậy cùng bầy Sói. Nếu bị giết, đêm tiếp theo bầy Sói giết 2 người để trả thù.",
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
    name: "Người bảo vệ",
    points: 3,
    team: "village",
    description:
      "Mỗi đêm, chọn ra một người chơi. Sói không giết được người đó trong đêm.",
    nightPriority: 20,
    hasNightAction: true,
    motif: "Khiên & đèn",
    resources: [],
    visibility: "secret",
    canAct: standard,
    getEligibleTargets: (s, p) =>
      alive(s).filter(
        (t) =>
          (s.settings.canProtectSamePlayerConsecutively ||
            p.roleState.lastProtected !== t.id) &&
          (s.settings.guardCanProtectSelf || t.id !== p.id),
      ),
    resolveAction: identity,
  },
  seer: {
    id: "seer",
    name: "Tiên tri",
    points: 7,
    team: "village",
    description:
      "Mỗi đêm, chỉ ra một người và biết được người đó là Dân làng hay là Sói.",
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
    points: 4,
    team: "village",
    description:
      "Được cứu một người bị Sói cắn và giết một người bất kỳ. Mỗi bình dùng một lần.",
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
    points: 3,
    team: "village",
    description: "Nếu bị chết, có thể giết một người khác ngay lập tức.",
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
    name: "Dân làng",
    points: 1,
    team: "village",
    description: "Tìm ra các con Sói và treo cổ chúng.",
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
    name: "Kẻ chán đời",
    points: -2,
    team: "neutral",
    description:
      "Ghét cuộc sống tẻ nhạt. Thắng một mình nếu bị cả làng treo cổ.",
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
  neutral: "Kẻ chán đời",
};
export const roleList = Object.values(roles);
