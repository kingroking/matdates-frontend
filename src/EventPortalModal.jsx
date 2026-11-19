import React, { useState, useEffect } from "react";
import { collection, doc, getDoc, getDocs, addDoc, query, where } from "firebase/firestore";
import { db } from "./firebase";

const BG = { position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:10080, display:"flex", alignItems:"center", justifyContent:"center", padding:"12px", boxSizing:"border-box" };

export function EventPortalModal({ event, user, onRequireAuth, onOpenQa, onClose, initialSupport = "" }) {
  const [tab, setTab] = useState(initialSupport ? "TICKETS" : "CHECKIN");
  const [cfg, setCfg] = useState(null);
  const [sales, setSales] = useState([]);
  const [msg, setMsg] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  const [chk, setChk] = useState({
    athleteName: "", academy: "", weight: "", scaleProofUrl: "",
    corner1: "", corner2: "", walkoutUrl: "", posterPhotoUrl: "", phonetic: "", rulesAck: true
  });
  const [tix, setTix] = useState({
    buyerName: "", tier: "General Admission", qty: "2", academyTable: "", supportingAthlete: initialSupport || "", cheerNote: ""
  });

  useEffect(() => {
    if (!event?.id) return;
    getDoc(doc(db, "mat_watches", "prom_cfg_" + event.id)).then(d => { if (d.exists()) setCfg(d.data()); }).catch(() => {});
    getDocs(query(collection(db, "mat_watches"), where("kind", "==", "ticket_referral"))).then(sn => {
      setSales(sn.docs.map(d => d.data()).filter(x => x.eventId === event.id));
    }).catch(() => {});
  }, [event?.id]);

  const submitCheckIn = async (e) => {
    e.preventDefault();
    if (!user) { onRequireAuth && onRequireAuth(); return; }
    await addDoc(collection(db, "mat_watches"), {
      kind: "fighter_checkin",
      eventId: event.id,
      eventName: event.name || "",
      uid: user.uid,
      email: user.email || "",
      ...chk,
      createdAt: new Date().toISOString()
    });
    setMsg("✅ Pre-Fight Check-In, Weigh-In & Corner Passes submitted to Promoter!");
  };

  const submitTicketOrder = async (e) => {
    e.preventDefault();
    const row = {
      kind: "ticket_referral",
      eventId: event.id,
      eventName: event.name || "",
      ...tix,
      qtyNum: Math.max(1, Number(tix.qty || 1)),
      createdAt: new Date().toISOString()
    };
    await addDoc(collection(db, "mat_watches"), row);
    setSales([row, ...sales]);
    const dest = cfg?.ticketUrl || event?.link || "";
    setMsg("✅ Ticket / VIP Table reservation logged" + (tix.supportingAthlete ? " supporting " + tix.supportingAthlete : "") + "!" + (dest ? " Opening checkout..." : ""));
    if (dest && dest.startsWith("http")) window.open(dest, "_blank");
  };

  const referralUrl = "https://matdates.com/?hub=" + encodeURIComponent(event?.id || "") + (chk.athleteName ? "&support=" + encodeURIComponent(chk.athleteName.trim()).replace(/%20/g, "+") : "");

  // Compute live Athlete Ticket Leaderboard + VIP Tables claimed
  const tally = {};
  sales.forEach(s => {
    const k = (s.supportingAthlete || "").trim();
    if (k) tally[k] = (tally[k] || 0) + Number(s.qtyNum || 1);
  });
  const leaders = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const vipTables = sales.filter(s => /vip|table/i.test(s.tier || ""));

  const inp = { padding:"9px 11px", borderRadius:"6px", background:"#0f141e", color:"#fff", border:"1px solid #334155", fontSize:"0.86rem", width:"100%", boxSizing:"border-box" };

  return (
    <div onClick={onClose} style={BG}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#111622", border:"1.5px solid #14b8a6", borderRadius:"14px", maxWidth:"640px", width:"100%", maxHeight:"90svh", overflowY:"auto", padding:"18px", color:"#fff", textAlign:"left" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"8px", marginBottom:"10px" }}>
          <div>
            <div style={{ color:"#14b8a6", fontSize:"0.73rem", fontWeight:"800", letterSpacing:"1.2px" }}>🏟️ OFFICIAL EVENT COMPETITOR &amp; TICKET HUB</div>
            <h3 style={{ margin:"2px 0 0", color:"#ffffff", fontSize:"1.22rem" }}>{event?.name}</h3>
            <div style={{ color:"#94a3b8", fontSize:"0.78rem" }}>📅 {event?.date} • 📍 {event?.location}</div>
          </div>
          <button onClick={onClose} style={{ background:"#1e293b", color:"#fff", border:"1px solid #334155", borderRadius:"6px", padding:"4px 10px", cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"12px" }}>
          {[["INFO","📢 Event Info & Rules"],["CHECKIN","🥋 Athlete Check-In"],["TICKETS","🎟️ Tickets & VIP Tables"]].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)} style={{ flex:"1 1 150px", padding:"8px", borderRadius:"7px", fontWeight:"800", fontSize:"0.79rem", cursor:"pointer", background: tab===k ? "#14b8a6" : "#182030", color: tab===k ? "#000" : "#cbd5e1", border: tab===k ? "none" : "1px solid #334155" }}>{l}</button>
          ))}
        </div>

        {msg && <div style={{ background:"#132a1c", border:"1px solid #2ecc71", color:"#4ade80", padding:"8px 11px", borderRadius:"7px", fontSize:"0.8rem", fontWeight:"bold", marginBottom:"10px" }}>{msg}</div>}

        {tab === "INFO" && (
          <div style={{ display:"grid", gap:"10px" }}>
            <div style={{ background:"#182030", border:"1px solid #2d3748", borderRadius:"9px", padding:"12px", fontSize:"0.84rem", lineHeight:1.5 }}>
              <div style={{ color:"#5eead4", fontWeight:"800", marginBottom:"6px" }}>📋 Official Competitor Briefing &amp; Schedule</div>
              <div><b>• Weigh-Ins:</b> {cfg?.weighInInfo || "Day-of & Virtual Weigh-In submissions accepted in the 🥋 Athlete Check-In tab."}</div>
              <div><b>• Corner Policy:</b> {cfg?.cornerInfo || "Up to 2 verified corners per competing athlete — register coach names in Check-In for backstage passes."}</div>
              <div><b>• Ruleset &amp; Briefing:</b> {cfg?.rulesInfo || "Official ruleset briefing 30 minutes prior to first bout."}</div>
            </div>
            {onOpenQa && (
              <button type="button" onClick={() => { onClose(); onOpenQa(); }} style={{ background:"#162536", color:"#38bdf8", border:"1px solid #0284c7", borderRadius:"8px", padding:"10px", fontWeight:"800", cursor:"pointer", fontSize:"0.84rem" }}>
                💬 Open Live Competitor Q&amp;A &amp; Venue Tips →
              </button>
            )}
          </div>
        )}

        {tab === "CHECKIN" && (
          <form onSubmit={submitCheckIn} style={{ display:"grid", gap:"9px" }}>
            <div style={{ background:"#152228", border:"1px solid #14b8a6", borderRadius:"8px", padding:"10px 12px", fontSize:"0.79rem", color:"#ccfbf1" }}>
              <b>Competing on this card?</b> Submit your Virtual Weigh-In, Coach/Corner passes, Walkout track &amp; Broadcast info below — and copy your personal <b>Athlete Ticket Link</b>!
            </div>
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
              <input required placeholder="Competing Athlete Full Name" value={chk.athleteName} onChange={e => setChk({...chk, athleteName: e.target.value})} style={{ ...inp, flex:"1 1 180px" }} />
              <input required placeholder="Academy / Team" value={chk.academy} onChange={e => setChk({...chk, academy: e.target.value})} style={{ ...inp, flex:"1 1 160px" }} />
            </div>
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
              <input placeholder="Current / Official Weight (lbs or kg)" value={chk.weight} onChange={e => setChk({...chk, weight: e.target.value})} style={{ ...inp, flex:"1 1 160px" }} />
              <input type="url" placeholder="Virtual Weigh-In Photo/Video Link (Optional)" value={chk.scaleProofUrl} onChange={e => setChk({...chk, scaleProofUrl: e.target.value})} style={{ ...inp, flex:"1 1 200px" }} />
            </div>
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
              <input placeholder="Corner #1 / Head Coach Name (Wristband)" value={chk.corner1} onChange={e => setChk({...chk, corner1: e.target.value})} style={{ ...inp, flex:"1 1 180px" }} />
              <input placeholder="Corner #2 Name (Optional)" value={chk.corner2} onChange={e => setChk({...chk, corner2: e.target.value})} style={{ ...inp, flex:"1 1 180px" }} />
            </div>
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
              <input placeholder="Walkout Song Link + Timestamp (e.g. YouTube/Spotify 0:42)" value={chk.walkoutUrl} onChange={e => setChk({...chk, walkoutUrl: e.target.value})} style={{ ...inp, flex:"1 1 200px" }} />
              <input placeholder="Name Pronunciation for Announcer" value={chk.phonetic} onChange={e => setChk({...chk, phonetic: e.target.value})} style={{ ...inp, flex:"1 1 160px" }} />
            </div>
            <input type="url" placeholder="High-Res Fighter Photo Link for Event Poster (Google Drive / Dropbox / IG)" value={chk.posterPhotoUrl} onChange={e => setChk({...chk, posterPhotoUrl: e.target.value})} style={inp} />

            <div style={{ background:"#182030", border:"1px dashed #38bdf8", borderRadius:"8px", padding:"9px 11px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
              <div style={{ fontSize:"0.77rem", color:"#cbd5e1" }}>🎟️ <b>Your Personal Athlete Ticket &amp; VIP Table Link</b> (tracks all fan sales to you):</div>
              <button type="button" onClick={() => { navigator.clipboard.writeText(referralUrl); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }} style={{ background:"#38bdf8", color:"#000", border:"none", borderRadius:"6px", padding:"6px 10px", fontWeight:"800", fontSize:"0.75rem", cursor:"pointer" }}>
                {copiedLink ? "✓ Referral Link Copied!" : "🔗 Copy My Ticket Link"}
              </button>
            </div>

            <button type="submit" style={{ background:"#2ecc71", color:"#000", border:"none", borderRadius:"7px", padding:"11px", fontWeight:"800", cursor:"pointer" }}>
              ✅ Submit Athlete Check-In &amp; Corner Passes
            </button>
          </form>
        )}

        {tab === "TICKETS" && (
          <div style={{ display:"grid", gap:"10px" }}>
            <form onSubmit={submitTicketOrder} style={{ background:"#182030", border:"1px solid #334155", borderRadius:"9px", padding:"12px", display:"grid", gap:"8px" }}>
              <div style={{ color:"#fbbf24", fontWeight:"800", fontSize:"0.84rem" }}>🎟️ Reserve Spectator Tickets or Mat-Side Academy VIP Tables</div>
              <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                <select value={tix.tier} onChange={e => setTix({...tix, tier: e.target.value})} style={{ ...inp, flex:"1 1 200px" }}>
                  <option value="General Admission">{cfg?.gaLabel || "🎟️ General Admission Spectator"}</option>
                  <option value="Mat-Side VIP Seat">{cfg?.vipSeatLabel || "⚡ Mat-Side Cage/Mat Row VIP"}</option>
                  <option value="VIP Table (8 Seats)">{cfg?.vipTableLabel || "👑 Mat-Side VIP Table (8 Seats — Academy/Sponsor)"}</option>
                </select>
                <input type="number" min="1" max="20" placeholder="Qty" value={tix.qty} onChange={e => setTix({...tix, qty: e.target.value})} style={{ ...inp, flex:"0 1 80px" }} />
              </div>
              <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                <input required placeholder="Your Name or Academy (for VIP Table Sign)" value={tix.buyerName} onChange={e => setTix({...tix, buyerName: e.target.value})} style={{ ...inp, flex:"1 1 180px" }} />
                <input placeholder="Supporting Which Athlete? (Credits Fighter Bonus!)" value={tix.supportingAthlete} onChange={e => setTix({...tix, supportingAthlete: e.target.value})} style={{ ...inp, flex:"1 1 180px" }} />
              </div>
              <input placeholder="Optional Corner Cheer Note for Athlete!" value={tix.cheerNote} onChange={e => setTix({...tix, cheerNote: e.target.value})} style={inp} />
              <button type="submit" style={{ background:"#ff9f43", color:"#000", border:"none", borderRadius:"7px", padding:"10px", fontWeight:"800", cursor:"pointer" }}>
                🎟️ Continue to Official Ticket / Table Checkout ↗
              </button>
            </form>

            {vipTables.length > 0 && (
              <div style={{ background:"#151c28", border:"1px solid #f59e0b", borderRadius:"8px", padding:"10px 12px" }}>
                <div style={{ color:"#fbbf24", fontWeight:"800", fontSize:"0.76rem", marginBottom:"5px" }}>👑 RESERVED MAT-SIDE VIP TABLES ({vipTables.length})</div>
                <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                  {vipTables.map((v, i) => <span key={i} style={{ background:"#292011", color:"#fde68a", border:"1px solid #d97706", borderRadius:"5px", padding:"3px 8px", fontSize:"0.74rem", fontWeight:"bold" }}>Table #{i+1}: {v.buyerName}</span>)}
                </div>
              </div>
            )}

            {leaders.length > 0 && (
              <div style={{ background:"#151c28", border:"1px solid #2d3748", borderRadius:"8px", padding:"10px 12px" }}>
                <div style={{ color:"#4ade80", fontWeight:"800", fontSize:"0.76rem", marginBottom:"5px" }}>🔥 TOP SUPPORTED ATHLETES ON THIS CARD</div>
                {leaders.map(([nm, cnt], i) => (
                  <div key={nm} style={{ display:"flex", justifyContent:"space-between", fontSize:"0.78rem", padding:"3px 0", color:"#e2e8f0" }}>
                    <span>#{i+1} <b>{nm}</b></span>
                    <b style={{ color:"#4ade80" }}>{cnt} Tickets Backed</b>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
