"use client";
import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import {
  Eye,
  Shield,
  FlaskConical,
  Crosshair,
  House,
  Moon,
  LockKeyhole,
  Skull,
  Check,
} from "lucide-react";
import type { Player, RoleId } from "../domain/types";
import { roles, teamNames } from "../roles/registry";
export const roleIcons = {
  werewolf: Moon,
  guard: Shield,
  witch: FlaskConical,
  hunter: Crosshair,
  villager: House,
  seer: Eye,
};
// Same accents as the .role-* classes in globals.css.
export const roleColors: Record<RoleId, string> = {
  werewolf: "#dab5a5",
  wolf_cub: "#e3a98f",
  guard: "#acd0bd",
  seer: "#bfb3df",
  witch: "#c7b6d5",
  hunter: "#d1b991",
  villager: "#ddc88e",
  tanner: "#a9b7c0",
};
export const roleAssets: Record<RoleId, string> = Object.fromEntries(
  Object.keys(roles).map((id) => [id, `/assets/roles/${id}.svg`]),
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
export function RoleCard({
  role,
  hidden = false,
  active = false,
  dead = false,
  exhausted = false,
  children,
}: {
  role: RoleId;
  hidden?: boolean;
  active?: boolean;
  dead?: boolean;
  exhausted?: boolean;
  children?: ReactNode;
}) {
  const r = roles[role];
  return (
    <article
      className={`role-card ${hidden ? "role-hidden" : `role-${role}`} ${active ? "active" : ""} ${dead ? "dead" : ""} ${hidden ? "hidden-card" : ""}`}
    >
      {/* Local original SVG illustrations are intentional native images. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={hidden ? "/assets/icons/card-back.svg" : roleAssets[role]}
        alt=""
        width={160}
        height={160}
      />
      <div>
        <span className="eyebrow">
          {hidden
            ? "VAI CHƯA LẬT"
            : r.team === "neutral"
              ? "PHE THỨ BA"
              : teamNames[r.team].toUpperCase()}
        </span>
        <h3>{hidden ? "Bí mật" : r.name}</h3>
        <p>{hidden ? "Chỉ quản trò được xem lá bài này." : r.description}</p>
        {!hidden && (
          <div className="badges">
            {dead && <AbilityBadge>Đã chết</AbilityBadge>}
            {exhausted && <AbilityBadge>Đã hết kỹ năng</AbilityBadge>}
            {children}
          </div>
        )}
      </div>
    </article>
  );
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
export interface CardAction {
  label: string;
  /** Accessible name, e.g. "Cắn Hà" for a button that only says "Cắn". */
  name: string;
  tone?: "gold" | "danger" | "calm";
  onClick: () => void;
}
// A player at the table as a card: tap to pick, then act on the card itself.
export function PlayerCard({
  player,
  selected = false,
  disabled = false,
  note,
  tone,
  action,
  onClick,
}: {
  player: Player;
  selected?: boolean;
  disabled?: boolean;
  note?: string;
  tone?: "danger" | "calm";
  action?: CardAction;
  onClick?: () => void;
}) {
  return (
    <div
      className={`pcard ${selected ? "selected" : ""} ${disabled ? "locked" : ""} ${tone ?? ""}`}
    >
      <button
        type="button"
        className="pcard-tap"
        disabled={disabled || !onClick}
        onClick={onClick}
        aria-pressed={onClick ? selected : undefined}
        aria-label={`${player.name}${note ? `, ${note}` : ""}`}
      >
        <span
          className={`pcard-initial avatar-${player.name.codePointAt(0)! % 4}`}
          aria-hidden="true"
        >
          {player.alive ? (
            player.name.slice(0, 1).toLocaleUpperCase("vi")
          ) : (
            <Skull size={26} />
          )}
        </span>
        <span className="pcard-name">{player.name}</span>
        {note && <span className="pcard-note">{note}</span>}
      </button>
      {action && (
        <button
          type="button"
          className={`pcard-action ${action.tone ?? "gold"}`}
          aria-label={action.name}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
