import logging
import os

from datetime import datetime
from typing import List, Optional

from flask import Blueprint, jsonify, request

from app.database import db
from app.models import Card, CardType, Meeting
from app.schemas import (
    MeetingCreateSchema,
    MeetingDetailSchema,
    MeetingSchema
)
from app.services.extraction_service import ExtractionService


logger = logging.getLogger(__name__)

bp = Blueprint("meetings", __name__)


# =========================================================
# Schemas
# =========================================================

meeting_schema = MeetingSchema()
meetings_schema = MeetingSchema(many=True)

meeting_create_schema = MeetingCreateSchema()
meeting_detail_schema = MeetingDetailSchema()


# =========================================================
# Helpers
# =========================================================

def get_extraction_service() -> ExtractionService:
    """
    Initialize extraction service using environment API key.
    """

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY environment variable is not set"
        )

    return ExtractionService(api_key=api_key)


_DEFAULT_EXTRACTION_TYPES: List[CardType] = [
    CardType.TLDR,
    CardType.ACTION_ITEM,
    CardType.DECISION,
    CardType.BLOCKER,
    CardType.QUESTION,
    CardType.UNCERTAINTY,
]


def _normalize_card_type_key(
    raw: object,
) -> Optional[str]:
    if isinstance(raw, CardType):
        return raw.value

    if raw is None:
        return None

    key = (
        str(raw)
        .strip()
        .lower()
        .replace(" ", "_")
        .replace("-", "_")
    )

    return key or None


def parse_requested_card_type(
    raw: object,
) -> Optional[CardType]:
    """
    Resolve API / client input to CardType.
    """

    key = _normalize_card_type_key(raw)

    if key is None:
        return None

    try:
        return CardType(key)
    except ValueError:
        logger.warning(
            "Ignoring unknown requested_card_type: %r",
            raw,
        )
        return None


def resolve_requested_types(
    raw_list: object,
) -> List[CardType]:
    """
    Card types to send to the extractor.

    Falls back to defaults when missing or all invalid.
    """

    if raw_list is None:
        return list(_DEFAULT_EXTRACTION_TYPES)

    if not isinstance(raw_list, list):
        return list(_DEFAULT_EXTRACTION_TYPES)

    parsed: List[CardType] = []

    for item in raw_list:
        member = parse_requested_card_type(item)

        if member is not None:
            parsed.append(member)

    return (
        parsed
        if parsed
        else list(_DEFAULT_EXTRACTION_TYPES)
    )


def parse_llm_card_type(
    raw: object,
) -> Optional[CardType]:
    """
    Map a single model output string to CardType.

    Returns None when the model returns an unsupported label.
    """

    key = _normalize_card_type_key(raw)

    if key is None:
        return None

    try:
        return CardType(key)
    except ValueError:
        logger.warning(
            "Skipping extracted card with unknown type: %r",
            raw,
        )
        return None


# =========================================================
# Routes
# =========================================================

