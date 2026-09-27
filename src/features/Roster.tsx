"use client";
import type { ReactNode } from "react";
import type { GameState, Player } from "../domain/types";
import { roleAssets } from "../components/ui";
import { roles } from "../roles/registry";
import { hunterMayShoot } from "../roles/abilities";
import { deathLabels, playerName } from "../story/narrative";
// The moderator's private ledger: every seat in table order, with the role
// and whatever the moderator needs to remember about it right now.
export function Roster({
  state,
  header,
}: {
  state: GameState;
  header: ReactNode;
}) {
  const alive = state.players.filter((p) => p.alive),
    dead = state.players.filter((p) => !p.alive);
  const wolves = alive.filter((p) => roles[p.role].team === "wolves");
  const others = alive.length - wolves.length;
  return (
    <main className={`game-page ${state.phase} roster-page`}>
      <div className="shell">
        {header}
        <header className="roster-head">
          <h1>
            {state.phase === "night" ? "Đêm" : "Ngày"} {state.round}
          </h1>
          <div
            className="balance"
            role="img"
            aria-label={`${wolves.length} Sói và ${others} người khác còn sống`}
          >
            {[...wolves, ...alive.filter((p) => !wolves.includes(p))].map(
              (p) => (
                <span
                  key={p.id}
                  className={`balance-dot team-${roles[p.role].team}`}
                />
              ),
            )}
          </div>
          <p>
            {wolves.length} Sói, {others} người khác còn sống.{" "}
            {wolves.length > 0 && others - wolves.length === 1
              ? "Mất thêm một người nữa là Sói thắng."
              : ""}
          </p>
        </header>
        <ol className="ledger">
          {alive.map((p) => (
            <Seat key={p.id} state={state} player={p} />
          ))}
        </ol>
        {dead.length > 0 && (
          <>
            <h2 className="ledger-title">Đã rời làng</h2>
            <ol className="ledger ledger-dead">
              {dead.map((p) => (
                <Seat key={p.id} state={state} player={p} />
              ))}
            </ol>
          </>
        )}
      </div>
    </main>
  );
}
function Seat({ state, player: p }: { state: GameState; player: Player }) {
  const notes = seatNotes(state, p);
  return (
    <li className={`seat role-${p.role}`}>
      {/* Local original SVG illustrations are intentional native images. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={roleAssets[p.role]} alt="" width={52} height={58} />
      <div className="seat-body">
        <div className="seat-name">
          <strong>{p.name}</strong>
          <span>{roles[p.role].name}</span>
        </div>
        {notes.length > 0 && (
          <ul className="seat-notes">
            {notes.map((n) => (
              <li key={n.text} className={n.tone}>
                {n.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
interface Note {
  text: string;
  tone: "threat" | "event" | "resource" | "quiet";
}
function seatNotes(s: GameState, p: Player): Note[] {
  const notes: Note[] = [];
  const event = (text: string) => notes.push({ text, tone: "event" });
  const threat = (text: string) => notes.push({ text, tone: "threat" });
  const resource = (text: string, spent = false) =>
    notes.push({ text, tone: spent ? "quiet" : "resource" });
  if (p.death)
    notes.push({
      text: `${deathLabels[p.death.cause]}, ${p.death.phase === "night" ? "đêm" : "ngày"} ${p.death.round}`,
      tone: "quiet",
    });
  if (s.stage === "defense" && s.suspectId === p.id) event("Đang thanh minh");
  if (s.phase === "night")
    for (const a of s.nightActions) {
      if (a.kind === "werewolf" && a.targetId === p.id) threat("Bị Sói nhắm");
      if (a.kind === "guard" && a.targetId === p.id) event("Được bảo vệ");
      if (a.kind === "seer" && a.targetId === p.id) event("Đã bị soi");
      if (a.healedId === p.id) event("Được cứu");
      if (a.poisonId === p.id) threat("Trúng độc");
    }
  if (p.role === "witch") {
    resource(
      p.roleState.usage.heal ? "Đã dùng bình cứu" : "Còn bình cứu",
      p.roleState.usage.heal,
    );
    resource(
      p.roleState.usage.poison ? "Đã dùng bình độc" : "Còn bình độc",
      p.roleState.usage.poison,
    );
  }
  if (p.role === "hunter")
    resource(
      p.roleState.usage.shot
        ? "Đã xử lý phát súng"
        : p.death && !hunterMayShoot(s.settings, p.death.cause)
          ? "Không được bắn"
          : "Còn phát súng",
      p.roleState.usage.shot || !!p.death,
    );
  const guarded = p.roleState.lastProtected;
  if (
    p.role === "guard" &&
    p.alive &&
    guarded &&
    !s.settings.canProtectSamePlayerConsecutively &&
    !s.nightActions.some((a) => a.actorId === p.id)
  )
    resource(`Không được che ${playerName(s, guarded)} liên tiếp`);
  return notes;
}
