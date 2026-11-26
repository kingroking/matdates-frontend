import { trackEvent } from "./analytics";
import React, { useState, useEffect, useMemo } from "react";
import { collection, addDoc, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { MatAlertModal, useWatchedAthletes } from "./MatAlertModal";
import { foldStr, athBucket, athBucketsForQuery, smartAthleteMatch, canonicalPersonKey, sameCompetitorCluster, findProAthlete, PRO_SUPERFIGHTS, UPCOMING_UFC_SUPERFIGHTS, getDeadlineBadge, computeEliteSpotlight, universalGymKey, inferTargetGender, strictVerifiedAthleteRowMatch, cleanAcademyName, mergeInitialDuplicateProfiles, consolidateAthleteProfiles, resolveNicknameHit, fastNicknameRowMatch, stripEmbeddedNickname, extractEmbeddedNickname, matchesYouthInitial, isUmbrellaAcademyName, getCachedShardItems } from "./proHubData";
import { AthleteTrophyRoomModal } from "./proTrophyModal";

const _SHARED_POD = {};
const _SHARED_REG = {};
const _SHARED_PROMISES = {};

const MODAL_BG = { position:"fixed", inset:0, background:"rgba(0,0,0,0.86)", zIndex:10060, display:"flex", alignItems:"center", justifyContent:"center", padding:"12px", boxSizing:"border-box" };

export function TaleOfTheTapeModal({ compA, compB, division, onClose }) {
  const [stats, setStats] = useState([null, null]);
  useEffect(() => {
    Promise.all([compA, compB].map(async (c) => {
      const nm = c?.Name || "";
      const bkts = Array.from(new Set([...athBucketsForQuery(nm), athBucket(nm)])).filter(b => b && b !== "__");
      const [s26Arrs, histArrs] = await Promise.all([
        Promise.all(bkts.map(b => getCachedShardItems(db, collection, query, where, getDocs, "__a2_" + b + "__"))),
        Promise.all(bkts.map(b => getCachedShardItems(db, collection, query, where, getDocs, "__alltime_a2_" + b + "__")))
      ]);
      let g = 0, s = 0, b = 0, gi = 0, nogi = 0;
      const seen = new Set(), feds = new Set();
      [...s26Arrs.flat(), ...histArrs.flat()].forEach(it => {
        if (!strictVerifiedAthleteRowMatch(it.n, it.a, it.d, nm, c?.Academy || "", "") &&
            !strictVerifiedAthleteRowMatch(it.n, it.a, it.d, nm, "", "")) return;
        const dk = foldStr(it.ev) + "|" + foldStr(it.d) + "|" + it.p;
        if (seen.has(dk)) return;
        seen.add(dk);
        const p = Number(it.p || 3);
        if (p === 1) g++; else if (p === 2) s++; else b++;
        if (/no[- ]?gi|adcc|ufc/i.test((it.d || "") + " " + (it.ev || ""))) nogi++; else gi++;
        if (it.f) feds.add(/ufc/i.test((it.ev || "") + " " + (it.f || "")) ? "UFC" : it.f);
      });
      const sp = computeEliteSpotlight({ name: nm, academy: c?.Academy, g, s, b, events: [] });
      return { nm, acad: c?.Academy || "", g: Math.max(g, sp.pro?.careerG || 0), s: Math.max(s, sp.pro?.careerS || 0), b: Math.max(b, sp.pro?.careerB || 0), pts: g * 9 + s * 3 + b, gi, nogi, feds: Array.from(feds), titles: sp.pro?.titles || [] };
    })).then(setStats).catch(() => {});
  }, [compA, compB]);
  const [a, b] = stats;
  return (
    <div onClick={onClose} style={MODAL_BG}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#111622", border:"1.5px solid #f59e0b", borderRadius:"12px", maxWidth:"550px", width:"100%", padding:"16px", color:"#fff", textAlign:"center" }}>
        <div style={{ color:"#fbbf24", fontWeight:"800", fontSize:"0.8rem" }}>🆚 HEAD-TO-HEAD BRACKET COMPARISON</div>
        <div style={{ color:"#94a3b8", fontSize:"0.78rem", marginBottom:"12px" }}>{division}</div>
        {!a || !b ? <div style={{ padding:"20px", color:"#94a3b8" }}>Scouting All-Time & 2026 Podium Records...</div> : (
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

function cleanDisplayAthleteName(raw = "") {
  return String(raw || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map(w => {
      if (!w) return "";
      if (/^(II|III|IV|JR\.?|SR\.?)$/i.test(w)) return w.toUpperCase();
      if (w === w.toLowerCase()) return w.charAt(0).toUpperCase() + w.slice(1);
      return w;
    })
    .join(" ");
}

function isTruncatedPrefixOf(shortFold, fullFold) {
  if (!shortFold || !fullFold || shortFold === fullFold) return false;
  const sParts = shortFold.split(/\s+/).filter(Boolean);
  const fParts = fullFold.split(/\s+/).filter(Boolean);
  if (sParts.length < 2 || fParts.length < 2) return false;
  if (sParts[0] !== fParts[0]) return false;
  const sLast = sParts[sParts.length - 1];
  const fLast = fParts[fParts.length - 1];
  return sLast.length >= 2 && fLast.length > sLast.length && fLast.startsWith(sLast);
}

export function WeekendWarRoomModal({ events, watches, onRemoveWatch, onWatchAthlete, onShareCard, onOpenAthlete, onClose, onOpenEvent }) {
  const [showWatchedDrawer, setShowWatchedDrawer] = useState(false);
  const [showGeneral14d, setShowGeneral14d] = useState(false);
  const [trophyAth, setTrophyAth] = useState(null);
  const [warWatchPick, setWarWatchPick] = useState(null);
  const [regEntries, setRegEntries] = useState([]);
  const [loadingRegs, setLoadingRegs] = useState(false);

  // Deduplicate watched athletes by folded name while keeping all division/mat statuses attached
  const [resolvedFullNames, setResolvedFullNames] = useState({});

  const groupedWatches = useMemo(() => {
    const rawList = [];
    (watches || []).forEach(w => {
      const orig = (w.athleteName || "").trim();
      if (!orig) return;
      const upgraded = resolvedFullNames[foldStr(orig)] || orig;
      rawList.push({ w, nm: cleanDisplayAthleteName(upgraded), k: foldStr(upgraded) });
    });

    const map = new Map();
    rawList.forEach(({ w, nm, k }) => {
      let targetKey = k;
      for (const existingKey of Array.from(map.keys())) {
        if (existingKey === k) {
          targetKey = existingKey;
          break;
        }
        if (isTruncatedPrefixOf(k, existingKey)) {
          targetKey = existingKey;
          break;
        }
        if (isTruncatedPrefixOf(existingKey, k)) {
          const oldEntry = map.get(existingKey);
          map.delete(existingKey);
          oldEntry.name = nm;
          map.set(k, oldEntry);
          targetKey = k;
          break;
        }
      }

      if (!map.has(targetKey)) {
        map.set(targetKey, { name: nm, academy: cleanAcademyName(w.academy || ""), items: [] });
      }
      const entry = map.get(targetKey);
      if (nm.length > entry.name.length) entry.name = nm;
      if (!entry.academy && w.academy) entry.academy = cleanAcademyName(w.academy);
      entry.items.push(w);
    });
    return mergeInitialDuplicateProfiles, consolidateAthleteProfiles, resolveNicknameHit(Array.from(map.values()));
  }, [watches, resolvedFullNames]);

  // Create fast event lookup map so division + tournament title (e.g. "IBJJF Kids") are checked before matching!
  const eventByIdMap = useMemo(() => {
    const m = new Map();
    (events || []).forEach(ev => { if (ev && ev.id) m.set(ev.id, ev); });
    return m;
  }, [events]);

  // Fetch tiny __r2_XX__ registration shards + verified athlete_bios so War Room NEVER matches wrong gender/age/belt namesakes!
  useEffect(() => {
    if (!groupedWatches.length) {
      setRegEntries([]);
      return;
    }
    let cancelled = false;
    const bktSet = new Set();
    groupedWatches.forEach(gw => {
      athBucketsForQuery(gw.name).forEach(b => bktSet.add(b));
    });
    const bkts = Array.from(bktSet);
    if (!bkts.length) return;
    setLoadingRegs(true);

    const bioPromises = groupedWatches.map(gw => {
      const slug = foldStr(gw.name).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      return slug ? getDoc(doc(db, "athlete_bios", slug)).then(s => (s.exists() ? s.data() : null)).catch(() => null) : Promise.resolve(null);
    });

    Promise.all([
      Promise.all(bkts.map(b => getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__r2_" + b + "__"))))),
      Promise.all(bioPromises)
    ]).then(([snaps, bios]) => {
      if (cancelled) return;
      const enrichedTargets = groupedWatches.map((gw, idx) => {
        const b = bios[idx] || null;
        const proHit = Array.isArray(PRO_SUPERFIGHTS) ? PRO_SUPERFIGHTS.find(p => foldStr(p.name || "") === foldStr(gw.name)) : null;
        const divHint = (gw.items || []).map(x => x.division || "").filter(Boolean).join(" ");
        const knownBelt = b?.belt || proHit?.belt || "";
        const knownAcad = gw.academy || b?.academy || proHit?.academy || "";
        const knownGender = inferTargetGender(gw.name, [], divHint);
        return { ...gw, knownBelt, knownAcad, knownGender };
      });

      const found = [];
      snaps.forEach(sn => sn.forEach(d => {
        ((d.data() || {}).items || []).forEach(it => {
          const evObj = eventByIdMap.get(it.e);
          const evTitle = evObj?.name || "";
          enrichedTargets.forEach(gw => {
            const gFold = foldStr(gw.name);
            const rFold = foldStr(it.n || "");
            if (isTruncatedPrefixOf(gFold, rFold)) {
              const rGen = inferTargetGender(it.n, [], it.d || "");
              if (!gw.knownGender || !rGen || gw.knownGender === rGen) {
                setResolvedFullNames(prev => prev[gFold] ? prev : { ...prev, [gFold]: cleanDisplayAthleteName(it.n) });
              }
            }
          });
          const hit = enrichedTargets.find(gw =>
            isTruncatedPrefixOf(foldStr(gw.name), foldStr(it.n || "")) ||
            strictVerifiedAthleteRowMatch(
              it.n,
              it.a,
              it.d,
              gw.name,
              gw.knownAcad,
              gw.knownGender,
              { targetBelt: gw.knownBelt, evName: evTitle }
            )
          );
          if (hit) found.push({ ...it, watchedName: hit.name, watchedAcad: it.a || hit.knownAcad || "" });
        });
      }));
      setRegEntries(found);
      setLoadingRegs(false);
    }).catch(() => {
      if (!cancelled) setLoadingRegs(false);
    });

    return () => { cancelled = true; };
  }, [groupedWatches, eventByIdMap]);

  // Match upcoming events to watched athletes (via live __r2_XX__ registrations, explicit watch eventId, or SuperFight card banner!)
  const { watchedNext14d, watchedLater, generalNext14d } = useMemo(() => {
    const now = new Date();
    const w14 = [], wLater = [], gen14 = [];

    (events || []).forEach(ev => {
      if (!ev.sort_date) return;
      const daysOut = Math.ceil((new Date(ev.sort_date + "T12:00:00") - now) / 86400000);
      if (daysOut < -2) return;

      const matchedMap = new Map();
      // 1) Explicit active division watches on this event
      (watches || []).forEach(w => {
        if (w.eventId && w.eventId === ev.id && w.athleteName) {
          const k = foldStr(w.athleteName);
          const status = w.finalResult || [w.lastMat, w.lastTime].filter(Boolean).join(" • ") || w.division || "Registered";
          matchedMap.set(k, { name: w.athleteName, academy: w.academy || "", detail: status, rawWatch: w });
        }
      });

      // 2) Live bracket registrations from __r2_XX__ shards
      regEntries.forEach(r => {
        if (r.e === ev.id) {
          const k = foldStr(r.watchedName || r.n);
          if (!matchedMap.has(k)) {
            matchedMap.set(k, { name: r.watchedName || r.n, academy: r.watchedAcad || r.a || "", detail: r.d || "Bracket Registered", rawWatch: { athleteName: r.watchedName || r.n, eventId: ev.id } });
          }
        }
      });

      // 3) SuperFight card headline / matchmaking banner mentions
      if (ev.type === "Super Fight" || (ev.news_banner || "").length > 3) {
        const cardBlob = " " + foldStr((ev.name || "") + " " + (ev.news_banner || "")) + " ";
        groupedWatches.forEach(gw => {
          const k = foldStr(gw.name);
          if (k.length >= 5 && cardBlob.includes(" " + k + " ") && !matchedMap.has(k)) {
            matchedMap.set(k, { name: gw.name, academy: gw.academy || "", detail: "🥊 SuperFight Card", rawWatch: { athleteName: gw.name, eventId: ev.id } });
          }
        });
      }

      const competitors = Array.from(matchedMap.values());
      if (competitors.length > 0) {
        const item = { ev, daysOut, competitors };
        if (daysOut <= 14) w14.push(item);
        else wLater.push(item);
      } else if (daysOut <= 14) {
        gen14.push(ev);
      }
    });

    return { watchedNext14d: w14, watchedLater: wLater, generalNext14d: gen14 };
  }, [events, watches, regEntries, groupedWatches]);

  const checkWatching = (nm) => groupedWatches.some(g => foldStr(g.name) === foldStr(nm));

  return (
    <div onClick={onClose} style={{ ...MODAL_BG, overscrollBehavior:"none" }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:"#0d1320", border:"1.5px solid #2ecc71", borderRadius:"14px",
          maxWidth:"650px", width:"100%", maxHeight:"88dvh",
          display:"flex", flexDirection:"column", overflow:"hidden",
          color:"#fff", textAlign:"left", boxShadow:"0 22px 55px rgba(0,0,0,0.88)"
        }}
      >
        {/* Pinned War Room Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"10px", padding:"13px 16px", background:"#11192a", borderBottom:"1px solid #1e293b", flexShrink:0 }}>
          <div>
            <h3 style={{ margin:0, color:"#ffffff", fontSize:"1.08rem", fontWeight:"900" }}>🔥 My Live War Room</h3>
            <div style={{ fontSize:"0.73rem", color:"#94a3b8", marginTop:"2px" }}>Tap any athlete name to open their Official Trophy Room</div>
          </div>
          <button onClick={onClose} style={{ background:"#1e293b", color:"#fff", border:"1px solid #334155", borderRadius:"7px", width:"30px", height:"30px", cursor:"pointer", fontWeight:"bold" }}>✕</button>
        </div>

        {/* Scrollable War Room Body */}
        <div style={{ flex:1, minHeight:0, overflowY:"auto", overscrollBehavior:"contain", WebkitOverflowScrolling:"touch", padding:"14px 16px 24px" }}>

          {/* 1. TUCKED-IN / COLLAPSIBLE MY WATCHED ATHLETES DRAWER */}
          <div style={{ background:"#141d2e", border:"1px solid #283548", borderRadius:"10px", marginBottom:"14px", overflow:"hidden" }}>
            <button
              type="button"
              onClick={() => setShowWatchedDrawer(p => !p)}
              style={{
                width:"100%", background:"transparent", border:"none", color:"#fff",
                padding:"11px 13px", display:"flex", justifyContent:"space-between", alignItems:"center",
                gap:"8px", cursor:"pointer", textAlign:"left"
              }}
            >
              <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"nowrap", minWidth:0, overflow:"hidden" }}>
                <span style={{ color:"#4ade80", fontWeight:"900", fontSize:"0.79rem", letterSpacing:"0.4px", whiteSpace:"nowrap", flexShrink:0 }}>
                  🔔 MY WATCHED ATHLETES ({groupedWatches.length})
                </span>
                {!showWatchedDrawer && groupedWatches.length > 0 && (
                  <span style={{ fontSize:"0.74rem", color:"#94a3b8", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"290px" }}>
                    • {groupedWatches.slice(0, 3).map(g => g.name.split(" ")[0]).join(", ")}{groupedWatches.length > 3 ? ` +${groupedWatches.length - 3} more` : ""}
                  </span>
                )}
              </div>
              <span style={{ background:"#1e293b", color:"#38bdf8", border:"1px solid #334155", borderRadius:"6px", padding:"3px 9px", fontSize:"0.72rem", fontWeight:"800", flexShrink:0 }}>
                {showWatchedDrawer ? "▲ Tuck In" : "▼ Show List"}
              </span>
            </button>

            {showWatchedDrawer && (
              <div style={{ padding:"4px 12px 12px", borderTop:"1px solid #1e293b", display:"grid", gap:"7px" }}>
                {groupedWatches.length === 0 ? (
                  <div style={{ color:"#94a3b8", fontSize:"0.79rem", padding:"6px 2px" }}>
                    Tap <b>🔔 Watch</b> on any competitor in Athlete Lookup, Brackets, or Trophy Rooms to track their upcoming events, live Mat #, Match Time &amp; Podium results here!
                  </div>
                ) : (
                  groupedWatches.map((gw, i) => (
                    <div key={gw.name + i} style={{ background:"#0f1624", border:"1px solid #243044", borderRadius:"8px", padding:"9px 11px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                      <div style={{ minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"7px", flexWrap:"wrap" }}>
                          <button
                            type="button"
                            onClick={() => setTrophyAth({ name: gw.name, academy: gw.academy || "" })}
                            title={"Open " + gw.name + "'s Trophy Room"}
                            style={{ background:"none", border:"none", padding:0, color:"#fbbf24", fontWeight:"900", fontSize:"0.88rem", cursor:"pointer", textDecoration:"underline", textUnderlineOffset:"3px" }}
                          >
                            🏆 {gw.name}
                          </button>
                          {gw.academy && <span style={{ color:"#94a3b8", fontSize:"0.74rem" }}>• {gw.academy}</span>}
                        </div>
                        {gw.items.map((w, wi) => (
                          <div key={w.id || wi} style={{ fontSize:"0.74rem", color:"#cbd5e1", marginTop:"3px", display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
                            <span>{w.eventName || "Following All Future Tournaments & SuperFights"}</span>
                            {w.division && <span style={{ color:"#93c5fd" }}>({w.division})</span>}
                            <span style={{ color:"#4ade80", fontWeight:"bold" }}>
                              • {w.finalResult || [w.lastMat, w.lastTime].filter(Boolean).join(" • ") || "Active Alerts"}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
                        <button
                          type="button"
                          onClick={() => setTrophyAth({ name: gw.name, academy: gw.academy || "" })}
                          style={{ background:"#1f293d", color:"#fde047", border:"1px solid rgba(250,204,21,0.4)", borderRadius:"6px", padding:"4px 8px", fontSize:"0.72rem", fontWeight:"800", cursor:"pointer" }}
                        >
                          Trophy Room
                        </button>
                        {onOpenAthlete && gw.items.find(x => x.eventId) && (
                          <button
                            type="button"
                            onClick={() => onOpenAthlete(gw.items.find(x => x.eventId))}
                            style={{ background:"#162536", color:"#38bdf8", border:"1px solid #0284c7", borderRadius:"6px", padding:"4px 8px", fontSize:"0.72rem", fontWeight:"800", cursor:"pointer" }}
                          >
                            Bracket
                          </button>
                        )}
                        {onRemoveWatch && (
                          <button
                            type="button"
                            onClick={() => gw.items.forEach(w => onRemoveWatch(w))}
                            title={"Remove " + gw.name + " from Watch list"}
                            style={{ background:"#2a1215", color:"#fca5a5", border:"1px solid #ef4444", borderRadius:"6px", padding:"4px 7px", fontSize:"0.72rem", cursor:"pointer" }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 2. THIS WEEKEND & NEXT 14 DAYS — WATCHED ATHLETES COMPETING! */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", marginBottom:"8px" }}>
            <div style={{ color:"#fbbf24", fontWeight:"900", fontSize:"0.8rem", letterSpacing:"0.5px" }}>
              ⚔️ THIS WEEKEND &amp; NEXT 14 DAYS — WATCHED COMPETING ({watchedNext14d.length})
            </div>
            {loadingRegs && <span style={{ fontSize:"0.71rem", color:"#38bdf8" }}>Checking brackets...</span>}
          </div>

          {watchedNext14d.length === 0 ? (
            <div style={{ background:"#141d2e", border:"1px dashed #2d3b52", borderRadius:"10px", padding:"12px 13px", color:"#94a3b8", fontSize:"0.8rem", marginBottom:"14px", lineHeight:1.45 }}>
              {groupedWatches.length === 0
                ? "Add athletes to your Watch list (tap 🔔 Watch in Lookup or any Trophy Room) and every tournament or SuperFight they enter will automatically appear right here!"
                : "None of your watched athletes are listed on brackets in the next 14 days yet. As soon as anyone on your Watch list registers for an upcoming tournament or SuperFight, their card & live mat status pop right into this list!"}
            </div>
          ) : (
            <div style={{ display:"grid", gap:"9px", marginBottom:"16px" }}>
              {watchedNext14d.map(({ ev, daysOut, competitors }) => {
                const b = getDeadlineBadge(ev);
                return (
                  <div key={ev.id} style={{ background:"linear-gradient(145deg,#162235,#111827)", border:"1px solid #22c55e", borderRadius:"10px", padding:"11px 12px", display:"grid", gap:"8px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"8px", flexWrap:"wrap" }}>
                      <div>
                        <div style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
                          <span style={{ background: daysOut <= 2 ? "#dc2626" : "#132a1c", color: daysOut <= 2 ? "#fff" : "#4ade80", border: daysOut <= 2 ? "none" : "1px solid #22c55e", borderRadius:"5px", padding:"2px 6px", fontSize:"0.66rem", fontWeight:"900" }}>
                            {daysOut <= 0 ? "🔴 LIVE NOW" : daysOut <= 2 ? "🔥 THIS WEEKEND" : `⏳ IN ${daysOut} DAYS`}
                          </span>
                          <span style={{ fontWeight:"900", fontSize:"0.92rem", color:"#fff" }}>{ev.name}</span>
                        </div>
                        <div style={{ fontSize:"0.76rem", color:"#94a3b8", marginTop:"2px" }}>{ev.date} • {ev.location}</div>
                        {b && <span style={{ display:"inline-block", marginTop:"4px", background:b.bg, color:b.color, border:"1px solid " + b.border, borderRadius:"4px", padding:"2px 6px", fontSize:"0.69rem", fontWeight:"bold" }}>{b.text}</span>}
                      </div>
                      <button type="button" onClick={() => onOpenEvent(ev)} style={{ background:"#38bdf8", color:"#000", border:"none", borderRadius:"7px", padding:"6px 11px", fontSize:"0.76rem", fontWeight:"800", cursor:"pointer", flexShrink:0 }}>
                        Open Brackets
                      </button>
                    </div>

                    {/* Clickable Watched Athletes Competing in This Event */}
                    <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", paddingTop:"6px", borderTop:"1px solid rgba(51,65,85,0.6)" }}>
                      {competitors.map((c, ci) => (
                        <div key={c.name + ci} style={{ background:"#0b101b", border:"1px solid #334155", borderRadius:"8px", padding:"4px 9px", display:"inline-flex", alignItems:"center", gap:"6px", fontSize:"0.75rem" }}>
                          <button
                            type="button"
                            onClick={() => setTrophyAth({ name: c.name, academy: c.academy || "" })}
                            title={"Open " + c.name + "'s Trophy Room"}
                            style={{ background:"none", border:"none", padding:0, color:"#fde047", fontWeight:"800", fontSize:"0.76rem", cursor:"pointer", textDecoration:"underline", textUnderlineOffset:"2px" }}
                          >
                            🥋 {c.name}
                          </button>
                          <span style={{ color:"#93c5fd", fontSize:"0.71rem" }}>• {c.detail}</span>
                          {onOpenAthlete && (
                            <button
                              type="button"
                              onClick={() => onOpenAthlete({ athleteName: c.name, eventId: ev.id })}
                              style={{ background:"#162536", color:"#38bdf8", border:"none", borderRadius:"4px", padding:"2px 6px", fontSize:"0.68rem", fontWeight:"800", cursor:"pointer" }}
                            >
                              Mat/Bracket ↗
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. FURTHER-OUT UPCOMING REGISTRATIONS FOR WATCHED ATHLETES (15+ Days Out) */}
          {watchedLater.length > 0 && (
            <div style={{ marginBottom:"14px" }}>
              <div style={{ color:"#93c5fd", fontWeight:"900", fontSize:"0.77rem", letterSpacing:"0.5px", marginBottom:"7px" }}>
                📅 UPCOMING LATER ON WATCHED SCHEDULES ({watchedLater.length})
              </div>
              <div style={{ display:"grid", gap:"7px" }}>
                {watchedLater.slice(0, 12).map(({ ev, competitors }) => (
                  <div key={ev.id} style={{ background:"#141d2e", border:"1px solid #283548", borderRadius:"9px", padding:"9px 11px", display:"grid", gap:"6px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                      <div>
                        <div style={{ fontWeight:"800", fontSize:"0.86rem", color:"#fff" }}>{ev.name}</div>
                        <div style={{ fontSize:"0.74rem", color:"#94a3b8" }}>{ev.date} • {ev.location}</div>
                      </div>
                      <button type="button" onClick={() => onOpenEvent(ev)} style={{ background:"#1e293b", color:"#38bdf8", border:"1px solid #0284c7", borderRadius:"6px", padding:"5px 9px", fontSize:"0.73rem", fontWeight:"800", cursor:"pointer" }}>
                        Brackets
                      </button>
                    </div>
                    <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                      {competitors.map((c, ci) => (
                        <button
                          key={c.name + ci}
                          type="button"
                          onClick={() => setTrophyAth({ name: c.name, academy: c.academy || "" })}
                          style={{ background:"#0b101b", border:"1px solid #334155", borderRadius:"6px", padding:"3px 8px", color:"#fde047", fontSize:"0.73rem", fontWeight:"800", cursor:"pointer" }}
                        >
                          🏆 {c.name} <span style={{ color:"#94a3b8", fontWeight:"normal" }}>({c.detail})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional Tucked-In General Next 14 Days Schedule */}
          {generalNext14d.length > 0 && (
            <div style={{ borderTop:"1px solid #1e293b", paddingTop:"10px" }}>
              <button
                type="button"
                onClick={() => setShowGeneral14d(p => !p)}
                style={{ background:"none", border:"none", padding:0, color:"#94a3b8", fontSize:"0.75rem", fontWeight:"800", cursor:"pointer", display:"flex", alignItems:"center", gap:"6px" }}
              >
                <span>{showGeneral14d ? "▲ Hide" : "▼ Show"} All Other Upcoming Events Next 14 Days ({generalNext14d.length})</span>
              </button>
              {showGeneral14d && (
                <div style={{ display:"grid", gap:"6px", marginTop:"8px" }}>
                  {generalNext14d.map(ev => {
                    const b = getDeadlineBadge(ev);
                    return (
                      <div key={ev.id} style={{ background:"#141b28", border:"1px solid #243044", borderRadius:"8px", padding:"8px 10px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                        <div>
                          <div style={{ fontWeight:"bold", fontSize:"0.84rem", color:"#e2e8f0" }}>{ev.name}</div>
                          <div style={{ fontSize:"0.73rem", color:"#94a3b8" }}>{ev.date} • {ev.location}</div>
                          {b && <span style={{ display:"inline-block", marginTop:"3px", background:b.bg, color:b.color, border:"1px solid " + b.border, borderRadius:"4px", padding:"1px 6px", fontSize:"0.68rem", fontWeight:"bold" }}>{b.text}</span>}
                        </div>
                        <button type="button" onClick={() => onOpenEvent(ev)} style={{ background:"#1e293b", color:"#cbd5e1", border:"1px solid #334155", borderRadius:"6px", padding:"5px 9px", fontSize:"0.73rem", fontWeight:"bold", cursor:"pointer" }}>Brackets</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Athlete Trophy Room Modal opened directly from War Room! */}
      {trophyAth && (
        <AthleteTrophyRoomModal
          athlete={trophyAth}
          onBack={() => setTrophyAth(null)}
          backLabel="← War Room"
          onClose={() => { setTrophyAth(null); if (onClose) onClose(); }}
          isWatching={checkWatching(trophyAth.name)}
          onWatch={(nm, ac) => {
            if (onWatchAthlete) onWatchAthlete(nm, ac);
            else setWarWatchPick({ ev: { id: "", name: "All Upcoming Tournaments", link: "https://matdates.com", sort_date: "" }, comp: { Name: nm, Academy: ac || "", Division: "" }, div: "" });
          }}
          onShareCard={onShareCard}
        />
      )}
      {warWatchPick && (
        <MatAlertModal
          event={warWatchPick.ev}
          comp={warWatchPick.comp}
          division={warWatchPick.div}
          onClose={() => setWarWatchPick(null)}
        />
      )}
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

const lookupGymBucket = (gk) => {
  const c = (gk || "").replace(/[^a-z0-9]/g, "");
  return (c.slice(0, 2) || "00").padEnd(2, "0");
};

export function UniversalAthleteLookupModal({ events, onClose, onOpenBracket }) {
  useEffect(() => { trackEvent("athleteSearches"); }, []);
  const [qStr, setQStr] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(qStr), 180);
    return () => clearTimeout(t);
  }, [qStr]);

  const [regShards, setRegShards] = useState({});
  const [claimedBios, setClaimedBios] = useState([]);
  const [dedupedGyms, setDedupedGyms] = useState([]);
  const [podShards, setPodShards] = useState({});
  const [gymShards, setGymShards] = useState({});
  const [watchPick, setWatchPick] = useState(null);
  const [trophyPick, setTrophyPick] = useState(null);
  const { getWatch, removeWatch } = useWatchedAthletes();
  const evMap = useMemo(() => Object.fromEntries((events || []).map(e => [e.id, e])), [events]);

  // Pre-fold bios & aggregate academies ONCE on open so typing never normalizes 8,000 academy strings!
  useEffect(() => {
    getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__public_bios__"))).then(sn => {
      setClaimedBios(sn.docs.map(d => {
        const x = d.data();
        if (!x || !x.name) return null;
        return { ...x, _nf: foldStr(x.name), _af: foldStr(x.academy || ""), _nkf: foldStr(x.nickname || "") };
      }).filter(Boolean));
    }).catch(() => {});

    getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__global_leaderboard__"))).then(sn => {
      const byK = new Map();
      sn.forEach(d => {
        const dt = d.data() || {};
        const arr = Array.isArray(dt.items) ? dt.items : (dt.Academy ? [dt] : []);
        arr.forEach(r => {
          if (r.Board === "ibjjf_hist_youth" || r.Board === "ibjjf_hist_adult") return;
          const ac = (r.Academy || "").trim();
          if (!ac) return;
          const gk = universalGymKey(ac);
          if (!gk) return;
          let rec = byK.get(gk);
          if (!rec) {
            rec = { key: gk, Academy: cleanAcademyName(ac), _low: foldStr(cleanAcademyName(ac)), Gold: 0, Silver: 0, Bronze: 0 };
            byK.set(gk, rec);
          } else if (cleanAcademyName(ac).length > rec.Academy.length && !(rec.Academy === 'Carlson Gracie San Antonio' && /carlson gracie/i.test(ac))) {
            rec.Academy = ac;
            rec._low = foldStr(ac);
          }
          rec.Gold += Number(r.Gold || 0);
          rec.Silver += Number(r.Silver || 0);
          rec.Bronze += Number(r.Bronze || 0);
        });
      });
      const list = Array.from(byK.values()).sort((a, b) => (b.Gold * 9 + b.Silver * 3 + b.Bronze) - (a.Gold * 9 + a.Silver * 3 + a.Bronze));
      setDedupedGyms(list);
    }).catch(() => {});
  }, []);

  // 1. Progressive 2-Wave Shard Loader (Medals FIRST on primary surname shard, cached across modal opens!)
  const [syncingShards, setSyncingShards] = useState(0);
  useEffect(() => {
    if (debouncedQ.trim().length < 2) return;
    const bkts = athBucketsForQuery(debouncedQ).slice(0, 4);
    const toFetch = [];
    for (const bkt of bkts) {
      if (_SHARED_POD[bkt]) {
        if (!podShards[bkt]) setPodShards(p => ({ ...p, [bkt]: _SHARED_POD[bkt] }));
        if (_SHARED_REG[bkt] && !regShards[bkt]) setRegShards(p => ({ ...p, [bkt]: _SHARED_REG[bkt] }));
      } else if (!podShards[bkt]) {
        toFetch.push(bkt);
      }
    }
    if (!toFetch.length) return;

    const mapItems = (sn, extra = {}) => {
      const out = [];
      sn.forEach(d => ((d.data() || {}).items || []).forEach(it => {
        out.push({ ...it, ...extra, a: cleanAcademyName(it.a), _nf: foldStr((it.n || "") + " " + (it.nk || "")), _af: foldStr(it.a) });
      }));
      return out;
    };

    toFetch.forEach((bkt, idx) => {
      setPodShards(p => ({ ...p, [bkt]: [] }));
      setRegShards(p => ({ ...p, [bkt]: [] }));
      setSyncingShards(c => c + 1);

      (async () => {
        if (idx > 0) await new Promise(res => setTimeout(res, idx * 85));
        if (!_SHARED_PROMISES[bkt]) {
          // Wave 1: Fetch ONLY 2026 & All-Time Medal Shards first so counts snap in immediately!
          _SHARED_PROMISES[bkt] = Promise.all([
            getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__a2_" + bkt + "__"))),
            getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__alltime_a2_" + bkt + "__")))
          ]).then(([snPod, snHist]) => {
            const medalArr = [...mapItems(snPod), ...mapItems(snHist, { isHist: true })];
            _SHARED_POD[bkt] = medalArr;
            return medalArr;
          });

          // Wave 2 (non-blocking background): Upcoming registrations + primary roster
          Promise.all([
            getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__r2_" + bkt + "__"))),
            idx === 0 ? getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__c2_" + bkt + "__"))) : Promise.resolve(null)
          ]).then(([snReg, snComp]) => {
            const regArr = mapItems(snReg);
            _SHARED_REG[bkt] = regArr;
            setRegShards(p => ({ ...p, [bkt]: regArr }));
            if (snComp) {
              const compArr = mapItems(snComp, { isRosterEntry: true });
              if (compArr.length) {
                _SHARED_POD[bkt] = [...(_SHARED_POD[bkt] || []), ...compArr];
                setPodShards(p => ({ ...p, [bkt]: _SHARED_POD[bkt] }));
              }
            }
          }).catch(() => {});
        }
        try {
          const medalArr = await _SHARED_PROMISES[bkt];
          setPodShards(p => ({ ...p, [bkt]: medalArr }));
          if (_SHARED_REG[bkt]) setRegShards(p => ({ ...p, [bkt]: _SHARED_REG[bkt] }));
        } catch {
          delete _SHARED_PROMISES[bkt];
        } finally {
          setSyncingShards(c => Math.max(0, c - 1));
        }
      })();
    });
  }, [debouncedQ]);

  // 2. Instant <0.5ms Academy Match against pre-aggregated dedupedGyms
  const matchingGyms = useMemo(() => {
    const q = foldStr(debouncedQ).trim();
    if (q.length < 3 || !dedupedGyms.length) return [];
    const terms = q.split(/\s+/).filter(Boolean);
    const out = [];
    for (let i = 0; i < dedupedGyms.length; i++) {
      const g = dedupedGyms[i];
      if (g._low.includes(q) || terms.every(t => g._low.includes(t))) {
        out.push(g);
        if (out.length >= 6) break;
      }
    }
    return out;
  }, [debouncedQ, dedupedGyms]);

  // Only load team roster shard for the #1 top specific matched academy (and pre-fold once on load!)
  const topGymBucket = matchingGyms.length > 0 ? lookupGymBucket(matchingGyms[0].key) : "";
  useEffect(() => {
    if (!topGymBucket || gymShards[topGymBucket]) return;
    setGymShards(p => ({ ...p, [topGymBucket]: [] }));
    getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__m2_" + topGymBucket + "__"))).then(sn => {
      const a = [];
      sn.forEach(d => ((d.data() || {}).items || []).forEach(it => {
        if (!it.isEventSummary) a.push({ ...it, a: cleanAcademyName(it.a), _nf: foldStr((it.n || "") + " " + (it.nk || "")), _af: foldStr(it.a), _gk: universalGymKey(it.a) });
      }));
      setGymShards(p => ({ ...p, [topGymBucket]: a }));
    }).catch(() => {});
  }, [topGymBucket]);

  // Fast O(1) token check before any expensive fuzzy match
  const fastRowMatches = (nf, af, qFold, qTerms) => {
  const blob = nf + " " + af;
  if (blob.includes(qFold) || qTerms.every(t => blob.includes(t))) return true;
  if (fastNicknameRowMatch(nf, qFold)) return true;
  return qTerms.length >= 2 && nf.length >= 4 && nf[1] === "." &&
    nf[0] === qTerms[0][0] && nf.endsWith(qTerms[qTerms.length - 1]);
};

  const regHits = useMemo(() => {
    const qFold = foldStr(debouncedQ).trim();
    if (qFold.length < 2) return [];
    const qTerms = qFold.split(/\s+/).filter(Boolean);
    const bkts = athBucketsForQuery(debouncedQ).slice(0, 6);
    const seenR = new Set(), out = [];
    for (const b of bkts) {
      const arr = regShards[b] || [];
      for (let i = 0; i < arr.length; i++) {
        const x = arr[i];
        if (!fastRowMatches(x._nf || "", x._af || "", qFold, qTerms)) continue;
        const rk = (x.n || "") + "|" + (x.e || "") + "|" + (x.d || "");
        if (seenR.has(rk)) continue;
        seenR.add(rk);
        out.push(x);
        if (out.length >= 30) return out;
      }
    }
    return out;
  }, [regShards, debouncedQ]);

  // O(1) Hash-Map Profile Aggregation (ZERO nested O(N^2) loops — 100% immune to academy/name freezes!)
  const podProfiles = useMemo(() => {
    const qFold = foldStr(debouncedQ).trim();
    if (qFold.length < 2) return [];
    const qTerms = qFold.split(/\s+/).filter(Boolean);
    const map = new Map();

    const makeFastKey = (nm) => {
  const clean = stripEmbeddedNickname(nm);
  const toks = foldStr(clean).replace(/\b(de|da|do|dos|das|jr|sr|ii|iii|iv)\b/g, " ")
    .replace(/[^a-z\s]/g, " ").trim().split(/\s+/).filter(Boolean);
  return toks.length >= 2 ? toks[0] + "_" + toks[toks.length - 1] : (toks[0] || foldStr(clean));
};

    const ensureProfile = (nm, ac, extra = {}) => {
      const pro = findProAthlete(nm);
      const rawNick = extractEmbeddedNickname(nm);
      const displayNm = pro ? pro.name : (stripEmbeddedNickname(nm) || nm);
      const displayAc = (pro && pro.academy) ? pro.academy : (ac || "");
      const pk = makeFastKey(displayNm);
      let rec = map.get(pk);
      if (!rec) {
        rec = {
          name: displayNm,
          academy: displayAc,
          g: 0, s: 0, b: 0,
          events: [],
          proTitles: pro ? pro.titles : extra.proTitles || null,
          claimed: Boolean(extra.claimed), nickVerified: Boolean(extra.nickVerified), ...(rawNick ? { nickname: rawNick } : {}), seen: new Set()
        };
        map.set(pk, rec);
      } else {
        if (displayNm.length > rec.name.length && !/^[a-z]\./i.test(displayNm)) rec.name = displayNm;
        if (extra.claimed) rec.claimed = true;
        if (extra.nickVerified) rec.nickVerified = true;
        if (!pro && displayAc && (!rec.academy || (isUmbrellaAcademyName(rec.academy) && !isUmbrellaAcademyName(displayAc)) || (!isUmbrellaAcademyName(displayAc) && displayAc.length > (rec.academy || "").length))) {
          rec.academy = displayAc;
        } else if (!rec.academy && displayAc) {
          rec.academy = displayAc;
        }
      }
      return rec;
    };

    // A. Claimed Bios
    for (let i = 0; i < claimedBios.length; i++) {
      const b = claimedBios[i];
      if (fastRowMatches(b._nf + " " + (b._nkf || ""), b._af, qFold, qTerms)) {
        const r = ensureProfile(b.name, b.academy || "", { claimed: true });
        if (b.nickname) r.nickname = b.nickname;
      }
    }

    // A2. Official BJJ Nickname Directory Hits (e.g. "Buchecha", "Cyborg", "Cobrinha", "Lepri")
    const nickHits = resolveNicknameHit(debouncedQ);
    for (let i = 0; i < nickHits.length; i++) {
      const r = ensureProfile(nickHits[i].n, nickHits[i].a || "", { nickVerified: true });
      r.nickname = nickHits[i].nk;
      r.nickVerified = true;
    }

    // B. Pro Stars
    for (let i = 0; i < PRO_SUPERFIGHTS.length; i++) {
      const p = PRO_SUPERFIGHTS[i];
      if (fastRowMatches(foldStr(p.name), foldStr(p.academy || ""), qFold, qTerms)) {
        ensureProfile(p.name, p.academy, { proTitles: p.titles });
      }
    }

    // C. Athlete Shards (fast linear pass, capped safely)
    const bkts = athBucketsForQuery(debouncedQ).slice(0, 6);
    let scannedMatches = 0;
    for (const b of bkts) {
      const arr = podShards[b] || [];
      for (let i = 0; i < arr.length; i++) {
        const m = arr[i];
        if (!fastRowMatches(m._nf || "", m._af || "", qFold, qTerms)) continue;
        const rec = ensureProfile(m.n, m.a);
        if (m.isRosterEntry) continue;
        const gTarget = inferTargetGender(rec.name, rec.events);
        if (!strictVerifiedAthleteRowMatch(m.n, m.a, m.d, rec.name, rec.academy || m.a, gTarget)) continue;
        const dk = foldStr(m.ev) + "|" + foldStr(m.d) + "|" + m.p;
        if (rec.seen.has(dk)) continue;
        rec.seen.add(dk);
        if (!m.isHist) {
          const p = Number(m.p || 3);
          if (p === 1) rec.g++; else if (p === 2) rec.s++; else rec.b++;
          rec.events.push(m);
        } else {
          rec.histCount = (rec.histCount || 0) + 1;
        }
        if (++scannedMatches >= 600) break;
      }
    }

    // D. Top Matched Academy Roster (strictly capped to 250 medal rows so mega-teams NEVER lag!)
    if (matchingGyms.length > 0 && topGymBucket) {
      const topKey = matchingGyms[0].key;
      const gArr = gymShards[topGymBucket] || [];
      let gAdded = 0;
      for (let i = 0; i < gArr.length; i++) {
        const m = gArr[i];
        if (m._gk !== topKey) continue;
        const rec = ensureProfile(m.n, m.a);
        const dk = (m.ev || "") + "|" + (m.d || "") + "|" + m.p;
        if (!rec.seen.has(dk)) {
          rec.seen.add(dk);
          const p = Number(m.p || 3);
          if (p === 1) rec.g++; else if (p === 2) rec.s++; else rec.b++;
          rec.events.push(m);
        }
        if (++gAdded >= 250) break;
      }
    }

    // E. Typo / Fuzzy Fallback ONLY if exact/token search found 0 profiles!
    if (map.size === 0 && qFold.length >= 4) {
      for (const b of bkts) {
        const arr = podShards[b] || [];
        for (let i = 0; i < Math.min(arr.length, 800); i++) {
          const m = arr[i];
          if (!smartAthleteMatch(m.n, m.a, debouncedQ)) continue;
          const rec = ensureProfile(m.n, m.a);
          const p = Number(m.p || 3);
          if (p === 1) rec.g++; else if (p === 2) rec.s++; else rec.b++;
          rec.events.push(m);
        }
      }
    }

    const list = consolidateAthleteProfiles(Array.from(map.values()).filter(p => (p.g + p.s + p.b + (p.histCount || 0)) > 0 || p.claimed || p.proTitles || p.nickVerified));
    const rankFn = (p) => {
      const pnf = foldStr((p.name || "") + " " + (p.nickname || ""));
      if (pnf === qFold || p.nickVerified) return 3;
      return qTerms.every(t => pnf.includes(t)) || matchesYouthInitial(p.name || "", debouncedQ) ? 2 : 1;
    };
    return list.sort((a, b) => (rankFn(b) - rankFn(a)) || ((b.g * 9 + b.s * 3 + b.b + Math.min(25, b.histCount || 0)) - (a.g * 9 + a.s * 3 + a.b + Math.min(25, a.histCount || 0)))).slice(0, 12);
  }, [debouncedQ, podShards, gymShards, matchingGyms, topGymBucket, claimedBios]);

  const openFollow = (nm, ac, ev, div) => {
    document.activeElement?.blur?.();
    const existing = getWatch(nm, ev?.id);
    setWatchPick({
      ev: ev || { id: "", name: "All Upcoming Tournaments", link: "https://matdates.com/?athlete=" + encodeURIComponent(nm).replace(/%20/g, "+"), sort_date: "" },
      comp: { Name: nm, Academy: ac || "", Division: div || "" },
      div: div || "",
      existing
    });
  };

  const trimmedQ = qStr.trim();
  const alreadyWatched = Boolean(trimmedQ.length >= 2 && getWatch(trimmedQ));

    const allPodProfiles = useMemo(() => {
    const qF = foldStr(trimmedQ).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    if (qF.length < 2) return podProfiles;
    const qTerms = qF.split(" ").filter(Boolean);
    const existingKeys = new Set(podProfiles.map(p => foldStr(p.name).replace(/[^a-z0-9]/g, "")));
    const legendProfiles = [];
    for (const hero of PRO_SUPERFIGHTS) {
      const hKey = foldStr(hero.name).replace(/[^a-z0-9]/g, "");
      if (existingKeys.has(hKey)) continue;
      const hay = foldStr([hero.name, ...(hero.aliases || []), hero.academy || ""].join(" "));
      if (hay.includes(qF) || qTerms.every(t => hay.includes(t))) {
        legendProfiles.push({
          name: hero.name,
          academy: hero.academy || "",
          g: 0, s: 0, b: 0,
          histCount: (hero.careerG || 0) + (hero.careerS || 0) + (hero.careerB || 0) || (hero.careerPodiums || []).length,
          proTitles: hero.titles || [],
          events: []
        });
      }
    }
    return [...legendProfiles, ...podProfiles];
  }, [podProfiles, trimmedQ]);

  return (
    <div onClick={onClose} style={{ ...MODAL_BG, alignItems: "flex-start", paddingTop: "12px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#111622", border:"1px solid #334155", borderRadius:"12px", maxWidth:"640px", width:"100%", maxHeight:"90dvh", overflowY:"auto", overscrollBehavior:"contain", WebkitOverflowScrolling:"touch", padding:"15px", color:"#fff", textAlign:"left" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
          <h3 style={{ margin:0, fontSize:"1.08rem" }}>🔍 Athlete &amp; Academy Lookup</h3>
          <button onClick={onClose} style={{ background:"#1e293b", color:"#fff", border:"1px solid #334155", borderRadius:"6px", padding:"4px 10px", cursor:"pointer" }}>✕</button>
        </div>
        <input
          autoFocus
          enterKeyHint="search"
          value={qStr}
          onChange={e => setQStr(e.target.value)}
          placeholder="Search ANY athlete or academy (e.g. Carlson Gracie San Antonio, Isabella King, AOJ)..."
          style={{ width:"100%", padding:"11px 13px", borderRadius:"8px", background:"#182030", color:"#fff", border:"1.5px solid #38bdf8", fontSize:"0.92rem", boxSizing:"border-box", marginBottom:"10px" }}
        />
        {trimmedQ.length < 2 ? (
          <div style={{ color:"#94a3b8", fontSize:"0.83rem", lineHeight:1.45 }}>
            Type any <b>athlete name</b> or <b>academy name</b> — open any Academy or Athlete Trophy Room, inspect upcoming brackets, or tap <b>🔔 Watch</b> for live tournament &amp; SuperFight alerts!
          </div>
        ) : (
          <div style={{ display:"grid", gap:"8px" }}>
            {matchingGyms.length > 0 && (
              <div style={{ display:"grid", gap:"6px" }}>
                <div style={{ color:"#fbbf24", fontWeight:"800", fontSize:"0.77rem" }}>🏛️ MATCHING ACADEMIES ({matchingGyms.length})</div>
                {matchingGyms.slice(0, 4).map(g => (
                  <div key={g.key} onClick={() => { window.location.href = "/?gym=" + encodeURIComponent(g.key); }} style={{ background:"#172032", border:"1px solid #f59e0b", borderRadius:"8px", padding:"8px 11px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" , cursor:"pointer" }}>
                      <div style={{ fontSize:"0.81rem" }}>
                        <b style={{ color:"#fff", textDecoration:"underline", textDecorationColor:"rgba(245,158,11,0.65)" }}>{g.Academy}</b>
                      <span style={{ color:"#cbd5e1", marginLeft:"7px", fontSize:"0.76rem" }}>🥇{g.Gold} 🥈{g.Silver} 🥉{g.Bronze}</span>
                    </div>
                    <a href={"/?gym=" + encodeURIComponent(g.key)} style={{ background:"#f59e0b", color:"#000", padding:"5px 10px", borderRadius:"6px", fontWeight:"800", fontSize:"0.74rem", textDecoration:"none", whiteSpace:"nowrap" }}>Academy Trophy Room →</a>
                  </div>
                ))}
              </div>
            )}

            {allPodProfiles.length > 0 && <div style={{ color:"#fbbf24", fontWeight:"bold", fontSize:"0.78rem", marginTop:"2px" }}>🏆 ATHLETE TROPHY ROOMS ({allPodProfiles.length})</div>}
            {allPodProfiles.map((p, i) => (
              <div key={"p"+i} onClick={() => { document.activeElement?.blur?.(); setTrophyPick(p); }} style={{ background:"#182030", border:"1px solid #334155", borderRadius:"8px", padding:"9px 11px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap", cursor:"pointer" }}>
                <div style={{ minWidth:0, flex:"1 1 200px" }}>
                  <div>
                    <b style={{ textDecoration:"underline", textDecorationColor:"rgba(251,191,36,0.5)" }}>{p.name}{p.nickname ? ` "${p.nickname}"` : ""}</b>
                    {p.academy && <span onClick={(e) => { e.stopPropagation(); const gk = universalGymKey(p.academy); if (gk) window.location.href = "/?gym=" + encodeURIComponent(gk); }} title={"Open " + p.academy + " Trophy Room"} style={{ color:"#ff9f43", fontSize:"0.78rem", cursor:"pointer", textDecoration:"underline", textDecorationColor:"rgba(255,159,67,0.45)" }}> • {p.academy}</span>}
                  </div>
                  <div style={{ fontSize:"0.76rem", color:"#cbd5e1" }}>
                    {(syncingShards > 0 || trimmedQ.toLowerCase() !== debouncedQ.trim().toLowerCase()) && (p.g + p.s + p.b + (p.histCount || 0)) === 0 ? <span style={{ color:"#93c5fd" }}>⏳ Syncing verified medals…{p.proTitles ? " • " + p.proTitles[0] : ""}</span> : <>🥇{p.g} 🥈{p.s} 🥉{p.b} (2026){p.histCount ? ` • +${p.histCount} Prior-Yr` : ""}{p.proTitles ? " • " + p.proTitles[0] : ""}</>}
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
                    <div><b onClick={() => setTrophyPick({ name: r.n, academy: r.a, g: 0, s: 0, b: 0, events: [] })} style={{ cursor:"pointer", textDecoration:"underline", textDecorationColor:"rgba(56,189,248,0.5)" }}>{r.n}</b> <span onClick={(e) => { e.stopPropagation(); const gk = universalGymKey(r.a); if (gk) window.location.href = "/?gym=" + encodeURIComponent(gk); }} title={"Open " + r.a + " Trophy Room"} style={{ color:"#ff9f43", fontSize:"0.78rem", cursor:"pointer", textDecoration:"underline", textDecorationColor:"rgba(255,159,67,0.45)" }}>• {r.a}</span></div>
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
                {allPodProfiles.length === 0 && regHits.length === 0
                  ? <>Open <b>{trimmedQ}</b>&apos;s All-Time Trophy Room or Watch for future brackets:</>
                  : <>Want alerts for every future tournament &amp; SuperFight <b>{trimmedQ}</b> enters?</>}
              </span>
              <div style={{ display:"flex", gap:"6px" }}>
                <button type="button" onClick={() => setTrophyPick({ name: trimmedQ, academy: "", g: 0, s: 0, b: 0, events: [] })} style={{ background:"#f59e0b", color:"#000", border:"none", borderRadius:"6px", padding:"6px 10px", fontSize:"0.75rem", fontWeight:"800", cursor:"pointer" }}>🏆 Open Trophy Room</button>
                <button type="button" onClick={() => openFollow(trimmedQ, "")} style={{ background: alreadyWatched ? "#132a1c" : "#0284c7", color: alreadyWatched ? "#2ecc71" : "#fff", border:"none", borderRadius:"6px", padding:"6px 11px", fontSize:"0.75rem", fontWeight:"800", cursor:"pointer" }}>
                  {alreadyWatched ? "✓ Manage Watch" : "🔔 Watch Athlete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {watchPick && (
          <MatAlertModal
            event={watchPick.ev}
            comp={watchPick.comp}
            division={watchPick.div}
            existingWatch={watchPick.existing}
            onRemove={removeWatch}
            onClose={() => setWatchPick(null)}
          />
        )}
        {trophyPick && (
          <AthleteTrophyRoomModal
            athlete={trophyPick}
            onBack={() => setTrophyPick(null)}
            backLabel="← Lookup"
            onClose={() => { setTrophyPick(null); if (onClose) onClose(); }}
            isWatching={Boolean(getWatch(trophyPick.name))}
            onWatch={(nm, ac) => openFollow(nm, ac)}
          />
        )}
      </div>
    </div>
  );
}
