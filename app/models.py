from datetime import datetime
import enum

from app.database import db


class CardType(str, enum.Enum):
    """
    Semantic insight types extracted from meetings.
    """

    TLDR = "tldr"
    ACTION_ITEM = "action_item"
    DECISION = "decision"
    BLOCKER = "blocker"
    QUESTION = "question"
    FOLLOW_UP = "follow_up"
    MISSING_CONTEXT = "missing_context"
    UNCERTAINTY = "uncertainty"


class CardStatus(str, enum.Enum):
    """
    Lifecycle state of a card.
    """

    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class Meeting(db.Model):
    """
    Stores raw meeting information and transcript data.
    """

    __tablename__ = "meetings"

    id = db.Column(db.Integer, primary_key=True)

    # Core metadata
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)

    # Optional contextual metadata
    team_name = db.Column(db.String(100), nullable=True)
    meeting_type = db.Column(db.String(50), nullable=True)

    # Raw transcript input
    transcript = db.Column(db.Text, nullable=False)

    # Optional structured inputs
    agenda_items = db.Column(db.JSON, nullable=True)
    uncovered_agenda_items = db.Column(db.JSON, nullable=True)

    # Meeting timing
    meeting_date = db.Column(db.DateTime, nullable=False)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # Relationships
    cards = db.relationship(
        "Card",
        back_populates="meeting",
        cascade="all, delete-orphan"
    )


class Card(db.Model):
    """
    Represents a structured operational insight extracted from a meeting.
    """

    __tablename__ = "cards"

    id = db.Column(db.Integer, primary_key=True)

    # Parent meeting
    meeting_id = db.Column(
        db.Integer,
        db.ForeignKey("meetings.id"),
        nullable=False
    )

    # Semantic classification
    card_type = db.Column(db.Enum(CardType), nullable=False)

    # Core content
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=False)

    # Workflow state
    status = db.Column(
        db.Enum(CardStatus),
        default=CardStatus.DRAFT
    )

    # AI extraction metadata
    is_generated = db.Column(db.Boolean, default=True)

    # Confidence + explainability
    confidence_score = db.Column(db.Float, default=0.5)
    reasoning = db.Column(db.Text, nullable=True)

    # Supporting evidence from transcript
    transcript_segment = db.Column(db.Text, nullable=True)

    # Operational metadata
    assigned_to = db.Column(db.String(100), nullable=True)
    stakeholder = db.Column(db.String(100), nullable=True)

    due_date = db.Column(db.DateTime, nullable=True)

    # Priority / severity / importance
    impact_score = db.Column(db.Integer, default=1)

    # UI relationship metadata
    parent_card_id = db.Column(
        db.Integer,
        db.ForeignKey("cards.id"),
        nullable=True
    )

    # Lightweight spatial organization for frontend
    position_x = db.Column(db.Integer, default=0)
    position_y = db.Column(db.Integer, default=0)

    # Flexible tagging
    tags = db.Column(db.JSON, nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # Relationships
    meeting = db.relationship(
        "Meeting",
        back_populates="cards"
    )

    parent_card = db.relationship(
        "Card",
        remote_side=[id],
        backref="child_cards"
    )