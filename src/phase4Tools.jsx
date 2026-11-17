import { trackEvent } from './analytics';
import { MatAlertModal, useWatchedAthletes } from './MatAlertModal';
import { resolveEventUrl } from './locationFmt';
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
    <div style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.88)', zIndex:10001, display:'flex', justifyContent:'center', alignItems:'center', padding:'12px', boxSizing:'border-box' }}>
      <div style={{ backgroundColor:'#111', border:'1px solid #444', borderRadius:'12px', padding:'12px', boxSizing:'border-box', maxWidth:'380px', width:'100%', textAlign:'center' }}>
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
const normGymKey = (raw) => {
  const k = (raw || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return ({
    aoj: 'artofjiujitsu',
    atosjiujitsu: 'atos',
    carlsongracieteam: 'carlsongracie',
    gb: 'graciebarra',
    braziliantopteam: 'btt',
    checkmatbjj: 'checkmat',
    alliancebjj: 'alliance'
  })[k] || k;
};

const gymMatches = (targetKey, targetName, candidateRaw) => {
  const ck = normGymKey(candidateRaw);
  if (!ck || !targetKey) return false;
  if (ck === targetKey) return true;
  if (targetKey.length >= 5 && ck.includes(targetKey)) return true;
  if (ck.length >= 5 && targetKey.includes(ck)) return true;
  return false;
};

export function LeaderboardModal({ onClose }) {
  const [rows, setRows] = useState([]);
  const [fed, setFed] = useState('ALL');
  const [age, setAge] = useState('ALL');
  const [qStr, setQStr] = useState('');
  const [expandedKey, setExpandedKey] = useState(null);
  const [medalFilter, setMedalFilter] = useState('ALL');
  const [medalistsCache, setMedalistsCache] = useState(null);
  const [rosterCache, setRosterCache] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    getDocs(query(collection(db, 'event_competitors'), where('event_id', '==', '__global_leaderboard__')))
      .then(snap => setRows(snap.docs.map(d => d.data())));
  }, []);

  const ensureDetailsLoaded = async () => {
    if (medalistsCache !== null && rosterCache !== null) return;
    setLoadingDetail(true);
    try {
      const [mSnap, rSnap] = await Promise.all([
        getDocs(query(collection(db, 'event_competitors'), where('event_id', '==', '__academy_medalists__'))),
        getDocs(query(collection(db, 'event_competitors'), where('event_id', '==', '__athlete_index__')))
      ]);
      const mAll = [];
      mSnap.docs.forEach(d => (d.data().items || []).forEach(it => mAll.push(it)));
      const rAll = [];
      rSnap.docs.forEach(d => (d.data().items || []).forEach(it => rAll.push(it)));
      setMedalistsCache(mAll);
      setRosterCache(rAll);
    } catch (e) {
      console.warn('Detail fetch warn:', e);
      setMedalistsCache([]);
      setRosterCache([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  const toggleGym = (gymKey, clickedMedal = 'ALL') => {
    ensureDetailsLoaded();
    if (expandedKey === gymKey && medalFilter === clickedMedal) {
      setExpandedKey(null);
    } else {
      setExpandedKey(gymKey);
      setMedalFilter(clickedMedal);
    }
  };

  const aggregated = React.useMemo(() => {
    const map = {};
    rows.forEach(r => {
      const b = r.Board || '';
      const rFed = b.startsWith('ibjjf') ? 'IBJJF' : (b.startsWith('smoothcomp') ? 'SMOOTHCOMP' : 'JJWL');
      const rAge = b.includes('youth') ? 'YOUTH' : 'ADULT';
      if ((fed !== 'ALL' && rFed !== fed) || (age !== 'ALL' && rAge !== age)) return;
      const k = normGymKey(r.Academy);
      if (!k) return;
      if (!map[k]) map[k] = {
        key: k, Academy: r.Academy, Gold: 0, Silver: 0, Bronze: 0,
        Points: 0, YouthMedals: 0, AdultMedals: 0, Feds: new Set(), hasMedals: false
      };
      const g = Number(r.Gold || 0), sv = Number(r.Silver || 0), br = Number(r.Bronze || 0);
      if (r.Gold !== undefined) map[k].hasMedals = true;
      map[k].Gold += g; map[k].Silver += sv; map[k].Bronze += br;
      map[k].Points = Math.round((map[k].Points + Number(r.Points || 0)) * 10) / 10;
      if (rAge === 'YOUTH') map[k].YouthMedals += (g + sv + br);
      else map[k].AdultMedals += (g + sv + br);
      map[k].Feds.add(rFed);
    });
    const score = x => (x.Gold * 9 + x.Silver * 3 + x.Bronze) + x.Points * 0.05;
    return Object.values(map)
      .filter(x => !qStr || x.Academy.toLowerCase().includes(qStr.toLowerCase()))
      .sort((a, b) => score(b) - score(a) || b.Points - a.Points)
      .slice(0, 60);
  }, [rows, fed, age, qStr]);

  const box = { position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.86)', zIndex:9999, display:'flex', justifyContent:'center', alignItems:'center', padding:'10px', boxSizing:'border-box' };
  const card = { backgroundColor:'#11141b', padding:'14px', boxSizing:'border-box', overflowX:'hidden', borderRadius:'12px', border:'1px solid #2d3748', width:'100%', maxWidth:'900px', maxHeight:'88svh', display:'flex', flexDirection:'column', textAlign:'left' };

  return (
    <div onClick={onClose} style={box}>
      <div onClick={e => e.stopPropagation()} style={card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px', gap:'10px', flexShrink:0 }}>
          <div style={{ minWidth:0 }}>
            <h2 style={{ margin:0, color:'#fff', fontSize:'1.18rem', lineHeight:1.25 }}>🏆 2026 Academy Medal Standings</h2>
            <p style={{ margin:'4px 0 0', color:'#94a3b8', fontSize:'0.78rem', lineHeight:1.35 }}>
              Tap any academy or 🥇/🥈/🥉 badge to view individual medalists & active squad competitors.
            </p>
          </div>
          <button onClick={onClose} style={{ background:'#1e293b', color:'#fff', border:'1px solid #475569', borderRadius:'6px', padding:'6px 11px', cursor:'pointer', fontWeight:'bold', fontSize:'0.84rem', flexShrink:0 }}>✕ Close</button>
        </div>

        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'10px', alignItems:'center', flexShrink:0 }}>
          {[['ALL','🌐 All'],['JJWL','JJWL'],['IBJJF','IBJJF'],['SMOOTHCOMP','Smoothcomp']].map(([k, lbl]) => (
            <button key={k} onClick={() => { setFed(k); if (k === 'IBJJF') setAge('ALL'); }} style={{ padding:'6px 10px', borderRadius:'6px', border: fed === k ? '1px solid #38bdf8' : '1px solid #2d3748', background: fed === k ? '#162536' : '#181c24', color: fed === k ? '#38bdf8' : '#cbd5e1', fontWeight:'bold', fontSize:'0.78rem', cursor:'pointer' }}>{lbl}</button>
          ))}
          {[['ALL','All Ages'],['YOUTH','🐯 Youth'],['ADULT','🥋 Adult']].map(([ak, albl]) => (
            <button key={ak} disabled={fed === 'IBJJF' && ak === 'YOUTH'} onClick={() => setAge(ak)} style={{ padding:'6px 9px', borderRadius:'6px', border:'1px solid #2d3748', background: age === ak ? '#2d3748' : '#181c24', color: age === ak ? '#fff' : '#94a3b8', fontSize:'0.76rem', fontWeight:'bold', opacity: fed === 'IBJJF' && ak === 'YOUTH' ? 0.4 : 1, cursor:'pointer' }}>{albl}</button>
          ))}
          <input value={qStr} onChange={e => setQStr(e.target.value)} placeholder="Find academy..." style={{ flex:'1 1 130px', minWidth:'120px', padding:'7px 10px', borderRadius:'6px', background:'#181c24', color:'#fff', border:'1px solid #2d3748', fontSize:'0.85rem', boxSizing:'border-box' }} />
        </div>

        <div style={{ overflowY:'auto', border:'1px solid #242b38', borderRadius:'8px', background:'#151922', flex:1 }}>
          {aggregated.map((r, i) => {
            const isOpen = expandedKey === r.key;
            const gymMedalists = isOpen && medalistsCache
              ? medalistsCache.filter(m =>
                  gymMatches(r.key, r.Academy, m.a) &&
                  (fed === 'ALL' || m.f === fed) &&
                  (age === 'ALL' || !m.ag || m.ag === age) &&
                  (medalFilter === 'ALL' || Number(m.p) === Number(medalFilter))
                )
              : [];
            const gymUpcoming = isOpen && rosterCache
              ? rosterCache.filter(c => gymMatches(r.key, r.Academy, c.a)).slice(0, 25)
              : [];

            return (
              <div key={`${r.key}_${i}`} style={{ borderBottom:'1px solid #1f2532' }}>
                <div
                  onClick={() => toggleGym(r.key, 'ALL')}
                  style={{
                    display:'flex', flexDirection:'column', gap:'6px',
                    padding:'11px 12px', cursor:'pointer',
                    backgroundColor: isOpen ? '#1a2230' : 'transparent'
                  }}
                >
                  {/* Top Row: Rank + Full Academy Name + Points */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px' }}>
                    <div style={{ display:'flex', alignItems:'baseline', gap:'7px', minWidth:0, flex:1 }}>
                      <strong style={{ color: i < 3 ? '#facc15' : '#64748b', fontSize:'0.9rem', flexShrink:0 }}>#{i + 1}</strong>
                      <strong style={{ color:'#fff', fontSize:'0.96rem', lineHeight:1.3, wordBreak:'break-word' }}>{r.Academy}</strong>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', flexShrink:0 }}>
                      <span style={{ color:'#34d399', fontWeight:'bold', fontSize:'0.85rem', whiteSpace:'nowrap' }}>{r.Points.toLocaleString()} pts</span>
                      <span style={{ color:'#64748b', fontSize:'0.75rem' }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Second Row: Interactive Medal Buttons + Youth/Adult Breakdown + Circuit Chips */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'6px' }}>
                    <div style={{ display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap' }}>
                      {r.hasMedals ? (
                        <>
                          {[
                            [1, '🥇', r.Gold, '#eab308'],
                            [2, '🥈', r.Silver, '#94a3b8'],
                            [3, '🥉', r.Bronze, '#d97706']
                          ].map(([placeNum, icon, cnt, borderCol]) => {
                            const activePill = isOpen && Number(medalFilter) === placeNum;
                            return (
                              <button
                                key={placeNum}
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleGym(r.key, placeNum); }}
                                title="Tap to filter medalists"
                                style={{
                                  background: activePill ? '#263346' : '#11151d',
                                  border: activePill ? `1px solid ${borderCol}` : '1px solid #283142',
                                  borderRadius:'6px', padding:'3px 8px', color:'#fff',
                                  fontSize:'0.8rem', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:'4px'
                                }}
                              >
                                <span>{icon}</span><strong>{cnt}</strong>
                              </button>
                            );
                          })}
                          <span style={{ color:'#cbd5e1', fontSize:'0.73rem', background:'#1a202c', border:'1px solid #2d3748', padding:'2px 7px', borderRadius:'4px', whiteSpace:'nowrap' }}>
                            {age === 'YOUTH' ? `🐯 ${r.YouthMedals}` : age === 'ADULT' ? `🥋 ${r.AdultMedals}` : `🐯 ${r.YouthMedals} · 🥋 ${r.AdultMedals}`}
                          </span>
                        </>
                      ) : (
                        <span style={{ color:'#94a3b8', fontSize:'0.75rem' }}>Official IBJJF Season Points Ranking</span>
                      )}
                    </div>
                    <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                      {Array.from(r.Feds).map(f => (
                        <span key={f} style={{ fontSize:'0.65rem', padding:'2px 6px', borderRadius:'4px', background:'#1e293b', color:'#94a3b8', fontWeight:'600' }}>{f}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Expandable Medalist & Active Squad Drawer */}
                {isOpen && (
                  <div style={{ background:'#0e1218', borderTop:'1px solid #242b38', padding:'12px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'6px', marginBottom:'10px' }}>
                      <strong style={{ color:'#38bdf8', fontSize:'0.82rem' }}>
                        {r.Academy} — {medalFilter === 'ALL' ? 'Individual Medalists & Squad' : `${medalFilter === 1 ? '🥇 Gold' : medalFilter === 2 ? '🥈 Silver' : '🥉 Bronze'} Medalists`}
                      </strong>
                      <div style={{ display:'flex', gap:'4px' }}>
                        {[['ALL','All'],[1,'🥇'],[2,'🥈'],[3,'🥉']].map(([mf, mlbl]) => (
                          <button
                            key={mf}
                            type="button"
                            onClick={() => setMedalFilter(mf)}
                            style={{
                              padding:'3px 8px', borderRadius:'5px', fontSize:'0.74rem', cursor:'pointer', fontWeight:'bold',
                              background: medalFilter === mf ? '#0284c7' : '#181c24',
                              color: '#fff', border: medalFilter === mf ? '1px solid #38bdf8' : '1px solid #2d3748'
                            }}
                          >
                            {mlbl}
                          </button>
                        ))}
                      </div>
                    </div>

                    {loadingDetail ? (
                      <div style={{ color:'#94a3b8', fontSize:'0.8rem', padding:'8px 0' }}>Loading athlete podium records...</div>
                    ) : (
                      <>
                        {gymMedalists.length > 0 ? (
                          <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginBottom: gymUpcoming.length > 0 ? '12px' : 0 }}>
                            {gymMedalists.slice(0, 50).map((m, idx) => (
                              <div key={idx} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px', background:'#151b24', border:'1px solid #222b3a', borderRadius:'6px', padding:'7px 10px', fontSize:'0.8rem' }}>
                                <div style={{ minWidth:0 }}>
                                  <div style={{ color:'#fff', fontWeight:'bold', wordBreak:'break-word' }}>
                                    {Number(m.p) === 1 ? '🥇 ' : Number(m.p) === 2 ? '🥈 ' : '🥉 '}
                                    {m.n}
                                  </div>
                                  <div style={{ color:'#94a3b8', fontSize:'0.74rem', marginTop:'2px', wordBreak:'break-word' }}>
                                    {[m.d, m.ev].filter(Boolean).join(' • ')}
                                  </div>
                                </div>
                                {m.f && <span style={{ fontSize:'0.65rem', padding:'2px 5px', borderRadius:'4px', background:'#1e293b', color:'#cbd5e1', flexShrink:0 }}>{m.f}</span>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color:'#94a3b8', fontSize:'0.78rem', background:'#141922', border:'1px solid #1f2735', borderRadius:'6px', padding:'9px 10px', marginBottom: gymUpcoming.length > 0 ? '10px' : 0, lineHeight:1.45 }}>
                            {r.Feds.has('JJWL') && !r.Feds.has('SMOOTHCOMP') && !r.Feds.has('IBJJF')
                              ? 'JJWL publishes official academy medal totals directly via their season API without public per-athlete podium lists.'
                              : 'No individual podium finishers matched this filter yet — new Smoothcomp & IBJJF tournament podiums sync automatically after each weekend!'}
                          </div>
                        )}

                        {medalFilter === 'ALL' && gymUpcoming.length > 0 && (
                          <div>
                            <div style={{ color:'#ff9f43', fontSize:'0.76rem', fontWeight:'bold', marginBottom:'6px' }}>
                              🥋 Active Competitors Registered in Upcoming Brackets ({gymUpcoming.length}{gymUpcoming.length === 25 ? '+' : ''})
                            </div>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                              {gymUpcoming.map((c, ci) => (
                                <span key={ci} style={{ background:'#161d27', border:'1px solid #293446', borderRadius:'5px', padding:'4px 8px', fontSize:'0.74rem', color:'#e2e8f0' }}>
                                  <strong>{c.n}</strong>{c.d ? <span style={{ color:'#94a3b8' }}> · {c.d.split('/')[0].trim()}</span> : null}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AthleteSearchModal({ events, onClose, onOpenBracket }) {
  const [items, setItems] = useState([]);
  const [watchPick, setWatchPick] = useState(null);
  const { getWatch, removeWatch } = useWatchedAthletes();
  const [loading, setLoading] = useState(true);
  const [qStr, setQStr] = useState('');

  useEffect(() => {
    trackEvent('athleteSearches');
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
    const terms = qStr.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (terms.length === 0 || qStr.trim().length < 2) return [];
    return items
      .filter(it => evMap[it.e] && terms.every(t => { const raw = `${it.n} ${it.a}`.toLowerCase(); const ex = (raw.includes('art of jiu') ? ' aoj' : '') + (raw.includes('gracie barra') ? ' gb' : '') + (raw.includes('carlson gracie') ? ' cg' : '') + (raw.includes('brazilian top team') ? ' btt' : ''); return (raw + ex).includes(t); }))
      .sort((a, b) => (evMap[a.e]?.sort_date || '2099').localeCompare(evMap[b.e]?.sort_date || '2099'))
      .slice(0, 80);
  }, [items, qStr, evMap]);
  const box = { position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.86)', zIndex:9999, display:'flex', justifyContent:'center', alignItems:'center', padding:'10px', boxSizing:'border-box' };
  const card = { backgroundColor:'#11141b', padding:'16px', boxSizing:'border-box', overflowX:'hidden', borderRadius:'12px', border:'1px solid #2d3748', width:'100%', maxWidth:'900px', maxHeight:'88svh', display:'flex', flexDirection:'column' };

  return (
    <div onClick={onClose} style={box}><div onClick={e => e.stopPropagation()} style={card}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px', gap:'12px' }}>
        <div>
          <h2 style={{ margin:0, color:'#fff', fontSize:'1.3rem' }}>🔍 Who's Registered? — Athlete & Squad Lookup</h2>
          <p style={{ margin:'4px 0 0', color:'#94a3b8', fontSize:'0.82rem' }}>
            {loading ? 'Loading live rosters...' : `Search ${items.length.toLocaleString()} live registrations across upcoming IBJJF, JJWL & Smoothcomp tournaments.`}
          </p>
    </div>
        <button onClick={onClose} style={{ background:'#1e293b', color:'#fff', border:'1px solid #334155', borderRadius:'6px', padding:'6px 12px', cursor:'pointer', height:'fit-content' }}>Close</button>
      </div>
      <input autoFocus value={qStr} onChange={e => setQStr(e.target.value)} placeholder="Type an athlete name or academy (e.g. Carlson Gracie, Art of Jiu Jitsu)..." style={{ padding:'11px 14px', borderRadius:'8px', background:'#181c24', color:'#fff', border:'1px solid #38bdf8', fontSize:'0.95rem', marginBottom:'12px' }} />
      <div style={{ overflowY:'auto', border:'1px solid #242b38', borderRadius:'8px', background:'#151922' }}>
        {qStr.trim().length < 2 ? (
          <div style={{ padding:'28px', textAlign:'center', color:'#64748b', fontSize:'0.9rem' }}>Enter at least 2 characters to see every upcoming tournament an athlete or team is registered for.</div>
        ) : matches.length === 0 ? (
          <div style={{ padding:'28px', textAlign:'center', color:'#94a3b8', fontSize:'0.9rem' }}>No upcoming registrations found matching "{qStr}".</div>
        ) : matches.map((m, i) => {
          const ev = evMap[m.e];
          return (
            <div key={`${m.e}_${m.n}_${i}`} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 15px', borderBottom:'1px solid #1f2532', gap:'10px', flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:'220px' }}>
                <div style={{ color:'#fff', fontWeight:'bold', fontSize:'0.96rem' }}>{m.n} <span style={{ color:'#38bdf8', fontWeight:'normal', fontSize:'0.84rem' }}>· {m.a || 'Independent'}</span></div>
                <div style={{ color:'#cbd5e1', fontSize:'0.8rem', marginTop:'2px' }}>{m.d}</div>
                <div style={{ color:'#ff9f43', fontSize:'0.8rem', marginTop:'3px' }}>📅 {ev.date} · <strong>{ev.name}</strong></div>
              </div>
              <div style={{ display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap' }}><button onClick={() => setWatchPick({ ev, comp: { Name: m.n, Academy: m.a || '', Division: m.d || '', Profile: m.p || '' }, division: m.d || '' })} style={{ background: getWatch(m.n, ev.id) ? '#132a1c' : '#162536', color: getWatch(m.n, ev.id) ? '#2ecc71' : '#38bdf8', border: getWatch(m.n, ev.id) ? '1px solid #2ecc71' : '1px solid #0284c7', borderRadius:'6px', padding:'7px 10px', fontWeight:'bold', cursor:'pointer', fontSize:'0.8rem', whiteSpace:'nowrap' }}>{getWatch(m.n, ev.id) ? (getWatch(m.n, ev.id).fcmToken ? '\u2713 Watching \u{1F4F2}' : '\u2713 Watching \u2709\uFE0F') : '\u{1F514} Mat Alert'}</button><button onClick={() => onOpenBracket(ev, m.n)} style={{ background:'#1e293b', color:'#38bdf8', border:'1px solid #0284c7', borderRadius:'6px', padding:'7px 12px', fontWeight:'bold', cursor:'pointer', fontSize:'0.82rem' }}>View Bracket →</button>{m.p && m.p !== '#' && (<a href={m.p.startsWith('http') ? m.p : 'https://smoothcomp.com' + (m.p.startsWith('/') ? m.p : '/' + m.p)} target='_blank' rel='noopener noreferrer' style={{ background:'#181c24', color:'#a78bfa', border:'1px solid #4c1d95', borderRadius:'6px', padding:'7px 9px', fontSize:'0.78rem', textDecoration:'none', fontWeight:'bold' }}>{m.p.includes('jits.gg') ? 'Jits.gg ↗' : 'Profile ↗'}</a>)}{(() => { let u = ''; try { const r = typeof resolveEventUrl === 'function' ? resolveEventUrl(ev) : ''; u = typeof r === 'string' && r ? r : String(ev?.link || ev?.url || ''); } catch { u = String(ev?.link || ev?.url || ''); } return u.startsWith('http') ? (<a href={u.includes('smoothcomp.com') ? u.replace(/\/$/, '') + '/schedule' : u} target='_blank' rel='noopener noreferrer' style={{ background:'#181c24', color:'#cbd5e1', border:'1px solid #38bdf8', borderRadius:'6px', padding:'7px 9px', fontSize:'0.78rem', textDecoration:'none', fontWeight:'bold' }}>Official ↗</a>) : null; })()}</div>
            </div>
          );
        })}
      </div>
      {watchPick && (
        <MatAlertModal
          event={watchPick.ev}
          comp={watchPick.comp}
          division={watchPick.division}
          existingWatch={getWatch(watchPick.comp.Name, watchPick.ev.id)}
          onRemove={removeWatch}
          onClose={() => setWatchPick(null)}
        />
      )}
    </div></div>
  );
}
