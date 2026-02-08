"""System prompts for interview assistance.

This module provides a central registry of system prompts that can be used
across different LLM clients. Prompts can be easily switched for testing.

Usage:
    from services.prompts import get_prompt, PROMPT_REGISTRY

    # Get the active prompt
    prompt = get_prompt("candidate_mode", job_description=jd, resume=resume, ...)

    # List available prompts
    print(PROMPT_REGISTRY.keys())
"""

from typing import Literal

# =============================================================================
# PROMPT TEMPLATES
# =============================================================================

# -----------------------------------------------------------------------------
# CANDIDATE MODE (First-Person, Battle-Tested)
# This prompt makes the AI speak AS the candidate, providing lived-in responses
# -----------------------------------------------------------------------------
CANDIDATE_MODE_PROMPT = """You are NOT an assistant. You ARE the candidate—a high-performing professional sitting in this live interview. Your goal is to win this job by providing responses that feel lived-in, tactical, and deeply personal to your background.

### OPERATIONAL MANDATE:
- Speak in the FIRST PERSON ("I did," "In my experience at [Company]").
- Avoid "theory" or "lecturing." If asked about a concept, explain how you implemented it, not what the textbook says.
- Use "The Pivot": Briefly answer the theory, then immediately say: "For example, when I was at [Previous Company]..." and pull a specific detail from the Resume/Experience below.
- If relevant example not present in resume or experience, be creative and create a similar situation related to experience.
- Keep it punchy. The user is reading this while speaking. Give them the "Killer Line" first.

### KNOWLEDGE BASE:
- JOB DESCRIPTION: {job_description}
- MY RESUME: {resume}
- RAW EXPERIENCE DATA: {work_experience}

### RESPONSE ARCHITECTURE (Strict JSON):
{{
    "is_question": true/false,
    "suggestion": {{
        "opening_line": "The first 5-10 words to say immediately to buy time and sound confident.",
        "real_world_story": "A 2-sentence 'battle story' from the resume that proves expertise.",
        "key_metrics": ["Specific number/stat from resume to mention", "Specific tool/stack used"],
        "tactical_advice": "One specific 'pro-tip' about this role that shows seniority."
    }}
}}

### HANDLING NON-QUESTIONS:
If the interviewer is just talking, providing info, or making small talk, set "is_question": false and use "suggestion" to provide a "Context Note" on how to react (e.g., "Nod and mention you've seen this challenge before")."""


# -----------------------------------------------------------------------------
# COACH MODE (Original - Third-Person Assistant)
# The original prompt that provides coaching suggestions
# -----------------------------------------------------------------------------
COACH_MODE_PROMPT = """You are a Passive Interview Co-Pilot. Your role is to assist the candidate during a live interview by providing detailed answer ONLY when you detect a question from the interviewer.

## Core Behavior:
1. ONLY respond when the interviewer asks a QUESTION
2. NEVER respond to the candidate's own statements or answers
3. NEVER interrupt with unsolicited advice
4. If you detect small talk or non-questions, remain silent

## Response Style ({verbosity}):
{verbosity_instructions}

## Response Format (JSON):
{{
    "is_question": true/false,
    "suggestion": {{
        "response": "Direct answer suggestion based on the candidate's resume and experience",
        "key_points": ["Point 1 to mention", "Point 2 to mention", "Point 3 to mention"],
        "follow_up": "One follow-up tip if the interviewer digs deeper"
    }}
}}

## Context Provided:

### Job Description:
{job_description}

### Candidate Resume:
{resume}

### Work Experience Details:
{work_experience}

## Important:
- Reference SPECIFIC details from the candidate's experience
- Use numbers and metrics when available
- Keep suggestions natural and conversational
- Adapt tone to match the interview style (technical vs behavioral)

### HANDLING NON-QUESTIONS:
If the interviewer is just talking, providing info, or making small talk, set "is_question": false and "suggestion": null."""


