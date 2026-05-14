"use client";

import { useRouter } from "next/navigation";

import { useState } from "react";

import {
  ArrowRight,
  Sparkles,
} from "lucide-react";

function toDatetimeLocalValue(
  d: Date
): string {
  const pad = (n: number) =>
    String(n).padStart(2, "0");

  return `${d.getFullYear()}-${pad(
    d.getMonth() + 1
  )}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

const DEMO_TRANSCRIPT = `
Chris (EM): Quick sync on the 2.4 release train. Feature-complete except payments webhooks — we need crisp owners before we cut the branch.

Alex (backend): I will land webhook retries and dead-letter handling by Thursday EOD. I am blocked until Maria publishes the idempotency contract — I cannot ship without it.

Maria (PM): Contract is drafted; I will publish it tomorrow by 10am. On geography, we decided North America goes live first; EU stays dark until error budgets stay green for twenty-four hours after NA.

Jamie (SRE): Recording that rollout decision: NA first, then EU. Separate blocker: staging still has last month’s TLS bundle, so I cannot run a realistic soak until infra ticket INFRA-882 is promoted to staging.

Taylor (intern): What is INFRA-882?

Chris: Internal infra ticket for the broker cert rotation — historical context lives in the old wiki. For your onboarding track you only need the runbook link I will paste in Slack.

Priya (QA): Who owns final sign-off on the payments path? I heard two different stories in two different channels.

Chris: We think Priya owns the QA scripts and Alex owns the service — but we did not lock a single DRI before we ran out of time; we should probably revisit.

Jordan (design): Is the analytics dashboard still in scope for 2.4?

Chris: No — we cut it last week; it ships after the freeze.

Alex: Open risk: double-submit can race the webhook handler. I am uncertain whether the new rate-limit middleware runs before or after the controller on the refactored path — I will spike that for two hours on Wednesday and report back.
`.trim();

const DEMO_AGENDA = `Webhook reliability & owners
Rollout geography (NA / EU)
TLS / staging soak (INFRA-882)
QA sign-off DRI (single owner)
SOC2 evidence collection
OKR grading workshop`;

export default function HomePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");

  const [transcript, setTranscript] =
    useState("");

  const [agenda, setAgenda] = useState("");

  const [meetingDateLocal, setMeetingDateLocal] =
    useState(() =>
      toDatetimeLocalValue(new Date())
    );

  function handleAnalyze() {
    const meeting_date =
      meetingDateLocal.trim() === ""
        ? new Date().toISOString()
        : new Date(
            meetingDateLocal
          ).toISOString();

    localStorage.setItem(
      "meeting_input",
      JSON.stringify({
        title,
        transcript,
        agenda,
        meeting_date,
      })
    );

    router.push("/workspace");
  }

  function loadDemo() {
    setTitle(
      "Demo: Release 2.4 readiness sync"
    );

    setTranscript(DEMO_TRANSCRIPT);

    setAgenda(DEMO_AGENDA);

    setMeetingDateLocal(
      toDatetimeLocalValue(new Date())
    );
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#020617] text-white">
      <div className="pointer-events-none absolute left-[-10%] top-[-20%] h-[500px] w-[500px] rounded-full bg-cyan-500/18 blur-3xl" />

      <div className="pointer-events-none absolute bottom-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-violet-500/18 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-7xl items-center px-5 py-16 sm:px-6 sm:py-20">
        <div className="grid w-full grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col justify-center">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-slate-300 backdrop-blur-xl">
              <Sparkles className="h-4 w-4 shrink-0 text-cyan-400" />

              AI operational intelligence
            </div>

            <h1 className="max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Understand what actually matters in meetings.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg sm:leading-8">
              InternInsight turns transcripts into insight cards you can move, link, and triage — built for interns who need execution clarity, not another wall of notes.
            </p>

            <button
              type="button"
              onClick={loadDemo}
              className="mt-8 w-fit rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-5 py-3 text-sm font-medium text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-500/15"
            >
              Load demo transcript
            </button>

            <p className="mt-3 max-w-md text-xs leading-relaxed text-slate-500">
              Demo covers actions, decisions, a staging blocker, unanswered ownership, uncertainty, jargon an intern might miss, plus two agenda lines never discussed (try agenda coverage after analyze).
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
            <h2 className="text-xl font-semibold text-white sm:text-2xl">
              Analyze meeting
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Paste a transcript, optional agenda lines, then open the workspace.
            </p>

            <div className="mt-6 space-y-5">
              <input
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                placeholder="Meeting title"
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none ring-0 transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/25"
              />

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
                  Meeting date & time
                </label>

                <input
                  type="datetime-local"
                  value={meetingDateLocal}
                  onChange={(e) =>
                    setMeetingDateLocal(
                      e.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/25"
                />
              </div>

              <textarea
                value={transcript}
                onChange={(e) =>
                  setTranscript(
                    e.target.value
                  )
                }
                rows={12}
                placeholder="Paste meeting transcript…"
                className="w-full resize-y rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/25"
              />

              <textarea
                value={agenda}
                onChange={(e) =>
                  setAgenda(e.target.value)
                }
                rows={5}
                placeholder="Agenda items (optional, one per line)"
                className="w-full resize-y rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/25"
              />

              <button
                type="button"
                disabled={!transcript.trim()}
                onClick={handleAnalyze}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-4 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/10 transition hover:bg-cyan-300 disabled:pointer-events-none disabled:opacity-45"
              >
                Generate workspace

                <ArrowRight className="h-4 w-4 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