@bp.route("/analyze", methods=["POST"])
def analyze_meeting():
    """
    Analyze a meeting transcript and extract operational insights.
    """

    data = request.get_json()

    errors = meeting_create_schema.validate(data)

    if errors:
        return jsonify(errors), 400

    # -----------------------------------------------------
    # Parse Meeting Date
    # -----------------------------------------------------

    if isinstance(data.get("meeting_date"), str):
        data["meeting_date"] = datetime.fromisoformat(
            data["meeting_date"].replace("Z", "+00:00")
        )

    # -----------------------------------------------------
    # Create Meeting Record
    # -----------------------------------------------------

    meeting = Meeting(
        title=data["title"],
        description=data.get("description"),

        team_name=data.get("team_name"),
        meeting_type=data.get("meeting_type"),

        transcript=data["transcript"],

        agenda_items=data.get("agenda_items"),

        meeting_date=data["meeting_date"]
    )

    db.session.add(meeting)
    db.session.flush()

    # -----------------------------------------------------
    # Initialize Extraction Service
    # -----------------------------------------------------

    try:
        extraction_service = get_extraction_service()

    except ValueError as error:

        logger.error(
            f"Failed to initialize extraction service: {error}"
        )

        return jsonify({
            "error": "LLM service not configured",
            "message": str(error)
        }), 500

    # -----------------------------------------------------
    # Requested Insight Types
    # -----------------------------------------------------

    requested_types = resolve_requested_types(
        data.get("requested_card_types")
    )

    # -----------------------------------------------------
    # Extract Operational Intelligence
    # -----------------------------------------------------

    extracted_cards = extraction_service.extract_cards(
        transcript=data["transcript"],
        agenda_items=data.get("agenda_items"),
        requested_types=requested_types
    )

    # -----------------------------------------------------
    # Persist Cards
    # -----------------------------------------------------

    for card_data in extracted_cards:

        if not isinstance(card_data, dict):
            continue

        card_type = parse_llm_card_type(
            card_data.get("type")
        )

        if card_type is None:
            continue

        title = card_data.get("title")
        content = card_data.get("content")

        if not title or not content:
            logger.warning(
                "Skipping extracted card missing title or content"
            )
            continue

        try:

            card = Card(
                meeting_id=meeting.id,

                card_type=card_type,

                title=title,
                content=content,

                is_generated=True,

                # Explainability
                transcript_segment=card_data.get("segment"),
                confidence_score=card_data.get(
                    "confidence_score",
                    0.5
                ),
                reasoning=card_data.get("reasoning"),

                # Operational metadata
                assigned_to=card_data.get("assigned_to"),
                stakeholder=card_data.get("stakeholder"),

                impact_score=card_data.get(
                    "impact_score",
                    1
                ),

                tags=card_data.get("tags"),

                # UI metadata
                position_x=card_data.get(
                    "position_x",
                    0
                ),
                position_y=card_data.get(
                    "position_y",
                    0
                ),

                parent_card_id=card_data.get(
                    "parent_card_id"
                )
            )

            # Optional due date
            due_date = card_data.get("due_date")

            if due_date:
                try:
                    card.due_date = datetime.fromisoformat(
                        due_date.replace("Z", "+00:00")
                    )
                except Exception:
                    pass

            db.session.add(card)

        except Exception as error:

            logger.warning(
                f"Skipping invalid extracted card: {error}"
            )

    # -----------------------------------------------------
    # Agenda Coverage Analysis
    # -----------------------------------------------------

    if data.get("agenda_items"):

        uncovered = (
            extraction_service.find_uncovered_agenda_items(
                agenda_items=data["agenda_items"],
                transcript=data["transcript"]
            )
        )

        meeting.uncovered_agenda_items = uncovered

    db.session.commit()

    logger.info(
        f"Meeting analyzed successfully "
        f"(meeting_id={meeting.id})"
    )

    return jsonify(
        meeting_detail_schema.dump(meeting)
    ), 201


# =========================================================
# CRUD Endpoints
# =========================================================

