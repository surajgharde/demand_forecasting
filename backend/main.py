"""
Demand Forecasting — Standalone API Entry Point
================================================
A slim FastAPI app that wires up only the demand forecasting routers.
No auth, inventory, procurement, logistics, or manufacturing.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import forecast, forecast_ai
from config import settings

app = FastAPI(
    title="Demand Forecasting API",
    version="1.0.0",
    description="Standalone AI-powered demand forecasting service powered by Facebook Prophet + Groq.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register only the forecast routers
app.include_router(forecast.router)
app.include_router(forecast_ai.router)


@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "healthy",
        "app": "Demand Forecasting API",
        "version": "1.0.0",
        "message": "Standalone Demand Forecasting Service is Online",
        "endpoints": [
            "POST /forecast/predict       — JSON-based Prophet prediction",
            "POST /forecast/upload        — CSV/Excel upload + full forecast",
            "POST /forecast/evaluate      — Model accuracy evaluation",
            "POST /data/summary           — Data quality summary",
            "POST /validate-data          — Pre-flight data validation",
            "POST /forecast-ai/explain    — Groq LLM demand narrative",
        ],
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "min_months_required": settings.min_months_for_analysis,
        "recommended_months": settings.min_months_for_seasonality,
        "optimal_months": settings.optimal_months,
        "max_forecast_horizon": settings.max_forecast_horizon,
        "supported_countries": ["IN", "US", "UK"],
    }
