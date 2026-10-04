import { useMemo, useState } from "react";
import {
  PLACES, byId, crowdScore, level, levelClass, DAYS, INTERESTS,
  type ForecastInput, type Place,
} from "@/lib/jaipur-data";

export type Report = { id: number; place: string; user: string; status: "Quiet" | "Moderate" | "Busy"; tip: string; ago: string };

export function SectionTitle({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="mb-8 text-center">
      <p className="font-display text-lg text-saffron">{kicker}</p>
      <h2 className="mt-1 text-4xl text-primary md:text-5xl">{title}</h2>
      {sub && <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{sub}</p>}
      <div className="mx-auto mt-4 flex items-center justify-center gap-2 text-gold">✦ ❁ ✦</div>
    </div>
  );
}

export function Badge({ score }: { score: number }) {
  const l = level(score);
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${levelClass[l]}`}>{score}/100 · {l}</span>;
}

/* ---------------- Planner ---------------- */
export type Plan = {
  day: string; time: "half" | "full"; budget: number; interests: string[];
  type: string; crowd: string; must: string;
};

export function Planner({ plan, setPlan, onGenerate }: { plan: Plan; setPlan: (p: Plan) => void; onGenerate: () => void }) {
  const chip = (active: boolean) =>
    `rounded-full border px-4 py-1.5 text-sm capitalize transition ${active ? "border-primary bg-primary text-primary-foreground shadow" : "border-border bg-card hover:border-primary"}`;
  return (
    <div className="arch mx-auto max-w-4xl border-4 border-double border-gold bg-card p-6 pt-14 shadow-xl md:p-10 md:pt-16">
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Travel day">
          <div className="flex flex-wrap gap-2">{DAYS.map((d) => <button key={d} className={chip(plan.day === d)} onClick={() => setPlan({ ...plan, day: d })}>{d}</button>)}</div>
        </Field>
        <Field label="Available time">
          <div className="flex gap-2">
            <button className={chip(plan.time === "half")} onClick={() => setPlan({ ...plan, time: "half" })}>Half-day</button>
            <button className={chip(plan.time === "full")} onClick={() => setPlan({ ...plan, time: "full" })}>Full day</button>
          </div>
        </Field>
        <Field label={`Budget: ₹${plan.budget.toLocaleString("en-IN")}`}>
          <input type="range" min={500} max={6000} step={250} value={plan.budget} onChange={(e) => setPlan({ ...plan, budget: +e.target.value })} className="w-full accent-[var(--primary)]" />
        </Field>
        <Field label="Travelling as">
          <div className="flex flex-wrap gap-2">{["solo", "friends", "couple", "family"].map((t) => <button key={t} className={chip(plan.type === t)} onClick={() => setPlan({ ...plan, type: t })}>{t}</button>)}</div>
        </Field>
        <Field label="Interests">
          <div className="flex flex-wrap gap-2">{INTERESTS.map((i) => {
            const on = plan.interests.includes(i);
            return <button key={i} className={chip(on)} onClick={() => setPlan({ ...plan, interests: on ? plan.interests.filter((x) => x !== i) : [...plan.interests, i] })}>{i}</button>;
          })}</div>
        </Field>
        <Field label="Crowd preference">
          <div className="flex flex-wrap gap-2">{["avoid", "balanced", "don't mind"].map((c) => <button key={c} className={chip(plan.crowd === c)} onClick={() => setPlan({ ...plan, crowd: c })}>{c === "avoid" ? "Avoid crowds" : c}</button>)}</div>
        </Field>
        <Field label="Must-visit (optional)">
          <select value={plan.must} onChange={(e) => setPlan({ ...plan, must: e.target.value })} className="w-full rounded-lg border bg-background px-3 py-2">
            <option value="">None</option>
            {PLACES.filter((p) => !p.gem).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <div className="flex items-end">
          <button onClick={onGenerate} className="w-full rounded-full bg-primary px-6 py-3 font-display text-lg text-primary-foreground shadow-lg transition hover:scale-[1.02] hover:bg-saffron">
            Plan my Jaipur day →
          </button>
        </div>
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>{children}</div>;
}

/* ---------------- Itinerary + Smart Route ---------------- */
type Stop = { time: string; hour: number; id: string; note?: string; food?: boolean };

export function buildOriginal(plan: Plan): Stop[] {
  const must = plan.must || "amber";
  const base: Stop[] = [
    { time: "11:00 AM", hour: 11, id: "hawa" },
    { time: "1:00 PM", hour: 13, id: "jantar" },
    { time: "4:00 PM", hour: 16, id: must },
    { time: "6:30 PM", hour: 18, id: "nahargarh" },
  ];
  return plan.time === "half" ? base.slice(1, 3) : base;
}
export function buildSmart(plan: Plan): Stop[] {
  const must = plan.must || "amber";
  const p = byId(must);
  const alts = p.alternatives ?? ["panna", "jaigarh"];
  const s: Stop[] = [
    { time: "9:00 AM", hour: 9, id: must, note: "Moved to morning, before tour buses" },
    { time: "11:30 AM", hour: 11, id: alts[1] ?? "panna", note: "Hidden gem, 4 km away" },
    { time: "1:00 PM", hour: 13, id: "food", food: true, note: "Local thali — Laxmi Misthan Bhandar style" },
    { time: "3:00 PM", hour: 15, id: alts[0] ?? "jaigarh", note: "Similar vibe, half the crowd" },
    { time: "5:30 PM", hour: 17, id: "jalmahal", note: "Evening viewpoint" },
  ];
  return plan.time === "half" ? s.slice(0, 3) : s;
}

export function Itinerary({ plan, optimized, setOptimized, onReward }: { plan: Plan; optimized: boolean; setOptimized: (b: boolean) => void; onReward: (n: number) => void }) {
  const day = plan.day;
  const stops = optimized ? buildSmart(plan) : buildOriginal(plan);
  const scoreOf = (s: Stop) => (s.food ? 30 : crowdScore(byId(s.id), { day, hour: s.hour, festival: false, weather: "clear" }).score);
  const avg = Math.round(stops.reduce((a, s) => a + scoreOf(s), 0) / stops.length);
  const origAvg = Math.round(buildOriginal(plan).reduce((a, s) => a + scoreOf(s), 0) / buildOriginal(plan).length);
  const cost = stops.reduce((a, s) => a + (s.food ? 250 : byId(s.id).entry), 0) + 600;
  const must = byId(plan.must || "amber");
  const mustScore = crowdScore(must, { day, hour: 16, festival: false, weather: "clear" }).score;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-2xl border bg-card p-6 shadow">
        {!optimized && (
          <div className="mb-5 rounded-xl border-l-4 border-crowd-critical bg-secondary p-4">
            <p className="font-bold">⚠ {must.name} at 4 PM: {mustScore}/100 crowd pressure — {level(mustScore)}</p>
            <p className="text-sm text-muted-foreground">{day} plus evening tourist rush. Expected wait 40+ minutes.</p>
          </div>
        )}
        <div className="flex items-center justify-between">
          <h3 className="text-2xl">{optimized ? "Musafir Smart Route" : "Your original plan"}</h3>
          <span className="text-sm text-muted-foreground">{day} · {plan.type} · ₹{plan.budget}</span>
        </div>
        <ol className="mt-5 space-y-4 border-l-2 border-dashed border-primary pl-6">
          {stops.map((s, i) => {
            const p = s.food ? null : byId(s.id);
            return (
              <li key={i} className="relative animate-in fade-in slide-in-from-left-4" style={{ animationDelay: `${i * 90}ms`, animationFillMode: "both" }}>
                <span className="absolute -left-[33px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-saffron ring-4 ring-background" />
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-display text-primary">{s.time}</span>
                  <span className="font-semibold">{p ? p.name : "Local food stop"}</span>
                  {p?.gem && <span className="rounded-full bg-gem px-2 py-0.5 text-xs text-primary-foreground">★ Hidden gem</span>}
                  <Badge score={scoreOf(s)} />
                </div>
                {s.note && optimized && <p className="text-sm text-muted-foreground">{s.note}</p>}
                {i < stops.length - 1 && <p className="text-xs text-muted-foreground">↓ ~{15 + i * 5} min by auto-rickshaw</p>}
              </li>
            );
          })}
        </ol>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="text-sm">Est. budget: <b>₹{cost.toLocaleString("en-IN")}</b> (entries + food + transport)</span>
          {!optimized ? (
            <button onClick={() => { setOptimized(true); onReward(80); }} className="ml-auto rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground shadow transition hover:bg-saffron">✨ Optimize My Route</button>
          ) : (
            <button onClick={() => setOptimized(false)} className="ml-auto rounded-full border px-5 py-2.5 text-sm">View original</button>
          )}
        </div>
      </div>
      <div className="rounded-2xl bg-indigo-deep p-6 text-primary-foreground shadow">
        <h3 className="text-2xl text-gold">Before vs after</h3>
        <table className="mt-4 w-full text-sm">
          <thead><tr className="text-left opacity-70"><th className="py-2">Metric</th><th>Original</th><th>Smart</th></tr></thead>
          <tbody className="[&_td]:border-t [&_td]:border-primary-foreground/15 [&_td]:py-2.5">
            <tr><td>Crowd exposure</td><td>{origAvg}/100</td><td className="font-bold text-gold">{optimized ? avg : "—"}/100</td></tr>
            <tr><td>Waiting time</td><td>110 min</td><td className="font-bold text-gold">{optimized ? "35 min" : "—"}</td></tr>
            <tr><td>Travel time</td><td>95 min</td><td className="font-bold text-gold">{optimized ? "70 min" : "—"}</td></tr>
            <tr><td>Hidden gems</td><td>0</td><td className="font-bold text-gold">{optimized ? 2 : "—"}</td></tr>
            <tr><td>Rewards</td><td>0</td><td className="font-bold text-gold">{optimized ? "+80 pts" : "—"}</td></tr>
          </tbody>
        </table>
        <p className="mt-4 text-xs opacity-70">Illustrative prototype values.</p>
      </div>
    </div>
  );
}

/* ---------------- Forecast ---------------- */
export function Forecast({ pulseAdj }: { pulseAdj: Record<string, number> }) {
  const [f, setF] = useState<ForecastInput>({ day: "Sun", hour: 16, festival: false, weather: "clear" });
  const [sel, setSel] = useState("amber");
  const p = byId(sel);
  const { score, factors } = crowdScore(p, f, pulseAdj[sel] ?? 0);
  const fmt = (h: number) => `${((h + 11) % 12) + 1}:00 ${h < 12 ? "AM" : "PM"}`;
  const reasons = [f.day === "Sat" || f.day === "Sun" ? "Weekend" : null, f.hour >= 15 && f.hour <= 19 ? "Evening peak" : null, f.festival ? "Festival (Teej / Diwali)" : null, "Historical visitor pattern"].filter(Boolean);
  const hours = Array.from({ length: 13 }, (_, i) => i + 7);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <div className="space-y-4 rounded-2xl border bg-card p-6">
        <select value={sel} onChange={(e) => setSel(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 font-semibold">
          {PLACES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <div className="flex flex-wrap gap-1">{DAYS.map((d) => <button key={d} onClick={() => setF({ ...f, day: d })} className={`rounded-md px-2.5 py-1 text-sm ${f.day === d ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{d}</button>)}</div>
        <label className="block text-sm">Time: <b>{fmt(f.hour)}</b>
          <input type="range" min={7} max={19} value={f.hour} onChange={(e) => setF({ ...f, hour: +e.target.value })} className="w-full accent-[var(--primary)]" />
        </label>
        <div className="flex flex-wrap gap-2 text-sm">
          <button onClick={() => setF({ ...f, festival: !f.festival })} className={`rounded-full border px-3 py-1 ${f.festival ? "bg-saffron text-primary-foreground" : ""}`}>🪔 Festival</button>
          {(["clear", "hot", "rain"] as const).map((w) => <button key={w} onClick={() => setF({ ...f, weather: w })} className={`rounded-full border px-3 py-1 capitalize ${f.weather === w ? "bg-indigo-deep text-primary-foreground" : ""}`}>{w === "clear" ? "☀" : w === "hot" ? "🔥" : "🌧"} {w}</button>)}
        </div>
        <div className="rounded-xl bg-muted p-4 text-sm">
          <p className="mb-2 font-semibold">Crowd score formula</p>
          {Object.entries(factors).map(([k, v]) => <div key={k} className="flex justify-between capitalize"><span>{k.replace(/([A-Z])/g, " $1")}</span><span>{v >= 0 ? "+" : ""}{v}</span></div>)}
        </div>
      </div>
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6">
        <div className="jaali absolute inset-0 opacity-60" />
        <div className="relative">
          <p className="font-display text-saffron">{p.hindi}</p>
          <h3 className="text-3xl">{p.name}</h3>
          <div className="mt-4 flex items-end gap-4">
            <span className="font-serif text-7xl text-primary transition-all">{score}</span>
            <div className="pb-3"><span className="text-muted-foreground">/100</span><div><Badge score={score} /></div></div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-crowd-low via-crowd-moderate to-crowd-critical transition-all duration-500" style={{ width: `${score}%` }} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-secondary p-3"><p className="text-muted-foreground">Best time</p><p className="font-bold">{p.best}</p></div>
            <div className="rounded-lg bg-secondary p-3"><p className="text-muted-foreground">Predicted peak</p><p className="font-bold">{p.peak}</p></div>
          </div>
          <p className="mt-3 text-sm"><b>Why:</b> {reasons.join(" + ")}</p>
          <div className="mt-5 flex h-28 items-end gap-1">
            {hours.map((h) => {
              const s = crowdScore(p, { ...f, hour: h }, pulseAdj[sel] ?? 0).score;
              return (
                <button key={h} onClick={() => setF({ ...f, hour: h })} className="group flex flex-1 flex-col items-center gap-1" title={`${fmt(h)}: ${s}`}>
                  <div className={`w-full rounded-t ${levelClass[level(s)].split(" ")[0]} ${h === f.hour ? "ring-2 ring-foreground" : "opacity-80 group-hover:opacity-100"}`} style={{ height: `${s}px` }} />
                  <span className="text-[10px] text-muted-foreground">{h > 12 ? h - 12 : h}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Hidden gems ---------------- */
export function HiddenGems() {
  const [hot, setHot] = useState("amber");
  const hotspots = PLACES.filter((p) => p.alternatives);
  const p = byId(hot);
  const dist: Record<string, string> = { jaigarh: "3.5 km", panna: "4.2 km", sisodia: "8 km", albert: "1.8 km", patrika: "6 km", citypalace: "0.4 km", anokhi: "11 km", jalmahal: "5 km", kanak: "1 km", tripolia: "1.2 km", sanganer: "13 km" };
  return (
    <div>
      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {hotspots.map((h) => <button key={h.id} onClick={() => setHot(h.id)} className={`rounded-full border px-4 py-1.5 text-sm ${hot === h.id ? "border-crowd-critical bg-crowd-critical text-primary-foreground" : "bg-card"}`}>{h.name}</button>)}
      </div>
      <p className="mb-6 text-center text-muted-foreground">{p.name} is busy. Try these nearby places with a similar vibe:</p>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...(p.alternatives ?? []), ...(hot === "amber" ? ["sisodia"] : [])].map((id, i) => {
          const g = byId(id);
          const s = crowdScore(g, { day: "Sun", hour: 16, festival: false, weather: "clear" }).score;
          const match = Math.round((g.tags.filter((t) => p.tags.includes(t)).length / p.tags.length) * 40 + 55);
          return (
            <div key={id} className="arch group border-2 border-gold bg-card p-6 pt-12 text-center shadow transition hover:-translate-y-1 hover:shadow-xl animate-in fade-in zoom-in-95" style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}>
              <p className="font-display text-saffron">{g.hindi}</p>
              <h3 className="text-2xl">{g.name}</h3>
              <div className="my-3 flex justify-center gap-2"><Badge score={s} /><span className="rounded-full bg-gem px-2.5 py-0.5 text-xs font-bold text-primary-foreground">{Math.min(match, 98)}% vibe match</span></div>
              <p className="text-sm">Matches: {g.tags.join(", ")}</p>
              <p className="text-sm text-muted-foreground">{dist[id] ?? "3 km"} away · +{8 + i * 6} min travel</p>
              <p className="mt-3 rounded-lg bg-secondary p-2 text-sm italic">“{g.update}”</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Live map ---------------- */
export { LiveMap } from "./LiveMap";


/* ---------------- Pulse ---------------- */
export function Pulse({ reports, addReport }: { reports: Report[]; addReport: (r: Omit<Report, "id" | "ago" | "user">) => void }) {
  const [place, setPlace] = useState("hawa");
  const [status, setStatus] = useState<Report["status"]>("Quiet");
  const [tip, setTip] = useState("");
  const tone = { Quiet: "bg-crowd-low", Moderate: "bg-crowd-moderate", Busy: "bg-crowd-critical" };
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <form onSubmit={(e) => { e.preventDefault(); addReport({ place, status, tip }); setTip(""); }} className="space-y-4 rounded-2xl border bg-card p-6">
        <h3 className="text-2xl">I'm here right now</h3>
        <select value={place} onChange={(e) => setPlace(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2">
          {PLACES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="grid grid-cols-3 gap-2">
          {(["Quiet", "Moderate", "Busy"] as const).map((s) => <button type="button" key={s} onClick={() => setStatus(s)} className={`rounded-lg border-2 py-3 font-semibold ${status === s ? `${tone[s]} border-foreground text-primary-foreground` : "bg-background"}`}>{s}</button>)}
        </div>
        <input value={tip} onChange={(e) => setTip(e.target.value)} maxLength={100} placeholder="One-line tip (optional)" className="w-full rounded-lg border bg-background px-3 py-2" />
        <button className="w-full rounded-full bg-primary py-2.5 font-semibold text-primary-foreground hover:bg-saffron">Share check-in · +20 pts</button>
        <p className="text-xs text-muted-foreground">Your check-in instantly adjusts the crowd forecast and live map.</p>
      </form>
      <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
        {reports.map((r) => (
          <div key={r.id} className="flex gap-3 rounded-xl border bg-card p-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-saffron font-display text-primary-foreground">{r.user[0]}</div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 text-sm"><b>{r.user}</b><span className="text-muted-foreground">at {byId(r.place).name} · {r.ago}</span>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-xs text-primary-foreground ${tone[r.status]}`}>{r.status}</span></div>
              {r.tip && <p className="mt-1 text-sm">{r.tip}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Rewards / Circle / Simulator ---------------- */
export function Extras({ points }: { points: number }) {
  const [shift, setShift] = useState(20);
  const [votes, setVotes] = useState<Record<string, number>>({ jaigarh: 2, panna: 1, albert: 1 });
  const badges = [
    { n: "Hidden Gem Hunter", need: 80, icon: "💎" },
    { n: "Smart Explorer", need: 120, icon: "🧭" },
    { n: "Crowd Navigator", need: 200, icon: "🐘" },
  ];
  const sim = useMemo(() => {
    const amber = 86 - shift * 1.1;
    return { amber: Math.round(amber), jaigarh: Math.round(42 + shift * 0.5), panna: Math.round(28 + shift * 0.4), wait: Math.round(110 - shift * 2.4), revenue: Math.round(shift * 0.9 * 10) / 10 };
  }, [shift]);
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="rounded-2xl bg-gradient-to-br from-primary to-saffron p-6 text-primary-foreground shadow">
        <h3 className="text-2xl">Musafir Rewards</h3>
        <p className="mt-2 font-serif text-6xl">{points}</p><p className="opacity-80">points earned</p>
        <div className="mt-5 space-y-2">
          {badges.map((b) => <div key={b.n} className={`flex items-center gap-3 rounded-lg bg-background/15 p-2.5 ${points >= b.need ? "" : "opacity-45 grayscale"}`}><span className="text-2xl">{b.icon}</span><span className="flex-1 font-semibold">{b.n}</span><span className="text-xs">{points >= b.need ? "Unlocked" : `${b.need} pts`}</span></div>)}
        </div>
      </div>
      <div className="rounded-2xl border bg-card p-6">
        <h3 className="text-2xl">Musafir Circle</h3>
        <p className="text-sm text-muted-foreground">Trip with Alice, Paridhi & Ashwajeet — vote the 3 PM stop</p>
        <div className="my-4 flex -space-x-2">{["A", "P", "As", "G"].map((m) => <span key={m} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-card bg-indigo-deep text-sm text-primary-foreground">{m}</span>)}</div>
        {Object.entries(votes).map(([id, v]) => (
          <button key={id} onClick={() => setVotes({ ...votes, [id]: v + 1 })} className="mb-2 block w-full rounded-lg border p-2 text-left text-sm hover:border-primary">
            <div className="flex justify-between"><span>{byId(id).name}</span><span>{v} 👍</span></div>
            <div className="mt-1 h-1.5 rounded bg-muted"><div className="h-full rounded bg-saffron" style={{ width: `${(v / 8) * 100}%` }} /></div>
          </button>
        ))}
        <button onClick={() => navigator.clipboard?.writeText("https://musafir.app/circle/jaipur-sunday")} className="mt-2 w-full rounded-full border border-primary py-2 text-sm text-primary">🔗 Copy invite link</button>
      </div>
      <div className="rounded-2xl bg-indigo-deep p-6 text-primary-foreground">
        <h3 className="text-2xl text-gold">What-If Simulator</h3>
        <p className="text-sm opacity-75">For tourism authorities</p>
        <label className="mt-4 block text-sm">Shift <b className="text-gold">{shift}%</b> of Amber Fort visitors
          <input type="range" min={0} max={30} step={10} value={shift} onChange={(e) => setShift(+e.target.value)} className="w-full accent-[var(--gold)]" />
        </label>
        <div className="mt-4 space-y-2 text-sm">
          {[["Amber Fort", sim.amber], ["Jaigarh Fort", sim.jaigarh], ["Panna Meena Kund", sim.panna]].map(([n, v]) => (
            <div key={n as string}><div className="flex justify-between"><span>{n}</span><span>{v}/100</span></div><div className="h-2 rounded bg-primary-foreground/15"><div className={`h-full rounded ${levelClass[level(v as number)].split(" ")[0]} transition-all`} style={{ width: `${v}%` }} /></div></div>
          ))}
          <p className="pt-2">Avg wait at Amber: <b className="text-gold">{sim.wait} min</b></p>
          <p>Local business uplift: <b className="text-gold">+₹{sim.revenue}L / month</b></p>
        </div>
      </div>
    </div>
  );
}
