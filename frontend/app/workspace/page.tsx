"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import WorkspaceSidebar from "@/src/components/WorkspaceSidebar";

import TranscriptPanel from "@/src/components/TranscriptPanel";

import DraggableInsightCard, {
  CARD_ANCHOR_OFFSET_X,
  CARD_ANCHOR_OFFSET_Y,
  CARD_WIDTH,
} from "@/src/components/DraggableInsightCard";

import TrashRail from "@/src/components/TrashRail";

import { analyzeMeeting } from "@/src/services/meetingApi";

import {
  Card,
  Meeting,
  WorkspaceEdge,
} from "@/src/types/meeting";

function formatMeetingDateLabel(
  iso?: string | null
): string {
  if (!iso) return "Date not set";

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) {
    return "Date not set";
  }

  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function pointInRect(
  x: number,
  y: number,
  rect: DOMRect | undefined
): boolean {
  if (!rect) return false;

  return (
    x >= rect.left &&
    x <= rect.right &&
    y >= rect.top &&
    y <= rect.bottom
  );
}

export default function WorkspacePage() {
  const router = useRouter();

  const hasLoaded = useRef(false);

  const trashRef =
    useRef<HTMLDivElement>(null);

  const workspaceViewportRef =
    useRef<HTMLDivElement>(null);

  const [meeting, setMeeting] =
    useState<Meeting | null>(null);

  const [meetingDateIso, setMeetingDateIso] =
    useState<string>("");

  const [cards, setCards] = useState<Card[]>(
    []
  );

  const [connections, setConnections] =
    useState<WorkspaceEdge[]>([]);

  const [activeView, setActiveView] =
    useState<"workspace" | "transcript">(
      "workspace"
    );

  const [linkAnchorId, setLinkAnchorId] =
    useState<number | null>(null);

  const [trashHot, setTrashHot] =
    useState(false);

  const canvasSize = useMemo(() => {
    const padX = 160;

    const padY = 200;

    const cardHeightEstimate = 420;

    let maxX = 1400;

    let maxY = 900;

    for (const c of cards) {
      if (c.deleted) continue;

      const x = c.position_x ?? 0;

      const y = c.position_y ?? 0;

      maxX = Math.max(
        maxX,
        x + CARD_WIDTH + padX
      );

      maxY = Math.max(
        maxY,
        y + cardHeightEstimate + padY
      );
    }

    return {
      width: maxX,

      height: maxY,
    };
  }, [cards]);

  function setWorkspaceDragSession(
    active: boolean
  ) {
    const el =
      workspaceViewportRef.current;

    if (!el) return;

    if (active) {
      el.style.overflow = "hidden";
    } else {
      el.style.removeProperty(
        "overflow"
      );
    }
  }

  useEffect(() => {
    if (hasLoaded.current) return;

    hasLoaded.current = true;

    async function loadMeeting() {
      try {
        const stored =
          localStorage.getItem(
            "meeting_input"
          );

        if (!stored) return;

        const parsed = JSON.parse(stored);

        const payloadDate =
          typeof parsed.meeting_date ===
          "string"
            ? parsed.meeting_date
            : new Date().toISOString();

        const response: Meeting =
          await analyzeMeeting({
            title:
              parsed.title ||
              "Engineering Meeting",

            description:
              "AI analyzed engineering meeting",

            team_name: "Engineering",

            meeting_type: "Team Sync",

            transcript:
              parsed.transcript,

            agenda_items: parsed.agenda
              ? parsed.agenda
                  .split("\n")
                  .filter(Boolean)
              : [],

            meeting_date: payloadDate,

            requested_card_types: [
              "tldr",
              "action_item",
              "decision",
              "blocker",
              "question",
              "uncertainty",
            ],
          });

        const positionedCards =
          (response.cards || []).map(
            (card: Card, index: number) => ({
              ...card,

              position_x:
                24 +
                (index % 3) * 360,

              position_y:
                120 +
                Math.floor(index / 3) * 300,

              deleted: false,
            })
          );

        setMeeting(response);

        setMeetingDateIso(
          response.meeting_date ||
            payloadDate
        );

        setCards(positionedCards);
      } catch (err) {
        console.error(err);
      }
    }

    loadMeeting();
  }, []);

  useEffect(() => {
    return () => {
      workspaceViewportRef.current?.style.removeProperty(
        "overflow"
      );
    };
  }, []);

  function moveToTrash(id: number) {
    setCards((prev) =>
      prev.map((card) =>
        card.id === id
          ? { ...card, deleted: true }
          : card
      )
    );
  }

  function restoreCard(id: number) {
    setCards((prev) =>
      prev.map((card) =>
        card.id === id
          ? { ...card, deleted: false }
          : card
      )
    );
  }

  function updateCardPosition(
    id: number,
    x: number,
    y: number
  ) {
    setCards((prev) =>
      prev.map((card) =>
        card.id === id
          ? {
              ...card,

              position_x: Math.round(x),

              position_y: Math.round(y),
            }
          : card
      )
    );
  }

  function handleCardDragComplete(
    id: number,
    nextX: number,
    nextY: number,
    clientX: number,
    clientY: number
  ) {
    const rect =
      trashRef.current?.getBoundingClientRect();

    if (
      pointInRect(clientX, clientY, rect)
    ) {
      moveToTrash(id);

      return;
    }

    updateCardPosition(id, nextX, nextY);
  }

  function handlePointerDrag(
    clientX: number,
    clientY: number
  ) {
    const rect =
      trashRef.current?.getBoundingClientRect();

    setTrashHot(
      pointInRect(clientX, clientY, rect)
    );
  }

  function handlePointerDragEnd() {
    setTrashHot(false);
  }

  const addLabels: Record<string, string> =
    {
      note: "New note",

      todo: "New todo",

      blocker: "New blocker",

      action_item: "New action",

      question: "New question",

      decision: "New decision",
    };

  function createCard(type: string) {
    setActiveView("workspace");

    setCards((prev) => {
      const nextId = Date.now();

      const next: Card = {
        id: nextId,

        card_type: type as Card["card_type"],

        title:
          addLabels[type] ?? `New ${type}`,

        content:
          "Add your operational detail here.",

        is_generated: false,

        position_x: 36 + prev.length * 12,

        position_y: 200 + prev.length * 8,

        deleted: false,
      };

      return [...prev, next];
    });
  }

  function handleLinkClick(id: number) {
    setLinkAnchorId((prev) => {
      if (prev === null) return id;

      if (prev === id) return null;

      const a = Math.min(prev, id);

      const b = Math.max(prev, id);

      queueMicrotask(() => {
        setConnections((edges) => {
          if (
            edges.some(
              (e) => e.a === a && e.b === b
            )
          ) {
            return edges;
          }

          return [
            ...edges,

            {
              id: `e-${a}-${b}`,

              a,

              b,
            },
          ];
        });
      });

      return null;
    });
  }

  function removeConnection(id: string) {
    setConnections((prev) =>
      prev.filter((e) => e.id !== id)
    );
  }

  function startOver() {
    localStorage.removeItem(
      "meeting_input"
    );

    router.push("/");
  }

  const meetingTitle =
    meeting?.title ?? "";

  const dateLabel = formatMeetingDateLabel(
    meetingDateIso ||
      meeting?.meeting_date
  );

  if (!meeting) {
    return (
      <main className="flex h-[100dvh] items-center justify-center bg-[#020617] text-slate-400">
        Generating operational workspace...
      </main>
    );
  }

  const activeCards = cards.filter(
    (c) => !c.deleted
  );

  const trashCards = cards.filter(
    (c) => c.deleted
  );

  const visibleConnections =
    connections.filter((edge) => {
      const ca = cards.find(
        (c) => c.id === edge.a
      );

      const cb = cards.find(
        (c) => c.id === edge.b
      );

      return (
        ca &&
        cb &&
        !ca.deleted &&
        !cb.deleted
      );
    });

  return (
    <main className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#020617] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.08),transparent_40%)]" />

      <TrashRail
        ref={trashRef}
        trashCards={trashCards}
        onRestore={restoreCard}
        isDragOver={trashHot}
      />

      <div className="relative z-10 flex min-h-0 flex-1 pl-[4.5rem]">
        <aside className="flex w-[min(100%,280px)] shrink-0 flex-col border-r border-white/10 shadow-xl">
          <WorkspaceSidebar
            meetingTitle={meetingTitle}
            meetingDateLabel={dateLabel}
            cards={cards}
            activeView={activeView}
            setActiveView={setActiveView}
            onStartOver={startOver}
            onCreateCard={createCard}
            connections={visibleConnections}
            onRemoveConnection={
              removeConnection
            }
            linkAnchorId={linkAnchorId}
          />
        </aside>

        <section className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          {activeView === "transcript" ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <TranscriptPanel
                meetingTitle={meetingTitle}
                meetingDateLabel={dateLabel}
                transcript={meeting.transcript}
              />
            </div>
          ) : (
            <div
              ref={workspaceViewportRef}
              className="relative min-h-0 flex-1 overflow-x-auto overflow-y-auto bg-[#020617] overscroll-contain"
            >
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />

              <div className="sticky top-0 z-20 border-b border-white/10 bg-[#020617]/90 px-4 py-2.5 text-xs leading-relaxed text-slate-400 backdrop-blur-md">
                <span className="font-medium text-slate-200">
                  Tip:
                </span>{" "}
                Drag cards to arrange. Use the link icon on one card, then another, to connect them. Drop cards on the left trash rail to remove.
              </div>

              <div
                className="relative mx-auto box-border p-3 pb-16 pt-4"
                style={{
                  width: canvasSize.width,

                  height: canvasSize.height,

                  minWidth: "100%",

                  minHeight: "100%",
                }}
              >
                <svg
                  className="pointer-events-none absolute inset-0 z-0 h-full min-h-full w-full min-w-full overflow-visible"
                  aria-hidden
                >
                  {connections.map((edge) => {
                    const from = cards.find(
                      (c) => c.id === edge.a
                    );

                    const to = cards.find(
                      (c) => c.id === edge.b
                    );

                    if (
                      !from ||
                      !to ||
                      from.deleted ||
                      to.deleted
                    ) {
                      return null;
                    }

                    const x1 =
                      (from.position_x ?? 0) +
                      CARD_ANCHOR_OFFSET_X;

                    const y1 =
                      (from.position_y ?? 0) +
                      CARD_ANCHOR_OFFSET_Y;

                    const x2 =
                      (to.position_x ?? 0) +
                      CARD_ANCHOR_OFFSET_X;

                    const y2 =
                      (to.position_y ?? 0) +
                      CARD_ANCHOR_OFFSET_Y;

                    const mx = (x1 + x2) / 2;

                    const my =
                      Math.min(y1, y2) - 40;

                    return (
                      <path
                        key={edge.id}
                        d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                        fill="none"
                        stroke="rgba(34,211,238,0.35)"
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                    );
                  })}
                </svg>

                {activeCards.map((card) => (
                  <DraggableInsightCard
                    key={card.id}
                    card={card}
                    onMoveToTrash={moveToTrash}
                    onDragComplete={
                      handleCardDragComplete
                    }
                    onPointerDrag={
                      handlePointerDrag
                    }
                    onPointerDragEnd={
                      handlePointerDragEnd
                    }
                    onLinkClick={handleLinkClick}
                    linkAnchorId={linkAnchorId}
                    onDragSessionChange={
                      setWorkspaceDragSession
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
