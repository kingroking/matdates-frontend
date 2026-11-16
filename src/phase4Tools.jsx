import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

export function buildStoryCanvas(event, division, comps) {
  const c = document.createElement('canvas');
  c.width = 1080; c.height = 1920;
  const x = c.getContext('2d');
  x.fillStyle = '#090909'; x.fillRect(0, 0, 1080, 1920);
  x.fillStyle = '#e31837'; x.fillRect(0, 0, 1080, 28);
  x.fillStyle = '#fff'; x.font = '900 68px sans-serif'; x.fillText('MatDates.com', 80, 140);
  x.fillStyle = '#ff9f43'; x.font = 'bold 32px sans-serif'; x.fillText('LIVE DIVISION BRACKET', 80, 195);
  x.fillStyle = '#fff'; x.font = 'bold 44px sans-serif'; x.fillText((event.name || '').slice(0, 40), 80, 295);
  x.fillStyle = '#aaa'; x.font = '32px sans-serif'; x.fillText(`${event.date || ''} | ${event.venue || event.location || ''}`.slice(0, 50), 80, 350);
  x.fillStyle = '#161616'; x.fillRect(70, 410, 940, 1300);
  x.fillStyle = '#ff9f43'; x.font = 'bold 32px sans-serif'; x.fillText(division.slice(0, 48), 105, 475);
  comps.slice(0, 12).forEach((m, i) => {
    const y = 560 + i * 92;
    x.fillStyle = '#fff'; x.font = 'bold 34px sans-serif'; x.fillText(`${i + 1}. ${(m.Name || '').slice(0, 30)}`, 105, y);
    x.fillStyle = '#888'; x.font = '26px sans-serif'; x.fillText((m.Academy || '').slice(0, 40), 145, y + 34);
  });
  x.fillStyle = '#888'; x.font = '28px sans-serif'; x.fillText('Find brackets & schedules at MatDates.com', 80, 1810);
  return c;
}
export function StoryShareModal({ payload, onClose }) {
  if (!payload) return null;
  const canvas = buildStoryCanvas(payload.event, payload.division, payload.comps);
  const dataUrl = canvas.toDataURL('image/png');
  const shareNative = () => canvas.toBlob(async (blob) => {
    const file = new File([blob], 'matdates-bracket.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: payload.event.name, text: 'Division bracket on MatDates.com' }); return; } catch {}
    }
    const a = document.createElement('a'); a.download = 'matdates-bracket.png'; a.href = dataUrl; a.click();
  }, 'image/png');
  return (
    <div style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.88)', zIndex:10001, display:'flex', justifyContent:'center', alignItems:'center', padding:'20px' }}>
      <div style={{ backgroundColor:'#111', border:'1px solid #444', borderRadius:'12px', padding:'20px', maxWidth:'380px', width:'100%', textAlign:'center' }}>
        <h3 style={{ margin:'0 0 6px 0', color:'#fff' }}>Share Bracket to IG Story</h3>
        <p style={{ margin:'0 0 12px 0', color:'#9aa4b2', fontSize:'0.8rem' }}>On iPhone/Android, tap Share below and pick Instagram Stories. On desktop, save PNG to upload.</p>
        <img src={dataUrl} alt="Story card preview" style={{ width:'100%', maxHeight:'52vh', objectFit:'contain', borderRadius:'8px', border:'1px solid #333', marginBottom:'12px' }} />
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={shareNative} style={{ flex:1, padding:'11px', backgroundColor:'#e31837', color:'#fff', border:'none', borderRadius:'6px', fontWeight:'bold', cursor:'pointer' }}>Share to Instagram / Save</button>
          <button onClick={onClose} style={{ padding:'11px 14px', backgroundColor:'#222', color:'#ccc', border:'1px solid #444', borderRadius:'6px', cursor:'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
}

export function EventSquadChips({ competitors, onSelectGym }) {
  const counts = {};
  competitors.forEach(c => { const g = (c.Academy || '').trim(); if (g.length > 2 && !/^(independent|unassigned|one submission)/i.test(g) && !/^\d+$/.test(g)) counts[g] = (counts[g] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (!top.length) return null;
  return (
    <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'12px', alignItems:'center' }}>
      <span style={{ color:'#888', fontSize:'0.8rem', fontWeight:'bold' }}>Largest Event Squads:</span>
      {top.map(([g, n]) => (<button key={g} onClick={() => onSelectGym(g)} style={{ backgroundColor:'#1f1f1f', color:'#cbd5e1', border:'1px solid #444', borderRadius:'14px', padding:'3px 10px', fontSize:'0.78rem', cursor:'pointer' }}>{g} ({n})</button>))}
    </div>
  );
}
export function LeaderboardModal({ onClose }) {
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState('jjwl_youth');
  const [qStr, setQStr] = useState('');
  useEffect(() => {
    getDocs(query(collection(db, 'event_competitors'), where('event_id', '==', '__global_leaderboard__')))
      .then(s => setRows(s.docs.map(d => d.data())));
  }, []);
  const list = rows.filter(r => (r.Board || 'jjwl_youth') === tab && (!qStr || (r.Academy || '').toLowerCase().includes(qStr.toLowerCase()))).sort((a, b) => (a.Rank || 999) - (b.Rank || 999));
  return (
    <div style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.86)', zIndex:9999, display:'flex', justifyContent:'center', alignItems:'center', padding:'20px' }}>
      <div style={{ backgroundColor:'#111', padding:'24px', borderRadius:'12px', border:'1px solid #444', width:'100%', maxWidth:'780px', maxHeight:'88vh', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px', gap:'12px' }}>
          <div>
            <h2 style={{ margin:0, color:'#fff', fontSize:'1.4rem' }}>2026 Academy Medal & Podium Standings</h2>
            <p style={{ margin:'4px 0 0 0', color:'#9aa4b2', fontSize:'0.83rem', lineHeight:1.4 }}>Official season podium results synced from completed tournaments — ranked by Gold, Silver, and Bronze medals earned plus official federation team points.</p>
          </div>
          <button onClick={onClose} style={{ backgroundColor:'#333', color:'#fff', border:'none', borderRadius:'6px', padding:'8px 14px', cursor:'pointer', fontWeight:'bold' }}>Close</button>
        </div>
        <div style={{ display:'flex', gap:'8px', marginBottom:'12px', flexWrap:'wrap' }}>
          {[['jjwl_youth','JJWL Youth Medals'],['jjwl_adult','JJWL Adult Medals'],['ibjjf_overall','IBJJF 2026 Team Points']].map(([k, lbl]) => (
            <button key={k} onClick={() => setTab(k)} style={{ padding:'8px 12px', borderRadius:'6px', border: tab === k ? '1px solid #f1c40f' : '1px solid #333', backgroundColor: tab === k ? '#262110' : '#1b1b1b', color: tab === k ? '#f1c40f' : '#ccc', fontWeight:'bold', cursor:'pointer', fontSize:'0.85rem' }}>{lbl}</button>
          ))}
          <input value={qStr} onChange={e => setQStr(e.target.value)} placeholder="Search academy..." style={{ flex:1, minWidth:'160px', padding:'8px 12px', borderRadius:'6px', backgroundColor:'#1b1b1b', color:'#fff', border:'1px solid #333' }} />
        </div>
        <div style={{ overflowY:'auto', border:'1px solid #2d2d2d', borderRadius:'8px', backgroundColor:'#161616' }}>
          {list.length === 0 ? <div style={{ padding:'24px', textAlign:'center', color:'#888' }}>Syncing 2026 season medal tables...</div> : list.map((r, i) => (
            <div key={`${r.Board}_${r.Academy}_${i}`} style={{ display:'flex', justifyContent:'space-between', padding:'11px 16px', borderBottom:'1px solid #242424', alignItems:'center', flexWrap:'wrap', gap:'8px' }}>
              <div><strong style={{ color: i === 0 ? '#f1c40f' : i === 1 ? '#cbd5e1' : i === 2 ? '#d97706' : '#777', marginRight:'10px' }}>#{r.Rank || i + 1}</strong><strong style={{ color:'#fff' }}>{r.Academy}</strong></div>
              <div style={{ display:'flex', gap:'12px', alignItems:'center', fontSize:'0.88rem' }}>
                {r.Gold !== undefined && <span title="Gold Medals">🥇 <strong>{r.Gold}</strong></span>}
                {r.Silver !== undefined && <span title="Silver Medals">🥈 <strong>{r.Silver}</strong></span>}
                {r.Bronze !== undefined && <span title="Bronze Medals">🥉 <strong>{r.Bronze}</strong></span>}
                {r.Subs !== undefined && <span style={{ color:'#9aa4b2', fontSize:'0.8rem' }}>{r.Subs} subs</span>}
                <span style={{ color:'#2ecc71', fontWeight:'bold', minWidth:'78px', textAlign:'right' }}>{r.Points} pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
