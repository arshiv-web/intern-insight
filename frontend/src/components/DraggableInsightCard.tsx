"use client";

import { useState } from "react";

import { motion } from "framer-motion";

import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  HelpCircle,
  ShieldAlert,
  Sparkles,
  Trash2,
  Link2,
} from "lucide-react";

import { Card } from "@/src/types/meeting";

export const CARD_WIDTH = 340;

export const CARD_ANCHOR_OFFSET_Y = 120;

export const CARD_ANCHOR_OFFSET_X = CARD_WIDTH / 2;

interface Props {
  card: Card;

  onMoveToTrash: (id: number) => void;

  onDragComplete: (
    id: number,
    nextX: number,
    nextY: number,
    clientX: number,
    clientY: number
  ) => void;

  onPointerDrag: (
    clientX: number,
    clientY: number
  ) => void;

  onPointerDragEnd: () => void;

  onLinkClick: (id: number) => void;

  linkAnchorId: number | null;
}

const styles = {
  tldr: {
    bg: "from-violet-500 to-fuchsia-500",
    glow: "shadow-violet-500/20",
    icon: Sparkles,
  },

  action_item: {
    bg: "from-green-500 to-emerald-500",
    glow: "shadow-green-500/20",
    icon: CheckCircle2,
  },

  blocker: {
    bg: "from-red-500 to-orange-500",
    glow: "shadow-red-500/20",
    icon: ShieldAlert,
  },

  question: {
    bg: "from-blue-500 to-cyan-500",
    glow: "shadow-blue-500/20",
    icon: HelpCircle,
  },

  missing_context: {
    bg: "from-amber-500 to-yellow-500",
    glow: "shadow-amber-500/20",
    icon: AlertTriangle,
  },

  uncertainty: {
    bg: "from-orange-500 to-red-500",
    glow: "shadow-orange-500/20",
    icon: AlertTriangle,
  },

  decision: {
    bg: "from-cyan-500 to-sky-500",
    glow: "shadow-cyan-500/20",
    icon: CheckCircle2,
  },

  follow_up: {
    bg: "from-pink-500 to-rose-500",
    glow: "shadow-pink-500/20",
    icon: Sparkles,
  },

  note: {
    bg: "from-slate-500 to-slate-600",
    glow: "shadow-slate-500/20",
    icon: Sparkles,
  },

  todo: {
    bg: "from-green-500 to-lime-500",
    glow: "shadow-lime-500/20",
    icon: CheckCircle2,
  },
};

function confidencePercent(
  score: number | string | undefined
): number | null {
  const n =
    typeof score === "number"
      ? score
      : typeof score === "string"
        ? Number.parseFloat(score)
        : NaN;

  if (Number.isNaN(n)) {
    return null;
  }

  return Math.round(
    Math.min(1, Math.max(0, n)) * 100
  );
}

