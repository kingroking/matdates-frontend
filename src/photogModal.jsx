import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

const MODAL_BG = { position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:10075, display:"flex", alignItems:"center", justifyContent:"center", padding:"12px", boxSizing:"border-box" };

export function EventPhotogModal({ event, onClose, onRefreshCounts }) {
  const [tab, setTab] = useState("BROWSE");
  const [photogs, setPhotogs] = useState([]);
  const [bookPick, setBookPick] = useState(null);
  const [bookForm, setBookForm] = useState({ athlete: "", academy: "", division: "", contact: "" });
  const [listForm, setListForm] = useState({ brand: "", insta: "", pkg: "", price: "", spots: "10", bookUrl: "", coverAllRegion: false });
  const [msg, setMsg] = useState("");

  const load = () => {
    getDocs(query(collection(db, "mat_watches"), where("kind", "==", "event_photog"))).then(sn => {
      const all = sn.docs.map(d => ({ id: d.id, ...d.data() }));
      const evState = (event?.location || "").split(",").pop().trim().toLowerCase();
      setPhotogs(all.filter(p => p.eventId === event?.id || (p.coverAllRegion && evState && (p.regionState || "").toLowerCase() === evState)));
    }).catch(() => {});
  };

  useEffect(() => { load(); }, [event?.id]);

  const submitListing = async (e) => {
    e.preventDefault();
    const evState = (event?.location || "").split(",").pop().trim();
    await addDoc(collection(db, "mat_watches"), {
      kind: "event_photog",
      status: "listed",
      eventId: event?.id || "",
      eventName: event?.name || "",
      regionState: evState,
      brand: listForm.brand.trim(),
      insta: listForm.insta.replace(/^@+/, "").trim(),
      pkg: listForm.pkg.trim(),
      price: listForm.price.replace(/^\$+/, "").trim(),
      spots: listForm.spots.trim(),
      bookUrl: listForm.bookUrl.trim(),
      coverAllRegion: Boolean(listForm.coverAllRegion),
      createdAt: new Date().toISOString()
    });
    setMsg("✅ Your photography package is now LIVE on this Event Card!");
    setTab("BROWSE");
    load();
    if (onRefreshCounts) onRefreshCounts();
  };

  const submitBooking = async (e) => {
    e.preventDefault();
    if (!bookPick) return;
    await addDoc(collection(db, "mat_watches"), {
      kind: "photog_booking",
      status: "requested",
      photogId: bookPick.id,
      photogBrand: bookPick.brand,
      eventId: event?.id || "",
      eventName: event?.name || "",
      ...bookForm,
      createdAt: new Date().toISOString()
    });
    const dest = bookPick.bookUrl || (bookPick.insta ? "https://instagram.com/" + bookPick.insta : "");
    setMsg("✅ Athlete bracket info saved for " + bookPick.brand + "!" + (dest ? " Opening checkout/booking page..." : ""));
    if (dest) window.open(dest, "_blank");
    setBookPick(null);
  };

  const inp = { padding:"9px 11px", borderRadius:"6px", background:"#0f141e", color:"#fff", border:"1px solid #334155", fontSize:"0.88rem", width:"100%", boxSizing:"border-box" };

  return (
    <div onClick={onClose} style={MODAL_BG}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#111622", border:"1.5px solid #38bdf8", borderRadius:"14px", maxWidth:"580px", width:"100%", maxHeight:"90svh", overflowY:"auto", padding:"18px", color:"#fff", textAlign:"left" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"8px", marginBottom:"10px" }}>
          <div>
            <div style={{ color:"#38bdf8", fontSize:"0.74rem", fontWeight:"800", letterSpacing:"1.2px" }}>📸 MAT-SIDE PHOTO &amp; HIGHLIGHT REELS</div>
            <h3 style={{ margin:"2px 0 0", color:"#ffffff", fontSize:"1.2rem" }}>{event?.name}</h3>
            <div style={{ color:"#94a3b8", fontSize:"0.78rem" }}>{event?.date} • {event?.location}</div>
          </div>
          <button onClick={onClose} style={{ background:"#1e293b", color:"#fff", border:"1px solid #334155", borderRadius:"6px", padding:"4px 10px", cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ display:"flex", gap:"6px", marginBottom:"12px" }}>
          <button type="button" onClick={() => setTab("BROWSE")} style={{ flex:1, padding:"8px", borderRadius:"7px", fontWeight:"800", fontSize:"0.8rem", cursor:"pointer", background: tab==="BROWSE" ? "#38bdf8" : "#182030", color: tab==="BROWSE" ? "#000" : "#cbd5e1", border: tab==="BROWSE" ? "none" : "1px solid #334155" }}>🛒 Book Event Photog ({photogs.length})</button>
          <button type="button" onClick={() => setTab("LIST")} style={{ flex:1, padding:"8px", borderRadius:"7px", fontWeight:"800", fontSize:"0.8rem", cursor:"pointer", background: tab==="LIST" ? "#ff9f43" : "#182030", color: tab==="LIST" ? "#000" : "#cbd5e1", border: tab==="LIST" ? "none" : "1px solid #334155" }}>➕ I&apos;m a Photog (List Package)</button>
        </div>

        {msg && <div style={{ background:"#132a1c", border:"1px solid #2ecc71", color:"#4ade80", padding:"8px 11px", borderRadius:"7px", fontSize:"0.8rem", fontWeight:"bold", marginBottom:"10px" }}>{msg}</div>}

        {tab === "BROWSE" ? (
          <div style={{ display:"grid", gap:"10px" }}>
            {photogs.length === 0 ? (
              <div style={{ background:"#182030", border:"1px dashed #475569", borderRadius:"9px", padding:"18px", textAlign:"center" }}>
                <div style={{ fontSize:"0.92rem", fontWeight:"bold", marginBottom:"6px" }}>No photographers have listed packages for this card yet.</div>
                <div style={{ fontSize:"0.8rem", color:"#94a3b8", marginBottom:"12px" }}>Shooting mats at {event?.name}? List your photo/reel packages for free so competitors and parents can pre-book you!</div>
                <button onClick={() => setTab("LIST")} style={{ background:"#ff9f43", color:"#000", border:"none", borderRadius:"7px", padding:"8px 14px", fontWeight:"800", cursor:"pointer" }}>📸 List My Packages Here</button>
              </div>
            ) : photogs.map(p => (
              <div key={p.id} style={{ background:"#182030", border:"1px solid #334155", borderRadius:"9px", padding:"12px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"8px", flexWrap:"wrap" }}>
                  <div>
                    <div style={{ fontWeight:"800", fontSize:"1rem", color:"#fff" }}>{p.brand}</div>
                    {p.insta && <a href={"https://instagram.com/" + p.insta} target="_blank" rel="noreferrer" style={{ color:"#38bdf8", fontSize:"0.78rem", fontWeight:"bold", textDecoration:"none" }}>@{p.insta} ↗</a>}
                  </div>
                  <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
                    {p.price && <span style={{ background:"#132a1c", color:"#4ade80", border:"1px solid #22c55e", borderRadius:"6px", padding:"4px 9px", fontWeight:"800", fontSize:"0.82rem" }}>${p.price}</span>}
                    <button onClick={() => setBookPick(bookPick?.id === p.id ? null : p)} style={{ background:"#38bdf8", color:"#000", border:"none", borderRadius:"6px", padding:"6px 11px", fontWeight:"800", fontSize:"0.78rem", cursor:"pointer" }}>Book Coverage</button>
                  </div>
                </div>
                <div style={{ fontSize:"0.82rem", color:"#e2e8f0", marginTop:"7px" }}>{p.pkg}</div>
                {p.spots && <div style={{ fontSize:"0.73rem", color:"#fbbf24", marginTop:"4px", fontWeight:"bold" }}>⚡ Limited to {p.spots} athlete spots</div>}
                {bookPick?.id === p.id && (
                  <form onSubmit={submitBooking} style={{ marginTop:"10px", paddingTop:"10px", borderTop:"1px solid #2d3748", display:"grid", gap:"8px" }}>
                    <div style={{ fontSize:"0.78rem", color:"#93c5fd", fontWeight:"bold" }}>Lock in {p.brand} — Enter Athlete Bracket Info:</div>
                    <input required placeholder="Athlete Full Name (e.g. Isabella King)" value={bookForm.athlete} onChange={e => setBookForm({...bookForm, athlete: e.target.value})} style={inp} />
                    <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                      <input required placeholder="Academy" value={bookForm.academy} onChange={e => setBookForm({...bookForm, academy: e.target.value})} style={{ ...inp, flex:"1 1 140px" }} />
                      <input required placeholder="Division(s) & Gi Color" value={bookForm.division} onChange={e => setBookForm({...bookForm, division: e.target.value})} style={{ ...inp, flex:"1 1 160px" }} />
                    </div>
                    <input required placeholder="Parent / Athlete Cell or @Instagram" value={bookForm.contact} onChange={e => setBookForm({...bookForm, contact: e.target.value})} style={inp} />
                    <button type="submit" style={{ background:"#2ecc71", color:"#000", border:"none", borderRadius:"6px", padding:"9px", fontWeight:"800", cursor:"pointer" }}>Confirm &amp; Continue to Photographer Checkout ↗</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={submitListing} style={{ display:"grid", gap:"9px" }}>
            <input required placeholder="Photography Brand / Name" value={listForm.brand} onChange={e => setListForm({...listForm, brand: e.target.value})} style={inp} />
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
              <input required placeholder="Instagram @portfolio" value={listForm.insta} onFocus={() => { if (!listForm.insta) setListForm(f => ({...f, insta: "@"})); }} onChange={e => { const v = e.target.value; setListForm({...listForm, insta: v ? ("@" + v.replace(/^@+/, "")) : ""}); }} style={{ ...inp, flex:"1 1 150px" }} />
              <input required placeholder="Starting Package Price ($)" value={listForm.price} onChange={e => setListForm({...listForm, price: e.target.value})} style={{ ...inp, flex:"1 1 120px" }} />
              <input placeholder="Max Athlete Spots (e.g. 12)" value={listForm.spots} onChange={e => setListForm({...listForm, spots: e.target.value})} style={{ ...inp, flex:"1 1 120px" }} />
            </div>
            <input required placeholder="Package Details (e.g. All Gi/No-Gi Matches Photos + 4K Highlight Reel)" value={listForm.pkg} onChange={e => setListForm({...listForm, pkg: e.target.value})} style={inp} />
            <input type="url" placeholder="Direct Checkout / Deposit Link (Stripe, Square, Pixieset, Venmo — Optional)" value={listForm.bookUrl} onChange={e => setListForm({...listForm, bookUrl: e.target.value})} style={inp} />
            <label style={{ fontSize:"0.79rem", color:"#cbd5e1", display:"flex", alignItems:"center", gap:"6px" }}>
              <input type="checkbox" checked={listForm.coverAllRegion} onChange={e => setListForm({...listForm, coverAllRegion: e.target.checked})} />
              <span>Also display my services on other upcoming tournaments in this state</span>
            </label>
            <button type="submit" style={{ background:"#ff9f43", color:"#000", border:"none", borderRadius:"7px", padding:"11px", fontWeight:"800", cursor:"pointer" }}>Publish Package on Event Card</button>
          </form>
        )}
      </div>
    </div>
  );
}

export async function fetchPhotogCounts() {
  try {
    const sn = await getDocs(query(collection(db, "mat_watches"), where("kind", "==", "event_photog")));
    const m = {};
    sn.forEach(d => { const eid = d.data()?.eventId; if (eid) m[eid] = (m[eid] || 0) + 1; });
    return m;
  } catch {
    return {};
  }
}
