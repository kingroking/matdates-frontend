import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

export function downloadStoryCard(event, division, comps) {
  const c = document.createElement('canvas');
  c.width = 1080; c.height = 1920;
  const x = c.getContext('2d');
  x.fillStyle = '#090909'; x.fillRect(0, 0, 1080, 1920);
  x.fillStyle = '#e31837'; x.fillRect(0, 0, 1080, 28);
  x.fillStyle = '#fff'; x.font = '900 68px sans-serif'; x.fillText('MatDates.com', 80, 140);
  x.fillStyle = '#ff9f43'; x.font = 'bold 32px sans-serif'; x.fillText('LIVE BRACKET WATCH', 80, 195);
  x.fillStyle = '#fff'; x.font = 'bold 44px sans-serif'; x.fillText((event.name || '').slice(0, 40), 80, 295);
  x.fillStyle = '#aaa'; x.font = '32px sans-serif'; x.fillText(`${event.date || ''} | ${event.venue || event.location || ''}`.slice(0, 50), 80, 350);
  x.fillStyle = '#161616'; x.fillRect(70, 410, 940, 1300);
  x.fillStyle = '#ff9f43'; x.font = 'bold 32px sans-serif'; x.fillText(division.slice(0, 48), 105, 475);
  comps.slice(0, 12).forEach((m, i) => {
    const y = 560 + i * 92;
    x.fillStyle = '#fff'; x.font = 'bold 34px sans-serif'; x.fillText(`${i + 1}. ${(m.Name || '').slice(0, 30)}`, 105, y);
    x.fillStyle = '#888'; x.font = '26px sans-serif'; x.fillText((m.Academy || '').slice(0, 40), 145, y + 34);
  });
  x.fillStyle = '#888'; x.font = '28px sans-serif'; x.fillText('Track brackets & schedules at MatDates.com', 80, 1810);
  const a = document.createElement('a'); a.download = 'matdates-story.png'; a.href = c.toDataURL('image/png'); a.click();
}
export function EventSquadChips({ competitors, onSelectGym }) {
  const counts = {};
  competitors.forEach(c => {
    const g = (c.Academy || '').trim();
    if (g.length > 2 && !/^(independent|unassigned|one submission)/i.test(g) && !/^\d+$/.test(g)) counts[g] = (counts[g] || 0) + 1;
  });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (!top.length) return null;
  return (
    <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'12px', alignItems:'center' }}>
      <span style={{ color:'#888', fontSize:'0.8rem', fontWeight:'bold' }}>Top Squads:</span>
      {top.map(([g, n]) => (
        <button key={g} onClick={() => onSelectGym(g)} style={{ backgroundColor:'#1f1f1f', color:'#ff9f43', border:'1px solid #444', borderRadius:'14px', padding:'3px 10px', fontSize:'0.78rem', cursor:'pointer' }}>{g} ({n})</button>
      ))}
    </div>
  );
}
export function LeaderboardModal({ onClose }) {
  const [rows, setRows] = useState([]);
  const [mode, setMode] = useState('Total');
  const [qStr, setQStr] = useState('');
  useEffect(() => {
    getDocs(query(collection(db, 'event_competitors'), where('event_id', '==', '__global_leaderboard__')))
      .then(s => setRows(s.docs.map(d => d.data())));
  }, []);
  const list = rows.filter(r => !qStr || (r.Academy || '').toLowerCase().includes(qStr.toLowerCase())).sort((a, b) => (b[mode] || 0) - (a[mode] || 0));
  return (
    <div style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.85)', zIndex:9999, display:'flex', justifyContent:'center', alignItems:'center', padding:'20px' }}>
      <div style={{ backgroundColor:'#111', padding:'24px', borderRadius:'12px', border:'1px solid #444', width:'100%', maxWidth:'720px', maxHeight:'88vh', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
          <h2 style={{ margin:0, color:'#fff', fontSize:'1.4rem' }}>Global Academy Leaderboard</h2>
          <button onClick={onClose} style={{ backgroundColor:'#333', color:'#fff', border:'none', borderRadius:'6px', padding:'8px 14px', cursor:'pointer', fontWeight:'bold' }}>Close</button>
        </div>
        <div style={{ display:'flex', gap:'8px', marginBottom:'14px', flexWrap:'wrap' }}>
          {[['Total','All Active Athletes'],['Youth','Kids / Youth Squads'],['Adult','Adult / Masters']].map(([k, lbl]) => (
            <button key={k} onClick={() => setMode(k)} style={{ padding:'8px 12px', borderRadius:'6px', border:'1px solid #444', backgroundColor: mode === k ? '#ff9f43' : '#222', color: mode === k ? '#000' : '#fff', fontWeight:'bold', cursor:'pointer' }}>{lbl}</button>
          ))}
          <input value={qStr} onChange={e => setQStr(e.target.value)} placeholder="Filter academy..." style={{ flex:1, minWidth:'160px', padding:'8px 12px', borderRadius:'6px', backgroundColor:'#222', color:'#fff', border:'1px solid #444' }} />
        </div>
        <div style={{ overflowY:'auto', border:'1px solid #333', borderRadius:'8px', backgroundColor:'#181818' }}>
          {list.map((r, i) => (
            <div key={r.Academy} style={{ display:'flex', justifyContent:'space-between', padding:'11px 16px', borderBottom:'1px solid #262626', alignItems:'center' }}>
              <div><strong style={{ color: i < 3 ? '#ff9f43' : '#888', marginRight:'10px' }}>#{i + 1}</strong><strong style={{ color:'#fff' }}>{r.Academy}</strong> <span style={{ color:'#777', fontSize:'0.8rem' }}>({r.EventsCount} events)</span></div>
              <div style={{ color:'#2ecc71', fontWeight:'bold' }}>{r[mode] || 0} entries</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
