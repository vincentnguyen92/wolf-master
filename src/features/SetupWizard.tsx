"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Shuffle,
  Trash2,
  ChevronUp,
} from "lucide-react";
import {
  defaultSettings,
  type GameConfig,
  type GameSettings,
  type RoleId,
} from "../domain/types";
import { roleList, roles } from "../roles/registry";
import { GameButton, RoleCard, SecretBadge } from "../components/ui";
import { shuffled } from "../lib/demo";
import { newId } from "../lib/id";
import { validateConfig } from "../engine/engine";
const roleSettings: {
  role: RoleId;
  items: { key: keyof GameSettings; label: string }[];
}[] = [
  {
    role: "guard",
    items: [
      {
        key: "canProtectSamePlayerConsecutively",
        label: "Được bảo vệ cùng một người hai đêm liên tiếp",
      },
    ],
  },
  {
    role: "witch",
    items: [
      { key: "canHealSelf", label: "Được tự cứu mình" },
      {
        key: "canUseBothPotionsSameNight",
        label: "Được dùng hai bình cùng đêm",
      },
    ],
  },
  {
    role: "hunter",
    items: [
      {
        key: "hunterShootsWhenExecuted",
        label: "Được bắn khi bị làng treo cổ",
      },
      {
        key: "hunterShootsWhenPoisoned",
        label: "Được bắn khi trúng độc của Phù thủy",
      },
    ],
  },
];
const steps = ["Ngôi làng", "Người chơi", "Bộ vai", "Gán vai", "Sẵn sàng"];
import { readDraftJournal, writeDraftJournal } from "../storage/draft";
import { db, type WizardSnapshot } from "../storage/db";
type SetupProps = {
  gameId: string;
  config: GameConfig;
  onSave: (c: GameConfig) => Promise<boolean>;
  onStart: (c: GameConfig) => Promise<void>;
  busy: boolean;
  onHome: () => void;
};
export function SetupWizard(props: SetupProps) {
  const [loaded, setLoaded] = useState<{ snapshot?: WizardSnapshot } | null>(
    null,
  );
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    db.drafts
      .get(props.gameId)
      .then((snapshot) => {
        if (active)
          setLoaded({ snapshot: readDraftJournal(props.gameId) ?? snapshot });
      })
      .catch((e: unknown) =>
        setError(`Không tải được bản nháp: ${(e as Error).message}`),
      );
    return () => {
      active = false;
    };
  }, [props.gameId]);
  if (error)
    return (
      <main className="shell">
        <p className="error" role="alert">
          {error}
        </p>
        <GameButton onClick={props.onHome}>Trang chủ</GameButton>
      </main>
    );
  if (!loaded)
    return (
      <main className="loading">
        <p>Đang mở bản nháp…</p>
      </main>
    );
  return <SetupContent {...props} initial={loaded.snapshot} />;
}
function SetupContent({
  gameId,
  initial,
  config,
  onSave,
  onStart,
  busy,
  onHome,
}: SetupProps & { initial?: WizardSnapshot }) {
  const [name, setName] = useState(""),
    [error, setError] = useState(""),
    [revealed, setRevealed] = useState(false);
  const [snapshot, setSnapshot] = useState<WizardSnapshot>(() =>
    initial
      ? // Drafts saved before a role existed have no count for it.
        {
          ...initial,
          config: {
            ...initial.config,
            settings: { ...defaultSettings, ...initial.config.settings },
          },
          counts: {
            ...(Object.fromEntries(roleList.map((r) => [r.id, 0])) as Record<
              RoleId,
              number
            >),
            ...initial.counts,
          },
        }
      : {
          id: gameId,
          config,
          step: 0,
          counts: Object.fromEntries(
            roleList.map((r) => [
              r.id,
              config.players.filter((p) => p.role === r.id).length,
            ]),
          ) as Record<RoleId, number>,
        },
  );
  const latest = useRef(snapshot);
  const { config: draft, step, counts } = snapshot;
  const updateSnapshot = (patch: Partial<WizardSnapshot>) => {
    const next = { ...latest.current, ...patch };
    try {
      writeDraftJournal(next);
    } catch (e) {
      setError(`Chưa lưu được bản nháp tức thời: ${(e as Error).message}`);
    }
    latest.current = next;
    setSnapshot(next);
  };
  const setDraft = (config: GameConfig) => updateSnapshot({ config });
  const setStep = (step: number) => updateSnapshot({ step });
  const setCounts = (counts: Record<RoleId, number>) =>
    updateSnapshot({ counts });
  useEffect(() => {
    db.drafts
      .put({ id: gameId, config: draft, step, counts })
      .catch((e: unknown) =>
        setError(`Chưa lưu được bản nháp: ${(e as Error).message}`),
      );
  }, [gameId, draft, step, counts]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0),
    wolves = roleList
      .filter((r) => r.team === "wolves")
      .reduce((sum, r) => sum + counts[r.id], 0);
  const update = (patch: Partial<GameConfig>) =>
    setDraft({ ...draft, ...patch });
  const addPlayer = () => {
    const clean = name.trim();
    if (!clean) return;
    if (
      draft.players.some(
        (p) => p.name.toLocaleLowerCase("vi") === clean.toLocaleLowerCase("vi"),
      )
    ) {
      setError("Tên này đã có trong làng.");
      return;
    }
    update({
      players: [
        ...draft.players,
        { id: newId(), name: clean, role: "villager" },
      ],
    });
    setName("");
    setError("");
  };
  const next = async () => {
    try {
      setError("");
      let next = draft;
      validateConfig(draft);
      if (step === 1 && draft.players.length < 4)
        throw new Error("Cần ít nhất 4 người chơi.");
      // Keep a composition that already fits the table (e.g. carried over
      // from a previous game); only suggest one when the headcount changed.
      if (step === 1 && total !== draft.players.length) {
        const n = draft.players.length;
        const recommended: Record<RoleId, number> = {
          werewolf: n >= 7 ? 2 : 1,
          wolf_cub: 0,
          tanner: 0,
          seer: 1,
          guard: n >= 6 ? 1 : 0,
          witch: n >= 8 ? 1 : 0,
          hunter: n >= 8 ? 1 : 0,
          villager: 0,
        };
        recommended.villager =
          n - Object.values(recommended).reduce((a, b) => a + b, 0);
        setCounts(recommended);
      }
      if (step === 2) {
        if (total !== draft.players.length)
          throw new Error("Số lá bài phải bằng số người chơi.");
        const deck = roleList.flatMap((r) =>
          Array<RoleId>(counts[r.id]).fill(r.id),
        );
        next = {
          ...draft,
          players: draft.players.map((p, i) => ({ ...p, role: deck[i] })),
        };
        validateConfig(next, true);
        setDraft(next);
      }
      if (step === 3) validateConfig(draft, true);
      if (await onSave(next)) setStep(step + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <main className="shell setup">
      <div className="topline">
        <GameButton variant="ghost" onClick={onHome}>
          <ArrowLeft size={18} />
          Trang chủ
        </GameButton>
        <span className="brand-small">LÀNG TRĂNG</span>
      </div>
      <SecretBadge />
      <header className="page-heading">
        <span className="eyebrow">CHUẨN BỊ MỘT ĐÊM DÀI</span>
        <h1>Dựng một ngôi làng.</h1>
        <p>Mọi bí mật bắt đầu từ đây.</p>
      </header>
      <ol className="stepper">
        {steps.map((s, i) => (
          <li
            key={s}
            aria-current={i === step ? "step" : undefined}
            className={i === step ? "current" : i < step ? "complete" : ""}
          >
            <span>{i + 1}</span>
            <small>{s}</small>
          </li>
        ))}
      </ol>
      <section className="panel">
        <h2>{steps[step]}</h2>
        {step === 0 && (
          <>
            <label htmlFor="game-name">Tên ván chơi</label>
            <input
              id="game-name"
              maxLength={80}
              value={draft.name}
              onChange={(e) => update({ name: e.target.value })}
            />
            <p className="muted">
              Một ngôi làng, một quản trò. Không cần tài khoản hay điện thoại
              của người chơi.
            </p>
          </>
        )}
        {step === 1 && (
          <>
            <p className="muted">
              {draft.players.length} người · tối thiểu 4 · mỗi người một tên
              riêng
            </p>
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                addPlayer();
              }}
            >
              <label className="sr-only" htmlFor="new-player">
                Tên người chơi
              </label>
              <input
                id="new-player"
                value={name}
                maxLength={40}
                placeholder="Tên người chơi…"
                onChange={(e) => setName(e.target.value)}
              />
              <GameButton type="submit" aria-label="Thêm người chơi">
                <Plus size={20} />
              </GameButton>
            </form>
            <div className="setup-players">
              {draft.players.map((p, i) => (
                <div className="edit-player" key={p.id}>
                  <span className="seat">{String(i + 1).padStart(2, "0")}</span>
                  <input
                    aria-label={`Tên người chơi ${i + 1}`}
                    value={p.name}
                    maxLength={40}
                    onChange={(e) =>
                      update({
                        players: draft.players.map((x) =>
                          x.id === p.id ? { ...x, name: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <GameButton
                    variant="ghost"
                    aria-label={`Đưa ${p.name} lên`}
                    disabled={i === 0}
                    onClick={() => {
                      const players = [...draft.players];
                      [players[i - 1], players[i]] = [
                        players[i],
                        players[i - 1],
                      ];
                      update({ players });
                    }}
                  >
                    <ChevronUp size={18} />
                  </GameButton>
                  <GameButton
                    variant="ghost"
                    aria-label={`Xóa ${p.name}`}
                    onClick={() =>
                      update({
                        players: draft.players.filter((x) => x.id !== p.id),
                      })
                    }
                  >
                    <Trash2 size={17} />
                  </GameButton>
                </div>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div className="count-banner">
              <strong>
                {total} / {draft.players.length} lá bài
              </strong>
              <span>
                {wolves} Sói · {total - wolves - counts.tanner} Dân
                {counts.tanner ? ` · ${counts.tanner} Chán đời` : ""}
              </span>
            </div>
            <div className="role-counts">
              {roleList.map((r) => {
                return (
                  <div key={r.id} className={`role-count role-${r.id}`}>
                    <div>
                      <strong>{r.name}</strong>
                      <small>{r.description}</small>
                    </div>
                    <div className="counter">
                      <GameButton
                        aria-label={`Giảm ${r.name}`}
                        variant="secondary"
                        disabled={!counts[r.id]}
                        onClick={() =>
                          setCounts({ ...counts, [r.id]: counts[r.id] - 1 })
                        }
                      >
                        −
                      </GameButton>
                      <span>{counts[r.id]}</span>
                      <GameButton
                        aria-label={`Thêm ${r.name}`}
                        variant="secondary"
                        disabled={
                          r.id !== "villager" && r.id !== "werewolf"
                            ? counts[r.id] >= 1
                            : total >= draft.players.length
                        }
                        onClick={() =>
                          setCounts({ ...counts, [r.id]: counts[r.id] + 1 })
                        }
                      >
                        +
                      </GameButton>
                    </div>
                  </div>
                );
              })}
            </div>
            <section className="role-settings" aria-labelledby="role-settings">
              <h3 id="role-settings">Cài đặt vai</h3>
              <fieldset className="role-settings-group role-general">
                <legend>Dẫn trò</legend>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={draft.settings.callAllRolesEachNight}
                    onChange={(e) =>
                      update({
                        settings: {
                          ...draft.settings,
                          callAllRolesEachNight: e.target.checked,
                        },
                      })
                    }
                  />
                  Gọi đủ các vai mỗi đêm, kể cả vai đã chết hoặc hết kỹ năng
                </label>
              </fieldset>
              {roleSettings.some((g) => counts[g.role]) ? (
                roleSettings
                  .filter((g) => counts[g.role])
                  .map((group) => (
                    <fieldset
                      key={group.role}
                      className={`role-settings-group role-${group.role}`}
                    >
                      <legend>{roles[group.role].name}</legend>
                      {group.items.map((setting) => (
                        <label className="toggle" key={setting.key}>
                          <input
                            type="checkbox"
                            checked={draft.settings[setting.key]}
                            onChange={(e) =>
                              update({
                                settings: {
                                  ...draft.settings,
                                  [setting.key]: e.target.checked,
                                },
                              })
                            }
                          />
                          {setting.label}
                        </label>
                      ))}
                    </fieldset>
                  ))
              ) : (
                <p className="muted">
                  Bộ bài hiện chưa có vai nào cần cài đặt thêm.
                </p>
              )}
            </section>
          </>
        )}
        {step === 3 && (
          <>
            <p className="muted">
              Gán theo bộ bài thực tế hoặc xáo ngẫu nhiên. Đổi vai của một người
              sẽ hoán đổi lá bài với người đang giữ vai đó.
            </p>
            <GameButton
              variant="secondary"
              onClick={() => {
                const deck = shuffled(draft.players.map((p) => p.role));
                update({
                  players: draft.players.map((p, i) => ({
                    ...p,
                    role: deck[i],
                  })),
                });
                setRevealed(false);
              }}
            >
              <Shuffle size={18} />
              Xáo vai ngẫu nhiên
            </GameButton>
            <div className="assignment-list">
              {draft.players.map((p) => (
                <label key={p.id}>
                  <strong>{p.name}</strong>
                  <select
                    aria-label={`Vai của ${p.name}`}
                    value={p.role}
                    onChange={(e) => {
                      const target = e.target.value as RoleId,
                        other = draft.players.find(
                          (x) => x.role === target && x.id !== p.id,
                        );
                      update({
                        players: draft.players.map((x) =>
                          x.id === p.id
                            ? { ...x, role: target }
                            : x.id === other?.id
                              ? { ...x, role: p.role }
                              : x,
                        ),
                      });
                    }}
                  >
                    {roleList
                      .filter((r) => counts[r.id] > 0)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                  </select>
                </label>
              ))}
            </div>
          </>
        )}
        {step === 4 && (
          <>
            <p className="muted">
              {draft.name} · {draft.players.length} người. Kiểm tra kín trước
              khi gọi làng đi ngủ.
            </p>
            <GameButton
              variant="secondary"
              onClick={() => setRevealed(!revealed)}
            >
              {revealed ? "Che toàn bộ vai" : "Mở bảng vai bí mật"}
            </GameButton>
            <div className="review-grid">
              {draft.players.map((p) => (
                <div key={p.id}>
                  <h3>{p.name}</h3>
                  <RoleCard role={p.role} hidden={!revealed} />
                </div>
              ))}
            </div>
            <p className="muted">
              Sói → Bảo vệ → Tiên tri → Phù thủy.{" "}
              {draft.settings.callAllRolesEachNight
                ? "Vai đã chết hoặc hết kỹ năng vẫn được nhắc gọi giả; vai không có trong bộ bài được bỏ qua."
                : "Tự bỏ qua những vai không có, đã chết hoặc hết kỹ năng."}
            </p>
          </>
        )}
      </section>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="sticky-controls">
        <GameButton
          variant="secondary"
          disabled={busy}
          onClick={() => (step ? setStep(step - 1) : onHome())}
        >
          <ArrowLeft size={18} />
          {step ? "Quay lại" : "Trang chủ"}
        </GameButton>
        {step < 4 ? (
          <GameButton disabled={busy} onClick={next}>
            Tiếp tục
            <ArrowRight size={18} />
          </GameButton>
        ) : (
          <GameButton disabled={busy} onClick={() => void onStart(draft)}>
            Bắt đầu đêm 1<ArrowRight size={18} />
          </GameButton>
        )}
      </div>
    </main>
  );
}
