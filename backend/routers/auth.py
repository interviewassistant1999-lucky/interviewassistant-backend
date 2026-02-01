"""Authentication API routes."""

from typing import Optional
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import User
from services.auth_service import auth_service, AuthError
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# HTTP Bearer token security scheme
security = HTTPBearer(auto_error=False)


# Request/Response models
class SignupRequest(BaseModel):
    """Signup request body."""
    email: EmailStr
    password: str
    name: str


class LoginRequest(BaseModel):
    """Login request body."""
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    """Authentication response."""
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    """User info response."""
    id: str
    email: str
    name: str
    subscription_tier: str
    created_at: str


def user_to_dict(user: User) -> dict:
    """Convert User model to dictionary for response."""
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "subscription_tier": user.subscription_tier.value,
        "created_at": user.created_at.isoformat(),
    }


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Get current user from JWT token. Returns None if not authenticated."""
    if not credentials:
        return None

    user_id = auth_service.decode_token(credentials.credentials)
    if not user_id:
        return None

    user = await auth_service.get_user_by_id(db, user_id)
    return user


async def require_auth(
    user: Optional[User] = Depends(get_current_user),
) -> User:
    """Require authenticated user. Raises 401 if not authenticated."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


@router.post("/signup", response_model=AuthResponse)
async def signup(
    request: SignupRequest,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user with email and password."""
    try:
        user = await auth_service.register_user(
            db=db,
            email=request.email,
            password=request.password,
            name=request.name,
        )
        token = auth_service.create_access_token(user.id)

        return AuthResponse(
            access_token=token,
            user=user_to_dict(user),
        )
    except AuthError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Login with email and password."""
    try:
        user, token = await auth_service.login_user(
            db=db,
            email=request.email,
            password=request.password,
        )

        return AuthResponse(
            access_token=token,
            user=user_to_dict(user),
        )
    except AuthError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.post("/logout")
async def logout():
    """Logout the current user.

    Note: JWT tokens are stateless, so logout is handled client-side
    by removing the token. This endpoint exists for API completeness.
    """
    return {"message": "Logged out successfully"}


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(
    user: User = Depends(require_auth),
):
    """Refresh the JWT token."""
    token = auth_service.create_access_token(user.id)

    return AuthResponse(
        access_token=token,
        user=user_to_dict(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    user: User = Depends(require_auth),
):
    """Get current user information."""
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        subscription_tier=user.subscription_tier.value,
        created_at=user.created_at.isoformat(),
    )


# Google OAuth endpoints
@router.get("/google")
async def google_oauth_start(request: Request):
    """Start Google OAuth flow.

    Returns the Google OAuth URL to redirect the user to.
    """
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured",
        )

    # Build Google OAuth URL
    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.google_client_id}"
        f"&redirect_uri={settings.google_redirect_uri}"
        "&response_type=code"
        "&scope=email profile"
        "&access_type=offline"
        "&prompt=consent"
    )

    return {"url": google_auth_url}


class GoogleCallbackRequest(BaseModel):
    """Google OAuth callback request."""
    code: str


@router.post("/google/callback", response_model=AuthResponse)
async def google_oauth_callback(
    request: GoogleCallbackRequest,
    db: AsyncSession = Depends(get_db),
):
    """Handle Google OAuth callback.

    Exchanges the authorization code for tokens and creates/updates user.
    """
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured",
        )

    try:
        import httpx

        # Exchange code for tokens
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": request.code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "redirect_uri": settings.google_redirect_uri,
                    "grant_type": "authorization_code",
                },
            )

            if token_response.status_code != 200:
                logger.error(f"Google token exchange failed: {token_response.text}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to exchange authorization code",
                )

            tokens = token_response.json()
            access_token = tokens.get("access_token")

            # Get user info from Google
            userinfo_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )

            if userinfo_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to get user info from Google",
                )

            google_user = userinfo_response.json()

        # Get or create user
        user = await auth_service.get_or_create_google_user(
            db=db,
            google_id=google_user.get("id"),
            email=google_user.get("email"),
            name=google_user.get("name", google_user.get("email")),
        )

        # Create our JWT token
        token = auth_service.create_access_token(user.id)

        return AuthResponse(
            access_token=token,
            user=user_to_dict(user),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Google OAuth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OAuth authentication failed",
        )
