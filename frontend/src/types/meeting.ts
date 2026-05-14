export type CardType =
  | "tldr"
  | "action_item"
  | "decision"
  | "blocker"
  | "question"
  | "follow_up"
  | "missing_context"
  | "uncertainty"
  | "note"
  | "todo";

export interface WorkspaceEdge {
  id: string;

  a: number;

  b: number;
}

export interface Card {
  id: number;

  card_type: CardType;

  title: string;

  content: string;

  confidence_score?: number | string;

  transcript_segment?: string;

  assigned_to?: string;

  stakeholder?: string;

  due_date?: string;

  is_generated?: boolean;

  position_x?: number;

  position_y?: number;

  deleted?: boolean;

  selected?: boolean;

  parent_card_id?: number | null;

  tags?: string[];
}

export interface Meeting {
  id: number;

  title: string;

  transcript: string;

  meeting_date?: string;

  cards: Card[];

  uncovered_agenda_items?: string[];
}
