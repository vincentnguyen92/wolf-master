"use client";
import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react";
import { LockKeyhole, Skull, Check } from "lucide-react";
import type { Player, RoleId } from "../domain/types";
import { roles } from "../roles/registry";
export const roleAssets: Record<RoleId, string> = Object.fromEntries(
  Object.keys(roles).map((id) => [id, `/assets/cards/${id}.webp`]),
) as Record<RoleId, string>;
export function GameButton({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      type="button"
      {...props}
      className={`button ${variant} ${className}`}
    >
      {children}
    </button>
  );
}
export function SecretBadge() {
  return (
    <div className="secret-badge">
      <LockKeyhole size={14} /> BÍ MẬT · CHỈ DÀNH CHO QUẢN TRÒ
    </div>
  );
}
export function AbilityBadge({ children }: { children: ReactNode }) {
  return <span className="ability-badge">{children}</span>;
}
export function PlayerToken({
  player,
  selected,
  onClick,
  disabled,
  secret = false,
  markers = [],
}: {
  player: Player;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  secret?: boolean;
  markers?: string[];
}) {
  const content = (
    <>
      <span
        className={`avatar avatar-${player.name.codePointAt(0)! % 4}`}
        aria-hidden="true"
      >
        {player.alive ? (
          player.name.slice(0, 1).toLocaleUpperCase("vi")
        ) : (
          <Skull size={20} />
        )}
      </span>
      <span className="token-label">
        <strong>{player.name}</strong>
        <small>
          {!player.alive
            ? "Đã chết"
            : secret
              ? roles[player.role].name
              : "Còn sống"}
          {secret && markers.length > 0 ? ` · ${markers.join(" · ")}` : ""}
        </small>
      </span>
      {selected && <Check size={18} aria-label="Đã chọn" />}
    </>
  );
  return onClick ? (
    <button
      className={`player-token ${selected ? "selected" : ""} ${!player.alive ? "dead" : ""}`}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
    >
      {content}
    </button>
  ) : (
    <div className={`player-token ${!player.alive ? "dead" : ""}`}>
      {content}
    </div>
  );
}
export function PhaseHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <header className="phase-header">
      <div>
        <span className="eyebrow">{subtitle}</span>
        <h1>{title}</h1>
      </div>
      {children}
    </header>
  );
}
export function ActionPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="panel action-panel">
      <h2>{title}</h2>
      {description && <p className="muted">{description}</p>}
      {children}
    </section>
  );
}
export function ConfirmationDialog({
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel = "Xác nhận",
  danger = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  danger?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose} className="dialog">
      <h2>{title}</h2>
      <div>{children}</div>
      <div className="button-row">
        <GameButton variant="secondary" onClick={onClose}>
          Quay lại
        </GameButton>
        <GameButton variant={danger ? "danger" : "primary"} onClick={onConfirm}>
          {confirmLabel}
        </GameButton>
      </div>
    </dialog>
  );
}
// Players sit around a round table in seating order, clockwise from the top.
// The middle of the table is where the moderator confirms what they picked.
export function RoundTable({
  seats,
  center,
  day = false,
}: {
  seats: ReactNode[];
  center?: ReactNode;
  day?: boolean;
}) {
  const n = seats.length;
  // Seats shrink as the table fills so neighbours never overlap.
  const size = n <= 8 ? "large" : n <= 12 ? "medium" : "small";
  return (
    <div className={`round-table ${size} ${day ? "day" : ""}`}>
      {seats.map((seat, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        return (
          <div
            key={i}
            className="rt-seat"
            style={
              {
                left: `${50 + 41 * Math.cos(a)}%`,
                top: `${50 + 41 * Math.sin(a)}%`,
                // Seats fill clockwise when the table first appears.
                "--i": i,
              } as CSSProperties
            }
          >
            {seat}
          </div>
        );
      })}
      <div className="rt-center">{center}</div>
    </div>
  );
}
export function SeatToken({
  player,
  selected = false,
  disabled = false,
  note,
  tone,
  label,
  onClick,
}: {
  player: Pick<Player, "name" | "alive">;
  selected?: boolean;
  disabled?: boolean;
  note?: string;
  tone?: "danger" | "calm" | "magic";
  label?: string;
  onClick?: () => void;
}) {
  return (
    <span
      className={`seat-token ${selected ? "selected" : ""} ${disabled ? "locked" : ""} ${player.alive ? "" : "dead"} ${tone ?? ""}`}
    >
      <button
        type="button"
        className={`seat-face avatar-${player.name.codePointAt(0)! % 4}`}
        disabled={disabled || !onClick}
        aria-pressed={onClick ? selected : undefined}
        aria-label={label ?? `${player.name}${note ? `, ${note}` : ""}`}
        onClick={onClick}
      >
        {player.alive ? (
          // Placeholder seats ("Người 3") show their number, not a row of N.
          (/^Người (\d+)$/.exec(player.name)?.[1] ??
          player.name.slice(0, 1).toLocaleUpperCase("vi"))
        ) : (
          <Skull size={20} aria-hidden="true" />
        )}
      </button>
      <span className="seat-name">{player.name}</span>
      {note && <span className="seat-note">{note}</span>}
    </span>
  );
}
