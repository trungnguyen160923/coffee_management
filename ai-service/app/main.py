"""
Main FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import analytics, ai_agent, reports, distribution, scheduler
from app.database import init_db
from app.services.scheduler_service import SchedulerService
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Initialize scheduler service (will be shared with router)
scheduler_service = SchedulerService()

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI Analytics Service for Coffee Management System"
)

# CORS middleware - DISABLED because API Gateway handles CORS
# All requests go through API Gateway, so we don't want duplicate CORS headers
# If you need direct access to ai-service, uncomment and configure appropriately
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # Configure appropriately for production
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# Include routers
app.include_router(analytics.router)
app.include_router(ai_agent.router)
app.include_router(reports.router)
app.include_router(distribution.router)
app.include_router(scheduler.router)


@app.on_event("startup")
async def startup_event():
    """Startup event handler"""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Order Service URL: {settings.ORDER_SERVICE_URL}")
    logger.info(f"Catalog Service URL: {settings.CATALOG_SERVICE_URL}")
    logger.info(f"AI Provider: {settings.AI_PROVIDER}")
    logger.info(f"OpenAI Base URL: {settings.OPENAI_BASE_URL}")
    logger.info(f"OpenAI Model: {settings.OPENAI_MODEL}")
    if settings.OPENAI_API_KEY:
        logger.info("OpenAI API Key: Configured")
    else:
        logger.warning("OpenAI API Key: Not configured")
    
    # Email distribution status
    if settings.ENABLE_EMAIL_DISTRIBUTION:
        logger.info("Email Distribution: Enabled")
        if settings.SMTP_USER and settings.MANAGER_EMAIL:
            logger.info(f"SMTP: {settings.SMTP_HOST}:{settings.SMTP_PORT}")
            logger.info(f"Manager Email: {settings.MANAGER_EMAIL}")
        else:
            logger.warning("Email Distribution enabled but SMTP credentials or manager email not configured")
    else:
        logger.info("Email Distribution: Disabled")
    
    # Initialize database
    try:
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        logger.warning("Application will continue without database features")
    
    # Start scheduler for automated reports
    try:
        scheduler_service.start()
        logger.info("Scheduler started successfully")
    except Exception as e:
        logger.error(f"Error starting scheduler: {e}")
        logger.warning("Application will continue without scheduled jobs")


@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event handler"""
    logger.info("Shutting down AI Analytics Service")
    # Stop scheduler
    try:
        scheduler_service.stop()
        logger.info("Scheduler stopped")
    except Exception as e:
        logger.error(f"Error stopping scheduler: {e}")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint (for monitoring and CI/CD)"""
    return {"status": "healthy", "service": "AI Analytics Service"}

