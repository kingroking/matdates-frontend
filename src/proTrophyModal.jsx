import { trackEvent } from "./analytics";
import React, { useState, useEffect } from "react";
import { collection, doc, getDoc, getDocs, setDoc, query, where } from "firebase/firestore";
import { db, auth } from "./firebase";
import { addDoc } from "firebase/firestore";
import { foldStr, athBucket, athBucketsForQuery, smartAthleteMatch, computeEliteSpotlight, PRO_SUPERFIGHTS } from "./proHubData";

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


function resizeAvatarFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const size = 280;
        const c = document.createElement("canvas");
        c.width = size; c.height = size;
        const ctx = c.getContext("2d");
        const minSide = Math.min(img.width, img.height);
        const sx = Math.floor((img.width - minSide) / 2);
        const sy = Math.floor((img.height - minSide) / 2);
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(c.toDataURL("image/jpeg", 0.78));
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const IG_ICON = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" style={{ display:"block" }}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const WATCH_GLOW_MIN = 100;
const NEON_GOLD_KEYFRAMES = "@keyframes mdNeonGoldPulse { 0%, 100% { box-shadow: 0 0 10px #fde047, 0 0 24px rgba(250, 204, 21, 0.9), inset 0 0 6px #fef08a; border-color: #fef08a; } 50% { box-shadow: 0 0 18px #facc15, 0 0 36px rgba(234, 179, 8, 1), inset 0 0 10px #fde047; border-color: #ffffff; } }";

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

