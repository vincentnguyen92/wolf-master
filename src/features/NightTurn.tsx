"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { GameState, Player } from "../domain/types";
import type { Command } from "../engine/engine";
import {
  getAvailableActions,
  getCurrentAction,
  wolfAttacks,
  wolfTargets,
} from "../engine/selectors";
import {
  ConfirmationDialog,
  GameButton,
  PlayerCard,
  RoleCard,
  roleAssets,
  type CardAction,
} from "../components/ui";
import { playerName } from "../story/narrative";
import { healableVictims, seerResult } from "../roles/abilities";
import { roles } from "../roles/registry";
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
    [healedId, setHealedId] = useState<string>(),
    [poison, setPoison] = useState<string>(),
    [poisonPick, setPoisonPick] = useState<string>(),
    [revealed, setRevealed] = useState(false),
    [skip, setSkip] = useState(false);
  const hunter = action.kind === "hunter",
    witch = action.kind === "witch",
    seer = action.kind === "seer";
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
  const pick = (id?: string) =>
    void onCommand(
      action.kind === "hunter"
        ? { type: "hunter", targetId: id }
        : {
            type: "night",
            action: {
              kind: action.kind,
              actorId: action.actorId,
              targetId: id,
            },
          },
    );
  const done = state.nightActions.length + state.fakeCalls.length;
  const total = done + getAvailableActions(state).length;
  const title = hunter
    ? "Thợ săn bắn ai?"
    : witch
      ? "Phù thủy"
      : seer
        ? "Tiên tri soi ai?"
        : action.kind === "guard"
          ? "Đêm nay, bảo vệ ai?"
          : bite > 1
            ? "Bầy Sói chọn người thứ hai?"
            : "Bầy Sói chọn ai?";
  const alive = state.players.filter((p) => p.alive);
  // Why a living player cannot be picked this turn, shown on their card.
  const lockReason = (p: Player) =>
    action.kind === "werewolf" && roles[p.role].team === "wolves"
      ? "Đồng bầy"
      : action.kind === "werewolf" && wolfTargets(state).includes(p.id)
        ? "Đã bị cắn"
        : action.kind === "guard" && actor.roleState.lastProtected === p.id
          ? "Không che liên tiếp"
          : seer && p.id === actor.id
            ? "Chính mình"
            : undefined;
  const verb = hunter ? "Bắn" : action.kind === "guard" ? "Che" : "Cắn";
  return (
    <section className="turn" aria-labelledby="turn-title">
      <header className="turn-head">
        {/* Local original SVG illustrations are intentional native images. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={roleAssets[action.kind]} alt="" width={64} height={72} />
        <div>
          <small>
            {hunter
              ? `${actor.name} vừa chết`
              : `Đêm ${state.round}, lượt ${done + 1} trên ${total}`}
          </small>
          <h2 id="turn-title">{title}</h2>
          <span className={`turn-actors role-${action.kind}`}>
            {hunter
              ? "Có thể chọn không bắn"
              : `${action.actorIds.map((id) => playerName(state, id)).join(" và ")} thức dậy`}
          </span>
        </div>
      </header>
      {bites > 1 && action.kind === "werewolf" && (
        <p className="turn-note">
          Sói con đã chết, đêm nay bầy Sói cắn hai người. Lượt cắn {bite}/
          {bites}.
        </p>
      )}
      {witch ? (
        <WitchChoices
          state={state}
          actorId={actor.id}
          eligibleIds={action.eligibleIds}
          healedId={healedId}
          setHealedId={setHealedId}
          poison={poison}
          setPoison={setPoison}
          poisonPick={poisonPick}
          setPoisonPick={setPoisonPick}
        />
      ) : seer ? (
        <div className="card-grid">
          {alive.map((p) => {
            const reason = lockReason(p),
              up = revealed && target === p.id,
              wolf = up && seerResult(state, p.id);
            return (
              <button
                key={p.id}
                type="button"
                className={`flip-card ${up ? "up" : ""} ${revealed && !up ? "dim" : ""}`}
                disabled={busy || !!reason || revealed}
                aria-label={reason ? `${p.name}, ${reason}` : `Soi ${p.name}`}
                onClick={() => {
                  setTarget(p.id);
                  setRevealed(true);
                }}
              >
                <span className="flip-inner">
                  <span className="flip-face">
                    <span
                      className={`pcard-initial avatar-${p.name.codePointAt(0)! % 4}`}
                      aria-hidden="true"
                    >
                      {p.name.slice(0, 1).toLocaleUpperCase("vi")}
                    </span>
                    <span className="pcard-name">{p.name}</span>
                    {reason && <span className="pcard-note">{reason}</span>}
                  </span>
                  <span
                    className={`flip-face flip-back ${wolf ? "wolf" : "safe"}`}
                    role={up ? "status" : undefined}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={roleAssets[wolf ? "werewolf" : "villager"]}
                      alt=""
                      width={56}
                      height={63}
                    />
                    <strong>{wolf ? "Ma Sói" : "Không phải Sói"}</strong>
                    <span className="pcard-note">{p.name}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="card-grid">
          {alive.map((p) => {
            const reason = lockReason(p),
              eligible = action.eligibleIds.includes(p.id) && !reason;
            const act: CardAction | undefined =
              target === p.id && eligible
                ? {
                    label: verb,
                    name: `${verb} ${p.name}`,
                    tone: action.kind === "guard" ? "calm" : "danger",
                    onClick: () => pick(p.id),
                  }
                : undefined;
            return (
              <PlayerCard
                key={p.id}
                player={p}
                note={reason}
                disabled={busy || !eligible}
                selected={target === p.id}
                action={busy ? undefined : act}
                onClick={() => setTarget(target === p.id ? undefined : p.id)}
              />
            );
          })}
        </div>
      )}
      <div className="turn-footer">
        {seer ? (
          revealed && (
            <>
              <GameButton
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setRevealed(false);
                  setTarget(undefined);
                }}
              >
                Chọn lại
              </GameButton>
              <GameButton disabled={busy} onClick={() => pick(target)}>
                Xong
                <ArrowRight size={18} />
              </GameButton>
            </>
          )
        ) : witch ? (
          <GameButton
            disabled={busy}
            onClick={() =>
              void onCommand({
                type: "night",
                action: {
                  kind: "witch",
                  actorId: actor.id,
                  heal: !!healedId,
                  healedId,
                  poisonId: poison,
                },
              })
            }
          >
            {healedId || poison ? "Xác nhận dùng thuốc" : "Giữ lại bình thuốc"}
            <ArrowRight size={18} />
          </GameButton>
        ) : (
          <p className="muted">
            Chạm thẻ người được chọn. Nút xác nhận hiện ngay trên thẻ.
          </p>
        )}
        {!witch && !revealed && (
          <GameButton
            variant="ghost"
            disabled={busy}
            onClick={() => setSkip(true)}
          >
            {hunter
              ? "Không bắn"
              : action.kind === "werewolf"
                ? "Bầy Sói không cắn ai"
                : "Bỏ qua lượt"}
          </GameButton>
        )}
      </div>
      {skip && (
        <ConfirmationDialog
          title={hunter ? "Không bắn ai?" : "Bỏ qua lượt này?"}
          onClose={() => setSkip(false)}
          onConfirm={() => {
            pick(undefined);
            setSkip(false);
          }}
        >
          <p>Quyết định được lưu trong nhật ký và có thể hoàn tác.</p>
        </ConfirmationDialog>
      )}
    </section>
  );
}
function WitchChoices({
  state,
  actorId,
  eligibleIds,
  healedId,
  setHealedId,
  poison,
  setPoison,
  poisonPick,
  setPoisonPick,
}: {
  state: GameState;
  actorId: string;
  eligibleIds: string[];
  healedId?: string;
  setHealedId: (id?: string) => void;
  poison?: string;
  setPoison: (id?: string) => void;
  poisonPick?: string;
  setPoisonPick: (id?: string) => void;
}) {
  const actor = state.players.find((p) => p.id === actorId)!;
  const victims = wolfTargets(state),
    healable = healableVictims(state, actor);
  const usage = actor.roleState.usage;
  // Without the house rule, a used heal locks the poison for tonight.
  const poisonLocked = !!healedId && !state.settings.canUseBothPotionsSameNight;
  return (
    <>
      <div className="potion-status">
        <span>
          Bình cứu: {usage.heal ? "đã dùng" : healedId ? "dùng đêm nay" : "còn"}
        </span>
        <span>
          Bình độc: {usage.poison ? "đã dùng" : poison ? "dùng đêm nay" : "còn"}
        </span>
      </div>
      {victims.length ? (
        victims.map((id) => {
          const saved = healedId === id,
            can = healable.includes(id);
          return (
            <div key={id} className={`victim-card ${saved ? "saved" : ""}`}>
              <div>
                <small>{saved ? "Được cứu" : "Bị Sói cắn"}</small>
                <strong>{playerName(state, id)}</strong>
                {!can && !saved && (
                  <span className="pcard-note">
                    {usage.heal ? "Đã hết bình cứu" : "Không được tự cứu"}
                  </span>
                )}
              </div>
              {can && (
                <button
                  type="button"
                  className={`victim-save ${saved ? "on" : ""}`}
                  aria-pressed={saved}
                  onClick={() => {
                    setHealedId(saved ? undefined : id);
                    if (!saved && !state.settings.canUseBothPotionsSameNight) {
                      setPoison(undefined);
                      setPoisonPick(undefined);
                    }
                  }}
                >
                  {saved ? "Bỏ cứu" : `Cứu ${playerName(state, id)}`}
                </button>
              )}
            </div>
          );
        })
      ) : (
        <div className="victim-card empty">
          <div>
            <small>Bầy Sói không cắn ai</small>
          </div>
        </div>
      )}
      {!usage.poison && (
        <>
          <h3 className="turn-subtitle">Đầu độc ai không?</h3>
          <p className="muted">
            {poisonLocked
              ? "Đã dùng bình cứu, đêm nay không được dùng thêm bình độc."
              : "Chạm thẻ, rồi chạm Đầu độc ngay trên thẻ. Chạm lại để bỏ."}
          </p>
          <div className="card-grid compact">
            {state.players
              .filter((p) => eligibleIds.includes(p.id))
              .map((p) => {
                const poisoned = poison === p.id;
                return (
                  <PlayerCard
                    key={p.id}
                    player={p}
                    disabled={poisonLocked || (!!poison && !poisoned)}
                    selected={poisonPick === p.id && !poison}
                    tone={poisoned ? "danger" : undefined}
                    note={poisoned ? "Trúng độc" : undefined}
                    onClick={() => {
                      if (poisoned) {
                        setPoison(undefined);
                        setPoisonPick(undefined);
                      } else
                        setPoisonPick(poisonPick === p.id ? undefined : p.id);
                    }}
                    action={
                      poisonPick === p.id && !poison
                        ? {
                            label: "Đầu độc",
                            name: `Đầu độc ${p.name}`,
                            tone: "danger",
                            onClick: () => setPoison(p.id),
                          }
                        : undefined
                    }
                  />
                );
              })}
          </div>
        </>
      )}
    </>
  );
}
