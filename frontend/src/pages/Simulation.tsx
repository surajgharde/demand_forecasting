import { useState, useEffect, useMemo } from "react";
import { Header } from "../components/layout/Header";
import { Sidebar } from "../components/layout/Sidebar";
import type { AppPage } from "../types/app.types";
import { getLatestForecastSnapshot, subscribeToForecastUpdates } from "../services/forecastStore";
import type { ForecastSnapshot } from "../types/forecast.types";

const fmtNumber = (val: number) => 
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(val);

export function Simulation({ activePage, onNavigate }: { activePage: AppPage; onNavigate: (page: AppPage) => void }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<ForecastSnapshot | null>(getLatestForecastSnapshot());

  useEffect(() => {
    return subscribeToForecastUpdates(() => {
      setSnapshot(getLatestForecastSnapshot());
    });
  }, []);

  // Simulation parameters states
  const [simDiscount, setSimDiscount] = useState(0);
  const [simPriceChange, setSimPriceChange] = useState(0);
  const [simMarketing, setSimMarketing] = useState(false);
  const [simCompetitor, setSimCompetitor] = useState(false);
  const [simWeather, setSimWeather] = useState<"neutral" | "favorable" | "unfavorable">("neutral");
  const [simFestival, setSimFestival] = useState(false);

  // Derived math for simulated demand
  const simulation = useMemo(() => {
    if (!snapshot || !snapshot.section) return { total: 0, lift: 0, pct: 0, multiplier: 1.0, comparisonPoints: [] };
    
    let multiplier = 1.0;
    
    // 1. Discount Elasticity (~1.5x)
    multiplier += (simDiscount / 100) * 1.5;
    
    // 2. Price Change Elasticity (Price up -> Demand down, Inverse 1.2x)
    multiplier -= (simPriceChange / 100) * 1.2;
    
    // 3. Marketing Campaign lift
    if (simMarketing) multiplier += 0.18;
    
    // 4. Competitor Entry drag
    if (simCompetitor) multiplier -= 0.15;
    
    // 5. Weather impact
    if (simWeather === "favorable") multiplier += 0.10;
    if (simWeather === "unfavorable") multiplier -= 0.10;
    
    // 6. Festival surge
    if (simFestival) multiplier += 0.35;

    const original = (snapshot.section.metrics && snapshot.section.metrics.totalForecast) || 0;
    const simulated = original * multiplier;
    const lift = simulated - original;
    const pct = (multiplier - 1) * 100;

    const forecastArr = (snapshot.section.smart && snapshot.section.smart.forecast) || [];
    const comparisonPoints = forecastArr.map(p => ({
      date: p.date,
      base: p.forecast,
      sim: p.forecast * multiplier
    }));

    return { total: simulated, lift, pct, multiplier, comparisonPoints };
  }, [simDiscount, simPriceChange, simMarketing, simCompetitor, simWeather, simFestival, snapshot]);

  // Handle resetting state back to default
  const handleReset = () => {
    setSimDiscount(0);
    setSimPriceChange(0);
    setSimMarketing(false);
    setSimCompetitor(false);
    setSimWeather("neutral");
    setSimFestival(false);
  };

  // Generate responsive coordinates for the custom SVG chart
  const CHART_WIDTH = 1000;
  const CHART_HEIGHT = 300;
  
  const chartData = useMemo(() => {
    if (!simulation.comparisonPoints.length) return null;
    
    const points = simulation.comparisonPoints;
    const values = [...points.map(p => p.base), ...points.map(p => p.sim)];
    const minValue = Math.max(0, Math.min(...values) * 0.9); // margin below min
    const maxValue = Math.max(...values, 1) * 1.1; // margin above max
    const range = maxValue - minValue;
    const totalPoints = points.length - 1 || 1;

    const toX = (index: number) => (index / totalPoints) * (CHART_WIDTH - 80) + 40;
    const toY = (val: number) => CHART_HEIGHT - ((val - minValue) / range) * (CHART_HEIGHT - 60) - 30;

    const baseCoords = points.map((p, i) => ({
      x: toX(i),
      y: toY(p.base),
      date: p.date,
      val: p.base
    }));

    const simCoords = points.map((p, i) => ({
      x: toX(i),
      y: toY(p.sim),
      date: p.date,
      val: p.sim
    }));

    return { baseCoords, simCoords, minValue, maxValue };
  }, [simulation.comparisonPoints]);

  // SVG drawing paths
  const baseLinePath = chartData
    ? chartData.baseCoords.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`).join(" ")
    : "";

  const simLinePath = chartData
    ? chartData.simCoords.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`).join(" ")
    : "";

  // Dynamic recommendations text
  const recommendations = useMemo(() => {
    const recs = [];
    if (simPriceChange > 10) {
      recs.push({
        type: "warning",
        text: "⚠️ A significant price increase may reduce demand by over 12%. Ensure this is offset by margins or run a marketing campaign to retain volume."
      });
    }
    if (simDiscount > 20) {
      recs.push({
        type: "info",
        text: "✨ A promotional discount will generate substantial demand lift. Please check with your warehouse and logistics teams to ensure safety stocks are adequate."
      });
    }
    if (simCompetitor && !simMarketing) {
      recs.push({
        type: "warning",
        text: "⚠️ Competitor entry will erode demand by approximately 15%. We strongly recommend activating marketing campaigns or price adjustments to retain market share."
      });
    }
    if (simWeather === "unfavorable") {
      recs.push({
        type: "info",
        text: "🌧️ Unfavorable weather is projected to drop demand by 10%. Review safety stocks to avoid excess holding costs."
      });
    }
    if (simFestival) {
      recs.push({
        type: "success",
        text: "🎉 Festival/Holiday peaks are estimated to boost sales by 35%. Verify distribution schedules and increase procurement immediately."
      });
    }
    if (recs.length === 0) {
      recs.push({
        type: "neutral",
        text: "💡 Adjust the scenario sliders and parameters on the left to model real-time business decisions and receive tailored recommendations."
      });
    }
    return recs;
  }, [simDiscount, simPriceChange, simMarketing, simCompetitor, simWeather, simFestival]);

  return (
    <div className="demand-page">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activePage={activePage}
        onNavigate={onNavigate}
      />

      <main className="demand-main">
        <Header
          title="🧪 Scenario Simulator"
          onMenuClick={() => setSidebarOpen(true)}
          showSearch={false}
        />

        <div className="demand-content">
          {!snapshot ? (
            <div 
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "60vh",
                textAlign: "center",
                padding: "48px 24px",
                background: "#ffffff",
                border: "1px border-dashed #cbd5e1",
                borderRadius: "16px",
                maxWidth: "640px",
                margin: "48px auto",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)"
              }}
            >
              <div style={{ fontSize: "5rem", marginBottom: "24px" }}>🧪</div>
              <h3 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>No Forecast Data Available</h3>
              <p style={{ color: "#64748b", fontSize: "1rem", lineHeight: "1.6", marginBottom: "32px", maxWidth: "440px" }}>
                To simulate demand scenarios, you must first generate a forecast using your sales data.
              </p>
              <button
                type="button"
                onClick={() => onNavigate("demandForecasting")}
                className="demand-cta"
                style={{ width: "auto", padding: "12px 32px", borderRadius: "30px", fontSize: "1.05rem" }}
              >
                🚀 Go to Forecasting Wizard
              </button>
            </div>
          ) : (
            <>
              {/* Forecast snapshot context details */}
              <div 
                style={{ 
                  display: "flex", 
                  flexWrap: "wrap", 
                  gap: "16px", 
                  alignItems: "center", 
                  justifyContent: "space-between", 
                  padding: "16px 24px", 
                  background: "#f8fafc", 
                  borderRadius: "12px", 
                  border: "1px solid #e2e8f0", 
                  marginBottom: "24px" 
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "0.9rem", color: "#475569" }}>
                  <div>
                    <span style={{ fontWeight: 600, color: "#1e293b" }}>Dataset Context:</span>{" "}
                    {snapshot.selectedCategory || "All Categories"}{" "}
                    {snapshot.selectedProductKey ? `(Product: ${snapshot.productOptions.find(p => p.key === snapshot.selectedProductKey)?.label || snapshot.selectedProductKey})` : ""}
                  </div>
                  <div style={{ width: "1px", height: "18px", background: "#cbd5e1" }}></div>
                  <div>
                    <span style={{ fontWeight: 600, color: "#1e293b" }}>Model Base:</span> {snapshot.section?.smart?.model?.name || "AI Engine"}
                  </div>
                  <div style={{ width: "1px", height: "18px", background: "#cbd5e1" }}></div>
                  <div>
                    <span style={{ fontWeight: 600, color: "#1e293b" }}>Confidence:</span> {snapshot.section?.smart?.summary?.confidence || "Medium"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate("demandForecasting")}
                  style={{
                    background: "transparent",
                    color: "#3b82f6",
                    border: "none",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  Change Dataset →
                </button>
              </div>

              {/* Main Split Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }} className="lg:grid-cols-12">
                
                {/* Left Side: Parameters Form */}
                <div style={{ gridColumn: "span 5" }}>
                  <div 
                    style={{ 
                      background: "#ffffff", 
                      borderRadius: "16px", 
                      border: "1px solid #e2e8f0", 
                      padding: "24px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                      <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>⚙️ Control Panel</h3>
                      <button
                        type="button"
                        onClick={handleReset}
                        style={{
                          fontSize: "0.8rem",
                          color: "#64748b",
                          background: "#f1f5f9",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "20px",
                          cursor: "pointer",
                          fontWeight: 600
                        }}
                      >
                        Reset Defaults
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      
                      {/* Price Change slider */}
                      <label className="config-field" style={{ padding: "16px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                          <span>Price Change (%)</span>
                          <strong style={{ color: simPriceChange >= 0 ? "#ef4444" : "#10b981" }}>
                            {simPriceChange >= 0 ? `+${simPriceChange}` : simPriceChange}%
                          </strong>
                        </div>
                        <input
                          type="range"
                          min="-50"
                          max="50"
                          value={simPriceChange}
                          onChange={(e) => setSimPriceChange(Number(e.target.value))}
                          style={{ width: "100%", cursor: "pointer" }}
                        />
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
                          <span>-50% (Lower Price)</span>
                          <span>+50% (Higher Price)</span>
                        </div>
                      </label>

                      {/* Discount slider */}
                      <label className="config-field" style={{ padding: "16px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                          <span>Discount (%)</span>
                          <strong style={{ color: "#3b82f6" }}>{simDiscount}%</strong>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="90"
                          value={simDiscount}
                          onChange={(e) => setSimDiscount(Number(e.target.value))}
                          style={{ width: "100%", cursor: "pointer" }}
                        />
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
                          <span>0% (No discount)</span>
                          <span>90% (Max discount)</span>
                        </div>
                      </label>

                      {/* Marketing Campaign selection */}
                      <label className="config-field" style={{ padding: "16px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "12px" }}>
                        <span>Promotional Campaign</span>
                        <select
                          value={simMarketing ? "yes" : "no"}
                          onChange={(e) => setSimMarketing(e.target.value === "yes")}
                          style={{ marginTop: "8px" }}
                        >
                          <option value="no">Standard Marketing (Baseline)</option>
                          <option value="yes">Aggressive Marketing Lift (+18% Demand)</option>
                        </select>
                      </label>

                      {/* Competitor Entry selection */}
                      <label className="config-field" style={{ padding: "16px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "12px" }}>
                        <span>Competitor Action</span>
                        <select
                          value={simCompetitor ? "yes" : "no"}
                          onChange={(e) => setSimCompetitor(e.target.value === "yes")}
                          style={{ marginTop: "8px" }}
                        >
                          <option value="no">Stable Competitor Outlook</option>
                          <option value="yes">New Competitor Market Entry (-15% Drag)</option>
                        </select>
                      </label>

                      {/* Weather Impact selection */}
                      <label className="config-field" style={{ padding: "16px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "12px" }}>
                        <span>Weather Impact</span>
                        <select
                          value={simWeather}
                          onChange={(e) => setSimWeather(e.target.value as any)}
                          style={{ marginTop: "8px" }}
                        >
                          <option value="neutral">Neutral Season Conditions</option>
                          <option value="favorable">Highly Favorable Forecast (+10% Boost)</option>
                          <option value="unfavorable">Unfavorable/Severe Weather (-10% Drag)</option>
                        </select>
                      </label>

                      {/* Festival/Holiday Checkbox */}
                      <div 
                        style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: "12px", 
                          padding: "16px", 
                          background: "#f8fafc", 
                          border: "1px solid #cbd5e1", 
                          borderRadius: "12px",
                          cursor: "pointer"
                        }}
                        onClick={() => setSimFestival(!simFestival)}
                      >
                        <input
                          type="checkbox"
                          checked={simFestival}
                          onChange={() => {}} // handled by click container
                          style={{ width: "20px", height: "20px", cursor: "pointer" }}
                        />
                        <div>
                          <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1e293b" }}>Holiday / Festival Surge</div>
                          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Model major festive demand (+35% Boost)</div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

                {/* Right Side: KPIs, Visual Chart, and Insights */}
                <div style={{ gridColumn: "span 7" }}>
                  
                  {/* KPI Impact Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                    
                    {/* Baseline */}
                    <div style={{ padding: "20px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", boxShadow: "0 2px 4px rgba(0, 0, 0, 0.02)" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Base Forecast</span>
                      <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#334155", margin: "6px 0" }}>
                        {fmtNumber(snapshot.section?.metrics?.totalForecast || 0)}
                      </div>
                      <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Original demand projection</span>
                    </div>

                    {/* Simulated Output */}
                    <div style={{ padding: "20px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "16px", boxShadow: "0 2px 4px rgba(3, 105, 161, 0.02)" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.05em" }}>Simulated Demand</span>
                      <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#0c4a6e", margin: "6px 0" }}>
                        {fmtNumber(simulation.total)}
                      </div>
                      <span style={{ fontSize: "0.8rem", color: "#0284c7" }}>Under current conditions</span>
                    </div>

                    {/* Net Lift */}
                    <div 
                      style={{ 
                        padding: "20px", 
                        background: simulation.pct >= 0 ? "#f0fdf4" : "#fef2f2", 
                        border: `1px solid ${simulation.pct >= 0 ? "#bbf7d0" : "#fecaca"}`, 
                        borderRadius: "16px", 
                        boxShadow: "0 2px 4px rgba(0,0,0,0.02)" 
                      }}
                    >
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: simulation.pct >= 0 ? "#15803d" : "#b91c1c", textTransform: "uppercase", letterSpacing: "0.05em" }}>Net Lift</span>
                      <div style={{ fontSize: "1.85rem", fontWeight: 800, color: simulation.pct >= 0 ? "#166534" : "#991b1b", margin: "6px 0" }}>
                        {simulation.pct >= 0 ? "+" : ""}{simulation.pct.toFixed(1)}%
                      </div>
                      <span style={{ fontSize: "0.8rem", color: simulation.pct >= 0 ? "#16a34a" : "#dc2626" }}>
                        {simulation.lift >= 0 ? `+${fmtNumber(simulation.lift)}` : fmtNumber(simulation.lift)} units
                      </span>
                    </div>

                  </div>

                  {/* SVG Chart Card */}
                  <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "24px", marginBottom: "24px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>📈 Demand Curves Comparison</h4>
                      
                      {/* Chart Legend */}
                      <div style={{ display: "flex", gap: "12px", fontSize: "0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ width: "12px", height: "3.2px", background: "#94a3b8", display: "inline-block" }}></span>
                          <span style={{ color: "#64748b", fontWeight: 500 }}>Base Forecast</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ width: "12px", height: "3.2px", background: "#f59e0b", display: "inline-block" }}></span>
                          <span style={{ color: "#f59e0b", fontWeight: 600 }}>Simulated</span>
                        </div>
                      </div>
                    </div>

                    {chartData && (
                      <div style={{ position: "relative" }}>
                        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} style={{ width: "100%", height: "260px" }}>
                          
                          {/* Horizontal Grid Lines */}
                          {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                            const y = 30 + (CHART_HEIGHT - 60) * pct;
                            const val = chartData.maxValue - (chartData.maxValue - chartData.minValue) * pct;
                            return (
                              <g key={`grid-${pct}`}>
                                <line x1="40" y1={y} x2={CHART_WIDTH - 40} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                                <text x="35" y={y + 4} fill="#94a3b8" fontSize="11" textAnchor="end">
                                  {val >= 1000 ? (val/1000).toFixed(1) + "k" : Math.round(val)}
                                </text>
                              </g>
                            );
                          })}

                          {/* Base Forecast Line (dashed grey) */}
                          <path d={baseLinePath} fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="6 4" strokeLinecap="round" />
                          
                          {/* Simulated Forecast Line (solid orange) */}
                          <path d={simLinePath} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />

                          {/* Data points markers (first, mid, last for readability) */}
                          {chartData.baseCoords.filter((_, idx, arr) => idx === 0 || idx === Math.floor(arr.length / 2) || idx === arr.length - 1).map((pt, i) => (
                            <g key={`marker-base-${i}`}>
                              <circle cx={pt.x} cy={pt.y} r="5" fill="#94a3b8" stroke="#ffffff" strokeWidth="1.5" />
                            </g>
                          ))}
                          {chartData.simCoords.filter((_, idx, arr) => idx === 0 || idx === Math.floor(arr.length / 2) || idx === arr.length - 1).map((pt, i) => (
                            <g key={`marker-sim-${i}`}>
                              <circle cx={pt.x} cy={pt.y} r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                            </g>
                          ))}

                        </svg>

                        {/* Dates indicator beneath chart */}
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 40px", color: "#94a3b8", fontSize: "0.75rem", marginTop: "-5px" }}>
                          {chartData.baseCoords.filter((_, i, arr) => i === 0 || i === Math.floor(arr.length / 2) || i === arr.length - 1).map((pt, i) => (
                            <div key={`lbl-${i}`}>
                              {new Date(pt.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Insights card */}
                  <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "24px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
                    <h4 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>💡 Simulation Insights</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {recommendations.map((rec, index) => {
                        let bg = "#f8fafc";
                        let border = "#e2e8f0";
                        let color = "#475569";
                        if (rec.type === "warning") {
                          bg = "#fffbeb";
                          border = "#fde68a";
                          color = "#78350f";
                        } else if (rec.type === "success") {
                          bg = "#f0fdf4";
                          border = "#bbf7d0";
                          color = "#166534";
                        } else if (rec.type === "info") {
                          bg = "#eff6ff";
                          border = "#bfdbfe";
                          color = "#1e40af";
                        }
                        return (
                          <div 
                            key={index} 
                            style={{ 
                              padding: "14px 18px", 
                              background: bg, 
                              border: `1px solid ${border}`, 
                              borderRadius: "10px", 
                              color: color,
                              fontSize: "0.9rem",
                              fontWeight: 500,
                              lineHeight: "1.5"
                            }}
                          >
                            {rec.text}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default Simulation;
