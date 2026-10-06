import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PLACES, type Place, crowdScore, level } from "@/lib/jaipur-data";
import {
  Users,
  AlertTriangle,
  Radio,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Send,
  ArrowLeft,
  Search,
  Activity,
  Compass,
  MapPin,
  Clock,
  Eye,
  BellRing
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Musafir Admin — Jaipur Crowd Command Center" },
      { name: "description", content: "Real-time crowd intelligence, visitor capacity management, and emergency broadcast dispatch for Jaipur tourism authority." },
    ],
  }),
  component: AdminDashboard,
});

interface SiteState extends Place {
  liveScore: number;
  capacityLimit: number;
  sensorStatus: "online" | "degraded" | "offline";
  overrideActive: boolean;
}

interface IncidentReport {
  id: string;
  placeName: string;
  type: "congestion" | "queue" | "parking" | "weather";
  reporter: string;
  time: string;
  description: string;
  verified: boolean;
}

const INITIAL_HOURLY_DATA = [
  { hour: "8 AM", actual: 3200, capacity: 8000, forecast: 3100 },
  { hour: "10 AM", actual: 6900, capacity: 8000, forecast: 6500 },
  { hour: "12 PM", actual: 9800, capacity: 10000, forecast: 9200 },
  { hour: "2 PM", actual: 8400, capacity: 10000, forecast: 8900 },
  { hour: "4 PM", actual: 11200, capacity: 10000, forecast: 10500 },
  { hour: "6 PM", actual: 12400, capacity: 10000, forecast: 11800 },
  { hour: "8 PM", actual: 6100, capacity: 7000, forecast: 6300 },
];

