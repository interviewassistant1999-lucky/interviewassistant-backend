"""FastAPI application entry point."""

import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import websocket

# Configure logging to show all INFO+ messages
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
    stream=sys.stdout,
    force=True,
)

# Set specific loggers to INFO level
logging.getLogger("services.gemini_client").setLevel(logging.INFO)
logging.getLogger("routers.websocket").setLevel(logging.INFO)

logger = logging.getLogger(__name__)
logger.info("===== Interview Assistant Backend Starting =====")

app = FastAPI(
    title="Interview Assistant API",
    description="Real-time interview coaching backend",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(websocket.router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "1.0.0"}
