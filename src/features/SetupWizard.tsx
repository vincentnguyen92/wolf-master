"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
} from "lucide-react";
import {
  defaultSettings,
  type GameConfig,
  type RoleId,
  type SetupPlayer,
} from "../domain/types";
import { roleList, roles } from "../roles/registry";
import {
  GameButton,
  RoundTable,
  SeatToken,
  SecretBadge,
  roleAssets,
} from "../components/ui";
import { newId } from "../lib/id";
import { validateConfig } from "../engine/engine";
import { balancedDeck, deckPoints, pointsLabel } from "../lib/balance";
import { isMany, readDeckPrefs } from "../storage/deck";
const steps = ["Ngôi làng", "Người chơi", "Bộ bài", "Chia bài", "Sẵn sàng"];
const MIN_PLAYERS = 4,
  MAX_PLAYERS = 20;
// Seats beyond the named ones get a placeholder the moderator can rename.
function seatName(k: number, taken: Set<string>) {
  let name = `Người ${k}`;
  for (let i = k; taken.has(name.toLocaleLowerCase("vi")); i++)
    name = `Người ${i + 1}`;
  return name;
}
function resize(players: SetupPlayer[], n: number): SetupPlayer[] {
  if (players.length >= n) return players.slice(0, n);
  const next = [...players];
  const taken = new Set(next.map((p) => p.name.toLocaleLowerCase("vi")));
  while (next.length < n) {
    const name = seatName(next.length + 1, taken);
    taken.add(name.toLocaleLowerCase("vi"));
    next.push({ id: newId(), name, role: "villager" });
  }
  return next;
}
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
  const [error, setError] = useState(""),
    [prefs] = useState(readDeckPrefs),
    [up, setUp] = useState<Record<string, boolean>>({}),
    [editing, setEditing] = useState<string | null>(null);
  const zero = () =>
    Object.fromEntries(roleList.map((r) => [r.id, 0])) as Record<
      RoleId,
      number
    >;
  const [snapshot, setSnapshot] = useState<WizardSnapshot>(() =>
    initial
      ? // Drafts saved before a role existed have no count for it.
        {
          ...initial,
          config: {
            ...initial.config,
            settings: { ...defaultSettings, ...initial.config.settings },
          },
          counts: { ...zero(), ...initial.counts },
        }
      : {
          id: gameId,
          // A new table starts with 8 seats; a rematch keeps its players.
          config: config.players.length
            ? config
            : { ...config, players: resize([], 8) },
          step: 0,
          counts: config.players.length
            ? (Object.fromEntries(
                roleList.map((r) => [
                  r.id,
                  config.players.filter((p) => p.role === r.id).length,
                ]),
              ) as Record<RoleId, number>)
            : zero(),
        },
  );
  const latest = useRef(snapshot);
  const { config: draft, step, counts } = snapshot;
  const assignment = snapshot.assignment ?? {};
  const firstUnassigned = (dealt: Record<string, RoleId>) =>
    draft.players.find((p) => !dealt[p.id])?.id ?? null;
  // The seat the next tapped role card goes to on the "Chia bài" step.
  const [seat, setSeat] = useState<string | null>(() =>
    firstUnassigned(assignment),
  );
  const [coverDealt, setCoverDealt] = useState(false);
  // Last seat tap, so a quick second tap on a dealt seat returns its card.
  const lastSeatTap = useRef<{ id: string; at: number } | null>(null);
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
  const n = draft.players.length;
  const dealt = draft.players.filter((p) => assignment[p.id]).length;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const sum = deckPoints(counts),
    even = Math.abs(sum) <= 2;
  const deckReady = total === n && counts.werewolf > 0;
  const deckHint = !counts.werewolf
    ? "Cần ít nhất một lá Sói."
    : total < n
      ? `Còn thiếu ${n - total} lá.`
      : total > n
        ? `Thừa ${total - n} lá.`
        : `Đủ ${n} lá cho ${n} người.`;
  const update = (patch: Partial<GameConfig>) =>
    setDraft({ ...draft, ...patch });
  const setCount = (k: number) =>
    update({
      players: resize(
        draft.players,
        Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, k)),
      ),
    });
  const moveSeat = (id: string, d: number) => {
    const i = draft.players.findIndex((p) => p.id === id),
      j = (i + d + n) % n;
    const players = [...draft.players];
    [players[i], players[j]] = [players[j], players[i]];
    update({ players });
  };
  const next = async () => {
    try {
      setError("");
      let next = draft;
      validateConfig(draft);
      if (step === 1 && n < MIN_PLAYERS)
        throw new Error(`Cần ít nhất ${MIN_PLAYERS} người chơi.`);
      // Keep a deck that already fits the table (e.g. carried over from a
      // previous game); otherwise pick the balanced one for this many players.
      if (step === 1 && total !== n) setCounts(balancedDeck(n, prefs));
      if (step === 2) {
        if (total !== n) throw new Error("Số lá bài phải bằng số người chơi.");
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
        if (missing) throw new Error(`Còn ${missing} người chưa có lá.`);
        next = {
          ...draft,
          players: draft.players.map((p) => ({
            ...p,
            role: assignment[p.id],
          })),
        };
        validateConfig(next, true);
        setDraft(next);
        setUp({});
      }
      if (await onSave(next)) setStep(step + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const editingPlayer = draft.players.find((p) => p.id === editing);
  const seatPlayer = draft.players.find((p) => p.id === seat);
  const allUp = draft.players.every((p) => up[p.id]);
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
      <section className="setup-step">
        {step === 0 && (
          <>
            <h1>Dựng một ngôi làng</h1>
            <p className="muted">
              Đặt tên ván và cho biết bàn có bao nhiêu người.
            </p>
            <label htmlFor="game-name">Tên ván chơi</label>
            <input
              id="game-name"
              maxLength={80}
              value={draft.name}
              onChange={(e) => update({ name: e.target.value })}
            />
            <div className="count-box">
              <strong id="player-count-label">Số người chơi</strong>
              <div
                className="count-big"
                role="group"
                aria-labelledby="player-count-label"
              >
                <GameButton
                  variant="secondary"
                  aria-label="Bớt một người"
                  disabled={n <= MIN_PLAYERS}
                  onClick={() => setCount(n - 1)}
                >
                  −
                </GameButton>
                <output aria-live="polite">{n}</output>
                <GameButton
                  variant="secondary"
                  aria-label="Thêm một người"
                  disabled={n >= MAX_PLAYERS}
                  onClick={() => setCount(n + 1)}
                >
                  +
                </GameButton>
              </div>
              <div className="count-chips">
                {[6, 8, 10, 12].map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={k === n ? "on" : ""}
                    aria-pressed={k === n}
                    onClick={() => setCount(k)}
                  >
                    {k} người
                  </button>
                ))}
              </div>
              <p className="muted">
                App sẽ tự chọn bộ bài cân bằng cho {n} người ở bước Bộ bài.
              </p>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h1>Ai ngồi quanh bàn?</h1>
            <p className="muted">
              {n} ghế theo số người đã chọn. Chạm một ghế để đặt tên hoặc dời
              chỗ.
            </p>
            <RoundTable
              seats={draft.players.map((p, i) => (
                <SeatToken
                  key={p.id}
                  player={{ name: p.name, alive: true }}
                  selected={editing === p.id}
                  note={`Ghế ${i + 1}`}
                  label={`Ghế ${i + 1}: ${p.name}`}
                  onClick={() => setEditing(editing === p.id ? null : p.id)}
                />
              ))}
              center={
                editingPlayer ? (
                  <>
                    <label className="rt-hint" htmlFor="seat-name">
                      Ghế {draft.players.indexOf(editingPlayer) + 1}
                    </label>
                    <input
                      id="seat-name"
                      className="seat-input"
                      aria-label={`Tên người ngồi ghế ${draft.players.indexOf(editingPlayer) + 1}`}
                      maxLength={40}
                      value={editingPlayer.name}
                      onChange={(e) =>
                        update({
                          players: draft.players.map((x) =>
                            x.id === editingPlayer.id
                              ? { ...x, name: e.target.value }
                              : x,
                          ),
                        })
                      }
                    />
                    <div className="seat-move">
                      <button
                        type="button"
                        aria-label={`Dời ${editingPlayer.name} ngược chiều kim đồng hồ`}
                        onClick={() => moveSeat(editingPlayer.id, -1)}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Dời ${editingPlayer.name} theo chiều kim đồng hồ`}
                        onClick={() => moveSeat(editingPlayer.id, 1)}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </>
                ) : (
                  <span className="rt-hint">
                    Ghế 1 ở trên cùng, theo chiều kim đồng hồ
                  </span>
                )
              }
            />
            <p className="muted">Đổi số người thì quay lại bước Ngôi làng.</p>
          </>
        )}
        {step === 2 && (
          <>
            <h1>Bộ bài cho ván này</h1>
            <p className="muted">
              App đã chọn bộ cân bằng theo điểm in trên lá. Chạm lá để thêm, dấu
              trừ để bớt.
            </p>
            <div className="table-size">
              <span>
                Bàn có <strong>{n}</strong> người chơi
              </span>
              <button type="button" onClick={() => setStep(0)}>
                Đổi
              </button>
            </div>
            <div className="balance-meter">
              <div>
                <span>Cán cân điểm</span>
                <strong className={even ? "even" : sum < 0 ? "wolf" : "town"}>
                  {pointsLabel(sum)}
                </strong>
              </div>
              <div className="meter" aria-hidden="true">
                <span className="mid" />
                <span
                  className="dot"
                  style={{
                    left: `${50 + Math.max(-10, Math.min(10, sum)) * 5}%`,
                  }}
                />
              </div>
              <div className="meter-labels">
                <span>Nghiêng về Sói</span>
                <strong className={even ? "even" : sum < 0 ? "wolf" : "town"}>
                  {even ? "Cân bằng" : sum < 0 ? "Lệch về Sói" : "Lệch về Dân"}
                </strong>
                <span>Nghiêng về Dân</span>
              </div>
            </div>
            <div className="deck-grid">
              {roleList.map((r) => {
                const count = counts[r.id],
                  limit = prefs.cards[r.id].max || (isMany(r.id) ? n : 1),
                  full = total >= n || count >= limit;
                return (
                  <div key={r.id} className={`deck-slot ${count ? "on" : ""}`}>
                    {/* Local card scans are intentional native images. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={roleAssets[r.id]}
                      alt=""
                      width={80}
                      height={120}
                    />
                    <button
                      type="button"
                      className="deck-add"
                      disabled={full}
                      aria-label={`Thêm ${r.name}`}
                      title={`${r.name}, ${pointsLabel(r.points)} điểm`}
                      onClick={() =>
                        setCounts({ ...counts, [r.id]: count + 1 })
                      }
                    />
                    {count > 0 && (
                      <>
                        <span
                          key={count}
                          className="deck-count"
                          aria-label={`${count} lá`}
                        >
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
            <GameButton
              variant="secondary"
              onClick={() => setCounts(balancedDeck(n, prefs))}
            >
              Chọn lại bộ cân bằng
            </GameButton>
          </>
        )}
        {step === 3 && (
          <>
            <h1>Chia bài</h1>
            <p className="muted">
              Chia từng lá cho từng ghế. Chạm một ghế để đổi lá của người đó,
              chạm nhanh hai lần để trả lá.
            </p>
            <div className="deal-bar">
              <strong>
                Đã chia {dealt} / {n} lá
              </strong>
              <GameButton
                variant="ghost"
                aria-label="Úp lá đã chia"
                aria-pressed={coverDealt}
                onClick={() => setCoverDealt(!coverDealt)}
              >
                {coverDealt ? <EyeOff size={20} /> : <Eye size={20} />}
              </GameButton>
            </div>
            <RoundTable
              seats={draft.players.map((p) => {
                const role = assignment[p.id],
                  picked = seat === p.id;
                return (
                  <span
                    key={p.id}
                    className={`deal-seat ${picked ? "picked" : ""}`}
                  >
                    <button
                      type="button"
                      className="deal-slot"
                      aria-pressed={picked}
                      aria-label={`${p.name}: ${role ? (coverDealt ? "đã có vai" : roles[role].name) : "chưa có vai"}`}
                      onClick={() => {
                        const now = Date.now(),
                          prev = lastSeatTap.current;
                        lastSeatTap.current = { id: p.id, at: now };
                        // Built by hand: iOS Safari does not reliably fire dblclick.
                        if (role && prev?.id === p.id && now - prev.at < 350) {
                          lastSeatTap.current = null;
                          const next = { ...assignment };
                          delete next[p.id];
                          setAssignment(next);
                          setSeat(p.id);
                          return;
                        }
                        setSeat(picked ? null : p.id);
                      }}
                    >
                      {role ? (
                        coverDealt ? (
                          <span className="card-back" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={roleAssets[role]}
                            alt=""
                            width={46}
                            height={69}
                          />
                        )
                      ) : (
                        <Plus size={18} aria-hidden="true" />
                      )}
                    </button>
                    <span className="seat-name">{p.name}</span>
                  </span>
                );
              })}
              center={
                seatPlayer ? (
                  <>
                    <span className="rt-hint">Đang chia cho</span>
                    <strong>{seatPlayer.name}</strong>
                    {assignment[seatPlayer.id] && (
                      <button
                        type="button"
                        className="rt-link"
                        onClick={() => {
                          const next = { ...assignment };
                          delete next[seatPlayer.id];
                          setAssignment(next);
                        }}
                      >
                        Trả lá
                      </button>
                    )}
                  </>
                ) : (
                  <span className="rt-hint">
                    {dealt === n ? "Đã chia đủ" : "Chạm một ghế để chia"}
                  </span>
                )
              }
            />
            <h3 className="tray-title">
              {seatPlayer ? `Chọn lá cho ${seatPlayer.name}` : "Các lá còn lại"}
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
                      className={`tray-card ${off ? "" : "ready"}`}
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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={roleAssets[r.id]}
                        alt=""
                        width={62}
                        height={93}
                      />
                      <span className="tray-left">{left}</span>
                    </button>
                  );
                })}
            </div>
          </>
        )}
        {step === 4 && (
          <>
            <h1>Kiểm tra lần cuối</h1>
            <p className="muted">
              Úp máy về phía bạn. Chạm từng lá để lật xem, chạm lại để úp.
            </p>
            <RoundTable
              seats={draft.players.map((p) => (
                <span key={p.id} className="deal-seat">
                  <button
                    type="button"
                    className={`flip-mini ${up[p.id] ? "up" : ""}`}
                    aria-label={
                      up[p.id]
                        ? `${p.name}: ${roles[p.role].name}`
                        : `Lật lá của ${p.name}`
                    }
                    onClick={() => setUp({ ...up, [p.id]: !up[p.id] })}
                  >
                    <span className="flip-mini-in">
                      <span className="card-back" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={roleAssets[p.role]}
                        alt=""
                        width={50}
                        height={75}
                      />
                    </span>
                  </button>
                  <span className="seat-name">{p.name}</span>
                </span>
              ))}
              center={
                <GameButton
                  variant="secondary"
                  onClick={() =>
                    setUp(
                      allUp
                        ? {}
                        : Object.fromEntries(
                            draft.players.map((p) => [p.id, true]),
                          ),
                    )
                  }
                >
                  {allUp ? "Úp hết" : "Lật hết"}
                </GameButton>
              }
            />
            <div className="call-order">
              <strong>Thứ tự gọi mỗi đêm</strong>
              <span>
                {roleList
                  .filter(
                    (r) =>
                      r.hasNightAction &&
                      r.team !== "wolves" &&
                      draft.players.some((p) => p.role === r.id),
                  )
                  .map((r) => r.name)
                  .reduce((list, name) => `${list}, ${name}`, "Sói")}
              </span>
              <span className="muted">
                {draft.settings.callAllRolesEachNight
                  ? "Vai đã chết vẫn được nhắc gọi giả để giữ bí mật."
                  : "Vai đã chết hoặc hết kỹ năng được bỏ qua."}
              </span>
            </div>
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
