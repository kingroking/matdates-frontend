import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export function StoryShareModal({ event, onClose }) {
  return null;
}

export function EventSquadChips({ event }) {
  return null;
}

export function LeaderboardModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('smoothcomp_podiums');
  const [boardData, setBoardData] = useState({
    ibjjf_overall: [],
    ibjjf_kids: [],
    jjwl_adult: [],
    jjwl_youth: [],
    smoothcomp_podiums: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDoc(doc(db, 'event_competitors', 'global_leaderboard'))
      .then(snap => {
        if (snap.exists()) {
          setBoardData(prev => ({ ...prev, ...snap.data() }));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const tabs = [
    { id: 'smoothcomp_podiums', label: '🏆 Smoothcomp Podiums' },
    { id: 'ibjjf_overall', label: 'IBJJF Academy (Overall)' },
    { id: 'ibjjf_kids', label: 'IBJJF Youth' },
    { id: 'jjwl_adult', label: 'JJWL Adult' },
    { id: 'jjwl_youth', label: 'JJWL Youth' }
  ];

  const currentRows = boardData[activeTab] || [];

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.85)', zIndex:9999, display:'flex', justifyContent:'center', alignItems:'center', padding:'16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor:'#11141b', padding:'24px', borderRadius:'12px', border:'1px solid #2d3748', width:'100%', maxWidth:'850px', maxHeight:'88vh', display:'flex', flexDirection:'column', color:'#fff' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
          <div>
            <h2 style={{ margin:0, fontSize:'1.3rem' }}>🏆 Global Academy Medal Standings</h2>
            <p style={{ color:'#94a3b8', font:'0.82rem', margin:'4px 0 0' }}>Live aggregated podium totals and academy rankings across circuits.</p>
          </div>
          <button onClick={onClose} style={{ background:'#1e293b', color:'#fff', border:'1px solid #334155', borderRadius:'6px', padding:'6px 12px', cursor:'pointer' }}>Close</button>
        </div>

        <div style={{ display:'flex', gap:'8px', overflowX:'auto', paddingBottom:'8px', marginBottom:'16px', borderBottom:'1px solid #1f2532' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ background: activeTab === t.id ? '#0284c7' : '#1e293b', color: activeTab === t.id ? '#fff' : '#94a3b8', border:'none', borderRadius:'6px', padding:'8px 14px', fontSize:'0.85rem', fontWeight:'bold', cursor:'pointer', whiteSpace:'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ flex:1, overflowY:'auto', border:'1px solid #242b38', borderRadius:'8px', background:'#151922' }}>
          {loading ? (
            <div style={{ padding:'32px', textAlign:'center', color:'#94a3b8' }}>Loading leaderboard standings...</div>
          ) : currentRows.length === 0 ? (
            <div style={{ padding:'32px', textAlign:'center', color:'#94a3b8' }}>No records found for this category yet. Run your scraper cron to populate live data.</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.88rem', textAlign:'left' }}>
              <thead>
                <tr style={{ background:'#1b2230', color:'#38bdf8', borderBottom:'1px solid #2d3748' }}>
                  <th style={{ padding:'10px 14px' }}>Rank</th>
                  <th style={{ padding:'10px 14px' }}>Academy / Team</th>
                  <th style={{ padding:'10px 14px', textAlign:'center' }}>🥇 Gold</th>
                  <th style={{ padding:'10px 14px', textAlign:'center' }}>🥈 Silver</th>
                  <th style={{ padding:'10px 14px', textAlign:'center' }}>🥉 Bronze</th>
                  yle={{ padding:'10px 14px', textAlign:'right' }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom:'1px solid #1f2532', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding:'10px 14px', fontWeight:'bold', color:'#cbd5e1' }}>#{row.rank || idx + 1}</td>
                    <td style={{ padding:'10px 14px', color:'#fff', fontWeight:'500' }}>{row.academy || row.team || row.name}</td>
                    <td style={{ padding:'10px 14px', textAlign:'center', color:'#facc15' }}>{row.gold ?? '-'}</td>
                    <td style={{ padding:'10px 14px', textAlign:'center', color:'#e2e8f0' }}>{row.silver ?? '-'}</td>
                    <td style={{ padding:'10px 14px', textAlign:'center', color:'#fb923c' }}>{row.bronze ?? '-'}</td>
                    <td style={{ padding:'10px 14px', textAlign:'right', fontWeight:'bold', color:'#38bdf8' }}>{row.points ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export function AthleteSearchModal({ events, onClose, onOpenBracket }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qStr, setQStr] = useState('');

  useEffect(() => {
    getDocs(query(collection(db, 'event_competitors'), where('event_id', '==', '__athlete_index__')))
      .then(snap => {
        const all = [];
        snap.docs.forEach(d => (d.data().items || []).forEach(it => all.push(it)));
        setItems(all);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const evMap = React.useMemo(() => {
    const m = {};
    (events || []).forEach(e => { m[e.id] = e; });
    return m;
  }, [events]);

  const matches = React.useMemo(() => {
    const raw = qStr.toLowerCase().trim();
    if (raw.length < 2) return [];
    const terms = raw.split(/\s+/).filter(Boolean);
    return items
      .filter(it => {
        if (!evMap[it.e]) return false;
        const target = `${it.n} ${it.a}`.toLowerCase();
        return terms.every(t => target.includes(t));
      })
      .sort((a, b) => (evMap[a.e]?.sort_date || '2099').localeCompare(evMap[b.e]?.sort_date || '2099'))
      .slice(0, 100);
  }, [items, qStr, evMap]);

  const box = { position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.86)', zIndex:9999, display:'flex', justifyContent:'center', alignItems:'center', padding:'16px' };
  const card = { backgroundColor:'#11141b', padding:'22px', borderRadius:'12px', border:'1px solid #2d3748', width:'100%', maxWidth:'820px', maxHeight:'88vh', display:'flex', flexDirection:'column' };

  return (
    <div onClick={onClose} style={box}><div onClick={e => e.stopPropagation()} style={card}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px', gap:'12px' }}>
        <div>
          <h2 style={{ margin:0, color:'#fff', fontSize:'1.3rem' }}>🔍 Who's Registered? — Athlete & Gym Lookup</h2>
          <p style={{ margin:'4px 0 0', color:'#94a3b8', fontSize:'0.82rem' }}>
            {loading ? 'Loading live rosters...' : `Search ${items.length.toLocaleString()} live registrations across upcoming tournaments by athlete name or gym/team (e.g. Carlson Gracie, AOJ).`}
          </p>
        </div>
        <button onClick={onClose} style={{ background:'#1e293b', color:'#fff', border:'1px solid #334155', borderRadius:'6px', padding:'6px 12px', cursor:'pointer', height:'fit-content' }}>Close</button>
      </div>
      <input autoFocus value={qStr} onChange={e => setQStr(e.target.value)} placeholder="Type athlete name or gym/academy (e.g. Carlson Gracie San Antonio)..." style={{ padding:'11px 14px', borderRadius:'8px', background:'#181c24', color:'#fff', border:'1px solid #38bdf8', fontSize:'0.95rem', marginBottom:'12px' }} />
      <div style={{ overflowY:'auto', border:'1px solid #242b38', borderRadius:'8px', backnd:'#151922' }}>
        {qStr.trim().length < 2 ? (
          <div style={{ padding:'28px', textAlign:'center', color:'#64748b', fontSize:'0.9rem' }}>Enter at least 2 characters to search athletes or entire gyms across upcoming events.</div>
        ) : matches.length === 0 ? (
          <div style={{ padding:'28px', textAlign:'center', color:'#94a3b8', fontSize:'0.9rem' }}>No registrations found matching "{qStr}".</div>
        ) : matches.map((m, i) => {
          const ev = evMap[m.e];
          const externalLink = m.link || ev?.link || (ev?.platform === 'smoothcomp' ? 'https://smoothcomp.com' : 'https://jits.gg');
          return (
            <div key={`${m.e}_${m.n}_${i}`} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 15px', borderBottom:'1px solid #1f2532', gap:'10px', flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:'220px' }}>
                <div style={{ color:'#fff', fontWeight:'bold', fontSize:'0.96rem' }}>{m.n} <span style={{ color:'#38bdf8', fontWeight:'normal', fontSize:'0.84rem' }}>· {m.a || 'Independent'}</span></div>
                <div style={{ color:'#cbd5e1', fontSize:'0.8rem', marginTop:'2px' }}>{m.d}</div>
                <div style={{ color:'#ff9f43', fontSize:'0.8rem', marginTop:'3px' }}>📅 {ev.date} · <strong>{ev.name}</strong></div>
              </div>
              <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                <button onClick={() => onOpenBracket(ev, m.n)} style={{ background:'#1e293b', color:'#38bdf8', border:'1px solid #0284c7', borderRadius:'6px', padding:'7px 12px', fontWeight:'bold', cursor:'pointer', fontSize:'0.82rem' }}>View Bracket →</button>
                <a href={externalLink} target="_blank" rel="noopener noreferrer" title="Open official bracket on platform" style={{ background:'#1e293b', color:'#cbd5e1', border:'1px solid #334155', borderRadius:'6px', padding:'7px 10px', fontSize:'0.82rem', textDecoration:'none' }}>🔗 External</a>
              </div>
      div>
          );
        })}
      </div>
    </div></div>
  );
}
