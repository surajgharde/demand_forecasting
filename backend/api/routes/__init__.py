"""
Demand Forecasting API — Route exports.
Only forecast-related routes are registered in this standalone app.
"""
from api.routes import forecast, forecast_ai

__all__ = ["forecast", "forecast_ai"]
