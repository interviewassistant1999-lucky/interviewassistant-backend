"""Interview preparation REST API endpoints.

Provides:
- POST /api/interview-prep/parse-resume - File upload, returns extracted text
- POST /api/interview-prep/fetch-questions - Query MongoDB, return scored/grouped questions
- POST /api/interview-prep/generate-answers - Generate answers using user's API key
- POST /api/interview-prep/approve-answers - Save to PostgreSQL, return prompt_injection text
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import ApprovedAnswer, UserAPIKey, LLMProvider, User
from routers.auth import require_auth
from services.encryption import decrypt_api_key
from services.mongodb_service import fetch_likely_questions
from services.resume_parser import parse_resume
from services.answer_generator import generate_answers_batch
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/interview-prep", tags=["interview-prep"])


# --- Request/Response Models ---

class FetchQuestionsRequest(BaseModel):
    company_name: str = ""
    jd_text: str = ""
    round_type: str = ""
    limit: int = 6


class GenerateAnswersRequest(BaseModel):
    questions: List[Dict[str, Any]]
    resume_text: str = ""
    jd_text: str = ""
    work_experience: str = ""
    company_name: str = ""
    round_type: str = ""
    provider: str = "groq"


class ApproveAnswerItem(BaseModel):
    question_id: Optional[str] = None
    question_text: str
    answer_data: Dict[str, Any]


class ApproveAnswersRequest(BaseModel):
    answers: List[ApproveAnswerItem]
    company_name: str = ""
    round_type: str = ""
    session_id: Optional[str] = None


# --- Helper ---

async def _get_user_api_key(user_id: str, provider: str, db: AsyncSession) -> Optional[str]:
    """Get user's decrypted API key for a provider."""
    provider_map = {
        "adaptive": LLMProvider.GROQ,
        "groq": LLMProvider.GROQ,
        "openai": LLMProvider.OPENAI,
        "gemini": LLMProvider.GEMINI,
    }
    llm_provider = provider_map.get(provider.lower())
    if not llm_provider:
        return None

    result = await db.execute(
        select(UserAPIKey)
        .where(UserAPIKey.user_id == user_id)
        .where(UserAPIKey.provider == llm_provider)
    )
    key_record = result.scalar_one_or_none()
    if key_record and settings.encryption_key:
        return decrypt_api_key(key_record.encrypted_key)
    return None


def _build_prompt_injection(answers: List[Dict[str, Any]]) -> str:
    """Format approved Q&A pairs into a system prompt section.

    Args:
        answers: List of approved answer dicts

    Returns:
        Formatted string to append to system prompt
    """
    if not answers:
        return ""

    lines = [
        "\n\n---",
        "## PRE-PREPARED ANSWERS REFERENCE",
        "The candidate has prepared the following answers. When these questions or similar ones come up,",
        "use these as the PRIMARY source for your response. You may adapt the wording but MUST use",
        "the same examples, metrics, and talking points:\n",
    ]

    for i, answer in enumerate(answers, 1):
        q_text = answer.get("question_text", "")
        data = answer.get("answer_data", {})

        lines.append(f"### Q{i}: {q_text}")

        if data.get("core_message"):
            lines.append(f"**Core Message:** {data['core_message']}")
        if data.get("example_reference"):
            lines.append(f"**Example:** {data['example_reference']}")
        if data.get("impact_metrics"):
            lines.append(f"**Metrics:** {data['impact_metrics']}")
        if data.get("talking_points"):
            points = data["talking_points"]
            if isinstance(points, list):
                lines.append("**Talking Points:**")
                for pt in points:
                    lines.append(f"  - {pt}")
        lines.append("")

    lines.append("---")
    return "\n".join(lines)


# --- Endpoints ---

@router.post("/parse-resume")
async def parse_resume_endpoint(
    file: UploadFile = File(...),
    user: User = Depends(require_auth),
):
    """Upload and parse a resume file (PDF or DOCX).

    Max file size: 5MB.
    """
    # Validate file size (5MB)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")

    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    try:
        text = parse_resume(content, file.filename)
        return {"text": text, "filename": file.filename, "size": len(content)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/fetch-questions")
async def fetch_questions_endpoint(
    request: FetchQuestionsRequest,
    user: User = Depends(require_auth),
):
    """Fetch likely interview questions from MongoDB."""
    questions = await fetch_likely_questions(
        company_name=request.company_name,
        jd_text=request.jd_text,
        round_type=request.round_type,
        limit=request.limit,
    )
    return questions


@router.post("/generate-answers")
async def generate_answers_endpoint(
    request: GenerateAnswersRequest,
    user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Generate answers for interview questions using user's API key."""
    # Get user's API key for the provider
    api_key = await _get_user_api_key(user.id, request.provider, db)
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail=f"No API key found for {request.provider}. Please add your API key in Settings.",
        )

    results = await generate_answers_batch(
        questions=request.questions,
        resume_text=request.resume_text,
        jd_text=request.jd_text,
        work_experience=request.work_experience,
        company_name=request.company_name,
        round_type=request.round_type,
        provider=request.provider,
        api_key=api_key,
    )

    return {"answers": results}


@router.post("/approve-answers")
async def approve_answers_endpoint(
    request: ApproveAnswersRequest,
    user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Save approved answers to PostgreSQL and return prompt injection text."""
    saved_answers = []

    for item in request.answers:
        approved = ApprovedAnswer(
            user_id=user.id,
            session_id=request.session_id,
            question_id=item.question_id,
            question_text=item.question_text,
            company_name=request.company_name,
            round_type=request.round_type,
            answer_data=item.answer_data,
            is_approved=True,
        )
        db.add(approved)
        saved_answers.append({
            "question_text": item.question_text,
            "answer_data": item.answer_data,
        })

    await db.flush()

    # Build prompt injection text
    prompt_injection = _build_prompt_injection(saved_answers)

    logger.info(f"[PREP] Approved {len(saved_answers)} answers for user {user.id}")

    return {
        "approved_count": len(saved_answers),
        "prompt_injection": prompt_injection,
    }
