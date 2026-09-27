"use client";
import { NightTurn } from "./NightTurn";
import { Defense, Nomination } from "./Trial";
import { useLayoutEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  EyeOff,
  Moon,
  Sun,
  Undo2,
  Users,
} from "lucide-react";
import { teamNames } from "../roles/registry";
import type { Game, GameState } from "../domain/types";
import type { Command } from "../engine/engine";
import {
  evaluateVictory,
  getAvailableActions,
  getCurrentAction,
} from "../engine/selectors";
import {
  ActionPanel,
  ConfirmationDialog,
  GameButton,
  PhaseHeader,
  SecretBadge,
} from "../components/ui";
import { eventText, playerName } from "../story/narrative";
import { effectiveEvents } from "../events/replay";
import { Roster } from "./Roster";
export function Gameplay({
  game,
  state,
  onCommand,
  onHome,
  busy,
}: {
  game: Game;
  state: GameState;
  onCommand: (c: Command) => Promise<boolean>;
  onHome: () => void;
  busy: boolean;
}) {
  const scroll = useRef(0);
  const [rosterMode, setRosterMode] = useState(
      () => sessionStorage.getItem("lang-trang-roster") === "true",
    ),
    [end, setEnd] = useState(false);
  const action = getCurrentAction(state),
    victory = state.phase === "day" ? evaluateVictory(state) : undefined;
  const last = effectiveEvents(game.events).findLast(
    (e) => e.type === "NIGHT_ACTION",
  );
  const remaining = getAvailableActions(state).length;
  useLayoutEffect(() => {
    window.scrollTo(0, rosterMode ? 0 : scroll.current);
  }, [rosterMode]);
  const toggleRoster = () => {
    const next = !rosterMode;
    if (next) {
      // Remember where the moderator was so switching back lands on the same spot.
      scroll.current = window.scrollY;
      sessionStorage.setItem("lang-trang-roster", "true");
    } else sessionStorage.removeItem("lang-trang-roster");
    setRosterMode(next);
  };
  const topbar = (
    <div className="topline">
      <GameButton variant="ghost" onClick={onHome} aria-label="Về trang chủ">
        <ArrowLeft size={18} />
      </GameButton>
      <span className="brand-small">LÀNG TRĂNG</span>
      <button
        type="button"
        role="switch"
        aria-checked={rosterMode}
        className="roster-toggle"
        onClick={toggleRoster}
      >
        Xem người chơi
        <span className="switch" aria-hidden="true" />
      </button>
    </div>
  );
  if (rosterMode) return <Roster state={state} header={topbar} />;
  return (
    <main className={`game-page ${state.phase}`}>
      <div className="shell">
        {topbar}
        <SecretBadge />
        <PhaseHeader
          title={`${state.phase === "night" ? "Đêm" : "Ngày"} ${state.round}`}
          subtitle={state.name}
        >
          {state.phase === "night" ? <Moon size={34} /> : <Sun size={34} />}
        </PhaseHeader>
        <div className="game-meta">
          <span>
            <Users size={15} />
            {state.players.filter((p) => p.alive).length} /{" "}
            {state.players.length} còn sống
          </span>
          <span>
            {state.phase === "night"
              ? `${remaining} lượt còn lại`
              : state.stage === "morning"
                ? "Kết quả đêm"
                : state.stage === "defense"
                  ? "Thanh minh"
                  : state.stage === "verdict"
                    ? "Phán quyết"
                    : "Thảo luận"}
          </span>
        </div>
        <>
          {action ? (
            <NightTurn
              key={`${game.revision}:${action.kind}:${action.actorId}`}
              state={state}
              onCommand={onCommand}
              busy={busy}
            />
          ) : victory ? (
            <ActionPanel
              title={`${teamNames[victory.team]} đạt điều kiện thắng`}
              description={victory.reason}
            >
              <p>
                Hoàn tác nếu có nhầm lẫn. Chỉ lật toàn bộ vai khi quản trò xác
                nhận.
              </p>
              <GameButton onClick={() => setEnd(true)}>
                Kết thúc & lật bài
                <ArrowRight size={18} />
              </GameButton>
            </ActionPanel>
          ) : state.phase === "night" ? (
            <ActionPanel
              title="Những lời gọi đã khép lại."
              description="Tất cả vai đã hành động. Kết quả được tính đồng thời sau bảo vệ và bình thuốc."
            >
              <GameButton
                disabled={busy}
                onClick={() => void onCommand({ type: "resolveNight" })}
              >
                <Sun size={19} />
                Gọi làng thức dậy
              </GameButton>
            </ActionPanel>
          ) : state.stage === "discussion" || state.stage === "voting" ? (
            <Nomination state={state} onCommand={onCommand} busy={busy} />
          ) : state.stage === "defense" ? (
            <Defense state={state} onCommand={onCommand} busy={busy} />
          ) : (
            <ActionPanel
              title={
                state.stage === "morning"
                  ? "Bình minh trước cửa làng."
                  : "Làng đã quyết định."
              }
              description={
                state.stage === "morning"
                  ? state.morningDeaths.length
                    ? `Đêm qua: ${state.morningDeaths.map((id) => playerName(state, id)).join(", ")} đã chết.`
                    : "Đêm qua không ai chết."
                  : "Kiểm tra kết quả trước khi bước vào đêm tiếp theo."
              }
            >
              {state.stage === "morning" && (
                <ul className="night-reasons">
                  {effectiveEvents(game.events)
                    .filter(
                      (e) =>
                        e.round === state.round &&
                        (e.type === "WOLF_ATTACK_BLOCKED" ||
                          (e.type === "PLAYER_KILLED" && e.phase === "night")),
                    )
                    .map((e) => (
                      <li key={e.id}>{eventText(e, state)}</li>
                    ))}
                </ul>
              )}
              {state.stage === "verdict" && (
                <p>
                  {(() => {
                    const event = effectiveEvents(game.events).findLast(
                      (e) =>
                        e.type === "VERDICT_REACHED" ||
                        e.type === "VOTING_RESOLVED",
                    );
                    return event?.type === "VERDICT_REACHED" &&
                      event.payload.executed
                      ? `${playerName(state, event.payload.targetId)} đã bị treo cổ.`
                      : event?.type === "VOTING_RESOLVED" &&
                          event.payload.targetId
                        ? `${playerName(state, event.payload.targetId)} đã bị loại.`
                        : "Không ai bị loại.";
                  })()}
                </p>
              )}
              <GameButton
                disabled={busy}
                onClick={() => void onCommand({ type: "advance" })}
              >
                {state.stage === "morning"
                  ? "Bắt đầu thảo luận"
                  : `Bắt đầu đêm ${state.round + 1}`}
                <ArrowRight size={18} />
              </GameButton>
            </ActionPanel>
          )}
          {last?.type === "NIGHT_ACTION" &&
            last.round === state.round &&
            last.payload.kind === "seer" && (
              <div className="recent-secret">
                <EyeOff size={17} />
                <span>
                  Vừa soi {playerName(state, last.payload.targetId)}:{" "}
                  {last.payload.targetId
                    ? last.payload.result
                      ? "Ma Sói"
                      : "không phải Ma Sói"
                    : "bỏ qua"}
                  .
                </span>
              </div>
            )}
        </>
        <div className="sticky-controls gameplay-controls">
          <GameButton
            variant="secondary"
            disabled={busy}
            onClick={() => void onCommand({ type: "undo" })}
          >
            <Undo2 size={18} />
            Hoàn tác
          </GameButton>
          <span>
            {busy ? "Đang lưu…" : "Đã lưu trên thiết bị"}
            <small>Hoàn tác cả thao tác gần nhất</small>
          </span>
        </div>
        {end && (
          <ConfirmationDialog
            title="Kết thúc và công khai toàn bộ vai?"
            onClose={() => setEnd(false)}
            onConfirm={() => {
              void onCommand({ type: "end" });
              setEnd(false);
            }}
          >
            <p>
              Biên niên sử, vai trò và toàn bộ bí mật sẽ được mở cho cả bàn.
            </p>
          </ConfirmationDialog>
        )}
      </div>
    </main>
  );
}
