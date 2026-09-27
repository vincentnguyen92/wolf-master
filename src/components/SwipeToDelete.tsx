"use client";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
const ACTION_WIDTH = 88;
// Movement below this is still a tap; past it the dominant axis decides
// whether the gesture is a horizontal swipe or a vertical page scroll.
const SLOP = 8;
interface Gesture {
  id: number;
  x: number;
  y: number;
  base: number;
  offset: number;
  axis: "x" | "y" | null;
}
export function SwipeToDelete({
  label,
  open,
  onOpenChange,
  onDelete,
  disabled = false,
  className = "",
  children,
}: {
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const gesture = useRef<Gesture | null>(null),
    suppressClick = useRef(false);
  const offset = drag ?? (open ? -ACTION_WIDTH : 0);
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || (e.pointerType === "mouse" && e.button !== 0)) return;
    const base = open ? -ACTION_WIDTH : 0;
    gesture.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      base,
      offset: base,
      axis: null,
    };
    suppressClick.current = false;
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x,
      dy = e.clientY - g.y;
    if (!g.axis) {
      if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
      g.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (g.axis === "x") {
        e.currentTarget.setPointerCapture(e.pointerId);
        suppressClick.current = true;
      }
    }
    if (g.axis !== "x") return;
    g.offset = Math.max(-ACTION_WIDTH, Math.min(0, g.base + dx));
    setDrag(g.offset);
  };
  const end = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    setDrag(null);
    if (g.axis === "x" && e.type === "pointerup")
      onOpenChange(g.offset < -ACTION_WIDTH / 2);
  };
  return (
    <div
      className={`swipe-row ${className}`}
      onBlur={(e) => {
        if (open && !e.currentTarget.contains(e.relatedTarget as Node | null))
          onOpenChange(false);
      }}
    >
      <button
        type="button"
        className="swipe-action"
        aria-label={label}
        disabled={disabled}
        style={{ width: ACTION_WIDTH - 8, opacity: offset === 0 ? 0 : 1 }}
        onFocus={() => onOpenChange(true)}
        onClick={onDelete}
      >
        <Trash2 size={19} />
        <span>Xoá</span>
      </button>
      <div
        className="swipe-content"
        style={{
          transform: `translateX(${offset}px)`,
          transition: drag === null ? undefined : "none",
        }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onClickCapture={(e) => {
          if (!suppressClick.current && !open) return;
          e.preventDefault();
          e.stopPropagation();
          // A tap on an opened row slides it closed instead of opening the game.
          if (suppressClick.current) suppressClick.current = false;
          else onOpenChange(false);
        }}
      >
        {children}
      </div>
    </div>
  );
}