export function AthleteTrophyRoomModal({ athlete, onClose, onWatch, isWatching, onShareCard }) {
  const [activeAth, setActiveAth] = useState(athlete);
  useEffect(() => { setActiveAth(athlete); }, [athlete]);

  const nm = activeAth?.name || activeAth?.n || "";
  const slug = foldStr(nm).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const docKey = "bio_" + slug;
  const lsKey = "md_bio_" + slug;
  const initials = nm.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("") || "🥋";

  const [evs, setEvs] = useState(activeAth?.events || []);
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

    getDoc(doc(db, "mat_watches", docKey)).then(d => {
      if (d.exists() && d.data()?.kind === "athlete_bio") {
        const bd = d.data();
        setBio(bd);
        setForm({ ...emptyForm, ...bd, handle: bd.handle ? "@" + bd.handle.replace(/^@+/, "") : "" });
        try { localStorage.setItem(lsKey, JSON.stringify(bd)); } catch {}
      }
    }).catch(() => {});

    const targetFold = foldStr(nm);
    getDocs(collection(db, "mat_watches")).then(sn => {
      const uniqueWatchers = new Set();
      sn.forEach(d => {
        const wd = d.data() || {};
        if (wd.kind) return;
        if (!wd.active && !wd.followFuture) return;
        if (foldStr(wd.athleteName || "") === targetFold) {
          const watcherKey = (wd.uid || (wd.email || "").toLowerCase() || wd.fcmToken || d.id);
          uniqueWatchers.add(watcherKey);
        }
      });
      setWatcherCount(uniqueWatchers.size);
    }).catch(() => {});

    if (passedEvs.length > 0) return;
    const bkts = athBucketsForQuery(nm);
    if (!bkts.length && athBucket(nm) !== "__") bkts.push(athBucket(nm));
    Promise.all(bkts.map(b => getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__a2_" + b + "__"))))).then(snaps => {
      const allDocs = []; snaps.forEach(s => s.forEach(d => allDocs.push(d)));
      const sn = allDocs;
      const tgt = foldStr(nm);
      const qWords = tgt.split(/\s+/).filter(Boolean);
      const seen = new Set(), out = [];
      let g = 0, s = 0, b = 0, acad = activeAth?.academy || activeAth?.a || "";
      sn.forEach(d => ((d.data() || {}).items || []).forEach(it => {
        const cFold = foldStr(it.n);
        let isMatch = cFold.includes(tgt) || tgt.includes(cFold);
        if (!isMatch && qWords.length >= 2) {
          const cWords = cFold.split(/\s+/).filter(Boolean);
          if (cWords.length >= 2 && cWords[0] === qWords[0] && cWords[cWords.length - 1] === qWords[qWords.length - 1]) {
            isMatch = true;
          }
        }
        if (!isMatch) return;
        const dk = foldStr(it.ev) + "|" + foldStr(it.d) + "|" + it.p;
        if (seen.has(dk)) return;
        seen.add(dk); out.push(it);
        if (!acad || (it.a || "").length > acad.length) acad = it.a || acad;
        const p = Number(it.p || 3);
        if (p === 1) g++; else if (p === 2) s++; else b++;
      }));
      if (out.length) { setEvs(out); setCnt({ g, s, b, acad }); }
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
      avatarData: form.avatarData !== undefined ? form.avatarData : (bio?.avatarData || ""),
      openSf: Boolean(form.openSf),
      showWatchCount: Boolean(form.showWatchCount),
      coEmails: Array.from(new Set((form.coEmails || bio?.coEmails || []).map(x => String(x).trim().toLowerCase()).filter(x => x.includes("@")))),
      name: nm,
      academy: cnt.acad || elite.pro?.academy || "",
      updatedAt: new Date().toISOString()
    };
    try { localStorage.setItem(lsKey, JSON.stringify(clean)); } catch {}
    try { await setDoc(doc(db, "mat_watches", docKey), clean, { merge: true }); } catch {}
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

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:10070, display:"flex", alignItems:"center", justifyContent:"center", padding:"12px" }}>
      <style>{NEON_GOLD_KEYFRAMES}</style>
      <div onClick={e => e.stopPropagation()} style={{ background:"#0f141e", border:"1.5px solid #f59e0b", borderRadius:"14px", maxWidth:"660px", width:"100%", maxHeight:"90svh", overflowY:"auto", padding:"18px", textAlign:"left", color:"#fff" }}>

        {/* MULTI-ATHLETE FAMILY QUICK-SWITCHER */}
        {myFamilyBios.length > 1 && (
          <div style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap", marginBottom:"12px", paddingBottom:"9px", borderBottom:"1px solid #1e293b" }}>
            <span style={{ fontSize:"0.71rem", color:"#94a3b8", fontWeight:"800" }}>👨‍👩‍👧‍👦 MY ATHLETES:</span>
            {myFamilyBios.map((fb, idx) => {
              const active = foldStr(fb.name) === foldStr(nm);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveAth({ name: fb.name, academy: fb.academy || "", g: 0, s: 0, b: 0, events: [] })}
                  style={{
                    background: active ? "#f59e0b" : "#182030",
                    color: active ? "#000" : "#cbd5e1",
                    border: active ? "none" : "1px solid #334155",
                    borderRadius:"14px", padding:"3px 10px", fontSize:"0.73rem", fontWeight:"800", cursor:"pointer"
                  }}
                >
                  {fb.name}
                </button>
              );
            })}
          </div>
        )}

        {/* 1. PROFILE HEADER + AVATAR + NICKNAME + SPIRIT EMOJI + PINK IG + SONG ON REPEAT */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"10px" }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:"13px", flex:1, minWidth:0 }}>
            <div
              onClick={() => { if (isOwner) handleRequestOrOpenEdit(); }}
              title={hasNeonGoldRing ? "⚡ 100+ Watchers Club — Neon Gold Status!" : (isOwner ? "Click to change profile photo" : nm)}
              style={{
                width:"68px", height:"68px", borderRadius:"50%", flexShrink:0, marginTop:"2px",
                border: hasNeonGoldRing ? "3px solid #fde047" : "2px solid #475569",
                animation: hasNeonGoldRing ? "mdNeonGoldPulse 2.2s ease-in-out infinite" : "none",
                background:"linear-gradient(135deg,#1e293b,#0f172a)",
                display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden",
                cursor: isOwner ? "pointer" : "default", position:"relative"
              }}
            >
              {bio?.avatarData ? (
                <img src={bio.avatarData} alt={nm} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
              ) : (
                <span style={{ color: hasNeonGoldRing ? "#fde047" : "#fbbf24", fontWeight:"900", fontSize:"1.25rem" }}>{initials}</span>
              )}
            </div>

            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ color:"#fbbf24", fontSize:"0.72rem", fontWeight:"800", letterSpacing:"1.4px" }}>🏆 MATDATES OFFICIAL TROPHY ROOM</div>
              <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap", margin:"3px 0" }}>
                <h2 style={{ margin:0, fontSize:"1.42rem", color:"#ffffff", fontWeight:"900", lineHeight:1.2 }}>
                  {bio?.nickname ? (
                    <>{firstName} <span style={{ color:"#fbbf24", fontStyle:"italic" }}>&ldquo;{bio.nickname}&rdquo;</span> {restName}</>
                  ) : nm}
                </h2>
                {bio?.spiritEmoji && (
                  <span title="Current Spirit Vibe" style={{ fontSize:"1.22rem", background:"#182030", border:"1px solid #2d3b52", borderRadius:"8px", padding:"1px 6px", lineHeight:1.3 }}>
                    {bio.spiritEmoji}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleInstagramClick}
                  title={bio?.handle ? "Follow @" + bio.handle + " on Instagram" : "Instagram profile not linked yet"}
                  style={{
                    display:"inline-flex", alignItems:"center", gap:"5px",
                    background: bio?.handle ? "#E1306C" : "#1e293b",
                    color: bio?.handle ? "#ffffff" : "#94a3b8",
                    border: bio?.handle ? "1px solid #f472b6" : "1px solid #475569",
                    boxShadow: bio?.handle ? "0 2px 10px rgba(225,48,108,0.45)" : "none",
                    borderRadius:"7px", padding:"4px 9px", cursor:"pointer", fontWeight:"800", fontSize:"0.74rem"
                  }}
                >
                  {IG_ICON}
                  {bio?.handle ? "@" + bio.handle : "IG"}
                </button>
                {bio?.openSf && <span style={{ background:"#132a1c", color:"#4ade80", border:"1px solid #22c55e", padding:"3px 7px", borderRadius:"5px", fontSize:"0.71rem", fontWeight:"bold" }}>🥊 Open for SuperFights</span>}
              </div>

              <div style={{ color:"#ff9f43", fontSize:"0.84rem", fontWeight:"bold", display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                <span>{cnt.acad || elite.pro?.academy || "Independent"}{(bio?.belt || elite.pro?.belt) ? " • " + (bio?.belt || elite.pro?.belt) : ""}</span>
                <span style={{ background:"#18202f", border:"1px solid #2d3748", borderRadius:"6px", padding:"2px 8px", fontSize:"0.76rem", color:"#e2e8f0" }}>
                  🥇<b>{cnt.g}</b> 🥈<b>{cnt.s}</b> 🥉<b>{cnt.b}</b> • <b style={{ color:"#34d399" }}>{elite.pts} Pts</b>
                </span>
              </div>

              {/* CURRENT SONG ON REPEAT (Right under Athlete Name & Academy!) */}
              {bio?.songRepeat && (
                <div style={{ marginTop:"6px", display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
                  <button
                    type="button"
                    onClick={handleSongClick}
                    title="Listen on your preferred music app"
                    style={{
                      background:"linear-gradient(90deg,#162436,#1d1836)", color:"#e2e8f0",
                      border:"1px solid #38bdf8", borderRadius:"16px", padding:"3px 10px",
                      fontSize:"0.74rem", fontWeight:"700", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:"5px"
                    }}
                  >
                    <span style={{ color:"#38bdf8" }}>🎵 On Repeat:</span> <b>{bio.songRepeat}</b> <span style={{ color:"#93c5fd" }}>▶</span>
                  </button>
                  {!bio?.songUrl && (
                    <button
                      type="button"
                      onClick={() => setShowMusicPicker(p => !p)}
                      title="Choose preferred music service (Spotify, Apple Music, or YouTube Music)"
                      style={{ background:"#182030", color:"#94a3b8", border:"1px solid #334155", borderRadius:"12px", padding:"2px 7px", fontSize:"0.68rem", cursor:"pointer" }}
                    >
                      {musicPref === "apple" ? "Apple Music ⚙️" : musicPref === "ytmusic" ? "YT Music ⚙️" : musicPref === "spotify" ? "Spotify ⚙️" : "Pick App 🎧"}
                    </button>
                  )}
                </div>
              )}

              {showMusicPicker && bio?.songRepeat && (
                <div style={{ marginTop:"5px", background:"#141c2c", border:"1px solid #38bdf8", borderRadius:"8px", padding:"6px 9px", display:"inline-flex", gap:"6px", alignItems:"center", flexWrap:"wrap", fontSize:"0.72rem" }}>
                  <span style={{ color:"#cbd5e1", fontWeight:"bold" }}>Listen on:</span>
                  <button type="button" onClick={() => chooseMusicService("spotify")} style={{ background:"#1DB954", color:"#000", border:"none", borderRadius:"5px", padding:"3px 8px", fontWeight:"800", cursor:"pointer", fontSize:"0.71rem" }}>Spotify</button>
                  <button type="button" onClick={() => chooseMusicService("apple")} style={{ background:"#fa243c", color:"#fff", border:"none", borderRadius:"5px", padding:"3px 8px", fontWeight:"800", cursor:"pointer", fontSize:"0.71rem" }}>Apple Music</button>
                  <button type="button" onClick={() => chooseMusicService("ytmusic")} style={{ background:"#ff0033", color:"#fff", border:"none", borderRadius:"5px", padding:"3px 8px", fontWeight:"800", cursor:"pointer", fontSize:"0.71rem" }}>YouTube Music</button>
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"#1e293b", color:"#fff", border:"1px solid #334155", borderRadius:"6px", padding:"4px 10px", height:"32px", cursor:"pointer" }}>✕</button>
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
          <div style={{ marginTop:"10px", background:"#132a1c", border:"1px solid #2ecc71", color:"#4ade80", padding:"8px 12px", borderRadius:"7px", fontSize:"0.82rem", fontWeight:"bold" }}>
            ✅ Verified Athlete Profile, Photo &amp; Bio Settings Locked!
          </div>
        )}

        {/* CLEAN SINGLE-LINE ACTION BAR: Watch (+ Count) • Jits (Youth) / Smoothcomp (Adult) • Share Stats */}
        <div style={{ display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap", margin:"12px 0" }}>
          <button
            type="button"
            onClick={() => { onWatch(nm, cnt.acad || elite.pro?.academy || ""); setTimeout(() => setWatcherCount(c => isWatching ? c : Math.max(1, c + 1)), 250); }}
            style={{
              background: isWatching ? "#132a1c" : "#162536",
              color: isWatching ? "#2ecc71" : "#38bdf8",
              border: isWatching ? "1px solid #2ecc71" : "1px solid #0284c7",
              borderRadius:"7px", padding:"7px 12px", fontWeight:"800", fontSize:"0.78rem", cursor:"pointer", whiteSpace:"nowrap"
            }}
          >
            {isWatching ? "✓ Watching" : "🔔 Watch"}
            {bio?.showWatchCount ? ` • 🔥 ${watcherCount}` : (isOwner ? ` • 👁️ ${watcherCount}` : "")}
          </button>

          <a
            href={externalRecordHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { if (isYouthCompetitor) trackEvent("jitsGgOutclicks"); }}
            title={isYouthCompetitor ? "View youth match records & rankings on Jits" : "View adult match history & profile on Smoothcomp"}
            style={{
              background: isYouthCompetitor ? "#132033" : "#241b12",
              color: isYouthCompetitor ? "#38bdf8" : "#ff9f43",
              border: isYouthCompetitor ? "1px solid #0284c7" : "1px solid #d97706",
              borderRadius:"7px", padding:"7px 12px", fontWeight:"800", fontSize:"0.78rem",
              textDecoration:"none", display:"inline-flex", alignItems:"center", gap:"4px", whiteSpace:"nowrap"
            }}
          >
            {externalRecordLabel}
          </a>

          {onShareCard && (
            <button
              type="button"
              onClick={() => (trackEvent("shareStatsClicks"), onShareCard({ badge: elite.isElite ? elite.tierLabel : "2026 OFFICIAL TROPHY ROOM", title: nm, subtitle: cnt.acad || elite.pro?.academy || "", gold: cnt.g, silver: cnt.s, bronze: cnt.b, deepLink: bioUrl, lines: [...(elite.pro?.titles || []), ...(elite.isElite ? elite.facts.map(x => "★ " + x) : []), ...evs.slice(0, 5).map(m => (Number(m.p)===1?"🥇":Number(m.p)===2?"🥈":"🥉") + " " + m.ev)] }))}
              style={{ background:"#ff9f43", color:"#000", border:"none", borderRadius:"7px", padding:"7px 12px", fontWeight:"800", fontSize:"0.78rem", cursor:"pointer", whiteSpace:"nowrap" }}
            >
              📲 Share Stats
            </button>
          )}
        </div>

        {/* 2. ATHLETE BIO SECTION */}
        <div style={{ background:"#141b28", border:"1px solid #283548", borderRadius:"10px", padding:"12px 13px", marginBottom:"12px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap", marginBottom: (hasBioDetails || claimStep || editBio) ? "8px" : 0 }}>
            <span style={{ color:"#93c5fd", fontWeight:"800", fontSize:"0.76rem", letterSpacing:"0.8px" }}>🪪 ATHLETE BIO</span>
            {!editBio && !claimStep && (
              isClaimed ? (
                isOwner ? (
                  <button type="button" onClick={handleRequestOrOpenEdit} style={{ background:"#1e293b", border:"1px solid #38bdf8", borderRadius:"6px", color:"#38bdf8", fontSize:"0.74rem", fontWeight:"bold", cursor:"pointer", padding:"4px 9px" }}>✏️ Edit Profile &amp; Pic</button>
                ) : (
                  <span onClick={handleRequestOrOpenEdit} title="Verified claimed profile — click only if you need to dispute ownership" style={{ color:"#4ade80", fontSize:"0.72rem", fontWeight:"bold", cursor:"pointer" }}>🔒 Verified Athlete</span>
                )
              ) : (
                <button type="button" onClick={handleRequestOrOpenEdit} style={{ background:"none", border:"none", color:"#38bdf8", fontSize:"0.76rem", fontWeight:"bold", cursor:"pointer", textDecoration:"underline", padding:0 }}>
                  Are you {nm} (or parent)? Claim &amp; Lock Profile →
                </button>
              )
            )}
          </div>

          {claimStep && !editBio && (
            <div style={{ background:"#0f1624", border:"1px solid #38bdf8", borderRadius:"8px", padding:"11px 12px", display:"grid", gap:"9px" }}>
              <div style={{ fontSize:"0.81rem", color:"#e2e8f0", fontWeight:"bold" }}>🔒 Claim &amp; Lock {nm}&apos;s Official MatDates Profile</div>
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
            hasBioDetails ? (
              <div style={{ display:"grid", gap:"7px" }}>
                {bio.quote && (
                  <div style={{ background:"#0f1624", borderLeft:"3px solid #f59e0b", padding:"7px 10px", borderRadius:"6px", fontSize:"0.82rem", color:"#fef3c7", fontStyle:"italic" }}>
                    &ldquo;{bio.quote}&rdquo;
                  </div>
                )}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(185px, 1fr))", gap:"7px", fontSize:"0.81rem" }}>
                  {bio.age && <div style={{ background:"#0f141e", padding:"6px 9px", borderRadius:"6px" }}><span style={{ color:"#94a3b8" }}>🎂 Age:</span> <b>{bio.age}</b></div>}
                  {bio.belt && <div style={{ background:"#0f141e", padding:"6px 9px", borderRadius:"6px" }}><span style={{ color:"#94a3b8" }}>🥋 Belt Rank:</span> <b>{bio.belt}</b></div>}
                  {bio.coach && <div style={{ background:"#0f141e", padding:"6px 9px", borderRadius:"6px" }}><span style={{ color:"#94a3b8" }}>🏛️ Head Professor:</span> <b>{bio.coach}</b></div>}
                  {bio.favMove && <div style={{ background:"#0f141e", padding:"6px 9px", borderRadius:"6px" }}><span style={{ color:"#94a3b8" }}>⚡ Go-To Move:</span> <b>{bio.favMove}</b></div>}
                  {bio.cheatMeal && <div style={{ background:"#0f141e", padding:"6px 9px", borderRadius:"6px", gridColumn:"1 / -1" }}><span style={{ color:"#fbbf24" }}>🍕 Favorite Full Cheat Meal / Snack:</span> <b>{bio.cheatMeal}</b></div>}
                  {bio.currentRead && (() => {
                    const bk = parseBookField(bio.currentRead);
                    return (
                      <div style={{ background:"#0f141e", padding:"6px 9px", borderRadius:"6px", gridColumn:"1 / -1", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                        <span><span style={{ color:"#93c5fd" }}>📖 Current Read:</span> <b>{bk.title}</b></span>
                        <a
                          href={bk.url}
                          target="_blank"
                          rel="noopener"
                          style={{ background:"#ff9900", color:"#000", padding:"4px 9px", borderRadius:"5px", fontWeight:"800", fontSize:"0.72rem", textDecoration:"none", whiteSpace:"nowrap" }}
                        >
                          Buy on Amazon ↗
                        </a>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div style={{ color:"#64748b", fontSize:"0.78rem", marginTop:"4px" }}>
                {isClaimed ? "Verified profile claimed — tap Edit Profile & Pic to add fight nickname, spirit emoji, song on repeat, motto & cheat meal!" : "Unclaimed profile — athletes (or parents) can lock their photo, @Instagram, nickname, song on repeat, motto & favorite cheat meal!"}
              </div>
            )
          )}

          {editBio && (
            <form onSubmit={saveBio} style={{ marginTop:"4px", display:"grid", gap:"8px" }}>
              <div style={{ background:"#112233", border:"1px solid #38bdf8", borderRadius:"7px", padding:"7px 10px", fontSize:"0.76rem", color:"#e0f2fe" }}>
                ✨ <b>Every question below is 100% optional!</b> Answer just 1 or 2 favorites (or all of them) — anything left blank stays hidden on your profile.
              </div>
              <div style={{ background:"#171f30", border:"1px solid #f59e0b", borderRadius:"7px", padding:"7px 10px", fontSize:"0.75rem", color:"#fde68a", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"6px" }}>
                <span>✨ <b>Neon Gold Ring Goal:</b> {watcherCount} / {WATCH_GLOW_MIN} Active Watchers</span>
                <span style={{ color:"#cbd5e1", fontSize:"0.72rem" }}>Share your Trophy Room on IG so fans tap 🔔 Watch!</span>
              </div>

              <div style={{ background:"#0f141e", border:"1px solid #334155", borderRadius:"7px", padding:"8px 10px", display:"flex", alignItems:"center", gap:"10px", flexWrap:"wrap" }}>
                {(form.avatarData || bio?.avatarData) && (
                  <img src={form.avatarData !== undefined ? form.avatarData : bio?.avatarData} alt="Preview" style={{ width:"44px", height:"44px", borderRadius:"50%", objectFit:"cover", border:"1.5px solid #fbbf24" }} />
                )}
                <div style={{ flex:1, minWidth:"180px" }}>
                  <div style={{ fontSize:"0.75rem", color:"#fbbf24", fontWeight:"bold", marginBottom:"3px" }}>📸 Athlete Profile Photo (Glows Neon Gold at {WATCH_GLOW_MIN}+ Watchers!)</div>
                  <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const d = await resizeAvatarFile(f); setForm(p => ({ ...p, avatarData: d })); } }} style={{ fontSize:"0.75rem", color:"#cbd5e1", width:"100%" }} />
                </div>
                {(form.avatarData || bio?.avatarData) && (
                  <button type="button" onClick={() => setForm(p => ({ ...p, avatarData: "" }))} style={{ background:"#2a1215", color:"#fca5a5", border:"1px solid #ef4444", borderRadius:"5px", padding:"4px 8px", fontSize:"0.72rem", cursor:"pointer" }}>Remove Pic</button>
                )}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))", gap:"7px" }}>
                <input placeholder="Instagram @handle (Optional)" value={form.handle || ""} onFocus={() => { if (!form.handle) setForm(f => ({...f, handle: "@"})); }} onChange={e => { const v = e.target.value; setForm({...form, handle: v ? ("@" + v.replace(/^@+/, "")) : ""}); }} style={inp} />
                <input placeholder="Fight Name / Nickname (Optional)" value={form.nickname || ""} onChange={e => setForm({...form, nickname: e.target.value})} style={inp} />
                <input placeholder="Spirit Emoji — Max 3 (Optional, e.g. 🦁🔥👑)" value={form.spiritEmoji || ""} onChange={e => setForm({...form, spiritEmoji: limitSpiritEmojis(e.target.value)})} style={inp} />
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(195px, 1fr))", gap:"7px" }}>
                <input placeholder="🎵 Song on Repeat (Optional — Song & Artist)" value={form.songRepeat || ""} onChange={e => setForm({...form, songRepeat: e.target.value})} style={inp} />
                <input type="url" placeholder="Optional Direct Song Link (blank = auto Spotify/Apple/YT)" value={form.songUrl || ""} onChange={e => setForm({...form, songUrl: e.target.value})} style={inp} />
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(145px, 1fr))", gap:"7px" }}>
                <input placeholder="Age (Optional)" value={form.age || ""} onChange={e => setForm({...form, age: e.target.value})} style={inp} />
                <input placeholder="Belt Rank (Optional)" value={form.belt || ""} onChange={e => setForm({...form, belt: e.target.value})} style={inp} />
                <input placeholder="Head Professor / Coach (Optional)" value={form.coach || ""} onChange={e => setForm({...form, coach: e.target.value})} style={inp} />
                <input placeholder="Go-To Submission / Guard (Optional)" value={form.favMove || ""} onChange={e => setForm({...form, favMove: e.target.value})} style={inp} />
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(195px, 1fr))", gap:"7px" }}>
                <input placeholder="💬 Favorite Quote, Motto, Saying or Verse (Optional)" value={form.quote || ""} onChange={e => setForm({...form, quote: e.target.value})} style={inp} />
                <input placeholder="📖 Current Read — Book Title or Amazon Link (Optional)" value={form.currentRead || ""} onChange={e => setForm({...form, currentRead: e.target.value})} style={inp} />
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(195px, 1fr))", gap:"7px" }}>
                <input placeholder="🍕 Favorite FULL CHEAT Meal / Snack (Optional)" value={form.cheatMeal || ""} onChange={e => setForm({...form, cheatMeal: e.target.value})} style={inp} />
                <input type="url" placeholder="Jits (Youth) or Smoothcomp (Adult) URL (Optional)" value={form.jitsUrl || ""} onChange={e => setForm({...form, jitsUrl: e.target.value})} style={inp} />
              </div>

              <input placeholder="Custom Fun Fact (Optional — pins to Insider Spotlight!)" value={form.funFact || ""} onChange={e => setForm({...form, funFact: e.target.value})} style={{ ...inp, width:"100%" }} />

              <label style={{ fontSize:"0.8rem", color:"#cbd5e1", display:"flex", alignItems:"center", gap:"6px", cursor:"pointer" }}>
                <input type="checkbox" checked={Boolean(form.showWatchCount)} onChange={e => setForm({...form, showWatchCount: e.target.checked})} />
                <span>🔥 Show total <b>&quot;Watching&quot; count ({watcherCount})</b> publicly on Watch button <i style={{ color:"#94a3b8" }}>(never shows who is watching)</i></span>
              </label>
              <label style={{ fontSize:"0.8rem", color:"#cbd5e1", display:"flex", alignItems:"center", gap:"6px", cursor:"pointer" }}>
                <input type="checkbox" checked={Boolean(form.openSf)} onChange={e => setForm({...form, openSf: e.target.checked})} />
                <span>🥊 List in the <b>Protected SuperFight Matchmaking Pool</b> <i style={{ color:"#94a3b8" }}>(email stays 100% hidden)</i></span>
              </label>

              <div style={{ background:"#0f141e", border:"1px solid #2d3b52", borderRadius:"7px", padding:"8px 10px", display:"grid", gap:"6px" }}>
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
                <button type="submit" disabled={saving} style={{ flex:1, background:"#2ecc71", color:"#000", border:"none", borderRadius:"6px", padding:"9px", fontWeight:"800", cursor:"pointer" }}>
                  {saving ? "Locking Profile..." : "🔒 Save & Lock Verified Profile"}
                </button>
                <button type="button" onClick={() => setEditBio(false)} style={{ background:"#1e293b", color:"#cbd5e1", border:"1px solid #334155", borderRadius:"6px", padding:"9px 12px", cursor:"pointer" }}>Cancel</button>
              </div>
            </form>
          )}
        </div>

        {/* 3. INSIDER SPOTLIGHT FACTS */}
        {(elite.isElite || bio?.funFact) && (
          <div style={{ marginBottom:"14px", background:"linear-gradient(135deg,#291d09,#171f30)", border:"1px solid #f59e0b", borderRadius:"10px", padding:"11px 13px" }}>
            <div style={{ color:"#fbbf24", fontWeight:"800", fontSize:"0.76rem", marginBottom:"5px" }}>{elite.tierLabel}</div>
            {elite.facts.map((f, i) => <div key={i} style={{ fontSize:"0.8rem", color:"#fef3c7", marginBottom:"4px", lineHeight:1.35 }}>★ {f}</div>)}
          </div>
        )}

        {/* 4. EVENTS & PODIUMS */}
        {elite.pro && (
          <div style={{ marginBottom:"12px" }}>
            <div style={{ color:"#fbbf24", fontWeight:"bold", fontSize:"0.8rem", marginBottom:"5px" }}>👑 PRO TITLES &amp; SUPERFIGHT VICTORIES</div>
            <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"6px" }}>{elite.pro.titles.map((t, i) => <span key={i} style={{ background:"#292011", color:"#fde68a", border:"1px solid #d97706", borderRadius:"5px", padding:"2px 8px", fontSize:"0.74rem", fontWeight:"bold" }}>{t}</span>)}</div>
            {elite.pro.bouts.map((b, i) => <div key={i} style={{ background:"#151b26", padding:"6px 9px", borderRadius:"6px", fontSize:"0.77rem", marginBottom:"4px" }}>🥊 <b>{b.ev}</b> — <b style={{ color:"#4ade80" }}>{b.res}</b> ({b.sub})</div>)}
          </div>
        )}

        <div style={{ color:"#93c5fd", fontWeight:"bold", fontSize:"0.8rem", marginBottom:"5px" }}>🏅 VERIFIED TOURNAMENT EVENTS &amp; PODIUMS ({evs.length})</div>
        <div style={{ display:"grid", gap:"5px" }}>
          {evs.length === 0 ? <div style={{ color:"#94a3b8", fontSize:"0.8rem" }}>Tournament podiums sync automatically as official results post.</div> : evs.map((m, i) => (
            <div key={i} style={{ background:"#151b26", padding:"6px 9px", borderRadius:"6px", fontSize:"0.76rem", display:"flex", justifyContent:"space-between", gap:"8px" }}>
              <span>{Number(m.p)===1?"🥇":Number(m.p)===2?"🥈":"🥉"} <b>{m.ev}</b> — {m.d}</span>
              <b style={{ color:"#38bdf8", fontSize:"0.7rem", flexShrink:0 }}>{/ufc/i.test((m.ev||"")+" "+(m.f||"")) ? "UFC" : m.f}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