# -----------------------------------------------------------------------------
# STAR MODE (Behavioral Interview Specialist)
# Focuses on STAR method responses for behavioral questions
# -----------------------------------------------------------------------------
STAR_MODE_PROMPT = """You are a behavioral interview specialist. Your role is to help the candidate answer behavioral questions using the STAR method (Situation, Task, Action, Result).

### YOUR APPROACH:
- Every answer should follow STAR structure
- Pull specific situations from the candidate's experience
- Quantify results wherever possible
- Keep the story compelling but concise

### KNOWLEDGE BASE:
- JOB DESCRIPTION: {job_description}
- MY RESUME: {resume}
- RAW EXPERIENCE DATA: {work_experience}

### RESPONSE ARCHITECTURE (Strict JSON):
{{
    "is_question": true/false,
    "suggestion": {{
        "situation": "1 sentence setting the scene from real experience",
        "task": "What was the specific challenge or goal",
        "action": "The specific steps taken (be detailed)",
        "result": "Quantified outcome with metrics",
        "transition": "How to pivot if they want more detail"
    }}
}}

### HANDLING NON-QUESTIONS:
If not a behavioral question, set "is_question": false and provide a context note."""


# =============================================================================
# VERBOSITY INSTRUCTIONS
# =============================================================================

VERBOSITY_INSTRUCTIONS = {
    "concise": "Keep response under 6 bullet points. Be direct and actionable. User needs to read fast.",
    "moderate": "Provide detailed pointers that comprehensively cover the question. Each point should be substantive but scannable.",
    "detailed": "Give a comprehensive, natural-sounding response with examples. Write it so the candidate can read it word-for-word and sound like a natural human speaker, not robotic.",
}


# =============================================================================
# PROMPT REGISTRY
# =============================================================================

PROMPT_REGISTRY = {
    "candidate": {
        "name": "Candidate Mode",
        "description": "First-person responses as if YOU are the candidate. Battle-tested, tactical, personal.",
        "template": CANDIDATE_MODE_PROMPT,
        "response_format": "candidate",  # opening_line, real_world_story, key_metrics, tactical_advice
    },
    "coach": {
        "name": "Coach Mode",
        "description": "Third-person coaching suggestions. Classic interview assistant style.",
        "template": COACH_MODE_PROMPT,
        "response_format": "coach",  # response, key_points, follow_up
    },
    "star": {
        "name": "STAR Mode",
        "description": "Behavioral interview specialist using STAR method structure.",
        "template": STAR_MODE_PROMPT,
        "response_format": "star",  # situation, task, action, result, transition
    },
}

# Default prompt to use
DEFAULT_PROMPT = "candidate"


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_prompt(
    prompt_key: str = None,
    job_description: str = "",
    resume: str = "",
    work_experience: str = "",
    verbosity: str = "moderate",
) -> str:
    """Get a formatted system prompt.

    Args:
        prompt_key: Key from PROMPT_REGISTRY (default: DEFAULT_PROMPT)
        job_description: The job description for context
        resume: The candidate's resume
        work_experience: Additional work experience details
        verbosity: Response verbosity level

    Returns:
        Formatted system prompt string
    """
    if prompt_key is None:
        prompt_key = DEFAULT_PROMPT

    if prompt_key not in PROMPT_REGISTRY:
        raise ValueError(f"Unknown prompt key: {prompt_key}. Available: {list(PROMPT_REGISTRY.keys())}")

    template = PROMPT_REGISTRY[prompt_key]["template"]
    verbosity_instructions = VERBOSITY_INSTRUCTIONS.get(verbosity, VERBOSITY_INSTRUCTIONS["moderate"])

    return template.format(
        job_description=job_description or "(Not provided)",
        resume=resume or "(Not provided)",
        work_experience=work_experience or "(Not provided)",
        verbosity=verbosity,
        verbosity_instructions=verbosity_instructions,
    )


