import React, { useState, useEffect } from "react";
import { collection, doc, getDoc, getDocs, setDoc, query, where } from "firebase/firestore";
import { db, auth } from "./firebase";
import { addDoc } from "firebase/firestore";
import { PRO_SUPERFIGHTS, computeEliteSpotlight, foldStr, athBucket } from "./proHubData";

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

const IG_ICON = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" style={{ display:"block" }}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

export function AthleteTrophyRoomModal({ athlete, onClose, onWatch, isWatching, onShareCard }) {
  const nm = athlete?.name || athlete?.n || "";
  const slug = foldStr(nm).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const docKey = "bio_" + slug;
  const lsKey = "md_bio_" + slug;

  const [evs, setEvs] = useState(athlete?.events || []);
  const [cnt, setCnt] = useState({ g: athlete?.g || 0, s: athlete?.s || 0, b: athlete?.b || 0, acad: athlete?.academy || athlete?.a || "" });
  const [bio, setBio] = useState(() => {
    try { const raw = localStorage.getItem(lsKey); return raw ? JSON.parse(raw) : null; } catch { return null; }
  });
  const [igPrompt, setIgPrompt] = useState(false);
  const [editBio, setEditBio] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const [form, setForm] = useState({ handle: "", age: "", belt: "", coach: "", favMove: "", cheatMeal: "", funFact: "", openSf: false });

  useEffect(() => {
    if (!slug) return;
    getDoc(doc(db, "mat_watches", docKey)).then(d => {
      if (d.exists() && d.data()?.kind === "athlete_bio") {
        const bd = d.data();
        setBio(bd);
        setForm({ ...bd, handle: bd.handle ? "@" + bd.handle.replace(/^@+/, "") : "" });
        try { localStorage.setItem(lsKey, JSON.stringify(bd)); } catch {}
      }
    }).catch(() => {});
    if (evs.length > 0) return;
    getDocs(query(collection(db, "event_competitors"), where("event_id", "==", "__a2_" + athBucket(nm) + "__"))).then(sn => {
      const tgt = foldStr(nm), seen = new Set(), out = [];
      let g = 0, s = 0, b = 0, acad = cnt.acad;
      sn.forEach(d => ((d.data() || {}).items || []).forEach(it => {
        if (!foldStr(it.n).includes(tgt) && !tgt.includes(foldStr(it.n))) return;
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
  const curUser = auth.currentUser;
  const isLockedByOther = Boolean((bio?.ownerUid && (!curUser || bio.ownerUid !== curUser.uid)) || (elite.pro && !curUser));
  const bioUrl = "https://matdates.com/?trophy=" + encodeURIComponent(nm).replace(/%20/g, "+");

  const startClaimFlow = () => {
    if (!curUser) {
      alert("Please Sign In first (top right of MatDates) so your Instagram link & Athlete Bio lock permanently to your account!");
      return;
    }
    if (bio?.ownerUid && bio.ownerUid !== curUser.uid) {
      const email = curUser.email || "";
      addDoc(collection(db, "pending_events"), {
        kind: "bio_dispute", name: "Bio Verification Request: " + nm, requesterEmail: email, athleteSlug: slug, adminNotified: false, createdAt: new Date().toISOString()
      }).catch(() => {});
      alert("This profile is already claimed & locked. We sent an ownership verification request to MatDates Admin for you!");
      return;
    }
    if (bio) setForm({ ...bio, handle: bio.handle ? "@" + bio.handle.replace(/^@+/, "") : "" });
    setIgPrompt(false);
    setEditBio(true);
  };

  const handleInstagramClick = () => {
    if (bio?.handle) {
      window.open("https://instagram.com/" + bio.handle.replace(/^@+/, ""), "_blank", "noopener,noreferrer");
    } else {
      setIgPrompt(prev => !prev);
    }
  };

  const saveBio = async (e) => {
    e.preventDefault();
    if (!curUser) { alert("Please Sign In first to lock your Athlete Bio!"); return; }
    if (bio?.ownerUid && bio.ownerUid !== curUser.uid) { alert("This bio is locked to its verified owner."); return; }
    setSaving(true);
    const clean = {
      kind: "athlete_bio",
      status: "bio_only",
      ownerUid: bio?.ownerUid || curUser.uid,
      ownerEmail: bio?.ownerEmail || curUser.email || "",
      handle: (form.handle || "").replace(/^@+/, "").trim(),
      age: (form.age || "").trim(),
      belt: (form.belt || "").trim(),
      coach: (form.coach || "").trim(),
      favMove: (form.favMove || "").trim(),
      cheatMeal: (form.cheatMeal || "").trim(),
      funFact: (form.funFact || "").trim(),
      openSf: Boolean(form.openSf),
      name: nm,
      updatedAt: new Date().toISOString()
    };
    try { localStorage.setItem(lsKey, JSON.stringify(clean)); } catch {}
    try { await setDoc(doc(db, "mat_watches", docKey), clean, { merge: true }); } catch {}
    setBio(clean);
    setSaving(false);
    setEditBio(false);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  const hasBioDetails = Boolean(bio && (bio.age || bio.belt || bio.coach || bio.favMove || bio.cheatMeal || bio.openSf));
  const inp = { padding:"8px 10px", borderRadius:"6px", background:"#0f141e", color:"#fff", border:"1px solid #334155", fontSize:"0.83rem", boxSizing:"border-box" };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:10070, display:"flex", alignItems:"center", justifyContent:"center", padding:"12px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#0f141e", border:"1.5px solid #f59e0b", borderRadius:"14px", maxWidth:"650px", width:"100%", maxHeight:"90svh", overflowY:"auto", padding:"18px", textAlign:"left", color:"#fff" }}>

        {/* 1. PROFILE HEADER FIRST + INLINE INSTAGRAM BUTTON */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"8px" }}>
          <div>
            <div style={{ color:"#fbbf24", fontSize:"0.73rem", fontWeight:"800", letterSpacing:"1.4px" }}>🏆 MATDATES OFFICIAL TROPHY ROOM</div>
            <div style={{ display:"flex", alignItems:"center", gap:"9px", flexWrap:"wrap", margin:"4px 0" }}>
              <h2 style={{ margin:0, fontSize:"1.48rem", color:"#ffffff", fontWeight:"900" }}>{nm}</h2>
              <button
                type="button"
                onClick={handleInstagramClick}
                title={bio?.handle ? "Follow @" + bio.handle + " on Instagram" : "Instagram profile not linked yet — click to claim"}
                style={{
                  display:"inline-flex", alignItems:"center", gap:"5px",
                  background: bio?.handle ? "linear-gradient(135deg,#f58529,#dd2a7b,#8134af)" : "#1e293b",
                  color:"#ffffff", border: bio?.handle ? "none" : "1px solid #475569",
                  borderRadius:"7px", padding:"5px 9px", cursor:"pointer", fontWeight:"800", fontSize:"0.75rem"
                }}
              >
                {IG_ICON}
                {bio?.handle ? "@" + bio.handle : "IG"}
              </button>
              {bio?.openSf && <span style={{ background:"#132a1c", color:"#4ade80", border:"1px solid #22c55e", padding:"3px 8px", borderRadius:"5px", fontSize:"0.72rem", fontWeight:"bold" }}>🥊 Open for SuperFights</span>}
            </div>
            <div style={{ color:"#ff9f43", fontSize:"0.85rem", fontWeight:"bold" }}>
              {cnt.acad || elite.pro?.academy || "Independent"}
              {(bio?.belt || elite.pro?.belt) ? " • " + (bio?.belt || elite.pro?.belt) : ""}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"#1e293b", color:"#fff", border:"1px solid #334155", borderRadius:"6px", padding:"4px 10px", height:"32px", cursor:"pointer" }}>✕</button>
        </div>

        {/* Unclaimed Instagram Popover Notice */}
        {igPrompt && !bio?.handle && (
          <div style={{ marginTop:"10px", background:"#161f30", border:"1px solid #38bdf8", borderRadius:"9px", padding:"10px 12px", fontSize:"0.81rem", color:"#e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
            <span>📸 This athlete&apos;s Instagram hasn&apos;t been linked yet. <b>Are you {nm}?</b></span>
            <button type="button" onClick={startClaimFlow} style={{ background:"#38bdf8", color:"#000", border:"none", borderRadius:"6px", padding:"5px 10px", fontWeight:"800", fontSize:"0.76rem", cursor:"pointer" }}>
              🔒 Claim &amp; Lock Instagram Link
            </button>
          </div>
        )}

        {savedBanner && (
          <div style={{ marginTop:"10px", background:"#132a1c", border:"1px solid #2ecc71", color:"#4ade80", padding:"8px 12px", borderRadius:"7px", fontSize:"0.82rem", fontWeight:"bold" }}>
            ✅ Verified Athlete Profile &amp; Instagram Locked!
          </div>
        )}

        {/* Action Strip (Clean: Medals + Watch + Share Stats ONLY — Link-in-Bio & Claim Bio buttons removed!) */}
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", alignItems:"center", margin:"12px 0" }}>
          <div style={{ background:"#18202f", border:"1px solid #2d3748", borderRadius:"8px", padding:"6px 11px", fontSize:"0.84rem" }}>
            🥇<b>{cnt.g}</b> 🥈<b>{cnt.s}</b> 🥉<b>{cnt.b}</b> • <b style={{ color:"#34d399" }}>{elite.pts} Pts</b>
          </div>
          <button type="button" onClick={() => onWatch(nm, cnt.acad || elite.pro?.academy || "")} style={{ background: isWatching ? "#132a1c" : "#162536", color: isWatching ? "#2ecc71" : "#38bdf8", border: isWatching ? "1px solid #2ecc71" : "1px solid #0284c7", borderRadius:"7px", padding:"6px 11px", fontWeight:"bold", fontSize:"0.77rem", cursor:"pointer" }}>
            {isWatching ? "✓ Watching" : "🔔 Watch"}
          </button>
          {onShareCard && (
            <button type="button" onClick={() => onShareCard({ badge: elite.isElite ? elite.tierLabel : "2026 OFFICIAL TROPHY ROOM", title: nm, subtitle: cnt.acad || elite.pro?.academy || "", gold: cnt.g, silver: cnt.s, bronze: cnt.b, deepLink: bioUrl, lines: [...(elite.pro?.titles || []), ...(elite.isElite ? elite.facts.map(x => "★ " + x) : []), ...evs.slice(0, 5).map(m => (Number(m.p)===1?"🥇":Number(m.p)===2?"🥈":"🥉") + " " + m.ev)] })} style={{ background:"#ff9f43", color:"#000", border:"none", borderRadius:"7px", padding:"6px 11px", fontWeight:"800", fontSize:"0.77rem", cursor:"pointer" }}>
              📲 Share Stats
            </button>
          )}
        </div>

        {/* 2. ATHLETE BIO SECTION (Profile First!) */}
        <div style={{ background:"#141b28", border:"1px solid #283548", borderRadius:"10px", padding:"12px 13px", marginBottom:"12px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: hasBioDetails ? "8px" : 0 }}>
            <span style={{ color:"#93c5fd", fontWeight:"800", fontSize:"0.76rem", letterSpacing:"0.8px" }}>🪪 ATHLETE BIO</span>
            {hasBioDetails ? (
              !isLockedByOther ? (
                <button type="button" onClick={startClaimFlow} style={{ background:"none", border:"none", color:"#38bdf8", fontSize:"0.74rem", fontWeight:"bold", cursor:"pointer", padding:0 }}>Edit My Bio</button>
              ) : (
                <span onClick={startClaimFlow} title="Request ownership verification" style={{ color:"#64748b", fontSize:"0.71rem", cursor:"pointer" }}>🔒 Verified</span>
              )
            ) : (
              <button type="button" onClick={startClaimFlow} style={{ background:"none", border:"none", color:"#38bdf8", fontSize:"0.76rem", fontWeight:"bold", cursor:"pointer", textDecoration:"underline", padding:0 }}>
                Are you {nm}? Claim &amp; Lock Athlete Bio →
              </button>
            )}
          </div>
          {hasBioDetails ? (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(185px, 1fr))", gap:"7px", fontSize:"0.81rem" }}>
              {bio.age && <div style={{ background:"#0f141e", padding:"6px 9px", borderRadius:"6px" }}><span style={{ color:"#94a3b8" }}>🎂 Age:</span> <b>{bio.age}</b></div>}
              {bio.belt && <div style={{ background:"#0f141e", padding:"6px 9px", borderRadius:"6px" }}><span style={{ color:"#94a3b8" }}>🥋 Belt Rank:</span> <b>{bio.belt}</b></div>}
              {bio.coach && <div style={{ background:"#0f141e", padding:"6px 9px", borderRadius:"6px" }}><span style={{ color:"#94a3b8" }}>🏛️ Head Professor:</span> <b>{bio.coach}</b></div>}
              {bio.favMove && <div style={{ background:"#0f141e", padding:"6px 9px", borderRadius:"6px" }}><span style={{ color:"#94a3b8" }}>⚡ Go-To Move:</span> <b>{bio.favMove}</b></div>}
              {bio.cheatMeal && <div style={{ background:"#0f141e", padding:"6px 9px", borderRadius:"6px", gridColumn:"1 / -1" }}><span style={{ color:"#fbbf24" }}>🍕 Favorite Full Cheat Meal / Snack:</span> <b>{bio.cheatMeal}</b></div>}
            </div>
          ) : !editBio ? (
            <div style={{ color:"#64748b", fontSize:"0.78rem", marginTop:"4px" }}>
              Unclaimed profile — athletes can lock their @Instagram, belt rank, go-to submission &amp; favorite post-tourney cheat meal!
            </div>
          ) : null}

          {editBio && (
            <form onSubmit={saveBio} style={{ marginTop:"10px", paddingTop:"10px", borderTop:"1px solid #263346", display:"grid", gap:"8px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(145px, 1fr))", gap:"7px" }}>
                <input placeholder="Instagram @handle" value={form.handle || ""} onFocus={() => { if (!form.handle) setForm(f => ({...f, handle: "@"})); }} onChange={e => { const v = e.target.value; setForm({...form, handle: v ? ("@" + v.replace(/^@+/, "")) : ""}); }} style={inp} />
                <input placeholder="Age (Optional)" value={form.age || ""} onChange={e => setForm({...form, age: e.target.value})} style={inp} />
                <input placeholder="Belt Rank (Optional)" value={form.belt || ""} onChange={e => setForm({...form, belt: e.target.value})} style={inp} />
                <input placeholder="Head Professor / Coach" value={form.coach || ""} onChange={e => setForm({...form, coach: e.target.value})} style={inp} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:"7px" }}>
                <input placeholder="Go-To Submission or Guard (Optional)" value={form.favMove || ""} onChange={e => setForm({...form, favMove: e.target.value})} style={inp} />
                <input placeholder="Favorite FULL CHEAT Meal / Snack 🍕🍪 (Optional)" value={form.cheatMeal || ""} onChange={e => setForm({...form, cheatMeal: e.target.value})} style={inp} />
              </div>
              <input placeholder="Custom Fun Fact (Optional — pins to Insider Spotlight!)" value={form.funFact || ""} onChange={e => setForm({...form, funFact: e.target.value})} style={{ ...inp, width:"100%" }} />
              <label style={{ fontSize:"0.8rem", color:"#cbd5e1", display:"flex", alignItems:"center", gap:"6px" }}>
                <input type="checkbox" checked={Boolean(form.openSf)} onChange={e => setForm({...form, openSf: e.target.checked})} />
                <span>🥊 List me in the <b>Open SuperFight Matchmaking Pool</b></span>
              </label>
              <div style={{ display:"flex", gap:"8px" }}>
                <button type="submit" disabled={saving} style={{ flex:1, background:"#2ecc71", color:"#000", border:"none", borderRadius:"6px", padding:"9px", fontWeight:"800", cursor:"pointer" }}>
                  {saving ? "Locking Bio..." : "🔒 Save & Lock My Verified Bio"}
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

        {/* 4. EVENTS & PODIUMS FOLLOWING */}
        {elite.pro && (
          <div style={{ marginBottom:"12px" }}>
            <div style={{ color:"#fbbf24", fontWeight:"bold", fontSize:"0.8rem", marginBottom:"5px" }}>👑 PRO TITLES &amp; SUPERFIGHT VICTORIES</div>
            <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"6px" }}>{elite.pro.titles.map((t, i) => <span key={i} style={{ background:"#292011", color:"#fde68a", border:"1px solid #d97706", borderRadius:"5px", padding:"2px 8px", fontSize:"0.74rem", fontWeight:"bold" }}>{t}</span>)}</div>
            {elite.pro.bouts.map((b, i) => <div key={i} style={{ background:"#151b26", padding:"6px 9px", borderRadius:"6px", fontSize:"0.77rem", marginBottom:"4px" }}>🥊 <b>{b.ev}</b> — <b style={{ color:"#4ade80" }}>{b.res}</b> ({b.sub})</div>)}
          </div>
        )}

        <div style={{ color:"#93c5fd", fontWeight:"bold", fontSize:"0.8rem", marginBottom:"5px" }}>🏅 VERIFIED TOURNAMENT EVENTS &amp; PODIUMS ({evs.length})</div>
        <div style={{ display:"grid", gap:"5px" }}>
          {evs.length === 0 ? <div style={{ color:"#94a3b8", fontSize:"0.8rem" }}>Pro / Invitational profile active — bracket podiums sync automatically.</div> : evs.map((m, i) => (
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
