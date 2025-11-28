"""
Configuration settings for AI Service
"""
import os
from typing import Optional
from dotenv import load_dotenv

# Load biến môi trường từ file .env
load_dotenv()


class Settings:
    """Application settings"""
    
    # Application
    APP_NAME: str = "AI Analytics Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8005"))
    
    # External Services URLs
    ORDER_SERVICE_URL: str = os.getenv("ORDER_SERVICE_URL", "http://localhost:8002")
    CATALOG_SERVICE_URL: str = os.getenv("CATALOG_SERVICE_URL", "http://localhost:8004")
    
    # Database (Analytics DB)
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "3306"))
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "12345678")
    DB_NAME: str = os.getenv("DB_NAME", "analytics_db")
    
    # Source databases for raw metrics
    ORDER_DB_URL: Optional[str] = os.getenv("ORDER_DB_URL")
    ORDER_DB_NAME: str = os.getenv("ORDER_DB_NAME", "order_db")
    CATALOG_DB_URL: Optional[str] = os.getenv("CATALOG_DB_URL")
    CATALOG_DB_NAME: str = os.getenv("CATALOG_DB_NAME", "catalog_db")
    
    # ML Model Settings
    MODEL_RETRAIN_FREQUENCY_DAYS: int = 7
    ANOMALY_THRESHOLD: float = 0.1
    MIN_TRAINING_SAMPLES: int = 30
    IFOREST_TRAINING_DAYS: int = int(os.getenv("IFOREST_TRAINING_DAYS", "180"))
    IFOREST_N_ESTIMATORS: int = int(os.getenv("IFOREST_N_ESTIMATORS", "200"))
    IFOREST_CONTAMINATION: float = float(os.getenv("IFOREST_CONTAMINATION", "0.1"))
    FORECAST_TRAINING_DAYS: int = int(os.getenv("FORECAST_TRAINING_DAYS", "120"))
    FORECAST_TARGET_METRIC: str = os.getenv("FORECAST_TARGET_METRIC", "order_count")
    FORECAST_ALGORITHM: str = os.getenv("FORECAST_ALGORITHM", "PROPHET")
    FORECAST_MODEL_VERSION: str = os.getenv("FORECAST_MODEL_VERSION", "v1.0")
    FORECAST_CREATED_BY: str = os.getenv("FORECAST_CREATED_BY", "scheduler")
    FORECAST_YEARLY_SEASONALITY: bool = os.getenv("FORECAST_YEARLY_SEASONALITY", "true").lower() == "true"
    FORECAST_WEEKLY_SEASONALITY: bool = os.getenv("FORECAST_WEEKLY_SEASONALITY", "true").lower() == "true"
    FORECAST_USE_REGRESSORS: bool = os.getenv("FORECAST_USE_REGRESSORS", "true").lower() == "true"
    FORECAST_SEASONALITY_MODE: str = os.getenv("FORECAST_SEASONALITY_MODE", "multiplicative")
    
    # Hyperparameter Tuning Settings
    ENABLE_HYPERPARAMETER_TUNING: bool = os.getenv("ENABLE_HYPERPARAMETER_TUNING", "true").lower() == "true"
    TUNING_N_TRIALS: int = int(os.getenv("TUNING_N_TRIALS", "20"))
    TUNING_TIMEOUT_SECONDS: Optional[int] = int(os.getenv("TUNING_TIMEOUT_SECONDS", "300")) if os.getenv("TUNING_TIMEOUT_SECONDS") else None
    TUNING_VALIDATION_RATIO: float = float(os.getenv("TUNING_VALIDATION_RATIO", "0.2"))
    MODEL_COMPARISON_THRESHOLD: float = float(os.getenv("MODEL_COMPARISON_THRESHOLD", "0.0"))  # % improvement required (0.0 = chỉ cần >=)
    
    # AI Provider Settings (OpenAI or Gemini)
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "openai")
    
    # OpenAI Settings
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    OPENAI_TEMPERATURE: float = float(os.getenv("OPENAI_TEMPERATURE", "0.3"))
    OPENAI_MAX_TOKENS: int = int(os.getenv("OPENAI_MAX_TOKENS", "1500"))
    
    # Email Settings (for report distribution)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "").strip().strip('"').strip("'")  # Remove quotes but keep spaces
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "")
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    
    # Report Distribution Settings
    MANAGER_EMAIL: str = os.getenv("MANAGER_EMAIL", "")  # Default manager email
    ENABLE_EMAIL_DISTRIBUTION: bool = os.getenv("ENABLE_EMAIL_DISTRIBUTION", "false").lower() == "true"
    
    # Feature List for ML Model
    FEATURE_LIST: list = [
        "total_revenue",
        "order_count",
        "avg_order_value",
        "customer_count",
        "repeat_customers",
        "new_customers",
        "unique_products_sold",
        "product_diversity_score",
        "peak_hour",
        "day_of_week",
        "is_weekend",
        "avg_preparation_time_seconds",
        "staff_efficiency_score",
        "avg_review_score",
        "material_cost",
        "waste_percentage",
        "low_stock_products",
        "out_of_stock_products"
    ]


settings = Settings()