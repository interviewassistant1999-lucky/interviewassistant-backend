"""MongoDB service for interview question bank.

Provides:
- Motor async client singleton (init at startup, close at shutdown)
- fetch_likely_questions() with scoring and grouping
- Graceful fallback when MongoDB is unavailable
"""

import logging
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from config import settings

logger = logging.getLogger(__name__)

# Global motor client singleton
_mongo_client = None
_mongo_db = None


async def init_mongodb() -> None:
    """Initialize MongoDB connection at startup."""
    global _mongo_client, _mongo_db

    if not settings.mongodb_uri:
        logger.info("[MONGODB] No MONGODB_URI configured - question bank disabled")
        return

    try:
        import motor.motor_asyncio

        _mongo_client = motor.motor_asyncio.AsyncIOMotorClient(
            settings.mongodb_uri,
            serverSelectionTimeoutMS=5000,
        )
        _mongo_db = _mongo_client[settings.mongodb_db_name]

        # Test connection
        await _mongo_client.admin.command("ping")
        logger.info(f"[MONGODB] Connected to {settings.mongodb_db_name}")
    except Exception as e:
        logger.warning(f"[MONGODB] Failed to connect: {e} - question bank disabled")
        _mongo_client = None
        _mongo_db = None


async def close_mongodb() -> None:
    """Close MongoDB connection at shutdown."""
    global _mongo_client, _mongo_db

    if _mongo_client:
        _mongo_client.close()
        logger.info("[MONGODB] Connection closed")
        _mongo_client = None
        _mongo_db = None


def get_db():
    """Get the MongoDB database instance."""
    return _mongo_db


def _extract_keywords(text: str) -> set:
    """Extract keywords from text for matching."""
    if not text:
        return set()
    # Lowercase, split on non-alpha, filter short words
    words = re.findall(r"[a-z]+", text.lower())
    stop_words = {
        "the", "a", "an", "is", "are", "was", "were", "be", "been",
        "being", "have", "has", "had", "do", "does", "did", "will",
        "would", "could", "should", "may", "might", "shall", "can",
        "to", "of", "in", "for", "on", "with", "at", "by", "from",
        "and", "or", "but", "not", "no", "if", "then", "else",
        "this", "that", "these", "those", "it", "its", "we", "our",
        "you", "your", "they", "their", "he", "she", "him", "her",
    }
    return {w for w in words if len(w) > 2 and w not in stop_words}


def _infer_role_from_jd(jd_text: str) -> Optional[str]:
    """Infer role type from job description text."""
    jd_lower = jd_text.lower()
    role_patterns = {
        "software_engineer": ["software engineer", "swe", "developer", "programmer", "backend", "frontend", "fullstack", "full-stack"],
        "data_scientist": ["data scientist", "machine learning", "ml engineer", "data analyst"],
        "product_manager": ["product manager", "pm", "product owner"],
        "devops": ["devops", "sre", "site reliability", "infrastructure", "platform engineer"],
        "designer": ["designer", "ux", "ui", "product design"],
    }
    for role, patterns in role_patterns.items():
        for pattern in patterns:
            if pattern in jd_lower:
                return role
    return None


def _score_question(
    question: dict,
    company_name: str,
    jd_text: str,
    round_type: str,
    jd_keywords: set,
    inferred_role: Optional[str],
) -> int:
    """Score a question based on relevance.

    Scoring:
    - Company match: +10
    - Round match: +5
    - Role match: +3
    - Tag/keyword overlap: +1 each
    - Recent (<90 days): +2
    - Verified count: +1 each (capped at 5)
    """
    score = 0

    # Company match
    q_company = (question.get("company_name") or "").lower()
    if company_name and q_company == company_name.lower():
        score += 10

    # Round match
    q_round = (question.get("interview_round") or "").lower()
    if round_type and q_round == round_type.lower():
        score += 5

    # Role match
    q_role = (question.get("role") or "").lower()
    if inferred_role and q_role == inferred_role.lower():
        score += 3

    # Tag/keyword overlap
    q_tags = set(t.lower() for t in (question.get("tags") or []))
    overlap = jd_keywords & q_tags
    score += len(overlap)

    # Recency bonus
    last_seen = question.get("last_seen")
    if last_seen and isinstance(last_seen, datetime):
        if datetime.utcnow() - last_seen < timedelta(days=90):
            score += 2

    # Verified count bonus
    verified = question.get("verified_count", 0)
    score += min(verified, 5)

    return score


