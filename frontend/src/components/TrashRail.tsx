"use client";

import { forwardRef } from "react";

import { ArchiveRestore, Trash2 } from "lucide-react";

import { Card } from "@/src/types/meeting";

interface Props {
  trashCards: Card[];

  onRestore: (id: number) => void;

  isDragOver: boolean;
}

const TrashRail = forwardRef<HTMLDivElement, Props>(
  function TrashRail(
    { trashCards, onRestore, isDragOver },
    ref
  ) {
    return (
      <aside
        ref={ref}
        className={`
          fixed left-0 top-0 z-50 flex h-screen w-[4.5rem] flex-col
          border-r border-white/10 bg-[#050b14]/95 backdrop-blur-xl
          transition-colors
          ${isDragOver ? "border-cyan-400/50 bg-cyan-950/40" : ""}
        `}
      >
        <div className="flex flex-1 flex-col items-center gap-1 border-b border-white/10 py-4">
          <div
            className={`
              flex h-11 w-11 items-center justify-center rounded-2xl
              border transition
              ${
                isDragOver
                  ? "border-cyan-400/60 bg-cyan-400/20 text-cyan-100"
                  : "border-white/10 bg-white/5 text-slate-400"
              }
            `}
            title="Drag cards here to trash"
          >
            <Trash2 className="h-5 w-5" />
          </div>

          <span className="mt-1 max-w-[3.25rem] text-center text-[10px] font-medium uppercase leading-tight tracking-wide text-slate-500">
            Drop to trash
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-3">
          {trashCards.length === 0 ? (
            <p className="px-1 text-center text-[10px] leading-tight text-slate-600">
              Empty
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {trashCards.map((card) => (
                <li key={card.id}>
                  <button
                    type="button"
                    onClick={() => onRestore(card.id)}
                    title={card.title}
                    className="flex w-full flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-1 py-2 text-[10px] text-slate-300 transition hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-100"
                  >
                    <ArchiveRestore className="h-3.5 w-3.5 shrink-0 text-emerald-400/90" />

                    <span className="line-clamp-3 w-full text-center leading-tight">
                      {card.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-white/10 px-1 py-2 text-center text-[10px] tabular-nums text-slate-500">
          {trashCards.length}
        </div>
      </aside>
    );
  }
);

export default TrashRail;
