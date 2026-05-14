"""
Extraction Service

AI-powered operational intelligence extraction from meeting transcripts.

InternInsight focuses on:
- actionable tasks,
- ownership,
- blockers,
- decisions,
- ambiguity,
- missing context,
- and operational clarity for interns.
"""

import json
import logging
import os
from typing import Dict, List, Optional

import requests

from app.models import CardType

logger = logging.getLogger(__name__)


GEMINI_API_URL = (
    "https://generativelanguage.googleapis.com/"
    "v1beta/models/gemini-2.5-flash:generateContent"
)

class ExtractionService:
    """
    Extracts structured operational insights from meeting transcripts.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")

        if not self.api_key:
            raise ValueError(
                "Gemini API key is required. "
                "Set GEMINI_API_KEY environment variable."
            )

        logger.info("ExtractionService initialized")

    # =====================================================
    # Public Extraction Methods
    # =====================================================

    def extract_cards(
        self,
        transcript: str,
        agenda_items: Optional[List[str]],
        requested_types: List[CardType],
    ) -> List[Dict]:

        if not requested_types:
            requested_types = [
                CardType.TLDR,
                CardType.ACTION_ITEM,
                CardType.DECISION,
                CardType.BLOCKER,
                CardType.QUESTION,
                CardType.UNCERTAINTY,
            ]

        type_instructions = "\n".join(
            f"- {card_type.value}"
            for card_type in requested_types
        )

        agenda_section = (
            "\nAgenda Items:\n"
            + "\n".join(f"- {item}" for item in agenda_items)
            if agenda_items
            else ""
        )

        prompt = f"""
You are an AI assistant helping a software engineering intern understand
what actually matters after a fast-moving engineering meeting.

Your goal is NOT to summarize everything.

Your goal is to extract:
- operationally important actions,
- ownership,
- deadlines,
- blockers,
- decisions,
- missing context,
- unresolved ambiguity,
- and important follow-up questions.

Focus on:
- execution,
- accountability,
- uncertainty,
- dependencies,
- and risks.

You MUST ONLY return the following card types:
{type_instructions}

--------------------------------------------------
CARD TYPE DEFINITIONS
--------------------------------------------------

- tldr:
  High-level operational summary of the meeting.

- action_item:
  Concrete work someone needs to do.

- decision:
  Important decisions finalized during the meeting.

- blocker:
  Risks, delays, dependencies, or unresolved issues.

- question:
  Important unanswered questions or clarifications.

- follow_up:
  Items requiring future revisit or continuation.

- missing_context:
  References to unexplained systems, prior discussions,
  acronyms, dependencies, or historical context an intern
  would likely not understand.

- uncertainty:
  Ambiguous ownership, unclear timelines,
  tentative commitments, or unresolved scope.

--------------------------------------------------
OUTPUT FORMAT
--------------------------------------------------

Return ONLY a valid JSON array.

Each object MUST contain:

- type
- title
- content
- assigned_to
- confidence_score
- reasoning
- segment

OPTIONAL:
- due_date
- stakeholder
- tags

--------------------------------------------------
CONFIDENCE SCORING
--------------------------------------------------

Use confidence_score from 0.0 to 1.0.

Examples:
- 0.95 → explicit assignment
- 0.70 → likely implied
- 0.40 → uncertain inference

DO NOT pretend certainty where ambiguity exists.

--------------------------------------------------
TRANSCRIPT
--------------------------------------------------

\"\"\"{transcript}\"\"\"

{agenda_section}