const ZONE_DATA = [
  { name: "Walled City (Hawa, Bapu)", value: 42, color: "#d94f30" },
  { name: "Amer Fort Zone", value: 31, color: "#e88b2e" },
  { name: "Central Heritage (Albert)", value: 16, color: "#2e8b57" },
  { name: "Outer Arts (Patrika, Sanganer)", value: 11, color: "#d4af37" },
];

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "sites" | "incidents" | "broadcast">("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [activeBroadcast, setActiveBroadcast] = useState<string | null>(
    "Traffic advisory: Suraj Pol Amber Fort shuttle rerouting active. Diverting visitors to Jaigarh & Panna Meena Kund."
  );
  const [broadcastStatus, setBroadcastStatus] = useState<string | null>(null);

  // Initialize site state with initial calculated scores
  const [sites, setSites] = useState<SiteState[]>(() => {
    return PLACES.map((p) => {
      const calc = crowdScore(p, { day: "Sun", hour: 17, festival: false, weather: "clear" });
      return {
        ...p,
        liveScore: calc.score,
        capacityLimit: p.gem ? 350 : 2500,
        sensorStatus: p.id === "nahargarh" ? "degraded" : "online",
        overrideActive: false,
      };
    });
  });

  const [incidents, setIncidents] = useState<IncidentReport[]>([
    {
      id: "INC-101",
      placeName: "Amber Fort",
      type: "queue",
      reporter: "Jaipur Police Unit 4",
      time: "4 mins ago",
      description: "Suraj Pol entrance bottleneck: ~45 min wait time. Requesting gate surge throttle.",
      verified: true,
    },
    {
      id: "INC-102",
      placeName: "Hawa Mahal",
      type: "congestion",
      reporter: "Rooftop Watcher (Sophie)",
      time: "14 mins ago",
      description: "Tour bus cluster on Badi Chaupar blocking pedestrian crossing.",
      verified: false,
    },
    {
      id: "INC-103",
      placeName: "Bapu Bazaar",
      type: "parking",
      reporter: "Smart Parking Sensor 12",
      time: "28 mins ago",
      description: "Sanganeri Gate 2-wheeler bay is at 98% occupancy.",
      verified: true,
    },
  ]);

  // Adjust score via admin controls
  const handleScoreAdjust = (id: string, delta: number) => {
    setSites((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const newScore = Math.max(5, Math.min(99, s.liveScore + delta));
          return { ...s, liveScore: newScore, overrideActive: true };
        }
        return s;
      })
    );
  };

  const handleToggleGate = (id: string) => {
    setSites((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const newScore = s.liveScore >= 80 ? 45 : 85;
          return { ...s, liveScore: newScore, overrideActive: !s.overrideActive };
        }
        return s;
      })
    );
  };

  const handleVerifyIncident = (incId: string) => {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === incId ? { ...inc, verified: !inc.verified } : inc))
    );
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMsg.trim()) return;
    setActiveBroadcast(broadcastMsg);
    setBroadcastStatus("Broadcast sent to all 14,800 active Musafir mobile users!");
    setBroadcastMsg("");
    setTimeout(() => setBroadcastStatus(null), 4000);
  };

  // High-level metrics
  const totalSites = sites.length;
  const criticalSites = sites.filter((s) => level(s.liveScore) === "Critical" || level(s.liveScore) === "High").length;
  const avgCrowd = Math.round(sites.reduce((acc, s) => acc + s.liveScore, 0) / sites.length);
  const activeGems = sites.filter((s) => s.gem).length;

  const filteredSites = sites.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.hindi.includes(searchQuery);
    const lvl = level(s.liveScore);
    const matchesLevel = filterLevel === "all" || lvl.toLowerCase() === filterLevel.toLowerCase();
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-neutral-800 bg-neutral-900/90 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800/80 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-neutral-400" />
            Back to Public App
          </Link>
          <div className="h-4 w-px bg-neutral-800 hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-xl tracking-tight text-amber-500">मुसाफ़िर Command</span>
              <span className="bg-red-500/20 border border-red-500/40 text-red-400 px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Live Ops
              </span>
            </div>
            <p className="text-xs text-neutral-400">Jaipur Smart Tourism & Crowd Dispersal Authority</p>
          </div>
        </div>

        {/* Global Action Nav */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1 text-xs text-neutral-400 mr-2">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-ping" />
            <span>Telemetry: 38/40 LoRaWAN Beacons Online</span>
          </div>
          <button
            onClick={() => setActiveBroadcast(null)}
            className="text-xs px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 transition"
          >
            Clear Banner
          </button>
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-medium text-amber-300">
            Jaipur Central Time: 17:45 IST
          </div>
        </div>
      </header>

      {/* Active City Broadcast Alert Banner */}
      {activeBroadcast && (
        <div className="bg-gradient-to-r from-amber-950/80 via-red-950/80 to-amber-950/80 border-b border-amber-500/40 px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm text-amber-200">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <BellRing className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
            <span className="font-semibold text-white uppercase tracking-wider text-[11px] bg-red-600/80 px-1.5 py-0.5 rounded">
              Active Push Alert:
            </span>
            <span className="truncate">{activeBroadcast}</span>
          </div>
          <button
            onClick={() => setActiveBroadcast(null)}
            className="text-neutral-400 hover:text-white text-xs ml-3 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-neutral-800 bg-neutral-900/50 px-4 lg:px-8">
        <div className="flex space-x-1 sm:space-x-4">
          {[
            { id: "overview", label: "Overview & Telemetry", icon: Activity },
            { id: "sites", label: "Site Capacity & Overrides", icon: Sliders },
            { id: "incidents", label: "Community & Police Pulse", icon: ShieldAlert },
            { id: "broadcast", label: "City Broadcast Dispatch", icon: Send },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition ${
                  active
                    ? "border-amber-500 text-amber-400 font-semibold"
                    : "border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs uppercase font-medium tracking-wider">Est. Live Visitors</span>
              <Users className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl lg:text-3xl font-bold font-mono text-white">14,820</span>
              <span className="text-xs text-emerald-400 ml-2 font-medium">↑ 8% vs yesterday</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">Aggregated sensor & app telemetry</p>
          </div>

          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs uppercase font-medium tracking-wider">Avg City Congestion</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline">
              <span className="text-2xl lg:text-3xl font-bold font-mono text-amber-400">{avgCrowd}%</span>
              <span className="text-xs text-neutral-400 ml-2 font-medium">Moderate</span>
            </div>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all"
                style={{ width: `${avgCrowd}%` }}
              />
            </div>
          </div>

          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs uppercase font-medium tracking-wider">Congested Sites</span>
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl lg:text-3xl font-bold font-mono text-red-400">{criticalSites}</span>
              <span className="text-xs text-neutral-400 ml-2">of {totalSites} monuments</span>
            </div>
            <p className="text-[11px] text-red-400/80 mt-1">Amber Fort, Hawa Mahal, Bapu Bazaar</p>
          </div>

          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs uppercase font-medium tracking-wider">Dispersal Alternatives</span>
              <Compass className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl lg:text-3xl font-bold font-mono text-emerald-400">{activeGems} Gems</span>
              <span className="text-xs text-emerald-300 ml-2">absorbing 2,400+ pax</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">Panna Meena, Jaigarh, Albert Hall</p>
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Footfall Trend Area Chart */}
              <div className="lg:col-span-2 bg-neutral-900/80 border border-neutral-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-neutral-100 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-amber-500" />
                      Jaipur Hourly Visitor Flow vs. Safe Capacity
                    </h3>
                    <p className="text-xs text-neutral-400">Live counts vs AI predictive forecast across all 16 monuments</p>
                  </div>
                  <span className="text-xs font-mono bg-neutral-800 border border-neutral-700 px-2 py-1 rounded text-neutral-300">
                    Real-time (Sunday)
                  </span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={INITIAL_HOURLY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#d94f30" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#d94f30" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#d4af37" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#d4af37" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="hour" stroke="#737373" fontSize={11} tickLine={false} />
                      <YAxis stroke="#737373" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#171717", borderColor: "#404040", borderRadius: "8px", fontSize: "12px" }}
                        itemStyle={{ color: "#f5f5f5" }}
                      />
                      <Area type="monotone" dataKey="actual" name="Actual Footfall" stroke="#d94f30" strokeWidth={2.5} fillOpacity={1} fill="url(#actualGrad)" />
                      <Area type="monotone" dataKey="forecast" name="AI Forecast" stroke="#d4af37" strokeDasharray="4 4" strokeWidth={2} fillOpacity={1} fill="url(#forecastGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Zone Distribution Doughnut */}
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-neutral-100 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    City Zone Distribution
                  </h3>
                  <p className="text-xs text-neutral-400">Share of current active tourists</p>
                </div>
                <div className="h-48 w-full my-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ZONE_DATA}
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {ZONE_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#171717", borderColor: "#404040", borderRadius: "8px", fontSize: "12px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 text-xs">
                  {ZONE_DATA.map((z) => (
                    <div key={z.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-neutral-300">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: z.color }} />
                        {z.name}
                      </span>
                      <span className="font-mono font-bold text-neutral-100">{z.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Critical Attention Panel */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-neutral-100 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-400" />
                    Congestion Threshold Watchlist
                  </h3>
                  <p className="text-xs text-neutral-400">Places currently at High or Critical crowd capacity</p>
                </div>
                <button
                  onClick={() => setActiveTab("sites")}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium underline"
                >
                  Manage all {sites.length} sites →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {sites
                  .filter((s) => level(s.liveScore) === "High" || level(s.liveScore) === "Critical")
                  .map((place) => (
                    <div
                      key={place.id}
                      className="border border-red-900/50 bg-red-950/20 rounded-lg p-3.5 flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-sm text-white">{place.name}</div>
                          <div className="text-xs text-neutral-400">{place.hindi}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                          {level(place.liveScore)} ({place.liveScore})
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 mt-2 bg-neutral-900/60 p-2 rounded border border-neutral-800/80 italic">
                        "{place.update}"
                      </p>
                      <div className="mt-3 pt-3 border-t border-red-900/30 flex items-center justify-between">
                        <span className="text-[11px] text-neutral-400">Peak: {place.peak}</span>
                        <button
                          onClick={() => handleScoreAdjust(place.id, -15)}
                          className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition"
                        >
                          Trigger Dispersal
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SITES CAPACITY & OVERRIDES */}
        {activeTab === "sites" && (
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg text-neutral-100">Live Monument Capacity & Throttle Controller</h3>
                <p className="text-xs text-neutral-400">
                  Override crowd metrics, activate entry throttles, and push automated detour suggestions to tourists.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search monument..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 w-44 sm:w-56"
                  />
                </div>
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="py-1.5 px-2.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Levels</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="moderate">Moderate</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {/* Sites Table */}
            <div className="overflow-x-auto border border-neutral-800 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-800">
                  <tr>
                    <th className="py-3 px-4 font-medium">Monument</th>
                    <th className="py-3 px-4 font-medium">Category</th>
                    <th className="py-3 px-4 font-medium">Live Congestion</th>
                    <th className="py-3 px-4 font-medium">Best Hours</th>
                    <th className="py-3 px-4 font-medium">Telemetry</th>
                    <th className="py-3 px-4 font-medium text-right">Crowd Manual Overrides</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {filteredSites.map((place) => {
                    const lvl = level(place.liveScore);
                    const badgeColor =
                      lvl === "Critical"
                        ? "bg-red-500/20 text-red-400 border-red-500/40"
                        : lvl === "High"
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                        : lvl === "Moderate"
                        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
                        : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";

                    return (
                      <tr key={place.id} className="hover:bg-neutral-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-neutral-100 flex items-center gap-1.5">
                            {place.name}
                            {place.gem && (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/30">
                                Gem
                              </span>
                            )}
                            {place.overrideActive && (
                              <span className="text-[10px] bg-sky-500/20 text-sky-400 px-1 py-0.2 rounded">
                                Override
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-neutral-400">{place.hindi}</div>
                        </td>
                        <td className="py-3 px-4 text-neutral-400">
                          {place.tags.slice(0, 2).join(", ")}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${badgeColor}`}>
                              {lvl} ({place.liveScore})
                            </span>
                            <div className="w-16 bg-neutral-800 h-1.5 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className={`h-full ${
                                  lvl === "Critical" ? "bg-red-500" : lvl === "High" ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${place.liveScore}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-neutral-300">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-neutral-500" />
                            {place.best}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-mono ${
                              place.sensorStatus === "online" ? "text-emerald-400" : "text-amber-400"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                place.sensorStatus === "online" ? "bg-emerald-400" : "bg-amber-400"
                              }`}
                            />
                            {place.sensorStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleScoreAdjust(place.id, -10)}
                              className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-mono"
                              title="Decrease crowd score (simulate dispersal)"
                            >
                              -10
                            </button>
                            <button
                              onClick={() => handleScoreAdjust(place.id, 10)}
                              className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-mono"
                              title="Increase crowd score (simulate sudden surge)"
                            >
                              +10
                            </button>
                            <button
                              onClick={() => handleToggleGate(place.id)}
                              className={`px-2.5 py-1 rounded text-xs font-medium border transition ${
                                lvl === "Critical" || lvl === "High"
                                  ? "bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30"
                                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                              }`}
                            >
                              {lvl === "Critical" ? "Release Throttle" : "Throttle Entry"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: INCIDENTS & COMMUNITY PULSE */}
        {activeTab === "incidents" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-neutral-100 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-500" />
                    Incoming Pulse Dispatches & Crowd Flags
                  </h3>
                  <p className="text-xs text-neutral-400">
                    User crowd feedback, on-ground Jaipur police dispatches, and parking telemetry
                  </p>
                </div>
                <span className="text-xs bg-neutral-800 text-neutral-300 px-2 py-1 rounded border border-neutral-700">
                  {incidents.filter((i) => !i.verified).length} Unverified
                </span>
              </div>

              <div className="space-y-3">
                {incidents.map((inc) => (
                  <div
                    key={inc.id}
                    className={`p-4 rounded-xl border transition ${
                      inc.verified
                        ? "bg-neutral-950/60 border-neutral-800"
                        : "bg-amber-950/20 border-amber-500/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-neutral-400">{inc.id}</span>
                          <span className="font-semibold text-white text-sm">{inc.placeName}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-neutral-800 text-neutral-300 border border-neutral-700">
                            {inc.type}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-300 mt-1">{inc.description}</p>
                        <div className="flex items-center gap-3 text-[11px] text-neutral-400 mt-2">
                          <span>Reported by: <strong className="text-neutral-300">{inc.reporter}</strong></span>
                          <span>•</span>
                          <span>{inc.time}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                          onClick={() => handleVerifyIncident(inc.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                            inc.verified
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                              : "bg-amber-500 text-neutral-950 hover:bg-amber-400 font-bold"
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {inc.verified ? "Verified ✓" : "Verify & Act"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Action Dispatch Card */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-neutral-100 flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                Crowd Dispersal Playbooks
              </h3>
              <p className="text-xs text-neutral-400">
                Instantly trigger pre-programmed city diversion algorithms:
              </p>

              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-950/60 space-y-2">
                  <div className="font-medium text-xs text-amber-400">Amer Fort Detour Playbook</div>
                  <p className="text-[11px] text-neutral-400">
                    Diverts 35% of incoming Amer tourists towards Jaigarh Fort & Panna Meena Kund with instant +20 bonus points.
                  </p>
                  <button
                    onClick={() => {
                      handleScoreAdjust("amber", -15);
                      handleScoreAdjust("jaigarh", 10);
                      handleScoreAdjust("panna", 10);
                      setActiveBroadcast("Playbook Executed: Amber Fort visitors rerouted to Jaigarh & Panna Meena Kund.");
                    }}
                    className="w-full py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold transition"
                  >
                    Execute Playbook
                  </button>
                </div>

                <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-950/60 space-y-2">
                  <div className="font-medium text-xs text-amber-400">Old City Bazaar Relief</div>
                  <p className="text-[11px] text-neutral-400">
                    Balances footfall between Bapu Bazaar and Tripolia / Sanganer Craft Area to reduce narrow alley congestion.
                  </p>
                  <button
                    onClick={() => {
                      handleScoreAdjust("bapu", -12);
                      handleScoreAdjust("tripolia", 8);
                      setActiveBroadcast("Playbook Executed: Bapu Bazaar footfall shifted towards Tripolia & Sanganer.");
                    }}
                    className="w-full py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold transition"
                  >
                    Execute Playbook
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BROADCAST DISPATCH */}
        {activeTab === "broadcast" && (
          <div className="max-w-2xl mx-auto bg-neutral-900/80 border border-neutral-800 rounded-xl p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-lg text-neutral-100 flex items-center gap-2">
                <Send className="w-5 h-5 text-amber-500" />
                Citywide Tourist Push Notification Broadcast
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Broadcast official travel advisories, parking capacity notices, and dynamic incentives directly to all users exploring Jaipur in the Musafir app.
              </p>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Advisory / Push Notification Text
                </label>
                <textarea
                  rows={4}
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  placeholder="e.g. Amber Fort parking at 100% capacity. Free electric shuttle now departing from Jal Mahal every 8 mins."
                  className="w-full p-3 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {broadcastStatus && (
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  {broadcastStatus}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-neutral-500">
                  Target: ~14,800 active app sessions in Jaipur GPS boundary
                </span>
                <button
                  type="submit"
                  disabled={!broadcastMsg.trim()}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Instant Alert
                </button>
              </div>
            </form>

            <div className="border-t border-neutral-800 pt-4 mt-4">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-2">
                Quick Template Presets
              </span>
              <div className="space-y-2">
                {[
                  "Rain Alert: Slippery stairs at Nahargarh Fort. We recommend indoor galleries at Albert Hall Museum today.",
                  "Suraj Pol Congestion: 45 min queue detected. Take the 10 min scenic walk to Jaigarh Fort cannon viewpoint.",
                  "Night Bazaar Advisory: Johari & Bapu Bazaar vehicle entry restricted between 6 PM - 9 PM.",
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setBroadcastMsg(preset)}
                    className="w-full text-left p-2.5 rounded bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-800 text-xs text-neutral-300 transition"
                  >
                    "{preset}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
