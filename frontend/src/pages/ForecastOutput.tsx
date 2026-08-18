/**
 * ForecastOutput.tsx
 *
 * Drop-in replacement for the `forecastRequested` section in CreateForecast.tsx.
 *
 * HOW TO USE:
 *  1. Copy this file into your project alongside CreateForecast.tsx.
 *  2. In CreateForecast.tsx, replace the entire block:
 *       {forecastRequested && ( ... )}
 *     with:
 *       {forecastRequested && overallForecastSection && (
 *         <ForecastOutput
 *           section={overallForecastSection}
 *           forecastLevel={forecastLevel}
 *           productCategoryOptions={productCategoryOptions}
 *           productOptions={productOptions}
 *           selectedCategory={selectedCategory}
 *           selectedProductKey={selectedProductKey}
 *           onCategoryChange={(v) => { setSelectedCategory(v); setSelectedProductKey(""); }}
 *           onProductChange={setSelectedProductKey}
 *           locationFieldConfig={locationFieldConfig}
 *           locationOptionsByField={locationOptionsByField}
 *           locationSelections={locationSelections}
 *           onLocationChange={updateLocationSelection}
 *         />
 *       )}
 *  3. Add the import at the top of CreateForecast.tsx:
 *       import { ForecastOutput } from "./ForecastOutput";
 *
 * WHAT CHANGED (display only — zero logic changes):
 *  - Summary KPI cards (total, avg daily, min, max)
 *  - Badge row (trend / confidence / demand type / model)
 *  - Simple forecast table with festival annotations
 *  - Product / Location drill-down selectors (existing logic, improved layout)
 */

import { useEffect, useMemo, useState } from "react";
import type { ForecastSection } from "./forecastEngine";
import type { ForecastLevel, LocationField, ProductOption } from "../types/forecast.types";

interface ForecastOutputProps {
  section: ForecastSection;
  forecastLevel: ForecastLevel;
  productCategoryOptions: string[];
  productOptions: ProductOption[];
  selectedCategory: string;
  selectedProductKey: string;
  onCategoryChange: (v: string) => void;
  onProductChange: (v: string) => void;
  locationFieldConfig: LocationField[];
  locationOptionsByField: Record<string, string[]>;
  locationSelections: Record<string, string>;
  onLocationChange: (fieldKey: string, value: string) => void;
  insightHighlights?: string[];
}

const fmtNumber = (val: number) => 
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(val);

interface ForecastChartProps {
  historical: { date: string; value: number }[];
  forecast: {
    date: string;
    forecast: number;
    lowerBound: number;
    upperBound: number;
  }[];
  trend: "increasing" | "decreasing" | "stable";
  confidence: "High" | "Medium" | "Low";
  category: string;
  modelName: string;
}

const CHART_WIDTH = 1000;
const CHART_HEIGHT = 260;

const formatDateLabel = (value: string) => {
  try {
    const date = new Date(value);
    return date.toLocaleString("en-US", { month: "short", year: "numeric" });
  } catch {
    return value;
  }
};