Return ONLY raw JSON.
No markdown.
No explanations.
"""

        try:
            response_text = self._call_gemini(prompt)

            cards = self._parse_json_response(response_text)

            if not isinstance(cards, list):
                logger.error(
                    f"Expected list response, got {type(cards)}"
                )
                return []

            valid_cards = []

            for index, card in enumerate(cards):

                required_fields = [
                    "type",
                    "title",
                    "content"
                ]

                if not (
                    isinstance(card, dict)
                    and all(field in card for field in required_fields)
                ):
                    continue

                # Lightweight spatial positioning for frontend
                card["position_x"] = (index % 3) * 320
                card["position_y"] = (index // 3) * 220

                # Defaults
                card.setdefault("segment", "")
                card.setdefault("confidence_score", 0.5)
                card.setdefault("reasoning", "")
                card.setdefault("assigned_to", None)
                card.setdefault("stakeholder", None)
                card.setdefault("tags", [])

                valid_cards.append(card)

            logger.info(
                f"Successfully extracted {len(valid_cards)} cards"
            )

            return valid_cards

        except Exception as error:
            logger.error(f"Card extraction failed: {error}")
            return []

    def find_uncovered_agenda_items(
        self,
        agenda_items: List[str],
        transcript: str
    ) -> List[str]:

        if not agenda_items:
            return []

        prompt = f"""
Analyze this meeting transcript and determine which agenda items
were NOT discussed or resolved.

Agenda Items:
{json.dumps(agenda_items, indent=2)}

Transcript:
\"\"\"{transcript}\"\"\"

Return ONLY a JSON array containing uncovered agenda items.

If all items were covered, return:
[]
"""

        try:
            response_text = self._call_gemini(prompt)

            uncovered = self._parse_json_response(response_text)

            if not isinstance(uncovered, list):
                return []

            valid_uncovered = [
                item
                for item in uncovered
                if item in agenda_items
            ]

            return valid_uncovered

        except Exception as error:
            logger.error(
                f"Agenda coverage analysis failed: {error}"
            )
            return []

    def extract_segment_for_card(
        self,
        transcript: str,
        card_content: str
    ) -> Optional[str]:

        prompt = f"""
Find the exact transcript snippet most relevant
to the following operational insight.

Insight:
\"\"\"{card_content}\"\"\"

Transcript:
\"\"\"{transcript}\"\"\"

Return ONLY the raw transcript snippet.
No explanations.
"""

        try:
            response_text = self._call_gemini(prompt)

            segment = response_text.strip()

            return segment if segment else None

        except Exception as error:
            logger.error(
                f"Segment extraction failed: {error}"
            )
            return None

    # =====================================================
    # Gemini API Helpers
    # =====================================================

    def _call_gemini(self, prompt: str) -> str:

        url = f"{GEMINI_API_URL}?key={self.api_key}"

        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "topP": 0.8,
                "topK": 40,
                "maxOutputTokens": 8192,
            }
        }

        response = requests.post(
            url,
            json=payload,
            headers={
                "Content-Type": "application/json"
            },
            timeout=60
        )

        response.raise_for_status()

        result = response.json()

        try:
            return (
                result["candidates"][0]
                ["content"]["parts"][0]["text"]
            )

        except Exception:
            raise ValueError(
                "Unexpected Gemini API response format"
            )

    # =====================================================
    # JSON Cleanup Helpers
    # =====================================================

    def _parse_json_response(self, text: str):

        cleaned = text.strip()

        # Remove markdown code blocks
        if cleaned.startswith("```"):

            lines = cleaned.split("\n")

            lines = lines[1:]

            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]

            cleaned = "\n".join(lines)

        cleaned = cleaned.strip()

        # Find JSON start
        if not (
            cleaned.startswith("[")
            or cleaned.startswith("{")
        ):

            arr_start = cleaned.find("[")
            obj_start = cleaned.find("{")

            if (
                arr_start >= 0
                and (
                    obj_start < 0
                    or arr_start < obj_start
                )
            ):
                cleaned = cleaned[arr_start:]

            elif obj_start >= 0:
                cleaned = cleaned[obj_start:]

        # Trim extra trailing content
        if cleaned.startswith("["):

            bracket_count = 0

            for index, char in enumerate(cleaned):

                if char == "[":
                    bracket_count += 1

                elif char == "]":
                    bracket_count -= 1

                    if bracket_count == 0:
                        cleaned = cleaned[:index + 1]
                        break

        elif cleaned.startswith("{"):

            brace_count = 0

            for index, char in enumerate(cleaned):

                if char == "{":
                    brace_count += 1

                elif char == "}":
                    brace_count -= 1

                    if brace_count == 0:
                        cleaned = cleaned[:index + 1]
                        break

        return json.loads(cleaned)