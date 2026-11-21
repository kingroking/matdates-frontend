import { trackEvent } from "./analytics";
import React, { useState, useEffect } from "react";
import { collection, doc, getDoc, getDocs, setDoc, query, where } from "firebase/firestore";
import { db, auth } from "./firebase";
import { addDoc } from "firebase/firestore";
import { foldStr, athBucket, athBucketsForQuery, smartAthleteMatch, matchesYouthInitial, computeEliteSpotlight, PRO_SUPERFIGHTS, BJJ_BELT_GROUPS, normalizeBeltValue, getBeltVisualSpec, universalGymKey, inferTargetGender, strictVerifiedAthleteRowMatch } from "./proHubData";

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
      <span style={{ position:"relative", width:"44px", height:"13px", borderRadius:"3px", background: spec.main, border:"1px solid rgba(255,255,255,0.42)", display:"inline-flex", alignItems:"center", justifyContent:"flex-end", overflow:"hidden", flexShrink:0, boxShadow:"inset 0 1px 2px rgba(255,255,255,0.25), inset 0 -1px 2px rgba(0,0,0,0.35)" }}>
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

export function AthleteTrophyRoomModal({ athlete, onClose, onWatch, isWatching, onShareCard }) {
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevBodyOverflow; };
  }, []);
  const [activeAth, setActiveAth] = useState(athlete);
  useEffect(() => { setActiveAth(athlete); }, [athlete]);

  const nm = activeAth?.name || activeAth?.n || "";
  const slug = foldStr(nm).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const docKey = "bio_" + slug;
  const lsKey = "md_bio_" + slug;
  const initials = nm.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("") || "🥋";

  const [evs, setEvs] = useState(activeAth?.events || []);
  const [histEvs, setHistEvs] = useState([]);
  const [promBouts, setPromBouts] = useState([]);
  const [fedRanks, setFedRanks] = useState([]);
  const WATCH_GLOW_MIN = 3;
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

  const emptyForm = {
    handle: "", nickname: "", spiritEmoji: "", songRepeat: "", songUrl: "",
    quote: "", currentRead: "", age: "", belt: "", coach: "", favMove: "",
    cheatMeal: "", funFact: "", avatarData: "", openSf: false,
    showWatchCount: false, coEmails: [], jitsUrl: ""
  };
  const [form, setForm] = useState(emptyForm);

  const curUser = auth.currentUser;

  const refreshFamilyBios = () => {
    if (!curUser?.uid) { setMyFamilyBios([]); return; }
    const myEm = (curUser.email || "").toLowerCase();
    getDocs(query(collection(db, "mat_watches"), where("kind", "==", "athlete_bio"))).then(sn => {
      const mine = sn.docs.map(d => d.data()).filter(x => x.name && (x.ownerUid === curUser.uid || (myEm && (x.coEmails || []).includes(myEm))));
      setMyFamilyBios(mine);
    }).catch(() => {});
  };

  useEffect(() => { refreshFamilyBios(); }, [curUser?.uid]);

  useEffect(() => {
    if (!slug) return;
    trackEvent("trophyViews");
    const passedEvs = activeAth?.events || [];
    setEvs(passedEvs);
    setCnt({ g: activeAth?.g || 0, s: activeAth?.s || 0, b: activeAth?.b || 0, acad: activeAth?.academy || activeAth?.a || "" });
    setEditBio(false);
    setClaimStep(false);
    setConfirmIdentity(false);
    setIgPrompt(false);
    setShowMusicPicker(false);
    setWatcherCount(0);

    let cached = null;
    try { const raw = localStorage.getItem(lsKey); cached = raw ? JSON.parse(raw) : null; } catch {}
    setBio(cached);
    setForm(cached ? { ...emptyForm, ...cached, handle: cached.handle ? "@" + cached.handle.replace(/^@+/, "") : "" } : emptyForm);

    const pubKey = "pubbio_" + slug;
    getDoc(doc(db, "event_competitors", pubKey)).then(pd => {
      if (pd.exists() && pd.data()?.event_id === "__public_bios__") {
        const pbd = pd.data();
        setBio(prev => ({ ...(prev || {}), ...pbd, avatarData: pbd.avatarData || prev?.avatarData || "" }));
        setForm(prev => ({ ...emptyForm, ...prev, ...pbd, avatarData: pbd.avatarData || prev?.avatarData || "", belt: normalizeBeltValue(pbd.belt || prev.belt), handle: pbd.handle ? "@" + pbd.handle.replace(/^@+/, "") : "" }));
      }
    }).catch(() => {});

    getDoc(doc(db, "mat_watches", docKey)).then(d => {
      if (d.exists() && d.data()?.kind === "athlete_bio") {
        const bd = d.data();
        // Auto-rescue: if this browser has a locally saved avatar photo that didn't reach Firestore earlier, push it up automatically!
        if (!bd.avatarData && cached?.avatarData && curUser && (bd.ownerUid === curUser.uid || (bd.coEmails || []).includes((curUser.email || "").toLowerCase()))) {
          bd.avatarData = cached.avatarData;
          setDoc(doc(db, "mat_watches", docKey), { avatarData: cached.avatarData }, { merge: true }).catch(() => {});
          setDoc(doc(db, "event_competitors", pubKey), { event_id: "__public_bios__", slug, avatarData: cached.avatarData }, { merge: true }).catch(() => {});
        }
        setBio(prev => {
          const merged = { ...(prev || {}), ...bd, avatarData: bd.avatarData || prev?.avatarData || cached?.avatarData || "" };
          try { localStorage.setItem(lsKey, JSON.stringify(merged)); } catch {}
          return merged;
        });
        setForm(prev => ({ ...emptyForm, ...prev, ...bd, avatarData: bd.avatarData || prev?.avatarData || cached?.avatarData || "", belt: normalizeBeltValue(bd.belt || prev.belt), handle: bd.handle ? "@" + bd.handle.replace(/^@+/, "") : "" }));
        try { localStorage.setItem(lsKey, JSON.stringify(bd)); } catch {}
      }
    }).catch(() => {});

    setHistEvs([]);
    setPromBouts([]);
    setEraView("2026");
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
    Promise.all(bkts.map(b => getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__f2_" + b + "__"))))).then(snaps => {
      const fHits = [], seenF = new Set();
      snaps.forEach(s => s.forEach(d => ((d.data() || {}).items || []).forEach(it => {
        if (!strictVerifiedAthleteRowMatch(it.n, it.a || knownAcad, it.cat || "", nm, knownAcad, seedGender)) return;
        const fk = it.fed + "|" + it.cat;
        if (seenF.has(fk)) return;
        seenF.add(fk);
        fHits.push(it);
      })));
      fHits.sort((a, b) => parseInt(String(a.rank || "9999").replace(/\D/g, ""), 10) - parseInt(String(b.rank || "9999").replace(/\D/g, ""), 10));
      setFedRanks(fHits);
    }).catch(() => {});

    // Fetch Prior-Year All-Time Career Podiums (__alltime_a2_XX__) with strict gender + academy guard!
    Promise.all(bkts.map(b => getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__alltime_a2_" + b + "__"))))).then(snaps => {
      const seenH = new Set(), outH = [];
      snaps.forEach(s => s.forEach(d => ((d.data() || {}).items || []).forEach(it => {
        if (!strictVerifiedAthleteRowMatch(it.n, it.a, it.d, nm, knownAcad, seedGender)) return;
        const dk = foldStr(it.ev) + "|" + foldStr(it.d) + "|" + it.p;
        if (seenH.has(dk)) return;
        seenH.add(dk);
        outH.push(it);
      })));
      setHistEvs(outH);
    }).catch(() => {});

    // Fetch 2026 Season Podiums (__a2_XX__) with strict gender + academy guard!
    Promise.all(bkts.map(b => getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__a2_" + b + "__"))))).then(snaps => {
      const rawItems = [];
      snaps.forEach(s => s.forEach(d => ((d.data() || {}).items || []).forEach(it => rawItems.push(it))));
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

  const handleRequestOrOpenEdit = () => {
    if (!curUser) {
      alert("Please Sign In first (top right of MatDates) so your Athlete Bio, Photo & Instagram lock permanently to your account!");
      return;
    }
    if (isClaimed && !isOwner) {
      addDoc(collection(db, "mat_watches"), {
        kind: "bio_dispute", name: "Bio Verification Request: " + nm, requesterEmail: curUser.email || "", athleteSlug: slug, adminNotified: false, createdAt: new Date().toISOString()
      }).catch(() => {});
      alert("This profile is claimed & locked. An ownership verification request has been sent to MatDates Admin!");
      return;
    }
    if (isOwner) {
      setForm({ ...emptyForm, ...bio, handle: bio?.handle ? "@" + bio.handle.replace(/^@+/, "") : "" });
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
    if (bio) setForm({ ...emptyForm, ...bio, handle: bio.handle ? "@" + bio.handle.replace(/^@+/, "") : "" });
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

  const saveBio = async (e) => {
    e.preventDefault();
    if (!curUser) { alert("Please Sign In first to lock your Athlete Bio!"); return; }
    if (bio?.ownerUid && !isOwner) { alert("This bio is locked to its verified owner."); return; }
    setSaving(true);
    const clean = {
      kind: "athlete_bio",
      status: "bio_only",
      ownerUid: bio?.ownerUid || curUser.uid,
      ownerEmail: bio?.ownerEmail || curUser.email || "",
      handle: (form.handle || "").replace(/^@+/, "").trim(),
      nickname: (form.nickname || "").replace(/^["']+|["']+$/g, "").trim(),
      spiritEmoji: limitSpiritEmojis(form.spiritEmoji || ""),
      songRepeat: (form.songRepeat || "").trim(),
      songUrl: (form.songUrl || "").trim(),
      quote: (form.quote || "").replace(/^["“”]+|["“”]+$/g, "").trim(),
      currentRead: (form.currentRead || "").trim(),
      jitsUrl: (form.jitsUrl || "").trim(),
      age: (form.age || "").trim(),
      belt: (form.belt || "").trim(),
      coach: (form.coach || "").trim(),
      favMove: (form.favMove || "").trim(),
      cheatMeal: (form.cheatMeal || "").trim(),
      funFact: (form.funFact || "").trim(),
      avatarData: form.avatarData === "__REMOVE__" ? "" : (form.avatarData || bio?.avatarData || ""),
      openSf: Boolean(form.openSf),
      showWatchCount: Boolean(form.showWatchCount),
      coEmails: Array.from(new Set((form.coEmails || bio?.coEmails || []).map(x => String(x).trim().toLowerCase()).filter(x => x.includes("@")))),
      name: nm,
      academy: cnt.acad || elite.pro?.academy || "",
      updatedAt: new Date().toISOString()
    };
    if (foldStr(clean.nickname) === foldStr(nm)) clean.nickname = "";
    const { ownerEmail, coEmails, ...publicSafeBio } = clean;
    try { localStorage.setItem(lsKey, JSON.stringify(clean)); } catch {}
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
    refreshFamilyBios();
    setSaving(false);
    setEditBio(false);
    setClaimStep(false);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  const hasBioDetails = Boolean(bio && (bio.quote || bio.age || bio.belt || bio.coach || bio.favMove || bio.cheatMeal || bio.currentRead));
  const inp = { padding:"8px 10px", borderRadius:"6px", background:"#0f141e", color:"#fff", border:"1px solid #334155", fontSize:"0.83rem", boxSizing:"border-box" };

  // Format display name with optional Fight Nickname in gold quotes
  const nameParts = nm.trim().split(/\s+/);
  const firstName = nameParts[0] || nm;
  const restName = nameParts.slice(1).join(" ");

  const currentAcad = bio?.academy || cnt.acad || elite.pro?.academy || histEvs[0]?.a || "Independent";
  const liveBelt = (editBio || claimStep)
    ? (form.belt || bio?.belt || elite.pro?.belt || "")
    : (bio?.belt || elite.pro?.belt || "");

  // Deduplicate histEvs against 2026 evs so 2026 events are never counted twice in All-Time
  const s26Evs = [...promBouts, ...evs];
  const s26Keys = new Set(s26Evs.map(e => foldStr(e.ev) + "|" + foldStr(e.d) + "|" + e.p));
  const cleanHistEvs = histEvs.filter(h => !s26Keys.has(foldStr(h.ev) + "|" + foldStr(h.d) + "|" + h.p));

  const g26 = s26Evs.reduce((acc, x) => acc + (x.mg !== undefined ? Number(x.mg) : (Number(x.p) === 1 ? 1 : 0)), 0) || cnt.g;
  const s26 = s26Evs.reduce((acc, x) => acc + (x.ms !== undefined ? Number(x.ms) : (Number(x.p) === 2 ? 1 : 0)), 0) || cnt.s;
  const b26 = s26Evs.reduce((acc, x) => acc + (x.mb !== undefined ? Number(x.mb) : (Number(x.p) >= 3 ? 1 : 0)), 0) || cnt.b;
  const hG = cleanHistEvs.reduce((acc, x) => acc + (Number(x.p) === 1 ? 1 : 0), 0);
  const hS = cleanHistEvs.reduce((acc, x) => acc + (Number(x.p) === 2 ? 1 : 0), 0);
  const hB = cleanHistEvs.reduce((acc, x) => acc + (Number(x.p) >= 3 ? 1 : 0), 0);

  // Combine 2026 + Pre-2026 Archive + Jits/Career floor (so All-Time always reflects true multi-year career medals!)
  const totG = Math.max(g26 + hG, Number(bio?.careerG || 0));
  const totS = Math.max(s26 + hS, Number(bio?.careerS || 0));
  const totB = Math.max(b26 + hB, Number(bio?.careerB || 0));

  const dispG = eraView === "ALLTIME" ? totG : g26;
  const dispS = eraView === "ALLTIME" ? totS : s26;
  const dispB = eraView === "ALLTIME" ? totB : b26;
  const dispPts = dispG * 9 + dispS * 3 + dispB;
  const allCombinedEvs = [...s26Evs, ...cleanHistEvs];
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
      <style>{NEON_GOLD_KEYFRAMES}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:"#0b101b", border:"1.5px solid rgba(245,158,11,0.7)", borderRadius:"16px",
          maxWidth:"670px", width:"100%", maxHeight:"88dvh",
          display:"flex", flexDirection:"column", overflow:"hidden",
          textAlign:"left", color:"#fff", boxShadow:"0 22px 55px rgba(0,0,0,0.9)"
        }}
      >
        {/* PINNED TOP BAR: Official Trophy Room + Verified (Left) • Watch + Jits/Smoothcomp + Close (Right) */}
        <div style={{
          display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap",
          padding:"10px 14px", background:"#101726", borderBottom:"1px solid #243044", flexShrink:0
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
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
                borderRadius:"7px", padding:"5px 9px", fontWeight:"800", fontSize:"0.73rem", cursor:"pointer", whiteSpace:"nowrap"
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
                textDecoration:"none", display:"inline-flex", alignItems:"center", gap:"4px", whiteSpace:"nowrap"
              }}
            >
              {externalRecordLabel}
            </a>

            <button
              type="button"
              onClick={onClose}
              title="Close"
              style={{
                background:"#1e293b", color:"#e2e8f0", border:"1px solid #334155",
                borderRadius:"7px", width:"29px", height:"29px", display:"flex",
                alignItems:"center", justifyContent:"center", cursor:"pointer", fontWeight:"bold", flexShrink:0
              }}
            >
              ✕
            </button>
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
                    onClick={() => setActiveAth({ name: fb.name, academy: fb.academy || "", g: 0, s: 0, b: 0, events: [] })}
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
              <div
                onClick={() => { if (isOwner) handleRequestOrOpenEdit(); }}
                title={hasNeonGoldRing ? "⚡ 100+ Watchers Club — Neon Gold Status!" : (isOwner ? "Tap to update profile photo" : nm)}
                style={{
                  width:"76px", height:"76px", borderRadius:"50%", flexShrink:0,
                  border: hasNeonGoldRing ? "3px solid #fde047" : "2.5px solid #f59e0b",
                  animation: hasNeonGoldRing ? "mdNeonGoldPulse 2.2s ease-in-out infinite" : "none",
                  background:"linear-gradient(135deg,#1e293b,#090d16)",
                  display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden",
                  cursor: isOwner ? "pointer" : "default", boxShadow:"0 6px 18px rgba(0,0,0,0.5)"
                }}
              >
                {((editBio ? (form.avatarData !== "__REMOVE__" && (form.avatarData || bio?.avatarData)) : bio?.avatarData)) ? (
                  <img src={editBio ? (form.avatarData && form.avatarData !== "__REMOVE__" ? form.avatarData : bio?.avatarData) : bio?.avatarData} alt={nm} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                ) : (
                  <span style={{ color:"#fbbf24", fontWeight:"900", fontSize:"1.32rem" }}>{initials}</span>
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
                  {bio?.spiritEmoji && (
                    <span title="Current Spirit Vibe" style={{ fontSize:"1.12rem", background:"#182234", border:"1px solid #2d3b52", borderRadius:"8px", padding:"1px 6px", lineHeight:1.2 }}>
                      {bio.spiritEmoji}
                    </span>
                  )}
                </div>

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

            {/* Wrapped Full-Width Directly Underneath Photo: Belt & Stripes Bar + Open for SuperFights + Walkout Song! */}
            {(liveBelt || bio?.openSf || bio?.songRepeat) && (
              <div style={{ marginTop:"10px", paddingTop:"9px", borderTop:"1px dashed rgba(51,65,85,0.6)", display:"flex", alignItems:"center", gap:"7px", flexWrap:"wrap" }}>
                {liveBelt && <BeltRankBadge belt={liveBelt} />}
                {bio?.openSf && (
                  <span style={{ background:"#132a1c", color:"#4ade80", border:"1px solid #22c55e", padding:"3.5px 9px", borderRadius:"8px", fontSize:"0.71rem", fontWeight:"800" }}>
                    🥊 Open for SuperFights
                  </span>
                )}
                {bio?.songRepeat && (
                  <button
                    type="button"
                    onClick={handleSongClick}
                    title="Listen to walkout / repeat track"
                    style={{
                      background:"rgba(14,165,233,0.12)", color:"#e0f2fe",
                      border:"1px solid rgba(56,189,248,0.5)", borderRadius:"14px", padding:"3.5px 10px",
                      fontSize:"0.72rem", fontWeight:"700", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:"4px"
                    }}
                  >
                    <span style={{ color:"#38bdf8" }}>🎵</span> <b>{bio.songRepeat}</b> <span style={{ color:"#38bdf8" }}>▶</span>
                  </button>
                )}
                {bio?.songRepeat && !bio?.songUrl && (
                  <button
                    type="button"
                    onClick={() => setShowMusicPicker(p => !p)}
                    style={{ background:"#182030", color:"#94a3b8", border:"1px solid #334155", borderRadius:"10px", padding:"2.5px 7px", fontSize:"0.66rem", cursor:"pointer" }}
                  >
                    {musicPref === "apple" ? "Apple ⚙️" : musicPref === "ytmusic" ? "YT ⚙️" : musicPref === "spotify" ? "Spotify ⚙️" : "App 🎧"}
                  </button>
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
                style={{ background:"linear-gradient(90deg,#f59e0b,#fbbf24)", color:"#000", border:"none", borderRadius:"8px", padding:"7px 13px", fontWeight:"800", fontSize:"0.78rem", cursor:"pointer", whiteSpace:"nowrap" }}
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
                      {bio.coach && (
                        <div style={{ background:"#0b101b", border:"1px solid #1e293b", padding:"8px 10px", borderRadius:"8px" }}>
                          <div style={{ fontSize:"0.66rem", color:"#94a3b8", fontWeight:"800", textTransform:"uppercase", letterSpacing:"0.5px" }}>🏛️ Head Professor</div>
                          <div style={{ color:"#f8fafc", fontWeight:"700", marginTop:"2px" }}>{bio.coach}</div>
                        </div>
                      )}
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
                            <a href={bk.url} target="_blank" rel="noopener" style={{ background:"#ff9900", color:"#000", padding:"5px 10px", borderRadius:"6px", fontWeight:"800", fontSize:"0.73rem", textDecoration:"none", whiteSpace:"nowrap" }}>
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
                <form onSubmit={saveBio} style={{ display:"grid", gap:"8px" }}>
                  <div style={{ background:"#112233", border:"1px solid #38bdf8", borderRadius:"7px", padding:"7px 10px", fontSize:"0.76rem", color:"#e0f2fe" }}>
                    ✨ <b>Every question below is 100% optional!</b> Pick your Belt &amp; Stripes below and watch your belt bar update live next to your photo.
                  </div>

                  <div style={{ background:"#0b101b", border:"1px solid #334155", borderRadius:"8px", padding:"8px 10px", display:"flex", alignItems:"center", gap:"10px", flexWrap:"wrap" }}>
                    {(form.avatarData || bio?.avatarData) && (
                      <img src={form.avatarData !== undefined ? form.avatarData : bio?.avatarData} alt="Preview" style={{ width:"46px", height:"46px", borderRadius:"50%", objectFit:"cover", border:"1.5px solid #fbbf24" }} />
                    )}
                    <div style={{ flex:1, minWidth:"180px" }}>
                      <div style={{ fontSize:"0.75rem", color:"#fbbf24", fontWeight:"bold", marginBottom:"3px" }}>📸 Athlete Profile Photo (Glows Neon Gold at {WATCH_GLOW_MIN}+ Watchers • Now {watcherCount})</div>
                      <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const d = await resizeAvatarFile(f); if (d) setForm(p => ({ ...p, avatarData: d })); } }} style={{ fontSize:"0.75rem", color:"#cbd5e1", width:"100%" }} />
                    </div>
                    {(form.avatarData || bio?.avatarData) && (
                      <button type="button" onClick={() => setForm(p => ({ ...p, avatarData: "__REMOVE__" }))} style={{ background:"#2a1215", color:"#fca5a5", border:"1px solid #ef4444", borderRadius:"5px", padding:"4px 8px", fontSize:"0.72rem", cursor:"pointer" }}>Remove Pic</button>
                    )}
                  </div>

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
                    <input placeholder="Spirit Emoji — Max 3 (Optional, e.g. 🥷🔥👑)" value={form.spiritEmoji || ""} onChange={e => setForm({...form, spiritEmoji: limitSpiritEmojis(e.target.value)})} style={inp} />
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(155px, 1fr))", gap:"7px" }}>
                    <input placeholder="Age (Optional)" value={form.age || ""} onChange={e => setForm({...form, age: e.target.value})} style={inp} />
                    <input placeholder="Go-To Submission / Guard (Optional)" value={form.favMove || ""} onChange={e => setForm({...form, favMove: e.target.value})} style={inp} />
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(195px, 1fr))", gap:"7px" }}>
                    <input placeholder="🎵 Walkout / Song on Repeat (Optional)" value={form.songRepeat || ""} onChange={e => setForm({...form, songRepeat: e.target.value})} style={inp} />
                    <input type="url" placeholder="Direct Song Link (Optional — blank = Spotify/Apple/YT)" value={form.songUrl || ""} onChange={e => setForm({...form, songUrl: e.target.value})} style={inp} />
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
                    <div style={{ fontSize:"0.72rem", color:"#94a3b8" }}>Add your youth athlete&apos;s own email (or parent&apos;s email) so both separate MatDates accounts can edit this Trophy Room!</div>
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
                      <input type="email" placeholder="Add athlete or parent email..." value={coInput} onChange={e => setCoInput(e.target.value)} style={{ ...inp, flex:1 }} />
                      <button type="button" onClick={() => { const v = coInput.trim().toLowerCase(); if (v.includes("@")) { setForm(p => ({ ...p, coEmails: Array.from(new Set([...(p.coEmails || []), v])) })); setCoInput(""); } }} style={{ background:"#38bdf8", color:"#000", border:"none", borderRadius:"6px", padding:"6px 11px", fontWeight:"800", fontSize:"0.75rem", cursor:"pointer" }}>+ Link Account</button>
                    </div>
                  </div>

                  <div style={{ display:"flex", gap:"8px" }}>
                    <button type="submit" disabled={saving} style={{ flex:1, background:"#2ecc71", color:"#000", border:"none", borderRadius:"7px", padding:"9px", fontWeight:"800", cursor:"pointer" }}>
                      {saving ? "Locking Profile..." : "🔒 Save & Lock Verified Profile"}
                    </button>
                    <button type="button" onClick={() => setEditBio(false)} style={{ background:"#1e293b", color:"#cbd5e1", border:"1px solid #334155", borderRadius:"7px", padding:"9px 12px", cursor:"pointer" }}>Cancel</button>
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
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(152px, 1fr))", gap:"6px" }}>
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
                        <div style={{ fontSize:"0.68rem", color:"#94a3b8", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }} title={c.cat}>
                          {c.cat}
                        </div>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"4px", fontSize:"0.73rem", fontWeight:"800", color:"#f8fafc", whiteSpace:"nowrap" }}>
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

          {/* 6. VERIFIED TOURNAMENT PODIUMS & SUPERFIGHTS + SECOND SYNCED 2026 / ALL-TIME MINI TOGGLE */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap", marginBottom:"8px", paddingTop:"4px" }}>
            <div style={{ color:"#93c5fd", fontWeight:"800", fontSize:"0.76rem", letterSpacing:"0.5px" }}>
              🏅 {eraView === "ALLTIME" ? `ALL-TIME PODIUMS & BOUTS (${visibleEvents.length})` : `2026 PODIUMS & BOUTS (${visibleEvents.length})`}
            </div>
            <div style={{ display:"inline-flex", background:"#101726", border:"1px solid #2d3b52", borderRadius:"7px", padding:"2px", gap:"2px" }}>
              <button type="button" onClick={() => setEraView("2026")} style={{ padding:"3px 8px", borderRadius:"5px", border:"none", fontSize:"0.69rem", fontWeight:"800", cursor:"pointer", background: eraView === "2026" ? "#f59e0b" : "transparent", color: eraView === "2026" ? "#000" : "#94a3b8" }}>
                2026 ({s26Evs.length})
              </button>
              <button type="button" onClick={() => setEraView("ALLTIME")} style={{ padding:"3px 8px", borderRadius:"5px", border:"none", fontSize:"0.69rem", fontWeight:"800", cursor:"pointer", background: eraView === "ALLTIME" ? "#38bdf8" : "transparent", color: eraView === "ALLTIME" ? "#000" : "#94a3b8" }}>
                All-Time ({allCombinedEvs.length})
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
            ) : visibleEvents.slice(0, 75).map((m, i) => (
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
      </div>
    </div>
  );
}