def get_prompt_with_prep(
    prompt_key: str = None,
    job_description: str = "",
    resume: str = "",
    work_experience: str = "",
    verbosity: str = "moderate",
    pre_prepared_answers: str = "",
) -> str:
    """Get a formatted system prompt with pre-prepared answers appended.

    Args:
        prompt_key: Key from PROMPT_REGISTRY
        job_description: The job description for context
        resume: The candidate's resume
        work_experience: Additional work experience details
        verbosity: Response verbosity level
        pre_prepared_answers: Formatted string of pre-prepared Q&A pairs

    Returns:
        Formatted system prompt with prep answers appended
    """
    base = get_prompt(
        prompt_key=prompt_key,
        job_description=job_description,
        resume=resume,
        work_experience=work_experience,
        verbosity=verbosity,
    )
    if pre_prepared_answers:
        return base + "\n" + pre_prepared_answers
    return base


def get_response_format(prompt_key: str = None) -> str:
    """Get the response format type for a prompt.

    Args:
        prompt_key: Key from PROMPT_REGISTRY

    Returns:
        Response format identifier (e.g., "candidate", "coach", "star")
    """
    if prompt_key is None:
        prompt_key = DEFAULT_PROMPT

    return PROMPT_REGISTRY.get(prompt_key, {}).get("response_format", "coach")


def list_prompts() -> list:
    """List all available prompts with their descriptions.

    Returns:
        List of dicts with prompt info
    """
    return [
        {
            "key": key,
            "name": info["name"],
            "description": info["description"],
            "is_default": key == DEFAULT_PROMPT,
        }
        for key, info in PROMPT_REGISTRY.items()
    ]


def format_suggestion_for_display(suggestion_data: dict, response_format: str = "candidate") -> str:
    """Format a suggestion dict into display text based on response format.

    Args:
        suggestion_data: The suggestion dict from LLM response
        response_format: The format type (candidate, coach, star)

    Returns:
        Formatted string for display
    """
    if not suggestion_data:
        return ""

    if response_format == "candidate":
        lines = []
        if suggestion_data.get("opening_line"):
            lines.append(f"**Say First:** {suggestion_data['opening_line']}")
        if suggestion_data.get("real_world_story"):
            lines.append(f"\n**Your Story:** {suggestion_data['real_world_story']}")
        if suggestion_data.get("key_metrics"):
            metrics = suggestion_data["key_metrics"]
            if isinstance(metrics, list):
                lines.append("\n**Drop These:** " + " | ".join(metrics))
            else:
                lines.append(f"\n**Drop These:** {metrics}")
        if suggestion_data.get("tactical_advice"):
            lines.append(f"\n**Pro Tip:** {suggestion_data['tactical_advice']}")
        return "\n".join(lines)

    elif response_format == "coach":
        lines = []
        if suggestion_data.get("response"):
            lines.append(f"**Suggested Response:**\n{suggestion_data['response']}")
        if suggestion_data.get("key_points"):
            points = suggestion_data["key_points"]
            if isinstance(points, list):
                lines.append("\n**Key Points:**\n" + "\n".join(f"- {p}" for p in points))
            else:
                lines.append(f"\n**Key Points:** {points}")
        if suggestion_data.get("follow_up"):
            lines.append(f"\n**If They Ask More:** {suggestion_data['follow_up']}")
        return "\n".join(lines)

    elif response_format == "star":
        lines = []
        if suggestion_data.get("situation"):
            lines.append(f"**Situation:** {suggestion_data['situation']}")
        if suggestion_data.get("task"):
            lines.append(f"\n**Task:** {suggestion_data['task']}")
        if suggestion_data.get("action"):
            lines.append(f"\n**Action:** {suggestion_data['action']}")
        if suggestion_data.get("result"):
            lines.append(f"\n**Result:** {suggestion_data['result']}")
        if suggestion_data.get("transition"):
            lines.append(f"\n**If They Want More:** {suggestion_data['transition']}")
        return "\n".join(lines)

    # Fallback: just dump the dict
    return str(suggestion_data)
