"use client";
import { useState } from "react";
import { ArrowRight, EyeOff, Moon } from "lucide-react";
import type { GameState } from "../domain/types";
import type { Command } from "../engine/engine";
import {
  getCurrentAction,
  wolfAttacks,
  wolfTargets,
} from "../engine/selectors";
import {
  ActionPanel,
  AbilityBadge,
  ConfirmationDialog,
  GameButton,
  PlayerToken,
  RoleCard,
} from "../components/ui";
import { playerName } from "../story/narrative";
import { healableVictims, seerResult } from "../roles/abilities";
export function NightTurn({
  state,
  onCommand,
  busy,
}: {
  state: GameState;
  onCommand: (c: Command) => Promise<boolean>;
  busy: boolean;
}) {
  const action = getCurrentAction(state)!;
  const actor = state.players.find((p) => p.id === action.actorId)!;
  const [target, setTarget] = useState<string>(),
    [heal, setHeal] = useState(false),
    [healTarget, setHealTarget] = useState<string>(),
    [poison, setPoison] = useState<string>(),
    [preview, setPreview] = useState(false),
    [skip, setSkip] = useState(false);
  const hunter = action.kind === "hunter",
    witch = action.kind === "witch",
    seer = action.kind === "seer";
  const victims = wolfTargets(state),
    healable = healableVictims(state, actor),
    canHeal = healable.length > 0,
    healedId = healable.length === 1 ? healable[0] : healTarget;
  const bites = wolfAttacks(state),
    bite = state.nightActions.filter((a) => a.kind === "werewolf").length + 1;
  if (action.fake)
    return (
      // The role is out of play; the moderator calls it anyway, so the screen
      // stays quiet and only lets them move on.
      <div className="fake-call">
        <div className="fake-call-dim" aria-hidden="true">
          <RoleCard role={action.kind} />
        </div>
        <GameButton
          variant="secondary"
          disabled={busy}
          onClick={() => void onCommand({ type: "fakeCall" })}
        >
          Tiếp tục
          <ArrowRight size={18} />
        </GameButton>
      </div>
    );
  const submit = () =>
    void onCommand(
      action.kind === "hunter"
        ? { type: "hunter", targetId: target }
        : {
            type: "night",
            action: {
              kind: action.kind,
              actorId: action.actorId,
              targetId: witch ? undefined : target,
              heal: witch ? heal : undefined,
              healedId: witch && heal ? healedId : undefined,
              poisonId: witch ? poison : undefined,
            },
          },
    );
  return (
    <>
      <RoleCard role={action.kind} active>
        <AbilityBadge>
          {hunter
            ? "LƯỢT KHI CHẾT"
            : `LƯỢT CỦA ${action.actorIds.map((id) => playerName(state, id)).join(", ")}`}
        </AbilityBadge>
      </RoleCard>
      <ActionPanel
        title={
          hunter
            ? "Phát súng cuối cùng"
            : witch
              ? "Hai bình thuốc. Một quyết định."
              : seer
                ? "Chọn một người để soi"
                : action.kind === "guard"
                  ? "Đêm nay, bảo vệ ai?"
                  : bite > 1
                    ? "Bầy Sói chọn người thứ hai?"
                    : "Bầy Sói chọn ai?"
        }
        description={
          hunter
            ? "Thợ săn đã chết. Xử lý phát súng trước khi xét thắng. Có thể chọn không bắn."
            : witch
              ? "Bình cứu chỉ ngăn Sói tấn công. Bình độc xuyên qua bảo vệ và bình cứu."
              : action.kind === "guard" &&
                  !state.settings.canProtectSamePlayerConsecutively
                ? `Không được lặp lại mục tiêu đêm trước${actor.roleState.lastProtected ? `: ${playerName(state, actor.roleState.lastProtected)}` : "."}`
                : bites > 1 && action.kind === "werewolf"
                  ? `Sói con đã chết, đêm nay bầy Sói cắn hai người. Lượt cắn ${bite}/${bites}.`
                  : "Chỉ các mục tiêu hợp lệ xuất hiện bên dưới."
        }
      >
        {witch && (
          <>
            <div className="wolf-victim">
              <Moon size={22} />
              <div>
                <small>MỤC TIÊU CỦA SÓI</small>
                <strong>
                  {victims.length
                    ? victims.map((id) => playerName(state, id)).join(" · ")
                    : "Không có mục tiêu"}
                </strong>
              </div>
            </div>
            <div className="potion-status">
              <AbilityBadge>
                Bình cứu: {actor.roleState.usage.heal ? "đã dùng" : "còn"}
              </AbilityBadge>
              <AbilityBadge>
                Bình độc: {actor.roleState.usage.poison ? "đã dùng" : "còn"}
              </AbilityBadge>
            </div>
            <label
              className={`toggle potion-toggle ${!canHeal ? "unavailable" : ""}`}
            >
              <input
                type="checkbox"
                checked={heal}
                disabled={!canHeal || busy}
                onChange={(e) => {
                  setHeal(e.target.checked);
                  if (
                    e.target.checked &&
                    !state.settings.canUseBothPotionsSameNight
                  )
                    setPoison(undefined);
                }}
              />
              Dùng bình cứu{!canHeal && " (không khả dụng)"}
            </label>
            {heal && healable.length > 1 && (
              <fieldset className="heal-choice">
                <legend>Cứu ai?</legend>
                {healable.map((id) => (
                  <label key={id} className="toggle">
                    <input
                      type="radio"
                      name="heal-target"
                      checked={healTarget === id}
                      disabled={busy}
                      onChange={() => setHealTarget(id)}
                    />
                    {playerName(state, id)}
                  </label>
                ))}
              </fieldset>
            )}
            {!actor.roleState.usage.poison && (
              <>
                <h3>
                  Chọn người dùng độc{" "}
                  <span className="muted">· không bắt buộc</span>
                </h3>
                {heal && !state.settings.canUseBothPotionsSameNight ? (
                  <p className="muted">
                    Đã chọn cứu. Tắt bình cứu nếu muốn dùng độc.
                  </p>
                ) : (
                  <div className="player-grid">
                    {state.players
                      .filter((p) => action.eligibleIds.includes(p.id))
                      .map((p) => (
                        <PlayerToken
                          key={p.id}
                          player={p}
                          selected={poison === p.id}
                          onClick={() =>
                            setPoison(poison === p.id ? undefined : p.id)
                          }
                          disabled={busy}
                        />
                      ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
        {!witch && (
          <div className="player-grid">
            {state.players
              .filter((p) => action.eligibleIds.includes(p.id))
              .map((p) => (
                <PlayerToken
                  key={p.id}
                  player={p}
                  selected={target === p.id}
                  disabled={busy || preview}
                  onClick={() => {
                    setTarget(p.id);
                    setPreview(false);
                  }}
                />
              ))}
          </div>
        )}
        {seer && preview && target && (
          <div className="seer-result" role="status">
            <EyeOff size={22} />
            <span>{playerName(state, target)}</span>
            <strong>
              {seerResult(state, target) ? "MA SÓI" : "KHÔNG PHẢI MA SÓI"}
            </strong>
            <GameButton variant="ghost" onClick={() => setPreview(false)}>
              Chọn lại
            </GameButton>
          </div>
        )}
        <div className="action-footer">
          {!witch && (
            <GameButton
              variant="ghost"
              disabled={busy}
              onClick={() => setSkip(true)}
            >
              {hunter ? "Không bắn" : "Bỏ qua lượt"}
            </GameButton>
          )}
          <GameButton
            disabled={
              busy || (!witch && !target) || (witch && heal && !healedId)
            }
            onClick={() => (seer && !preview ? setPreview(true) : submit())}
          >
            {seer && !preview
              ? "Xem kết quả"
              : witch
                ? heal || poison
                  ? "Xác nhận dùng thuốc"
                  : "Giữ lại bình thuốc"
                : "Xác nhận & tiếp tục"}
            <ArrowRight size={18} />
          </GameButton>
        </div>
      </ActionPanel>
      {skip && (
        <ConfirmationDialog
          title={hunter ? "Không bắn ai?" : "Bỏ qua lượt này?"}
          onClose={() => setSkip(false)}
          onConfirm={() => {
            void onCommand(
              action.kind === "hunter"
                ? { type: "hunter" }
                : {
                    type: "night",
                    action: { kind: action.kind, actorId: action.actorId },
                  },
            );
            setSkip(false);
          }}
        >
          <p>Quyết định được lưu trong nhật ký và có thể hoàn tác.</p>
        </ConfirmationDialog>
      )}
    </>
  );
}
