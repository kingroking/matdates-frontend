import React, { useState, useEffect } from "react";
import { collection, doc, getDoc, getDocs, setDoc, addDoc, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { foldStr } from "./proHubData";

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

  const vw = typeof window !== "undefined" ? window.innerWidth : 900;
  const vh = typeof window !== "undefined" ? window.innerHeight : 700;
  const popWidth = Math.min(330, vw - 24);
  const placeAbove = rect && (rect.top + rect.height + 195 > vh) && rect.top > 190;
  const popTop = rect ? (placeAbove ? Math.max(12, rect.top - 175) : Math.min(vh - 185, rect.top + rect.height + 14)) : Math.max(80, vh / 2 - 90);
  const popLeft = rect ? Math.min(vw - popWidth - 12, Math.max(12, rect.left + rect.width / 2 - popWidth / 2)) : Math.max(12, vw / 2 - popWidth / 2);

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:10120, touchAction:"none", overscrollBehavior:"none", background: rect ? "transparent" : "rgba(0,0,0,0.65)" }}>
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
        background:"#0f172a", border:"1.5px solid #38bdf8", borderRadius:"12px",
        padding:"14px 15px", color:"#fff", textAlign:"left",
        boxShadow:"0 14px 34px rgba(0,0,0,0.88)", transition:"all 0.22s ease"
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
export function AcademyProSuite({ gymName: propGymName, gymKey: propGymKey, user, isAdmin, onRequireAuth, isHomepage = false }) {
  const [ws, setWs] = useState(null);
  const [newGymName, setNewGymName] = useState("");
  const activeName = propGymName || ws?.gymName || "";
  const activeKey = propGymKey || ws?.gymKey || (activeName ? foldStr(activeName).replace(/[^a-z0-9]+/g, "_") : "");
  const wsId = "acad_ws_" + (activeKey || "unlinked");

  const [sub, setSub] = useState(isHomepage ? "CLIPBOARD" : "ALBUM");
  const [photos, setPhotos] = useState([]);
  const [roster, setRoster] = useState([]);
  const [staffInput, setStaffInput] = useState("");
  const [showTour, setShowTour] = useState(false);
  const [upForm, setUpForm] = useState({ athlete: "", eventName: "", medal: "🥇 Gold", insta: "", fileData: "" });
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

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

  const loadAlbum = () => {
    if (!activeKey) return;
    getDocs(query(collection(db, "mat_watches"), where("kind", "==", "academy_photo"))).then(sn => {
      const list = sn.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(x => x.gymKey === activeKey || foldStr(x.gymName || "") === foldStr(activeName))
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setPhotos(list);
    }).catch(() => {});
  };

  useEffect(() => {
    if (!activeName) return;
    loadAlbum();
    getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__athlete_index__"))).then(sn => {
      const gFold = foldStr(activeName);
      const hits = [];
      sn.forEach(d => ((d.data() || {}).items || []).forEach(it => {
        if ((it.a || "").length >= 3 && (foldStr(it.a).includes(gFold) || gFold.includes(foldStr(it.a)))) hits.push(it);
      }));
      setRoster(hits.slice(0, 80));
    }).catch(() => {});
  }, [activeName, activeKey]);

  const claimAcademy = async (e) => {
    if (e) e.preventDefault();
    if (!user) { onRequireAuth && onRequireAuth(); return; }
    const targetName = activeName || newGymName.trim();
    if (!targetName) return;
    const gKey = propGymKey || foldStr(targetName).replace(/[^a-z0-9]+/g, "_");
    const payload = { kind: "academy_workspace", gymKey: gKey, gymName: targetName, ownerUid: user.uid, ownerEmail: (user.email || "").toLowerCase(), staffEmails: [(user.email || "").toLowerCase()], createdAt: new Date().toISOString() };
    await setDoc(doc(db, "mat_watches", "acad_ws_" + gKey), payload, { merge: true });
    await addDoc(collection(db, "pending_events"), { kind: "workspace_claim", roleType: "Academy Pro", orgName: targetName, ownerEmail: user.email, adminNotified: false, createdAt: new Date().toISOString() }).catch(() => {});
    setWs(payload);
    setShowTour(true);
  };

  const addCoachStaff = async (e) => {
    e.preventDefault();
    const em = staffInput.trim().toLowerCase();
    if (!em.includes("@") || !ws) return;
    const next = Array.from(new Set([...(ws.staffEmails || []), em]));
    await setDoc(doc(db, "mat_watches", "acad_ws_" + ws.gymKey), { staffEmails: next }, { merge: true });
    setWs({ ...ws, staffEmails: next });
    setStaffInput("");
    setMsg("✅ Linked Professor / Coach " + em + " — they now get this Academy Homepage on login!");
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
      kind: "academy_photo", gymKey: activeKey, gymName: activeName,
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
    <div style={{ background:"#131924", border: isHomepage ? "1.5px solid #38bdf8" : "1px solid #2d3b52", borderRadius:"10px", padding:"14px", marginBottom:"16px", textAlign:"left" }}>
      {showTour && <GuidedTourModal mode="ACADEMY" onClose={() => setShowTour(false)} />}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap", marginBottom:"10px" }}>
        <div>
          {isHomepage && <div style={{ color:"#38bdf8", fontSize:"0.72rem", fontWeight:"800", letterSpacing:"1px" }}>🥋 ACADEMY PRO HOMEPAGE • {activeName.toUpperCase()}</div>}
          <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginTop: isHomepage ? "6px" : 0 }}>
            <button data-tour="acad-clipboard" type="button" onClick={() => setSub("CLIPBOARD")} style={{ padding:"6px 10px", borderRadius:"6px", fontWeight:"800", fontSize:"0.76rem", cursor:"pointer", background: sub==="CLIPBOARD" ? "#38bdf8" : "#1c2434", color: sub==="CLIPBOARD" ? "#000" : "#cbd5e1", border:"none" }}>📋 Coach Mat Clipboard ({roster.length})</button>
            <button data-tour="acad-album" type="button" onClick={() => setSub("ALBUM")} style={{ padding:"6px 10px", borderRadius:"6px", fontWeight:"800", fontSize:"0.76rem", cursor:"pointer", background: sub==="ALBUM" ? "#ff9f43" : "#1c2434", color: sub==="ALBUM" ? "#000" : "#cbd5e1", border:"none" }}>📸 Team Podium Album ({photos.length})</button>
            <button data-tour="acad-staff" type="button" onClick={() => setSub("STAFF")} style={{ padding:"6px 10px", borderRadius:"6px", fontWeight:"800", fontSize:"0.76rem", cursor:"pointer", background: sub==="STAFF" ? "#2ecc71" : "#1c2434", color: sub==="STAFF" ? "#000" : "#cbd5e1", border:"none" }}>👥 Coaches &amp; Staff</button>
          </div>
        </div>
        <button type="button" onClick={() => setShowTour(true)} style={{ padding:"5px 9px", borderRadius:"6px", background:"#1e293b", color:"#93c5fd", border:"1px solid #334155", fontSize:"0.73rem", fontWeight:"bold", cursor:"pointer" }}>❓ Spotlight Guide</button>
      </div>

      {msg && <div style={{ background:"#132a1c", border:"1px solid #2ecc71", color:"#4ade80", padding:"6px 10px", borderRadius:"6px", fontSize:"0.78rem", fontWeight:"bold", marginBottom:"8px" }}>{msg}</div>}

      {sub === "ALBUM" && (
        <div>
          <form onSubmit={submitPhoto} style={{ background:"#182030", border:"1px solid #2d3748", borderRadius:"8px", padding:"10px", marginBottom:"10px", display:"grid", gap:"7px" }}>
            <div style={{ fontSize:"0.78rem", color:"#fcd34d", fontWeight:"bold" }}>📸 Drop a Podium / Tournament Photo for {activeName}&apos;s Coaches:</div>
            <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
              <input required placeholder="Athlete Name(s)" value={upForm.athlete} onChange={e => setUpForm({...upForm, athlete: e.target.value})} style={{ ...inp, flex:"1 1 130px" }} />
              <input required placeholder="Tournament Name" value={upForm.eventName} onChange={e => setUpForm({...upForm, eventName: e.target.value})} style={{ ...inp, flex:"1 1 140px" }} />
              <select value={upForm.medal} onChange={e => setUpForm({...upForm, medal: e.target.value})} style={inp}>
                {["🥇 Gold","🥈 Silver","🥉 Bronze","🥋 Team / Action"].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input placeholder="@instagram" value={upForm.insta} onFocus={() => { if (!upForm.insta) setUpForm(f => ({...f, insta: "@"})); }} onChange={e => { const v = e.target.value; setUpForm({...upForm, insta: v ? ("@" + v.replace(/^@+/, "")) : ""}); }} style={{ ...inp, flex:"1 1 115px" }} />
            </div>
            <div style={{ display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap" }}>
              <input type="file" accept="image/*" onChange={onPickPhoto} style={{ fontSize:"0.76rem", color:"#cbd5e1", flex:1 }} />
              <button type="submit" disabled={uploading} style={{ background:"#ff9f43", color:"#000", border:"none", borderRadius:"6px", padding:"7px 12px", fontWeight:"800", fontSize:"0.78rem", cursor:"pointer" }}>{uploading ? "Uploading..." : "➕ Add Photo"}</button>
            </div>
          </form>
          {photos.length === 0 ? <div style={{ color:"#94a3b8", fontSize:"0.78rem" }}>No podium photos dropped yet — athletes &amp; parents can upload photos right here so Professors never have to text for pictures!</div> : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))", gap:"8px" }}>
              {photos.map(ph => (
                <div key={ph.id} style={{ background:"#182030", border:"1px solid #334155", borderRadius:"8px", overflow:"hidden" }}>
                  <img src={ph.photoData} alt={ph.athlete} style={{ width:"100%", height:"130px", objectFit:"cover", display:"block" }} />
                  <div style={{ padding:"7px" }}>
                    <div style={{ fontWeight:"bold", fontSize:"0.77rem", color:"#fff" }}>{ph.medal.split(" ")[0]} {ph.athlete}</div>
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

      {sub === "CLIPBOARD" && (
        <div style={{ display:"grid", gap:"6px" }}>
          <div style={{ fontSize:"0.78rem", color:"#93c5fd", fontWeight:"bold" }}>📋 Upcoming Registered Squad ({roster.length} entries):</div>
          {roster.length === 0 ? <div style={{ color:"#94a3b8", fontSize:"0.78rem" }}>No upcoming bracket registrations indexed right now — populates automatically as your students register!</div> : roster.slice(0, 25).map((r, i) => (
            <div key={i} style={{ background:"#182030", padding:"7px 10px", borderRadius:"6px", display:"flex", justifyContent:"space-between", gap:"8px", fontSize:"0.78rem" }}>
              <span><b style={{ color:"#fff" }}>{r.n}</b> — <span style={{ color:"#cbd5e1" }}>{r.d}</span></span>
              <span style={{ color:"#4ade80", fontWeight:"bold", flexShrink:0 }}>Mat Watch Ready</span>
            </div>
          ))}
        </div>
      )}

      {sub === "STAFF" && (
        <div>
          {!ws ? (
            <button type="button" onClick={claimAcademy} style={{ background:"#2ecc71", color:"#000", border:"none", borderRadius:"6px", padding:"8px 14px", fontWeight:"800", fontSize:"0.78rem", cursor:"pointer" }}>🥋 Claim {activeName} &amp; Add Coaches</button>
          ) : (
            <div style={{ display:"grid", gap:"8px" }}>
              <div style={{ fontSize:"0.79rem", color:"#4ade80", fontWeight:"bold" }}>✓ Linked Professors &amp; Coaches ({(ws.staffEmails || []).length}):</div>
              <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                {(ws.staffEmails || []).map((em, i) => <span key={i} style={{ background:"#111622", border:"1px solid #334155", borderRadius:"5px", padding:"3px 8px", fontSize:"0.74rem", color:"#cbd5e1" }}>🥋 {em}</span>)}
              </div>
              <form onSubmit={addCoachStaff} style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                <input required type="email" placeholder="Add Co-Professor / Coach email..." value={staffInput} onChange={e => setStaffInput(e.target.value)} style={{ ...inp, flex:1 }} />
                <button type="submit" style={{ background:"#38bdf8", color:"#000", border:"none", borderRadius:"6px", padding:"7px 12px", fontWeight:"800", fontSize:"0.76rem", cursor:"pointer" }}>+ Add Coach</button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 🏟️ Logged-In Promoter Homepage Command Bar (Matchmakers, Athlete Pre-Fight Check-Ins, Tickets/VIP Tables, Official Info & Staff!)
export function PromoterHomeDashboard({ events, user }) {
  const [ws, setWs] = useState(null);
  const [orgName, setOrgName] = useState("");
  const [tab, setTab] = useState("ROSTER");
  const [pool, setPool] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [sales, setSales] = useState([]);
  const [cardId, setCardId] = useState(events?.[0]?.id || "");
  const [cfg, setCfg] = useState({ ticketUrl: "", gaLabel: "", vipTableLabel: "", weighInInfo: "", cornerInfo: "", bookedRoster: [] });
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
    getDocs(query(collection(db, "mat_watches"), where("kind", "==", "athlete_bio"))).then(sn => setPool(sn.docs.map(d => d.data()).filter(x => x.openSf && x.name))).catch(() => {});
    getDocs(query(collection(db, "mat_watches"), where("kind", "==", "fighter_checkin"))).then(sn => setCheckins(sn.docs.map(d => d.data()))).catch(() => {});
    getDocs(query(collection(db, "mat_watches"), where("kind", "==", "ticket_referral"))).then(sn => setSales(sn.docs.map(d => d.data()))).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!cardId) return;
    getDoc(doc(db, "mat_watches", "prom_cfg_" + cardId)).then(d => {
      if (d.exists()) setCfg(prev => ({ ...prev, ...d.data(), bookedRoster: d.data().bookedRoster || [] }));
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
            <button data-tour="prom-matchmaker" type="button" onClick={() => setTab("MATCHMAKER")} style={{ padding:"6px 10px", borderRadius:"6px", fontWeight:"800", fontSize:"0.76rem", cursor:"pointer", background: tab==="MATCHMAKER" ? "#f59e0b" : "#182430", color: tab==="MATCHMAKER" ? "#000" : "#cbd5e1", border:"none" }}>⚡ Matchmaker DB ({pool.length})</button>
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
        <div style={{ display:"grid", gap:"6px" }}>
          {pool.length === 0 ? <div style={{ color:"#94a3b8", fontSize:"0.8rem" }}>Athletes who check &quot;Open for SuperFights&quot; in their Trophy Room Bio appear here automatically!</div> : pool.map((a, i) => (
            <div key={i} style={{ background:"#16202c", padding:"8px 10px", borderRadius:"6px", display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:"0.8rem" }}>
              <span><b>{a.name}</b> {a.belt ? "• " + a.belt : ""} {a.age ? "• Age " + a.age : ""}</span>
              {a.handle && <a href={"https://instagram.com/" + a.handle} target="_blank" rel="noreferrer" style={{ background:"#38bdf8", color:"#000", padding:"4px 9px", borderRadius:"5px", fontWeight:"800", textDecoration:"none", fontSize:"0.74rem" }}>DM @{a.handle}</a>}
            </div>
          ))}
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
