from datetime import datetime

from flask import Blueprint, jsonify, request

from app.database import db
from app.models import Card, CardStatus, CardType
from app.schemas import CardDetailSchema, CardSchema


bp = Blueprint("cards", __name__)


# =========================================================
# Schemas
# =========================================================

card_schema = CardSchema()
cards_schema = CardSchema(many=True)

card_detail_schema = CardDetailSchema()


# =========================================================
# Create Card
# =========================================================

@bp.route("/", methods=["POST"])
def create_card():
    """
    Create a manual operational insight card.
    """

    data = request.get_json()

    errors = card_schema.validate(data)

    if errors:
        return jsonify(errors), 400

    # -----------------------------------------------------
    # Parse Due Date
    # -----------------------------------------------------

    if (
        "due_date" in data
        and isinstance(data.get("due_date"), str)
    ):
        data["due_date"] = datetime.fromisoformat(
            data["due_date"].replace("Z", "+00:00")
        )

    # -----------------------------------------------------
    # Create Card
    # -----------------------------------------------------

    card = Card(
        meeting_id=data["meeting_id"],

        card_type=CardType(data["card_type"]),

        title=data["title"],
        content=data["content"],

        status=CardStatus(
            data.get(
                "status",
                CardStatus.DRAFT.value
            )
        ),

        # AI metadata
        is_generated=False,

        confidence_score=data.get(
            "confidence_score",
            0.5
        ),

        reasoning=data.get(
            "reasoning"
        ),

        transcript_segment=data.get(
            "transcript_segment"
        ),

        # Operational metadata
        assigned_to=data.get(
            "assigned_to"
        ),

        stakeholder=data.get(
            "stakeholder"
        ),

        due_date=data.get(
            "due_date"
        ),

        impact_score=data.get(
            "impact_score",
            1
        ),

        tags=data.get(
            "tags"
        ),

        # UI relationship metadata
        parent_card_id=data.get(
            "parent_card_id"
        ),

        position_x=data.get(
            "position_x",
            0
        ),

        position_y=data.get(
            "position_y",
            0
        )
    )

    db.session.add(card)

    db.session.commit()

    return jsonify(
        card_schema.dump(card)
    ), 201


# =========================================================
# List Cards
# =========================================================

@bp.route("/", methods=["GET"])
def list_cards():
    """
    List operational insight cards.

    Supports filtering by:
    - meeting_id
    - card_type
    - status
    """

    meeting_id = request.args.get(
        "meeting_id",
        type=int
    )

    card_type = request.args.get(
        "card_type"
    )

    status = request.args.get(
        "status"
    )

    skip = request.args.get(
        "skip",
        0,
        type=int
    )

    limit = request.args.get(
        "limit",
        100,
        type=int
    )

    query = Card.query

    # -----------------------------------------------------
    # Filters
    # -----------------------------------------------------

    if meeting_id is not None:
        query = query.filter_by(
            meeting_id=meeting_id
        )

    if card_type:
        try:
            query = query.filter_by(
                card_type=CardType(card_type)
            )
        except Exception:
            pass

    if status:
        try:
            query = query.filter_by(
                status=CardStatus(status)
            )
        except Exception:
            pass

    # -----------------------------------------------------
    # Ordering
    # -----------------------------------------------------

    cards = (
        query
        .order_by(Card.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return jsonify(
        cards_schema.dump(cards)
    )


# =========================================================
# Get Card
# =========================================================

@bp.route("/<int:card_id>", methods=["GET"])
def get_card(card_id):
    """
    Retrieve a detailed operational insight card.
    """

    card = Card.query.get(card_id)

    if not card:
        return jsonify({
            "error": "Card not found"
        }), 404

    return jsonify(
        card_detail_schema.dump(card)
    )


# =========================================================
# Update Card
# =========================================================

@bp.route("/<int:card_id>", methods=["PATCH"])
def update_card(card_id):
    """
    Update an operational insight card.
    """

    card = Card.query.get(card_id)

    if not card:
        return jsonify({
            "error": "Card not found"
        }), 404

    data = request.get_json()

    # -----------------------------------------------------
    # Parse Due Date
    # -----------------------------------------------------

    if (
        "due_date" in data
        and isinstance(data.get("due_date"), str)
    ):
        data["due_date"] = datetime.fromisoformat(
            data["due_date"].replace("Z", "+00:00")
        )

    # -----------------------------------------------------
    # Editable Fields
    # -----------------------------------------------------

    editable_fields = [
        "title",
        "content",

        "assigned_to",
        "stakeholder",

        "due_date",
        "impact_score",

        "reasoning",
        "confidence_score",

        "transcript_segment",

        "parent_card_id",

        "position_x",
        "position_y",

        "tags"
    ]

    for field in editable_fields:

        if field in data:
            setattr(card, field, data[field])

    # -----------------------------------------------------
    # Enum Updates
    # -----------------------------------------------------

    if "card_type" in data:
        card.card_type = CardType(
            data["card_type"]
        )

    if "status" in data:
        card.status = CardStatus(
            data["status"]
        )

    card.updated_at = datetime.utcnow()

    db.session.commit()

    return jsonify(
        card_schema.dump(card)
    )


# =========================================================
# Delete Card
# =========================================================

@bp.route("/<int:card_id>", methods=["DELETE"])
def delete_card(card_id):
    """
    Delete an operational insight card.
    """

    card = Card.query.get(card_id)

    if not card:
        return jsonify({
            "error": "Card not found"
        }), 404

    db.session.delete(card)

    db.session.commit()

    return "", 204


# =========================================================
# Batch Position Updates
# =========================================================

@bp.route("/batch-update-positions", methods=["POST"])
def batch_update_positions():
    """
    Batch update frontend card positioning.

    Expects:
    [
        {
            "id": 1,
            "position_x": 120,
            "position_y": 340
        }
    ]
    """

    data = request.get_json()

    if not isinstance(data, list):
        return jsonify({
            "error": "Expected list of updates"
        }), 400

    updated_cards = []

    for update in data:

        card = Card.query.get(
            update.get("id")
        )

        if not card:
            continue

        card.position_x = update.get(
            "position_x",
            card.position_x
        )

        card.position_y = update.get(
            "position_y",
            card.position_y
        )

        card.updated_at = datetime.utcnow()

        updated_cards.append(card)

    db.session.commit()

    return jsonify(
        cards_schema.dump(updated_cards)
    )