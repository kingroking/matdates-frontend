import React, { useState, useEffect, useMemo } from "react";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { MatAlertModal, useWatchedAthletes } from "./MatAlertModal";
import { PRO_SUPERFIGHTS, computeEliteSpotlight, foldStr, athBucket, getDeadlineBadge } from "./proHubData";
import { AthleteTrophyRoomModal } from "./proTrophyModal";

const MODAL_BG = { position:"fixed", inset:0, background:"rgba(0,0,0,0.86)", zIndex:10060, display:"flex", alignItems:"center", justifyContent:"center", padding:"12px", boxSizing:"border-box" };

export function TaleOfTheTapeModal({ compA, compB, division, onClose }) {
  const [stats, setStats] = useState([null, null]);
  useEffect(() => {
    Promise.all([compA, compB].map(async (c) => {
      const nm = c?.Name || "", bkt = athBucket(nm);
      const sn = await getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__a2_" + bkt + "__")));
      let g = 0, s = 0, b = 0, gi = 0, nogi = 0; const seen = new Set(), feds = new Set();
      sn.forEach(d => ((d.data() || {}).items || []).forEach(it => {
        if (foldStr(it.n) !== foldStr(nm)) return;
        const dk = foldStr(it.ev) + "|" + foldStr(it.d) + "|" + it.p;
        if (seen.has(dk)) return; seen.add(dk);
        const p = Number(it.p || 3); if (p === 1) g++; else if (p === 2) s++; else b++;
        if (/no[- ]?gi|adcc|ufc/i.test((it.d||"")+" "+(it.ev||""))) nogi++; else gi++;
        feds.add(/ufc/i.test((it.ev||"")+" "+(it.f||"")) ? "UFC" : it.f);
      }));
      const sp = computeEliteSpotlight({ name: nm, academy: c?.Academy, g, s, b, events: [] });
      return { nm, acad: c?.Academy || "", g, s, b, pts: g*9+s*3+b, gi, nogi, feds: Array.from(feds), titles: sp.pro?.titles || [] };
    })).then(setStats).catch(() => {});
  }, [compA, compB]);
  const [a, b] = stats;
  return (
    <div onClick={onClose} style={MODAL_BG}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#111622", border:"1.5px solid #f59e0b", borderRadius:"12px", maxWidth:"550px", width:"100%", padding:"16px", color:"#fff", textAlign:"center" }}>
        <div style={{ color:"#fbbf24", fontWeight:"800", fontSize:"0.8rem" }}>⚔️ MATDATES TALE OF THE TAPE</div>
        <div style={{ color:"#94a3b8", fontSize:"0.78rem", marginBottom:"12px" }}>{division}</div>
        {!a || !b ? <div style={{ padding:"20px", color:"#94a3b8" }}>Scouting 2026 Podium Records...</div> : (
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:"10px", alignItems:"center" }}>
            {[a, null, b].map((x, idx) => x ? (
              <div key={idx} style={{ background:"#182030", border:"1px solid #2d3748", borderRadius:"9px", padding:"10px" }}>
                <div style={{ fontWeight:"800", fontSize:"0.96rem" }}>{x.nm}</div>
                <div style={{ color:"#ff9f43", fontSize:"0.75rem", marginBottom:"6px" }}>{x.acad}</div>
                <div>🥇<b>{x.g}</b> 🥈<b>{x.s}</b> 🥉<b>{x.b}</b></div>
                <div style={{ color:"#34d399", fontWeight:"bold", fontSize:"0.8rem" }}>{x.pts} Pts</div>
                <div style={{ color:"#cbd5e1", fontSize:"0.73rem" }}>Gi: {x.gi} • No-Gi: {x.nogi}</div>
                <div style={{ color:"#38bdf8", fontSize:"0.7rem" }}>{x.feds.join(" • ") || "Debut / Unranked"}</div>
              </div>
            ) : <div key="vs" style={{ fontWeight:"900", color:"#ef4444" }}>VS</div>)}
          </div>
        )}
        <button onClick={onClose} style={{ marginTop:"14px", width:"100%", padding:"9px", background:"#1e293b", color:"#fff", border:"1px solid #334155", borderRadius:"7px", cursor:"pointer", fontWeight:"bold" }}>Close Scouting Card</button>
      </div>
    </div>
  );
}

