"use client";

import {
  Plus,
  RotateCcw,
  FileText,
  LayoutGrid,
  CalendarDays,
  Link2,
  X,
} from "lucide-react";

import { Card, WorkspaceEdge } from "@/src/types/meeting";

interface Props {
  meetingTitle: string;

  meetingDateLabel: string;

  cards: Card[];

  activeView: "workspace" | "transcript";

  setActiveView: (
    value: "workspace" | "transcript"
  ) => void;

  onStartOver: () => void;

  onCreateCard: (
    type: string
  ) => void;

  connections: WorkspaceEdge[];

  onRemoveConnection: (id: string) => void;

  linkAnchorId: number | null;
}

const BUCKET_STYLES: Record<
  string,
  string
> = {
  summary:
    "bg-violet-500/10 border-violet-500/20 text-violet-200",

  action:
    "bg-green-500/10 border-green-500/20 text-green-200",

  decision:
    "bg-cyan-500/10 border-cyan-500/20 text-cyan-200",

  risk:
    "bg-red-500/10 border-red-500/20 text-red-200",

  question:
    "bg-blue-500/10 border-blue-500/20 text-blue-200",

  note:
    "bg-slate-500/10 border-slate-500/20 text-slate-200",

  other:
    "border-white/10 bg-white/[0.04] text-white",
};

function insightBucket(cardType: string): {
  key: string;
  label: string;
} {
  const t = cardType;

  if (t === "tldr") {
    return { key: "summary", label: "Summary" };
  }

  if (
    t === "action_item" ||
    t === "todo" ||
    t === "follow_up"
  ) {
    return { key: "action", label: "Action" };
  }

  if (t === "decision") {
    return {
      key: "decision",

      label: "Decision",
    };
  }

  if (
    t === "blocker" ||
    t === "uncertainty" ||
    t === "missing_context"
  ) {
    return { key: "risk", label: "Risk / gap" };
  }

  if (t === "question") {
    return {
      key: "question",

      label: "Question",
    };
  }

  if (t === "note") {
    return { key: "note", label: "Note" };
  }

  return { key: "other", label: "Other" };
}

const addOptions: {
  type: string;
  label: string;
}[] = [
  { type: "note", label: "Note" },
  { type: "todo", label: "Todo" },
  { type: "blocker", label: "Blocker" },
  { type: "action_item", label: "Action" },
];

export default function WorkspaceSidebar({
  meetingTitle,
  meetingDateLabel,
  cards,
  activeView,
  setActiveView,
  onStartOver,
  onCreateCard,
  connections,
  onRemoveConnection,
  linkAnchorId,
}: Props) {
  const activeCards = cards.filter(
    (c) => !c.deleted
  );

  const titleFor = (id: number) =>
    cards.find((c) => c.id === id)?.title ??
    `#${id}`;

  return (
    <div className="flex h-full flex-col bg-[#071226]">
      <div className="shrink-0 border-b border-white/10 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Meeting
        </p>

        <h1 className="mt-1 line-clamp-2 text-lg font-semibold leading-snug text-white">
          {meetingTitle || "Untitled meeting"}
        </h1>

        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-500" />

          <span className="leading-tight">
            {meetingDateLabel}
          </span>
        </div>

        <button
          type="button"
          onClick={onStartOver}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-xs font-medium text-slate-100 transition hover:bg-white/10"
        >
          <RotateCcw className="h-3.5 w-3.5" />

          Start over
        </button>
      </div>

      <div className="shrink-0 border-b border-white/10 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Main view
        </p>

        <div className="flex rounded-xl border border-white/10 bg-black/25 p-0.5">
          <button
            type="button"
            onClick={() =>
              setActiveView("workspace")
            }
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition ${
              activeView === "workspace"
                ? "bg-cyan-400 text-slate-950 shadow-sm"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />

            Workspace
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveView("transcript")
            }
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition ${
              activeView === "transcript"
                ? "bg-cyan-400 text-slate-950 shadow-sm"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />

            Transcript
          </button>
        </div>

        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          One main pane at a time. Trash rail on the far left — drop a card there or use its trash icon; restore from the rail.
        </p>
      </div>

      {activeView === "transcript" && (
        <div className="shrink-0 border-b border-white/10 px-4 py-3">
          <p className="text-xs leading-relaxed text-slate-400">
            The center shows only the transcript. Switch to{" "}
            <span className="font-medium text-slate-200">
              Workspace
            </span>{" "}
            to move cards and edit links.
          </p>
        </div>
      )}

      <div className="shrink-0 border-b border-white/10 px-3 py-3">
        <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Add to workspace
        </h2>

        <div className="grid grid-cols-2 gap-1.5">
          {addOptions.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => onCreateCard(type)}
              className="flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-500/30 hover:bg-cyan-500/10"
            >
              <Plus className="h-3.5 w-3.5 text-cyan-300/90" />

              {label}
            </button>
          ))}
        </div>
      </div>

      {activeView === "workspace" && (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Operational insights
              </h2>

              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] tabular-nums text-slate-400">
                {activeCards.length}
              </span>
            </div>

            <div className="space-y-2">
              {activeCards.map((card) => {
                const bucket = insightBucket(
                  card.card_type
                );

                return (
                  <div
                    key={card.id}
                    className={`rounded-xl border px-3 py-2.5 ${
                      BUCKET_STYLES[
                        bucket.key
                      ] ?? BUCKET_STYLES.other
                    }`}
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                      {bucket.label}
                    </div>

                    <h3 className="mt-0.5 line-clamp-2 text-xs font-medium leading-snug">
                      {card.title}
                    </h3>
                  </div>
                );
              })}
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                <Link2 className="h-3.5 w-3.5" />

                Connections
              </div>

              {linkAnchorId !== null && (
                <div className="mb-2 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-2 text-[11px] leading-snug text-cyan-100">
                  Link mode: press link on another card to connect, or the same card to cancel.
                </div>
              )}

              {connections.length === 0 ? (
                <p className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-[11px] leading-relaxed text-slate-500">
                  Links: use the link icon on one card, then on another. List appears here; remove with ✕.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {connections.map(
                    (edge) => (
                      <li
                        key={edge.id}
                        className="flex items-start justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5"
                      >
                        <span className="min-w-0 text-[11px] leading-snug text-slate-300">
                          <span className="line-clamp-2">
                            {titleFor(edge.a)}
                          </span>

                          <span className="mx-1 text-slate-600">
                            ↔
                          </span>

                          <span className="line-clamp-2">
                            {titleFor(edge.b)}
                          </span>
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            onRemoveConnection(
                              edge.id
                            )
                          }
                          className="shrink-0 rounded-md p-1 text-slate-500 transition hover:bg-white/10 hover:text-white"
                          title="Remove connection"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    )
                  )}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