async def fetch_likely_questions(
    company_name: str = "",
    jd_text: str = "",
    round_type: str = "",
    limit: int = 6,
) -> Dict[str, List[dict]]:
    """Fetch and score likely interview questions.

    Uses broad query with client-side scoring and tier grouping.

    Args:
        company_name: Target company name
        jd_text: Job description text for keyword matching
        round_type: Interview round type
        limit: Maximum total questions to return

    Returns:
        Dict with tiers: {"must_ask": [...], "high_probability": [...], "stretch": [...]}
    """
    if not _mongo_db:
        logger.info("[MONGODB] Not connected - returning empty questions")
        return {"must_ask": [], "high_probability": [], "stretch": []}

    try:
        collection = _mongo_db["questions"]
        jd_keywords = _extract_keywords(jd_text)
        inferred_role = _infer_role_from_jd(jd_text)

        # Build broad query - company OR round type OR general
        or_conditions: List[dict] = []
        if company_name:
            or_conditions.append({"company_name": {"$regex": company_name, "$options": "i"}})
        if round_type:
            or_conditions.append({"interview_round": {"$regex": round_type, "$options": "i"}})
        # Always include general questions as fallback
        or_conditions.append({"company_name": "General"})

        query = {"$or": or_conditions} if or_conditions else {}

        # Fetch broad set of candidates
        cursor = collection.find(query).limit(50)
        questions = await cursor.to_list(length=50)

        if not questions:
            # Fallback: get any questions
            cursor = collection.find({}).limit(limit)
            questions = await cursor.to_list(length=limit)

        # Score each question
        scored = []
        for q in questions:
            score = _score_question(q, company_name, jd_text, round_type, jd_keywords, inferred_role)
            scored.append((score, q))

        # Sort by score descending
        scored.sort(key=lambda x: x[0], reverse=True)

        # Take top N
        top = scored[:limit]
        if not top:
            return {"must_ask": [], "high_probability": [], "stretch": []}

        # Group into tiers
        # Must-Ask: top 20%, High Probability: next 50%, Stretch: rest
        n = len(top)
        must_ask_count = max(1, n // 5)
        high_prob_count = max(1, n // 2)

        must_ask = []
        high_probability = []
        stretch = []

        for i, (score, q) in enumerate(top):
            # Serialize for JSON
            q_data = {
                "id": str(q.get("_id", "")),
                "question_text": q.get("question_text", ""),
                "company_name": q.get("company_name", ""),
                "interview_round": q.get("interview_round", ""),
                "role": q.get("role", ""),
                "tags": q.get("tags", []),
                "difficulty": q.get("difficulty", "medium"),
                "verified_count": q.get("verified_count", 0),
                "score": score,
            }
            if i < must_ask_count:
                q_data["tier"] = "must_ask"
                must_ask.append(q_data)
            elif i < must_ask_count + high_prob_count:
                q_data["tier"] = "high_probability"
                high_probability.append(q_data)
            else:
                q_data["tier"] = "stretch"
                stretch.append(q_data)

        logger.info(
            f"[MONGODB] Questions fetched: {len(must_ask)} must-ask, "
            f"{len(high_probability)} high-prob, {len(stretch)} stretch "
            f"(company={company_name}, round={round_type})"
        )

        return {
            "must_ask": must_ask,
            "high_probability": high_probability,
            "stretch": stretch,
        }

    except Exception as e:
        logger.error(f"[MONGODB] Error fetching questions: {e}")
        return {"must_ask": [], "high_probability": [], "stretch": []}
