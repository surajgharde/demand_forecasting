import { useState } from "react";
import type { AppPage } from "./types/app.types";
import { DemandForecasting } from "./pages/DemandForecasting";
import CreateForecast from "./pages/CreateForecast";
import { Simulation } from "./pages/Simulation";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";

function PlaceholderPage({ activePage, onNavigate }: { activePage: AppPage, onNavigate: (page: AppPage) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const titles: Record<string, string> = {
    dashboard: "Dashboard",
    inventory: "Inventory",
    simulation: "Simulation",
    analytics: "Analytics",
    aiAssistant: "AI Assistant"
  };
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Sidebar isOpen={isOpen} onClose={() => setIsOpen(false)} activePage={activePage} onNavigate={onNavigate} />
      <main className="min-h-screen lg:ml-[240px]">
        <Header title={titles[activePage as string] || "Coming Soon"} onMenuClick={() => setIsOpen(true)} showSearch={false} />
        <div className="p-8">
          <div className="rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-low px-6 py-10 text-center">
            <p className="text-sm font-semibold text-on-surface">Coming Soon</p>
            <p className="mt-1 text-sm text-on-surface-variant">
              This module is under development.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Standalone Demand Forecasting App
 *
 * This is a slim router that only handles the demand forecasting pages.
 * No auth, dashboard, inventory, procurement, logistics, or manufacturing.
 *
 * Pages:
 *  - demandForecasting  → Landing page with hero + feature cards
 *  - createForecast     → Full CSV upload + AI forecast wizard
 */
export default function App() {
  const [activePage, setActivePage] = useState<AppPage>("demandForecasting");

  const handleNavigate = (page: AppPage) => {
    setActivePage(page);
  };

  switch (activePage) {
    case "createForecast":
      return (
        <CreateForecast
          activePage={activePage}
          onNavigate={handleNavigate}
        />
      );

    case "demandForecasting":
      return (
        <DemandForecasting
          activePage={activePage}
          onNavigate={handleNavigate}
        />
      );

    case "simulation":
      return (
        <Simulation
          activePage={activePage}
          onNavigate={handleNavigate}
        />
      );

    default:
      return (
        <PlaceholderPage 
          activePage={activePage}
          onNavigate={handleNavigate}
        />
      );
  }
}
