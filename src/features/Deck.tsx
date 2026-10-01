"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { cards, cardImage, type Card } from "../roles/cards";
import { pointsLabel } from "../lib/balance";
import {
  defaultDeckPrefs,
  isMany,
  readDeckPrefs,
  writeDeckPrefs,
  type DeckPrefs,
} from "../storage/deck";
import { GameButton } from "../components/ui";
const GROUPS: { id: Card["group"]; title: string }[] = [
  { id: "village", title: "Phe Dân" },
  { id: "wolves", title: "Phe Sói" },
  { id: "other", title: "Phe riêng" },
];
// The village's deck: real cards; tapping one lifts it and turns it over to
// its back, where the moderator sets how the app may use it.
export function Deck({ onBack }: { onBack: () => void }) {
  const [prefs, setPrefs] = useState<DeckPrefs>(readDeckPrefs),
    [open, setOpen] = useState<Card | null>(null),
    [flipped, setFlipped] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const save = (next: DeckPrefs) => {
    setPrefs(next);
    try {
      writeDeckPrefs(next);
    } catch {
      // Private browsing may refuse storage; the change still applies now.
    }
  };
  const lift = (card: Card) => {
    clearTimeout(timer.current);
    setOpen(card);
    setFlipped(false);
    // Let the card rise first, then turn it over.
    timer.current = setTimeout(() => setFlipped(true), 380);
  };
  const putBack = () => {
    clearTimeout(timer.current);
    setFlipped(false);
    timer.current = setTimeout(() => setOpen(null), 650);
  };
  return (
    <main className="shell deck-page">
      <div className="topline">
        <GameButton variant="ghost" onClick={onBack} aria-label="Về trang chủ">
          <ArrowLeft size={18} />
        </GameButton>
        <span className="brand-small">LÀNG TRĂNG</span>
        <span />
      </div>
      <header className="deck-head">
        <h1>Bộ bài của làng</h1>
        <p className="muted">
          Chạm một lá để lật ra mặt sau và cài đặt. Khi tự chọn bài, app luôn
          chọn bộ cân bằng: tổng điểm in trên các lá gần 0 nhất. Áp dụng cho các
          ván tạo sau này.
        </p>
        <label className="toggle deck-general">
          <input
            type="checkbox"
            checked={prefs.settings.callAllRolesEachNight}
            onChange={(e) =>
              save({
                ...prefs,
                settings: {
                  ...prefs.settings,
                  callAllRolesEachNight: e.target.checked,
                },
              })
            }
          />
          Gọi đủ các vai mỗi đêm, kể cả vai đã chết hoặc hết kỹ năng
        </label>
      </header>
      {GROUPS.map((g) => {
        const list = cards.filter((c) => c.group === g.id);
        return (
          <section key={g.id} className={`deck-group ${g.id}`}>
            <div className="deck-group-head">
              <h2>{g.title}</h2>
              <span>{list.length} lá</span>
            </div>
            <div className="deck-cards">
              {list.map((c) => {
                const manual = c.role && !prefs.cards[c.role].auto;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`real-card ${!c.role || manual ? "off" : ""}`}
                    aria-label={`${c.name}, ${pointsLabel(c.points)} điểm${c.role ? "" : ", chưa có trong app"}. Chạm để cài đặt`}
                    onClick={() => lift(c)}
                  >
                    {/* Local card scans are intentional native images. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cardImage(c.id)}
                      alt=""
                      width={160}
                      height={240}
                    />
                    {!c.role && (
                      <span className="stamp soon">Chưa có trong app</span>
                    )}
                    {manual && (
                      <span className="stamp manual">Không tự chọn</span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      <GameButton variant="ghost" onClick={() => save(defaultDeckPrefs())}>
        Khôi phục mặc định cho cả bộ bài
      </GameButton>
      {open && (
        <div className="lift-layer">
          <button
            type="button"
            className="lift-scrim"
            aria-label="Úp lá xuống"
            onClick={putBack}
          />
          <div
            className={`lift ${flipped ? "flipped" : ""}`}
            role="dialog"
            aria-label={`Cài đặt ${open.name}`}
          >
            <div className="lift-in">
              <div className="lift-face front" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cardImage(open.id)} alt="" width={300} height={450} />
              </div>
              <div className="lift-face back">
                <CardBack card={open} prefs={prefs} save={save} />
                <div className="back-actions">
                  {open.role && (
                    <GameButton
                      variant="ghost"
                      onClick={() => {
                        const fresh = defaultDeckPrefs();
                        save({
                          cards: {
                            ...prefs.cards,
                            [open.role!]: fresh.cards[open.role!],
                          },
                          settings: {
                            ...prefs.settings,
                            ...Object.fromEntries(
                              open.rules.map((r) => [
                                r.key,
                                fresh.settings[r.key],
                              ]),
                            ),
                          },
                        });
                      }}
                    >
                      Mặc định
                    </GameButton>
                  )}
                  <GameButton onClick={putBack}>Lật lại</GameButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
function CardBack({
  card,
  prefs,
  save,
}: {
  card: Card;
  prefs: DeckPrefs;
  save: (p: DeckPrefs) => void;
}) {
  const role = card.role;
  const head = (
    <div className="back-head">
      <span className="muted">
        {card.en}, {pointsLabel(card.points)} điểm
      </span>
      <h2>{card.name}</h2>
    </div>
  );
  if (!role)
    return (
      <>
        {head}
        <p className="back-note">
          Vai này chưa có luật chơi trong app nên chưa dùng được trong ván. Lá
          vẫn nằm trong bộ bài để làm sau.
        </p>
      </>
    );
  const c = prefs.cards[role],
    many = isMany(role);
  const setCard = (patch: Partial<typeof c>) =>
    save({ ...prefs, cards: { ...prefs.cards, [role]: { ...c, ...patch } } });
  return (
    <>
      {head}
      <div className="back-rows">
        <div className="back-row">
          <div>
            <strong>Tự chọn khi chia bài</strong>
            <span className="muted">Tắt thì chỉ thêm tay</span>
          </div>
          <Switch
            on={c.auto}
            label={`Tự chọn ${card.name} khi chia bài`}
            onChange={(auto) => setCard({ auto })}
          />
        </div>
        <div className="back-row">
          <div>
            <strong>Tối đa mỗi ván</strong>
            <span className="muted">
              {many ? "Tự do: chỉ theo số người" : "Số lá trong một ván"}
            </span>
          </div>
          <div className="back-step">
            <button
              type="button"
              aria-label="Giảm số lá tối đa"
              disabled={many ? c.max === 0 : c.max <= 1}
              onClick={() => setCard({ max: c.max - 1 })}
            >
              −
            </button>
            <strong>{c.max === 0 ? "Tự do" : c.max}</strong>
            <button
              type="button"
              aria-label="Tăng số lá tối đa"
              disabled={c.max >= (many ? 8 : 2)}
              onClick={() => setCard({ max: c.max + 1 })}
            >
              +
            </button>
          </div>
        </div>
        {card.rules.map((r) => (
          <div key={r.key} className="back-row">
            <span>{r.label}</span>
            <Switch
              on={prefs.settings[r.key]}
              label={r.label}
              onChange={(on) =>
                save({ ...prefs, settings: { ...prefs.settings, [r.key]: on } })
              }
            />
          </div>
        ))}
        {!card.rules.length && (
          <div className="back-row">
            <span className="muted">Không có luật riêng để chỉnh.</span>
          </div>
        )}
      </div>
    </>
  );
}
function Switch({
  on,
  label,
  onChange,
}: {
  on: boolean;
  label: string;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className="card-switch"
      onClick={() => onChange(!on)}
    >
      <span />
    </button>
  );
}
