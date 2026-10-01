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
  RoundTable,
  SeatToken,
  roleAssets,
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
        {/* Local card scans are intentional native images. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="fake-call-card"
          src={roleAssets[action.kind]}
          alt=""
          width={240}
          height={360}
        />
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
  // Why a living player cannot be picked this turn, shown under their seat.
  const lockReason = (p: Player) =>
    action.kind === "werewolf" && roles[p.role].team === "wolves"
      ? "Đồng bầy"
      : action.kind === "werewolf" && wolfTargets(state).includes(p.id)
        ? "Đã bị cắn"
        : action.kind === "guard" && actor.roleState.lastProtected === p.id
          ? "Không che liên tiếp"
          : action.kind === "guard" &&
              p.id === actor.id &&
              !state.settings.guardCanProtectSelf
            ? "Không tự che"
            : seer && p.id === actor.id
              ? "Chính mình"
              : undefined;
  const verb = hunter ? "Bắn" : action.kind === "guard" ? "Che" : "Cắn";
  const tone = action.kind === "guard" ? "calm" : "danger";
  const chosen = state.players.find((p) => p.id === target);
  return (
    <section className="turn" aria-labelledby="turn-title">
      <header className="turn-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="turn-card"
          src={roleAssets[action.kind]}
          alt=""
          width={60}
          height={90}
        />
        <div>
          <small>
            {hunter
              ? `${actor.name} vừa chết`
              : `Đêm ${state.round}, lượt ${done + 1} trên ${total}`}
          </small>
          <h2 id="turn-title">{title}</h2>
          <span className={`turn-actors role-${action.kind}`}>
            {hunter
              ? "Xử lý trước khi xét thắng thua"
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
        <WitchTable
          state={state}
          actorId={actor.id}
          eligibleIds={action.eligibleIds}
          busy={busy}
          healedId={healedId}
          setHealedId={setHealedId}
          poison={poison}
          setPoison={setPoison}
          poisonPick={poisonPick}
          setPoisonPick={setPoisonPick}
        />
      ) : (
        <RoundTable
          seats={state.players.map((p) => {
            if (!p.alive) return <SeatToken key={p.id} player={p} disabled />;
            const reason = lockReason(p),
              eligible = action.eligibleIds.includes(p.id) && !reason;
            return (
              <SeatToken
                key={p.id}
                player={p}
                note={reason}
                disabled={busy || !eligible || (seer && revealed)}
                selected={target === p.id}
                tone={target === p.id ? (seer ? "magic" : tone) : undefined}
                label={
                  reason
                    ? `${p.name}, ${reason}`
                    : `${seer ? "Soi" : "Chọn"} ${p.name}`
                }
                onClick={() => {
                  if (seer) {
                    setTarget(p.id);
                    setRevealed(true);
                  } else setTarget(target === p.id ? undefined : p.id);
                }}
              />
            );
          })}
          center={
            seer ? (
              revealed && chosen ? (
                <SeerAnswer state={state} player={chosen} />
              ) : (
                <span className="rt-hint">
                  Chạm một người, lá của họ lật ra ở đây
                </span>
              )
            ) : chosen ? (
              <>
                <strong>{chosen.name}</strong>
                <button
                  type="button"
                  className={`rt-action ${tone}`}
                  disabled={busy}
                  onClick={() => pick(chosen.id)}
                >
                  {verb} {chosen.name}
                </button>
              </>
            ) : (
              <span className="rt-hint">
                {hunter
                  ? "Chạm người bị bắn"
                  : action.kind === "guard"
                    ? "Chạm người được che"
                    : "Chạm người bị nhắm"}
              </span>
            )
          }
        />
      )}
      <div className="turn-footer">
        {seer && revealed ? (
          <div className="footer-pair">
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
          </div>
        ) : witch ? (
          <>
            <p className="muted">
              {[
                healedId ? `Cứu ${playerName(state, healedId)}` : "Không cứu",
                poison
                  ? `đầu độc ${playerName(state, poison)}`
                  : "không dùng độc",
              ].join(", ")}
              .
            </p>
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
              {healedId || poison
                ? "Xác nhận dùng thuốc"
                : "Giữ lại bình thuốc"}
              <ArrowRight size={18} />
            </GameButton>
          </>
        ) : (
          !seer && (
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
          )
        )}
        {seer && !revealed && (
          <GameButton
            variant="ghost"
            disabled={busy}
            onClick={() => setSkip(true)}
          >
            Bỏ qua lượt
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
// The answer is the real card, turning over in the middle of the table.
function SeerAnswer({ state, player }: { state: GameState; player: Player }) {
  const wolf = seerResult(state, player.id);
  const text = wolf ? `${player.name} là Sói` : `${player.name} không phải Sói`;
  return (
    <div className="rt-answer" role="status">
      <span className={`rt-card ${wolf ? "wolf" : "safe"}`}>
        <span className="rt-card-in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={roleAssets[wolf ? "werewolf" : "villager"]}
            alt={text}
            width={84}
            height={126}
          />
          <span className="rt-card-back" aria-hidden="true" />
        </span>
      </span>
      <span className={`rt-verdict ${wolf ? "wolf" : "safe"}`}>{text}</span>
    </div>
  );
}
function WitchTable({
  state,
  actorId,
  eligibleIds,
  busy,
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
  busy: boolean;
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
  const poisonLocked =
    usage.poison || (!!healedId && !state.settings.canUseBothPotionsSameNight);
  const picked = state.players.find((p) => p.id === poisonPick);
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
      <RoundTable
        seats={state.players.map((p) => {
          if (!p.alive) return <SeatToken key={p.id} player={p} disabled />;
          const bitten = victims.includes(p.id),
            saved = healedId === p.id,
            poisoned = poison === p.id;
          const note = poisoned
            ? "Trúng độc"
            : bitten
              ? saved
                ? "Được cứu"
                : "Bị cắn"
              : p.id === actorId
                ? "Phù thủy"
                : undefined;
          const canPoison =
            eligibleIds.includes(p.id) &&
            (poisoned || (!poisonLocked && !poison));
          return (
            <SeatToken
              key={p.id}
              player={p}
              note={note}
              tone={
                poisonPick === p.id
                  ? "magic"
                  : saved
                    ? "calm"
                    : bitten || poisoned
                      ? "danger"
                      : undefined
              }
              selected={poisonPick === p.id}
              disabled={busy || !canPoison}
              label={
                poisoned
                  ? `${p.name}, trúng độc. Chạm để bỏ`
                  : `Chọn ${p.name} để đầu độc`
              }
              onClick={() => {
                if (poisoned) {
                  setPoison(undefined);
                  setPoisonPick(undefined);
                } else setPoisonPick(poisonPick === p.id ? undefined : p.id);
              }}
            />
          );
        })}
        center={
          picked ? (
            <>
              <strong>{picked.name}</strong>
              <button
                type="button"
                className="rt-action danger"
                onClick={() => {
                  setPoison(picked.id);
                  setPoisonPick(undefined);
                }}
              >
                Đầu độc {picked.name}
              </button>
              <button
                type="button"
                className="rt-link"
                onClick={() => setPoisonPick(undefined)}
              >
                Bỏ chọn
              </button>
            </>
          ) : victims.length ? (
            victims.map((id) => {
              const saved = healedId === id;
              return (
                <div key={id} className="rt-victim">
                  <span className={saved ? "saved" : "bitten"}>
                    {saved ? "Được cứu" : "Bị Sói cắn"}
                  </span>
                  <strong>{playerName(state, id)}</strong>
                  {healable.includes(id) ? (
                    <button
                      type="button"
                      className={`rt-action ${saved ? "outline" : "calm"}`}
                      aria-pressed={saved}
                      onClick={() => {
                        setHealedId(saved ? undefined : id);
                        if (
                          !saved &&
                          !state.settings.canUseBothPotionsSameNight
                        ) {
                          setPoison(undefined);
                          setPoisonPick(undefined);
                        }
                      }}
                    >
                      {saved ? "Bỏ cứu" : `Cứu ${playerName(state, id)}`}
                    </button>
                  ) : (
                    !saved && (
                      <span className="rt-hint">
                        {usage.heal ? "Đã hết bình cứu" : "Không được tự cứu"}
                      </span>
                    )
                  )}
                </div>
              );
            })
          ) : (
            <span className="rt-hint">Bầy Sói không cắn ai</span>
          )
        }
      />
      {!usage.poison && (
        <p className="muted turn-help">
          {poisonLocked
            ? "Đã dùng bình cứu, đêm nay không được dùng thêm bình độc."
            : "Muốn đầu độc ai thì chạm ghế người đó. Chạm lại người trúng độc để bỏ."}
        </p>
      )}
    </>
  );
}
