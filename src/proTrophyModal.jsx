import React, { useState, useEffect } from "react";
import { collection, doc, getDoc, getDocs, setDoc, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { PRO_SUPERFIGHTS, computeEliteSpotlight, foldStr, athBucket } from "./proHubData";

export function SuperFightsPanel({ fed, qStr, onOpenTrophy, onWatch, getWatch }) {
  const [extra, setExtra] = useState([]);
  useEffect(() => {
    getDocs(collection(db, "superfights")).then(sn => setExtra(sn.docs.map(d => d.data()))).catch(() => {});
  }, []);
  const q = foldStr(qStr).trim();
  const list = [...PRO_SUPERFIGHTS, ...extra].filter(p => {
    if (fed !== "ALL" && !(p.feds || []).includes(fed)) return false;
    if (!q) return true;
    const blob = foldStr([p.name, p.academy, ...(p.titles || []), ...(p.bouts || []).map(b => b.ev + " " + b.res)].join(" "));
    return blob.includes(q);
  });
  return (
    <div style={{ display:"grid", gap:"10px", textAlign:"left" }}>
      <div style={{ background:"linear-gradient(90deg,#1e1b4b,#172554)", border:"1px solid #6366f1", borderRadius:"8px", padding:"10px 12px", fontSize:"0.8rem", color:"#e0e7ff" }}>
        <strong>🥊 Verified SuperFights &amp; Major Championships</strong> — Tracking Pro Belts &amp; Invitational Headliners across <strong>UFC BJJ</strong>, <strong>ADCC Worlds</strong>, <strong>WNO</strong>, <strong>CJI</strong>, <strong>Polaris</strong> &amp; <strong>IBJJF Majors</strong>.
      </div>
      {list.map((p, i) => (
        <div key={i} style={{ background:"#181f2c", border:"1px solid #334155", borderRadius:"9px", padding:"12px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"8px", flexWrap:"wrap" }}>
            <div>
              <div style={{ color:"#fff", fontWeight:"800", fontSize:"1.02rem" }}>{p.name} <span style={{ color:"#fbbf24", fontSize:"0.75rem", marginLeft:"6px" }}>{p.rec}</span></div>
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
    </div>
  );
}

export function AthleteTrophyRoomModal({ athlete, onClose, onWatch, isWatching, onShareCard }) {
  const nm = athlete?.name || athlete?.n || "";
  const slug = foldStr(nm).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const [evs, setEvs] = useState(athlete?.events || []);
  const [cnt, setCnt] = useState({ g: athlete?.g || 0, s: athlete?.s || 0, b: athlete?.b || 0, acad: athlete?.academy || athlete?.a || "" });
  const [bio, setBio] = useState(null);
  const [editBio, setEditBio] = useState(false);
  const [form, setForm] = useState({ handle: "", belt: "", coach: "", openSf: false });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    getDoc(doc(db, "athlete_bios", slug)).then(d => { if (d.exists()) { setBio(d.data()); setForm(d.data()); } }).catch(() => {});
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

  const elite = computeEliteSpotlight({ name: nm, academy: cnt.acad, g: cnt.g, s: cnt.s, b: cnt.b, events: evs });
  const saveBio = async (e) => {
    e.preventDefault();
    const clean = { handle: (form.handle || "").replace(/^@/, "").trim(), belt: (form.belt || "").trim(), coach: (form.coach || "").trim(), openSf: Boolean(form.openSf), name: nm };
    await setDoc(doc(db, "athlete_bios", slug), clean, { merge: true });
    setBio(clean); setEditBio(false);
  };
  const bioUrl = "https://matdates.com/?trophy=" + encodeURIComponent(nm).replace(/%20/g, "+");

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:10070, display:"flex", alignItems:"center", justifyContent:"center", padding:"12px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#0f141e", border:"1.5px solid #f59e0b", borderRadius:"14px", maxWidth:"650px", width:"100%", maxHeight:"90svh", overflowY:"auto", padding:"18px", textAlign:"left", color:"#fff" }}>
        <div style={{ display:"flex", justifyContent:"space-between", gap:"8px" }}>
          <div>
            <div style={{ color:"#fbbf24", fontSize:"0.74rem", fontWeight:"800", letterSpacing:"1.5px" }}>🏆 MATDATES OFFICIAL TROPHY ROOM</div>
            <h2 style={{ margin:"3px 0", fontSize:"1.45rem" }}>{nm}</h2>
            <div style={{ color:"#ff9f43", fontSize:"0.85rem", fontWeight:"bold" }}>
              {cnt.acad || elite.pro?.academy || "Independent"}
              {bio?.belt || elite.pro?.belt ? " • " + (bio?.belt || elite.pro?.belt) : ""}
              {bio?.coach ? " • Coach: " + bio.coach : ""}
            </div>
            <div style={{ display:"flex", gap:"6px", marginTop:"5px", flexWrap:"wrap" }}>
              {bio?.handle && <a href={"https://instagram.com/" + bio.handle} target="_blank" rel="noreferrer" style={{ background:"#1e293b", color:"#38bdf8", padding:"2px 8px", borderRadius:"5px", fontSize:"0.74rem", textDecoration:"none", fontWeight:"bold" }}>@{bio.handle}</a>}
              {bio?.openSf && <span style={{ background:"#132a1c", color:"#4ade80", border:"1px solid #22c55e", padding:"2px 8px", borderRadius:"5px", fontSize:"0.73rem", fontWeight:"bold" }}>🥊 Open for SuperFights</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"#1e293b", color:"#fff", border:"1px solid #334155", borderRadius:"6px", padding:"4px 10px", height:"32px", cursor:"pointer" }}>✕</button>
        </div>

        {elite.isElite && (
          <div style={{ marginTop:"12px", background:"linear-gradient(135deg,#291d09,#171f30)", border:"1px solid #f59e0b", borderRadius:"10px", padding:"11px 13px" }}>
            <div style={{ color:"#fbbf24", fontWeight:"800", fontSize:"0.77rem", marginBottom:"5px" }}>{elite.tierLabel} • 3 SPOTLIGHT FACTS</div>
            {elite.facts.map((f, i) => <div key={i} style={{ fontSize:"0.8rem", color:"#fef3c7", marginBottom:"3px" }}>★ {f}</div>)}
          </div>
        )}

        <div style={{ display:"flex", gap:"7px", flexWrap:"wrap", margin:"12px 0" }}>
          <div style={{ background:"#18202f", border:"1px solid #2d3748", borderRadius:"8px", padding:"6px 11px", fontSize:"0.84rem" }}>🥇<b>{cnt.g}</b> 🥈<b>{cnt.s}</b> 🥉<b>{cnt.b}</b> • <b style={{ color:"#34d399" }}>{elite.pts} Pts</b></div>
          <button type="button" onClick={() => onWatch(nm, cnt.acad || elite.pro?.academy || "")} style={{ background: isWatching ? "#132a1c" : "#162536", color: isWatching ? "#2ecc71" : "#38bdf8", border:"1px solid #0284c7", borderRadius:"7px", padding:"6px 10px", fontWeight:"bold", fontSize:"0.76rem", cursor:"pointer" }}>{isWatching ? "✓ Watching" : "🔔 Watch"}</button>
          <button type="button" onClick={() => { navigator.clipboard.writeText(bioUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ background:"#1e293b", color:"#e2e8f0", border:"1px solid #475569", borderRadius:"7px", padding:"6px 10px", fontWeight:"bold", fontSize:"0.76rem", cursor:"pointer" }}>{copied ? "✓ Link Copied!" : "🔗 Link-in-Bio"}</button>
          <button type="button" onClick={() => setEditBio(!editBio)} style={{ background:"#1e1b4b", color:"#c7d2fe", border:"1px solid #6366f1", borderRadius:"7px", padding:"6px 10px", fontWeight:"bold", fontSize:"0.76rem", cursor:"pointer" }}>🪪 {bio ? "Edit Bio" : "Claim Bio"}</button>
          {onShareCard && <button type="button" onClick={() => onShareCard({ badge: elite.isElite ? elite.tierLabel : "2026 OFFICIAL TROPHY ROOM", title: nm, subtitle: cnt.acad || elite.pro?.academy || "", gold: cnt.g, silver: cnt.s, bronze: cnt.b, deepLink: bioUrl, lines: [...(elite.pro?.titles || []), ...(elite.isElite ? elite.facts.map(x => "★ " + x) : []), ...evs.slice(0, 5).map(m => (Number(m.p)===1?"🥇":Number(m.p)===2?"🥈":"🥉") + " " + m.ev)] })} style={{ background:"#ff9f43", color:"#000", border:"none", borderRadius:"7px", padding:"6px 10px", fontWeight:"800", fontSize:"0.76rem", cursor:"pointer" }}>📲 9:16 Story Card</button>}
        </div>

        {editBio && (
          <form onSubmit={saveBio} style={{ background:"#161d2a", border:"1px solid #475569", borderRadius:"8px", padding:"10px", marginBottom:"12px", display:"grid", gap:"8px" }}>
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
              <input placeholder="Instagram @handle" value={form.handle || ""} onChange={e => setForm({...form, handle: e.target.value})} style={{ flex:1, padding:"7px", borderRadius:"6px", background:"#0f141e", color:"#fff", border:"1px solid #334155" }} />
              <input placeholder="Belt (e.g. Grey / Black)" value={form.belt || ""} onChange={e => setForm({...form, belt: e.target.value})} style={{ flex:1, padding:"7px", borderRadius:"6px", background:"#0f141e", color:"#fff", border:"1px solid #334155" }} />
              <input placeholder="Head Coach" value={form.coach || ""} onChange={e => setForm({...form, coach: e.target.value})} style={{ flex:1, padding:"7px", borderRadius:"6px", background:"#0f141e", color:"#fff", border:"1px solid #334155" }} />
            </div>
            <label style={{ fontSize:"0.8rem", color:"#cbd5e1" }}><input type="checkbox" checked={Boolean(form.openSf)} onChange={e => setForm({...form, openSf: e.target.checked})} /> 🥊 Mark profile as <b>Open for SuperFight Matchmaking</b></label>
            <button type="submit" style={{ background:"#2ecc71", color:"#000", border:"none", borderRadius:"6px", padding:"7px", fontWeight:"bold", cursor:"pointer" }}>Save Verified Bio</button>
          </form>
        )}

        {elite.pro && (
          <div style={{ marginBottom:"12px" }}>
            <div style={{ color:"#fbbf24", fontWeight:"bold", fontSize:"0.8rem", marginBottom:"5px" }}>👑 PRO TITLES &amp; SUPERFIGHT VICTORIES</div>
            <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"6px" }}>{elite.pro.titles.map((t, i) => <span key={i} style={{ background:"#292011", color:"#fde68a", border:"1px solid #d97706", borderRadius:"5px", padding:"2px 8px", fontSize:"0.74rem", fontWeight:"bold" }}>{t}</span>)}</div>
            {elite.pro.bouts.map((b, i) => <div key={i} style={{ background:"#151b26", padding:"6px 9px", borderRadius:"6px", fontSize:"0.77rem", marginBottom:"4px" }}>🥊 <b>{b.ev}</b> — <b style={{ color:"#4ade80" }}>{b.res}</b> ({b.sub})</div>)}
          </div>
        )}

        <div style={{ color:"#93c5fd", fontWeight:"bold", fontSize:"0.8rem", marginBottom:"5px" }}>🏅 VERIFIED TOURNAMENT PODIUMS ({evs.length})</div>
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
