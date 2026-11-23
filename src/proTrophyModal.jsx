import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { onAuthStateChanged } from "firebase/auth";
import { trackEvent } from "./analytics";
import React, { useState, useEffect, useRef } from "react";
const TrophyShareStudioModal = React.lazy(() => import("./trophyShareStudio"));
import { collection, doc, getDoc, getDocs, setDoc, query, where, arrayUnion } from "firebase/firestore";
import { db, auth } from "./firebase";
import { addDoc } from "firebase/firestore";
import { foldStr, athBucket, athBucketsForQuery, smartAthleteMatch, matchesYouthInitial, computeEliteSpotlight, PRO_SUPERFIGHTS, BJJ_BELT_GROUPS, normalizeBeltValue, getBeltVisualSpec, universalGymKey, inferTargetGender, strictVerifiedAthleteRowMatch, cleanAcademyName, dedupeVerifiedMedals, getCachedShardItems } from "./proHubData";

let _trLiveEvDates = null;
function loadTrEventDates(dbRef, collectionFn, getDocsFn) {
  if (_trLiveEvDates) return;
  _trLiveEvDates = new Map();
  Promise.all([
    getDocsFn(collectionFn(dbRef, "live_events")).catch(() => ({ forEach: () => {} })),
    getDocsFn(collectionFn(dbRef, "events")).catch(() => ({ forEach: () => {} }))
  ]).then(([s1, s2]) => {
    const add = (sn) => sn.forEach(d => {
      const x = d.data() || {};
      if (x.name && x.sort_date) {
        const k = foldStr(x.name).replace(/[^a-z0-9]+/g, " ").trim();
        if (k && (!_trLiveEvDates.has(k) || x.sort_date > _trLiveEvDates.get(k))) {
          _trLiveEvDates.set(k, x.sort_date);
        }
      }
    });
    add(s1);
    add(s2);
  });
}

function inferMedalTimestampKey(m, fallbackYr = 2026) {
  const rawDt = m?.dt || m?.sort_date || m?.date || "";
  if (/^\d{4}-\d{2}-\d{2}/.test(String(rawDt))) return String(rawDt).slice(0, 10);

  const evRaw = String(m?.ev || "");
  const evFold = foldStr(evRaw).replace(/[^a-z0-9]+/g, " ").trim();

  // 1. Explicit date inside parentheses e.g. "(Oct 18, 2026)" or "(Nov 14, 2025)"
  const parenDate = evRaw.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(199\d|20\d{2})\b/i);
  const monthMap = { jan:"01", feb:"02", mar:"03", apr:"04", may:"05", jun:"06", jul:"07", aug:"08", sep:"09", sept:"09", oct:"10", nov:"11", dec:"12" };
  if (parenDate) {
    const mm = monthMap[parenDate[1].toLowerCase().slice(0, 4)] || monthMap[parenDate[1].toLowerCase().slice(0, 3)] || "06";
    const dd = String(parenDate[2]).padStart(2, "0");
    return `${parenDate[3]}-${mm}-${dd}`;
  }

  // 2. Determine year
  const yrMatch = evRaw.match(/\b(19\d{2}|20[0-2]\d)\b/);
  const yr = Number(m?.yr || (yrMatch ? yrMatch[1] : fallbackYr) || fallbackYr);

  if (/season ranking|overall ranking/.test(evFold)) return `${yr}-00-01`;

  // 3. Exact or substring match in live_events / events map when year matches
  if (_trLiveEvDates && yr >= 2025) {
    if (_trLiveEvDates.has(evFold)) return _trLiveEvDates.get(evFold);
    for (const [k, dt] of _trLiveEvDates.entries()) {
      if (k.length >= 10 && dt.startsWith(String(yr)) && (evFold.includes(k) || k.includes(evFold))) return dt;
    }
  }

  // 4. Major annual BJJ tournament calendar landmarks (keeps months accurate across ALL years!)
  if (/world.*no gi/.test(evFold)) return `${yr}-12-10`;
  if (/majestic/.test(evFold)) return `${yr}-11-22`;
  if (/austin/.test(evFold) && /adcc/.test(evFold)) return `${yr}-11-14`;
  if (/pan.*no gi/.test(evFold)) return `${yr}-10-18`;
  if (/european.*no gi/.test(evFold)) return `${yr}-10-25`;
  if (/ufc bjj.*open|phoenix|ak chin/.test(evFold)) return `${yr}-09-19`;
  if (/jiu jitsu con|world master/.test(evFold)) return `${yr}-09-02`;
  if (/pan kids/.test(evFold) && !/no gi/.test(evFold)) return `${yr}-07-25`;
  if (/american national/.test(evFold)) return `${yr}-07-04`;
  if (/world ibjjf jiu jitsu championship/.test(evFold) && !/no gi|master/.test(evFold)) return `${yr}-06-02`;
  if (/campeonato brasileiro|brasileiro/.test(evFold) && !/sem kimono/.test(evFold)) return `${yr}-05-01`;
  if (/pan ibjjf/.test(evFold) && !/no gi|kids|pacific/.test(evFold)) return `${yr}-03-26`;
  if (/san antonio/.test(evFold)) return `${yr}-09-28`;
  if (/houston/.test(evFold)) return `${yr}-02-16`;
  if (/european/.test(evFold) && !/fall|no gi/.test(evFold)) return `${yr}-01-24`;

  for (const [mKey, mm] of Object.entries(monthMap)) {
    if (new RegExp("\\b" + mKey + "[a-z]*\\b", "i").test(evFold)) return `${yr}-${mm}-15`;
  }
  if (/\bfall\b|autumn/.test(evFold)) return `${yr}-10-12`;
  if (/\bsummer\b/.test(evFold)) return `${yr}-07-15`;
  if (/\bspring\b/.test(evFold)) return `${yr}-04-15`;
  if (/\bwinter\b/.test(evFold)) return `${yr}-02-05`;
  return `${yr}-06-15`;
}

function sortPodiumsNewestFirst(list, defaultYr = 2026) {
  return [...(list || [])].sort((a, b) => {
    const ka = inferMedalTimestampKey(a, a?.yr || defaultYr);
    const kb = inferMedalTimestampKey(b, b?.yr || defaultYr);
    if (kb !== ka) return kb.localeCompare(ka);
    const evCmp = String(a?.ev || "").localeCompare(String(b?.ev || ""));
    if (evCmp !== 0) return evCmp;
    const pa = Number(a?.p || 3), pb = Number(b?.p || 3);
    if (pa !== pb) return pa - pb;
    return String(a?.d || "").localeCompare(String(b?.d || ""));
  });
}

