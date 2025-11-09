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
    
    # Database
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "3306"))
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DB_NAME: str = os.getenv("DB_NAME", "analytics_db")
    
    # ML Model Settings
    MODEL_RETRAIN_FREQUENCY_DAYS: int = 7
    ANOMALY_THRESHOLD: float = 0.1
    MIN_TRAINING_SAMPLES: int = 30
    
    # OpenAI Settings
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    OPENAI_TEMPERATURE: float = float(os.getenv("OPENAI_TEMPERATURE", "0.3"))
    OPENAI_MAX_TOKENS: int = int(os.getenv("OPENAI_MAX_TOKENS", "1500"))
    
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