export default function DraggableInsightCard({
  card,
  onMoveToTrash,
  onDragComplete,
  onPointerDrag,
  onPointerDragEnd,
  onLinkClick,
  linkAnchorId,
}: Props) {
  const [isDragging, setIsDragging] =
    useState(false);

  const config =
    styles[
      card.card_type as keyof typeof styles
    ] || styles.tldr;

  const Icon = config.icon;

  const baseX = card.position_x ?? 120;

  const baseY = card.position_y ?? 120;

  const linkActive =
    linkAnchorId !== null;

  const isAnchor =
    linkAnchorId === card.id;

  const [snippetOpen, setSnippetOpen] =
    useState(false);

  const confPct = confidencePercent(
    card.confidence_score
  );

  const showAiMeta =
    card.is_generated ||
    confPct !== null;

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      initial={false}
      animate={{
        x: baseX,
        y: baseY,
      }}
      onDragStart={() =>
        setIsDragging(true)
      }
      onDrag={(event) => {
        const e = event as PointerEvent;

        onPointerDrag(
          e.clientX,
          e.clientY
        );
      }}
      onDragEnd={(event, info) => {
        setIsDragging(false);

        onPointerDragEnd();

        const nx = baseX + info.offset.x;

        const ny = baseY + info.offset.y;

        const e = event as PointerEvent;

        onDragComplete(
          card.id,
          nx,
          ny,
          e.clientX,
          e.clientY
        );
      }}
      className={[
        "group/card absolute w-[340px] cursor-grab rounded-2xl border",
        "bg-[#0b1424]/95 p-4 text-white shadow-xl backdrop-blur-xl",
        "active:cursor-grabbing",
        config.glow,
        "transition-[border-color,box-shadow] duration-200",
        isDragging
          ? "z-[999] border-cyan-400/40 shadow-cyan-500/10"
          : "z-10 border-white/10",
        linkActive && isAnchor
          ? "ring-2 ring-cyan-400/70 ring-offset-2 ring-offset-[#020617]"
          : "",
        linkActive && !isAnchor
          ? "ring-1 ring-white/15"
          : "",
      ].join(" ")}
      whileHover={{
        scale: isDragging ? 1.03 : 1.01,
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div
          className={[
            "inline-flex max-w-[58%] items-center gap-1.5 rounded-full",
            "bg-gradient-to-r px-2.5 py-1 text-[10px] font-semibold uppercase",
            "tracking-wide text-white shadow-md",
            config.bg,
          ].join(" ")}
        >
          <Icon className="h-3 w-3 shrink-0" />

          <span className="truncate">
            {String(card.card_type).replace(
              /_/g,
              " "
            )}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {showAiMeta && (
            <div
              className="flex max-w-[9.5rem] items-center gap-1 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-medium text-cyan-100"
              title={
                confPct !== null
                  ? `Model confidence ${confPct}%`
                  : undefined
              }
            >
              {card.is_generated && (
                <span className="shrink-0">
                  AI
                </span>
              )}

              {card.is_generated &&
                confPct !== null && (
                  <span
                    className="shrink-0 text-cyan-300/60"
                    aria-hidden
                  >
                    ·
                  </span>
                )}

              {confPct !== null && (
                <span className="shrink-0 tabular-nums">
                  {confPct}%
                </span>
              )}
            </div>
          )}

          <button
            type="button"
            title="Connect to another card"
            onClick={() =>
              onLinkClick(card.id)
            }
            className={
              isAnchor
                ? "rounded-lg border border-cyan-400/60 bg-cyan-400/20 p-1.5 text-cyan-100 transition"
                : "rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            }
          >
            <Link2 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            title="Move to trash"
            onClick={() =>
              onMoveToTrash(card.id)
            }
            className="rounded-lg border border-red-500/25 bg-red-500/10 p-1.5 text-red-200 transition hover:bg-red-500/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <h3 className="mb-2 text-base font-semibold leading-snug tracking-tight text-white">
        {card.title}
      </h3>

      <p className="mb-3 max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
        {card.content}
      </p>

      {card.assigned_to && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-cyan-200">
            Owner
          </span>

          <span className="text-slate-300">
            {card.assigned_to}
          </span>
        </div>
      )}

      {card.transcript_segment && (
        <div className="group/snippet relative z-[70] mb-1">
          <button
            type="button"
            tabIndex={0}
            aria-expanded={snippetOpen}
            title="Hover or tap to show the supporting transcript quote"
            onClick={() =>
              setSnippetOpen((open) => !open)
            }
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-300 outline-none transition hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-100 focus-visible:border-cyan-400/50 focus-visible:ring-2 focus-visible:ring-cyan-400/40"
          >
            <FileText className="h-3 w-3 text-cyan-400/80" />

            Transcript
          </button>

          <div
            className={[
              "absolute left-0 right-0 top-full z-[80] pt-1 transition-all duration-150",
              snippetOpen
                ? "visible opacity-100"
                : [
                    "invisible opacity-0",
                    "group-hover/snippet:visible group-hover/snippet:opacity-100",
                    "group-focus-within/snippet:visible group-focus-within/snippet:opacity-100",
                  ].join(" "),
            ].join(" ")}
          >
            <div
              className="max-h-48 overflow-y-auto rounded-xl border border-white/15 bg-[#0c1628] p-3 text-left text-xs leading-relaxed text-slate-200 shadow-2xl"
              role="tooltip"
            >
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                From transcript
              </p>

              <p className="italic text-slate-300">
                {card.transcript_segment}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-2 text-[10px] text-slate-600">
        Insight card
      </div>
    </motion.div>
  );
}
