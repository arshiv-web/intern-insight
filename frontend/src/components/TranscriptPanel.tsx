"use client";

import {
  FileText,
  Search,
  CalendarDays,
} from "lucide-react";

interface Props {
  meetingTitle: string;

  meetingDateLabel: string;

  transcript: string;
}

export default function TranscriptPanel({
  meetingTitle,
  meetingDateLabel,
  transcript,
}: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#050b14]">
      <header className="shrink-0 border-b border-white/10 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="rounded-xl bg-cyan-400/10 p-2.5 text-cyan-300">
              <FileText className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Transcript
              </p>

              <h2 className="mt-1 line-clamp-2 text-xl font-semibold text-white">
                {meetingTitle || "Meeting"}
              </h2>

              <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                <CalendarDays className="h-4 w-4 shrink-0 text-slate-500" />

                <span>{meetingDateLabel}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-4 max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

          <input
            readOnly
            placeholder="Search coming soon"
            className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-black/25 py-2.5 pl-10 pr-3 text-sm text-slate-500 outline-none"
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <article className="rounded-2xl border border-white/10 bg-black/20 p-6">
          <div className="space-y-4 text-[15px] leading-7 text-slate-300">
            {transcript
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line, index) => (
                <p
                  key={index}
                  className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
                >
                  {line}
                </p>
              ))}
          </div>
        </article>
      </div>
    </div>
  );
}