const ForecastTimelineChart = ({
  historical,
  forecast,
  trend,
  confidence,
  category,
  modelName,
}: ForecastChartProps) => {

  const points = useMemo(() => {
    const combined = [...historical, ...forecast];
    if (!combined.length) return null;

    const values = [
      ...historical.map((row) => row.value),
      ...forecast.map((row) => row.forecast),
      ...forecast.map((row) => row.lowerBound),
      ...forecast.map((row) => row.upperBound),
    ].filter(v => v !== undefined && !isNaN(v));
    
    const minValue = Math.min(0, ...values);
    const maxValue = Math.max(...values, 1);
    const valueRange = maxValue - minValue;

    const totalPoints = combined.length - 1 || 1;

    const toY = (value: number) =>
      CHART_HEIGHT - ((value - minValue) / valueRange) * (CHART_HEIGHT - 60) - 30; // padding top/bottom

    const toX = (index: number) => (index / totalPoints) * (CHART_WIDTH - 60) + 30; // padding left/right

    const historyPoints = historical.map((row, index) => ({
      x: toX(index),
      y: toY(row.value),
      label: row.date,
      value: row.value,
    }));

    const forecastPoints = forecast.map((row, index) => ({
      x: toX(historyPoints.length + index),
      y: toY(row.forecast),
      p10: toY(row.lowerBound),
      p90: toY(row.upperBound),
      label: row.date,
    }));

    return { historyPoints, forecastPoints, minValue, maxValue };
  }, [historical, forecast]);

  if (!points || points.historyPoints.length === 0 || points.forecastPoints.length === 0) {
    return null;
  }

  const { historyPoints, forecastPoints } = points;

  const historyPath = historyPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  const forecastPath = forecastPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  const areaSegments = [
    ...forecastPoints.map((point) => ({ x: point.x, y: point.p90 })),
    ...forecastPoints.slice().reverse().map((point) => ({ x: point.x, y: point.p10 })),
  ];

  const areaPath = areaSegments
    .map((segment, index) => `${index === 0 ? "M" : "L"} ${segment.x.toFixed(2)} ${segment.y.toFixed(2)}`)
    .concat(["Z"])
    .join(" ");

  const lastHistoryPoint = historyPoints[historyPoints.length - 1];
  const firstForecastPoint = forecastPoints[0];

  return (
    <>
      <div className="forecast-chart" style={{ width: "100%", marginTop: 24, background: "#f8fafc", padding: "16px 0", borderRadius: 8, position: "relative" }}>
        
        {/* Title and Legend HTML overlay */}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 30px", marginBottom: 12 }}>
          <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
            📊 Demand Forecast: {category || "Products"}
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: "0.75rem", color: "#475569", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="24" height="10"><path d="M0,5 L24,5" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4"/><circle cx="12" cy="5" r="3" fill="#3b82f6"/></svg>
              AI Forecast
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="24" height="10"><path d="M0,5 L24,5" stroke="#10b981" strokeWidth="2"/><circle cx="12" cy="5" r="3" fill="#10b981"/></svg>
              Historical Sales
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 24, height: 10, background: "#dbeafe" }}></div>
              Confidence Interval
            </div>
          </div>
        </div>

        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} style={{ width: "100%", height: 320 }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(pct => {
            const y = 30 + (CHART_HEIGHT - 60) * pct;
            const val = points.maxValue - (points.maxValue - points.minValue) * pct;
            return (
              <g key={`grid-y-${pct}`}>
                <line x1="30" y1={y} x2={CHART_WIDTH - 30} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                <text x="25" y={y + 4} fill="#94a3b8" fontSize="10" textAnchor="end">{val >= 1000 ? (val/1000).toFixed(1) + 'k' : Math.round(val)}</text>
              </g>
            );
          })}
          
          {areaSegments.length > 2 && (
            <path d={areaPath} fill="#eff6ff" stroke="none" />
          )}
          
          <path d={historyPath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
          {historyPoints.map((pt, i) => <circle key={i} cx={pt.x} cy={pt.y} r="4" fill="#10b981" stroke="#fff" strokeWidth="1.5" />)}
          
          <path d={forecastPath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 4" />
          {forecastPoints.map((pt, i) => <polygon key={`f-${i}`} points={`${pt.x},${pt.y-4} ${pt.x+4},${pt.y} ${pt.x},${pt.y+4} ${pt.x-4},${pt.y}`} fill="#3b82f6" stroke="#fff" strokeWidth="1" />)}

          {lastHistoryPoint && firstForecastPoint && (
            <line x1={lastHistoryPoint.x} y1={lastHistoryPoint.y} x2={firstForecastPoint.x} y2={firstForecastPoint.y} stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />
          )}
        </svg>

        {/* X Axis labels HTML overlay */}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 30px", marginTop: "-10px", color: "#64748b", fontSize: "0.75rem" }}>
          {historyPoints.filter((_, i) => i % Math.max(1, Math.floor(historyPoints.length/5)) === 0).map((pt, i) => (
            <div key={i} style={{ position: "absolute", left: `${(pt.x / CHART_WIDTH) * 100}%`, transform: "translateX(-50%)" }}>
              {new Date(pt.label).toLocaleDateString(undefined, {month: "short", year: "numeric", day: "numeric"})}
            </div>
          ))}
          {forecastPoints.filter((_, i) => i % Math.max(1, Math.floor(forecastPoints.length/3)) === 0).map((pt, i) => (
            <div key={`fx-${i}`} style={{ position: "absolute", left: `${(pt.x / CHART_WIDTH) * 100}%`, transform: "translateX(-50%)" }}>
              {new Date(pt.label).toLocaleDateString(undefined, {month: "short", year: "numeric", day: "numeric"})}
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", width: "100%", color: "#475569", fontSize: "0.85rem", marginTop: 24, fontWeight: "bold" }}>
          Date ({modelName})
        </div>
      </div>
    </>
  );
};

export default function ForecastOutput({
  section,
  forecastLevel,
  productCategoryOptions,
  productOptions,
  selectedCategory,
  selectedProductKey,
  onCategoryChange,
  onProductChange,
  locationFieldConfig,
  locationOptionsByField,
  locationSelections,
  onLocationChange,
  insightHighlights = [],
}: ForecastOutputProps) {
  if (!section) {
    return (
      <div className="forecast-output-empty">
        <div style={{ textAlign: 'center', padding: '100px 20px', color: '#64748b' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📊</div>
          <h3>No Forecast Data Generated</h3>
          <p>Please go to <strong>Forecast Configuration</strong> and click <strong>Generate Forecast</strong> to view intelligence.</p>
        </div>
      </div>
    );
  }

  const smart = section.smart;
  const metrics = section.metrics || { totalForecast: 0, avgDailyForecast: 0, minForecast: 0, maxForecast: 0 };
  const kpis = [
    { label: "Total Units", value: fmtNumber(metrics.totalForecast), icon: "📊" },
    { label: "Daily Avg", value: fmtNumber(metrics.avgDailyForecast), icon: "📈" },
    { label: "Lowest Day", value: fmtNumber(metrics.minForecast), icon: "📉" },
    { label: "Highest Day", value: fmtNumber(metrics.maxForecast), icon: "📈" },
  ];

  const [tablePage, setTablePage] = useState(1);
  const [isExplaining, setIsExplaining] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiModelUsed, setAiModelUsed] = useState<string | null>(null);
  const [externalContext, setExternalContext] = useState<string[]>([]);



  const fetchAiExplanation = async () => {
    setIsExplaining(true);
    setAiError(null);
    try {
      const histMean = section.smart.historical.reduce((a, b) => a + b.value, 0) / (section.smart.historical.length || 1);
      const histStdDev = section.smart.historical.length ? Math.sqrt(section.smart.historical.reduce((sq, val) => sq + Math.pow(val.value - histMean, 2), 0) / section.smart.historical.length) : 0;
      
      const configuredLocation = Object.values(locationSelections || {}).filter(Boolean).join(", ") || "India";
      
      // Fetch external Twitter + Weather insights dynamically
      const { generateInsights } = await import("./externalIntelligence");
      const productName = productOptions.find(p => p.key === selectedProductKey)?.label || selectedCategory || "Products";
      const dates = section.smart.forecast.map(f => f.date);
      const extInsights = await generateInsights(productName, selectedCategory || "retail", dates);
      setExternalContext(extInsights);

      const payload = {
        externalContext: extInsights.join(" | "),
        demandType: section.smart.summary.demandType,
        trend: section.smart.summary.trend,
        confidence: section.smart.summary.confidence,
        forecastTotal: section.metrics.totalForecast,
        avgDailyDemand: section.metrics.avgDailyForecast,
        minForecast: section.metrics.minForecast,
        maxForecast: section.metrics.maxForecast,
        dataPointsUsed: section.smart.historical.length,
        appliedFestivalDays: section.smart.forecast.filter(f => f.festivalName).length,
        modelName: section.smart.model.name,
        historicalMean: histMean,
        historicalStdDev: histStdDev,
        historicalMin: (section.smart.historical && section.smart.historical.length > 0) ? Math.min(...section.smart.historical.map(h => h.value)) : 0,
        historicalMax: (section.smart.historical && section.smart.historical.length > 0) ? Math.max(...section.smart.historical.map(h => h.value)) : 0,
        forecastDurationDays: section.smart.forecast.length,
        recentHistory: section.smart.historical.slice(-30).map(h => h.value),
        location: configuredLocation,
        targetCategory: selectedCategory,
        targetProduct: productOptions.find(p => p.key === selectedProductKey)?.label || ""
      };

      const res = await fetch((import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000") + "/forecast-ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status === "success" || data.status === "fallback") {
        setAiExplanation(data.analysis);
        setAiModelUsed(data.model);
      } else {
        setAiError(data.error || "Failed to generate AI analysis.");
      }
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsExplaining(false);
    }
  };
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(section.table.length / pageSize));
  const tableRows = useMemo(() => {
    const start = (tablePage - 1) * pageSize;
    return section.table.slice(start, start + pageSize);
  }, [section.table, tablePage]);

  useEffect(() => {
    setTablePage(1);
  }, [section.table.length]);

  useEffect(() => {
    // Automatically load AI insights when the forecast finishes
    if (!aiExplanation && !isExplaining) {
      fetchAiExplanation();
    }
  }, [aiExplanation, isExplaining]);

  useEffect(() => {
    if (tablePage > totalPages) {
      setTablePage(totalPages);
    }
  }, [tablePage, totalPages]);

  const festivalSet = new Set(
    (smart.forecast || []).filter((point) => point.festivalName).map((point) => point.date)
  );

  const minForecastValue = useMemo(
    () => (section.table && section.table.length > 0) ? Math.min(...section.table.map((point) => point.forecast)) : 0,
    [section.table]
  );

  const maxForecastValue = useMemo(
    () => (section.table && section.table.length > 0) ? Math.max(...section.table.map((point) => point.forecast)) : 0,
    [section.table]
  );

  return (
    <>
      <section className="forecast-section overall-forecast-output" style={{ marginTop: 20 }}>
        <div className="forecast-section-header">
          <div>
            <h3>Demand Forecast & Insights</h3>
            <p className="forecast-section-subtitle">
              Prophet-based mathematical forecast and generative narrative.
            </p>
          </div>
        </div>

        <div className="insights-container" style={{ marginBottom: 20 }}>
          {isExplaining && <p style={{ color: "#6b7280", fontStyle: "italic" }}>Analyzing forecast data and generating AI insights...</p>}
          {aiError && <p style={{ color: "#ef4444" }}>{aiError}</p>}
          {aiExplanation && (
            <div className="insights-summary ai-generated-content" style={{ 
              padding: "20px 24px", 
              background: "#eef2ff", 
              borderLeft: "6px solid #3b82f6", 
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              color: "#334155"
            }}>
              <div style={{ fontSize: "1.05rem", color: "#0ea5e9", marginBottom: 12, fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>✨</span> AI Insight: {productOptions.find(p => p.key === selectedProductKey)?.label || selectedCategory || "Overall Demand"}
              </div>
              <div 
                style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, color: "#334155", fontSize: "1rem" }} 
                dangerouslySetInnerHTML={{ 
                  __html: (aiExplanation || "")
                    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1e293b; font-weight: 700;">$1</strong>')
                    .replace(/^# (.*$)/gm, '<h3 style="color: #0f172a; margin: 16px 0 8px 0;">$1</h3>')
                    .replace(/^## (.*$)/gm, '<h4 style="color: #0f172a; margin: 12px 0 6px 0;">$1</h4>')
                    .replace(/^\s*• (.*$)/gm, '<div style="margin-left: 12px; margin-bottom: 4px;">• $1</div>')
                }} 
              />
              {externalContext.length > 0 && (
                <div style={{ marginTop: 24, fontSize: "0.85rem", color: "#475569", fontWeight: "bold", borderTop: "1px solid #cbd5e1", paddingTop: 12 }}>
                  Context: {externalContext.join(" | ")}
                </div>
              )}
            </div>
          )}
        </div>

        <ForecastTimelineChart
          historical={section.smart.historical}
          forecast={section.smart.forecast}
          trend={section.smart.summary.trend}
          confidence={section.smart.summary.confidence}
          category={selectedCategory || "Overall Market"}
          modelName={section.smart.model.name}
        />

        <div className="forecast-kpi-card-grid">
          {kpis.map((kpi) => (
            <article className="forecast-kpi-card" key={kpi.label}>
              <span className="forecast-kpi-icon" aria-hidden="true">
                {kpi.icon}
              </span>
              <span className="forecast-kpi-label">{kpi.label}</span>
              <strong className="forecast-kpi-value">{kpi.value}</strong>
            </article>
          ))}
        </div>

        <div className="forecast-badge-row">
          <span className={`forecast-badge forecast-badge-demand ${smart.summary.demandType.toLowerCase()}`}>
            {smart.summary.demandType} Demand
          </span>
          <span className={`forecast-badge forecast-badge-trend ${smart.summary.trend}`}>
            {smart.summary.trend} Trend
          </span>
          <span className={`forecast-badge forecast-badge-confidence ${smart.summary.confidence.toLowerCase()}`}>
            {smart.summary.confidence} Confidence
          </span>
        </div>

        <p className="mapping-helper" style={{ marginTop: 8 }}>
          <strong>Model: {section.smart.model.name}</strong>
          <br />
          {section.smart.model.reason}
        </p>

        <div className="forecast-output-table" style={{ marginTop: 12 }}>
          <div className="forecast-table-row forecast-table-header">
            <span className="forecast-table-cell forecast-table-date">Date</span>
            <span className="forecast-table-cell forecast-table-number">Forecast</span>
            <span className="forecast-table-cell forecast-table-number">Lower Bound</span>
            <span className="forecast-table-cell forecast-table-number">Upper Bound</span>
          </div>
          {tableRows.map((row, index) => {
            const isLowest = row.forecast === minForecastValue;
            const isHighest = row.forecast === maxForecastValue;
            return (
              <div
                className={`forecast-table-row ${index % 2 === 0 ? "even" : "odd"} ${
                  isLowest ? "row-lowest" : ""
                } ${isHighest ? "row-highest" : ""}`}
                key={row.date + index}
              >
                <span className="forecast-table-cell forecast-table-date">{row.date || "N/A"}</span>
                <span className="forecast-table-cell forecast-table-number forecast-value">
                  {fmtNumber(row.forecast)}
                </span>
                <span className="forecast-table-cell forecast-table-number forecast-muted">
                  {fmtNumber(row.lowerBound)}
                </span>
                <span className="forecast-table-cell forecast-table-number">
                  {fmtNumber(row.upperBound)}
                  {festivalSet.has(row.date) && (
                    <span style={{ marginLeft: 6, color: "#92400e", fontSize: 0.75 }}>
                      ★ Festival
                    </span>
                  )}
                </span>
              </div>
            );
          })}
          <div className="forecast-table-pagination">
            <button
              type="button"
              className="pagination-button"
              onClick={() => setTablePage((prev) => Math.max(1, prev - 1))}
              disabled={tablePage === 1}
            >
              ← Previous
            </button>
            <span className="forecast-pagination-label">
              Page {tablePage} of {totalPages}
            </span>
            <button
              type="button"
              className="pagination-button"
              onClick={() => setTablePage((prev) => Math.min(totalPages, prev + 1))}
              disabled={tablePage === totalPages}
            >
              Next →
            </button>
          </div>
        </div>
      </section>

      {(forecastLevel === "product" || forecastLevel === "combined") && (
        <div className="forecast-flow-panel" style={{ marginTop: 18 }}>
          <label className="config-field" style={{ padding: "16px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "12px", boxShadow: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)" }}>
            <span>Category</span>
            <select
              value={selectedCategory}
              onChange={(event) => onCategoryChange(event.target.value)}
            >
              <option value="">All categories</option>
              {productCategoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="config-field" style={{ padding: "16px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "12px", boxShadow: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)" }}>
            <span>Product</span>
            <select
              value={selectedProductKey}
              onChange={(event) => onProductChange(event.target.value)}
            >
              <option value="">
                {selectedCategory ? `All ${selectedCategory} Products` : "All Products"}
              </option>
              {productOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {(forecastLevel === "location" || forecastLevel === "combined") && (
        <div className="forecast-flow-panel" style={{ marginTop: 18 }}>
          {locationFieldConfig.length ? (
            locationFieldConfig.map((field) => (
              <label className="config-field" style={{ padding: "16px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "12px", boxShadow: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)" }} key={field.key}>
                <span>
                  {field.label}
                  <small className="mapping-helper" style={{ fontSize: "0.8rem", marginLeft: 4 }}>
                    Column: {field.column}
                  </small>
                </span>
                <select
                  value={locationSelections[field.key] ?? ""}
                  onChange={(event) => onLocationChange(field.key, event.target.value)}
                >
                  <option value="">All {field.label}</option>
                  {(locationOptionsByField[field.key] ?? []).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            ))
            ) : (
              <p className="mapping-helper">
                No location columns detected yet. Add country/state/city/store data to unlock this view.
              </p>
            )}
          </div>
        )}


    </>
  );
}
