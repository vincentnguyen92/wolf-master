"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  Trophy,
  Undo2,
  BookOpen,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { Game, GameState } from "../domain/types";
import { GameButton, PhaseHeader, roleAssets } from "../components/ui";
import { roles } from "../roles/registry";
import { statistics } from "../statistics/statistics";
import { deathLabels, storyRecap, storySpeech } from "../story/narrative";
import { CopyButton, Timeline } from "./Timeline";
export function Summary({
  game,
  state,
  onHome,
  onUndo,
  onRematch,
  busy,
}: {
  game: Game;
  state: GameState;
  onHome: () => void;
  onUndo: () => void;
  onRematch: () => void;
  busy: boolean;
}) {
  const [tab, setTab] = useState("story");
  const duration =
    state.startedAt && state.endedAt
      ? Math.max(
          0,
          Math.round(
            (Date.parse(state.endedAt) - Date.parse(state.startedAt)) / 60000,
          ),
        )
      : 0;
  return (
    <main className="shell summary">
      <GameButton variant="ghost" onClick={onHome}>
        <ArrowLeft size={18} />
        Trang chủ
      </GameButton>
      <div className="ending-hero">
        <Trophy size={44} />
        <span className="eyebrow">BIÊN NIÊN SỬ NGÔI LÀNG</span>
        <h1>
          {state.victory?.team === "village"
            ? "Bình minh thuộc về Dân."
            : state.victory?.team === "neutral"
              ? "Kẻ chán đời được toại nguyện."
              : "Đêm nay, Sói chiến thắng."}
        </h1>
        <p>{state.victory?.reason}</p>
        <div className="badges">
          <span>{state.round} vòng</span>
          <span>{state.players.length} người chơi</span>
          <span>{duration} phút</span>
        </div>
        <GameButton className="rematch" disabled={busy} onClick={onRematch}>
          <RotateCcw size={18} />
          Ván mới với những người này
        </GameButton>
      </div>
      <PhaseHeader
        title={state.name}
        subtitle="VÁN ĐÃ KẾT THÚC · TẤT CẢ VAI ĐƯỢC CÔNG KHAI"
      />
      <nav className="tabs" aria-label="Tổng kết">
        {[
          { id: "story", name: "Câu chuyện" },
          { id: "players", name: "Lật bài" },
          { id: "stats", name: "Thống kê" },
          { id: "timeline", name: "Nhật ký" },
        ].map((t) => (
          <button
            key={t.id}
            aria-pressed={tab === t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => setTab(t.id)}
          >
            {t.name}
          </button>
        ))}
      </nav>
      {tab === "story" && (
        <section className="panel storybook">
          <BookOpen size={28} />
          <h2>Chuyện kể dưới ánh trăng</h2>
          <p className="muted">
            Dành cho quản trò đọc cho cả bàn. Chỉ kể lại những gì đã xảy ra.
          </p>
          <ReadAloud lines={storySpeech(game.events)} />
          <CopyButton
            label="Sao chép câu chuyện"
            text={storyRecap(game.events)}
          />
          <div className="story-text">{storyRecap(game.events)}</div>
        </section>
      )}
      {tab === "players" && <CardReveal state={state} />}
      {tab === "stats" && (
        <div className="stats-grid">
          {statistics(game.events).map((stat) => (
            <article className="panel" key={stat.label}>
              <p className="muted">{stat.label}</p>
              <strong>{stat.value}</strong>
            </article>
          ))}
        </div>
      )}
      {tab === "timeline" && <Timeline state={state} events={game.events} />}
      <div className="footer-actions">
        <GameButton variant="secondary" disabled={busy} onClick={onUndo}>
          <Undo2 size={17} />
          Hoàn tác kết thúc ván
        </GameButton>
      </div>
    </main>
  );
}
// Prefer a man's voice for a ghost story when the device has one (Edge's
// "NamMinh"); otherwise any Vietnamese voice.
function vietnameseVoice(voices: SpeechSynthesisVoice[]) {
  const vi = voices.filter((v) => v.lang.toLowerCase().startsWith("vi"));
  return vi.find((v) => /namminh|male/i.test(v.name)) ?? vi[0];
}
// Reads the story aloud with the device's own voice: free, no account, and
// works offline. A brisk pace, in a lower voice than normal.
function ReadAloud({ lines }: { lines: string[] }) {
  const [speaking, setSpeaking] = useState(false),
    [status, setStatus] = useState("");
  // Each reading gets a number so a stopped one cannot end the next.
  const run = useRef(0);
  useEffect(() => {
    const synth = window.speechSynthesis;
    // Some browsers load their voices only after the first request.
    synth?.getVoices();
    return () => synth?.cancel();
  }, []);
  const toggle = () => {
    const synth = window.speechSynthesis;
    if (!synth) return setStatus("Trình duyệt này không đọc thành tiếng được.");
    synth.cancel();
    const current = ++run.current;
    if (speaking) return setSpeaking(false);
    const voice = vietnameseVoice(synth.getVoices());
    if (!voice)
      return setStatus(
        "Máy chưa có giọng đọc tiếng Việt. Trên iPhone: Cài đặt › Trợ năng › Nội dung được đọc › Giọng nói › Tiếng Việt.",
      );
    const done = () => {
      if (run.current === current) setSpeaking(false);
    };
    lines.forEach((text, i) => {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = 1.2;
      u.pitch = 0.8;
      if (i === lines.length - 1) u.onend = done;
      u.onerror = done;
      synth.speak(u);
    });
    setStatus("");
    setSpeaking(true);
  };
  return (
    <>
      <GameButton
        variant="secondary"
        aria-label="Đọc câu chuyện"
        aria-pressed={speaking}
        onClick={toggle}
      >
        {speaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </GameButton>
      {status && (
        <span className="muted" role="status">
          {status}
        </span>
      )}
    </>
  );
}
// Every seat's card turned face up, with how that player's game ended.
function CardReveal({ state }: { state: GameState }) {
  return (
    <div className="card-reveal">
      {state.players.map((p, i) => (
        <div
          key={p.id}
          className={`reveal-seat ${p.alive ? "" : "dead"}`}
          style={{ "--i": i } as CSSProperties}
        >
          {/* Local card scans are intentional native images. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={roleAssets[p.role]}
            alt={roles[p.role].name}
            width={80}
            height={120}
          />
          <strong>{p.name}</strong>
          <span>
            {p.death
              ? `${deathLabels[p.death.cause]}, ${p.death.phase === "night" ? "đêm" : "ngày"} ${p.death.round}`
              : "Sống sót"}
          </span>
        </div>
      ))}
    </div>
  );
}
