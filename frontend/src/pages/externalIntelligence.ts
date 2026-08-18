/**
 * externalIntelligence.ts
 *
 * External Intelligence Layer for Demand Forecasting.
 * Provides weather and trend signals to enhance forecast explainability.
 * This is a stub implementation since the original was not fully retrieved.
 */

export async function generateInsights(
  productName: string,
  category: string,
  forecastDates: string[]
): Promise<string[]> {
  const insights: string[] = [];

  const lowerProduct = productName.toLowerCase();
  
  if (lowerProduct.includes('umbrella') || lowerProduct.includes('rain')) {
    insights.push("High correlation with precipitation patterns expected.");
  } else if (lowerProduct.includes('winter') || lowerProduct.includes('heater') || lowerProduct.includes('jacket')) {
    insights.push("Demand highly sensitive to temperature drops in winter months.");
  } else if (lowerProduct.includes('summer') || lowerProduct.includes('ac') || lowerProduct.includes('cooler')) {
    insights.push("Demand surges during peak summer temperatures.");
  } else {
    insights.push("Stable baseline demand expected based on category trends.");
  }

  // Add a generic social trend insight
  if (['electronics', 'mobile', 'fashion'].includes(category.toLowerCase())) {
    insights.push("Strong social media momentum identified for this category.");
  }

  return insights;
}