export function WeekendWarRoomModal({ events, watches, onClose, onOpenEvent }) {
  const upcoming = (events || []).filter(e => {
    if (!e.sort_date) return false;
    const d = Math.ceil((new Date(e.sort_date + "T12:00:00") - new Date()) / 86400000);
    return d >= -2 && d <= 14;
  });
  return (
    <div onClick={onClose} style={MODAL_BG}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#111622", border:"1px solid #ef4444", borderRadius:"12px", maxWidth:"620px", width:"100%", maxHeight:"88svh", overflowY:"auto", padding:"16px", color:"#fff", textAlign:"left" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"10px" }}>
          <h3 style={{ margin:0 }}>🔥 Live Weekend War Room &amp; Deadlines</h3>
          <button onClick={onClose} style={{ background:"#1e293b", color:"#fff", border:"1px solid #334155", borderRadius:"6px", padding:"4px 9px", cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ color:"#fca5a5", fontWeight:"bold", fontSize:"0.8rem", marginBottom:"6px" }}>🔔 MY WATCHED ATHLETES ON DECK ({watches.length})</div>
        {watches.length === 0 ? <div style={{ color:"#94a3b8", fontSize:"0.8rem", marginBottom:"12px" }}>Tap 🔔 Watch on any athlete in Lookup, Brackets, or Podiums to track live Mat # here!</div> : (
          <div style={{ display:"grid", gap:"6px", marginBottom:"14px" }}>
            {watches.map((w, i) => (
              <div key={i} style={{ background:"#182030", padding:"8px 10px", borderRadius:"7px", display:"flex", justifyContent:"space-between", fontSize:"0.8rem" }}>
                <span><b>{w.athleteName}</b> ({w.eventName || "Following Next Bracket"})</span>
                <b style={{ color:"#4ade80" }}>{w.finalResult || [w.lastMat, w.lastTime].filter(Boolean).join(" • ") || "Monitoring Live"}</b>
              </div>
            ))}
          </div>
        )}
        <div style={{ color:"#fbbf24", fontWeight:"bold", fontSize:"0.8rem", marginBottom:"6px" }}>⏳ LIVE &amp; NEXT 14 DAYS TOURNAMENTS ({upcoming.length})</div>
        <div style={{ display:"grid", gap:"7px" }}>
          {upcoming.map(ev => {
            const b = getDeadlineBadge(ev);
            return (
              <div key={ev.id} style={{ background:"#182030", border:"1px solid #2d3748", borderRadius:"8px", padding:"9px 11px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                <div>
                  <div style={{ fontWeight:"bold", fontSize:"0.88rem" }}>{ev.name}</div>
                  <div style={{ fontSize:"0.76rem", color:"#94a3b8" }}>{ev.date} • {ev.location}</div>
                  {b && <span style={{ display:"inline-block", marginTop:"4px", background:b.bg, color:b.color, border:"1px solid " + b.border, borderRadius:"4px", padding:"2px 6px", fontSize:"0.7rem", fontWeight:"bold" }}>{b.text}</span>}
                </div>
                <button onClick={() => onOpenEvent(ev)} style={{ background:"#38bdf8", color:"#000", border:"none", borderRadius:"6px", padding:"6px 10px", fontSize:"0.76rem", fontWeight:"bold", cursor:"pointer" }}>Open Brackets</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function SubmitEventModal({ onClose }) {
  const [f, setF] = useState({ type: "Tournament", org: "IBJJF", name: "", date: "", venue: "", location: "", link: "", matchmaking: "", earlyBirdDate: "" });
  const submit = async (e) => {
    e.preventDefault();
    const color = f.type === "SuperFight" ? "#e31837" : f.type === "Seminar" ? "#a855f7" : "#ff9f43";
    await addDoc(collection(db, "pending_events"), { ...f, sort_date: f.date, color, createdAt: new Date().toISOString() });
    alert(f.type + " submitted for review!"); onClose();
  };
  const inp = { padding:"10px 12px", borderRadius:"6px", background:"#1c2230", color:"#fff", border:"1px solid #334155", fontSize:"0.9rem", width:"100%", boxSizing:"border-box" };
  return (
    <div onClick={onClose} style={MODAL_BG}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#111622", border:"1px solid #475569", borderRadius:"12px", maxWidth:"480px", width:"100%", maxHeight:"88svh", overflowY:"auto", padding:"18px", color:"#fff", textAlign:"left" }}>
        <h3 style={{ margin:"0 0 10px" }}>+ Submit Tournament, SuperFight or Seminar</h3>
        <div style={{ display:"flex", gap:"6px", marginBottom:"12px" }}>
          {[["Tournament","🏆 Tournament"],["SuperFight","🥊 SuperFight / Card"],["Seminar","🥋 Seminar"]].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setF({...f, type: k})} style={{ flex:1, padding:"8px 6px", borderRadius:"6px", fontWeight:"bold", fontSize:"0.76rem", cursor:"pointer", background: f.type===k ? "#ff9f43" : "#1c2230", color: f.type===k ? "#000" : "#cbd5e1", border: f.type===k ? "none" : "1px solid #334155" }}>{l}</button>
          ))}
        </div>
        <form onSubmit={submit} style={{ display:"grid", gap:"10px" }}>
          <select value={f.org} onChange={e => setF({...f, org: e.target.value})} style={inp}>
            {["IBJJF","ADCC","UFC BJJ","WNO / Pro Invitational","JJWL","Smoothcomp / Grappling Ind.","NAGA / AGF","Independent SuperFight / Seminar"].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <input required placeholder={f.type==="SuperFight" ? "Card Name (e.g. UFC BJJ 14)" : f.type==="Seminar" ? "Seminar Title & Guest Instructor" : "Tournament Name"} value={f.name} onChange={e => setF({...f, name: e.target.value})} style={inp} />
          <input required type="date" value={f.date} onChange={e => setF({...f, date: e.target.value})} style={inp} />
          {f.type !== "Tournament" && <input placeholder={f.type==="SuperFight" ? "Main Event or Open Matchmaking Weights" : "Instructor(s) & Gi/No-Gi Details"} value={f.matchmaking} onChange={e => setF({...f, matchmaking: e.target.value})} style={inp} />}
          <input placeholder="Venue Name (Optional)" value={f.venue} onChange={e => setF({...f, venue: e.target.value})} style={inp} />
          <input required placeholder="City, State (e.g. San Antonio, TX)" value={f.location} onChange={e => setF({...f, location: e.target.value})} style={inp} />
          <input required type="url" placeholder="Registration, Ticket, or Stream Link (https://...)" value={f.link} onChange={e => setF({...f, link: e.target.value})} style={inp} />
          <div><label style={{ fontSize:"0.74rem", color:"#94a3b8" }}>Early-Bird / Cutoff Date (Optional)</label><input type="date" value={f.earlyBirdDate} onChange={e => setF({...f, earlyBirdDate: e.target.value})} style={inp} /></div>
          <button type="submit" style={{ padding:"12px", background:"#ff9f43", color:"#000", border:"none", borderRadius:"7px", fontWeight:"800", cursor:"pointer" }}>Submit {f.type} for Review</button>
        </form>
      </div>
    </div>
  );
}

export function UniversalAthleteLookupModal({ events, onClose, onOpenBracket }) {
  const [qStr, setQStr] = useState("");
  const [regItems, setRegItems] = useState([]);
  const [podShards, setPodShards] = useState({});
  const [watchPick, setWatchPick] = useState(null);
  const [trophyPick, setTrophyPick] = useState(null);
  const { getWatch, removeWatch } = useWatchedAthletes();
  const evMap = useMemo(() => Object.fromEntries((events || []).map(e => [e.id, e])), [events]);

  useEffect(() => {
    getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__athlete_index__"))).then(sn => {
      const a = []; sn.forEach(d => a.push(...((d.data()||{}).items||[]))); setRegItems(a);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const bkt = athBucket(qStr);
    if (qStr.trim().length < 2 || bkt === "__" || podShards[bkt]) return;
    getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__a2_" + bkt + "__"))).then(sn => {
      const a = []; sn.forEach(d => a.push(...((d.data()||{}).items||[]))); setPodShards(p => ({ ...p, [bkt]: a }));
    }).catch(() => {});
  }, [qStr, podShards]);

  const terms = foldStr(qStr).trim().split(/\s+/).filter(Boolean);
  const regHits = useMemo(() => !terms.length || qStr.trim().length < 2 ? [] : regItems.filter(x => {
    const b = foldStr((x.n||"") + " " + (x.a||"")); return terms.every(t => b.includes(t));
  }).slice(0, 40), [regItems, qStr]);

  const podProfiles = useMemo(() => {
    if (qStr.trim().length < 2) return [];
    const pool = podShards[athBucket(qStr)] || [], map = new Map();
    PRO_SUPERFIGHTS.forEach(p => {
      if (terms.every(t => foldStr(p.name + " " + p.academy).includes(t))) map.set(foldStr(p.name), { name: p.name, academy: p.academy, g: 0, s: 0, b: 0, events: [], proTitles: p.titles });
    });
    pool.forEach(m => {
      if (!terms.every(t => foldStr((m.n||"") + " " + (m.a||"")).includes(t))) return;
      const k = foldStr(m.n);
      if (!map.has(k)) map.set(k, { name: m.n, academy: m.a, g: 0, s: 0, b: 0, events: [], seen: new Set() });
      const rec = map.get(k); rec.seen = rec.seen || new Set();
      const dk = foldStr(m.ev) + "|" + foldStr(m.d) + "|" + m.p;
      if (rec.seen.has(dk)) return; rec.seen.add(dk);
      if ((m.a||"").length > (rec.academy||"").length) rec.academy = m.a;
      const p = Number(m.p||3); if (p===1) rec.g++; else if (p===2) rec.s++; else rec.b++;
      rec.events.push(m);
    });
    return Array.from(map.values()).slice(0, 25);
  }, [qStr, podShards]);

  const openFollow = (nm, ac, ev, div) => setWatchPick({
    ev: ev || { id: "", name: "All Upcoming Tournaments", link: "https://matdates.com/?athlete=" + encodeURIComponent(nm).replace(/%20/g, "+"), sort_date: "" },
    comp: { Name: nm, Academy: ac || "", Division: div || "" }, div: div || ""
  });

  return (
    <div onClick={onClose} style={MODAL_BG}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#111622", border:"1px solid #334155", borderRadius:"12px", maxWidth:"620px", width:"100%", maxHeight:"88svh", overflowY:"auto", padding:"16px", color:"#fff", textAlign:"left" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"8px" }}>
          <h3 style={{ margin:0 }}>🔍 Universal Athlete Lookup &amp; Watch</h3>
          <button onClick={onClose} style={{ background:"#1e293b", color:"#fff", border:"1px solid #334155", borderRadius:"6px", padding:"4px 9px", cursor:"pointer" }}>✕</button>
        </div>
        <input autoFocus value={qStr} onChange={e => setQStr(e.target.value)} placeholder="Search ANY athlete or academy — upcoming brackets, past podiums, or superfights..." style={{ width:"100%", padding:"11px 13px", borderRadius:"8px", background:"#182030", color:"#fff", border:"1.5px solid #38bdf8", fontSize:"0.92rem", boxSizing:"border-box", marginBottom:"12px" }} />
        {qStr.trim().length < 2 ? <div style={{ color:"#94a3b8", fontSize:"0.84rem" }}>Search any athlete — even if they aren&apos;t registered in an upcoming event yet — to open their Trophy Room or activate 🔔 Watch Alerts!</div> : (
          <div style={{ display:"grid", gap:"9px" }}>
            {regHits.length > 0 && <div style={{ color:"#4ade80", fontWeight:"bold", fontSize:"0.78rem" }}>🟢 LIVE UPCOMING REGISTRATIONS ({regHits.length})</div>}
            {regHits.map((r, i) => {
              const ev = evMap[r.e] || { id: r.e, name: "Upcoming Event" };
              return (
                <div key={"r"+i} style={{ background:"#182030", border:"1px solid #22c55e", borderRadius:"8px", padding:"9px 11px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                  <div><div><b>{r.n}</b> <span style={{ color:"#ff9f43", fontSize:"0.78rem" }}>• {r.a}</span></div><div style={{ fontSize:"0.76rem", color:"#cbd5e1" }}>{ev.name} • {r.d}</div></div>
                  <div style={{ display:"flex", gap:"6px" }}>
                    <button onClick={() => openFollow(r.n, r.a, ev, r.d)} style={{ background: getWatch(r.n, ev.id) ? "#132a1c" : "#162536", color: getWatch(r.n, ev.id) ? "#2ecc71" : "#38bdf8", border:"1px solid #0284c7", borderRadius:"6px", padding:"5px 9px", fontSize:"0.74rem", fontWeight:"bold", cursor:"pointer" }}>{getWatch(r.n, ev.id) ? "✓ Watching" : "🔔 Watch"}</button>
                    <button onClick={() => onOpenBracket(ev, r.n)} style={{ background:"#38bdf8", color:"#000", border:"none", borderRadius:"6px", padding:"5px 9px", fontSize:"0.74rem", fontWeight:"bold", cursor:"pointer" }}>Bracket →</button>
                  </div>
                </div>
              );
            })}
            {podProfiles.length > 0 && <div style={{ color:"#fbbf24", fontWeight:"bold", fontSize:"0.78rem", marginTop:"4px" }}>🏆 VERIFIED PROFILES &amp; TROPHY ROOMS ({podProfiles.length})</div>}
            {podProfiles.map((p, i) => (
              <div key={"p"+i} style={{ background:"#182030", border:"1px solid #334155", borderRadius:"8px", padding:"9px 11px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                <div><div><b>{p.name}</b> <span style={{ color:"#ff9f43", fontSize:"0.78rem" }}>• {p.academy}</span></div><div style={{ fontSize:"0.76rem", color:"#cbd5e1" }}>🥇{p.g} 🥈{p.s} 🥉{p.b} {p.proTitles ? " • " + p.proTitles[0] : ""}</div></div>
                <div style={{ display:"flex", gap:"6px" }}>
                  <button onClick={() => setTrophyPick(p)} style={{ background:"#f59e0b", color:"#000", border:"none", borderRadius:"6px", padding:"5px 9px", fontSize:"0.74rem", fontWeight:"800", cursor:"pointer" }}>🏆 Trophy Room</button>
                  <button onClick={() => openFollow(p.name, p.academy)} style={{ background: getWatch(p.name) ? "#132a1c" : "#162536", color: getWatch(p.name) ? "#2ecc71" : "#38bdf8", border:"1px solid #0284c7", borderRadius:"6px", padding:"5px 9px", fontSize:"0.74rem", fontWeight:"bold", cursor:"pointer" }}>{getWatch(p.name) ? "✓ Watching" : "🔔 Watch"}</button>
                </div>
              </div>
            ))}
            <div style={{ background:"#141c2b", border:"1px dashed #38bdf8", borderRadius:"8px", padding:"10px 12px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
              <div style={{ fontSize:"0.8rem", color:"#cbd5e1" }}>Get a Push/Email alert the moment <b>&quot;{qStr.trim()}&quot;</b> joins any bracket:</div>
              <button onClick={() => openFollow(qStr.trim(), "")} style={{ background:"#ff9f43", color:"#000", border:"none", borderRadius:"6px", padding:"6px 11px", fontSize:"0.76rem", fontWeight:"800", cursor:"pointer" }}>🔔 Watch &quot;{qStr.trim()}&quot;</button>
            </div>
          </div>
        )}
        {watchPick && <MatAlertModal event={watchPick.ev} comp={watchPick.comp} division={watchPick.div} existingWatch={getWatch(watchPick.comp.Name, watchPick.ev.id)} onRemove={removeWatch} onClose={() => setWatchPick(null)} />}
        {trophyPick && <AthleteTrophyRoomModal athlete={trophyPick} onClose={() => setTrophyPick(null)} onWatch={(nm, ac) => { setTrophyPick(null); openFollow(nm, ac); }} isWatching={Boolean(getWatch(trophyPick.name))} />}
      </div>
    </div>
  );
}
