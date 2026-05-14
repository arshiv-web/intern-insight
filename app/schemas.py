from marshmallow import (
    Schema,
    fields,
    validate,
    EXCLUDE,
    post_dump
)

from app.models import CardType, CardStatus


# =========================================================
# Meeting Schemas
# =========================================================

class MeetingSchema(Schema):
    """
    Base schema for meeting serialization.
    """

    id = fields.Int(dump_only=True)

    title = fields.Str(required=True)
    description = fields.Str(allow_none=True)

    team_name = fields.Str(allow_none=True)
    meeting_type = fields.Str(allow_none=True)

    transcript = fields.Str(required=True)

    agenda_items = fields.List(
        fields.Str(),
        allow_none=True
    )

    uncovered_agenda_items = fields.List(
        fields.Str(),
        allow_none=True,
        dump_only=True
    )

    meeting_date = fields.DateTime(required=True)

    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    class Meta:
        unknown = EXCLUDE


class MeetingCreateSchema(Schema):
    """
    Schema used when creating/analyzing a meeting.
    """

    title = fields.Str(required=True)

    description = fields.Str(allow_none=True)

    team_name = fields.Str(allow_none=True)
    meeting_type = fields.Str(allow_none=True)

    transcript = fields.Str(required=True)

    agenda_items = fields.List(
        fields.Str(),
        allow_none=True
    )

    meeting_date = fields.DateTime(required=True)

    requested_card_types = fields.List(
        fields.Str(
            validate=validate.OneOf(
                [t.value for t in CardType]
            )
        ),
        load_default=[
            CardType.TLDR.value,
            CardType.ACTION_ITEM.value,
            CardType.DECISION.value,
            CardType.BLOCKER.value,
            CardType.QUESTION.value,
            CardType.UNCERTAINTY.value
        ]
    )

    class Meta:
        unknown = EXCLUDE


# =========================================================
# Card Schemas
# =========================================================

class CardSchema(Schema):
    """
    Schema for operational insight cards.
    """

    id = fields.Int(dump_only=True)

    meeting_id = fields.Int(required=True)

    # Semantic type
    card_type = fields.Method(
        "serialize_card_type",
        deserialize="deserialize_card_type"
    )

    # Core content
    title = fields.Str(required=True)
    content = fields.Str(required=True)

    # Workflow state
    status = fields.Method(
        "serialize_status",
        deserialize="deserialize_status"
    )

    # AI metadata
    is_generated = fields.Bool(dump_only=True)

    confidence_score = fields.Float(
        load_default=0.5
    )

    reasoning = fields.Str(
        allow_none=True
    )

    transcript_segment = fields.Str(
        allow_none=True
    )

    # Operational metadata
    assigned_to = fields.Str(
        allow_none=True
    )

    stakeholder = fields.Str(
        allow_none=True
    )

    due_date = fields.DateTime(
        allow_none=True
    )

    impact_score = fields.Int(
        load_default=1
    )

    # UI relationship metadata
    parent_card_id = fields.Int(
        allow_none=True
    )

    position_x = fields.Int(
        load_default=0
    )

    position_y = fields.Int(
        load_default=0
    )

    # Flexible tagging
    tags = fields.List(
        fields.Str(),
        allow_none=True
    )

    # Timestamps
    created_at = fields.DateTime(
        dump_only=True
    )

    updated_at = fields.DateTime(
        dump_only=True
    )

    # -----------------------------------------------------
    # Enum Serialization Helpers
    # -----------------------------------------------------

    def serialize_card_type(self, obj):
        return (
            obj.card_type.value
            if hasattr(obj.card_type, "value")
            else obj.card_type
        )

    def deserialize_card_type(self, value):
        return CardType(value) if value else None

    def serialize_status(self, obj):
        return (
            obj.status.value
            if hasattr(obj.status, "value")
            else obj.status
        )

    def deserialize_status(self, value):
        return (
            CardStatus(value)
            if value
            else CardStatus.DRAFT
        )

    @post_dump
    def serialize_enums(self, data, **kwargs):
        """
        Ensure enum objects become strings in responses.
        """

        if (
            "card_type" in data
            and hasattr(data["card_type"], "value")
        ):
            data["card_type"] = data["card_type"].value

        if (
            "status" in data
            and hasattr(data["status"], "value")
        ):
            data["status"] = data["status"].value

        return data

    class Meta:
        unknown = EXCLUDE


# =========================================================
# Extended Schemas
# =========================================================

class CardDetailSchema(CardSchema):
    """
    Extended card schema with child relationships.
    """

    child_cards = fields.List(
        fields.Nested(CardSchema),
        dump_only=True
    )


class MeetingDetailSchema(MeetingSchema):
    """
    Extended meeting schema including extracted cards.
    """

    cards = fields.List(
        fields.Nested(CardSchema),
        dump_only=True
    )