import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .utils.storage import init_db
from .api.routes import (
    health_router,
    currencies_router,
    rates_router,
    analysis_router,
    forecasting_router,
    evaluation_router
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("fx_insight")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database and ensure directories
    logger.info("Starting up FX Insight backend...")
    init_db()
    logger.info("SQLite database initialized successfully.")
    yield
    logger.info("Shutting down FX Insight backend...")

app = FastAPI(
    title="FX Insight — Multi-Currency Exchange Rate Forecasting and Comparative Time-Series Analysis Platform",
    description=(
        "Production-quality academic quantitative research backend for time-series forecasting "
        "and comparative analysis of foreign exchange rates across multiple currency pairs."
    ),
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for development and local network flexibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler to return clean structured JSON errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error handling {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalServerError",
            "message": str(exc),
            "path": str(request.url.path)
        }
    )

# Register API Routers under /api
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(currencies_router, prefix=settings.API_V1_STR)
app.include_router(rates_router, prefix=settings.API_V1_STR)
app.include_router(analysis_router, prefix=settings.API_V1_STR)
app.include_router(forecasting_router, prefix=settings.API_V1_STR)
app.include_router(evaluation_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)

