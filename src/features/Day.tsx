"use client";
import { useState } from "react";
import { ArrowRight, Shield } from "lucide-react";
import type { Game, GameState } from "../domain/types";
import type { Command } from "../engine/engine";
import { effectiveEvents } from "../events/replay";
import { GameButton, roleAssets } from "../components/ui";
import { deathLabels, eventText, playerName } from "../story/narrative";
type DayProps = {
  game: Game;
  state: GameState;
  onCommand: (c: Command) => Promise<boolean>;
  busy: boolean;
};
// Who left the village overnight, with their cards for the moderator only.
export function Morning({ game, state, onCommand, busy }: DayProps) {
  const dead = state.morningDeaths
    .map((id) => state.players.find((p) => p.id === id))
    .filter((p) => !!p);
  const blocked = effectiveEvents(game.events).filter(
    (e) => e.round === state.round && e.type === "WOLF_ATTACK_BLOCKED",
  );
  return (
    <section className="turn day-turn" aria-labelledby="turn-title">
      <header>
        <h2 id="turn-title">Bình minh trước cửa làng.</h2>
        <p className="muted">
          {dead.length
            ? `Đêm qua có ${dead.length} người rời làng.`
            : "Đêm qua không ai chết."}
        </p>
      </header>
      {dead.map((p) => (
        <div key={p.id} className="death-card">
          {/* Local card scans are intentional native images. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={roleAssets[p.role]} alt="" width={76} height={114} />
          <div>
            <strong>{p.name}</strong>
            <span className="cause">
              {p.death ? deathLabels[p.death.cause] : ""}
            </span>
            <span className="muted">
              Lá bài chỉ quản trò thấy. Đừng lật cho cả làng.
            </span>
          </div>
        </div>
      ))}
      {blocked.map((e) => (
        <p key={e.id} className="blocked-note">
          <Shield size={17} aria-hidden="true" />
          {eventText(e, state)}
        </p>
      ))}
      <div className="read-aloud">
        <span className="muted">Đọc cho cả làng</span>
        <p>
          {dead.length
            ? `Trời sáng. Làng mất ${dead.map((p) => p.name).join(", ")} trong đêm.`
            : "Trời sáng. Tất cả đều sống sót qua đêm."}
        </p>
      </div>
      <GameButton
        disabled={busy}
        onClick={() => void onCommand({ type: "advance" })}
      >
        Bắt đầu thảo luận
        <ArrowRight size={18} />
      </GameButton>
    </section>
  );
}
// After the trial: the moderator may turn the hanged player's card over.
export function Verdict({ game, state, onCommand, busy }: DayProps) {
  const [up, setUp] = useState(false);
  const event = effectiveEvents(game.events).findLast(
    (e) => e.type === "VERDICT_REACHED" || e.type === "VOTING_RESOLVED",
  );
  const hangedId =
    event?.type === "VERDICT_REACHED" && event.payload.executed
      ? event.payload.targetId
      : event?.type === "VOTING_RESOLVED"
        ? event.payload.targetId
        : undefined;
  const hanged = state.players.find((p) => p.id === hangedId);
  return (
    <section className="turn day-turn" aria-labelledby="turn-title">
      <header>
        <h2 id="turn-title">
          {hanged ? `${hanged.name} bị treo cổ` : "Làng đã quyết định."}
        </h2>
        <p className="muted">
          {hanged
            ? `${playerName(state, hanged.id)} đã bị treo cổ.`
            : "Không ai bị loại."}
        </p>
      </header>
      {hanged && (
        <div className="verdict-reveal">
          <button
            type="button"
            className={`reveal-card ${up ? "up" : ""}`}
            aria-label={
              up
                ? `Vai của ${hanged.name}. Chạm để úp`
                : `Lật xem vai của ${hanged.name}`
            }
            onClick={() => setUp(!up)}
          >
            <span className="reveal-in">
              <span className="card-back" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={roleAssets[hanged.role]}
                alt=""
                width={200}
                height={300}
              />
            </span>
          </button>
          <span className="muted">
            Chạm lá để quản trò xem vai. Lật kín, đừng để cả làng thấy.
          </span>
        </div>
      )}
      <GameButton
        disabled={busy}
        onClick={() => void onCommand({ type: "advance" })}
      >
        Bắt đầu đêm {state.round + 1}
        <ArrowRight size={18} />
      </GameButton>
    </section>
  );
}
