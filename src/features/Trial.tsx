"use client";
import { useRef, useState, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { GameState } from "../domain/types";
import type { Command } from "../engine/engine";
import { GameButton, RoundTable, SeatToken } from "../components/ui";
import { playerName } from "../story/narrative";
// The village counts hands at the table; the app only records who was put
// on trial and whether the village hanged or spared them.
export function Nomination({
  state,
  onCommand,
  busy,
}: {
  state: GameState;
  onCommand: (c: Command) => Promise<boolean>;
  busy: boolean;
}) {
  const [suspect, setSuspect] = useState<string>();
  const chosen = state.players.find((p) => p.id === suspect);
  return (
    <section className="turn" aria-labelledby="turn-title">
      <header>
        <h2 id="turn-title">Làng nghi ai nhất?</h2>
        <p className="muted">
          Sau khi thảo luận, chạm ghế người bị nghi rồi mời họ lên ở giữa bàn.
        </p>
      </header>
      <RoundTable
        day
        seats={state.players.map((p) => (
          <SeatToken
            key={p.id}
            player={p}
            disabled={busy || !p.alive}
            selected={suspect === p.id}
            label={p.alive ? `Chọn ${p.name}` : `${p.name}, đã chết`}
            onClick={() => setSuspect(suspect === p.id ? undefined : p.id)}
          />
        ))}
        center={
          chosen ? (
            <>
              <strong>{chosen.name}</strong>
              <button
                type="button"
                className="rt-action"
                disabled={busy}
                aria-label={`Mời ${chosen.name} lên thanh minh`}
                onClick={() =>
                  void onCommand({ type: "nominate", targetId: chosen.id })
                }
              >
                Mời {chosen.name} lên
              </button>
            </>
          ) : (
            <span className="rt-hint">Chạm người làng nghi nhất</span>
          )
        }
      />
      <div className="turn-footer">
        <GameButton
          variant="ghost"
          disabled={busy}
          onClick={() => void onCommand({ type: "nominate" })}
        >
          Không đưa ai lên, sang đêm
        </GameButton>
      </div>
    </section>
  );
}
// Past this distance a released swipe counts as a verdict.
const VERDICT_SWIPE = 110;
export function Defense({
  state,
  onCommand,
  busy,
}: {
  state: GameState;
  onCommand: (c: Command) => Promise<boolean>;
  busy: boolean;
}) {
  const name = playerName(state, state.suspectId);
  const [dx, setDx] = useState(0),
    [dragging, setDragging] = useState(false);
  const start = useRef(0);
  const decide = (execute: boolean) => {
    setDx(0);
    setDragging(false);
    void onCommand({ type: "verdict", execute });
  };
  const ratio = Math.max(-1, Math.min(1, dx / VERDICT_SWIPE));
  const release = () => {
    if (!dragging) return;
    if (dx > VERDICT_SWIPE) decide(true);
    else if (dx < -VERDICT_SWIPE) decide(false);
    else {
      setDx(0);
      setDragging(false);
    }
  };
  return (
    <section className="turn" aria-labelledby="turn-title">
      <header>
        <h2 id="turn-title">{name} thanh minh.</h2>
        <p className="muted">
          Nghe xong, vuốt thẻ sang phải để treo cổ, sang trái để tha. Hoặc bấm
          nút bên dưới.
        </p>
      </header>
      <div className="verdict-stage">
        <span
          className="verdict-side spare"
          style={{ opacity: 0.35 + Math.max(0, -ratio) * 0.65 }}
          aria-hidden="true"
        >
          <ChevronLeft size={26} />
          Tha
        </span>
        <div
          className={`verdict-card ${ratio > 0.25 ? "to-hang" : ratio < -0.25 ? "to-spare" : ""}`}
          style={{
            transform: `translateX(${dx}px) rotate(${dx / 16}deg)`,
            transition: dragging ? "none" : undefined,
          }}
          onPointerDown={(e: PointerEvent<HTMLDivElement>) => {
            if (busy) return;
            start.current = e.clientX;
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging(true);
          }}
          onPointerMove={(e) => {
            if (dragging) setDx(e.clientX - start.current);
          }}
          onPointerUp={release}
          onPointerCancel={() => {
            setDx(0);
            setDragging(false);
          }}
        >
          <span
            className={`pcard-initial avatar-${name.codePointAt(0)! % 4}`}
            aria-hidden="true"
          >
            {name.slice(0, 1).toLocaleUpperCase("vi")}
          </span>
          <strong>{name}</strong>
          <span className="muted">đang thanh minh</span>
        </div>
        <span
          className="verdict-side hang"
          style={{ opacity: 0.35 + Math.max(0, ratio) * 0.65 }}
          aria-hidden="true"
        >
          <ChevronRight size={26} />
          Treo cổ
        </span>
      </div>
      <div className="verdict-buttons">
        <GameButton
          variant="secondary"
          className="spare"
          disabled={busy}
          onClick={() => decide(false)}
        >
          Tha
        </GameButton>
        <GameButton
          variant="danger"
          disabled={busy}
          onClick={() => decide(true)}
        >
          Treo cổ
        </GameButton>
      </div>
    </section>
  );
}
