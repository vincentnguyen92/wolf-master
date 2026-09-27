import type { GameEvent, GameState } from "../domain/types";
import { RoleCard } from "../components/ui";
import { deathLabels, playerStory } from "../story/narrative";
export function Overview({
  state,
  events,
}: {
  state: GameState;
  events: GameEvent[];
}) {
  return (
    <section>
      <h2>Hồ sơ người chơi</h2>
      <div className="overview-grid">
        {state.players.map((p) => (
          <article className="panel player-profile" key={p.id}>
            <div className="section-heading">
              <h3>{p.name}</h3>
              <span className="ability-badge">
                {p.alive ? "Còn sống" : "Đã chết"}
              </span>
            </div>
            <RoleCard
              role={p.role}
              dead={!p.alive}
              exhausted={
                p.role === "witch" &&
                p.roleState.usage.heal &&
                p.roleState.usage.poison
              }
            />
            {p.death && (
              <p className="death-note">
                {deathLabels[p.death.cause]} ·{" "}
                {p.death.phase === "night" ? "Đêm" : "Ngày"} {p.death.round}
              </p>
            )}
            {p.role === "witch" && (
              <p>
                Bình cứu: {p.roleState.usage.heal ? "đã dùng" : "còn"} · Bình
                độc: {p.roleState.usage.poison ? "đã dùng" : "còn"}
              </p>
            )}
            {p.role === "hunter" && (
              <p>
                Phát súng: {p.roleState.usage.shot ? "đã xử lý" : "chưa dùng"}
              </p>
            )}
            <details>
              <summary>Câu chuyện của {p.name}</summary>
              <ul className="player-story">
                {playerStory(events, p.id).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
              {!playerStory(events, p.id).length && (
                <p className="muted">Chưa có hành động được ghi nhận.</p>
              )}
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}
