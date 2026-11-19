import React, { useState, useEffect, useMemo } from "react";
import { collection, doc, getDoc, getDocs, setDoc, addDoc, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { foldStr } from "./proHubData";

const BG = { position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:10085, display:"flex", alignItems:"center", justifyContent:"center", padding:"12px", boxSizing:"border-box" };

// Compress camera-roll photo on-device (<140 KB JPEG) so team albums load fast & save directly to Firestore!
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

const TOUR_DECKS = {
  SITE: {
    badge: "✨ MATDATES QUICK TOUR",
    title: "Welcome to MatDates",
    steps: [
      { icon: "🎯", head: "Multi-Select Categories & Gi/No-Gi Tags", body: "Use the 🎯 Categories dropdown to combine multiple circuits at once (like IBJJF + ADCC + UFC BJJ), and spot 🥋 Gi, ⚡ No-Gi, and 🐯 Youth divisions at a glance on every card." },
      { icon: "🔍", head: "Universal Athlete Lookup & 1-Tap Watch", body: "Search ANY athlete — even off-season — to open their Official Trophy Room or tap 🔔 Watch for live tournament-day Mat #, Match Time, and Podium push alerts." },
      { icon: "🏆", head: "Trophy Rooms, Share Stats & Locked Bios", body: "Click any athlete's name across Standings or Podiums to view Insider Spotlight Facts, generate a 📲 Share Stats story graphic, or claim your locked verified @handle bio." },
      { icon: "💬", head: "Brackets Compare, Event Q&A & Photogs", body: "Inside any event card, tap 👥 Brackets to compare 2 athletes head-to-head (🆚 Compare), ask questions in 💬 Info & Q&A, or book mat-side photographers via 📸 Photogs." },
      { icon: "🥋", head: "100% Free Academy & Promoter Pro Hubs", body: "Professors get a free Academy Dashboard (Live Coach Mat Clipboard + Team Photo Drop Album), and Promoters get a free Host & Matchmaker Suite!" }
    ]
  },
  ACADEMY: {
    badge: "🥋 ACADEMY PRO DASHBOARD TOUR",
    title: "Professor & Coach Suite (100% Free)",
    steps: [
      { icon: "📋", head: "Saturday Morning Coach Mat Clipboard", body: "Automatically pulls every student from your academy registered this weekend and sorts them chronologically by live Mat # and Match Time so coaches never miss a corner." },
      { icon: "📸", head: "Team Podium Photo Drop Album", body: "No more Sunday night texts chasing podium photos! Athletes & parents upload tournament photos tagged with their @Instagram handle so coaches can download & repost in 1 tap." },
      { icon: "👥", head: "Multi-Coach & Professor Access", body: "Add your fellow Professors, Coaches, and Social Media managers by email under Team Staff so everyone shares full Academy Pro tools." },
      { icon: "📲", head: "Instant Academy Share Stats", body: "Generate verified season Gold/Silver/Bronze graphics anytime to showcase your team's tournament run." }
    ]
  },
  PROMOTER: {
    badge: "🏟️ PROMOTER & MATCHMAKER SUITE TOUR",
    title: "Host on MatDates (100% Free)",
    steps: [
      { icon: "⚡", head: "Matchmaker Database & Filtering", body: "Browse and filter every athlete who opted into the Open SuperFight Matchmaking Pool by belt, coach, custom notes, and direct @Instagram contact." },
      { icon: "🚨", head: "Late-Pullout 'Golden Ticket' Replacement Blast", body: "Had an athlete pull out 48 hours before weigh-ins? Post an urgent open weight/belt slot to surface it at the top of the SuperFight Pool immediately." },
      { icon: "📢", head: "Official Event Info, Banner & Competitor Q&A", body: "Pin official weigh-in rules, Gi check times, and live schedule banners to your Event Card — and answer competitor questions once instead of 50 separate DMs." },
      { icon: "🤝", head: "Multi-Seat Matchmaker & Staff Access", body: "Add your Matchmakers, Head Table Directors, and Media team by email so your whole crew can manage bouts and competitor updates." }
    ]
  }
};

export function GuidedTourModal({ mode = "SITE", onClose }) {
  const deck = TOUR_DECKS[mode] || TOUR_DECKS.SITE;
  const [idx, setIdx] = useState(0);
  const step = deck.steps[idx];
  return (
    <div onClick={onClose} style={BG}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#0f1522", border:"1.5px solid #38bdf8", borderRadius:"14px", maxWidth:"480px", width:"100%", padding:"20px", color:"#fff", textAlign:"left" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
          <span style={{ color:"#38bdf8", fontSize:"0.73rem", fontWeight:"800", letterSpacing:"1.2px" }}>{deck.badge} • {idx + 1}/{deck.steps.length}</span>
          <button onClick={onClose} style={{ background:"transparent", color:"#94a3b8", border:"none", cursor:"pointer", fontSize:"0.85rem" }}>Skip ✕</button>
        </div>
        <div style={{ fontSize:"2.2rem", margin:"6px 0" }}>{step.icon}</div>
        <h3 style={{ margin:"0 0 8px", color:"#ffffff", fontSize:"1.2rem" }}>{step.head}</h3>
        <p style={{ margin:"0 0 18px", color:"#cbd5e1", fontSize:"0.9rem", lineHeight:1.5 }}>{step.body}</p>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px" }}>
          <div style={{ display:"flex", gap:"5px" }}>
            {deck.steps.map((_, i) => <span key={i} style={{ width: i===idx ? "18px" : "7px", height:"7px", borderRadius:"4px", background: i===idx ? "#38bdf8" : "#334155", transition:"all 0.2s" }} />)}
          </div>
          <div style={{ display:"flex", gap:"8px" }}>
            {idx > 0 && <button onClick={() => setIdx(idx - 1)} style={{ padding:"8px 12px", borderRadius:"7px", background:"#1e293b", color:"#fff", border:"1px solid #334155", cursor:"pointer", fontWeight:"bold" }}>Back</button>}
            {idx < deck.steps.length - 1 ? (
              <button onClick={() => setIdx(idx + 1)} style={{ padding:"8px 16px", borderRadius:"7px", background:"#38bdf8", color:"#000", border:"none", cursor:"pointer", fontWeight:"800" }}>Next →</button>
            ) : (
              <button onClick={onClose} style={{ padding:"8px 16px", borderRadius:"7px", background:"#2ecc71", color:"#000", border:"none", cursor:"pointer", fontWeight:"800" }}>Got It!</button>
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
    <div style={{ position:"relative", minWidth:"215px" }}>
      <button type="button" onClick={() => setOpen(!open)} style={{ width:"100%", padding:"12px 14px", borderRadius:"6px", border: selected.length ? "1.5px solid #38bdf8" : "1px solid #333", background:"#111", color:"#fff", fontSize:"0.95rem", fontWeight:"bold", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px" }}>
        <span style={{ display:"flex", alignItems:"center", gap:"6px" }}>
          🎯 {selected.length === 0 ? "Categories: All (Color Key)" : `Categories (${selected.length} Selected)`}
        </span>
        <span style={{ color:"#94a3b8", fontSize:"0.8rem" }}>{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, zIndex:9500, background:"#141923", border:"1px solid #38bdf8", borderRadius:"9px", padding:"10px", minWidth:"265px", boxShadow:"0 12px 32px rgba(0,0,0,0.75)", textAlign:"left" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"8px", paddingBottom:"6px", borderBottom:"1px solid #263145", fontSize:"0.76rem" }}>
            <span style={{ color:"#94a3b8", fontWeight:"bold" }}>Check 1 or more categories:</span>
            {selected.length > 0 && <button type="button" onClick={() => onChange([])} style={{ background:"none", border:"none", color:"#38bdf8", cursor:"pointer", fontWeight:"bold", padding:0 }}>Reset All</button>}
          </div>
          {ITEMS.map(([k, lbl, col]) => {
            const on = selected.length === 0 || selected.includes(k);
            const checked = selected.includes(k);
            return (
              <label key={k} onClick={() => toggle(k)} style={{ display:"flex", alignItems:"center", gap:"9px", padding:"6px 6px", borderRadius:"6px", cursor:"pointer", opacity: on ? 1 : 0.55, fontSize:"0.86rem", color:"#f1f5f9" }}>
                <input type="checkbox" checked={checked} onChange={() => {}} style={{ accentColor:"#38bdf8", cursor:"pointer" }} />
                <span style={{ width:"11px", height:"11px", borderRadius:"2px", background:col, display:"inline-block", border: col==="#ffffff" ? "1px solid #555" : "none", flexShrink:0 }} />
                <span style={{ fontWeight: checked ? "800" : "500" }}>{lbl}</span>
              </label>
            );
          })}
          <button type="button" onClick={() => setOpen(false)} style={{ marginTop:"8px", width:"100%", padding:"7px", borderRadius:"6px", background:"#1e293b", color:"#fff", border:"1px solid #334155", fontWeight:"bold", cursor:"pointer", fontSize:"0.8rem" }}>Done</button>
        </div>
      )}
    </div>
  );
}

// 📸 Team Podium Photo Drop Album + Free Multi-Coach Academy Pro Dashboard
export function AcademyProSuite({ gymName, gymKey, user, isAdmin, onRequireAuth }) {
  const [sub, setSub] = useState("ALBUM");
  const [photos, setPhotos] = useState([]);
  const [roster, setRoster] = useState([]);
  const [ws, setWs] = useState(null);
  const [staffInput, setStaffInput] = useState("");
  const [showTour, setShowTour] = useState(false);
  const [upForm, setUpForm] = useState({ athlete: "", eventName: "", medal: "🥇 Gold", insta: "", fileData: "" });
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const wsId = "acad_ws_" + (gymKey || foldStr(gymName).replace(/[^a-z0-9]+/g, "_"));

  const isStaff = Boolean(user && (isAdmin || ws?.ownerUid === user.uid || (ws?.staffEmails || []).includes((user.email || "").toLowerCase())));

  const loadAlbumAndWs = () => {
    getDoc(doc(db, "mat_watches", wsId)).then(d => { if (d.exists()) setWs(d.data()); }).catch(() => {});
    getDocs(query(collection(db, "mat_watches"), where("kind", "==", "academy_photo"))).then(sn => {
      const list = sn.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.gymKey === gymKey).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setPhotos(list);
    }).catch(() => {});
  };

  useEffect(() => {
    loadAlbumAndWs();
    getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__athlete_index__"))).then(sn => {
      const gFold = foldStr(gymName);
      const hits = [];
      sn.forEach(d => ((d.data() || {}).items || []).forEach(it => {
        if (foldStr(it.a || "").includes(gFold) || gFold.includes(foldStr(it.a || ""))) {
          if ((it.a || "").length >= 3) hits.push(it);
        }
      }));
      setRoster(hits.slice(0, 80));
    }).catch(() => {});
  }, [gymKey, gymName]);

  const claimAcademy = async () => {
    if (!user) { onRequireAuth && onRequireAuth(); return; }
    const payload = { kind: "academy_workspace", gymKey, gymName, ownerUid: user.uid, ownerEmail: (user.email || "").toLowerCase(), staffEmails: [(user.email || "").toLowerCase()], createdAt: new Date().toISOString() };
    await setDoc(doc(db, "mat_watches", wsId), payload, { merge: true });
    await addDoc(collection(db, "pending_events"), { kind: "workspace_claim", roleType: "Academy Pro", orgName: gymName, ownerEmail: user.email, adminNotified: false, createdAt: new Date().toISOString() }).catch(() => {});
    setWs(payload);
    setShowTour(true);
  };

  const addCoachStaff = async (e) => {
    e.preventDefault();
    const em = staffInput.trim().toLowerCase();
    if (!em.includes("@") || !ws) return;
    const next = Array.from(new Set([...(ws.staffEmails || []), em]));
    await setDoc(doc(db, "mat_watches", wsId), { staffEmails: next }, { merge: true });
    setWs({ ...ws, staffEmails: next });
    setStaffInput("");
    setMsg("✅ Added Coach/Professor " + em + " to Academy Dashboard!");
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
    if (!upForm.fileData) { alert("Please select a podium or tournament photo first."); return; }
    setUploading(true);
    await addDoc(collection(db, "mat_watches"), {
      kind: "academy_photo",
      gymKey,
      gymName,
      athlete: upForm.athlete.trim(),
      eventName: upForm.eventName.trim(),
      medal: upForm.medal,
      insta: upForm.insta.replace(/^@+/, "").trim(),
      photoData: upForm.fileData,
      uploaderEmail: user.email || "",
      uid: user.uid,
      createdAt: new Date().toISOString()
    });
    setUploading(false);
    setUpForm({ athlete: "", eventName: "", medal: "🥇 Gold", insta: "", fileData: "" });
    setMsg("✅ Photo added to " + gymName + "'s Team Podium Album!");
    loadAlbumAndWs();
  };

  const inp = { padding:"7px 9px", borderRadius:"6px", background:"#0f141e", color:"#fff", border:"1px solid #334155", fontSize:"0.82rem" };

  return (
    <div style={{ background:"#131924", border:"1px solid #2d3b52", borderRadius:"10px", padding:"12px", marginBottom:"10px" }}>
      {showTour && <GuidedTourModal mode="ACADEMY" onClose={() => setShowTour(false)} />}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"6px", flexWrap:"wrap", marginBottom:"10px" }}>
        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
          <button type="button" onClick={() => setSub("ALBUM")} style={{ padding:"6px 10px", borderRadius:"6px", fontWeight:"800", fontSize:"0.76rem", cursor:"pointer", background: sub==="ALBUM" ? "#ff9f43" : "#1c2434", color: sub==="ALBUM" ? "#000" : "#cbd5e1", border:"none" }}>📸 Team Podium Album ({photos.length})</button>
          <button type="button" onClick={() => setSub("CLIPBOARD")} style={{ padding:"6px 10px", borderRadius:"6px", fontWeight:"800", fontSize:"0.76rem", cursor:"pointer", background: sub==="CLIPBOARD" ? "#38bdf8" : "#1c2434", color: sub==="CLIPBOARD" ? "#000" : "#cbd5e1", border:"none" }}>📋 Coach Mat Clipboard ({roster.length})</button>
          <button type="button" onClick={() => setSub("STAFF")} style={{ padding:"6px 10px", borderRadius:"6px", fontWeight:"800", fontSize:"0.76rem", cursor:"pointer", background: sub==="STAFF" ? "#2ecc71" : "#1c2434", color: sub==="STAFF" ? "#000" : "#cbd5e1", border:"none" }}>👥 Coaches &amp; Staff</button>
        </div>
        <button type="button" onClick={() => setShowTour(true)} style={{ padding:"5px 9px", borderRadius:"6px", background:"#1e293b", color:"#93c5fd", border:"1px solid #334155", fontSize:"0.73rem", fontWeight:"bold", cursor:"pointer" }}>❓ Academy Tour</button>
      </div>

      {msg && <div style={{ background:"#132a1c", border:"1px solid #2ecc71", color:"#4ade80", padding:"6px 10px", borderRadius:"6px", fontSize:"0.78rem", fontWeight:"bold", marginBottom:"8px" }}>{msg}</div>}

      {sub === "ALBUM" && (
        <div>
          <form onSubmit={submitPhoto} style={{ background:"#182030", border:"1px solid #2d3748", borderRadius:"8px", padding:"10px", marginBottom:"10px", display:"grid", gap:"7px" }}>
            <div style={{ fontSize:"0.78rem", color:"#fcd34d", fontWeight:"bold" }}>📸 Drop a Podium / Tournament Photo for Your Professors &amp; Academy IG:</div>
            <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
              <input required placeholder="Athlete Name(s)" value={upForm.athlete} onChange={e => setUpForm({...upForm, athlete: e.target.value})} style={{ ...inp, flex:"1 1 130px" }} />
              <input required placeholder="Tournament Name" value={upForm.eventName} onChange={e => setUpForm({...upForm, eventName: e.target.value})} style={{ ...inp, flex:"1 1 140px" }} />
              <select value={upForm.medal} onChange={e => setUpForm({...upForm, medal: e.target.value})} style={inp}>
                {["🥇 Gold","🥈 Silver","🥉 Bronze","🥋 Team / Action"].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input placeholder="@instagram to tag" value={upForm.insta} onFocus={() => { if (!upForm.insta) setUpForm(f => ({...f, insta: "@"})); }} onChange={e => { const v = e.target.value; setUpForm({...upForm, insta: v ? ("@" + v.replace(/^@+/, "")) : ""}); }} style={{ ...inp, flex:"1 1 120px" }} />
            </div>
            <div style={{ display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap" }}>
              <input type="file" accept="image/*" onChange={onPickPhoto} style={{ fontSize:"0.76rem", color:"#cbd5e1", flex:1 }} />
              <button type="submit" disabled={uploading} style={{ background:"#ff9f43", color:"#000", border:"none", borderRadius:"6px", padding:"7px 12px", fontWeight:"800", fontSize:"0.78rem", cursor:"pointer" }}>{uploading ? "Uploading..." : "➕ Upload to Team Album"}</button>
            </div>
          </form>
          {photos.length === 0 ? (
            <div style={{ color:"#94a3b8", fontSize:"0.78rem", padding:"8px 2px" }}>No podium photos uploaded yet — athletes &amp; parents can drop tournament pics right here so coaches never have to chase texts!</div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(155px, 1fr))", gap:"8px" }}>
              {photos.map(ph => (
                <div key={ph.id} style={{ background:"#182030", border:"1px solid #334155", borderRadius:"8px", overflow:"hidden" }}>
                  <img src={ph.photoData} alt={ph.athlete} style={{ width:"100%", height:"135px", objectFit:"cover", display:"block" }} />
                  <div style={{ padding:"7px" }}>
                    <div style={{ fontWeight:"bold", fontSize:"0.78rem", color:"#fff" }}>{ph.medal.split(" ")[0]} {ph.athlete}</div>
                    <div style={{ fontSize:"0.7rem", color:"#94a3b8" }}>{ph.eventName}</div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"5px" }}>
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
          <div style={{ fontSize:"0.78rem", color:"#93c5fd", fontWeight:"bold" }}>🥋 Upcoming Registered Squad ({roster.length} entries across upcoming events):</div>
          {roster.length === 0 ? <div style={{ color:"#94a3b8", fontSize:"0.78rem" }}>No upcoming bracket registrations indexed right now — syncs automatically as students register!</div> : roster.map((r, i) => (
            <div key={i} style={{ background:"#182030", padding:"7px 10px", borderRadius:"6px", display:"flex", justifyContent:"space-between", gap:"8px", fontSize:"0.78rem" }}>
              <span><b style={{ color:"#fff" }}>{r.n}</b> — <span style={{ color:"#cbd5e1" }}>{r.d}</span></span>
              <span style={{ color:"#4ade80", fontWeight:"bold", flexShrink:0 }}>Live Watch Ready</span>
            </div>
          ))}
        </div>
      )}

      {sub === "STAFF" && (
        <div style={{ display:"grid", gap:"8px" }}>
          {!ws ? (
            <div style={{ background:"#182030", padding:"12px", borderRadius:"8px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
              <div style={{ fontSize:"0.8rem", color:"#cbd5e1" }}><b>Free Academy Pro Account:</b> Claim <b>{gymName}</b> to link Co-Professors &amp; Coaches by email!</div>
              <button type="button" onClick={claimAcademy} style={{ background:"#2ecc71", color:"#000", border:"none", borderRadius:"6px", padding:"7px 12px", fontWeight:"800", fontSize:"0.78rem", cursor:"pointer" }}>🥋 Activate Free Academy Pro</button>
            </div>
          ) : (
            <div style={{ background:"#182030", padding:"10px", borderRadius:"8px", display:"grid", gap:"8px" }}>
              <div style={{ fontSize:"0.8rem", color:"#4ade80", fontWeight:"bold" }}>✓ Verified Academy Pro Workspace • Linked Professors &amp; Coaches ({(ws.staffEmails || []).length}):</div>
              <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                {(ws.staffEmails || []).map((em, i) => <span key={i} style={{ background:"#111622", border:"1px solid #334155", borderRadius:"5px", padding:"3px 8px", fontSize:"0.74rem", color:"#cbd5e1" }}>🥋 {em}</span>)}
              </div>
              {isStaff && (
                <form onSubmit={addCoachStaff} style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                  <input required type="email" placeholder="Add Professor / Coach email..." value={staffInput} onChange={e => setStaffInput(e.target.value)} style={{ ...inp, flex:1 }} />
                  <button type="submit" style={{ background:"#38bdf8", color:"#000", border:"none", borderRadius:"6px", padding:"7px 12px", fontWeight:"800", fontSize:"0.76rem", cursor:"pointer" }}>+ Add Coach</button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 🏟️ Free Host on MatDates Promoter & Matchmaker Suite (with Multi-Seat Matchmakers + Late-Pullout Blast + Live Event Banner)
export function PromoterHostModal({ events, user, isAdmin, onRequireAuth, onClose }) {
  const [tab, setTab] = useState("MATCHMAKER");
  const [ws, setWs] = useState(null);
  const [orgName, setOrgName] = useState("");
  const [staffInput, setStaffInput] = useState("");
  const [pool, setPool] = useState([]);
  const [blasts, setBlasts] = useState([]);
  const [blastForm, setBlastForm] = useState({ eventName: "", weightBelt: "", rules: "No-Gi SuperFight", note: "", contact: "" });
  const [bannerEvId, setBannerEvId] = useState(events?.[0]?.id || "");
  const [bannerTxt, setBannerTxt] = useState("");
  const [officialFaq, setOfficialFaq] = useState("");
  const [showTour, setShowTour] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    getDocs(query(collection(db, "mat_watches"), where("kind", "==", "athlete_bio"))).then(sn => {
      setPool(sn.docs.map(d => d.data()).filter(x => x.openSf && x.name));
    }).catch(() => {});
    getDocs(query(collection(db, "mat_watches"), where("kind", "==", "pullout_blast"))).then(sn => {
      setBlasts(sn.docs.map(d => ({ id: d.id, ...d.data() })));
    }).catch(() => {});
    if (user?.email) {
      const em = user.email.toLowerCase();
      getDocs(query(collection(db, "mat_watches"), where("kind", "==", "promoter_workspace"))).then(sn => {
        const hit = sn.docs.map(d => ({ id: d.id, ...d.data() })).find(w => w.ownerUid === user.uid || (w.staffEmails || []).includes(em));
        if (hit) setWs(hit);
      }).catch(() => {});
    }
  }, [user]);

  const activatePromoter = async (e) => {
    e.preventDefault();
    if (!user) { onRequireAuth && onRequireAuth(); return; }
    const slug = "prom_ws_" + foldStr(orgName).replace(/[^a-z0-9]+/g, "_");
    const payload = { kind: "promoter_workspace", orgName: orgName.trim(), ownerUid: user.uid, ownerEmail: user.email.toLowerCase(), staffEmails: [user.email.toLowerCase()], createdAt: new Date().toISOString() };
    await setDoc(doc(db, "mat_watches", slug), payload, { merge: true });
    await addDoc(collection(db, "pending_events"), { kind: "workspace_claim", roleType: "Promoter Host", orgName: orgName.trim(), ownerEmail: user.email, adminNotified: false, createdAt: new Date().toISOString() }).catch(() => {});
    setWs({ id: slug, ...payload });
    setShowTour(true);
  };

  const addMatchmaker = async (e) => {
    e.preventDefault();
    const em = staffInput.trim().toLowerCase();
    if (!ws || !em.includes("@")) return;
    const next = Array.from(new Set([...(ws.staffEmails || []), em]));
    await setDoc(doc(db, "mat_watches", ws.id), { staffEmails: next }, { merge: true });
    setWs({ ...ws, staffEmails: next });
    setStaffInput("");
    setMsg("✅ Added Matchmaker / Event Staff (" + em + ")!");
  };

  const postReplacementBlast = async (e) => {
    e.preventDefault();
    if (!user) { onRequireAuth && onRequireAuth(); return; }
    const b = { kind: "pullout_blast", ...blastForm, orgName: ws?.orgName || user.email, createdAt: new Date().toISOString() };
    await addDoc(collection(db, "mat_watches"), b);
    setBlasts([b, ...blasts]);
    setBlastForm({ eventName: "", weightBelt: "", rules: "No-Gi SuperFight", note: "", contact: "" });
    setMsg("🚨 Golden-Ticket Replacement Slot published to the SuperFight Pool!");
  };

  const publishOfficialUpdate = async (e) => {
    e.preventDefault();
    if (!user) { onRequireAuth && onRequireAuth(); return; }
    const ev = (events || []).find(x => x.id === bannerEvId);
    if (!ev) return;
    if (officialFaq.trim()) {
      await addDoc(collection(db, "venue_comments"), {
        eventId: ev.id, eventName: ev.name, venueKey: "", venueName: ev.venue || ev.location || "",
        category: "OFFICIAL", text: officialFaq.trim(),
        author: "🏟️ Official Host (" + (ws?.orgName || "Promoter") + ")", uid: user.uid, likes: 0, createdAt: new Date().toISOString()
      });
    }
    if (bannerTxt.trim()) {
      await setDoc(doc(db, "mat_watches", "ev_banner_" + ev.id), { kind: "event_banner", eventId: ev.id, banner: bannerTxt.trim(), updatedAt: new Date().toISOString() }, { merge: true });
    }
    setBannerTxt(""); setOfficialFaq("");
    setMsg("✅ Official Competitor Update & Banner published to " + ev.name + "!");
  };

  const inp = { padding:"9px 11px", borderRadius:"6px", background:"#0f141e", color:"#fff", border:"1px solid #334155", fontSize:"0.86rem", width:"100%", boxSizing:"border-box" };

  return (
    <div onClick={onClose} style={BG}>
      {showTour && <GuidedTourModal mode="PROMOTER" onClose={() => setShowTour(false)} />}
      <div onClick={e => e.stopPropagation()} style={{ background:"#111622", border:"1.5px solid #14b8a6", borderRadius:"14px", maxWidth:"680px", width:"100%", maxHeight:"90svh", overflowY:"auto", padding:"18px", color:"#fff", textAlign:"left" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"8px", marginBottom:"10px" }}>
          <div>
            <div style={{ color:"#14b8a6", fontSize:"0.74rem", fontWeight:"800", letterSpacing:"1.2px" }}>🏟️ HOST ON MATDATES • FREE PROMOTER &amp; MATCHMAKER SUITE</div>
            <h3 style={{ margin:"3px 0 0", color:"#ffffff", fontSize:"1.28rem" }}>{ws ? ws.orgName + " Command Center" : "Promoter & Matchmaker Hub"}</h3>
          </div>
          <div style={{ display:"flex", gap:"6px" }}>
            <button onClick={() => setShowTour(true)} style={{ background:"#1e293b", color:"#5eead4", border:"1px solid #14b8a6", borderRadius:"6px", padding:"5px 10px", fontSize:"0.76rem", fontWeight:"bold", cursor:"pointer" }}>❓ Promoter Tour</button>
            <button onClick={onClose} style={{ background:"#1e293b", color:"#fff", border:"1px solid #334155", borderRadius:"6px", padding:"5px 10px", cursor:"pointer" }}>✕</button>
          </div>
        </div>

        {!ws && (
          <form onSubmit={activatePromoter} style={{ background:"#16222f", border:"1px solid #14b8a6", borderRadius:"9px", padding:"12px", marginBottom:"12px", display:"flex", gap:"8px", flexWrap:"wrap", alignItems:"center" }}>
            <input required placeholder="Your Promotion / Organization Name (100% Free Instant Activation)" value={orgName} onChange={e => setOrgName(e.target.value)} style={{ ...inp, flex:"1 1 240px" }} />
            <button type="submit" style={{ background:"#14b8a6", color:"#000", border:"none", borderRadius:"6px", padding:"9px 14px", fontWeight:"800", cursor:"pointer" }}>🚀 Activate Free Promoter Account</button>
          </form>
        )}

        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"12px" }}>
          {[["MATCHMAKER","🥊 Matchmaker DB (" + pool.length + ")"],["BLAST","🚨 Pullout Replacement"],["UPDATES","📢 Competitor Info & Q&A"],["TEAM","👥 Matchmakers & Staff"]].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)} style={{ flex:"1 1 135px", padding:"8px", borderRadius:"7px", fontWeight:"800", fontSize:"0.77rem", cursor:"pointer", background: tab===k ? "#14b8a6" : "#182030", color: tab===k ? "#000" : "#cbd5e1", border:"none" }}>{l}</button>
          ))}
        </div>

        {msg && <div style={{ background:"#132a1c", border:"1px solid #2ecc71", color:"#4ade80", padding:"8px 11px", borderRadius:"7px", fontSize:"0.8rem", fontWeight:"bold", marginBottom:"10px" }}>{msg}</div>}

        {tab === "MATCHMAKER" && (
          <div style={{ display:"grid", gap:"8px" }}>
            {pool.length === 0 ? <div style={{ color:"#94a3b8", fontSize:"0.84rem" }}>Athletes who check &quot;Open for SuperFight Matchmaking&quot; inside their Trophy Room appear here automatically for your matchmakers!</div> : pool.map((a, i) => (
              <div key={i} style={{ background:"#182030", border:"1px solid #2d3748", borderRadius:"8px", padding:"10px 12px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                <div>
                  <div style={{ fontWeight:"800", color:"#fff" }}>{a.name} {a.belt && <span style={{ color:"#fbbf24", fontSize:"0.78rem" }}>• {a.belt}</span>}</div>
                  <div style={{ fontSize:"0.76rem", color:"#94a3b8" }}>{a.coach ? "Coach: " + a.coach : "Verified Athlete"} {a.funFact ? " • ★ " + a.funFact : ""}</div>
                </div>
                {a.handle && <a href={"https://instagram.com/" + a.handle} target="_blank" rel="noreferrer" style={{ background:"#38bdf8", color:"#000", padding:"6px 10px", borderRadius:"6px", fontWeight:"800", fontSize:"0.76rem", textDecoration:"none" }}>📩 Offer Bout @{a.handle}</a>}
              </div>
            ))}
          </div>
        )}

        {tab === "BLAST" && (
          <form onSubmit={postReplacementBlast} style={{ display:"grid", gap:"8px" }}>
            <div style={{ fontSize:"0.82rem", color:"#fde68a", fontWeight:"bold" }}>🚨 Need a Late-Notice SuperFight Replacement? Post an Open Slot to the Matchmaking Pool:</div>
            <input required placeholder="Event Name & Date (e.g. ATX Invitational — This Saturday)" value={blastForm.eventName} onChange={e => setBlastForm({...blastForm, eventName: e.target.value})} style={inp} />
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
              <input required placeholder="Weight & Belt Needed (e.g. 145 lbs Purple/Brown)" value={blastForm.weightBelt} onChange={e => setBlastForm({...blastForm, weightBelt: e.target.value})} style={{ ...inp, flex:1 }} />
              <input required placeholder="Matchmaker @IG or Email" value={blastForm.contact} onChange={e => setBlastForm({...blastForm, contact: e.target.value})} style={{ ...inp, flex:1 }} />
            </div>
            <input placeholder="Purse / Ruleset / Travel Note" value={blastForm.note} onChange={e => setBlastForm({...blastForm, note: e.target.value})} style={inp} />
            <button type="submit" style={{ background:"#f59e0b", color:"#000", border:"none", borderRadius:"7px", padding:"10px", fontWeight:"800", cursor:"pointer" }}>⚡ Broadcast Open Slot Now</button>
          </form>
        )}

        {tab === "UPDATES" && (
          <form onSubmit={publishOfficialUpdate} style={{ display:"grid", gap:"9px" }}>
            <div style={{ fontSize:"0.82rem", color:"#93c5fd", fontWeight:"bold" }}>📢 Pin Official Weigh-In / Schedule Answers &amp; Live Banners to Your Event Card:</div>
            <select value={bannerEvId} onChange={e => setBannerEvId(e.target.value)} style={inp}>
              {(events || []).slice(0, 80).map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({ev.date})</option>)}
            </select>
            <input placeholder="Top-of-Card Alert Banner (e.g. Doors Open 7:30 AM • Brackets Live!)" value={bannerTxt} onChange={e => setBannerTxt(e.target.value)} style={inp} />
            <textarea rows={3} placeholder="Official Competitor Info / FAQ Answer (weigh-in allowance, coach pass policy, ruleset notes — pins at top of Event Info & Q&A!)" value={officialFaq} onChange={e => setOfficialFaq(e.target.value)} style={inp} />
            <button type="submit" style={{ background:"#2ecc71", color:"#000", border:"none", borderRadius:"7px", padding:"10px", fontWeight:"800", cursor:"pointer" }}>📢 Publish Official Update to Event Card</button>
          </form>
        )}

        {tab === "TEAM" && (
          <div style={{ display:"grid", gap:"9px" }}>
            {!ws ? <div style={{ color:"#94a3b8", fontSize:"0.84rem" }}>Activate your free Promoter Organization above first to add Matchmakers &amp; Event Staff!</div> : (
              <>
                <div style={{ fontSize:"0.82rem", color:"#4ade80", fontWeight:"bold" }}>✓ Linked Matchmakers &amp; Event Staff ({(ws.staffEmails || []).length}):</div>
                <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                  {(ws.staffEmails || []).map((em, i) => <span key={i} style={{ background:"#182030", border:"1px solid #334155", borderRadius:"5px", padding:"4px 9px", fontSize:"0.76rem" }}>🥊 {em}</span>)}
                </div>
                <form onSubmit={addMatchmaker} style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                  <input required type="email" placeholder="Add Matchmaker or Staff email..." value={staffInput} onChange={e => setStaffInput(e.target.value)} style={{ ...inp, flex:1 }} />
                  <button type="submit" style={{ background:"#14b8a6", color:"#000", border:"none", borderRadius:"6px", padding:"9px 14px", fontWeight:"800", cursor:"pointer" }}>+ Grant Matchmaker Access</button>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