@bp.route("/", methods=["GET"])
def list_meetings():
    """
    List all analyzed meetings.
    """

    skip = request.args.get("skip", 0, type=int)
    limit = request.args.get("limit", 100, type=int)

    meetings = (
        Meeting.query
        .order_by(Meeting.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return jsonify(
        meetings_schema.dump(meetings)
    )


@bp.route("/<int:meeting_id>", methods=["GET"])
def get_meeting(meeting_id):
    """
    Retrieve a single analyzed meeting.
    """

    meeting = Meeting.query.get(meeting_id)

    if not meeting:
        return jsonify({
            "error": "Meeting not found"
        }), 404

    return jsonify(
        meeting_detail_schema.dump(meeting)
    )


@bp.route("/<int:meeting_id>", methods=["PUT"])
def update_meeting(meeting_id):
    """
    Update meeting metadata.
    """

    meeting = Meeting.query.get(meeting_id)

    if not meeting:
        return jsonify({
            "error": "Meeting not found"
        }), 404

    data = request.get_json()

    # Parse meeting date
    if (
        "meeting_date" in data
        and isinstance(data["meeting_date"], str)
    ):
        data["meeting_date"] = datetime.fromisoformat(
            data["meeting_date"].replace("Z", "+00:00")
        )

    editable_fields = [
        "title",
        "description",
        "team_name",
        "meeting_type",
        "transcript",
        "agenda_items",
        "meeting_date"
    ]

    for field in editable_fields:
        if field in data:
            setattr(meeting, field, data[field])

    meeting.updated_at = datetime.utcnow()

    db.session.commit()

    return jsonify(
        meeting_schema.dump(meeting)
    )


@bp.route("/<int:meeting_id>", methods=["DELETE"])
def delete_meeting(meeting_id):
    """
    Delete meeting and associated insight cards.
    """

    meeting = Meeting.query.get(meeting_id)

    if not meeting:
        return jsonify({
            "error": "Meeting not found"
        }), 404

    db.session.delete(meeting)

    db.session.commit()

    return "", 204


# =========================================================
# Reanalysis Endpoint
# =========================================================

@bp.route("/<int:meeting_id>/reextract", methods=["POST"])
def reextract_cards(meeting_id):
    """
    Re-run extraction on an existing transcript.

    Useful for:
    - different extraction modes,
    - new card types,
    - improved prompting,
    - focused analysis.
    """

    meeting = Meeting.query.get(meeting_id)

    if not meeting:
        return jsonify({
            "error": "Meeting not found"
        }), 404

    data = request.get_json(silent=True) or {}

    requested_types = resolve_requested_types(
        data.get("requested_card_types")
    )

    # -----------------------------------------------------
    # Initialize Extraction
    # -----------------------------------------------------

    try:
        extraction_service = get_extraction_service()

    except ValueError as error:

        logger.error(
            f"Failed to initialize extraction service: {error}"
        )

        return jsonify({
            "error": "LLM service not configured",
            "message": str(error)
        }), 500

    # -----------------------------------------------------
    # Run Extraction
    # -----------------------------------------------------

    extracted_cards = extraction_service.extract_cards(
        transcript=meeting.transcript,
        agenda_items=meeting.agenda_items,
        requested_types=requested_types
    )

    # -----------------------------------------------------
    # Remove Old AI Cards
    # -----------------------------------------------------

    Card.query.filter_by(
        meeting_id=meeting_id,
        is_generated=True
    ).delete()

    # -----------------------------------------------------
    # Insert New AI Cards
    # -----------------------------------------------------

    for card_data in extracted_cards:

        if not isinstance(card_data, dict):
            continue

        card_type = parse_llm_card_type(
            card_data.get("type")
        )

        if card_type is None:
            continue

        title = card_data.get("title")
        content = card_data.get("content")

        if not title or not content:
            logger.warning(
                "Skipping reextracted card missing title or content"
            )
            continue

        try:

            card = Card(
                meeting_id=meeting.id,

                card_type=card_type,

                title=title,
                content=content,

                is_generated=True,

                transcript_segment=card_data.get(
                    "segment"
                ),

                confidence_score=card_data.get(
                    "confidence_score",
                    0.5
                ),

                reasoning=card_data.get(
                    "reasoning"
                ),

                assigned_to=card_data.get(
                    "assigned_to"
                ),

                stakeholder=card_data.get(
                    "stakeholder"
                ),

                impact_score=card_data.get(
                    "impact_score",
                    1
                ),

                tags=card_data.get(
                    "tags"
                ),

                position_x=card_data.get(
                    "position_x",
                    0
                ),

                position_y=card_data.get(
                    "position_y",
                    0
                ),

                parent_card_id=card_data.get(
                    "parent_card_id"
                )
            )

            due_date = card_data.get("due_date")

            if due_date:
                try:
                    card.due_date = datetime.fromisoformat(
                        due_date.replace("Z", "+00:00")
                    )
                except Exception:
                    pass

            db.session.add(card)

        except Exception as error:

            logger.warning(
                f"Skipping invalid card during reextract: {error}"
            )

    db.session.commit()

    logger.info(
        f"Meeting reanalyzed successfully "
        f"(meeting_id={meeting.id})"
    )

    return jsonify(
        meeting_detail_schema.dump(meeting)
    )