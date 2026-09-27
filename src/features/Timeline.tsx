"use client";
import { Fragment, useState } from "react";
import { Clock3, Copy, Undo2, Moon, Sun } from "lucide-react";
import type { GameEvent, GameState } from "../domain/types";
import { eventGroup, eventText } from "../story/narrative";
import { effectiveEvents } from "../events/replay";
import { Replay } from "./Replay";
import { GameButton } from "../components/ui";
export function CopyButton({
  text,
  label = "Sao chép",
}: {
  text: string;
  label?: string;
}) {
  const [status, setStatus] = useState("");
  return (
    <>
      <GameButton
        variant="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setStatus("Đã sao chép.");
          } catch {
            setStatus(
              "Không truy cập được clipboard. Hãy chọn và sao chép nội dung bên dưới.",
            );
          }
        }}
      >
        <Copy size={16} />
        {label}
      </GameButton>
      <span className="muted" role="status">
        {status}
      </span>
    </>
  );
}
export function TimelineEvent({
  event,
  state,
  undone,
}: {
  event: GameEvent;
  state: GameState;
  undone: boolean;
}) {
  return (
    <li className={`timeline-event ${undone ? "undone" : ""}`}>
      <span className="timeline-dot">
        {event.type === "ACTION_UNDONE" ? (
          <Undo2 size={14} />
        ) : (
          <Clock3 size={14} />
        )}
      </span>
      <div>
        <time dateTime={event.timestamp}>
          {new Date(event.timestamp).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
        <p>{eventText(event, state)}</p>
        {undone && <small>ĐÃ HOÀN TÁC · không còn hiệu lực</small>}
      </div>
    </li>
  );
}
export function Timeline({
  events,
  state,
}: {
  events: GameEvent[];
  state: GameState;
}) {
  const ids = new Set(effectiveEvents(events).map((e) => e.id));
  return (
    <section className="timeline">
      <div className="section-heading">
        <h2>Nhật ký ngôi làng</h2>
        <CopyButton
          label="Chép nhật ký"
          text={effectiveEvents(events)
            .map((e) => `${eventGroup(e)} · ${eventText(e, state)}`)
            .join("\n")}
        />
      </div>
      <Replay events={events} />
      <ol>
        {events.map((e, index) => {
          const group = eventGroup(e),
            header = index === 0 || eventGroup(events[index - 1]) !== group;
          return (
            <Fragment key={e.id}>
              {header && (
                <li className="timeline-group">
                  {group.startsWith("Đêm") ? (
                    <Moon size={18} />
                  ) : (
                    <Sun size={18} />
                  )}
                  <h3>{group}</h3>
                </li>
              )}
              <TimelineEvent
                event={e}
                state={state}
                undone={!ids.has(e.id) && e.type !== "ACTION_UNDONE"}
              />
            </Fragment>
          );
        })}
      </ol>
    </section>
  );
}
