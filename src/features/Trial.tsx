"use client";
import { useState } from "react";
import { ArrowRight, Gavel, HeartHandshake } from "lucide-react";
import type { GameState } from "../domain/types";
import type { Command } from "../engine/engine";
import { ActionPanel, GameButton, PlayerToken } from "../components/ui";
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
  return (
    <ActionPanel
      title="Làng ơi, cùng tìm sự thật."
      description="Sau khi thảo luận, chọn người bị nghi ngờ nhất để họ thanh minh."
    >
      <div className="player-grid">
        {state.players
          .filter((p) => p.alive)
          .map((p) => (
            <PlayerToken
              key={p.id}
              player={p}
              selected={suspect === p.id}
              disabled={busy}
              onClick={() => setSuspect(suspect === p.id ? undefined : p.id)}
            />
          ))}
      </div>
      <div className="action-footer">
        <GameButton
          variant="ghost"
          disabled={busy}
          onClick={() => void onCommand({ type: "nominate" })}
        >
          Không đưa ai lên
        </GameButton>
        <GameButton
          disabled={busy || !suspect}
          onClick={() =>
            void onCommand({ type: "nominate", targetId: suspect })
          }
        >
          Mời lên thanh minh
          <ArrowRight size={18} />
        </GameButton>
      </div>
    </ActionPanel>
  );
}
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
  return (
    <ActionPanel
      title={`${name} thanh minh.`}
      description={`Để ${name} trình bày. Sau đó cả làng quyết định treo cổ hay tha.`}
    >
      <div className="action-footer">
        <GameButton
          variant="secondary"
          disabled={busy}
          onClick={() => void onCommand({ type: "verdict", execute: false })}
        >
          <HeartHandshake size={18} />
          Tha
        </GameButton>
        <GameButton
          variant="danger"
          disabled={busy}
          onClick={() => void onCommand({ type: "verdict", execute: true })}
        >
          <Gavel size={18} />
          Treo cổ
        </GameButton>
      </div>
    </ActionPanel>
  );
}
