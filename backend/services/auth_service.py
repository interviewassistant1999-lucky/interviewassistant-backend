"""Authentication service for user registration, login, and JWT management."""

from datetime import datetime, timedelta
from typing import Optional
import logging

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db.models import User, SubscriptionTier

logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthError(Exception):
    """Authentication error."""
    pass


class AuthService:
    """Service for authentication operations."""

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt."""
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token."""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)

        payload = {
            "sub": user_id,
            "exp": expire,
            "iat": datetime.utcnow(),
        }
        return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

    @staticmethod
    def decode_token(token: str) -> Optional[str]:
        """Decode and validate a JWT token. Returns user_id if valid."""
        try:
            payload = jwt.decode(
                token,
                settings.jwt_secret_key,
                algorithms=[settings.jwt_algorithm]
            )
            user_id: str = payload.get("sub")
            if user_id is None:
                return None
            return user_id
        except JWTError as e:
            logger.debug(f"JWT decode error: {e}")
            return None

    async def register_user(
        self,
        db: AsyncSession,
        email: str,
        password: str,
        name: str,
    ) -> User:
        """Register a new user with email and password."""
        # Check if email already exists
        result = await db.execute(select(User).where(User.email == email))
        existing_user = result.scalar_one_or_none()
        if existing_user:
            raise AuthError("Email already registered")

        # Validate password (minimum 8 characters for MVP)
        if len(password) < 8:
            raise AuthError("Password must be at least 8 characters")

        # Create user
        user = User(
            email=email,
            password_hash=self.hash_password(password),
            name=name,
            subscription_tier=SubscriptionTier.FREE,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)

        logger.info(f"New user registered: {email}")
        return user

    async def login_user(
        self,
        db: AsyncSession,
        email: str,
        password: str,
    ) -> tuple[User, str]:
        """Login a user and return user + JWT token."""
        # Find user by email
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            raise AuthError("Invalid email or password")

        if not user.password_hash:
            raise AuthError("Please use Google sign-in for this account")

        if not self.verify_password(password, user.password_hash):
            raise AuthError("Invalid email or password")

        # Create access token
        token = self.create_access_token(user.id)

        logger.info(f"User logged in: {email}")
        return user, token

    async def get_user_by_id(self, db: AsyncSession, user_id: str) -> Optional[User]:
        """Get a user by their ID."""
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_user_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        """Get a user by their email."""
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_or_create_google_user(
        self,
        db: AsyncSession,
        google_id: str,
        email: str,
        name: str,
    ) -> User:
        """Get or create a user from Google OAuth data."""
        # First try to find by google_id
        result = await db.execute(select(User).where(User.google_id == google_id))
        user = result.scalar_one_or_none()

        if user:
            return user

        # Try to find by email (user might have registered with email first)
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user:
            # Link Google account to existing user
            user.google_id = google_id
            if not user.name or user.name == email:
                user.name = name
            await db.flush()
            await db.refresh(user)
            logger.info(f"Linked Google account to existing user: {email}")
            return user

        # Create new user
        user = User(
            email=email,
            google_id=google_id,
            name=name,
            subscription_tier=SubscriptionTier.FREE,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)

        logger.info(f"New user registered via Google: {email}")
        return user


# Singleton instance
auth_service = AuthService()
