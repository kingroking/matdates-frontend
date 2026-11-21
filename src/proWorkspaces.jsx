import { MatAlertModal, useWatchedAthletes } from "./MatAlertModal";
import React, { useState, useEffect } from "react";
import { collection, doc, getDoc, getDocs, setDoc, addDoc, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { foldStr, strictVerifiedAthleteRowMatch, inferTargetGender, cleanAcademyName } from "./proHubData";

function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 860;
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
          else { w = Math.round((w * maxDim) / h); h = maxDim; }
        }
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", 0.74));
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const TOUR_TARGETS = {
  SITE: [
    { sel: '[data-tour="filter-bar"]', title: "Filter Federations & Events", text: "Pick multiple federations at once (IBJJF + ADCC + UFC BJJ), filter by month or Youth/Adult, and spot 🥋 Gi & ⚡ No-Gi tags on every card." },
    { sel: '[data-tour="nav-lookup"]', title: "Universal Athlete Lookup & Watch", text: "Search ANY competitor — even before they register — to view their Trophy Room or tap 🔔 Watch for live tournament-day Mat # alerts." },
    { sel: '[data-tour="nav-standings"]', title: "Standings, Trophy Rooms & SuperFights", text: "Click any athlete's name to open their Trophy Room, link their @Instagram, fill out their Athlete Bio, or share stats!" },
    { sel: '[data-tour="nav-warroom"]', title: "Live Weekend War Room", text: "Track all your watched athletes' live Mat assignments, match times, and upcoming registration cutoffs in one place." },
    { sel: '[data-tour="first-card"]', title: "Brackets, Q&A, Photogs & Event Hub", text: "Every event card lets you compare 2 athletes head-to-head (🆚 Compare), ask questions in 💬 Tips, book 📸 Photogs, or check in on SuperFight cards!" }
  ],
  ACADEMY: [
    { sel: '[data-tour="acad-clipboard"]', title: "Saturday Coach Mat Clipboard", text: "Automatically lists every student from your academy registered in upcoming brackets so Professors never miss a mat!" },
    { sel: '[data-tour="acad-album"]', title: "Team Podium Photo Drop Album", text: "Athletes & parents upload podium pics tagged with their @Instagram right here so coaches can save & repost in 1 tap." },
    { sel: '[data-tour="acad-staff"]', title: "Add Co-Professors & Coaches", text: "Link your fellow Professors and Coaches by email so your whole coaching staff gets this Academy Dashboard on login!" }
  ],
  PROMOTER: [
    { sel: '[data-tour="prom-matchmaker"]', title: "Open SuperFight Matchmaker DB", text: "Filter verified athletes who marked themselves Open for SuperFights and message them directly." },
    { sel: '[data-tour="prom-checkins"]', title: "Athlete Pre-Fight Check-Ins & Corners", text: "See live Virtual Weigh-Ins, Coach Wristband lists, Walkout songs, and Poster photos submitted from your Event Card's Hub!" },
    { sel: '[data-tour="prom-tickets"]', title: "VIP Tables & Fighter Ticket Referrals", text: "Configure your checkout link and track every ticket & VIP table sold through each competing athlete's personal referral link." },
    { sel: '[data-tour="prom-team"]', title: "Add Matchmakers & Event Staff", text: "Invite your Matchmakers and Head Table staff by email so they get full Promoter Homepage tools automatically!" }
  ]
};