export function SuperFightsPanel({ fed, qStr, onOpenTrophy, onWatch, getWatch }) {
  const [subTab, setSubTab] = useState("PROS");
  const [extra, setExtra] = useState([]);
  const [openPool, setOpenPool] = useState([]);

  useEffect(() => {
    getDocs(query(collection(db, "mat_watches"), where("kind", "==", "superfight_profile")))
      .then(sn => setExtra(sn.docs.map(d => d.data()))).catch(() => {});
    getDocs(query(collection(db, "mat_watches"), where("kind", "==", "athlete_bio")))
      .then(sn => setOpenPool(sn.docs.map(d => d.data()).filter(x => x.openSf && x.name))).catch(() => {});
  }, []);

  const q = foldStr(qStr).trim();
  const list = [...PRO_SUPERFIGHTS, ...extra].filter(p => {
    if (fed !== "ALL" && !(p.feds || []).includes(fed)) return false;
    if (!q) return true;
    const blob = foldStr([p.name, p.academy, ...(p.titles || []), ...(p.bouts || []).map(b => b.ev + " " + b.res)].join(" "));
    return blob.includes(q);
  });
  const poolFiltered = openPool.filter(a => !q || foldStr([a.name, a.belt, a.coach, a.handle].join(" ")).includes(q));

  return (
    <div style={{ display:"grid", gap:"10px", textAlign:"left" }}>
      <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
        <button type="button" onClick={() => setSubTab("PROS")} style={{ flex:"1 1 200px", padding:"8px 12px", borderRadius:"7px", fontWeight:"800", fontSize:"0.8rem", cursor:"pointer", background: subTab==="PROS" ? "#14b8a6" : "#182030", color: subTab==="PROS" ? "#000" : "#cbd5e1", border: subTab==="PROS" ? "none" : "1px solid #334155" }}>👑 Pro Champions &amp; Majors ({list.length})</button>
        <button type="button" onClick={() => setSubTab("POOL")} style={{ flex:"1 1 200px", padding:"8px 12px", borderRadius:"7px", fontWeight:"800", fontSize:"0.8rem", cursor:"pointer", background: subTab==="POOL" ? "#2ecc71" : "#182030", color: subTab==="POOL" ? "#000" : "#cbd5e1", border: subTab==="POOL" ? "none" : "1px solid #334155" }}>⚡ Open SuperFight Matchmaking Pool ({poolFiltered.length})</button>
      </div>

      {subTab === "POOL" ? (
        <div style={{ display:"grid", gap:"9px" }}>
          <div style={{ background:"#132a1c", border:"1px solid #22c55e", borderRadius:"8px", padding:"10px 12px", fontSize:"0.8rem", color:"#dcfce7" }}>
            <strong>⚡ Active SuperFight Matchmaking Directory</strong> — Every competitor below has opted in via <b>🪪 Claim Bio</b> inside their Trophy Room as available for SuperFight / Invitational bookings.
          </div>
          {poolFiltered.length === 0 ? (
            <div style={{ background:"#181f2c", border:"1px dashed #334155", borderRadius:"8px", padding:"16px", fontSize:"0.83rem", color:"#94a3b8" }}>
              Want promoters to book you for upcoming SuperFights? Open your <b>🏆 Trophy Room</b>, tap <b>🪪 Claim Bio</b>, and check <b>🥊 Open for SuperFight Matchmaking</b>!
            </div>
          ) : poolFiltered.map((a, i) => (
            <div key={i} style={{ background:"#181f2c", border:"1px solid #22c55e", borderRadius:"9px", padding:"12px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"10px", flexWrap:"wrap" }}>
              <div>
                <div onClick={() => onOpenTrophy({ name: a.name, academy: "" })} style={{ color:"#fff", fontWeight:"800", fontSize:"1rem", cursor:"pointer", textDecoration:"underline" }}>{a.name} <span style={{ background:"#132a1c", color:"#4ade80", border:"1px solid #22c55e", borderRadius:"4px", padding:"1px 6px", fontSize:"0.7rem", marginLeft:"6px" }}>OPEN FOR BOUTS</span></div>
                <div style={{ color:"#ff9f43", fontSize:"0.8rem", fontWeight:"bold", marginTop:"2px" }}>{[a.belt, a.coach ? "Coach: " + a.coach : ""].filter(Boolean).join(" • ") || "Verified Competitor"}</div>
                {a.funFact && <div style={{ color:"#cbd5e1", fontSize:"0.77rem", marginTop:"4px" }}>★ {a.funFact}</div>}
              </div>
              <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                <button type="button" onClick={() => onOpenTrophy({ name: a.name, academy: "" })} style={{ background:"#f59e0b", color:"#000", border:"none", borderRadius:"6px", padding:"6px 10px", fontSize:"0.75rem", fontWeight:"800", cursor:"pointer" }}>🏆 Trophy Room</button>
                {a.handle && <a href={"https://instagram.com/" + a.handle} target="_blank" rel="noreferrer" style={{ background:"#38bdf8", color:"#000", borderRadius:"6px", padding:"6px 10px", fontSize:"0.75rem", fontWeight:"800", textDecoration:"none" }}>📩 DM @{a.handle}</a>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div style={{ background:"linear-gradient(90deg,#0f292e,#172554)", border:"1px solid #14b8a6", borderRadius:"8px", padding:"10px 12px", fontSize:"0.8rem", color:"#ccfbf1" }}>
            <strong>🥊 Verified SuperFights &amp; Major Championships</strong> — Tracking Pro Belts &amp; Invitational Headliners across <strong>UFC BJJ</strong>, <strong>ADCC Worlds</strong>, <strong>WNO</strong>, <strong>CJI</strong>, <strong>Polaris</strong> &amp; <strong>IBJJF Majors</strong>.
          </div>
          {list.map((p, i) => (
            <div key={i} style={{ background:"#181f2c", border:"1px solid #334155", borderRadius:"9px", padding:"12px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"8px", flexWrap:"wrap" }}>
                <div>
                  <div onClick={() => onOpenTrophy({ name: p.name, academy: p.academy, g: 0, s: 0, b: 0, events: [] })} title="Open Official Trophy Room" style={{ color:"#fff", fontWeight:"800", fontSize:"1.02rem", cursor:"pointer", textDecoration:"underline", textDecorationColor:"rgba(251,191,36,0.45)" }}>{p.name} <span style={{ color:"#fbbf24", fontSize:"0.75rem", marginLeft:"6px" }}>{p.rec}</span></div>
                  <div style={{ color:"#ff9f43", fontSize:"0.8rem", fontWeight:"600" }}>{p.academy} • {p.belt}</div>
                </div>
                <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                  <button type="button" onClick={() => onOpenTrophy({ name: p.name, academy: p.academy, g: 0, s: 0, b: 0, events: [] })} style={{ background:"linear-gradient(90deg,#f59e0b,#fbbf24)", color:"#000", border:"none", borderRadius:"6px", padding:"5px 10px", fontSize:"0.75rem", fontWeight:"800", cursor:"pointer" }}>🏆 Trophy Room</button>
                  <button type="button" onClick={() => onWatch(p.name, p.academy)} style={{ background: getWatch(p.name) ? "#132a1c" : "#162536", color: getWatch(p.name) ? "#2ecc71" : "#38bdf8", border: getWatch(p.name) ? "1px solid #2ecc71" : "1px solid #0284c7", borderRadius:"6px", padding:"5px 9px", fontSize:"0.75rem", fontWeight:"bold", cursor:"pointer" }}>{getWatch(p.name) ? "✓ Watching" : "🔔 Watch"}</button>
                </div>
              </div>
              <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", margin:"8px 0" }}>
                {(p.titles || []).map((t, ti) => <span key={ti} style={{ background:"#292011", color:"#fde68a", border:"1px solid #d97706", borderRadius:"5px", padding:"3px 8px", fontSize:"0.73rem", fontWeight:"bold" }}>{t}</span>)}
              </div>
              <div style={{ display:"grid", gap:"4px" }}>
                {(p.bouts || []).map((b, bi) => (
                  <div key={bi} style={{ background:"#111620", padding:"5px 8px", borderRadius:"5px", fontSize:"0.76rem", color:"#cbd5e1", display:"flex", justifyContent:"space-between", gap:"8px" }}>
                    <span><strong>{b.ev}</strong> — <b style={{ color:"#4ade80" }}>{b.res}</b> ({b.sub})</span>
                    <b style={{ color:"#fbbf24", fontSize:"0.7rem" }}>{b.org}</b>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}


async function resizeAvatarFile(file) {
  if (!file) return "";
  try {
    if (typeof createImageBitmap === "function") {
      const bmp = await createImageBitmap(file);
      const maxDim = 320;
      const scale = Math.min(1, maxDim / Math.max(bmp.width || 1, bmp.height || 1));
      const w = Math.max(1, Math.round(bmp.width * scale));
      const h = Math.max(1, Math.round(bmp.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bmp, 0, 0, w, h);
      if (bmp.close) bmp.close();
      const out = canvas.toDataURL("image/jpeg", 0.84);
      if (out && out.length > 200) return out;
    }
  } catch {}
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const rawUrl = String(reader.result || "");
      const img = new Image();
      img.onload = () => {
        const maxDim = 320;
        const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const jpg = canvas.toDataURL("image/jpeg", 0.84);
        resolve(jpg && jpg.length > 200 ? jpg : "");
      };
      img.onerror = () => {
        alert("iPhone HEIC photo format couldn't be decoded directly by this browser — take a quick screenshot of the photo or pick a JPG/PNG and it will lock right in!");
        resolve("");
      };
      img.src = rawUrl;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function limitSpiritEmojis(raw) {
  const segs = (typeof Intl !== "undefined" && Intl.Segmenter)
    ? Array.from(new Intl.Segmenter("en", { granularity: "grapheme" }).segment(raw || ""), s => s.segment)
    : Array.from(raw || "");
  return segs.filter(g => /\p{Extended_Pictographic}/u.test(g)).slice(0, 3).join("");
}

function buildMusicSearchUrl(service, songQuery, directUrl) {
  if (directUrl && /^https?:\/\//i.test(directUrl.trim())) return directUrl.trim();
  const q = encodeURIComponent(songQuery || "");
  if (service === "apple") return "https://music.apple.com/us/search?term=" + q;
  if (service === "ytmusic") return "https://music.youtube.com/search?q=" + q;
  return "https://open.spotify.com/search/" + q;
}

function parseBookField(rawBook) {
  const s = (rawBook || "").trim();
  if (!s) return { title: "", url: "" };
  const urlMatch = s.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    const cleanUrl = urlMatch[0];
    const cleanTitle = s.replace(cleanUrl, "").replace(/^[-–—:|\s]+|[-–—:|\s]+$/g, "").trim() || "View Current Book";
    return { title: cleanTitle, url: cleanUrl };
  }
  const searchTerms = s.replace(/["“”'‘’]/g, " ").replace(/[^\p{L}\p{N}\s.&'-]/gu, " ").replace(/\s+/g, " ").trim();
  const encoded = encodeURIComponent(searchTerms || s).replace(/%20/g, "+");
  return {
    title: s,
    url: "https://www.amazon.com/gp/search?ie=UTF8&index=books&keywords=" + encoded
  };
}

function BeltRankBadge({ belt }) {
  const spec = getBeltVisualSpec(belt);
  if (!spec) return null;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:"rgba(15,23,42,0.9)", border:"1px solid #334155", borderRadius:"8px", padding:"3px 9px 3px 6px", fontSize:"0.75rem", fontWeight:"800", color:"#f8fafc", boxShadow:"0 2px 6px rgba(0,0,0,0.35)" }}>
      <span style={{ position:"relative", width:"44px", height:"13px", borderRadius:"3px", background: spec.main, border:"1px solid rgba(255,255,255,0.42)", display:"inline-flex", alignItems:"center", justifyContent:"flex-end", overflow:"visible", flexShrink:0, boxShadow:"inset 0 1px 2px rgba(255,255,255,0.25), inset 0 -1px 2px rgba(0,0,0,0.35)" }}>
        {spec.mid && <span style={{ position:"absolute", left:0, right:"14px", top:"4px", height:"3.5px", background: spec.mid }} />}
        <span style={{ width:"14px", height:"100%", background: spec.bar, borderLeft:"1px solid rgba(255,255,255,0.22)", display:"inline-flex", alignItems:"center", justifyContent:"space-evenly", padding:"0 1.5px", boxSizing:"border-box", zIndex:1 }}>
          {Array.from({ length: spec.stripes }).map((_, i) => (
            <span key={i} style={{ width:"1.6px", height:"9px", background:"#ffffff", borderRadius:"0.5px", display:"block" }} />
          ))}
        </span>
      </span>
      <span style={{ letterSpacing:"0.2px" }}>{spec.label}</span>
    </span>
  );
}

const IG_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);


function playBioMusicVibe(vibeLabel = "") {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const isHype = /hype|walkout|fire|war/i.test(vibeLabel);
    const isFlow = /flow|focus|calm|chill/i.test(vibeLabel);
    const freqs = isHype ? [146.83, 220.0, 293.66] : isFlow ? [174.61, 261.63, 329.63] : [196.0, 293.66, 392.0];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isHype ? "sawtooth" : "triangle";
    osc.frequency.setValueAtTime(freqs[0], now);
    osc.frequency.exponentialRampToValueAtTime(freqs[1], now + 0.18);
    osc.frequency.exponentialRampToValueAtTime(freqs[2], now + 0.36);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.46);
    setTimeout(() => { try { ctx.close(); } catch {} }, 600);
    return ctx;
  } catch {
    return null;
  }
}

function scoreTrackCandidate(item, raw, parts, norm) {
  const fullNorm = norm(raw);
  const p0 = norm(parts[0] || raw);
  const p1 = norm(parts[1] || "");
  const tName = norm(item.trackName);
  const aName = norm(item.artistName);
  const cName = norm(item.collectionName);
  let score = 0;

  if (!/karaoke|tribute|lullaby|instrumental|cover/.test(fullNorm)) {
    if (/karaoke|tribute|originally performed|in the style of|8 bit|lullaby|piano version|made famous/.test(tName + " " + aName + " " + cName)) {
      score -= 90;
    }
  }
  if (parts.length >= 2) {
    if ((tName.includes(p0) && aName.includes(p1)) || (tName.includes(p1) && aName.includes(p0))) score += 65;
    if (tName === p0 || tName === p1) score += 30;
    if (aName === p1 || aName === p0) score += 30;
  } else {
    if (tName === p0) score += 45;
    else if (tName.startsWith(p0)) score += 25;
    else if (tName.includes(p0)) score += 12;
    if (fullNorm.includes(aName) && aName.length > 2) score += 35;
  }
  return score;
}

function jsonpRequest(url, cbParam = "callback", timeoutMs = 4200) {
  return new Promise((resolve) => {
    const cbName = "__mdMusicCb_" + Math.random().toString(36).slice(2, 9);
    let done = false;
    const script = document.createElement("script");
    const finish = (val) => {
      if (done) return;
      done = true;
      try { delete window[cbName]; } catch { window[cbName] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
      resolve(val);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    window[cbName] = (data) => { clearTimeout(timer); finish(data); };
    script.onerror = () => { clearTimeout(timer); finish(null); };
    script.src = url + (url.includes("?") ? "&" : "?") + cbParam + "=" + cbName;
    document.head.appendChild(script);
  });
}

function lookupSongPreview(rawQuery, directUrl = "") {
  const raw = String(rawQuery || "").trim();
  if (!raw && !directUrl) return Promise.resolve(null);

  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const parts = raw.split(/\s*(?:[-–—|•]|\bby\b)\s*/i).map(s => s.trim()).filter(Boolean);
  const appleIdMatch = String(directUrl || "").match(/[?&]i=(\d+)|\/(\d{7,12})(?:[/?#]|$)/);
  const exactId = appleIdMatch ? (appleIdMatch[1] || appleIdMatch[2]) : "";

  const itunesUrl = exactId
    ? "https://itunes.apple.com/lookup?id=" + encodeURIComponent(exactId) + "&entity=song"
    : "https://itunes.apple.com/search?term=" + encodeURIComponent(raw) + "&media=music&entity=song&limit=8";
  const deezerUrl = "https://api.deezer.com/search?q=" + encodeURIComponent(raw) + "&limit=8&output=jsonp";

  const itunesPromise = jsonpRequest(itunesUrl).then((data) => {
    const rows = Array.isArray(data?.results) ? data.results.filter(r => r && r.previewUrl) : [];
    return rows.map(r => ({
      trackName: r.trackName || "",
      artistName: r.artistName || "",
      collectionName: r.collectionName || "",
      previewUrl: r.previewUrl,
      artworkUrl60: r.artworkUrl60 || r.artworkUrl100 || "",
      permanent: true,
      exact: Boolean(exactId)
    }));
  });

  const deezerPromise = exactId ? Promise.resolve([]) : jsonpRequest(deezerUrl).then((data) => {
    const rows = Array.isArray(data?.data) ? data.data.filter(r => r && r.preview) : [];
    return rows.map(r => ({
      trackName: r.title || "",
      artistName: r.artist?.name || "",
      collectionName: r.album?.title || "",
      previewUrl: r.preview,
      artworkUrl60: r.album?.cover_small || r.album?.cover_medium || "",
      permanent: false,
      exact: false
    }));
  });

  return Promise.all([deezerPromise, itunesPromise]).then(([dzList, itList]) => {
    // Combine both sources (giving universal .mp3 slight tie-breaker edge on mobile while keeping permanent URL for caching)
    const combined = [...dzList.map(x => ({ ...x, mp3Bonus: 3 })), ...itList.map(x => ({ ...x, mp3Bonus: 0 }))];
    if (!combined.length) return null;
    const exactHit = combined.find(x => x.exact);
    if (exactHit) return exactHit;

    let best = combined[0];
    let bestScore = -999;
    for (const item of combined) {
      const sc = scoreTrackCandidate(item, raw, parts, norm) + (item.mp3Bonus || 0);
      if (sc > bestScore) {
        bestScore = sc;
        best = item;
      }
    }
    // Also attach permanentUrl if iTunes found the same song so Edit Profile can cache a non-expiring fallback URL in Firestore!
    const permMatch = itList.sort((a, b) => scoreTrackCandidate(b, raw, parts, norm) - scoreTrackCandidate(a, raw, parts, norm))[0];
    return {
      ...best,
      permanentPreviewUrl: permMatch && scoreTrackCandidate(permMatch, raw, parts, norm) >= 20 ? permMatch.previewUrl : (best.permanent ? best.previewUrl : ""),
      artworkUrl60: best.artworkUrl60 || permMatch?.artworkUrl60 || ""
    };
  });
}

function searchWalkoutCandidates(rawQuery) {
  const q = String(rawQuery || "").trim();
  if (q.length < 2) return Promise.resolve([]);
  const itUrl = "https://itunes.apple.com/search?term=" + encodeURIComponent(q) + "&media=music&entity=song&limit=6";
  const dzUrl = "https://api.deezer.com/search?q=" + encodeURIComponent(q) + "&limit=6&output=jsonp";

  const itP = jsonpRequest(itUrl).then(data => {
    const rows = Array.isArray(data?.results) ? data.results.filter(r => r && r.previewUrl) : [];
    return rows.map(r => ({
      trackName: r.trackName || "",
      artistName: r.artistName || "",
      collectionName: r.collectionName || "",
      previewUrl: r.previewUrl,
      permanentPreviewUrl: r.previewUrl,
      artworkUrl60: r.artworkUrl60 || r.artworkUrl100 || "",
      trackUrl: r.trackViewUrl || ""
    }));
  }).catch(() => []);

  const dzP = jsonpRequest(dzUrl).then(data => {
    const rows = Array.isArray(data?.data) ? data.data.filter(r => r && r.preview) : [];
    return rows.map(r => ({
      trackName: r.title || "",
      artistName: r.artist?.name || "",
      collectionName: r.album?.title || "",
      previewUrl: r.preview,
      permanentPreviewUrl: "",
      artworkUrl60: r.album?.cover_small || r.album?.cover_medium || "",
      trackUrl: r.link || ""
    }));
  }).catch(() => []);

  return Promise.all([itP, dzP]).then(([itRows, dzRows]) => {
    const map = new Map();
    itRows.forEach(r => {
      const k = foldStr(r.trackName + "|" + r.artistName);
      if (k && !map.has(k)) map.set(k, r);
    });
    dzRows.forEach(r => {
      const k = foldStr(r.trackName + "|" + r.artistName);
      if (!k) return;
      if (map.has(k)) {
        const prev = map.get(k);
        if (!prev.artworkUrl60 && r.artworkUrl60) prev.artworkUrl60 = r.artworkUrl60;
      } else {
        map.set(k, r);
      }
    });
    return Array.from(map.values()).slice(0, 6);
  });
}

function safeWriteBioCache(key, obj) {
  if (!key || !obj) return;
  try {
    localStorage.setItem(key, JSON.stringify(obj));
  } catch {
    try {
      const { avatarData, ...light } = obj;
      localStorage.setItem(key, JSON.stringify(light));
    } catch {}
  }
}

export function AthleteTrophyRoomModal({ athlete, onClose, onBack, backLabel = '← Back', onWatch, isWatching, onShareCard }) {
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevBodyOverflow; };
  }, []);
  const [activeAth, setActiveAth] = useState(athlete);
  const [athHistory, setAthHistory] = useState([]);
  useEffect(() => { setActiveAth(athlete); setAthHistory([]); }, [athlete]);
  const effectiveOnBack = athHistory.length > 0
    ? () => {
        const prev = athHistory[athHistory.length - 1];
        setAthHistory(h => h.slice(0, -1));
        setActiveAth(prev);
      }
    : onBack;
  const effectiveBackLabel = athHistory.length > 0
    ? `← ${(athHistory[athHistory.length - 1]?.name || 'Back').split(' ')[0]}`
    : backLabel;

  const nm = activeAth?.name || activeAth?.n || "";
  const slug = foldStr(nm).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const docKey = "bio_" + slug;
  const lsKey = "md_bio_" + slug;
  const initials = nm.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("") || "🥋";

  const [evs, setEvs] = useState(activeAth?.events || []);
  const [histEvs, setHistEvs] = useState([]);
  const [promBouts, setPromBouts] = useState([]);
  const [fedRanks, setFedRanks] = useState([]);
  const [coachedSquadStats, setCoachedSquadStats] = useState(null);
  const WATCH_GLOW_MIN = 100;
  const [eraView, setEraView] = useState("2026");
  const [cnt, setCnt] = useState({ g: activeAth?.g || 0, s: activeAth?.s || 0, b: activeAth?.b || 0, acad: activeAth?.academy || activeAth?.a || "" });
  const [bio, setBio] = useState(null);
  const [myFamilyBios, setMyFamilyBios] = useState([]);
  const [watcherCount, setWatcherCount] = useState(0);
  const [igPrompt, setIgPrompt] = useState(false);
  const [claimStep, setClaimStep] = useState(false);
  const [confirmIdentity, setConfirmIdentity] = useState(false);
  const [editBio, setEditBio] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const [coInput, setCoInput] = useState("");
  const [musicPref, setMusicPref] = useState(() => {
    try { return localStorage.getItem("md_music_pref") || ""; } catch { return ""; }
  });
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [showShareStudio, setShowShareStudio] = useState(false);
  const [playingVibe, setPlayingVibe] = useState(false);
  const [previewArt, setPreviewArt] = useState("");
  const [previewTrackUrl, setPreviewTrackUrl] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showNativeAudioBar, setShowNativeAudioBar] = useState(false);
  const audioElRef = useRef(null);
  const previewUrlRef = useRef("");

  useEffect(() => {
    return () => {
      if (audioElRef.current) {
        try { audioElRef.current.pause(); audioElRef.current.currentTime = 0; } catch {}
      }
      if (window.__mdActiveAudio) {
        try { window.__mdActiveAudio.pause(); window.__mdActiveAudio = null; } catch {}
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setShowNativeAudioBar(false);
    setPlayingVibe(false);
    const q = (bio?.songRepeat || "").trim();
    if (!q) {
      setPreviewTrackUrl("");
      previewUrlRef.current = "";
      setPreviewArt("");
      return;
    }

    // Immediate zero-network fallback from Firestore bio cache if available!
    if (bio?.songArtworkUrl) setPreviewArt(bio.songArtworkUrl);
    if (bio?.songPreviewUrl && !bio.songPreviewUrl.includes("hdnea=")) {
      previewUrlRef.current = bio.songPreviewUrl;
      setPreviewTrackUrl(bio.songPreviewUrl);
    } else {
      previewUrlRef.current = "";
      setPreviewTrackUrl("");
    }

    // Live dual-engine lookup (Deezer .mp3 + iTunes .m4a)
    lookupSongPreview(q, bio?.songUrl || "").then((track) => {
      if (cancelled || !track) return;
      if (track.artworkUrl60) setPreviewArt(track.artworkUrl60);
      if (track.previewUrl) {
        previewUrlRef.current = track.previewUrl;
        setPreviewTrackUrl(track.previewUrl);
      }
    });
    return () => { cancelled = true; };
  }, [bio?.songRepeat, bio?.songUrl, bio?.songPreviewUrl, bio?.songArtworkUrl]);

  const toggleSongPreview = (e) => {
    e.stopPropagation();
    const el = audioElRef.current;

    // iOS 17+ Safari: allow audio playback even when physical Ringer switch is on Silent
    try {
      if (navigator.audioSession) {
        navigator.audioSession.type = "playback";
      }
    } catch {}

    if (playingVibe) {
      if (el) {
        try { el.pause(); el.currentTime = 0; } catch {}
      }
      if (window.__mdActiveAudio) {
        try { window.__mdActiveAudio.pause(); window.__mdActiveAudio = null; } catch {}
      }
      setPlayingVibe(false);
      return;
    }

    if (!bio?.songRepeat || !el) return;

    // Case A: Track URL is ready -> call el.play() synchronously on line 1 of tap without mutating .src!
    if (previewUrlRef.current) {
      if (window.__mdActiveAudio && window.__mdActiveAudio !== el) {
        try { window.__mdActiveAudio.pause(); } catch {}
      }
      if (el.getAttribute("src") !== previewUrlRef.current) {
        el.src = previewUrlRef.current;
      }
      el.muted = false;
      el.volume = 1.0;
      window.__mdActiveAudio = el;
      setPlayingVibe(true);
      const p = el.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          setPlayingVibe(false);
          setShowNativeAudioBar(true);
        });
      }
      return;
    }

    // Case B: Tapped before lookup finished -> unlock <audio> synchronously inside gesture with 1-sample silent WAV!
    const SILENT_WAV = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
    try {
      el.src = SILENT_WAV;
      el.muted = false;
      const u = el.play();
      if (u && typeof u.catch === "function") u.catch(() => {});
      el.pause();
    } catch {}

    setLoadingPreview(true);
    lookupSongPreview(bio.songRepeat, bio?.songUrl || "").then((track) => {
      setLoadingPreview(false);
      if (track?.artworkUrl60) setPreviewArt(track.artworkUrl60);
      if (track?.previewUrl) {
        previewUrlRef.current = track.previewUrl;
        setPreviewTrackUrl(track.previewUrl);
        el.src = track.previewUrl;
        el.volume = 1.0;
        window.__mdActiveAudio = el;
        setPlayingVibe(true);
        const p2 = el.play();
        if (p2 && typeof p2.catch === "function") {
          p2.catch(() => {
            setPlayingVibe(false);
            setShowNativeAudioBar(true);
          });
        }
      } else {
        setShowMusicPicker(true);
      }
    });
  };

  const emptyForm = {
    handle: "", nickname: "", spiritEmoji: "", songRepeat: "", songUrl: "", musicVibe: "",
    quote: "", currentRead: "", age: "", belt: "", coach: "", favMove: "",
    cheatMeal: "", funFact: "", avatarData: "", photoCredit: "", openSf: false,
    showWatchCount: false, bracketPushAlerts: true, songPreviewUrl: "", songArtworkUrl: "", coEmails: [], jitsUrl: "", careerG: "", careerS: "", careerB: ""
  };
  const [form, setForm] = useState(emptyForm);

  const [curUser, setCurUser] = useState(() => auth.currentUser);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setCurUser(u || null));
    return () => unsub();
  }, []);

  const avatarInputRef = useRef(null);
  const editBioRef = useRef(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [photoSavedToast, setPhotoSavedToast] = useState(false);
  const [songQuery, setSongQuery] = useState("");
  const [songResults, setSongResults] = useState([]);
  const [songSearching, setSongSearching] = useState(false);
  const [changingSong, setChangingSong] = useState(false);
  const [showCustomSongUrl, setShowCustomSongUrl] = useState(false);
  const [editorPlayingUrl, setEditorPlayingUrl] = useState("");
  const [pushDeviceStatus, setPushDeviceStatus] = useState(() =>
    typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted" ? "ready" : "idle"
  );

  useEffect(() => { editBioRef.current = editBio; }, [editBio]);

  useEffect(() => {
    const q = songQuery.trim();
    if (!editBio || q.length < 2) {
      setSongResults([]);
      setSongSearching(false);
      return;
    }
    let cancelled = false;
    setSongSearching(true);
    const t = setTimeout(() => {
      searchWalkoutCandidates(q).then(res => {
        if (!cancelled) {
          setSongResults(res || []);
          setSongSearching(false);
        }
      });
    }, 280);
    return () => { cancelled = true; clearTimeout(t); };
  }, [songQuery, editBio]);

  const formatBioToForm = (src = {}, fallback = {}) => {
    const merged = { ...emptyForm, ...fallback, ...src };
    Object.keys(emptyForm).forEach(k => {
      if ((merged[k] === "" || merged[k] === undefined || merged[k] === null) && fallback && fallback[k]) {
        merged[k] = fallback[k];
      }
    });
    const rawPc = merged.photoCredit || "";
    const rawH = merged.handle || "";
    return {
      ...merged,
      belt: normalizeBeltValue(merged.belt || ""),
      handle: rawH ? "@" + String(rawH).replace(/^@+/, "") : "",
      photoCredit: rawPc ? (/^https?:\/\//i.test(rawPc) ? rawPc : "@" + String(rawPc).replace(/^@+/, "")) : "",
      bracketPushAlerts: merged.bracketPushAlerts !== false,
      coEmails: Array.isArray(merged.coEmails) ? merged.coEmails : []
    };
  };

  const refreshFamilyBios = () => {
    if (!curUser?.uid) { setMyFamilyBios([]); return; }
    const myEm = (curUser.email || "").toLowerCase();
    getDocs(query(collection(db, "mat_watches"), where("kind", "==", "athlete_bio"))).then(sn => {
      const mine = sn.docs.map(d => d.data()).filter(x => x.name && (x.ownerUid === curUser.uid || (myEm && (x.ownerEmail || "").toLowerCase() === myEm) || (myEm && (x.coEmails || []).includes(myEm))));
      setMyFamilyBios(mine);
    }).catch(() => {});
  };

  useEffect(() => { refreshFamilyBios(); }, [curUser?.uid, curUser?.email]);

  useEffect(() => {
    if (!slug) return;
    trackEvent("trophyViews");
    const passedEvs = activeAth?.events || [];
    setEvs(passedEvs);
    setCnt({ g: activeAth?.g || 0, s: activeAth?.s || 0, b: activeAth?.b || 0, acad: activeAth?.academy || activeAth?.a || "" });
    setEditBio(false);
    editBioRef.current = false;
    setClaimStep(false);
    setConfirmIdentity(false);
    setIgPrompt(false);
    setShowMusicPicker(false);
    setSongQuery("");
    setSongResults([]);
    setChangingSong(false);
    setWatcherCount(0);

    let cached = null;
    try { const raw = localStorage.getItem(lsKey); cached = raw ? JSON.parse(raw) : null; } catch {}
    setBio(cached);
    setForm(cached ? formatBioToForm(cached) : emptyForm);

    const mergeIncomingBio = (incoming) => {
      setBio(prev => {
        const p = prev || {};
        const incNewer = !p.updatedAt || !incoming.updatedAt || incoming.updatedAt >= p.updatedAt;
        const primary = incNewer ? incoming : p;
        const secondary = incNewer ? p : incoming;
        const next = { ...secondary, ...primary };
        if (!next.ownerEmail && (p.ownerEmail || incoming.ownerEmail)) next.ownerEmail = incoming.ownerEmail || p.ownerEmail;
        if ((!next.coEmails || !next.coEmails.length) && ((incoming.coEmails && incoming.coEmails.length) || (p.coEmails && p.coEmails.length))) {
          next.coEmails = (incoming.coEmails && incoming.coEmails.length) ? incoming.coEmails : p.coEmails;
        }
        next.avatarData = primary.avatarData || secondary.avatarData || cached?.avatarData || "";
        safeWriteBioCache(lsKey, next);
        if (!editBioRef.current) {
          setForm(fPrev => formatBioToForm(next, fPrev));
        }
        return next;
      });
    };

    const pubKey = "pubbio_" + slug;
    getDoc(doc(db, "event_competitors", pubKey)).then(pd => {
      if (pd.exists() && pd.data()?.event_id === "__public_bios__") {
        mergeIncomingBio(pd.data());
      }
    }).catch(() => {});

    getDoc(doc(db, "mat_watches", docKey)).then(d => {
      if (d.exists() && d.data()?.kind === "athlete_bio") {
        const bd = d.data();
        if (bd.academy && cleanAcademyName(bd.academy) !== bd.academy) {
          const fixedAc = cleanAcademyName(bd.academy);
          bd.academy = fixedAc;
          if (curUser && (bd.ownerUid === curUser.uid || (bd.coEmails || []).includes((curUser.email || "").toLowerCase()))) {
            setDoc(doc(db, "mat_watches", docKey), { academy: fixedAc }, { merge: true }).catch(() => {});
            setDoc(doc(db, "event_competitors", pubKey), { event_id: "__public_bios__", slug, academy: fixedAc }, { merge: true }).catch(() => {});
          }
        }
        if (!bd.avatarData && cached?.avatarData && curUser && (bd.ownerUid === curUser.uid || (bd.coEmails || []).includes((curUser.email || "").toLowerCase()))) {
          bd.avatarData = cached.avatarData;
          setDoc(doc(db, "mat_watches", docKey), { avatarData: cached.avatarData }, { merge: true }).catch(() => {});
          setDoc(doc(db, "event_competitors", pubKey), { event_id: "__public_bios__", slug, avatarData: cached.avatarData }, { merge: true }).catch(() => {});
        }
        mergeIncomingBio(bd);
      }
    }).catch(() => {});

    setHistEvs([]);
    setCoachedSquadStats(null);
    setPromBouts([]);
    setEraView("2026");
    // Check if this athlete is a Head Professor / Coach of an Academy & load their Squad's Coached Medal Haul!
    getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__public_bios__"))).then(sn => {
      const nFold = foldStr(nm);
      let students = 0;
      let matchedGym = "";
      sn.forEach(d => {
        const b = d.data() || {};
        const cFold = foldStr(String(b.coach || "").replace(/^(?:head\s+)?(?:professor|prof\.?|coach|master|mestre|sensei)\s+/i, ""));
        if (cFold && (cFold.includes(nFold) || nFold.includes(cFold))) {
          students++;
          if (!matchedGym && b.academy) matchedGym = cleanAcademyName(b.academy);
        }
      });
      const targetGym = matchedGym || (/black/i.test(bio?.belt || "") ? cleanAcademyName(knownAcad || bio?.academy || "") : "");
      if (targetGym && (students > 0 || /thiago mendes|bruno bastos/i.test(nm))) {
        const gk = foldStr(targetGym).replace(/[^a-z0-9]/g, "").replace(/(hq|bjj|jiujitsu|academy|mma)$/, "");
        getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__lb_all_all__"))).then(lsn => {
          lsn.forEach(ld => {
            ((ld.data() || {}).items || []).forEach(row => {
              const rk = foldStr(row.Academy || row.a || "").replace(/[^a-z0-9]/g, "");
              if (rk && (rk === gk || rk.includes(gk) || gk.includes(rk))) {
                setCoachedSquadStats({
                  academy: targetGym,
                  g: Number(row.Gold || row.g || 0),
                  s: Number(row.Silver || row.s || 0),
                  b: Number(row.Bronze || row.b || 0),
                  students
                });
              }
            });
          });
        }).catch(() => {});
      }
    }).catch(() => {});

    getDocs(query(collection(db, "mat_watches"), where("athleteName", "==", nm))).then(sn => {
      const uniqueWatchers = new Set();
      sn.forEach(d => {
        const wd = d.data() || {};
        if (wd.kind || (!wd.active && !wd.followFuture)) return;
        uniqueWatchers.add(wd.uid || (wd.email || "").toLowerCase() || wd.fcmToken || d.id);
      });
      setWatcherCount(uniqueWatchers.size);
    }).catch(() => {});

    // Fetch Promoter SuperFight bouts/results & Prior-Year All-Time Career Archive in background
    getDocs(query(collection(db, "mat_watches"), where("kind", "==", "prom_cfg"))).then(sn => {
      const myBouts = [];
      const tLow = foldStr(nm);
      sn.forEach(d => {
        const cfg = d.data() || {};
        (cfg.boutResults || []).forEach(r => {
          if (foldStr(r.winner) === tLow || foldStr(r.loser) === tLow) {
            const won = foldStr(r.winner) === tLow;
            myBouts.push({
              ev: cfg.eventName || "Verified SuperFight",
              d: (won ? "🏆 W vs. " + r.loser : "Bout vs. " + r.winner) + (r.method ? " (" + r.method + ")" : ""),
              p: won ? 1 : 2,
              f: "SUPERFIGHT",
              yr: 2026
            });
          }
        });
      });
      if (myBouts.length) setPromBouts(myBouts);
    }).catch(() => {});

    const knownAcad = activeAth?.academy || activeAth?.a || cached?.academy || "";
    const seedGender = inferTargetGender(nm, passedEvs);
    setFedRanks([]);

    const bkts = athBucketsForQuery(nm);
    if (!bkts.length && athBucket(nm) !== "__") bkts.push(athBucket(nm));

    // Fetch Daily Official Federation #Rank Standings (__f2_XX__) for this athlete!
    Promise.all(bkts.map(b => getCachedShardItems(db, collection, query, where, getDocs, "__f2_" + b + "__"))).then(arrays => {
      const fHits = [], seenF = new Set();
      arrays.forEach(arr => arr.forEach(it => {
        if (!strictVerifiedAthleteRowMatch(it.n, it.a || knownAcad, it.cat || "", nm, knownAcad, seedGender)) return;
        const fk = it.fed + "|" + it.cat;
        if (seenF.has(fk)) return;
        seenF.add(fk);
        fHits.push(it);
      }));
      fHits.sort((a, b) => parseInt(String(a.rank || "9999").replace(/\D/g, ""), 10) - parseInt(String(b.rank || "9999").replace(/\D/g, ""), 10));
      setFedRanks(fHits);
    }).catch(() => {});

    // Fetch Prior-Year All-Time Career Podiums (__alltime_a2_XX__) with strict gender + academy guard!
    Promise.all(bkts.map(b => getCachedShardItems(db, collection, query, where, getDocs, "__alltime_a2_" + b + "__"))).then(arrays => {
      const seenH = new Set(), outH = [];
      arrays.forEach(arr => arr.forEach(it => {
        const sameExactOrPriorSchool = strictVerifiedAthleteRowMatch(it.n, it.a, it.d, nm, knownAcad, seedGender) ||
          strictVerifiedAthleteRowMatch(it.n, it.a, it.d, nm, "", seedGender);
        if (!sameExactOrPriorSchool) return;
        if (/black/i.test(bio?.belt || "") && /\b(white|blue|grey|gray|yellow|orange|green)\b/i.test(it.d || "") && Number(it.yr || 2018) >= 2022) return;
        const dk = foldStr(it.ev) + "|" + foldStr(it.d) + "|" + it.p;
        if (seenH.has(dk)) return;
        seenH.add(dk);
        outH.push(it);
      }));
      outH.sort((a, b) => (Number(b.yr || 0) - Number(a.yr || 0)) || (Number(a.p || 3) - Number(b.p || 3)));
      setHistEvs(outH);
    }).catch(() => {});

    // Fetch 2026 Season Podiums (__a2_XX__) with strict gender + academy guard!
    Promise.all(bkts.map(b => getCachedShardItems(db, collection, query, where, getDocs, "__a2_" + b + "__"))).then(arrays => {
      const rawItems = [];
      arrays.forEach(arr => arr.forEach(it => rawItems.push(it)));
      const resolvedGen = seedGender || inferTargetGender(nm, rawItems);
      let resolvedAcad = knownAcad;
      if (!resolvedAcad) {
        const exactHit = rawItems.find(it => foldStr(it.n) === foldStr(nm) && it.a);
        if (exactHit) resolvedAcad = exactHit.a;
      }

      const seen = new Set(), out = [];
      passedEvs.forEach(pe => {
        if (!strictVerifiedAthleteRowMatch(pe.n || nm, pe.a || resolvedAcad, pe.d, nm, resolvedAcad, resolvedGen)) return;
        const dk = foldStr(pe.ev) + "|" + foldStr(pe.d) + "|" + pe.p;
        if (!seen.has(dk)) { seen.add(dk); out.push(pe); }
      });

      rawItems.forEach(it => {
        if (it.isEventSummary || it.isRosterEntry) return;
        if (!strictVerifiedAthleteRowMatch(it.n, it.a, it.d, nm, resolvedAcad, resolvedGen)) return;
        const dk = foldStr(it.ev) + "|" + foldStr(it.d) + "|" + it.p;
        if (seen.has(dk)) return;
        seen.add(dk);
        out.push(it);
        if (!resolvedAcad && it.a) resolvedAcad = it.a;
      });

      const gTot = out.reduce((a, x) => a + (x.mg !== undefined ? Number(x.mg) : (Number(x.p) === 1 ? 1 : 0)), 0);
      const sTot = out.reduce((a, x) => a + (x.ms !== undefined ? Number(x.ms) : (Number(x.p) === 2 ? 1 : 0)), 0);
      const bTot = out.reduce((a, x) => a + (x.mb !== undefined ? Number(x.mb) : (Number(x.p) >= 3 ? 1 : 0)), 0);
      setEvs(out);
      setCnt({ g: gTot, s: sTot, b: bTot, acad: resolvedAcad });
    }).catch(() => {});
  }, [nm]);

  const elite = computeEliteSpotlight({ name: nm, academy: cnt.acad, g: cnt.g, s: cnt.s, b: cnt.b, events: evs }, bio?.funFact);
  const curEmailLow = (curUser?.email || "").toLowerCase();
  const isClaimed = Boolean(bio?.ownerUid);
  const isOwner = Boolean(curUser && ((bio?.ownerUid && bio.ownerUid === curUser.uid) || (curEmailLow && (bio?.coEmails || []).includes(curEmailLow))));
  const hasNeonGoldRing = watcherCount >= WATCH_GLOW_MIN;
  const bioUrl = "https://matdates.com/?trophy=" + encodeURIComponent(nm).replace(/%20/g, "+");

  // Smart Youth (Jits) vs Adult (Smoothcomp) detection — Jits is strictly for Youth competitors!
  const isYouthCompetitor = (() => {
    const savedLink = (bio?.jitsUrl || "").toLowerCase();
    if (savedLink.includes("jits.gg")) return true;
    if (savedLink.includes("smoothcomp.com")) return false;
    const numAge = parseInt(bio?.age || "", 10);
    if (!isNaN(numAge) && numAge > 0) return numAge < 18;
    const beltStr = ((bio?.belt || "") + " " + (elite.pro?.belt || "")).toLowerCase();
    if (/\b(grey|gray|yellow|orange|green|pee[\s-]?wee|mighty|kids?|youth|teen|juvenile)\b/.test(beltStr)) return true;
    if (/\b(blue|purple|brown|black)\b/.test(beltStr) && !/juvenile|teen/.test(beltStr)) return false;
    if (elite.pro) return false;
    const divBlob = evs.map(e => (e.d || "") + " " + (e.ev || "")).join(" ").toLowerCase();
    if (/\b(kids?|youth|boys?|girls?|pee[\s-]?wee|mighty[\s-]?mite|junior|teen|juvenile|tots?|6\s*&\s*under)\b/.test(divBlob)) return true;
    if (/\b(adult|master|veteran|mens|womens)\b/.test(divBlob)) return false;
    return false;
  })();

  const externalRecordHref = (() => {
    const u = (bio?.jitsUrl || "").trim();
    if (isYouthCompetitor) {
      return u.includes("jits.gg") ? u : ("https://jits.gg/search?q=" + encodeURIComponent(nm));
    }
    return u.includes("smoothcomp.com") ? u : ("https://www.google.com/search?q=site:smoothcomp.com/profile+" + encodeURIComponent(nm));
  })();

  const externalRecordLabel = isYouthCompetitor
    ? ((bio?.jitsUrl || "").includes("jits.gg") ? "📊 Jits Profile ↗" : "📊 Jits ↗")
    : ((bio?.jitsUrl || "").includes("smoothcomp.com") ? "🌐 Smoothcomp Profile ↗" : "🌐 Smoothcomp ↗");

  const handleSongClick = () => {
    if (!bio?.songRepeat) return;
    if (bio?.songUrl && /^https?:\/\//i.test(bio.songUrl)) {
      window.open(bio.songUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (musicPref) {
      window.open(buildMusicSearchUrl(musicPref, bio.songRepeat, ""), "_blank", "noopener,noreferrer");
    } else {
      setShowMusicPicker(p => !p);
    }
  };

  const chooseMusicService = (svc) => {
    setMusicPref(svc);
    try { localStorage.setItem("md_music_pref", svc); } catch {}
    setShowMusicPicker(false);
    if (bio?.songRepeat) {
      window.open(buildMusicSearchUrl(svc, bio.songRepeat, bio?.songUrl || ""), "_blank", "noopener,noreferrer");
    }
  };

  const stopEditorSample = () => {
    try {
      if (window.__mdActiveAudio) {
        window.__mdActiveAudio.pause();
        window.__mdActiveAudio = null;
      }
    } catch {}
    setEditorPlayingUrl("");
  };

  const toggleEditorSample = (url) => {
    if (!url) return;
    if (editorPlayingUrl === url) {
      stopEditorSample();
      return;
    }
    stopEditorSample();
    try {
      const a = new Audio(url);
      window.__mdActiveAudio = a;
      setEditorPlayingUrl(url);
      a.onended = () => setEditorPlayingUrl("");
      a.onerror = () => setEditorPlayingUrl("");
      a.play().catch(() => setEditorPlayingUrl(""));
    } catch {}
  };

  const connectDevicePush = async () => {
    if (!curUser) return;
    setPushDeviceStatus("requesting");
    try {
      const ok = await isSupported();
      if (!ok || !("Notification" in window) || !("serviceWorker" in navigator)) {
        alert("On iPhone/iPad, tap Safari's Share icon -> 'Add to Home Screen' and open MatDates from your Home Screen to enable lock-screen push alerts!");
        setPushDeviceStatus("idle");
        return;
      }
      const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (perm !== "granted") {
        setPushDeviceStatus("denied");
        return;
      }
      await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      const reg = await navigator.serviceWorker.ready;
      const vapid = import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined;
      const opts = vapid ? { serviceWorkerRegistration: reg, vapidKey: vapid } : { serviceWorkerRegistration: reg };
      const tok = await getToken(getMessaging(), opts);
      if (tok) {
        await setDoc(doc(db, "mat_watches", "pushdev_" + curUser.uid), {
          kind: "user_push_device",
          uid: curUser.uid,
          email: (curUser.email || "").trim().toLowerCase(),
          fcmTokens: arrayUnion(tok),
          updatedAt: new Date().toISOString()
        }, { merge: true });
        setPushDeviceStatus("ready");
      } else {
        setPushDeviceStatus("idle");
      }
    } catch {
      setPushDeviceStatus("idle");
    }
  };

  // Instant 1-Tap Avatar Ring Upload & Auto-Save (NEVER overwrites song, links, or any other bio fields!)
  const handleInstantAvatarPick = async (e) => {
    const f = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!f) return;
    if (!curUser) {
      alert("Please Sign In first so your profile photo saves permanently to your Trophy Room!");
      return;
    }
    setAvatarSaving(true);
    try {
      const resized = await resizeAvatarFile(f);
      if (!resized) { setAvatarSaving(false); return; }
      setForm(p => ({ ...p, avatarData: resized }));
      if (isOwner || !isClaimed) {
        const nowIso = new Date().toISOString();
        const patch = {
          ...((form.careerG !== "" || baseBio.careerG !== undefined) ? {
        careerG: form.careerG !== "" ? Math.max(0, parseInt(form.careerG, 10) || 0) : (baseBio.careerG || 0),
        careerS: form.careerS !== "" ? Math.max(0, parseInt(form.careerS, 10) || 0) : (baseBio.careerS || 0),
        careerB: form.careerB !== "" ? Math.max(0, parseInt(form.careerB, 10) || 0) : (baseBio.careerB || 0)
      } : {}),
      ...(baseBio.jitsRating ? { jitsRating: baseBio.jitsRating } : {}),
      ...(baseBio.jitsOverallRank ? { jitsOverallRank: baseBio.jitsOverallRank } : {}),
      ...(baseBio.jitsGiRank ? { jitsGiRank: baseBio.jitsGiRank } : {}),
      ...(baseBio.jitsNoGiRank ? { jitsNoGiRank: baseBio.jitsNoGiRank } : {}),
      ...(baseBio.jitsRecord ? { jitsRecord: baseBio.jitsRecord } : {}),
      ...(baseBio.jitsWinRate ? { jitsWinRate: baseBio.jitsWinRate } : {}),
      ...(baseBio.jitsTier ? { jitsTier: baseBio.jitsTier } : {}),
      ...(baseBio.jitsPercentile ? { jitsPercentile: baseBio.jitsPercentile } : {}),
      kind: "athlete_bio",
          status: "bio_only",
          ownerUid: bio?.ownerUid || curUser.uid,
          ownerEmail: bio?.ownerEmail || curUser.email || "",
          name: nm,
          academy: cleanAcademyName(bio?.academy || cnt.acad || elite.pro?.academy || ""),
          avatarData: resized,
          updatedAt: nowIso
        };
        const { ownerEmail, ...pubPatch } = patch;
        await Promise.all([
          setDoc(doc(db, "mat_watches", docKey), patch, { merge: true }),
          setDoc(doc(db, "event_competitors", "pubbio_" + slug), { ...pubPatch, event_id: "__public_bios__", slug, isClaimed: true }, { merge: true })
        ]);
        setBio(prev => {
          const next = { ...(prev || {}), ...patch };
          safeWriteBioCache(lsKey, next);
          return next;
        });
        refreshFamilyBios();
        setPhotoSavedToast(true);
        setTimeout(() => setPhotoSavedToast(false), 3200);
      }
    } catch (err) {
      alert("Could not save photo: " + (err?.message || "Please try again."));
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleRemoveAvatarInstant = async () => {
    setForm(p => ({ ...p, avatarData: "__REMOVE__" }));
    if (isOwner && curUser) {
      const nowIso = new Date().toISOString();
      await Promise.all([
        setDoc(doc(db, "mat_watches", docKey), { avatarData: "", updatedAt: nowIso }, { merge: true }),
        setDoc(doc(db, "event_competitors", "pubbio_" + slug), { event_id: "__public_bios__", slug, avatarData: "", updatedAt: nowIso }, { merge: true })
      ]).catch(() => {});
      setBio(prev => {
        const next = { ...(prev || {}), avatarData: "", updatedAt: nowIso };
        safeWriteBioCache(lsKey, next);
        return next;
      });
    }
  };

  const handleRequestOrOpenEdit = () => {
    if (!curUser) {
      alert("Please Sign In first (top right of MatDates) so your Athlete Bio, Photo & Instagram lock permanently to your account!");
      return;
    }
    if (isClaimed && !isOwner) {
      addDoc(collection(db, "mat_watches"), {
        kind: "bio_dispute", name: "Bio Verification Request: " + nm, requesterEmail: curUser.email || "", athleteSlug: slug, adminNotified: false, createdAt: new Date().toISOString()
      }).catch(() => {});
      alert("This profile is claimed by another account. Tip: If this is your family's profile, sign into the parent/athlete account that claimed it and add '" + (curUser.email || "") + "' under Co-Manage Family Accounts!");
      return;
    }
    if (isOwner) {
      setForm(prev => formatBioToForm(bio || {}, prev));
      setChangingSong(false);
      setSongQuery("");
      setIgPrompt(false);
      setClaimStep(false);
      setEditBio(true);
    } else {
      setIgPrompt(false);
      setClaimStep(true);
    }
  };

  const unlockClaimEditor = () => {
    if (!confirmIdentity) return;
    setForm(prev => formatBioToForm(bio || {}, prev));
    setChangingSong(false);
    setSongQuery("");
    setClaimStep(false);
    setEditBio(true);
  };

  const handleInstagramClick = () => {
    if (bio?.handle) {
      trackEvent("igOutclicks");
      window.open("https://instagram.com/" + bio.handle.replace(/^@+/, ""), "_blank", "noopener,noreferrer");
    } else if (isOwner) {
      handleRequestOrOpenEdit();
    } else {
      setIgPrompt(prev => !prev);
    }
  };

  const hasUnsavedChanges = editBio && (() => {
    const b = bio || {};
    const norm = (v) => String(v || "").trim().replace(/^@+/, "");
    return (
      norm(form.handle) !== norm(b.handle) ||
      norm(form.nickname) !== norm(b.nickname) ||
      norm(form.spiritEmoji) !== norm(b.spiritEmoji) ||
      norm((songQuery && (!form.songRepeat || changingSong)) ? songQuery : form.songRepeat) !== norm(b.songRepeat) ||
      norm(form.musicVibe) !== norm(b.musicVibe) ||
      norm(form.songUrl) !== norm(b.songUrl) ||
      norm(form.quote) !== norm(b.quote) ||
      norm(form.currentRead) !== norm(b.currentRead) ||
      norm(form.jitsUrl) !== norm(b.jitsUrl) ||
      norm(form.age) !== norm(b.age) ||
      normalizeBeltValue(form.belt || "") !== normalizeBeltValue(b.belt || "") ||
      norm(form.coach) !== norm(b.coach) ||
      norm(form.favMove) !== norm(b.favMove) ||
      norm(form.cheatMeal) !== norm(b.cheatMeal) ||
      norm(form.funFact) !== norm(b.funFact) ||
      norm(form.photoCredit) !== norm(b.photoCredit) ||
      Boolean(form.openSf) !== Boolean(b.openSf) ||
      Boolean(form.showWatchCount) !== Boolean(b.showWatchCount) ||
      Boolean(form.bracketPushAlerts !== false) !== Boolean(b.bracketPushAlerts !== false) ||
      JSON.stringify(form.coEmails || []) !== JSON.stringify(b.coEmails || []) ||
      Boolean(coInput.trim().includes("@"))
    );
  })();

  const guardExitAction = (fn) => {
    if (!fn) return;
    if (hasUnsavedChanges) {
      if (!window.confirm("You have unsaved profile edits! Discard changes and leave?")) return;
    }
    stopEditorSample();
    fn();
  };

  const saveBio = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!curUser) { alert("Please Sign In first to lock your Athlete Bio!"); return; }
    if (bio?.ownerUid && !isOwner) { alert("This bio is locked to its verified owner."); return; }
    setSaving(true);
    stopEditorSample();

    let latestCloud = {};
    try {
      const snap = await getDoc(doc(db, "mat_watches", docKey));
      if (snap.exists() && snap.data()?.kind === "athlete_bio") latestCloud = snap.data();
    } catch {}
    const baseBio = { ...latestCloud, ...(bio || {}) };

    const pendingEmail = coInput.trim().toLowerCase();
    const mergedCoEmails = Array.from(new Set([
      ...(baseBio.coEmails || []),
      ...(form.coEmails || []),
      ...(pendingEmail.includes("@") ? [pendingEmail] : [])
    ].map(x => String(x).trim().toLowerCase()).filter(x => x.includes("@"))));
    if (pendingEmail.includes("@")) setCoInput("");

    const effectiveSongRepeat = ((changingSong && songQuery.trim()) ? songQuery.trim() : (form.songRepeat || songQuery || "")).trim();

    let resolvedPreview = null;
    if (effectiveSongRepeat && (!form.songPreviewUrl || effectiveSongRepeat !== (form.songRepeat || "").trim())) {
      try { resolvedPreview = await lookupSongPreview(effectiveSongRepeat, (form.songUrl || "").trim()); } catch {}
    }

    const clean = {
      kind: "athlete_bio",
      status: "bio_only",
      ownerUid: baseBio.ownerUid || curUser.uid,
      ownerEmail: baseBio.ownerEmail || curUser.email || "",
      handle: (form.handle || "").replace(/^@+/, "").trim(),
      nickname: (form.nickname || "").replace(/^["']+|["']+$/g, "").trim(),
      spiritEmoji: limitSpiritEmojis(form.spiritEmoji || ""),
      songRepeat: effectiveSongRepeat,
      musicVibe: (form.musicVibe || "").trim(),
      songUrl: (form.songUrl || "").trim(),
      songPreviewUrl: !effectiveSongRepeat
        ? ""
        : (form.songPreviewUrl && effectiveSongRepeat === (form.songRepeat || "").trim()
            ? form.songPreviewUrl
            : (resolvedPreview?.permanentPreviewUrl || resolvedPreview?.previewUrl || baseBio.songPreviewUrl || "")),
      songArtworkUrl: !effectiveSongRepeat
        ? ""
        : (form.songArtworkUrl && effectiveSongRepeat === (form.songRepeat || "").trim()
            ? form.songArtworkUrl
            : (resolvedPreview?.artworkUrl60 || baseBio.songArtworkUrl || "")),
      quote: (form.quote || "").replace(/^["“”]+|["“”]+$/g, "").trim(),
      currentRead: (form.currentRead || "").trim(),
      jitsUrl: (form.jitsUrl || "").trim(),
      age: (form.age || "").trim(),
      belt: (form.belt || "").trim(),
      coach: (form.coach || "").trim(),
      favMove: (form.favMove || "").trim(),
      cheatMeal: (form.cheatMeal || "").trim(),
      funFact: (form.funFact || "").trim(),
      avatarData: form.avatarData === "__REMOVE__" ? "" : (form.avatarData || baseBio.avatarData || ""),
      photoCredit: (form.photoCredit || "").trim().replace(/^@+/, ""),
      openSf: Boolean(form.openSf),
      showWatchCount: Boolean(form.showWatchCount),
      bracketPushAlerts: form.bracketPushAlerts !== false,
      coEmails: mergedCoEmails,
      name: nm,
      academy: cleanAcademyName(cnt.acad || elite.pro?.academy || baseBio.academy || ""),
      updatedAt: new Date().toISOString()
    };
    if (foldStr(clean.nickname) === foldStr(nm)) clean.nickname = "";
    const { ownerEmail, coEmails, ...publicSafeBio } = clean;
    safeWriteBioCache(lsKey, clean);
    try {
      await Promise.all([
        setDoc(doc(db, "mat_watches", docKey), clean, { merge: true }),
        setDoc(doc(db, "event_competitors", "pubbio_" + slug), { ...publicSafeBio, event_id: "__public_bios__", slug, isClaimed: true }, { merge: true })
      ]);
    } catch (err) {
      setSaving(false);
      alert("Cloud sync error: " + (err?.message || "Please check your connection and try saving again."));
      return;
    }
    setBio(clean);
    setForm(formatBioToForm(clean));
    setSongQuery("");
    setChangingSong(false);
    refreshFamilyBios();
    setSaving(false);
    setEditBio(false);
    setClaimStep(false);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3200);
  };

  const hasBioDetails = Boolean(bio && (bio.quote || bio.age || bio.belt || bio.coach || bio.favMove || bio.cheatMeal || bio.currentRead));
  const inp = { padding:"8px 10px", borderRadius:"6px", background:"#0f141e", color:"#fff", border:"1px solid #334155", fontSize:"0.83rem", boxSizing:"border-box" };

  // Format display name with optional Fight Nickname in gold quotes
  const nameParts = nm.trim().split(/\s+/);
  const firstName = nameParts[0] || nm;
  const restName = nameParts.slice(1).join(" ");

  const currentAcad = cleanAcademyName(bio?.academy || cnt.acad || elite.pro?.academy || histEvs[0]?.a || "Independent");
  const liveBelt = (editBio || claimStep)
    ? (form.belt || bio?.belt || elite.pro?.belt || "")
    : (bio?.belt || elite.pro?.belt || "");

  // Deduplicate histEvs against 2026 evs so 2026 events are never counted twice in All-Time
  loadTrEventDates(db, collection, getDocs);
  const s26Evs = sortPodiumsNewestFirst(dedupeVerifiedMedals([...promBouts, ...evs]), 2026);
  const cleanHistEvs = sortPodiumsNewestFirst(dedupeVerifiedMedals([...histEvs, ...(elite.pro?.careerPodiums || [])], s26Evs), 2025);

  const g26 = s26Evs.reduce((acc, x) => acc + (x.mg !== undefined ? Number(x.mg) : (Number(x.p) === 1 ? 1 : 0)), 0) || cnt.g;
  const s26 = s26Evs.reduce((acc, x) => acc + (x.ms !== undefined ? Number(x.ms) : (Number(x.p) === 2 ? 1 : 0)), 0) || cnt.s;
  const b26 = s26Evs.reduce((acc, x) => acc + (x.mb !== undefined ? Number(x.mb) : (Number(x.p) >= 3 ? 1 : 0)), 0) || cnt.b;
  const hG = cleanHistEvs.reduce((acc, x) => acc + (Number(x.p) === 1 ? 1 : 0), 0);
  const hS = cleanHistEvs.reduce((acc, x) => acc + (Number(x.p) === 2 ? 1 : 0), 0);
  const hB = cleanHistEvs.reduce((acc, x) => acc + (Number(x.p) >= 3 ? 1 : 0), 0);

  // Combine 2026 + Pre-2026 Archive + Jits/Career floor (so All-Time always reflects true multi-year career medals!)
  const totG = Math.max(g26 + hG, Number(bio?.careerG || elite.pro?.careerG || 0));
  const totS = Math.max(s26 + hS, Number(bio?.careerS || elite.pro?.careerS || 0));
  const totB = Math.max(b26 + hB, Number(bio?.careerB || elite.pro?.careerB || 0));

  useEffect(() => {
    if ((g26 + s26 + b26) === 0 && (totG + totS + totB > 0 || cleanHistEvs.length > 0)) {
      setEraView("ALLTIME");
    }
  }, [nm, g26, s26, b26, totG, totS, totB, cleanHistEvs.length]);

  const dispG = eraView === "ALLTIME" ? totG : g26;
  const dispS = eraView === "ALLTIME" ? totS : s26;
  const dispB = eraView === "ALLTIME" ? totB : b26;
  const dispPts = dispG * 9 + dispS * 3 + dispB;
  const allCombinedEvs = sortPodiumsNewestFirst([...s26Evs, ...cleanHistEvs], 2026);
  const visibleEvents = eraView === "ALLTIME" ? allCombinedEvs : s26Evs;
  const hasScoutingCards = Boolean(bio && (bio.quote || bio.age || bio.coach || bio.favMove || bio.cheatMeal || bio.currentRead));

  return (
    <div
      onClick={onClose}
      style={{
        position:"fixed", inset:0, background:"rgba(4,8,18,0.92)", zIndex:10070,
        display:"flex", alignItems:"center", justifyContent:"center", padding:"10px",
        overscrollBehavior:"none"
      }}
    >
      <style>{`.md-tr-close-desktop { display: none !important; }
      }
      @keyframes mdNeonGoldPulse { 0%, 100% { box-shadow: 0 0 10px rgba(250,204,21,0.55), 0 0 22px rgba(245,158,11,0.35); } 50% { box-shadow: 0 0 16px rgba(250,204,21,0.9), 0 0 32px rgba(245,158,11,0.55); } }`}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{ position: "relative", 
          background:"#0b101b", border:"1.5px solid rgba(245,158,11,0.7)", borderRadius:"16px",
          maxWidth:"670px", width:"100%", maxHeight:"88dvh",
          display:"flex", flexDirection:"column", overflow:"hidden",
          textAlign:"left", color:"#fff", boxShadow:"0 22px 55px rgba(0,0,0,0.9)"
        }}
      >
          <div style={{ position: "absolute", top: "9px", right: "10px", zIndex: 45, display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                onClick={() => { trackEvent("shareStatsClicks"); setShowShareStudio(true); }}
                title="Share Trophy Room, Mat-Side QR Pass & Gold-Foil BJJ Trading Card"
                style={{
                  height: "32px", padding: "0 10px", borderRadius: "999px",
                  background: "linear-gradient(135deg,#f59e0b,#fde047)", color: "#000",
                  border: "none", display: "inline-flex", alignItems: "center", gap: "4px",
                  fontSize: "0.73rem", fontWeight: "900", cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(245,158,11,0.4)", whiteSpace: "nowrap"
                }}
              >
                🃏 Share / Card
              </button>
              <button
                type="button"
                onClick={() => guardExitAction(onClose)}
                aria-label="Close Trophy Room"
                style={{
                  width: "32px", height: "32px", borderRadius: "50%",
                  background: "rgba(15,23,42,0.94)", color: "#cbd5e1",
                  border: "1px solid #334155", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: "0.95rem", fontWeight: "800",
                  cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.45)"
                }}
              >
                ✕
              </button>
            </div>
        {/* PINNED TOP BAR: Official Trophy Room + Verified (Left) • Watch + Jits/Smoothcomp + Close (Right) */}
        <div style={{
          display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap",
          padding:"10px 158px 10px 14px", borderRadius:"15px 15px 0 0", background:"#101726", borderBottom:"1px solid #243044", flexShrink:0
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
            {effectiveOnBack && (
                <button
                  type="button"
                  onClick={() => guardExitAction(effectiveOnBack)}
                  aria-label="Go Back"
                  style={{
                    background:"linear-gradient(135deg,#0284c7,#0369a1)",
                    color:"#ffffff",
                    border:"1px solid #38bdf8",
                    borderRadius:"8px",
                    padding:"6px 12px",
                    fontSize:"0.78rem",
                    fontWeight:"900",
                    cursor:"pointer",
                    display:"inline-flex",
                    alignItems:"center",
                    gap:"5px",
                    boxShadow:"0 2px 10px rgba(2,132,199,0.4)",
                    flexShrink:0
                  }}
                >
                  {effectiveBackLabel}
                </button>
              )}
            <span style={{ color:"#fbbf24", fontSize:"0.71rem", fontWeight:"900", letterSpacing:"1.2px", textTransform:"uppercase" }}>
              🏆 Official Trophy Room
            </span>
            {isClaimed && (
              <span style={{ background:"rgba(34,197,94,0.16)", color:"#4ade80", border:"1px solid rgba(34,197,94,0.45)", borderRadius:"10px", padding:"1px 7px", fontSize:"0.66rem", fontWeight:"800" }}>
                ✓ Verified
              </span>
            )}
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
            <button
              type="button"
              onClick={() => { onWatch(nm, currentAcad); setTimeout(() => setWatcherCount(c => isWatching ? c : Math.max(1, c + 1)), 250); }}
              style={{
                background: isWatching ? "#132a1c" : "#162536",
                color: isWatching ? "#2ecc71" : "#38bdf8",
                border: isWatching ? "1px solid #2ecc71" : "1px solid #0284c7",
                borderRadius:"7px", padding:"5px 9px", fontWeight:"800", fontSize:"0.73rem", cursor:"pointer", whiteSpace:"normal"
              }}
            >
              {isWatching ? "✓ Watching" : "🔔 Watch"}
              {bio?.showWatchCount ? ` • 🔥${watcherCount}` : (isOwner ? ` • 👁️${watcherCount}` : "")}
            </button>

              <a
                href={externalRecordHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { if (isYouthCompetitor) trackEvent("jitsGgOutclicks"); }}
              style={{
                background: isYouthCompetitor ? "#132033" : "#241b12",
                color: isYouthCompetitor ? "#38bdf8" : "#ff9f43",
                border: isYouthCompetitor ? "1px solid #0284c7" : "1px solid #d97706",
                borderRadius:"7px", padding:"5px 9px", fontWeight:"800", fontSize:"0.73rem",
                textDecoration:"none", display:"inline-flex", alignItems:"center", gap:"4px", whiteSpace:"normal"
              }}
            >
              {externalRecordLabel}
            </a>

            
          </div>
        </div>

        {/* DEDICATED CONTAINED SCROLL BODY (Eliminates iOS Bottom Bounce-Out & Freeze!) */}
        <div style={{
          flex:1, minHeight:0, overflowY:"auto", overscrollBehavior:"contain",
          WebkitOverflowScrolling:"touch", padding:"14px 15px 30px"
        }}>
          {/* MULTI-ATHLETE FAMILY QUICK-SWITCHER */}
          {myFamilyBios.length > 1 && (
            <div style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap", marginBottom:"11px", paddingBottom:"8px", borderBottom:"1px solid #1e293b" }}>
              <span style={{ fontSize:"0.69rem", color:"#94a3b8", fontWeight:"800", letterSpacing:"0.5px" }}>👨‍👩‍👧‍👦 MY ATHLETES:</span>
              {myFamilyBios.map((fb, idx) => {
                const active = foldStr(fb.name) === foldStr(nm);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => { if (!active) { setAthHistory(h => [...h, activeAth]); setActiveAth({ name: fb.name, academy: fb.academy || "", g: 0, s: 0, b: 0, events: [] }); } }}
                    style={{
                      background: active ? "#f59e0b" : "#161f30",
                      color: active ? "#000" : "#cbd5e1",
                      border: active ? "none" : "1px solid #2d3b52",
                      borderRadius:"14px", padding:"3px 10px", fontSize:"0.72rem", fontWeight:"800", cursor:"pointer"
                    }}
                  >
                    {fb.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* 1. PRO FIGHTER HERO CARD — Intentionally Wrapped Beside & Directly Underneath Profile Photo! */}
          <div style={{ background:"linear-gradient(145deg,#151f32 0%,#0f1624 60%,#1a1625 100%)", border:"1px solid #283548", borderRadius:"13px", padding:"13px" }}>
            {/* Upper Row: Avatar + Vertically Centered Name/Spirit Emoji & Academy/Instagram */}
            <div style={{ display:"flex", alignItems:"center", gap:"13px", flexWrap:"nowrap" }}>
              <div style={{ position:"relative", width:"76px", height:"76px", flexShrink:0 }}>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleInstantAvatarPick}
                  style={{ display:"none" }}
                />
                <div
                  onClick={() => {
                    if (isOwner || editBio) avatarInputRef.current?.click();
                    else if (!isClaimed) handleRequestOrOpenEdit();
                  }}
                  title={(isOwner || editBio) ? "Tap to add or change profile photo (auto-saves!)" : (hasNeonGoldRing ? "⚡ 100+ Watchers Club — Neon Gold Status!" : nm)}
                  style={{
                    width:"76px", height:"76px", borderRadius:"50%",
                    border: hasNeonGoldRing ? "3px solid #fde047" : "2.5px solid #f59e0b",
                    animation: hasNeonGoldRing ? "mdNeonGoldPulse 2.2s ease-in-out infinite" : "none",
                    background:"linear-gradient(135deg,#1e293b,#090d16)",
                    display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden",
                    cursor: (isOwner || editBio || !isClaimed) ? "pointer" : "default",
                    boxShadow:"0 6px 18px rgba(0,0,0,0.5)", position:"relative"
                  }}
                >
                  {((editBio ? (form.avatarData !== "__REMOVE__" && (form.avatarData || bio?.avatarData)) : bio?.avatarData)) ? (
                    <img src={editBio ? (form.avatarData && form.avatarData !== "__REMOVE__" ? form.avatarData : bio?.avatarData) : bio?.avatarData} alt={nm} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", opacity: avatarSaving ? 0.45 : 1 }} />
                  ) : (
                    <span style={{ color:"#fbbf24", fontWeight:"900", fontSize:"1.32rem", opacity: avatarSaving ? 0.45 : 1 }}>{initials}</span>
                  )}
                  {avatarSaving && (
                    <span style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(9,13,22,0.6)", color:"#4ade80", fontSize:"0.66rem", fontWeight:"900", textAlign:"center" }}>
                      Saving...
                    </span>
                  )}
                </div>

                {(isOwner || editBio) && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); avatarInputRef.current?.click(); }}
                    title="Change Profile Photo (Saves Automatically)"
                    aria-label="Edit Profile Photo"
                    style={{
                      position:"absolute", right:"-3px", bottom:"-3px", zIndex:5,
                      width:"27px", height:"27px", borderRadius:"50%",
                      background:"linear-gradient(135deg,#38bdf8,#0284c7)", color:"#ffffff",
                      border:"2px solid #0f1624", display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:"0.76rem", cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,0.65)", padding:0
                    }}
                  >
                    ✏️
                  </button>
                )}

                {editBio && (form.avatarData !== "__REMOVE__" && (form.avatarData || bio?.avatarData)) && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemoveAvatarInstant(); }}
                    title="Remove Profile Photo"
                    aria-label="Remove Profile Photo"
                    style={{
                      position:"absolute", left:"-3px", top:"-3px", zIndex:5,
                      width:"21px", height:"21px", borderRadius:"50%",
                      background:"#7f1d1d", color:"#fecaca",
                      border:"1.5px solid #ef4444", display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:"0.65rem", fontWeight:"900", cursor:"pointer", padding:0
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div style={{ flex:1, minWidth:0, display:"grid", gap:"5px" }}>
                {/* Line 1: Athlete Name + Spirit Emoji */}
                <div style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
                  <h2 style={{ margin:0, fontSize:"1.34rem", color:"#ffffff", fontWeight:"900", lineHeight:1.15 }}>
                    {(bio?.nickname && foldStr(bio.nickname) !== foldStr(nm)) ? (
                      <>{firstName} <span style={{ color:"#fbbf24", fontStyle:"italic" }}>&ldquo;{bio.nickname}&rdquo;</span> {restName}</>
                    ) : nm}
                  </h2>
                  {photoSavedToast && (
                    <span style={{ background:"rgba(34,197,94,0.2)", color:"#4ade80", border:"1px solid #22c55e", borderRadius:"999px", padding:"2px 8px", fontSize:"0.68rem", fontWeight:"900" }}>
                      ✓ Photo Saved!
                    </span>
                  )}
                  {bio?.spiritEmoji && (
                    <span title="Current Spirit Vibe" style={{ fontSize:"1.12rem", background:"#182234", border:"1px solid #2d3b52", borderRadius:"8px", padding:"1px 6px", lineHeight:1.2 }}>
                      {bio.spiritEmoji}
                    </span>
                  )}
                </div>
                {bio?.photoCredit && bio.photoCredit.replace(/^@+/, "").trim() && (() => {
                  const rawPc = bio.photoCredit.trim();
                  const isUrl = /^https?:\/\//i.test(rawPc);
                  const cleanH = rawPc.replace(/^@+/, "").replace(/\s+/g, "");
                  const href = isUrl ? rawPc : ("https://instagram.com/" + encodeURIComponent(cleanH));
                  const label = isUrl ? rawPc.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0] : ("@" + rawPc.replace(/^@+/, ""));
                  return (
                    <div>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={"Action photo by " + label}
                        style={{
                          display:"inline-flex", alignItems:"center", gap:"4px",
                          background:"rgba(14,165,233,0.13)", color:"#7dd3fc",
                          border:"1px solid rgba(56,189,248,0.38)", borderRadius:"999px",
                          padding:"2px 8px", fontSize:"0.68rem", fontWeight:"800",
                          textDecoration:"none"
                        }}
                      >
                        📸 Photo: {label} ↗
                      </a>
                    </div>
                  );
                })()}

                {/* Line 2: Current Academy + Instagram Handle right beside photo */}
                <div style={{ display:"flex", alignItems:"center", gap:"7px", flexWrap:"wrap" }}>
                  <span style={{ color:"#ff9f43", fontSize:"0.84rem", fontWeight:"800", lineHeight:1.25 }}>
                    🏛️ {currentAcad}
                  </span>
                  <button
                    type="button"
                    onClick={handleInstagramClick}
                    title={bio?.handle ? "Follow @" + bio.handle + " on Instagram" : "Link Instagram"}
                    style={{
                      display:"inline-flex", alignItems:"center", gap:"4px",
                      background: bio?.handle ? "linear-gradient(135deg,#f43f5e,#e1306c,#c026d3)" : "#1e293b",
                      color: bio?.handle ? "#ffffff" : "#94a3b8",
                      border: bio?.handle ? "none" : "1px solid #475569",
                      boxShadow: bio?.handle ? "0 2px 8px rgba(225,48,108,0.4)" : "none",
                      borderRadius:"7px", padding:"3px 8px", cursor:"pointer", fontWeight:"800", fontSize:"0.72rem"
                    }}
                  >
                    {IG_ICON}
                    {bio?.handle ? "@" + bio.handle : "IG"}
                  </button>
                  
                </div>
              </div>
            </div>

            {/* Wrapped Full-Width Directly Underneath Photo: Row 1 = Belt + SuperFights, Row 2 = Single-Line Walkout Song Player */}
            {(liveBelt || bio?.openSf || bio?.songRepeat) && (
              <div style={{ marginTop: "10px", paddingTop: "9px", borderTop: "1px dashed rgba(51,65,85,0.6)", display: "flex", flexDirection: "column", gap: "8px" }}>
                {(liveBelt || bio?.openSf) && (
                  <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
                    {liveBelt && <BeltRankBadge belt={liveBelt} />}
                    {bio?.openSf && (
                      <span style={{ background: "#132a1c", color: "#4ade80", border: "1px solid #22c55e", padding: "3.5px 9px", borderRadius: "8px", fontSize: "0.71rem", fontWeight: "800" }}>
                        🥊 Open for SuperFights
                      </span>
                    )}
                  </div>
                )}

                {bio?.songRepeat && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: "8px", flexWrap: "nowrap",
                    width: "100%", boxSizing: "border-box",
                    background: "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(14,165,233,0.14))",
                    border: playingVibe ? "1px solid #38bdf8" : "1px solid rgba(56,189,248,0.4)",
                    boxShadow: playingVibe ? "0 0 14px rgba(56,189,248,0.3)" : "none",
                    borderRadius: "12px", padding: "6px 8px"
                  }}>
                    <style>{"@keyframes mdEqBar { 0%, 100% { height: 4px; } 50% { height: 13px; } }"}</style>
                    <audio
                      ref={audioElRef}
                      src={previewTrackUrl || undefined}
                      playsInline
                      preload="auto"
                      onEnded={() => setPlayingVibe(false)}
                      style={{ position: "fixed", left: "-9999px", width: "1px", height: "1px", opacity: 0.01, pointerEvents: "none" }}
                    />

                    {previewArt ? (
                      <img src={previewArt} alt="" style={{ width: "30px", height: "30px", borderRadius: "7px", objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <span style={{ width: "30px", height: "30px", borderRadius: "7px", background: "rgba(56,189,248,0.18)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", flexShrink: 0 }}>🎵</span>
                    )}

                    <button
                      type="button"
                      onClick={handleSongClick}
                      title="Open full track in music app"
                      style={{
                        flex: 1, minWidth: 0, background: "transparent", border: "none",
                        padding: 0, cursor: "pointer", textAlign: "left",
                        display: "flex", flexDirection: "column", justifyContent: "center", gap: "1px"
                      }}
                    >
                      {bio?.musicVibe && (
                        <span style={{ color: "#fde047", fontSize: "0.6rem", fontWeight: "800", letterSpacing: "0.4px", textTransform: "uppercase", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                          {bio.musicVibe}
                        </span>
                      )}
                      <span style={{ color: "#e0f2fe", fontSize: "0.75rem", fontWeight: "800", lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                        {bio.songRepeat} <span style={{ color: "#38bdf8", fontSize: "0.68rem" }}>↗</span>
                      </span>
                    </button>

                    <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={toggleSongPreview}
                        title="Play 30-second song preview"
                        style={{
                          background: playingVibe ? "#0284c7" : "#1e293b", color: "#f8fafc",
                          border: "1px solid #38bdf8", borderRadius: "8px", padding: "4px 9px",
                          fontSize: "0.7rem", fontWeight: "800", cursor: "pointer",
                          display: "inline-flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap"
                        }}
                      >
                        {loadingPreview ? "⏳" : playingVibe ? (
                          <span style={{ display: "inline-flex", alignItems: "flex-end", gap: "2px", height: "12px" }}>
                            <span style={{ width: "2.5px", background: "#fde047", animation: "mdEqBar 0.45s ease-in-out infinite" }} />
                            <span style={{ width: "2.5px", background: "#38bdf8", animation: "mdEqBar 0.65s ease-in-out infinite 0.15s" }} />
                            <span style={{ width: "2.5px", background: "#fde047", animation: "mdEqBar 0.55s ease-in-out infinite 0.3s" }} />
                          </span>
                        ) : "▶"}
                        <span>{playingVibe ? "Stop" : "Preview"}</span>
                      </button>

                      {!bio?.songUrl && (
                        <button
                          type="button"
                          onClick={() => setShowMusicPicker(p => !p)}
                          title="Choose music app (Spotify, Apple Music, YouTube Music)"
                          style={{ background: "#0f172a", color: "#94a3b8", border: "1px solid #334155", borderRadius: "8px", padding: "4px 7px", fontSize: "0.66rem", cursor: "pointer", whiteSpace: "nowrap" }}
                        >
                          {musicPref === "apple" ? "Apple" : musicPref === "ytmusic" ? "YT" : musicPref === "spotify" ? "Spotify" : "🎧"}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {showNativeAudioBar && previewTrackUrl && (
                  <audio
                    controls
                    playsInline
                    src={previewTrackUrl}
                    onPlay={() => setPlayingVibe(true)}
                    onPause={() => setPlayingVibe(false)}
                    onEnded={() => setPlayingVibe(false)}
                    style={{ width: "100%", height: "36px", borderRadius: "8px" }}
                  />
                )}
              </div>
            )}

            {showMusicPicker && bio?.songRepeat && (
              <div style={{ marginTop:"6px", background:"#0f172a", border:"1px solid #38bdf8", borderRadius:"8px", padding:"5px 8px", display:"inline-flex", gap:"6px", alignItems:"center", flexWrap:"wrap", fontSize:"0.71rem" }}>
                <span style={{ color:"#cbd5e1", fontWeight:"bold" }}>Open in:</span>
                <button type="button" onClick={() => chooseMusicService("spotify")} style={{ background:"#1DB954", color:"#000", border:"none", borderRadius:"5px", padding:"3px 8px", fontWeight:"800", cursor:"pointer", fontSize:"0.7rem" }}>Spotify</button>
                <button type="button" onClick={() => chooseMusicService("apple")} style={{ background:"#fa243c", color:"#fff", border:"none", borderRadius:"5px", padding:"3px 8px", fontWeight:"800", cursor:"pointer", fontSize:"0.7rem" }}>Apple Music</button>
                <button type="button" onClick={() => chooseMusicService("ytmusic")} style={{ background:"#ff0033", color:"#fff", border:"none", borderRadius:"5px", padding:"3px 8px", fontWeight:"800", cursor:"pointer", fontSize:"0.7rem" }}>YouTube Music</button>
              </div>
            )}

            {/* TALE-OF-THE-TAPE MEDAL SCOREBOARD + TOP 2026 / ALL-TIME SWITCHER */}
            <div style={{ marginTop:"12px", paddingTop:"10px", borderTop:"1px solid rgba(51,65,85,0.65)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap", marginBottom:"8px" }}>
                <span style={{ fontSize:"0.69rem", fontWeight:"800", color:"#94a3b8", letterSpacing:"0.8px", textTransform:"uppercase" }}>
                  {eraView === "2026" ? `🔥 2026 Season (${g26 + s26 + b26} Medals)` : `🏛️ All-Time Career (${totG + totS + totB} Medals)`}
                </span>
                <div style={{ display:"inline-flex", background:"#090d16", border:"1px solid #2d3b52", borderRadius:"8px", padding:"2px", gap:"2px" }}>
                  <button type="button" onClick={() => setEraView("2026")} style={{ padding:"3px 9px", borderRadius:"6px", border:"none", fontSize:"0.71rem", fontWeight:"800", cursor:"pointer", background: eraView === "2026" ? "#f59e0b" : "transparent", color: eraView === "2026" ? "#000" : "#94a3b8" }}>
                    2026 ({g26 + s26 + b26})
                  </button>
                  <button type="button" onClick={() => setEraView("ALLTIME")} style={{ padding:"3px 9px", borderRadius:"6px", border:"none", fontSize:"0.71rem", fontWeight:"800", cursor:"pointer", background: eraView === "ALLTIME" ? "#38bdf8" : "transparent", color: eraView === "ALLTIME" ? "#000" : "#94a3b8" }}>
                    All-Time ({totG + totS + totB})
                  </button>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:"7px" }}>
                <div style={{ background:"#0b101b", border:"1px solid rgba(250,204,21,0.35)", borderRadius:"9px", padding:"7px 6px", textAlign:"center" }}>
                  <div style={{ fontSize:"1.12rem", fontWeight:"900", color:"#fde047" }}>🥇 {dispG}</div>
                  <div style={{ fontSize:"0.64rem", fontWeight:"800", color:"#94a3b8", letterSpacing:"0.6px" }}>GOLD</div>
                </div>
                <div style={{ background:"#0b101b", border:"1px solid rgba(203,213,225,0.3)", borderRadius:"9px", padding:"7px 6px", textAlign:"center" }}>
                  <div style={{ fontSize:"1.12rem", fontWeight:"900", color:"#e2e8f0" }}>🥈 {dispS}</div>
                  <div style={{ fontSize:"0.64rem", fontWeight:"800", color:"#94a3b8", letterSpacing:"0.6px" }}>SILVER</div>
                </div>
                <div style={{ background:"#0b101b", border:"1px solid rgba(217,119,6,0.35)", borderRadius:"9px", padding:"7px 6px", textAlign:"center" }}>
                  <div style={{ fontSize:"1.12rem", fontWeight:"900", color:"#fdba74" }}>🥉 {dispB}</div>
                  <div style={{ fontSize:"0.64rem", fontWeight:"800", color:"#94a3b8", letterSpacing:"0.6px" }}>BRONZE</div>
                </div>
                <div style={{ background:"#0b101b", border:"1px solid rgba(52,211,153,0.35)", borderRadius:"9px", padding:"7px 6px", textAlign:"center" }}>
                  <div style={{ fontSize:"1.12rem", fontWeight:"900", color:"#34d399" }}>{dispPts}</div>
                  <div style={{ fontSize:"0.64rem", fontWeight:"800", color:"#94a3b8", letterSpacing:"0.6px" }}>MAT PTS</div>
                </div>
              </div>
            </div>
          </div>

          {/* Unclaimed Instagram Notice */}
          {igPrompt && !bio?.handle && !claimStep && !editBio && (
            <div style={{ marginTop:"10px", background:"#161f30", border:"1px solid #38bdf8", borderRadius:"9px", padding:"10px 12px", fontSize:"0.81rem", color:"#e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
              <span>📸 This athlete&apos;s Instagram hasn&apos;t been linked yet. <b>Are you {nm} (or parent/guardian)?</b></span>
              <button type="button" onClick={handleRequestOrOpenEdit} style={{ background:"#E1306C", color:"#fff", border:"none", borderRadius:"6px", padding:"5px 10px", fontWeight:"800", fontSize:"0.76rem", cursor:"pointer" }}>
                🔒 Claim &amp; Lock Instagram Link
              </button>
            </div>
          )}

          {savedBanner && (
            <div style={{ marginTop:"10px", background:"#132a1c", border:"1px solid #2ecc71", color:"#4ade80", padding:"8px 12px", borderRadius:"8px", fontSize:"0.82rem", fontWeight:"bold" }}>
              ✅ Verified Athlete Profile, Belt Rank, Photo &amp; Bio Locked!
            </div>
          )}

          {/* 2. SHARE & OWNER ACTION BAR */}
          <div style={{ display:"flex", gap:"8px", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", margin:"10px 0" }}>
            {onShareCard ? (
              <button
                type="button"
                onClick={() => (trackEvent("shareStatsClicks"), onShareCard({ badge: elite.isElite ? elite.tierLabel : "OFFICIAL TROPHY ROOM", title: nm, subtitle: currentAcad + (liveBelt ? " • " + normalizeBeltValue(liveBelt) : ""), gold: dispG, silver: dispS, bronze: dispB, deepLink: bioUrl, lines: [...(elite.pro?.titles || []), ...(elite.isElite ? elite.facts.map(x => "★ " + x) : []), ...visibleEvents.slice(0, 5).map(m => (Number(m.p)===1?"🥇":Number(m.p)===2?"🥈":"🥉") + " " + m.ev)] }))}
                style={{ background:"linear-gradient(90deg,#f59e0b,#fbbf24)", color:"#000", border:"none", borderRadius:"8px", padding:"7px 13px", fontWeight:"800", fontSize:"0.78rem", cursor:"pointer", whiteSpace:"normal" }}
              >
                📲 Share Trophy Card
              </button>
            ) : <span />}

            {!editBio && !claimStep && (
              isClaimed ? (
                isOwner ? (
                  <button type="button" onClick={handleRequestOrOpenEdit} style={{ background:"#172234", border:"1px solid #38bdf8", borderRadius:"8px", color:"#38bdf8", fontSize:"0.76rem", fontWeight:"800", cursor:"pointer", padding:"7px 11px" }}>✏️ Edit Profile &amp; Pic</button>
                ) : (
                  <span onClick={handleRequestOrOpenEdit} title="Verified claimed profile — tap only if you need to request ownership review" style={{ color:"#64748b", fontSize:"0.71rem", cursor:"pointer" }}>🔒 Claimed Profile</span>
                )
              ) : (
                <button type="button" onClick={handleRequestOrOpenEdit} style={{ background:"#132a1c", border:"1px solid #22c55e", borderRadius:"8px", color:"#4ade80", fontSize:"0.75rem", fontWeight:"800", cursor:"pointer", padding:"7px 11px" }}>
                  🪪 Claim Profile →
                </button>
              )
            )}
          </div>

          {/* 3. FIGHTER SCOUTING BIO & PROFILE EDITOR */}
          {(hasScoutingCards || claimStep || editBio || !isClaimed) && (
            <div style={{ background:"#121927", border:"1px solid #243044", borderRadius:"12px", padding:"12px 13px", marginBottom:"12px" }}>
              {claimStep && !editBio && (
                <div style={{ background:"#0f1624", border:"1px solid #38bdf8", borderRadius:"8px", padding:"11px 12px", display:"grid", gap:"9px" }}>
                  <div style={{ fontSize:"0.82rem", color:"#e2e8f0", fontWeight:"bold" }}>🔒 Claim &amp; Lock {nm}&apos;s Official MatDates Profile</div>
                  <label style={{ fontSize:"0.78rem", color:"#cbd5e1", display:"flex", alignItems:"flex-start", gap:"8px", cursor:"pointer", lineHeight:1.45 }}>
                    <input type="checkbox" checked={confirmIdentity} onChange={e => setConfirmIdentity(e.target.checked)} style={{ marginTop:"2px", accentColor:"#2ecc71" }} />
                    <span>I confirm that I am <b>{nm}</b> or the <b>parent / legal guardian</b> of this youth athlete, and want to lock this profile to <b>{curUser?.email}</b> <i style={{ color:"#94a3b8" }}>(parents &amp; youth athletes can link both accounts inside!)</i>.</span>
                  </label>
                  <div style={{ display:"flex", gap:"8px" }}>
                    <button type="button" disabled={!confirmIdentity} onClick={unlockClaimEditor} style={{ background: confirmIdentity ? "#2ecc71" : "#1e293b", color: confirmIdentity ? "#000" : "#64748b", border:"none", borderRadius:"6px", padding:"7px 13px", fontWeight:"800", fontSize:"0.78rem", cursor: confirmIdentity ? "pointer" : "not-allowed" }}>
                      🔓 Continue to Profile Editor
                    </button>
                    <button type="button" onClick={() => { setClaimStep(false); setConfirmIdentity(false); }} style={{ background:"transparent", color:"#94a3b8", border:"1px solid #334155", borderRadius:"6px", padding:"7px 11px", fontSize:"0.76rem", cursor:"pointer" }}>Cancel</button>
                  </div>
                </div>
              )}

              {!editBio && !claimStep && (
                hasScoutingCards ? (
                  <div style={{ display:"grid", gap:"8px" }}>
                    {bio.quote && (
                      <div style={{ background:"linear-gradient(90deg,rgba(245,158,11,0.12),rgba(15,22,36,0.4))", borderLeft:"3px solid #f59e0b", padding:"8px 11px", borderRadius:"0 8px 8px 0", fontSize:"0.84rem", color:"#fef3c7", fontStyle:"italic", fontWeight:"600" }}>
                        &ldquo;{bio.quote}&rdquo;
                      </div>
                    )}
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(185px, 1fr))", gap:"7px", fontSize:"0.8rem" }}>
                      {bio.coach && (() => {
                        const rawCoaches = String(bio.coach || "").split(/\s*(?:\/|&|\band\b)\s*/i).map(s => s.trim()).filter(Boolean);
                        const cleanCoachTarget = (c) => c.replace(/^(?:head\s+)?(?:professor|prof\.?|coach|master|mestre|sensei|kru)\s+/i, "").replace(/\s*\([^)]*\)\s*$/, "").trim();
                        return (
                          <div style={{ background:"#0b101b", border:"1px solid #1e293b", padding:"8px 10px", borderRadius:"8px" }}>
                            <div style={{ fontSize:"0.66rem", color:"#94a3b8", fontWeight:"800", textTransform:"uppercase", letterSpacing:"0.5px" }}>🏛️ Head Professor</div>
                            <div style={{ display:"flex", flexWrap:"wrap", gap:"6px", marginTop:"3px" }}>
                              {rawCoaches.map((cStr, ci) => {
                                const targetCoach = cleanCoachTarget(cStr);
                                const canOpen = targetCoach.length >= 2 && foldStr(targetCoach) !== foldStr(nm);
                                return canOpen ? (
                                  <button
                                    key={ci}
                                    type="button"
                                    onClick={() => {
                                      setEditBio(false);
                                      setClaimStep(false);
                                      setShowShareStudio(false);
                                      setAthHistory(h => [...h, activeAth]);
                                      setActiveAth({ name: targetCoach, academy: currentAcad, g: 0, s: 0, b: 0, events: [] });
                                    }}
                                    title={"Open " + targetCoach + "'s MatDates Trophy Room"}
                                    style={{
                                      background:"rgba(245,158,11,0.12)", color:"#fde047",
                                      border:"1px solid rgba(245,158,11,0.4)", borderRadius:"6px",
                                      padding:"2px 7px", fontWeight:"800", fontSize:"0.78rem",
                                      cursor:"pointer", display:"inline-flex", alignItems:"center", gap:"4px", textAlign:"left"
                                    }}
                                  >
                                    <span>{cStr}</span>
                                    <span style={{ fontSize:"0.68rem", color:"#fbbf24" }}>🏆 →</span>
                                  </button>
                                ) : (
                                  <span key={ci} style={{ color:"#f8fafc", fontWeight:"700" }}>{cStr}</span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                      {bio.favMove && (
                        <div style={{ background:"#0b101b", border:"1px solid #1e293b", padding:"8px 10px", borderRadius:"8px" }}>
                          <div style={{ fontSize:"0.66rem", color:"#38bdf8", fontWeight:"800", textTransform:"uppercase", letterSpacing:"0.5px" }}>⚡ Signature Move / Guard</div>
                          <div style={{ color:"#f8fafc", fontWeight:"700", marginTop:"2px" }}>{bio.favMove}</div>
                        </div>
                      )}
                      {bio.age && (
                        <div style={{ background:"#0b101b", border:"1px solid #1e293b", padding:"8px 10px", borderRadius:"8px" }}>
                          <div style={{ fontSize:"0.66rem", color:"#94a3b8", fontWeight:"800", textTransform:"uppercase", letterSpacing:"0.5px" }}>🎂 Age</div>
                          <div style={{ color:"#f8fafc", fontWeight:"700", marginTop:"2px" }}>{bio.age}</div>
                        </div>
                      )}
                      {bio.cheatMeal && (
                        <div style={{ background:"#0b101b", border:"1px solid #1e293b", padding:"8px 10px", borderRadius:"8px" }}>
                          <div style={{ fontSize:"0.66rem", color:"#fbbf24", fontWeight:"800", textTransform:"uppercase", letterSpacing:"0.5px" }}>🍔 Post-Comp Cheat Meal</div>
                          <div style={{ color:"#f8fafc", fontWeight:"700", marginTop:"2px" }}>{bio.cheatMeal}</div>
                        </div>
                      )}
                      {bio.currentRead && (() => {
                        const bk = parseBookField(bio.currentRead);
                        return (
                          <div style={{ background:"#0b101b", border:"1px solid #1e293b", padding:"8px 10px", borderRadius:"8px", gridColumn:"1 / -1", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                            <div>
                              <div style={{ fontSize:"0.66rem", color:"#93c5fd", fontWeight:"800", textTransform:"uppercase", letterSpacing:"0.5px" }}>📖 Current Read</div>
                              <div style={{ color:"#f8fafc", fontWeight:"700", marginTop:"2px" }}>{bk.title}</div>
                            </div>
                            <a href={bk.url} target="_blank" rel="noopener" style={{ background:"#ff9900", color:"#000", padding:"5px 10px", borderRadius:"6px", fontWeight:"800", fontSize:"0.73rem", textDecoration:"none", whiteSpace:"normal" }}>
                              View on Amazon ↗
                            </a>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div style={{ color:"#94a3b8", fontSize:"0.78rem" }}>
                    🪪 Athletes &amp; parents can claim this room to add their Belt &amp; Stripes, @Instagram, photo, walkout song &amp; scouting bio.
                  </div>
                )
              )}

              {editBio && (
                <form onSubmit={saveBio} style={{ display:"grid", gap:"9px", position:"relative" }}>
                  {/* Top Quick-Save Header */}
                  <div style={{ background:"#112233", border:"1px solid #38bdf8", borderRadius:"8px", padding:"8px 10px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                    <div style={{ fontSize:"0.75rem", color:"#e0f2fe", flex:"1 1 200px" }}>
                      ✨ <b>Tap the ✏️ pencil on your photo above</b> to swap pics anytime (auto-saves!). Everything below is optional.
                    </div>
                    <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
                      <button type="submit" disabled={saving} style={{ background:"#2ecc71", color:"#000", border:"none", borderRadius:"6px", padding:"6px 12px", fontWeight:"900", fontSize:"0.76rem", cursor:"pointer" }}>
                        {saving ? "Saving..." : "✓ Save Edits"}
                      </button>
                      <button type="button" onClick={() => guardExitAction(() => setEditBio(false))} style={{ background:"#1e293b", color:"#cbd5e1", border:"1px solid #334155", borderRadius:"6px", padding:"6px 10px", fontSize:"0.75rem", cursor:"pointer" }}>
                        Cancel
                      </button>
                    </div>
                  </div>

                  {/* Slim @photographer credit input shown ONLY when athlete has a profile photo */}
                  {(form.avatarData !== "__REMOVE__" && (form.avatarData || bio?.avatarData)) && (
                    <input
                      placeholder="📸 Action Photo Credit @photographer (Optional — adds clickable @tag under your name!)"
                      value={form.photoCredit || ""}
                      onFocus={() => { if (!form.photoCredit) setForm(p => ({ ...p, photoCredit: "@" })); }}
                      onChange={e => {
                        const v = e.target.value;
                        if (!v || v === "@") setForm(p => ({ ...p, photoCredit: "" }));
                        else if (/^https?:\/\//i.test(v)) setForm(p => ({ ...p, photoCredit: v.trim() }));
                        else setForm(p => ({ ...p, photoCredit: "@" + v.replace(/^@+/, "") }));
                      }}
                      style={{ ...inp, fontSize:"0.77rem", border:"1px solid rgba(56,189,248,0.4)" }}
                    />
                  )}

                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(210px, 1fr))", gap:"7px" }}>
                    <select
                      value={normalizeBeltValue(form.belt || "")}
                      onChange={e => setForm({ ...form, belt: e.target.value })}
                      style={{ ...inp, border:"1px solid #f59e0b", fontWeight:"700", cursor:"pointer" }}
                    >
                      <option value="">🥋 Select BJJ Belt &amp; Stripes (Optional)</option>
                      {BJJ_BELT_GROUPS.map(grp => (
                        <optgroup key={grp.group} label={grp.group}>
                          {grp.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </optgroup>
                      ))}
                    </select>
                    <input placeholder="Head Professor / Coach (Optional)" value={form.coach || ""} onChange={e => setForm({...form, coach: e.target.value})} style={inp} />
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))", gap:"7px" }}>
                    <input placeholder="Instagram @handle (Optional)" value={form.handle || ""} onFocus={() => { if (!form.handle) setForm(f => ({...f, handle: "@"})); }} onChange={e => { const v = e.target.value; setForm({...form, handle: v ? ("@" + v.replace(/^@+/, "")) : ""}); }} style={inp} />
                    <input placeholder="Fight Name / Nickname (Optional)" value={form.nickname || ""} onChange={e => setForm({...form, nickname: e.target.value})} style={inp} />
                    <input placeholder="Spirit Emoji — Max 3 (e.g. 🥷🔥👑)" value={form.spiritEmoji || ""} onChange={e => setForm({...form, spiritEmoji: limitSpiritEmojis(e.target.value)})} style={inp} />
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(155px, 1fr))", gap:"7px" }}>
                    <input placeholder="Age (Optional)" value={form.age || ""} onChange={e => setForm({...form, age: e.target.value})} style={inp} />
                    <input placeholder="Go-To Submission / Guard (Optional)" value={form.favMove || ""} onChange={e => setForm({...form, favMove: e.target.value})} style={inp} />
                  </div>

                  {/* 1-STEP LIVE WALKOUT SONG PICKER (Search & Preview — Zero Link Pasting Required!) */}
                  <div style={{ background:"#0b111e", border:"1px solid #2d3b52", borderRadius:"9px", padding:"9px 10px", display:"grid", gap:"7px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                      <span style={{ fontSize:"0.76rem", color:"#c4b5fd", fontWeight:"800" }}>
                        🎵 Walkout Song / Anthem <span style={{ color:"#94a3b8", fontWeight:"500" }}>(Search &amp; pick — instant 30s preview!)</span>
                      </span>
                      <select
                        value={form.musicVibe || ""}
                        onChange={e => setForm({ ...form, musicVibe: e.target.value })}
                        style={{ ...inp, padding:"4px 8px", fontSize:"0.75rem", width:"auto" }}
                      >
                        <option value="">🎧 Vibe Tag (Optional)</option>
                        <option value="🔥 Walkout">🔥 Walkout Anthem</option>
                        <option value="⚡ On Repeat">⚡ On Repeat</option>
                        <option value="🥋 Flow State">🥋 Flow State</option>
                        <option value="🧊 Locked In">🧊 Locked In</option>
                      </select>
                    </div>

                    {form.songRepeat && !changingSong ? (
                      <div style={{ background:"#131c2e", border:"1px solid rgba(167,139,250,0.45)", borderRadius:"8px", padding:"8px 10px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"9px", flexWrap:"wrap" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"9px", minWidth:0, flex:"1 1 180px" }}>
                          {form.songArtworkUrl ? (
                            <img src={form.songArtworkUrl} alt="" style={{ width:"38px", height:"38px", borderRadius:"6px", objectFit:"cover", flexShrink:0 }} />
                          ) : (
                            <div style={{ width:"38px", height:"38px", borderRadius:"6px", background:"#1e1b4b", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem", flexShrink:0 }}>🎵</div>
                          )}
                          <div style={{ minWidth:0 }}>
                            <div style={{ color:"#f8fafc", fontWeight:"800", fontSize:"0.83rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{form.songRepeat}</div>
                            <div style={{ color:"#4ade80", fontSize:"0.7rem", fontWeight:"700" }}>
                              {form.songPreviewUrl ? "✓ 30-sec Audio Preview Linked" : "✓ Saved (Preview auto-matches on save)"}
                            </div>
                          </div>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                          {form.songPreviewUrl && (
                            <button
                              type="button"
                              onClick={() => toggleEditorSample(form.songPreviewUrl)}
                              style={{ background: editorPlayingUrl === form.songPreviewUrl ? "#ef4444" : "#8b5cf6", color:"#fff", border:"none", borderRadius:"6px", padding:"5px 9px", fontSize:"0.74rem", fontWeight:"800", cursor:"pointer" }}
                            >
                              {editorPlayingUrl === form.songPreviewUrl ? "⏹ Stop" : "▶ Test"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => { stopEditorSample(); setSongQuery(form.songRepeat); setChangingSong(true); }}
                            style={{ background:"#1e293b", color:"#93c5fd", border:"1px solid #334155", borderRadius:"6px", padding:"5px 9px", fontSize:"0.74rem", fontWeight:"700", cursor:"pointer" }}
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={() => { stopEditorSample(); setForm(p => ({ ...p, songRepeat: "", songPreviewUrl: "", songArtworkUrl: "", songUrl: "" })); setSongQuery(""); }}
                            title="Clear Song"
                            style={{ background:"#2a1215", color:"#fca5a5", border:"1px solid #7f1d1d", borderRadius:"6px", padding:"5px 8px", fontSize:"0.74rem", fontWeight:"800", cursor:"pointer" }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display:"grid", gap:"6px" }}>
                        <div style={{ display:"flex", gap:"6px" }}>
                          <input
                            placeholder="🔍 Type any song or artist (e.g. FE!N, Eye of the Tiger, Drake)..."
                            value={songQuery}
                            onChange={e => setSongQuery(e.target.value)}
                            style={{ ...inp, flex:1, border:"1px solid #8b5cf6" }}
                          />
                          {changingSong && form.songRepeat && (
                            <button type="button" onClick={() => { setChangingSong(false); setSongQuery(""); }} style={{ background:"#1e293b", color:"#cbd5e1", border:"1px solid #334155", borderRadius:"6px", padding:"0 10px", fontSize:"0.74rem", cursor:"pointer" }}>
                              Keep Current
                            </button>
                          )}
                        </div>

                        {songSearching && (
                          <div style={{ fontSize:"0.74rem", color:"#94a3b8", padding:"2px 4px" }}>Searching tracks &amp; 30s audio previews...</div>
                        )}

                        {songResults.length > 0 && (
                          <div style={{ background:"#090d16", border:"1px solid #334155", borderRadius:"8px", maxHeight:"215px", overflowY:"auto", display:"grid", gap:"4px", padding:"5px" }}>
                            {songResults.map((tr, idx) => {
                              const sampleUrl = tr.previewUrl || tr.permanentPreviewUrl;
                              const isPlayingThis = Boolean(sampleUrl && editorPlayingUrl === sampleUrl);
                              return (
                                <div key={idx} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"8px", padding:"6px 8px", borderRadius:"6px", background:"#131b2b" }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:"8px", minWidth:0, flex:1 }}>
                                    {tr.artworkUrl60 ? (
                                      <img src={tr.artworkUrl60} alt="" style={{ width:"34px", height:"34px", borderRadius:"5px", objectFit:"cover", flexShrink:0 }} />
                                    ) : <span style={{ fontSize:"1rem" }}>🎵</span>}
                                    <div style={{ minWidth:0 }}>
                                      <div style={{ color:"#fff", fontSize:"0.8rem", fontWeight:"800", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tr.trackName}</div>
                                      <div style={{ color:"#94a3b8", fontSize:"0.72rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tr.artistName}</div>
                                    </div>
                                  </div>
                                  <div style={{ display:"flex", alignItems:"center", gap:"5px", flexShrink:0 }}>
                                    {sampleUrl && (
                                      <button
                                        type="button"
                                        onClick={() => toggleEditorSample(sampleUrl)}
                                        title="Sample 30-sec preview"
                                        style={{ background: isPlayingThis ? "#ef4444" : "#1e293b", color:"#fff", border:"1px solid #475569", borderRadius:"6px", padding:"4px 8px", fontSize:"0.72rem", fontWeight:"800", cursor:"pointer" }}
                                      >
                                        {isPlayingThis ? "⏹" : "▶"}
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        stopEditorSample();
                                        setForm(p => ({
                                          ...p,
                                          songRepeat: tr.trackName + " - " + tr.artistName,
                                          songPreviewUrl: tr.permanentPreviewUrl || tr.previewUrl || "",
                                          songArtworkUrl: tr.artworkUrl60 || "",
                                          songUrl: tr.trackUrl || p.songUrl || ""
                                        }));
                                        setSongQuery("");
                                        setSongResults([]);
                                        setChangingSong(false);
                                      }}
                                      style={{ background:"#2ecc71", color:"#000", border:"none", borderRadius:"6px", padding:"5px 10px", fontSize:"0.74rem", fontWeight:"900", cursor:"pointer" }}
                                    >
                                      Select
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div>
                          <button
                            type="button"
                            onClick={() => setShowCustomSongUrl(v => !v)}
                            style={{ background:"none", border:"none", color:"#64748b", fontSize:"0.71rem", padding:0, cursor:"pointer", textDecoration:"underline" }}
                          >
                            {showCustomSongUrl ? "Hide custom song link" : "Have a custom Spotify / YouTube link? (Optional)"}
                          </button>
                          {showCustomSongUrl && (
                            <input type="url" placeholder="Optional custom Spotify / Apple Music / YouTube URL" value={form.songUrl || ""} onChange={e => setForm({...form, songUrl: e.target.value})} style={{ ...inp, width:"100%", marginTop:"5px" }} />
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(195px, 1fr))", gap:"7px" }}>
                    <input placeholder="💬 Favorite Quote, Motto or Verse (Optional)" value={form.quote || ""} onChange={e => setForm({...form, quote: e.target.value})} style={inp} />
                    <input placeholder="📖 Current Read — Book Title or Link (Optional)" value={form.currentRead || ""} onChange={e => setForm({...form, currentRead: e.target.value})} style={inp} />
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(195px, 1fr))", gap:"7px" }}>
                    <input placeholder="🍔 Favorite Post-Comp Cheat Meal (Optional)" value={form.cheatMeal || ""} onChange={e => setForm({...form, cheatMeal: e.target.value})} style={inp} />
                    <input type="url" placeholder="Jits (Youth) or Smoothcomp (Adult) URL (Optional)" value={form.jitsUrl || ""} onChange={e => setForm({...form, jitsUrl: e.target.value})} style={inp} />
                  </div>

                  <input placeholder="Custom Spotlight Highlight (Optional — pins to Insider Spotlight!)" value={form.funFact || ""} onChange={e => setForm({...form, funFact: e.target.value})} style={{ ...inp, width:"100%" }} />

                  {/* ZERO-CLUTTER BRACKET OPPONENT PUSH ALERTS (Athlete + Linked Parent Accounts) */}
                  <div style={{ background:"#0c1824", border:"1px solid rgba(56,189,248,0.4)", borderRadius:"8px", padding:"8px 10px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                    <label style={{ fontSize:"0.79rem", color:"#e2e8f0", display:"flex", alignItems:"flex-start", gap:"7px", cursor:"pointer", flex:"1 1 230px" }}>
                      <input type="checkbox" checked={form.bracketPushAlerts !== false} onChange={e => setForm({...form, bracketPushAlerts: e.target.checked})} style={{ marginTop:"2px" }} />
                      <span>
                        🔔 <b>Division Opponent Push Alerts</b> — buzz me &amp; linked parent/family accounts whenever a new competitor joins my upcoming bracket
                      </span>
                    </label>
                    {form.bracketPushAlerts !== false && (
                      <button
                        type="button"
                        onClick={connectDevicePush}
                        style={{
                          background: pushDeviceStatus === "ready" ? "#132a1c" : "#0284c7",
                          color: pushDeviceStatus === "ready" ? "#4ade80" : "#fff",
                          border: pushDeviceStatus === "ready" ? "1px solid #22c55e" : "none",
                          borderRadius:"6px", padding:"5px 10px", fontSize:"0.73rem", fontWeight:"800", cursor:"pointer", flexShrink:0
                        }}
                      >
                        {pushDeviceStatus === "ready" ? "📲 Device Push Active ✓" : pushDeviceStatus === "requesting" ? "Allow Prompt..." : "📲 Enable Push Here"}
                      </button>
                    )}
                  </div>

                  <label style={{ fontSize:"0.8rem", color:"#cbd5e1", display:"flex", alignItems:"center", gap:"6px", cursor:"pointer" }}>
                    <input type="checkbox" checked={Boolean(form.showWatchCount)} onChange={e => setForm({...form, showWatchCount: e.target.checked})} />
                    <span>🔥 Show total <b>&quot;Watching&quot; count ({watcherCount})</b> publicly on Watch button <i style={{ color:"#94a3b8" }}>(never shows who is watching)</i></span>
                  </label>
                  <label style={{ fontSize:"0.8rem", color:"#cbd5e1", display:"flex", alignItems:"center", gap:"6px", cursor:"pointer" }}>
                    <input type="checkbox" checked={Boolean(form.openSf)} onChange={e => setForm({...form, openSf: e.target.checked})} />
                    <span>🥊 List in the <b>Protected SuperFight Matchmaking Pool</b> <i style={{ color:"#94a3b8" }}>(shows under your Belt Rank; email stays 100% hidden)</i></span>
                  </label>

                  <div style={{ background:"#0b101b", border:"1px solid #2d3b52", borderRadius:"7px", padding:"8px 10px", display:"grid", gap:"6px" }}>
                    <div style={{ fontSize:"0.75rem", color:"#93c5fd", fontWeight:"bold" }}>👨‍👩‍👧‍👦 Co-Manage with Athlete / Parent Account (Optional)</div>
                    <div style={{ fontSize:"0.72rem", color:"#94a3b8" }}>Add your youth athlete&apos;s own email (or parent&apos;s email) so both MatDates accounts can edit this Trophy Room &amp; receive bracket alerts!</div>
                    {((form.coEmails || []).length > 0) && (
                      <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                        {(form.coEmails || []).map((em, i) => (
                          <span key={i} style={{ background:"#182234", border:"1px solid #38bdf8", borderRadius:"12px", padding:"2px 8px", fontSize:"0.72rem", color:"#e2e8f0", display:"inline-flex", alignItems:"center", gap:"5px" }}>
                            ✓ {em}
                            <b onClick={() => setForm(p => ({ ...p, coEmails: (p.coEmails || []).filter(x => x !== em) }))} style={{ color:"#fca5a5", cursor:"pointer" }}>×</b>
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ display:"flex", gap:"6px" }}>
                      <input type="email" placeholder="Add athlete or parent email..." value={coInput} onChange={e => setCoInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); const v = coInput.trim().toLowerCase(); if (v.includes("@")) { setForm(p => ({ ...p, coEmails: Array.from(new Set([...(p.coEmails || []), v])) })); setCoInput(""); } } }} style={{ ...inp, flex:1 }} />
                      <button type="button" onClick={() => { const v = coInput.trim().toLowerCase(); if (v.includes("@")) { setForm(p => ({ ...p, coEmails: Array.from(new Set([...(p.coEmails || []), v])) })); setCoInput(""); } }} style={{ background:"#38bdf8", color:"#000", border:"none", borderRadius:"6px", padding:"6px 11px", fontWeight:"800", fontSize:"0.75rem", cursor:"pointer" }}>+ Link Account</button>
                    </div>
                  </div>

                  {/* UNMISSABLE STICKY FLOATING SAVE BAR */}
                  <div style={{
                    position:"sticky", bottom:"-12px", zIndex:35,
                    background:"rgba(13, 19, 33, 0.96)", backdropFilter:"blur(8px)",
                    border: hasUnsavedChanges ? "1.5px solid #2ecc71" : "1px solid #334155",
                    boxShadow: hasUnsavedChanges ? "0 -4px 20px rgba(46,204,113,0.28)" : "0 -4px 14px rgba(0,0,0,0.5)",
                    borderRadius:"10px", padding:"9px 11px",
                    display:"flex", alignItems:"center", justifyContent:"space-between", gap:"8px", flexWrap:"wrap"
                  }}>
                    <div style={{ fontSize:"0.76rem", fontWeight:"800", color: hasUnsavedChanges ? "#4ade80" : "#94a3b8" }}>
                      {hasUnsavedChanges ? "● Unsaved profile changes — tap Save!" : "✓ All fields ready"}
                    </div>
                    <div style={{ display:"flex", gap:"7px", flex: hasUnsavedChanges ? "1 1 200px" : "0 1 auto", justifyContent:"flex-end" }}>
                      <button
                        type="submit"
                        disabled={saving}
                        style={{
                          flex:1, maxWidth:"260px",
                          background: hasUnsavedChanges ? "linear-gradient(90deg,#22c55e,#4ade80)" : "#2ecc71",
                          color:"#000", border:"none", borderRadius:"7px", padding:"9px 16px",
                          fontWeight:"900", fontSize:"0.85rem", cursor:"pointer"
                        }}
                      >
                        {saving ? "Saving Profile..." : "💾 Save Profile Changes"}
                      </button>
                      <button
                        type="button"
                        onClick={() => guardExitAction(() => setEditBio(false))}
                        style={{ background:"#1e293b", color:"#cbd5e1", border:"1px solid #334155", borderRadius:"7px", padding:"9px 12px", fontSize:"0.8rem", cursor:"pointer" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* 4. INSIDER SPOTLIGHT FACTS */}
          {(elite.isElite || bio?.funFact) && (
            <div style={{ marginBottom:"12px", background:"linear-gradient(135deg,#271c09,#131b2c)", border:"1px solid rgba(245,158,11,0.55)", borderRadius:"11px", padding:"11px 13px" }}>
              <div style={{ color:"#fbbf24", fontWeight:"800", fontSize:"0.74rem", letterSpacing:"0.6px", marginBottom:"5px" }}>{elite.tierLabel}</div>
              {elite.facts.map((f, i) => <div key={i} style={{ fontSize:"0.8rem", color:"#fef3c7", marginBottom:"3px", lineHeight:1.38 }}>★ {f}</div>)}
            </div>
          )}

          {/* 5. PRO TITLES & SUPERFIGHT VICTORIES */}
          {elite.pro && (
            <div style={{ marginBottom:"12px" }}>
              <div style={{ color:"#fbbf24", fontWeight:"800", fontSize:"0.76rem", letterSpacing:"0.6px", marginBottom:"6px" }}>👑 PRO TITLES &amp; SUPERFIGHT VICTORIES</div>
              <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"6px" }}>{elite.pro.titles.map((t, i) => <span key={i} style={{ background:"#292011", color:"#fde68a", border:"1px solid #d97706", borderRadius:"6px", padding:"3px 8px", fontSize:"0.73rem", fontWeight:"bold" }}>{t}</span>)}</div>
              {elite.pro.bouts.map((b, i) => <div key={i} style={{ background:"#131a26", border:"1px solid #1e293b", padding:"7px 10px", borderRadius:"7px", fontSize:"0.77rem", marginBottom:"4px" }}>🥊 <b>{b.ev}</b> — <b style={{ color:"#4ade80" }}>{b.res}</b> ({b.sub})</div>)}
            </div>
          )}

          {/* 5B. CURRENT FEDERATION RANKINGS & STANDINGS (Daily Official #Ranks — Jits Strictly Youth-Only!) */}
          {(() => {
            // STRICT GUARD: Jits NEVER shows on an Adult Trophy Room!
            const showYouthJits = Boolean(isYouthCompetitor && (bio?.jitsRating || bio?.jitsOverallRank || bio?.jitsRecord));

            // Filter official __f2_XX__ federation ranks so Youth vs Adult categories match the athlete cleanly
            const validFedRanks = fedRanks.filter(r => isYouthCompetitor ? r.ag !== "ADULT" || !/adult|master/i.test(r.cat || "") : r.ag !== "YOUTH");

            // Also summarize verified medals by federation for circuits where athlete competed
            const sourcePool = eraView === "ALLTIME" ? allCombinedEvs : s26Evs;
            const fedMedalMap = new Map();
            const classifyFed = (m) => {
              const blob = ((m.f || "") + " " + (m.ev || "")).toLowerCase();
              if (blob.includes("ibjjf")) return "IBJJF";
              if (blob.includes("jjwl") || blob.includes("world league")) return "JJWL";
              if (blob.includes("adcc")) return "ADCC";
              if (blob.includes("ufc")) return "UFC BJJ";
              if (blob.includes("agf")) return "AGF";
              if (blob.includes("ajp") || blob.includes("abu dhabi")) return "AJP";
              if (blob.includes("naga")) return "NAGA";
              if (blob.includes("grappling industries")) return "Grappling Ind.";
              return "Smoothcomp";
            };
            sourcePool.forEach(m => {
              const fk = classifyFed(m);
              if (!fedMedalMap.has(fk)) fedMedalMap.set(fk, { fed: fk, g: 0, s: 0, b: 0 });
              const rec = fedMedalMap.get(fk);
              const p = Number(m.p || 3);
              if (p === 1) rec.g++; else if (p === 2) rec.s++; else rec.b++;
            });

            // Attach official #Rank(s) onto each federation card!
            const combinedCards = [];
            const usedFeds = new Set();
            validFedRanks.forEach(rk => {
              const med = fedMedalMap.get(rk.fed);
              usedFeds.add(rk.fed);
              combinedCards.push({
                key: rk.fed + "_" + rk.cat,
                fed: rk.fed,
                rank: rk.rank,
                cat: rk.cat,
                pts: rk.pts,
                medals: med ? `🥇${med.g} 🥈${med.s} 🥉${med.b}` : "",
                updated: rk.u || "Daily Sync"
              });
            });
            Array.from(fedMedalMap.values()).forEach(m => {
              if (usedFeds.has(m.fed)) return;
              combinedCards.push({
                key: m.fed,
                fed: m.fed,
                rank: "",
                cat: eraView === "ALLTIME" ? "Verified Career Record" : "2026 Verified Record",
                pts: "",
                medals: `🥇${m.g} 🥈${m.s} 🥉${m.b}`,
                updated: "Live"
              });
            });

            if (!showYouthJits && combinedCards.length === 0) return null;

            return (
              <div style={{ marginBottom:"13px", background:"#111827", border:"1px solid #283548", borderRadius:"11px", padding:"11px 12px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"6px", flexWrap:"wrap", marginBottom:"8px" }}>
                  <span style={{ color:"#fbbf24", fontWeight:"900", fontSize:"0.75rem", letterSpacing:"0.5px" }}>
                    📊 CURRENT FEDERATION RANKINGS &amp; STANDINGS
                  </span>
                  <span style={{ color:"#4ade80", fontSize:"0.66rem", fontWeight:"800" }}>
                    ● Daily Sync{validFedRanks[0]?.u ? ` (${validFedRanks[0].u})` : ""}
                  </span>
                </div>

                {/* YOUTH ONLY: Official Jits P4P, Gi & No-Gi National/Global Standing */}
                {showYouthJits && (
                  <div style={{ background:"linear-gradient(90deg,#162238,#0f172a)", border:"1px solid rgba(56,189,248,0.45)", borderRadius:"9px", padding:"8px 10px", marginBottom: combinedCards.length ? "8px" : 0, display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"7px", flexWrap:"wrap" }}>
                      <span style={{ background:"#0284c7", color:"#fff", borderRadius:"5px", padding:"2px 7px", fontSize:"0.67rem", fontWeight:"900" }}>JITS YOUTH STANDING</span>
                      {bio.jitsOverallRank && <span style={{ color:"#fde047", fontWeight:"900", fontSize:"0.86rem" }}>P4P {bio.jitsOverallRank}</span>}
                      {bio.jitsRating && <span style={{ color:"#f8fafc", fontWeight:"800", fontSize:"0.79rem" }}>• {bio.jitsRating} Rating {bio.jitsTier ? `(${bio.jitsTier})` : ""}</span>}
                      {bio.jitsPercentile && <span style={{ color:"#38bdf8", fontSize:"0.72rem", fontWeight:"700" }}>• {bio.jitsPercentile}</span>}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap", fontSize:"0.74rem", color:"#cbd5e1", fontWeight:"700" }}>
                      {bio.jitsGiRank && <span>🥋 Gi <b style={{ color:"#fff" }}>{bio.jitsGiRank}</b></span>}
                      {bio.jitsNoGiRank && <span>⚡ No-Gi <b style={{ color:"#fff" }}>{bio.jitsNoGiRank}</b></span>}
                      {bio.jitsRecord && <span style={{ color:"#4ade80" }}>• <b>{bio.jitsRecord}</b> {bio.jitsWinRate ? `(${bio.jitsWinRate})` : ""}</span>}
                    </div>
                  </div>
                )}

                {/* Per-Federation Official #Rank & Verified Circuit Standings */}
                {combinedCards.length > 0 && (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(190px, 1fr))", gap:"6px" }}>
                    {combinedCards.slice(0, 8).map(c => (
                      <div key={c.key} style={{ background:"#0b101b", border: c.rank ? "1px solid rgba(250,204,21,0.45)" : "1px solid #1e293b", borderRadius:"8px", padding:"7px 9px", display:"flex", flexDirection:"column", gap:"3px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"4px" }}>
                          <span style={{ color:"#93c5fd", fontWeight:"900", fontSize:"0.73rem" }}>{c.fed}</span>
                          {c.rank ? (
                            <span style={{ background:"rgba(250,204,21,0.16)", color:"#fde047", border:"1px solid rgba(250,204,21,0.45)", borderRadius:"5px", padding:"1px 6px", fontWeight:"900", fontSize:"0.72rem" }}>
                              Rank {c.rank}
                            </span>
                          ) : null}
                        </div>
                        <div style={{ fontSize:"0.68rem", color:"#94a3b8", whiteSpace:"normal", overflow:"visible", textOverflow:"clip" }} title={c.cat}>
                          {c.cat}
                        </div>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"4px", fontSize:"0.73rem", fontWeight:"800", color:"#f8fafc", whiteSpace:"normal" }}>
                          <span>{c.medals || "Ranked"}</span>
                          {c.pts && <span style={{ color:"#34d399", fontSize:"0.7rem" }}>{c.pts}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {coachedSquadStats && (
            <div style={{ marginBottom:"12px", background:"linear-gradient(135deg, rgba(245,158,11,0.14), rgba(15,23,42,0.95))", border:"1px solid rgba(245,158,11,0.55)", borderRadius:"11px", padding:"11px 13px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"6px", marginBottom:"6px" }}>
                <span style={{ color:"#fde047", fontWeight:"900", fontSize:"0.76rem", letterSpacing:"0.5px", textTransform:"uppercase" }}>
                  🏛️ Head Professor Coaching Pedigree — {coachedSquadStats.academy}
                </span>
                <a href={"/?gym=" + encodeURIComponent(foldStr(coachedSquadStats.academy).replace(/[^a-z0-9]/g, ""))} style={{ color:"#38bdf8", fontSize:"0.72rem", fontWeight:"800", textDecoration:"none" }}>
                  Open Academy Trophy Room →
                </a>
              </div>
              <div style={{ display:"flex", gap:"14px", flexWrap:"wrap", alignItems:"center", fontSize:"0.82rem", color:"#f8fafc", fontWeight:"800" }}>
                <span>2026 Squad Hardware Coached:</span>
                <span style={{ color:"#fde047" }}>🥇 {coachedSquadStats.g} Gold</span>
                <span style={{ color:"#e2e8f0" }}>🥈 {coachedSquadStats.s} Silver</span>
                <span style={{ color:"#fdba74" }}>🥉 {coachedSquadStats.b} Bronze</span>
              </div>
            </div>
          )}

          {/* 6. VERIFIED TOURNAMENT PODIUMS & SUPERFIGHTS + SECOND SYNCED 2026 / ALL-TIME MINI TOGGLE */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap", marginBottom:"8px", paddingTop:"4px" }}>
            <div style={{ color:"#93c5fd", fontWeight:"800", fontSize:"0.76rem", letterSpacing:"0.5px" }}>
              🏅 {eraView === "ALLTIME" ? `ALL-TIME PODIUMS & BOUTS (${visibleEvents.length})` : `2026 PODIUMS & BOUTS (${visibleEvents.length})`}
            </div>
            <div style={{ display:"inline-flex", background:"#101726", border:"1px solid #2d3b52", borderRadius:"7px", padding:"2px", gap:"2px" }}>
              <button type="button" onClick={() => setEraView("2026")} style={{ padding:"3px 8px", borderRadius:"5px", border:"none", fontSize:"0.69rem", fontWeight:"800", cursor:"pointer", background: eraView === "2026" ? "#f59e0b" : "transparent", color: eraView === "2026" ? "#000" : "#94a3b8" }}>
                2026 Season ({g26}🥇)
              </button>
              <button type="button" onClick={() => setEraView("ALLTIME")} style={{ padding:"3px 8px", borderRadius:"5px", border:"none", fontSize:"0.69rem", fontWeight:"800", cursor:"pointer", background: eraView === "ALLTIME" ? "#38bdf8" : "transparent", color: eraView === "ALLTIME" ? "#000" : "#94a3b8" }}>
                All-Time Career ({totG}🥇)
              </button>
            </div>
          </div>

          <div style={{ display:"grid", gap:"5px" }}>
            {visibleEvents.length === 0 ? (
              <div style={{ background:"#121927", border:"1px dashed #283548", borderRadius:"8px", padding:"12px", color:"#94a3b8", fontSize:"0.79rem" }}>
                {eraView === "2026" && cleanHistEvs.length > 0
                  ? `No 2026 podiums posted yet — tap "All-Time (${allCombinedEvs.length})" right above to view prior-season championship medals!`
                  : "Tournament podiums & SuperFight results sync automatically as official brackets conclude."}
              </div>
            ) : visibleEvents.slice(0, 200).map((m, i) => (
              <div key={i} style={{ background:"#131a26", border:"1px solid #1e293b", padding:"7px 10px", borderRadius:"8px", fontSize:"0.77rem", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px" }}>
                <span style={{ lineHeight:1.35 }}>
                  {Number(m.p)===1 ? "🥇" : Number(m.p)===2 ? "🥈" : "🥉"} <b style={{ color:"#f8fafc" }}>{m.ev}</b>
                  {m.d ? <span style={{ color:"#94a3b8" }}> — {m.d}</span> : null}
                </span>
                <span style={{ background:"#1a2436", border:"1px solid #2d3b52", color:"#38bdf8", borderRadius:"5px", padding:"2px 6px", fontSize:"0.67rem", fontWeight:"800", flexShrink:0 }}>
                  {/ufc/i.test((m.ev||"")+" "+(m.f||"")) ? "UFC" : (m.f || "BJJ")}
                </span>
              </div>
            ))}
          </div>
        </div>
        {showShareStudio && (
          <React.Suspense fallback={null}>
            <TrophyShareStudioModal
          isOpen={showShareStudio}
          onClose={() => setShowShareStudio(false)}
          name={nm}
          nickname={bio?.nickname || ""}
          spiritEmoji={bio?.spiritEmoji || ""}
          academy={currentAcad}
          belt={liveBelt}
          coach={bio?.coach || ""}
          avatarData={bio?.avatarData || ""}
          handle={bio?.handle || ""}
          songRepeat={bio?.songRepeat || ""}
          g26={g26}
          s26={s26}
          b26={b26}
          totG={totG}
          totS={totS}
          totB={totB}
          initialEra={eraView}
          isYouth={isYouthCompetitor}
          jitsRating={bio?.jitsRating || ""}
          jitsRank={bio?.jitsOverallRank || ""}
        />
          </React.Suspense>
        )}
      </div>
    </div>
  );
}
