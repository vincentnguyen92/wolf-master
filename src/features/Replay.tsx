"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, History } from "lucide-react";
import type { GameEvent } from "../domain/types";
import { replay } from "../events/replay";
import { eventText } from "../story/narrative";
import { GameButton, PlayerToken } from "../components/ui";
export function Replay({ events }: { events: GameEvent[] }) {
  const boundaries = events
    .map((e, i) => ({ event: e, index: i }))
    .filter(
      (entry, i) =>
        i === events.length - 1 ||
        events[i + 1].transactionId !== entry.event.transactionId,
    );
  const [position, setPosition] = useState(boundaries.length - 1);
  const safePosition = Math.min(position, boundaries.length - 1),
    boundary = boundaries[safePosition];
  const state = replay(events.slice(0, boundary.index + 1));
  return (
    <details className="panel replay">
      <summary>
        <History size={18} /> Phát lại từng thao tác
      </summary>
      <p className="muted">
        Bản xem lại chỉ đọc. Nhật ký và ván đang chơi được giữ nguyên.
      </p>
      <label htmlFor="replay-position">
        Thao tác {safePosition + 1} / {boundaries.length}
      </label>
      <input
        id="replay-position"
        type="range"
        min={0}
        max={boundaries.length - 1}
        value={safePosition}
        onChange={(e) => setPosition(Number(e.target.value))}
      />
      <p>{eventText(boundary.event, state)}</p>
      <p className="eyebrow">
        {state.phase === "setup"
          ? "Chuẩn bị"
          : `${state.phase === "night" ? "Đêm" : state.phase === "ended" ? "Kết thúc · vòng" : "Ngày"} ${state.round}`}{" "}
        · {state.players.filter((p) => p.alive).length} còn sống
      </p>
      <div className="player-grid">
        {state.players.map((p) => (
          <PlayerToken key={p.id} player={p} secret />
        ))}
      </div>
      <div className="button-row">
        <GameButton
          variant="secondary"
          disabled={safePosition === 0}
          onClick={() => setPosition(safePosition - 1)}
        >
          <ChevronLeft size={18} />
          Trước
        </GameButton>
        <GameButton
          variant="secondary"
          disabled={safePosition === boundaries.length - 1}
          onClick={() => setPosition(safePosition + 1)}
        >
          Sau
          <ChevronRight size={18} />
        </GameButton>
      </div>
    </details>
  );
}
