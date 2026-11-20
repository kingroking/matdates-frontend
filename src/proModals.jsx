import { trackEvent } from "./analytics";
import React, { useState, useEffect, useMemo } from "react";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { MatAlertModal, useWatchedAthletes } from "./MatAlertModal";
import { foldStr, athBucket, athBucketsForQuery, smartAthleteMatch, canonicalPersonKey, findProAthlete, PRO_SUPERFIGHTS, UPCOMING_UFC_SUPERFIGHTS } from "./proHubData";
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
        <div style={{ color:"#fbbf24", fontWeight:"800", fontSize:"0.8rem" }}>🆚 HEAD-TO-HEAD BRACKET COMPARISON</div>
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

export function WeekendWarRoomModal({ events, watches, onRemoveWatch, onOpenAthlete, onClose, onOpenEvent }) {
  const upcoming = (events || []).filter(e => {
    if (!e.sort_date) return false;
    const d = Math.ceil((new Date(e.sort_date + "T12:00:00") - new Date()) / 86400000);
    return d >= -2 && d <= 14;
  });
  return (
    <div onClick={onClose} style={MODAL_BG}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#111622", border:"1.5px solid #2ecc71", borderRadius:"12px", maxWidth:"640px", width:"100%", maxHeight:"88svh", overflowY:"auto", padding:"16px", color:"#fff", textAlign:"left" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
          <h3 style={{ margin:0, color:"#ffffff" }}>🔥 War Room — My Watched Athletes &amp; Live Deadlines</h3>
          <button onClick={onClose} style={{ background:"#1e293b", color:"#fff", border:"1px solid #334155", borderRadius:"6px", padding:"4px 9px", cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ color:"#4ade80", fontWeight:"800", fontSize:"0.8rem", marginBottom:"6px" }}>🔔 MY WATCHED ATHLETES ({watches.length})</div>
        {watches.length === 0 ? (
          <div style={{ background:"#182030", padding:"12px", borderRadius:"8px", color:"#94a3b8", fontSize:"0.8rem", marginBottom:"14px" }}>
            Tap <b>🔔 Watch</b> on any competitor in Athlete Lookup, Brackets, or Podiums to get live tournament-day Mat #, Match Time &amp; Podium push alerts!
          </div>
        ) : (
          <div style={{ display:"grid", gap:"6px", marginBottom:"16px" }}>
            {watches.map((w, i) => (
              <div key={w.id || i} style={{ background:"#182030", border:"1px solid #283548", padding:"9px 11px", borderRadius:"8px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap", fontSize:"0.81rem" }}>
                <div>
                  <div style={{ fontWeight:"bold", color:"#fff" }}>{w.athleteName} {w.division ? <span style={{ color:"#93c5fd", fontWeight:"normal", fontSize:"0.75rem" }}>• {w.division}</span> : null}</div>
                  <div style={{ color:"#94a3b8", fontSize:"0.75rem" }}>{w.eventName || "Following All Upcoming Registrations"}</div>
                </div>
                <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
                  <span style={{ color:"#4ade80", fontWeight:"bold", fontSize:"0.76rem" }}>{w.finalResult || [w.lastMat, w.lastTime].filter(Boolean).join(" • ") || "Tracking Live"}</span>
                  {onOpenAthlete && w.eventId && <button onClick={() => onOpenAthlete(w)} style={{ background:"#162536", color:"#38bdf8", border:"1px solid #0284c7", borderRadius:"5px", padding:"4px 8px", fontSize:"0.72rem", fontWeight:"bold", cursor:"pointer" }}>Bracket</button>}
                  {onRemoveWatch && <button onClick={() => onRemoveWatch(w)} title="Stop watching" style={{ background:"#2a1215", color:"#fca5a5", border:"1px solid #ef4444", borderRadius:"5px", padding:"4px 7px", fontSize:"0.72rem", cursor:"pointer" }}>✕</button>}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ color:"#fbbf24", fontWeight:"800", fontSize:"0.8rem", marginBottom:"6px" }}>⏳ THIS WEEKEND &amp; NEXT 14 DAYS ({upcoming.length})</div>
        <div style={{ display:"grid", gap:"7px" }}>
          {upcoming.map(ev => {
            const b = getDeadlineBadge(ev);
            return (
              <div key={ev.id} style={{ background:"#182030", border:"1px solid #2d3748", borderRadius:"8px", padding:"9px 11px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                <div>
                  <div style={{ fontWeight:"bold", fontSize:"0.88rem", color:"#fff" }}>{ev.name}</div>
                  <div style={{ fontSize:"0.76rem", color:"#94a3b8" }}>{ev.date} • {ev.location}</div>
                  {b && <span style={{ display:"inline-block", marginTop:"4px", background:b.bg, color:b.color, border:"1px solid " + b.border, borderRadius:"4px", padding:"2px 6px", fontSize:"0.7rem", fontWeight:"bold" }}>{b.text}</span>}
                </div>
                <button onClick={() => onOpenEvent(ev)} style={{ background:"#38bdf8", color:"#000", border:"none", borderRadius:"6px", padding:"6px 10px", fontSize:"0.76rem", fontWeight:"bold", cursor:"pointer" }}>Brackets</button>
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
    const color = f.type === "SuperFight" ? "#14b8a6" : f.type === "Seminar" ? "#a855f7" : "#ff9f43";
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
        <div style={{ marginTop:"12px", paddingTop:"10px", borderTop:"1px solid #1e293b", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"8px", fontSize:"0.76rem", color:"#94a3b8" }}>
          <span>Need deeper historical match-by-match W/L records?</span>
          <a href="https://jits.gg" target="_blank" rel="noopener noreferrer" onClick={() => trackEvent("jitsGgOutclicks")} style={{ color:"#38bdf8", fontWeight:"800", textDecoration:"none" }}>📊 Scout Youth Records on Jits ↗</a>
        </div>
      </div>
    </div>
  );
}

const lookupNormGym = (raw) => {
  const k = foldStr(raw || "").replace(/[^a-z0-9]/g, "");
  if (k.startsWith("aoj") || k.startsWith("artofjiujitsu")) return "artofjiujitsu";
  if (k.startsWith("atoshq") || k === "atosjiujitsuhq" || k === "atosjiujitsu") return "atos";
  if (k === "tmcombat" || k === "thiagomendescombatacademy" || k === "carlsongraciejiujitsusanantonio" || k === "carlsongraciesanantoniotx") return "carlsongraciesanantonio";
  return k;
};
const lookupGymBucket = (gk) => {
  const c = (gk || "").replace(/[^a-z0-9]/g, "");
  return (c.slice(0, 2) || "00").padEnd(2, "0");
};

export function UniversalAthleteLookupModal({ events, onClose, onOpenBracket }) {
  useEffect(() => { trackEvent("athleteSearches"); }, []);
  const [qStr, setQStr] = useState("");
  const [regItems, setRegItems] = useState([]);
  const [claimedBios, setClaimedBios] = useState([]);
  const [gymRows, setGymRows] = useState([]);
  const [podShards, setPodShards] = useState({});
  const [gymShards, setGymShards] = useState({});
  const [watchPick, setWatchPick] = useState(null);
  const [trophyPick, setTrophyPick] = useState(null);
  const { getWatch } = useWatchedAthletes();
  const evMap = useMemo(() => Object.fromEntries((events || []).map(e => [e.id, e])), [events]);

  useEffect(() => {
    getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__athlete_index__"))).then(sn => {
      const a = []; sn.forEach(d => a.push(...((d.data() || {}).items || []))); setRegItems(a);
    }).catch(() => {});

    getDocs(query(collection(db, "mat_watches"), where("kind", "==", "athlete_bio"))).then(sn => {
      setClaimedBios(sn.docs.map(d => d.data()).filter(x => x && x.name));
    }).catch(() => {});

    getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__global_leaderboard__"))).then(sn => {
      const g = [];
      sn.forEach(d => {
        const dt = d.data() || {};
        if (Array.isArray(dt.items)) g.push(...dt.items);
        else if (dt.Academy) g.push(dt);
      });
      setGymRows(g);
    }).catch(() => {});
  }, []);

  // 1. Fetch ALL candidate 2-letter athlete shards (handles compound Brazilian surnames & aliases!)
  useEffect(() => {
    if (qStr.trim().length < 2) return;
    const bkts = athBucketsForQuery(qStr);
    bkts.forEach(bkt => {
      if (podShards[bkt]) return;
      setPodShards(p => ({ ...p, [bkt]: [] }));
      getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__a2_" + bkt + "__"))).then(sn => {
        const a = []; sn.forEach(d => a.push(...((d.data() || {}).items || [])));
        setPodShards(p => ({ ...p, [bkt]: a }));
      }).catch(() => {});
    });
  }, [qStr]);

  // 2. Also detect matching Academies (e.g. "Carlson Gracie San Antonio", "Northern Tribe", "AOJ") and fetch their __m2_XX__ team medal shard!
  const matchingGyms = useMemo(() => {
    const q = foldStr(qStr).trim();
    if (q.length < 3 || !gymRows.length) return [];
    const terms = q.split(/\s+/).filter(Boolean);
    const byK = new Map();
    gymRows.forEach(r => {
      const ac = r.Academy || "";
      const low = foldStr(ac);
      if (!low.includes(q) && !terms.every(t => low.includes(t))) return;
      const gk = lookupNormGym(ac);
      if (!byK.has(gk)) byK.set(gk, { key: gk, Academy: ac, Gold: 0, Silver: 0, Bronze: 0 });
      const cur = byK.get(gk);
      if (ac.length > cur.Academy.length) cur.Academy = ac;
      cur.Gold += Number(r.Gold || 0);
      cur.Silver += Number(r.Silver || 0);
      cur.Bronze += Number(r.Bronze || 0);
    });
    return Array.from(byK.values()).sort((a, b) => (b.Gold * 9 + b.Silver * 3 + b.Bronze) - (a.Gold * 9 + a.Silver * 3 + a.Bronze)).slice(0, 4);
  }, [qStr, gymRows]);

  useEffect(() => {
    matchingGyms.forEach(g => {
      const gb = lookupGymBucket(g.key);
      if (gymShards[gb]) return;
      setGymShards(p => ({ ...p, [gb]: [] }));
      getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__m2_" + gb + "__"))).then(sn => {
        const a = []; sn.forEach(d => a.push(...((d.data() || {}).items || [])));
        setGymShards(p => ({ ...p, [gb]: a }));
      }).catch(() => {});
    });
  }, [matchingGyms]);

  const regHits = useMemo(() => {
    if (qStr.trim().length < 2) return [];
    return regItems.filter(x => smartAthleteMatch(x.n, x.a, qStr)).slice(0, 40);
  }, [regItems, qStr]);

  const podProfiles = useMemo(() => {
    if (qStr.trim().length < 2) return [];
    const map = new Map();

    const ensureProfile = (nm, ac, extra = {}) => {
      const pro = findProAthlete(nm);
      const displayNm = pro ? pro.name : nm;
      const displayAc = (pro && pro.academy) ? pro.academy : (ac || "");
      const pk = canonicalPersonKey(displayNm, displayAc);
      if (!map.has(pk)) {
        map.set(pk, {
          name: displayNm,
          academy: displayAc,
          g: 0, s: 0, b: 0,
          events: [],
          proTitles: pro ? pro.titles : extra.proTitles || null,
          claimed: Boolean(extra.claimed),
          seen: new Set()
        });
      }
      const rec = map.get(pk);
      if (extra.claimed) rec.claimed = true;
      if (!pro && (ac || "").length > (rec.academy || "").length && !/^(carlson gracie team|gracie barra|alliance|checkmat|atos)$/i.test((ac || "").trim())) {
        rec.academy = ac;
      } else if (!rec.academy && ac) {
        rec.academy = ac;
      }
      return rec;
    };

    // A. Seed matching Claimed Athlete Bios (so claimed teammates ALWAYS show up!)
    claimedBios.forEach(b => {
      if (smartAthleteMatch(b.name + " " + (b.nickname || ""), b.academy, qStr)) {
        ensureProfile(b.name, b.academy || "", { claimed: true });
      }
    });

    // B. Seed matching Pro / Invitational Stars
    PRO_SUPERFIGHTS.forEach(p => {
      if (smartAthleteMatch(p.name, p.academy, qStr)) {
        ensureProfile(p.name, p.academy, { proTitles: p.titles });
      }
    });

    // C. Merge multi-shard Athlete podium rows + matching Academy team shard rows (deduplicated!)
    const combinedRows = [];
    athBucketsForQuery(qStr).forEach(b => { if (podShards[b]) combinedRows.push(...podShards[b]); });
    const matchedGymKeys = new Set(matchingGyms.map(g => g.key));
    matchingGyms.forEach(g => {
      const gb = lookupGymBucket(g.key);
      (gymShards[gb] || []).forEach(m => {
        if (matchedGymKeys.has(lookupNormGym(m.a))) combinedRows.push(m);
      });
    });

    combinedRows.forEach(m => {
      const fromMatchedGym = matchedGymKeys.has(lookupNormGym(m.a));
      if (!fromMatchedGym && !smartAthleteMatch(m.n, m.a, qStr)) return;
      const rec = ensureProfile(m.n, m.a);
      const dk = foldStr(m.ev) + "|" + foldStr(m.d) + "|" + m.p;
      if (rec.seen.has(dk)) return;
      rec.seen.add(dk);
      if (m.mg !== undefined || m.ms !== undefined || m.mb !== undefined) {
        rec.g += Number(m.mg || 0); rec.s += Number(m.ms || 0); rec.b += Number(m.mb || 0);
      } else {
        const p = Number(m.p || 3);
        if (p === 1) rec.g++; else if (p === 2) rec.s++; else rec.b++;
      }
      rec.events.push(m);
    });

    return Array.from(map.values())
      .sort((a, b) => (b.claimed ? 4 : 0) + (b.g * 9 + b.s * 3 + b.b) + (b.proTitles ? 15 : 0) - ((a.claimed ? 4 : 0) + (a.g * 9 + a.s * 3 + a.b) + (a.proTitles ? 15 : 0)))
      .slice(0, 45);
  }, [qStr, podShards, gymShards, matchingGyms, claimedBios]);

  const openFollow = (nm, ac, ev, div) => setWatchPick({
    ev: ev || { id: "", name: "All Upcoming Tournaments", link: "https://matdates.com/?athlete=" + encodeURIComponent(nm).replace(/%20/g, "+"), sort_date: "" },
    comp: { Name: nm, Academy: ac || "", Division: div || "" }, div: div || ""
  });

  const trimmedQ = qStr.trim();
  const alreadyWatched = Boolean(
    trimmedQ.length >= 2 && (
      getWatch(trimmedQ) ||
      podProfiles.some(p => foldStr(p.name) === foldStr(trimmedQ) && getWatch(p.name)) ||
      regHits.some(r => foldStr(r.n) === foldStr(trimmedQ) && getWatch(r.n))
    )
  );

  return (
    <div onClick={onClose} style={{ ...MODAL_BG, alignItems: "flex-start", paddingTop: "12px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#111622", border:"1px solid #334155", borderRadius:"12px", maxWidth:"640px", width:"100%", maxHeight:"90dvh", overflowY:"auto", WebkitOverflowScrolling:"touch", padding:"15px", color:"#fff", textAlign:"left" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
          <h3 style={{ margin:0, fontSize:"1.08rem" }}>🔍 Universal Athlete &amp; Team Lookup</h3>
          <button onClick={onClose} style={{ background:"#1e293b", color:"#fff", border:"1px solid #334155", borderRadius:"6px", padding:"4px 10px", cursor:"pointer" }}>✕</button>
        </div>
        <input
          autoFocus
          enterKeyHint="search"
          value={qStr}
          onChange={e => setQStr(e.target.value)}
          placeholder="Search ANY athlete or academy (e.g. Carlson Gracie San Antonio, Cassia Moura, Tainan)..."
          style={{ width:"100%", padding:"11px 13px", borderRadius:"8px", background:"#182030", color:"#fff", border:"1.5px solid #38bdf8", fontSize:"0.92rem", boxSizing:"border-box", marginBottom:"10px" }}
        />
        {trimmedQ.length < 2 ? (
          <div style={{ color:"#94a3b8", fontSize:"0.83rem", lineHeight:1.45 }}>
            Type any <b>athlete name</b> or <b>academy name</b> — view every teammate&apos;s verified Trophy Room, upcoming brackets, or tap <b>🔔 Watch</b> for live tournament alerts!
          </div>
        ) : (
          <div style={{ display:"grid", gap:"8px" }}>
            {matchingGyms.length > 0 && (
              <div style={{ background:"#172032", border:"1px solid #f59e0b", borderRadius:"8px", padding:"8px 11px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                <div style={{ fontSize:"0.8rem" }}>
                  <span style={{ color:"#fbbf24", fontWeight:"800" }}>🏛️ TEAM ROSTER LOADED:</span> <b>{matchingGyms[0].Academy}</b>
                  <span style={{ color:"#cbd5e1", marginLeft:"6px" }}>(🥇{matchingGyms[0].Gold} 🥈{matchingGyms[0].Silver} 🥉{matchingGyms[0].Bronze})</span>
                </div>
                <a href={"/?gym=" + encodeURIComponent(matchingGyms[0].key)} style={{ background:"#f59e0b", color:"#000", padding:"4px 9px", borderRadius:"6px", fontWeight:"800", fontSize:"0.74rem", textDecoration:"none" }}>Team Trophy Room →</a>
              </div>
            )}

            {podProfiles.length > 0 && <div style={{ color:"#fbbf24", fontWeight:"bold", fontSize:"0.78rem", marginTop:"2px" }}>🏆 VERIFIED PROFILES &amp; TROPHY ROOMS ({podProfiles.length})</div>}
            {podProfiles.map((p, i) => (
              <div key={"p"+i} onClick={() => { document.activeElement?.blur?.(); setTrophyPick(p); }} style={{ background:"#182030", border:"1px solid #334155", borderRadius:"8px", padding:"9px 11px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap", cursor:"pointer" }}>
                <div style={{ minWidth:0, flex:"1 1 200px" }}>
                  <div>
                    <b style={{ textDecoration:"underline", textDecorationColor:"rgba(251,191,36,0.5)" }}>{p.name}</b>
                    {p.academy && <span style={{ color:"#ff9f43", fontSize:"0.78rem" }}> • {p.academy}</span>}
                  </div>
                  <div style={{ fontSize:"0.76rem", color:"#cbd5e1" }}>
                    🥇{p.g} 🥈{p.s} 🥉{p.b} {p.proTitles ? " • " + p.proTitles[0] : ""}
                  </div>
                </div>
                <div style={{ display:"flex", gap:"6px" }} onClick={e => e.stopPropagation()}>
                  <button type="button" onClick={() => { document.activeElement?.blur?.(); setTrophyPick(p); }} style={{ background:"#f59e0b", color:"#000", border:"none", borderRadius:"6px", padding:"5px 9px", fontSize:"0.74rem", fontWeight:"800", cursor:"pointer" }}>🏆 Trophy Room</button>
                  <button type="button" onClick={() => openFollow(p.name, p.academy)} style={{ background: getWatch(p.name) ? "#132a1c" : "#162536", color: getWatch(p.name) ? "#2ecc71" : "#38bdf8", border:"1px solid #0284c7", borderRadius:"6px", padding:"5px 9px", fontSize:"0.74rem", fontWeight:"bold", cursor:"pointer" }}>{getWatch(p.name) ? "✓ Watching" : "🔔 Watch"}</button>
                </div>
              </div>
            ))}

            {regHits.length > 0 && <div style={{ color:"#4ade80", fontWeight:"bold", fontSize:"0.78rem", marginTop:"4px" }}>🟢 LIVE UPCOMING REGISTRATIONS ({regHits.length})</div>}
            {regHits.map((r, i) => {
              const ev = evMap[r.e] || { id: r.e, name: "Upcoming Event" };
              return (
                <div key={"r"+i} style={{ background:"#182030", border:"1px solid #22c55e", borderRadius:"8px", padding:"9px 11px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                  <div style={{ minWidth:0, flex:"1 1 200px" }}>
                    <div><b onClick={() => setTrophyPick({ name: r.n, academy: r.a, g: 0, s: 0, b: 0, events: [] })} style={{ cursor:"pointer", textDecoration:"underline", textDecorationColor:"rgba(56,189,248,0.5)" }}>{r.n}</b> <span style={{ color:"#ff9f43", fontSize:"0.78rem" }}>• {r.a}</span></div>
                    <div style={{ fontSize:"0.76rem", color:"#cbd5e1" }}>{ev.name} {ev.date ? <span style={{ color:"#fbbf24", fontWeight:"bold" }}>• 📅 {ev.date}</span> : null} • {r.d}</div>
                  </div>
                  <div style={{ display:"flex", gap:"6px" }}>
                    <button type="button" onClick={() => openFollow(r.n, r.a, ev, r.d)} style={{ background: getWatch(r.n, ev.id) ? "#132a1c" : "#162536", color: getWatch(r.n, ev.id) ? "#2ecc71" : "#38bdf8", border:"1px solid #0284c7", borderRadius:"6px", padding:"5px 9px", fontSize:"0.74rem", fontWeight:"bold", cursor:"pointer" }}>{getWatch(r.n, ev.id) ? "✓ Watching" : "🔔 Watch"}</button>
                    <button type="button" onClick={() => onOpenBracket(ev, r.n)} style={{ background:"#38bdf8", color:"#000", border:"none", borderRadius:"6px", padding:"5px 9px", fontSize:"0.74rem", fontWeight:"bold", cursor:"pointer" }}>Bracket →</button>
                  </div>
                </div>
              );
            })}

            <div style={{ background:"#151d2b", border:"1px dashed #38bdf8", borderRadius:"8px", padding:"10px 12px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
              <span style={{ fontSize:"0.78rem", color:"#cbd5e1" }}>
                {podProfiles.length === 0 && regHits.length === 0
                  ? <>Don&apos;t see <b>{trimmedQ}</b> yet? Open their Trophy Room or Watch for future brackets:</>
                  : <>Want alerts for every future tournament <b>{trimmedQ}</b> enters?</>}
              </span>
              <div style={{ display:"flex", gap:"6px" }}>
                {podProfiles.length === 0 && (
                  <button type="button" onClick={() => setTrophyPick({ name: trimmedQ, academy: "", g: 0, s: 0, b: 0, events: [] })} style={{ background:"#f59e0b", color:"#000", border:"none", borderRadius:"6px", padding:"6px 10px", fontSize:"0.75rem", fontWeight:"800", cursor:"pointer" }}>🏆 Open Trophy Room</button>
                )}
                <button type="button" onClick={() => openFollow(trimmedQ, "")} style={{ background: alreadyWatched ? "#132a1c" : "#0284c7", color: alreadyWatched ? "#2ecc71" : "#fff", border:"none", borderRadius:"6px", padding:"6px 11px", fontSize:"0.75rem", fontWeight:"800", cursor:"pointer" }}>
                  {alreadyWatched ? "✓ Watching Future Brackets" : "🔔 Watch Athlete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {watchPick && <MatAlertModal event={watchPick.ev} comp={watchPick.comp} division={watchPick.div} onClose={() => setWatchPick(null)} />}
        {trophyPick && <AthleteTrophyRoomModal athlete={trophyPick} onClose={() => setTrophyPick(null)} isWatching={Boolean(getWatch(trophyPick.name))} onWatch={(nm, ac) => openFollow(nm, ac)} />}
      </div>
    </div>
  );
}