// Contextual Real-Element Spotlight Popup Coach-Mark Tour!
export function GuidedTourModal({ mode = "SITE", onClose }) {
  const steps = TOUR_TARGETS[mode] || TOUR_TARGETS.SITE;
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState(null);
  const cur = steps[idx];

  // Strictly block manual user wheel, touch-drag & keyboard scrolling while Spotlight Guide is open!
  useEffect(() => {
    const blockScroll = (e) => { e.preventDefault(); };
    const blockKeys = (e) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", " "].includes(e.key)) e.preventDefault();
    };
    window.addEventListener("wheel", blockScroll, { passive: false });
    window.addEventListener("touchmove", blockScroll, { passive: false });
    window.addEventListener("keydown", blockKeys, { passive: false });
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("wheel", blockScroll);
      window.removeEventListener("touchmove", blockScroll);
      window.removeEventListener("keydown", blockKeys);
    };
  }, []);

  useEffect(() => {
    let lockTimer;
    const measure = () => {
      const el = document.querySelector(cur.sel);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const syncToTarget = () => {
      const el = document.querySelector(cur.sel);
      if (!el) { setRect(null); document.body.style.overflow = "hidden"; return; }
      // Briefly allow programmatic centering, track position, then freeze body scroll
      document.body.style.overflow = "";
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      measure();
      const t1 = setTimeout(measure, 140);
      lockTimer = setTimeout(() => {
        measure();
        document.body.style.overflow = "hidden";
      }, 320);
      return () => clearTimeout(t1);
    };
    syncToTarget();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      clearTimeout(lockTimer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [idx, cur.sel]);

  const vw = typeof window !== "undefined" ? (window.visualViewport?.width || window.innerWidth) : 900;
  const vh = typeof window !== "undefined" ? (window.visualViewport?.height || window.innerHeight) : 700;
  const isMobileScreen = vw < 600;
  const popWidth = Math.min(340, vw - 20);
  const estCardH = isMobileScreen ? 215 : 195;
  const placeAbove = rect && (rect.top + rect.height + estCardH > vh - 12) && rect.top > estCardH;
  const rawTop = rect ? (placeAbove ? (rect.top - estCardH - 10) : (rect.top + rect.height + 12)) : (vh / 2 - 95);
  const popTop = Math.max(10, Math.min(vh - estCardH - 12, rawTop));
  const popLeft = Math.max(10, Math.min(vw - popWidth - 10, rect ? (rect.left + rect.width / 2 - popWidth / 2) : (vw / 2 - popWidth / 2)));

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:10120, overscrollBehavior:"contain", background: rect ? "transparent" : "rgba(0,0,0,0.68)" }}>
      {rect && (
        <div style={{
          position:"fixed",
          top: Math.max(4, rect.top - 6),
          left: Math.max(4, rect.left - 6),
          width: rect.width + 12,
          height: rect.height + 12,
          borderRadius:"10px",
          border:"2px solid #38bdf8",
          boxShadow:"0 0 0 9999px rgba(0,0,0,0.75), 0 0 22px rgba(56,189,248,0.85)",
          pointerEvents:"none",
          transition:"all 0.22s ease"
        }} />
      )}
      <div onClick={e => e.stopPropagation()} style={{
        position:"fixed", top: popTop, left: popLeft, width: popWidth,
        maxHeight: (vh - 24) + "px", overflowY:"auto", WebkitOverflowScrolling:"touch", boxSizing:"border-box",
        background:"#0f172a", border:"1.5px solid #38bdf8", borderRadius:"12px",
        padding:"13px 14px", color:"#fff", textAlign:"left",
        boxShadow:"0 14px 34px rgba(0,0,0,0.92)", transition:"top 0.2s ease, left 0.2s ease", zIndex:10125
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"5px" }}>
          <span style={{ color:"#38bdf8", fontSize:"0.7rem", fontWeight:"800", letterSpacing:"1px" }}>SPOTLIGHT GUIDE • {idx + 1} OF {steps.length}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#94a3b8", fontSize:"0.78rem", cursor:"pointer", padding:0 }}>Close ✕</button>
        </div>
        <div style={{ fontWeight:"800", fontSize:"0.98rem", color:"#ffffff", marginBottom:"5px" }}>👆 {cur.title}</div>
        <div style={{ fontSize:"0.82rem", color:"#cbd5e1", lineHeight:1.45, marginBottom:"12px" }}>{cur.text}</div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", gap:"4px" }}>
            {steps.map((_, i) => <span key={i} style={{ width: i===idx ? "14px" : "6px", height:"6px", borderRadius:"3px", background: i===idx ? "#38bdf8" : "#334155" }} />)}
          </div>
          <div style={{ display:"flex", gap:"6px" }}>
            {idx > 0 && <button onClick={() => setIdx(idx - 1)} style={{ padding:"5px 10px", borderRadius:"6px", background:"#1e293b", color:"#fff", border:"1px solid #334155", fontSize:"0.76rem", fontWeight:"bold", cursor:"pointer" }}>← Back</button>}
            {idx < steps.length - 1 ? (
              <button onClick={() => setIdx(idx + 1)} style={{ padding:"5px 12px", borderRadius:"6px", background:"#38bdf8", color:"#000", border:"none", fontSize:"0.76rem", fontWeight:"800", cursor:"pointer" }}>Next →</button>
            ) : (
              <button onClick={onClose} style={{ padding:"5px 12px", borderRadius:"6px", background:"#2ecc71", color:"#000", border:"none", fontSize:"0.76rem", fontWeight:"800", cursor:"pointer" }}>Done ✓</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MultiCategoryDropdown({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ITEMS = [
    ["Smoothcomp", "Smoothcomp", "#ff9f43"],
    ["IBJJF", "IBJJF", "#0055a4"],
    ["JJWL", "JJWL", "#ffffff"],
    ["ADCC", "ADCC", "#F1C40F"],
    ["UFC", "UFC BJJ (Opens & SuperFights)", "#d20a0a"],
    ["Super Fight", "Super Fights & Invitationals", "#14b8a6"],
    ["Seminars", "Seminars & Camps", "#9b59b6"]
  ];
  const toggle = (k) => {
    if (selected.includes(k)) onChange(selected.filter(x => x !== k));
    else onChange([...selected, k]);
  };
  return (
    <div style={{ position:"relative", minWidth:"205px", flex:"0 1 auto" }}>
      <button type="button" onClick={() => setOpen(!open)} style={{ width:"100%", padding:"11px 13px", borderRadius:"6px", border: selected.length ? "1px solid #38bdf8" : "1px solid #2b3340", background:"#0d1117", color: selected.length ? "#38bdf8" : "#e2e8f0", fontSize:"0.92rem", fontWeight:"600", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"10px" }}>
        <span>{selected.length === 0 ? "Filter Federations" : `Federations (${selected.length} Active)`}</span>
        <span style={{ color:"#94a3b8", fontSize:"0.78rem" }}>{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, zIndex:9500, background:"#141923", border:"1px solid #334155", borderRadius:"9px", padding:"10px", minWidth:"260px", boxShadow:"0 14px 32px rgba(0,0,0,0.8)", textAlign:"left" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"7px", paddingBottom:"6px", borderBottom:"1px solid #263145", fontSize:"0.75rem" }}>
            <span style={{ color:"#94a3b8", fontWeight:"bold" }}>Select federations to show:</span>
            {selected.length > 0 && <button type="button" onClick={() => onChange([])} style={{ background:"none", border:"none", color:"#38bdf8", cursor:"pointer", fontWeight:"bold", padding:0 }}>Clear All</button>}
          </div>
          {ITEMS.map(([k, lbl, col]) => {
            const checked = selected.includes(k);
            return (
              <label key={k} onClick={() => toggle(k)} style={{ display:"flex", alignItems:"center", gap:"9px", padding:"6px", borderRadius:"6px", cursor:"pointer", fontSize:"0.85rem", color:"#f1f5f9", background: checked ? "#1c2638" : "transparent" }}>
                <input type="checkbox" checked={checked} onChange={() => {}} style={{ accentColor:"#38bdf8", cursor:"pointer" }} />
                <span style={{ width:"10px", height:"10px", borderRadius:"2px", background:col, display:"inline-block", border: col==="#ffffff" ? "1px solid #666" : "none", flexShrink:0 }} />
                <span style={{ fontWeight: checked ? "700" : "400" }}>{lbl}</span>
              </label>
            );
          })}
          <button type="button" onClick={() => setOpen(false)} style={{ marginTop:"8px", width:"100%", padding:"7px", borderRadius:"6px", background:"#1e293b", color:"#fff", border:"1px solid #334155", fontWeight:"bold", cursor:"pointer", fontSize:"0.79rem" }}>Apply Filter</button>
        </div>
      )}
    </div>
  );
}

// 📸 Team Podium Photo Drop Album + Coach Clipboard (used inside both Academy Homepage AND Academy Trophy Room!)
const exactGymKey = (raw) => {
  const k = foldStr(raw || "").replace(/[^a-z0-9]/g, "");
  if (k.startsWith("aoj") || k.startsWith("artofjiujitsu")) return "artofjiujitsu";
  if (k.startsWith("atoshq") || k === "atosjiujitsuhq" || k === "atosjiujitsu") return "atos";
  if (k === "tmcombat" || k === "tmcombatacademy" || k === "thiagomendescombatacademy" || k === "carlsongraciejiujitsusanantonio" || k === "carlsongraciesanantoniotx") return "carlsongraciesanantonio";
  if (k === "carlsongracieteam") return "carlsongracie";
  if (k === "gb") return "graciebarra";
  if (k === "braziliantopteam") return "btt";
  if (k === "checkmatbjj") return "checkmat";
  if (k === "alliancebjj") return "alliance";
  return k;
};

export function AcademyProSuite({ gymName: propGymName, gymKey: propGymKey, medalists = [], onOpenAthlete, user, isAdmin, onRequireAuth, isHomepage = false }) {
  const [ws, setWs] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [newGymName, setNewGymName] = useState("");
  const activeName = cleanAcademyName(propGymName || ws?.gymName || "");
  const canonicalTargetKey = exactGymKey(propGymKey || activeName);
  const activeKey = propGymKey || ws?.gymKey || (activeName ? foldStr(activeName).replace(/[^a-z0-9]+/g, "_") : "");

  const [photos, setPhotos] = useState([]);
  const [upcomingSquad, setUpcomingSquad] = useState([]);
  const [publicBios, setPublicBios] = useState([]);
  const [staffInput, setStaffInput] = useState("");
  const [coachNameInput, setCoachNameInput] = useState("");
  const [rosterWatchPick, setRosterWatchPick] = useState(null);
  const { getWatch, removeWatch } = useWatchedAthletes();
  const openRosterWatch = (personName, e) => {
    if (e) e.stopPropagation();
    setRosterWatchPick({
      ev: { id: "", name: "All Upcoming Tournaments", link: "https://matdates.com/?athlete=" + encodeURIComponent(personName).replace(/%20/g, "+"), sort_date: "" },
      comp: { Name: personName, Academy: activeName || "", Division: "" },
      existing: getWatch(personName)
    });
  };
  const [showTour, setShowTour] = useState(false);
  const [upForm, setUpForm] = useState({ athlete: "", eventName: "", medal: "🥇 Gold", insta: "", fileData: "" });
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  // Check if current logged-in user is an Academy account / verified Coach Staff for THIS gym
  useEffect(() => {
    if (!user?.uid) { setUserRole(""); return; }
    getDoc(doc(db, "mat_watches", "role_" + user.uid)).then(d => {
      if (d.exists()) setUserRole(d.data()?.role || "user");
    }).catch(() => {});
  }, [user?.uid]);

  useEffect(() => {
    if (propGymKey) {
      getDoc(doc(db, "mat_watches", "acad_ws_" + propGymKey)).then(d => { if (d.exists()) setWs(d.data()); }).catch(() => {});
    } else if (user?.email) {
      const em = user.email.toLowerCase();
      getDocs(query(collection(db, "mat_watches"), where("kind", "==", "academy_workspace"))).then(sn => {
        const hit = sn.docs.map(d => d.data()).find(w => w.ownerUid === user.uid || (w.staffEmails || []).includes(em));
        if (hit) setWs(hit);
      }).catch(() => {});
    }
  }, [propGymKey, user]);

  const userEmLow = (user?.email || "").toLowerCase();
  const isGymStaff = Boolean(
    isAdmin ||
    isHomepage ||
    (user && ws && (ws.ownerUid === user.uid || (userEmLow && (ws.staffEmails || []).includes(userEmLow)))) ||
    (user && userRole === "academy" && !ws)
  );

  const [sub, setSub] = useState(isHomepage ? "CLIPBOARD" : "ROSTER");
  useEffect(() => {
    if (isHomepage) setSub("CLIPBOARD");
  }, [isHomepage]);

  const loadAlbum = () => {
    if (!activeKey && !canonicalTargetKey) return;
    getDocs(query(collection(db, "mat_watches"), where("kind", "==", "academy_photo"))).then(sn => {
      const list = sn.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(x => exactGymKey(x.gymKey || x.gymName || "") === canonicalTargetKey)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setPhotos(list);
    }).catch(() => {});
  };

  useEffect(() => {
    if (!activeName) return;
    loadAlbum();

    // Load public bios for this gym (gives us claimed athletes + their named Professors/Coaches!)
    getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__public_bios__"))).then(sn => {
      setPublicBios(sn.docs.map(d => d.data()).filter(b => b && b.name && exactGymKey(b.academy || "") === canonicalTargetKey));
    }).catch(() => {});

    // STRICT exact-gym matching on __athlete_index__ (NO MORE outside "Carlson Gracie" or "San Antonio" gyms bleeding in!)
    const rgPrefix = (canonicalTargetKey || "00").slice(0, 2).padEnd(2, "0");
    getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__rg_" + rgPrefix + "__"))).then(sn => {
      const seen = new Set();
      const hits = [];
      sn.forEach(d => ((d.data() || {}).items || []).forEach(it => {
        if (!it.a || exactGymKey(it.a) !== canonicalTargetKey) return;
        const rk = foldStr(it.n) + "|" + foldStr(it.e || "") + "|" + foldStr(it.d || "");
        if (seen.has(rk)) return;
        seen.add(rk);
        hits.push(it);
      }));
      setUpcomingSquad(hits.slice(0, 80));
    }).catch(() => {});
  }, [activeName, canonicalTargetKey]);

  // Build unified, deduplicated Team Roster (Claimed Athletes + 2026 Medalists + Upcoming Squad)
  const teamRoster = React.useMemo(() => {
    const map = new Map();
    const ensure = (rawNm, beltStr) => {
      const nm = (rawNm || "").trim();
      if (!nm) return null;
      const rGen = inferTargetGender(nm, medalists || []);
      for (const ex of map.values()) {
        if (strictVerifiedAthleteRowMatch(nm, activeName, "", ex.name, activeName, ex.gender || rGen)) {
          if (nm.length > ex.name.length && !/^[a-z]\./i.test(nm)) ex.name = nm;
          if (beltStr && !ex.belt) ex.belt = beltStr;
          return ex;
        }
      }
      const k = foldStr(nm);
      const item = { name: nm, belt: beltStr || "", gender: rGen, g: 0, s: 0, b: 0, events: [], seen: new Set() };
      map.set(k, item);
      return item;
    };

    publicBios.forEach(b => { if (b.name) ensure(b.name, b.belt || ""); });
    (medalists || []).forEach(m => {
      if (m.isEventSummary || m.isRosterEntry) return;
      const rec = ensure(m.n, "");
      if (!rec) return;
      const rowGen = inferTargetGender(rec.name, [m]);
      if (rec.gender && rowGen && rec.gender !== rowGen) return;
      const dk = foldStr(m.ev) + "|" + foldStr(m.d) + "|" + m.p;
      if (rec.seen.has(dk)) return;
      rec.seen.add(dk);
      const p = Number(m.p || 3);
      if (p === 1) rec.g++; else if (p === 2) rec.s++; else rec.b++;
      rec.events.push({ ...m, a: activeName });
    });
    upcomingSquad.forEach(u => { if (u.n) ensure(u.n, ""); });

    return Array.from(map.values()).sort((a, b) => (b.g * 9 + b.s * 3 + b.b) - (a.g * 9 + a.s * 3 + a.b) || a.name.localeCompare(b.name));
  }, [publicBios, medalists, upcomingSquad, activeName]);

  // Build clickable Professors & Coaches directory for this Academy!
  const gymCoaches = React.useMemo(() => {
    const map = new Map();
    const addCoach = (raw, roleLabel) => {
      const clean = (raw || "").replace(/^(head\s+professor|professor|prof\.?|coach)\s+/i, "").trim();
      if (clean.length < 3 || clean.includes("@")) return;
      const k = foldStr(clean);
      if (!map.has(k)) map.set(k, { name: clean, displayTitle: /^(prof)/i.test(raw || "") ? "Head Professor" : (roleLabel || "Professor / Coach") });
    };
    if (canonicalTargetKey === "carlsongraciesanantonio") addCoach("Professor Thiago Mendes", "Head Professor • 3rd Degree Black Belt");
    (ws?.coachNames || []).forEach(cn => addCoach(cn, "Academy Professor / Coach"));
    publicBios.forEach(b => { if (b.coach) addCoach(b.coach, "Professor / Coach"); });
    return Array.from(map.values());
  }, [ws, publicBios, canonicalTargetKey]);

  const openPersonTrophy = (personName) => {
    if (!onOpenAthlete) return;
    const hit = teamRoster.find(r => foldStr(r.name) === foldStr(personName));
    if (hit) {
      onOpenAthlete({ name: hit.name, academy: activeName, g: hit.g || 0, s: hit.s || 0, b: hit.b || 0, events: hit.events || [] });
    } else {
      onOpenAthlete({ name: personName, academy: activeName, g: 0, s: 0, b: 0, events: [] });
    }
  };

  const claimAcademy = async (e) => {
    if (e) e.preventDefault();
    if (!user) { onRequireAuth && onRequireAuth(); return; }
    const targetName = activeName || newGymName.trim();
    if (!targetName) return;
    const gKey = propGymKey || foldStr(targetName).replace(/[^a-z0-9]+/g, "_");
    const payload = { kind: "academy_workspace", gymKey: gKey, gymName: targetName, ownerUid: user.uid, ownerEmail: (user.email || "").toLowerCase(), staffEmails: [(user.email || "").toLowerCase()], coachNames: ws?.coachNames || [], createdAt: new Date().toISOString() };
    await setDoc(doc(db, "mat_watches", "acad_ws_" + gKey), payload, { merge: true });
    setWs(payload);
    setShowTour(true);
  };

  const addCoachStaff = async (e) => {
    e.preventDefault();
    if (!ws) return;
    const em = staffInput.trim().toLowerCase();
    const cn = coachNameInput.trim();
    const nextEmails = em.includes("@") ? Array.from(new Set([...(ws.staffEmails || []), em])) : (ws.staffEmails || []);
    const nextNames = cn ? Array.from(new Set([...(ws.coachNames || []), cn])) : (ws.coachNames || []);
    await setDoc(doc(db, "mat_watches", "acad_ws_" + ws.gymKey), { staffEmails: nextEmails, coachNames: nextNames }, { merge: true });
    setWs({ ...ws, staffEmails: nextEmails, coachNames: nextNames });
    setStaffInput("");
    setCoachNameInput("");
    setMsg("✅ Updated Professors & Coaching Staff for " + activeName + "!");
  };

  const onPickPhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const dataUrl = await compressImageFile(f);
    setUpForm(p => ({ ...p, fileData: dataUrl }));
  };

  const submitPhoto = async (e) => {
    e.preventDefault();
    if (!user) { onRequireAuth && onRequireAuth(); return; }
    if (!upForm.fileData) { alert("Select a tournament or podium photo first."); return; }
    setUploading(true);
    await addDoc(collection(db, "mat_watches"), {
      kind: "academy_photo", gymKey: canonicalTargetKey, gymName: activeName,
      athlete: upForm.athlete.trim(), eventName: upForm.eventName.trim(), medal: upForm.medal,
      insta: upForm.insta.replace(/^@+/, "").trim(), photoData: upForm.fileData,
      uploaderEmail: user.email || "", uid: user.uid, createdAt: new Date().toISOString()
    });
    setUploading(false);
    setUpForm({ athlete: "", eventName: "", medal: "🥇 Gold", insta: "", fileData: "" });
    setMsg("✅ Photo added to " + activeName + "'s Team Podium Album!");
    loadAlbum();
  };

  const inp = { padding:"7px 9px", borderRadius:"6px", background:"#0f141e", color:"#fff", border:"1px solid #334155", fontSize:"0.82rem" };

  if (isHomepage && !activeName) {
    return (
      <form onSubmit={claimAcademy} style={{ background:"#131b28", border:"1.5px solid #38bdf8", borderRadius:"10px", padding:"14px", marginBottom:"16px", display:"flex", gap:"8px", flexWrap:"wrap", alignItems:"center", textAlign:"left" }}>
        <div style={{ flex:"1 1 260px" }}>
          <div style={{ color:"#38bdf8", fontSize:"0.74rem", fontWeight:"800" }}>🥋 WELCOME PROFESSOR / COACH • SET UP YOUR ACADEMY HOMEPAGE</div>
          <div style={{ color:"#cbd5e1", fontSize:"0.82rem" }}>Enter your Academy name to pin your Live Coach Mat Clipboard &amp; Team Photo Drop Album right here:</div>
        </div>
        <input required placeholder="Academy Name (e.g. Carlson Gracie San Antonio)" value={newGymName} onChange={e => setNewGymName(e.target.value)} style={{ ...inp, flex:"1 1 220px", padding:"9px 11px" }} />
        <button type="submit" style={{ background:"#38bdf8", color:"#000", border:"none", borderRadius:"7px", padding:"9px 14px", fontWeight:"800", cursor:"pointer" }}>Link My Academy</button>
      </form>
    );
  }

  return (
    <div style={{ background:"#131924", border: isHomepage ? "1.5px solid #38bdf8" : "1px solid #2d3b52", borderRadius:"10px", padding:"14px", marginBottom:"12px", textAlign:"left" }}>
      {showTour && <GuidedTourModal mode="ACADEMY" onClose={() => setShowTour(false)} />}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap", marginBottom:"10px" }}>
        <div>
          {isHomepage && <div style={{ color:"#38bdf8", fontSize:"0.72rem", fontWeight:"800", letterSpacing:"1px" }}>🥋 ACADEMY PRO HOMEPAGE • {activeName.toUpperCase()}</div>}
          <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginTop: isHomepage ? "6px" : 0 }}>
            {isGymStaff ? (
              <button data-tour="acad-clipboard" type="button" onClick={() => setSub("CLIPBOARD")} style={{ padding:"6px 10px", borderRadius:"6px", fontWeight:"800", fontSize:"0.76rem", cursor:"pointer", background: sub==="CLIPBOARD" ? "#38bdf8" : "#1c2434", color: sub==="CLIPBOARD" ? "#000" : "#cbd5e1", border:"none" }}>📋 Coach Mat Clipboard ({upcomingSquad.length})</button>
            ) : null}
            <button type="button" onClick={() => setSub("ROSTER")} style={{ padding:"6px 10px", borderRadius:"6px", fontWeight:"800", fontSize:"0.76rem", cursor:"pointer", background: sub==="ROSTER" ? "#38bdf8" : "#1c2434", color: sub==="ROSTER" ? "#000" : "#cbd5e1", border:"none" }}>🥋 Team Roster ({teamRoster.length})</button>
            <button data-tour="acad-album" type="button" onClick={() => setSub("ALBUM")} style={{ padding:"6px 10px", borderRadius:"6px", fontWeight:"800", fontSize:"0.76rem", cursor:"pointer", background: sub==="ALBUM" ? "#ff9f43" : "#1c2434", color: sub==="ALBUM" ? "#000" : "#cbd5e1", border:"none" }}>📸 Team Podium Album ({photos.length})</button>
            <button data-tour="acad-staff" type="button" onClick={() => setSub("STAFF")} style={{ padding:"6px 10px", borderRadius:"6px", fontWeight:"800", fontSize:"0.76rem", cursor:"pointer", background: sub==="STAFF" ? "#2ecc71" : "#1c2434", color: sub==="STAFF" ? "#000" : "#cbd5e1", border:"none" }}>🥋 Professors &amp; Coaches ({gymCoaches.length})</button>
          </div>
        </div>
        {isGymStaff && (
          <button type="button" onClick={() => setShowTour(true)} style={{ padding:"5px 9px", borderRadius:"6px", background:"#1e293b", color:"#93c5fd", border:"1px solid #334155", fontSize:"0.73rem", fontWeight:"bold", cursor:"pointer" }}>❓ Coach Guide</button>
        )}
      </div>

      {msg && <div style={{ background:"#132a1c", border:"1px solid #2ecc71", color:"#4ade80", padding:"6px 10px", borderRadius:"6px", fontSize:"0.78rem", fontWeight:"bold", marginBottom:"8px" }}>{msg}</div>}

      {/* TEAM ROSTER (Default for Regular Users — every name opens their Trophy Room!) */}
      {sub === "ROSTER" && (
        <div style={{ display:"grid", gap:"6px" }}>
          <div style={{ fontSize:"0.78rem", color:"#93c5fd", fontWeight:"bold" }}>🥋 Verified {activeName} Competitors ({teamRoster.length}) — tap any teammate to open their Trophy Room:</div>
          {teamRoster.length === 0 ? (
            <div style={{ color:"#94a3b8", fontSize:"0.78rem" }}>Athletes appear here automatically as they claim profiles, register for upcoming events, or earn verified podiums!</div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(255px, 1fr))", gap:"6px", maxHeight:"260px", overflowY:"auto" }}>
              {teamRoster.map((m, i) => {
                const watching = Boolean(getWatch(m.name));
                return (
                  <div key={i} onClick={() => openPersonTrophy(m.name)} style={{ background:"#182030", border:"1px solid #283548", padding:"7px 9px", borderRadius:"7px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"6px", fontSize:"0.78rem", cursor:"pointer" }}>
                    <span style={{ minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      <b style={{ color:"#fff", textDecoration:"underline", textDecorationColor:"rgba(56,189,248,0.5)" }}>{m.name}</b>
                      {m.belt ? <span style={{ color:"#94a3b8", fontSize:"0.7rem" }}> • {m.belt}</span> : null}
                    </span>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:"5px", flexShrink:0 }}>
                      <span style={{ fontSize:"0.72rem", color:"#fbbf24", fontWeight:"bold", whiteSpace:"nowrap" }}>
                        {(m.g + m.s + m.b) > 0 ? `🥇${m.g} 🥈${m.s} 🥉${m.b}` : "🏆"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => openRosterWatch(m.name, e)}
                        style={{ background: watching ? "#132a1c" : "#162536", color: watching ? "#2ecc71" : "#38bdf8", border: watching ? "1px solid #2ecc71" : "1px solid #0284c7", borderRadius:"5px", padding:"2px 6px", fontSize:"0.68rem", fontWeight:"800", cursor:"pointer", whiteSpace:"nowrap" }}
                      >
                        {watching ? "✓ Watching" : "🔔 Watch"}
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* COACH MAT CLIPBOARD (Strictly visible ONLY to Academy / Coach Staff accounts!) */}
      {sub === "CLIPBOARD" && isGymStaff && (
        <div style={{ display:"grid", gap:"6px" }}>
          <div style={{ fontSize:"0.78rem", color:"#93c5fd", fontWeight:"bold" }}>📋 Verified {activeName} Upcoming Registered Squad ({upcomingSquad.length}):</div>
          {upcomingSquad.length === 0 ? <div style={{ color:"#94a3b8", fontSize:"0.78rem" }}>No upcoming bracket registrations indexed for {activeName} right now — populates automatically when students register!</div> : upcomingSquad.map((r, i) => (
            <div key={i} onClick={() => openPersonTrophy(r.n)} style={{ background:"#182030", padding:"7px 10px", borderRadius:"6px", display:"flex", justifyContent:"space-between", gap:"8px", fontSize:"0.78rem", cursor:"pointer" }}>
              <span><b style={{ color:"#fff", textDecoration:"underline" }}>{r.n}</b> — <span style={{ color:"#cbd5e1" }}>{r.d}</span></span>
              <span style={{ color:"#4ade80", fontWeight:"bold", flexShrink:0 }}>Trophy Room →</span>
            </div>
          ))}
        </div>
      )}

      {/* TEAM PODIUM PHOTO ALBUM */}
      {sub === "ALBUM" && (
        <div>
          <form onSubmit={submitPhoto} style={{ background:"#182030", border:"1px solid #2d3748", borderRadius:"8px", padding:"10px", marginBottom:"10px", display:"grid", gap:"7px" }}>
            <div style={{ fontSize:"0.78rem", color:"#fcd34d", fontWeight:"bold" }}>📸 Drop a Podium / Tournament Photo for {activeName}:</div>
            <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
              <input required placeholder="Athlete Name(s)" value={upForm.athlete} onChange={e => setUpForm({...upForm, athlete: e.target.value})} style={{ ...inp, flex:"1 1 130px" }} />
              <input required placeholder="Tournament Name" value={upForm.eventName} onChange={e => setUpForm({...upForm, eventName: e.target.value})} style={{ ...inp, flex:"1 1 140px" }} />
              <select value={upForm.medal} onChange={e => setUpForm({...upForm, medal: e.target.value})} style={inp}>
                {["🥇 Gold","🥈 Silver","🥉 Bronze","🥋 Team / Action"].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input placeholder="@instagram (Optional)" value={upForm.insta} onFocus={() => { if (!upForm.insta) setUpForm(f => ({...f, insta: "@"})); }} onChange={e => { const v = e.target.value; setUpForm({...upForm, insta: v ? ("@" + v.replace(/^@+/, "")) : ""}); }} style={{ ...inp, flex:"1 1 115px" }} />
            </div>
            <div style={{ display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap" }}>
              <input type="file" accept="image/*" onChange={onPickPhoto} style={{ fontSize:"0.76rem", color:"#cbd5e1", flex:1 }} />
              <button type="submit" disabled={uploading} style={{ background:"#ff9f43", color:"#000", border:"none", borderRadius:"6px", padding:"7px 12px", fontWeight:"800", fontSize:"0.78rem", cursor:"pointer" }}>{uploading ? "Uploading..." : "➕ Add Photo"}</button>
            </div>
          </form>
          {photos.length === 0 ? <div style={{ color:"#94a3b8", fontSize:"0.78rem" }}>No podium photos dropped yet — athletes &amp; parents can upload tournament photos right here!</div> : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))", gap:"8px" }}>
              {photos.map(ph => (
                <div key={ph.id} style={{ background:"#182030", border:"1px solid #334155", borderRadius:"8px", overflow:"hidden" }}>
                  <img src={ph.photoData} alt={ph.athlete} style={{ width:"100%", height:"130px", objectFit:"cover", display:"block" }} />
                  <div style={{ padding:"7px" }}>
                    <div onClick={() => ph.athlete && openPersonTrophy(ph.athlete)} style={{ fontWeight:"bold", fontSize:"0.77rem", color:"#fff", cursor:"pointer", textDecoration:"underline" }}>{ph.medal.split(" ")[0]} {ph.athlete}</div>
                    <div style={{ fontSize:"0.7rem", color:"#94a3b8" }}>{ph.eventName}</div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"4px" }}>
                      {ph.insta ? <span style={{ color:"#38bdf8", fontSize:"0.7rem", fontWeight:"bold" }}>@{ph.insta}</span> : <span />}
                      <a href={ph.photoData} download={(ph.athlete || "podium") + ".jpg"} style={{ background:"#1e293b", color:"#fff", padding:"2px 6px", borderRadius:"4px", fontSize:"0.68rem", textDecoration:"none", fontWeight:"bold" }}>⬇ Save</a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {rosterWatchPick && (
        <MatAlertModal
          event={rosterWatchPick.ev}
          comp={rosterWatchPick.comp}
          division=""
          existingWatch={rosterWatchPick.existing}
          onRemove={removeWatch}
          onClose={() => setRosterWatchPick(null)}
        />
      )}

      {/* PROFESSORS & COACHES DIRECTORY (Clickable to Trophy Rooms for all users; Staff Editor ONLY for Academy Accounts!) */}
      {sub === "STAFF" && (
        <div style={{ display:"grid", gap:"8px" }}>
          <div style={{ fontSize:"0.78rem", color:"#4ade80", fontWeight:"bold" }}>🥋 {activeName} Professors &amp; Coaching Staff:</div>
          {gymCoaches.length === 0 ? (
            <div style={{ color:"#94a3b8", fontSize:"0.78rem" }}>No Professors or Coaches listed yet — populates as Academy owners add coaches or athletes list their Head Professor!</div>
          ) : (
            <div style={{ display:"grid", gap:"6px" }}>
              {gymCoaches.map((c, idx) => {
                const watchingCoach = Boolean(getWatch(c.name));
                return (
                  <div key={idx} onClick={() => openPersonTrophy(c.name)} style={{ background:"#182030", border:"1px solid #2d3b52", borderRadius:"7px", padding:"8px 11px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap", cursor:"pointer" }}>
                    <div>
                      <b style={{ color:"#fff", fontSize:"0.84rem", textDecoration:"underline", textDecorationColor:"rgba(74,222,128,0.5)" }}>{c.name}</b>
                      <div style={{ color:"#94a3b8", fontSize:"0.73rem" }}>{c.displayTitle}</div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:"6px" }} onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => openRosterWatch(c.name, e)}
                        style={{ background: watchingCoach ? "#132a1c" : "#162536", color: watchingCoach ? "#2ecc71" : "#38bdf8", border: watchingCoach ? "1px solid #2ecc71" : "1px solid #0284c7", borderRadius:"6px", padding:"4px 9px", fontSize:"0.72rem", fontWeight:"800", cursor:"pointer", whiteSpace:"nowrap" }}
                      >
                        {watchingCoach ? "✓ Watching" : "🔔 Watch"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openPersonTrophy(c.name)}
                        style={{ background:"#f59e0b", color:"#000", border:"none", borderRadius:"6px", padding:"4px 9px", fontSize:"0.73rem", fontWeight:"800", cursor:"pointer", whiteSpace:"nowrap" }}
                      >
                        🏆 Trophy Room →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {isGymStaff && (
            !ws ? (
              <button type="button" onClick={claimAcademy} style={{ background:"#2ecc71", color:"#000", border:"none", borderRadius:"6px", padding:"8px 14px", fontWeight:"800", fontSize:"0.78rem", cursor:"pointer", justifySelf:"start" }}>🏛️ Activate Academy Staff Controls for {activeName}</button>
            ) : (
              <form onSubmit={addCoachStaff} style={{ marginTop:"6px", paddingTop:"8px", borderTop:"1px solid #263145", display:"flex", gap:"6px", flexWrap:"wrap" }}>
                <input placeholder="Professor / Coach Full Name (e.g. Prof. Thiago Mendes)" value={coachNameInput} onChange={e => setCoachNameInput(e.target.value)} style={{ ...inp, flex:"1 1 180px" }} />
                <input type="email" placeholder="Coach Login Email (Optional)" value={staffInput} onChange={e => setStaffInput(e.target.value)} style={{ ...inp, flex:"1 1 170px" }} />
                <button type="submit" style={{ background:"#2ecc71", color:"#000", border:"none", borderRadius:"6px", padding:"7px 12px", fontWeight:"800", fontSize:"0.78rem", cursor:"pointer" }}>+ Add Coach</button>
              </form>
            )
          )}
        </div>
      )}
    </div>
  );
}

export function PromoterHomeDashboard({ events, user }) {
  const [ws, setWs] = useState(null);
  const [orgName, setOrgName] = useState("");
  const [tab, setTab] = useState("ROSTER");
  const [pool, setPool] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [sales, setSales] = useState([]);
  const [cardId, setCardId] = useState(events?.[0]?.id || "");
  const [cfg, setCfg] = useState({ ticketUrl: "", gaLabel: "", vipTableLabel: "", weighInInfo: "", cornerInfo: "", bookedRoster: [], scheduledBouts: [], boutResults: [] });
  const [boutForm, setBoutForm] = useState({ fighterA: "", fighterB: "", division: "", winner: "", method: "" });
  const [bulkAthletes, setBulkAthletes] = useState("");
  const [staffInput, setStaffInput] = useState("");
  const [showTour, setShowTour] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!user?.email) return;
    const em = user.email.toLowerCase();
    getDocs(query(collection(db, "mat_watches"), where("kind", "==", "promoter_workspace"))).then(sn => {
      const hit = sn.docs.map(d => ({ id: d.id, ...d.data() })).find(w => w.ownerUid === user.uid || (w.staffEmails || []).includes(em));
      if (hit) setWs(hit);
    }).catch(() => {});
    getDocs(query(collection(db, "mat_watches"), where("kind", "==", "athlete_bio"))).then(sn => {
      const safePool = sn.docs.map(d => {
        const x = d.data() || {};
        if (!x.openSf || !x.name) return null;
        return {
          slug: d.id.replace(/^bio_/, ""),
          name: x.name,
          nickname: x.nickname || "",
          academy: x.academy || "",
          belt: x.belt || "",
          age: x.age || ""
        };
      }).filter(Boolean);
      setPool(safePool);
    }).catch(() => {});
    getDocs(query(collection(db, "mat_watches"), where("kind", "==", "fighter_checkin"))).then(sn => setCheckins(sn.docs.map(d => d.data()))).catch(() => {});
    getDocs(query(collection(db, "mat_watches"), where("kind", "==", "ticket_referral"))).then(sn => setSales(sn.docs.map(d => d.data()))).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!cardId) return;
    getDoc(doc(db, "mat_watches", "prom_cfg_" + cardId)).then(d => {
      if (d.exists()) setCfg(prev => ({ ...prev, ...d.data(), bookedRoster: d.data().bookedRoster || [], scheduledBouts: d.data().scheduledBouts || [], boutResults: d.data().boutResults || [] }));
      else setCfg({ ticketUrl: "", gaLabel: "", vipTableLabel: "", weighInInfo: "", cornerInfo: "", bookedRoster: [] });
    }).catch(() => {});
  }, [cardId]);

  const activateOrg = async (e) => {
    e.preventDefault();
    const slug = "prom_ws_" + foldStr(orgName).replace(/[^a-z0-9]+/g, "_");
    const payload = { kind: "promoter_workspace", orgName: orgName.trim(), ownerUid: user.uid, ownerEmail: user.email.toLowerCase(), staffEmails: [user.email.toLowerCase()], createdAt: new Date().toISOString() };
    await setDoc(doc(db, "mat_watches", slug), payload, { merge: true });
    setWs({ id: slug, ...payload });
    setShowTour(true);
  };

  // Parse newly pasted "Athlete Name, email@domain.com" lines, preserve existing emailed:true records, and queue emails ONLY for newly added athletes!
  const addBookedFightersAndQueueInvites = async (e) => {
    e.preventDefault();
    if (!cardId || !bulkAthletes.trim()) return;
    const evObj = (events || []).find(x => x.id === cardId) || {};
    const existing = [...(cfg.bookedRoster || [])];
    const existingEmails = new Set(existing.map(r => (r.email || "").toLowerCase()));
    let added = 0;

    bulkAthletes.split(/\n|;/).map(l => l.trim()).filter(Boolean).forEach(line => {
      const emMatch = line.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (!emMatch) return;
      const email = emMatch[1].toLowerCase();
      if (existingEmails.has(email)) return;
      const namePart = line.replace(emMatch[0], "").replace(/^[,\s|-]+|[,\s|-]+$/g, "").trim() || email.split("@")[0];
      existing.push({ name: namePart, email, emailed: false, addedAt: new Date().toISOString() });
      existingEmails.add(email);
      added++;
    });

    await setDoc(doc(db, "mat_watches", "prom_cfg_" + cardId), {
      kind: "prom_cfg",
      eventId: cardId,
      eventName: evObj.name || "",
      eventDate: evObj.date || "",
      orgName: ws?.orgName || "Promoter",
      bookedRoster: existing,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    setCfg(prev => ({ ...prev, bookedRoster: existing }));
    setBulkAthletes("");
    setMsg(`✅ Added ${added} new fighter(s)! MatDates is automatically emailing ONLY the newly added athletes their account setup instructions, exclusive Fighter Check-In unlock link & personal Ticket Referral link!`);
  };

  const saveCardConfig = async (e) => {
    e.preventDefault();
    if (!cardId) return;
    const evObj = (events || []).find(x => x.id === cardId) || {};
    await setDoc(doc(db, "mat_watches", "prom_cfg_" + cardId), {
      kind: "prom_cfg", eventId: cardId, eventName: evObj.name || "", orgName: ws?.orgName || "",
      ticketUrl: cfg.ticketUrl || "", gaLabel: cfg.gaLabel || "", vipTableLabel: cfg.vipTableLabel || "",
      weighInInfo: cfg.weighInInfo || "", cornerInfo: cfg.cornerInfo || "",
      updatedAt: new Date().toISOString()
    }, { merge: true });
    setMsg("✅ Saved Ticket Checkout Link, VIP Table Tiers & Official Briefing onto Event Card!");
  };

  const publishBoutOrResult = async (e) => {
    e.preventDefault();
    if (!cardId || (!boutForm.fighterA.trim() && !boutForm.winner.trim())) return;
    const evObj = (events || []).find(x => x.id === cardId) || {};
    const nextBouts = [...(cfg.scheduledBouts || [])];
    const nextResults = [...(cfg.boutResults || [])];
    if (boutForm.winner.trim()) {
      const w = boutForm.winner.trim();
      const l = foldStr(w) === foldStr(boutForm.fighterA) ? boutForm.fighterB.trim() : boutForm.fighterA.trim();
      nextResults.unshift({
        id: Date.now().toString(36),
        winner: w,
        loser: l,
        method: boutForm.method.trim() || "Official Decision",
        division: boutForm.division.trim() || "SuperFight",
        postedAt: new Date().toISOString()
      });
    } else {
      nextBouts.unshift({
        id: Date.now().toString(36),
        fighterA: boutForm.fighterA.trim(),
        fighterB: boutForm.fighterB.trim(),
        division: boutForm.division.trim() || "SuperFight",
        postedAt: new Date().toISOString()
      });
    }
    await setDoc(doc(db, "mat_watches", "prom_cfg_" + cardId), {
      kind: "prom_cfg",
      eventId: cardId,
      eventName: evObj.name || "",
      eventDate: evObj.date || "",
      orgName: ws?.orgName || "Promoter",
      scheduledBouts: nextBouts,
      boutResults: nextResults,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    setCfg(prev => ({ ...prev, scheduledBouts: nextBouts, boutResults: nextResults }));
    setBoutForm({ fighterA: "", fighterB: "", division: "", winner: "", method: "" });
    setMsg("🚨 Published! All fans watching these athletes will automatically receive SuperFight Matchup / Result Push & Email Alerts!");
  };

  const addStaff = async (e) => {
    e.preventDefault();
    const em = staffInput.trim().toLowerCase();
    if (!ws || !em.includes("@")) return;
    const next = Array.from(new Set([...(ws.staffEmails || []), em]));
    await setDoc(doc(db, "mat_watches", ws.id), { staffEmails: next }, { merge: true });
    setWs({ ...ws, staffEmails: next });
    setStaffInput("");
    setMsg("✅ Added Matchmaker / Staff (" + em + ") — they now get this Promoter Dashboard on login!");
  };

  const inp = { padding:"8px 10px", borderRadius:"6px", background:"#0f141e", color:"#fff", border:"1px solid #334155", fontSize:"0.82rem", boxSizing:"border-box" };

  if (!ws) {
    return (
      <form onSubmit={activateOrg} style={{ background:"#112226", border:"1.5px solid #14b8a6", borderRadius:"10px", padding:"14px", marginBottom:"16px", display:"flex", gap:"8px", flexWrap:"wrap", alignItems:"center", textAlign:"left" }}>
        <div style={{ flex:"1 1 260px" }}>
          <div style={{ color:"#5eead4", fontSize:"0.74rem", fontWeight:"800" }}>🏟️ WELCOME PROMOTER • ACTIVATE YOUR EVENT COMMAND CENTER</div>
          <div style={{ color:"#cbd5e1", fontSize:"0.82rem" }}>Name your Promotion to unlock Automated Fighter Email Onboarding, Check-Ins &amp; VIP Table/Ticket Tracking:</div>
        </div>
        <input required placeholder="Promotion Name (e.g. Lone Star SuperFights)" value={orgName} onChange={e => setOrgName(e.target.value)} style={{ ...inp, flex:"1 1 220px" }} />
        <button type="submit" style={{ background:"#14b8a6", color:"#000", border:"none", borderRadius:"7px", padding:"9px 14px", fontWeight:"800", cursor:"pointer" }}>Launch Dashboard</button>
      </form>
    );
  }

  return (
    <div style={{ background:"#111c24", border:"1.5px solid #14b8a6", borderRadius:"11px", padding:"14px", marginBottom:"18px", textAlign:"left", color:"#fff" }}>
      {showTour && <GuidedTourModal mode="PROMOTER" onClose={() => setShowTour(false)} />}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap", marginBottom:"10px" }}>
        <div>
          <div style={{ color:"#5eead4", fontSize:"0.72rem", fontWeight:"800", letterSpacing:"1px" }}>🏟️ PROMOTER &amp; MATCHMAKER HOMEPAGE • {ws.orgName.toUpperCase()}</div>
          <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginTop:"6px" }}>
            <button type="button" onClick={() => setTab("ROSTER")} style={{ padding:"6px 10px", borderRadius:"6px", fontWeight:"800", fontSize:"0.76rem", cursor:"pointer", background: tab==="ROSTER" ? "#38bdf8" : "#182430", color: tab==="ROSTER" ? "#000" : "#cbd5e1", border:"none" }}>📧 Booked Fighters &amp; Auto-Invite ({(cfg.bookedRoster || []).length})</button>
            <button data-tour="prom-checkins" type="button" onClick={() => setTab("CHECKINS")} style={{ padding:"6px 10px", borderRadius:"6px", fontWeight:"800", fontSize:"0.76rem", cursor:"pointer", background: tab==="CHECKINS" ? "#14b8a6" : "#182430", color: tab==="CHECKINS" ? "#000" : "#cbd5e1", border:"none" }}>🥋 Submitted Check-Ins ({checkins.length})</button>
            <button data-tour="prom-tickets" type="button" onClick={() => setTab("TICKETS")} style={{ padding:"6px 10px", borderRadius:"6px", fontWeight:"800", fontSize:"0.76rem", cursor:"pointer", background: tab==="TICKETS" ? "#ff9f43" : "#182430", color: tab==="TICKETS" ? "#000" : "#cbd5e1", border:"none" }}>🎟️ Tickets &amp; Event Info ({sales.length})</button>
            <button data-tour="prom-matchmaker" type="button" onClick={() => setTab("MATCHMAKER")} style={{ padding:"6px 10px", borderRadius:"6px", fontWeight:"800", fontSize:"0.76rem", cursor:"pointer", background: tab==="MATCHMAKER" ? "#f59e0b" : "#182430", color: tab==="MATCHMAKER" ? "#000" : "#cbd5e1", border:"none" }}>⚡ Protected Matchmaker DB</button>
            <button data-tour="prom-team" type="button" onClick={() => setTab("TEAM")} style={{ padding:"6px 10px", borderRadius:"6px", fontWeight:"800", fontSize:"0.76rem", cursor:"pointer", background: tab==="TEAM" ? "#2ecc71" : "#182430", color: tab==="TEAM" ? "#000" : "#cbd5e1", border:"none" }}>👥 Staff</button>
          </div>
        </div>
        <button type="button" onClick={() => setShowTour(true)} style={{ padding:"5px 9px", borderRadius:"6px", background:"#1e293b", color:"#5eead4", border:"1px solid #14b8a6", fontSize:"0.73rem", fontWeight:"bold", cursor:"pointer" }}>❓ Spotlight Guide</button>
      </div>

      {msg && <div style={{ background:"#132a1c", border:"1px solid #2ecc71", color:"#4ade80", padding:"7px 10px", borderRadius:"6px", fontSize:"0.78rem", fontWeight:"bold", marginBottom:"8px" }}>{msg}</div>}

      {tab === "ROSTER" && (
        <div style={{ display:"grid", gap:"8px" }}>
          <div style={{ display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize:"0.8rem", color:"#93c5fd", fontWeight:"bold" }}>Select Event Card:</span>
            <select value={cardId} onChange={e => setCardId(e.target.value)} style={{ ...inp, flex:"1 1 260px" }}>
              {(events || []).slice(0, 80).map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({ev.date})</option>)}
            </select>
          </div>
          <form onSubmit={addBookedFightersAndQueueInvites} style={{ display:"grid", gap:"7px" }}>
            <div style={{ fontSize:"0.77rem", color:"#cbd5e1" }}>
              Paste booked athletes below (<b>Athlete Name, email@example.com</b> — one per line). Adding new names later automatically emails <b>only</b> the newly added athletes their account link, exclusive Fighter Check-In access &amp; personal Ticket Sales link!
            </div>
            <textarea rows={3} required placeholder={"Cassia Moura, cassia@example.com\nAndrew Tackett, andrew@example.com"} value={bulkAthletes} onChange={e => setBulkAthletes(e.target.value)} style={{ ...inp, width:"100%" }} />
            <button type="submit" style={{ background:"#38bdf8", color:"#000", border:"none", borderRadius:"6px", padding:"9px", fontWeight:"800", cursor:"pointer" }}>
              📧 Save Verified Fighter List &amp; Auto-Email New Athletes
            </button>
          </form>
          {(cfg.bookedRoster || []).length > 0 && (
            <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginTop:"4px" }}>
              {(cfg.bookedRoster || []).map((r, i) => (
                <span key={i} style={{ background:"#16202c", border:"1px solid #2d3b52", borderRadius:"6px", padding:"4px 8px", fontSize:"0.74rem", color:"#e2e8f0" }}>
                  🥋 <b>{r.name}</b> ({r.email}) {r.emailed ? <span style={{ color:"#4ade80" }}>• ✉️ Invite Sent</span> : <span style={{ color:"#fbbf24" }}>• ⏳ Queued</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "CHECKINS" && (
        <div style={{ display:"grid", gap:"6px" }}>
          {checkins.length === 0 ? <div style={{ color:"#94a3b8", fontSize:"0.8rem" }}>As booked fighters click their invite email &amp; complete check-in, their Virtual Weigh-Ins, Corners &amp; Walkout songs appear right here!</div> : checkins.slice(0, 25).map((c, i) => (
            <div key={i} style={{ background:"#16202c", border:"1px solid #283648", borderRadius:"7px", padding:"8px 10px", fontSize:"0.78rem", display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:"8px" }}>
              <div>
                <b style={{ color:"#fff" }}>{c.athleteName}</b> ({c.academy}) • <span style={{ color:"#4ade80" }}>Weight: {c.weight || "Pending"}</span>
                <div style={{ color:"#94a3b8", fontSize:"0.74rem" }}>Corners: {[c.corner1, c.corner2].filter(Boolean).join(", ") || "None"} {c.phonetic ? " • Say: " + c.phonetic : ""}</div>
              </div>
              <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
                {c.scaleProofUrl && <a href={c.scaleProofUrl} target="_blank" rel="noreferrer" style={{ color:"#38bdf8", fontWeight:"bold" }}>⚖️ Scale ↗</a>}
                {c.walkoutUrl && <a href={c.walkoutUrl} target="_blank" rel="noreferrer" style={{ color:"#fbbf24", fontWeight:"bold" }}>🎵 Walkout ↗</a>}
                {c.posterPhotoUrl && <a href={c.posterPhotoUrl} target="_blank" rel="noreferrer" style={{ color:"#4ade80", fontWeight:"bold" }}>📸 Photo ↗</a>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "TICKETS" && (
        <form onSubmit={saveCardConfig} style={{ display:"grid", gap:"8px" }}>
          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
            <select value={cardId} onChange={e => setCardId(e.target.value)} style={{ ...inp, flex:"1 1 240px" }}>
              {(events || []).slice(0, 80).map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({ev.date})</option>)}
            </select>
            <input type="url" placeholder="Official Ticket / VIP Table Checkout URL (Eventbrite, Stripe, Square)" value={cfg.ticketUrl || ""} onChange={e => setCfg({...cfg, ticketUrl: e.target.value})} style={{ ...inp, flex:"1 1 260px" }} />
          </div>
          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
            <input placeholder="GA Tier Label & Price (e.g. General Admission — $45)" value={cfg.gaLabel || ""} onChange={e => setCfg({...cfg, gaLabel: e.target.value})} style={{ ...inp, flex:1 }} />
            <input placeholder="VIP Table Label & Price (e.g. 8-Seat Mat-Side Table — $600)" value={cfg.vipTableLabel || ""} onChange={e => setCfg({...cfg, vipTableLabel: e.target.value})} style={{ ...inp, flex:1 }} />
          </div>
          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
            <input placeholder="Official Weigh-In Time / Allowance Info" value={cfg.weighInInfo || ""} onChange={e => setCfg({...cfg, weighInInfo: e.target.value})} style={{ ...inp, flex:1 }} />
            <input placeholder="Coach / Corner Pass Policy" value={cfg.cornerInfo || ""} onChange={e => setCfg({...cfg, cornerInfo: e.target.value})} style={{ ...inp, flex:1 }} />
          </div>
          <button type="submit" style={{ background:"#ff9f43", color:"#000", border:"none", borderRadius:"6px", padding:"9px", fontWeight:"800", cursor:"pointer" }}>💾 Save Ticket Tiers &amp; Official Briefing</button>
        </form>
      )}

      {tab === "MATCHMAKER" && (
        <div style={{ display:"grid", gap:"8px", userSelect:"none", WebkitUserSelect:"none" }} onCopy={e => e.preventDefault()}>
          <div style={{ background:"#15202e", border:"1px solid #2d3b52", borderRadius:"7px", padding:"8px 10px", fontSize:"0.76rem", color:"#cbd5e1" }}>
            🔒 <b>Privacy-Protected Matchmaking:</b> Search by belt, academy, or division below (capped to 10 results per query; bulk export disabled). Click <b>🥊 Send Bout Offer</b> to relay official bout terms straight to the athlete/parent without exposing private contact data.
          </div>
          <div style={{ display:"flex", gap:"7px", flexWrap:"wrap" }}>
            <input placeholder="Search athlete name, academy, or weight/belt..." value={mmQuery} onChange={e => setMmQuery(e.target.value)} style={{ ...inp, flex:"1 1 220px" }} />
            <select value={mmBelt} onChange={e => setMmBelt(e.target.value)} style={{ ...inp, flex:"0 1 150px" }}>
              <option value="ALL">All Belts</option>
              <option value="grey">Youth / Grey-Green</option>
              <option value="blue">Blue Belt</option>
              <option value="purple">Purple Belt</option>
              <option value="brown">Brown Belt</option>
              <option value="black">Black Belt</option>
            </select>
          </div>

          {offerTarget && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              const dayKey = "md_offers_" + new Date().toISOString().slice(0, 10);
              const used = Number(localStorage.getItem(dayKey) || "0");
              if (used >= 15) { alert("Daily matchmaking inquiry limit (15/day) reached to protect athletes from spam."); return; }
              const offerId = "offer_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
              await setDoc(doc(db, "mat_watches", offerId), {
                kind: "bout_offer",
                workspaceId: ws.id,
                orgName: ws.orgName,
                promoterReplyEmail: user.email,
                athleteSlug: offerTarget.slug,
                athleteName: offerTarget.name,
                eventDetails: offerForm.eventDetails.trim(),
                terms: offerForm.terms.trim(),
                relayed: false,
                createdAt: new Date().toISOString()
              });
              try { localStorage.setItem(dayKey, String(used + 1)); } catch {}
              setOfferTarget(null);
              setOfferForm({ eventDetails: "", terms: "" });
              setMsg("✅ Official Bout Offer relayed privately to " + offerTarget.name + "! If interested, they will reply directly to " + user.email + ".");
            }} style={{ background:"#172334", border:"1.5px solid #f59e0b", borderRadius:"8px", padding:"10px", display:"grid", gap:"7px" }}>
              <div style={{ fontSize:"0.8rem", fontWeight:"800", color:"#fbbf24" }}>🥊 Send Official SuperFight Offer to {offerTarget.name}</div>
              <input required placeholder="Event Name, Date, City & Target Weight (e.g. Lone Star Invitational • Feb 14 • 135 lbs)" value={offerForm.eventDetails} onChange={e => setOfferForm({...offerForm, eventDetails: e.target.value})} style={inp} />
              <input required placeholder="Ruleset, Bout Length & Purse / Ticket Split Terms" value={offerForm.terms} onChange={e => setOfferForm({...offerForm, terms: e.target.value})} style={inp} />
              <div style={{ display:"flex", gap:"7px" }}>
                <button type="submit" style={{ background:"#2ecc71", color:"#000", border:"none", borderRadius:"6px", padding:"7px 13px", fontWeight:"800", cursor:"pointer", fontSize:"0.78rem" }}>✉️ Relay Protected Bout Offer</button>
                <button type="button" onClick={() => setOfferTarget(null)} style={{ background:"transparent", color:"#94a3b8", border:"1px solid #334155", borderRadius:"6px", padding:"7px 11px", cursor:"pointer", fontSize:"0.76rem" }}>Cancel</button>
              </div>
            </form>
          )}

          {(() => {
            const q = foldStr(mmQuery);
            const filtered = pool.filter(a => {
              if (mmBelt !== "ALL") {
                const bLow = (a.belt || "").toLowerCase();
                if (mmBelt === "grey" && !/grey|gray|yellow|orange|green|youth|kid/.test(bLow)) return false;
                if (mmBelt !== "grey" && !bLow.includes(mmBelt)) return false;
              }
              if (!q) return true;
              return foldStr(a.name + " " + a.academy + " " + a.belt).includes(q);
            }).slice(0, 10);

            if (pool.length === 0) return <div style={{ color:"#94a3b8", fontSize:"0.8rem" }}>Athletes who opt into &quot;Open for SuperFights&quot; appear here for protected bout offers.</div>;
            if (filtered.length === 0) return <div style={{ color:"#94a3b8", fontSize:"0.8rem" }}>No opted-in fighters matched that filter — try another belt or search term.</div>;
            return filtered.map((a, i) => (
              <div key={i} style={{ background:"#16202c", padding:"8px 10px", borderRadius:"6px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap", fontSize:"0.8rem" }}>
                <span>
                  <b>{a.name}</b> {a.nickname ? <i style={{ color:"#fbbf24" }}>&quot;{a.nickname}&quot;</i> : null}
                  {a.academy ? " • " + a.academy : ""} {a.belt ? " • " + a.belt : ""} {a.age ? " • Age " + a.age : ""}
                </span>
                <button type="button" onClick={() => setOfferTarget(a)} style={{ background:"#f59e0b", color:"#000", border:"none", padding:"5px 10px", borderRadius:"5px", fontWeight:"800", fontSize:"0.74rem", cursor:"pointer" }}>
                  🥊 Send Bout Offer
                </button>
              </div>
            ));
          })()}
        </div>
      )}

      {tab === "TEAM" && (
        <div style={{ display:"grid", gap:"8px" }}>
          <div style={{ fontSize:"0.79rem", color:"#4ade80", fontWeight:"bold" }}>✓ Linked Matchmakers &amp; Event Staff ({(ws.staffEmails || []).length}):</div>
          <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
            {(ws.staffEmails || []).map((em, i) => <span key={i} style={{ background:"#16202c", border:"1px solid #334155", borderRadius:"5px", padding:"3px 8px", fontSize:"0.74rem" }}>🥊 {em}</span>)}
          </div>
          <form onSubmit={addStaff} style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
            <input required type="email" placeholder="Add Matchmaker or Staff email..." value={staffInput} onChange={e => setStaffInput(e.target.value)} style={{ ...inp, flex:1 }} />
            <button type="submit" style={{ background:"#14b8a6", color:"#000", border:"none", borderRadius:"6px", padding:"7px 12px", fontWeight:"800", cursor:"pointer" }}>+ Add Matchmaker / Staff</button>
          </form>
        </div>
      )}
    </div>
  );
}
