"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  EyeOff,
  Plus,
  Trash2,
  ChevronUp,
} from "lucide-react";
import {
  defaultSettings,
  type GameConfig,
  type GameSettings,
  type RoleId,
} from "../domain/types";
import { roleList, roles, teamNames } from "../roles/registry";
import {
  GameButton,
  RoleCard,
  SecretBadge,
  roleAssets,
  roleColors,
} from "../components/ui";
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
  const assignment = snapshot.assignment ?? {};
  const firstUnassigned = (dealt: Record<string, RoleId>) =>
    draft.players.find((p) => !dealt[p.id])?.id ?? null;
  // The seat the next tapped role card goes to on the "Gán vai" step.
  const [seat, setSeat] = useState<string | null>(() =>
    firstUnassigned(assignment),
  );
  const [coverDealt, setCoverDealt] = useState(false);
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
  const setAssignment = (assignment: Record<string, RoleId>) =>
    updateSnapshot({ assignment });
  useEffect(() => {
    db.drafts
      .put({
        id: gameId,
        config: draft,
        step,
        counts,
        assignment: snapshot.assignment,
      })
      .catch((e: unknown) =>
        setError(`Chưa lưu được bản nháp: ${(e as Error).message}`),
      );
  }, [gameId, draft, step, counts, snapshot.assignment]);
  const dealt = draft.players.filter((p) => assignment[p.id]).length;
  const total = Object.values(counts).reduce((a, b) => a + b, 0),
    wolves = roleList
      .filter((r) => r.team === "wolves")
      .reduce((sum, r) => sum + counts[r.id], 0);
  const n = draft.players.length;
  const deckSlots = roleList
    .flatMap((r) => Array<string>(counts[r.id]).fill(roleColors[r.id]))
    .concat(Array<string>(Math.max(0, n - total)).fill("var(--line)"))
    .slice(0, Math.max(n, total));
  const deckReady = total === n && counts.werewolf > 0;
  const deckHint = !counts.werewolf
    ? "Cần ít nhất một Ma Sói."
    : total < n
      ? `Còn thiếu ${n - total} lá.`
      : total > n
        ? `Thừa ${total - n} lá, bớt bớt đi.`
        : `${wolves} Sói, ${n - wolves} người còn lại.`;
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
        // Checks the composition only; the moderator deals the cards next.
        validateConfig(
          {
            ...draft,
            players: draft.players.map((p, i) => ({ ...p, role: deck[i] })),
          },
          true,
        );
        const left = { ...counts },
          kept: Record<string, RoleId> = {};
        for (const p of draft.players) {
          const role = assignment[p.id];
          if (role && left[role] > 0) {
            kept[p.id] = role;
            left[role]--;
          }
        }
        setAssignment(kept);
        setSeat(firstUnassigned(kept));
      }
      if (step === 3) {
        const missing = draft.players.filter((p) => !assignment[p.id]).length;
        if (missing) throw new Error(`Còn ${missing} người chưa có vai.`);
        next = {
          ...draft,
          players: draft.players.map((p) => ({
            ...p,
            role: assignment[p.id],
          })),
        };
        validateConfig(next, true);
        setDraft(next);
      }
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
            <div className="deck-bar">
              <div className="deck-slots" aria-hidden="true">
                {deckSlots.map((color, i) => (
                  <span key={i} style={{ background: color }} />
                ))}
              </div>
              <strong>
                {total} / {draft.players.length} lá bài
              </strong>
            </div>
            <p className="muted deck-help">
              Chạm lá để thêm một. Chạm dấu trừ để bớt.
            </p>
            <div className="role-deck">
              {roleList.map((r) => {
                const count = counts[r.id],
                  full =
                    total >= draft.players.length ||
                    (r.id !== "villager" && r.id !== "werewolf" && count >= 1);
                return (
                  <div
                    key={r.id}
                    className={`deck-card role-${r.id} ${count ? "on" : ""}`}
                  >
                    <button
                      type="button"
                      className="deck-add"
                      disabled={full}
                      title={r.description}
                      aria-label={`Thêm ${r.name}`}
                      onClick={() =>
                        setCounts({ ...counts, [r.id]: count + 1 })
                      }
                    >
                      {/* Local original SVG illustrations are intentional native images. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={roleAssets[r.id]}
                        alt=""
                        width={62}
                        height={70}
                      />
                      <span className="deck-name">{r.name}</span>
                      <span className="deck-team">
                        {r.team === "neutral"
                          ? "Phe thứ ba"
                          : teamNames[r.team]}
                      </span>
                    </button>
                    {count > 0 && (
                      <>
                        <span className="deck-count" aria-label={`${count} lá`}>
                          {count}
                        </span>
                        <button
                          type="button"
                          className="deck-minus"
                          aria-label={`Bớt ${r.name}`}
                          onClick={() =>
                            setCounts({ ...counts, [r.id]: count - 1 })
                          }
                        >
                          <span>−</span>
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <p className={`deck-hint ${deckReady ? "" : "warn"}`}>{deckHint}</p>
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
              {seat
                ? `Chọn vai cho ${draft.players.find((p) => p.id === seat)?.name} ở các lá bên dưới.`
                : dealt === draft.players.length
                  ? "Đã chia đủ. Chạm một người để đổi vai."
                  : "Chạm một người để chọn vai cho họ."}
            </p>
            <div className="deal-bar">
              <strong>
                Đã chia {dealt} / {draft.players.length} lá
              </strong>
              <GameButton
                variant="ghost"
                aria-pressed={coverDealt}
                onClick={() => setCoverDealt(!coverDealt)}
              >
                <EyeOff size={16} />
                {coverDealt ? "Hiện vai" : "Úp vai đã chia"}
              </GameButton>
            </div>
            <div className="deal-grid">
              {draft.players.map((p) => {
                const role = assignment[p.id],
                  picked = seat === p.id;
                return (
                  <div
                    key={p.id}
                    className={`deal-seat ${role ? "dealt" : ""} ${role && coverDealt ? "covered" : ""} ${picked ? "picked" : ""}`}
                  >
                    <button
                      type="button"
                      className="deal-seat-tap"
                      aria-pressed={picked}
                      aria-label={`${p.name}: ${role ? (coverDealt ? "đã có vai" : roles[role].name) : "chưa có vai"}`}
                      onClick={() => setSeat(picked ? null : p.id)}
                    >
                      {role ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            coverDealt
                              ? "/assets/icons/card-back.svg"
                              : roleAssets[role]
                          }
                          alt=""
                          width={48}
                          height={54}
                        />
                      ) : (
                        <Plus size={22} aria-hidden="true" />
                      )}
                      {role && !coverDealt && (
                        <span className={`deal-seat-role role-${role}`}>
                          {roles[role].name}
                        </span>
                      )}
                      <span className="deal-seat-name">{p.name}</span>
                    </button>
                    {picked && role && (
                      <button
                        type="button"
                        className="deal-seat-return"
                        onClick={() => {
                          const next = { ...assignment };
                          delete next[p.id];
                          setAssignment(next);
                        }}
                      >
                        Trả lá
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <h3 className="tray-title">
              {seat
                ? `Vai của ${draft.players.find((p) => p.id === seat)?.name}`
                : "Các lá còn lại"}
            </h3>
            <div className="role-tray">
              {roleList
                .filter((r) => counts[r.id] > 0)
                .map((r) => {
                  const left =
                    counts[r.id] -
                    Object.values(assignment).filter((x) => x === r.id).length;
                  const off = !seat || left <= 0;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      className={`tray-card role-${r.id} ${off ? "" : "ready"}`}
                      disabled={off}
                      aria-label={`Chia ${r.name}`}
                      onClick={() => {
                        if (!seat) return;
                        const next = { ...assignment, [seat]: r.id };
                        setAssignment(next);
                        // Move on to the next seat still waiting for a card.
                        const order = draft.players.map((p) => p.id),
                          from = order.indexOf(seat);
                        setSeat(
                          order
                            .slice(from + 1)
                            .concat(order.slice(0, from + 1))
                            .find((id) => !next[id]) ?? null,
                        );
                      }}
                    >
                      <span className="tray-left">{left}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={roleAssets[r.id]}
                        alt=""
                        width={44}
                        height={50}
                      />
                      <span className="tray-name">{r.name}</span>
                    </button>
                  );
                })}
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
