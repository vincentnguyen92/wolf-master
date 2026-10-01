"use client";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Download,
  Moon,
  Plus,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import { useState } from "react";
import type { Game } from "../domain/types";
import { replay } from "../events/replay";
import { cardImage } from "../roles/cards";
import { ConfirmationDialog, GameButton } from "../components/ui";
import { SwipeToDelete } from "../components/SwipeToDelete";
export function Home({
  active,
  completed,
  offline,
  offlineReady,
  busy,
  canInstall,
  onInstall,
  onCreate,
  onSelect,
  onDelete,
  onOpenDeck,
}: {
  active: Game[];
  completed: Game[];
  offline: boolean;
  offlineReady: boolean;
  busy: boolean;
  canInstall: boolean;
  onInstall: () => void;
  onCreate: (demo?: boolean) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenDeck: () => void;
}) {
  const [pendingDelete, setPendingDelete] = useState<Game | null>(null),
    [swiped, setSwiped] = useState<string | null>(null);
  const swipeProps = (g: Game, name: string) => ({
    label: `Xoá ván ${name}`,
    open: swiped === g.id,
    onOpenChange: (open: boolean) =>
      setSwiped((current) => (open ? g.id : current === g.id ? null : current)),
    onDelete: () => setPendingDelete(g),
    disabled: busy,
  });
  const closeDelete = () => {
    setPendingDelete(null);
    setSwiped(null);
  };
  return (
    <main className="shell home">
      <header className="home-nav">
        <Link href="/" className="brand">
          <Moon size={24} />
          <span>
            LÀNG TRĂNG<small>SỔ TAY QUẢN TRÒ</small>
          </span>
        </Link>
        <span className="local-status">
          {offline ? <WifiOff size={15} /> : <ShieldCheck size={15} />}
          <span>
            {offline
              ? "Đang offline"
              : offlineReady
                ? "Sẵn sàng offline"
                : "Lưu trên thiết bị"}
          </span>
        </span>
      </header>
      <section className="home-hero">
        <div className="hero-copy">
          <span className="eyebrow">MỖI NGÔI LÀNG, MỘT CÂU CHUYỆN</span>
          <h1>
            Đêm xuống.
            <br />
            Bạn giữ bí mật.
          </h1>
          <p>
            Bộ nhớ thứ hai của quản trò Ma Sói.
            <br />
            Dẫn từng lượt gọi. Giữ từng dấu vết.
          </p>
          <GameButton onClick={() => onCreate()} disabled={busy}>
            <Plus size={19} />
            Tạo ván mới
            <ArrowRight size={18} />
          </GameButton>
          <span className="hero-note">
            Không tài khoản · Không cần mạng khi đã tải
          </span>
        </div>
        <div className="card-fan" aria-hidden="true">
          {/* Local card scans are intentional native images. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cardImage("seer")} alt="" width={128} height={192} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cardImage("witch")} alt="" width={128} height={192} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cardImage("werewolf")} alt="" width={128} height={192} />
        </div>
      </section>
      <button type="button" className="deck-entry" onClick={onOpenDeck}>
        <span className="deck-stack" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cardImage("villager")} alt="" width={44} height={66} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cardImage("wolf_cub")} alt="" width={44} height={66} />
        </span>
        <span className="deck-entry-text">
          <strong>Bộ bài của làng</strong>
          <span>16 lá, cài đặt luật riêng từng vai</span>
        </span>
        <ArrowRight size={18} />
      </button>
      <section className="home-section">
        <div className="section-heading">
          <h2>Những ngọn đèn còn sáng</h2>
          <span className="count-pill">{active.length}</span>
        </div>
        {active.length ? (
          <div className="game-list">
            {active.map((g) => {
              const s = replay(g.events);
              return (
                <SwipeToDelete key={g.id} {...swipeProps(g, s.name)}>
                  <button className="game-entry" onClick={() => onSelect(g.id)}>
                    <div className="game-entry-icon">
                      <Moon size={24} />
                    </div>
                    <div>
                      <small>
                        {s.phase === "setup"
                          ? "ĐANG CHUẨN BỊ"
                          : `${s.phase === "night" ? "ĐÊM" : "NGÀY"} ${s.round} · ĐANG CHƠI`}
                      </small>
                      <h3>{s.name}</h3>
                      <p>
                        {s.players.length} người ·{" "}
                        {new Date(g.updatedAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    <span className="entry-continue">
                      Tiếp tục
                      <ArrowRight size={19} />
                    </span>
                  </button>
                </SwipeToDelete>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <Moon size={27} />
            <p>Chưa có ngôi làng nào thức giấc.</p>
            <span>Tạo một ván, mời mọi người ngồi quanh bàn.</span>
          </div>
        )}
      </section>
      {pendingDelete && (
        <ConfirmationDialog
          title="Tắt ngọn đèn này?"
          confirmLabel="Xoá ván"
          danger
          onClose={closeDelete}
          onConfirm={() => {
            onDelete(pendingDelete.id);
            closeDelete();
          }}
        >
          <p>
            Ván <strong>{replay(pendingDelete.events).name}</strong> cùng toàn
            bộ diễn biến sẽ bị xoá khỏi thiết bị này. Không thể hoàn tác.
          </p>
        </ConfirmationDialog>
      )}
      <section className="home-section">
        <div className="section-heading">
          <h2>Biên niên sử</h2>
          <BookOpen size={21} />
        </div>
        {completed.length ? (
          completed.map((g) => {
            const s = replay(g.events);
            return (
              <SwipeToDelete
                key={g.id}
                className="swipe-line"
                {...swipeProps(g, s.name)}
              >
                <button
                  className="history-entry"
                  onClick={() => onSelect(g.id)}
                >
                  <div>
                    <h3>{s.name}</h3>
                    <p>
                      {new Date(g.updatedAt).toLocaleDateString("vi-VN")} ·{" "}
                      {s.players.length} người · {s.round} vòng
                    </p>
                  </div>
                  <span>
                    {s.victory?.team === "village"
                      ? "Dân thắng"
                      : s.victory?.team === "neutral"
                        ? "Kẻ chán đời thắng"
                        : "Sói thắng"}
                    <ArrowRight size={17} />
                  </span>
                </button>
              </SwipeToDelete>
            );
          })
        ) : (
          <p className="muted">Những ván đã kết thúc sẽ được lưu tại đây.</p>
        )}
      </section>
      <section className="home-bottom">
        <div>
          <span className="eyebrow">LẦN ĐẦU LÀM QUẢN TRÒ?</span>
          <h3>Thử một đêm trong làng.</h3>
          <p>Ván mẫu 8 người, đã gán vai và sẵn sàng.</p>
          <GameButton
            variant="secondary"
            onClick={() => onCreate(true)}
            disabled={busy}
          >
            Mở ván mẫu
            <ArrowRight size={17} />
          </GameButton>
        </div>
        <div>
          <h3>Mang ngôi làng theo bạn</h3>
          <p>
            Dữ liệu nằm trong trình duyệt này. Xóa dữ liệu trình duyệt sẽ xóa
            các ván.
          </p>
          {canInstall ? (
            <GameButton variant="secondary" onClick={onInstall}>
              <Download size={17} />
              Cài ứng dụng
            </GameButton>
          ) : (
            <p className="muted">
              Để cài PWA: mở menu trình duyệt → Cài ứng dụng / Thêm vào màn hình
              chính.
            </p>
          )}
        </div>
      </section>
      <footer className="home-footer">
        LÀNG TRĂNG <span>Giữ bí mật. Kể câu chuyện.</span>
      </footer>
    </main>
  );
}
