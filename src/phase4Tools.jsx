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

const bucketOfKey = (k) => (k && k[0] >= 'a' && k[0] <= 'z' ? k[0] : '0');

export function LeaderboardModal({ onClose }) {
  const [rows, setRows] = useState([]);
  const [fed, setFed] = useState('ALL');
  const [age, setAge] = useState('ALL');
  const [qStr, setQStr] = useState('');
  const [expandedKey, setExpandedKey] = useState(null);
  const [medalFilter, setMedalFilter] = useState('ALL');
  const [bucketMap, setBucketMap] = useState({});
  const [rosterCache, setRosterCache] = useState(null);
  const [loadingBucket, setLoadingBucket] = useState('');

  useEffect(() => {
    getDocs(query(collection(db, 'event_competitors'), where('event_id', '==', '__global_leaderboard__')))
      .then(snap => {
        const flat = [];
        snap.docs.forEach(d => {
          const data = d.data() || {};
          if (Array.isArray(data.items)) data.items.forEach(it => flat.push(it));
          else if (data.Academy) flat.push(data);
        });
        setRows(flat);
      });
  }, []);

  const loadGymBucket = async (gymKey) => {
    const bkt = bucketOfKey(gymKey);
    const needBucket = !bucketMap[bkt];
    const needRoster = rosterCache === null;
    if (!needBucket && !needRoster) return;
    setLoadingBucket(bkt);
    try {
      const tasks = [
        needBucket
          ? getDocs(query(collection(db, 'event_competitors'), where('event_id', '==', `__medalists_${bkt}__`)))
          : Promise.resolve(null),
        needRoster
          ? getDocs(query(collection(db, 'event_competitors'), where('event_id', '==', '__athlete_index__')))
          : Promise.resolve(null)
      ];
      const [mSnap, rSnap] = await Promise.all(tasks);
      if (mSnap) {
        const mItems = [];
        mSnap.docs.forEach(d => (d.data().items || []).forEach(it => mItems.push(it)));
        setBucketMap(prev => ({ ...prev, [bkt]: mItems }));
      }
      if (rSnap) {
        const rItems = [];
        rSnap.docs.forEach(d => (d.data().items || []).forEach(it => rItems.push(it)));
        setRosterCache(rItems);
      }
    } catch (e) {
      console.warn('Bucket fetch warn:', e);
      if (needBucket) setBucketMap(prev => ({ ...prev, [bkt]: [] }));
      if (needRoster) setRosterCache([]);
    } finally {
      setLoadingBucket('');
    }
  };

  const toggleGym = (gymKey, clickedMedal = 'ALL') => {
    loadGymBucket(gymKey);
    if (expandedKey === gymKey && medalFilter === clickedMedal) {
      setExpandedKey(null);
    } else {
      setExpandedKey(gymKey);
      setMedalFilter(clickedMedal);
    }
  };

  const aggregated = React.useMemo(() => {
    const map = {};
    const scClubs = [];
    rows.forEach(r => {
      const b = (r.Board || '').toLowerCase();
      if (b === 'smoothcomp_clubs') { scClubs.push(r); return; }
      const rFed = b.startsWith('ibjjf') ? 'IBJJF'
        : b.startsWith('adcc') ? 'ADCC'
        : b.startsWith('agf') ? 'AGF'
        : b.startsWith('ajp') ? 'AJP'
        : b.startsWith('smoothcomp') ? 'SMOOTHCOMP'
        : 'JJWL';
      const rAge = b.includes('youth') ? 'YOUTH' : 'ADULT';
      if ((fed !== 'ALL' && rFed !== fed) || (age !== 'ALL' && rAge !== age)) return;
      const k = normGymKey(r.Academy);
      if (!k) return;
      if (!map[k]) map[k] = {
        key: k, Academy: r.Academy, Gold: 0, Silver: 0, Bronze: 0, Subs: 0,
        Points: 0, YouthMedals: 0, AdultMedals: 0, Feds: new Set(), hasMedals: false,
        scG: 0, scS: 0, scB: 0
      };
      const g = Number(r.Gold || 0), sv = Number(r.Silver || 0), br = Number(r.Bronze || 0);
      if (r.Gold !== undefined) map[k].hasMedals = true;
      map[k].Gold += g; map[k].Silver += sv; map[k].Bronze += br;
      if (rFed === 'SMOOTHCOMP') { map[k].scG += g; map[k].scS += sv; map[k].scB += br; }
      map[k].Subs += Number(r.Subs || 0);
      map[k].Points = Math.round((map[k].Points + Number(r.Points || 0)) * 10) / 10;
      if (rAge === 'YOUTH') map[k].YouthMedals += (g + sv + br);
      else map[k].AdultMedals += (g + sv + br);
      map[k].Feds.add(rFed);
    });

    // Merge verified Smoothcomp US Club Directory totals without double-counting Smoothcomp event toplists
    if ((fed === 'ALL' || fed === 'SMOOTHCOMP') && age === 'ALL') {
      scClubs.forEach(r => {
        const k = normGymKey(r.Academy);
        if (!k) return;
        const cg = Number(r.Gold || 0), cs = Number(r.Silver || 0), cb = Number(r.Bronze || 0);
        if (cg + cs + cb === 0) return;
        if (!map[k]) {
          map[k] = {
            key: k, Academy: r.Academy, Gold: cg, Silver: cs, Bronze: cb, Subs: 0,
            Points: cg * 9 + cs * 3 + cb, YouthMedals: 0, AdultMedals: 0,
            ClubMedals: cg + cs + cb, Feds: new Set(['SMOOTHCOMP']), hasMedals: true,
            scG: cg, scS: cs, scB: cb
          };
        } else {
          const dg = Math.max(0, cg - map[k].scG);
          const ds = Math.max(0, cs - map[k].scS);
          const db2 = Math.max(0, cb - map[k].scB);
          map[k].Gold += dg; map[k].Silver += ds; map[k].Bronze += db2;
          map[k].Points = Math.round((map[k].Points + dg * 9 + ds * 3 + db2) * 10) / 10;
          map[k].ClubMedals = (map[k].ClubMedals || 0) + dg + ds + db2;
          map[k].Feds.add('SMOOTHCOMP');
          map[k].hasMedals = true;
        }
      });
    }
    const score = x => (x.Gold * 9 + x.Silver * 3 + x.Bronze) + x.Points * 0.05;
    const rankedAll = Object.values(map)
      .sort((a, b) => score(b) - score(a) || b.Points - a.Points)
      .map((item, idx) => ({ ...item, trueRank: idx + 1 }));

    const q = qStr.trim().toLowerCase();
    if (!q) return { totalGyms: rankedAll.length, list: rankedAll.slice(0, 80), parentHint: false };

    const tokens = q.split(/\s+/).filter(Boolean);
    const direct = rankedAll.filter(x => {
      const low = x.Academy.toLowerCase();
      return low.includes(q) || tokens.every(t => low.includes(t));
    });

    // If someone searches e.g. "Carlson Gracie San Antonio" and IBJJF groups affiliates under "Carlson Gracie Team",
    // also surface matching parent association teams right underneath!
    if (direct.length < 5 && tokens.length >= 2) {
      const prefix2 = tokens.slice(0, 2).join(' ');
      const seenK = new Set(direct.map(d => d.key));
      const parents = rankedAll.filter(x => !seenK.has(x.key) && x.Academy.toLowerCase().startsWith(prefix2)).slice(0, 12);
      return { totalGyms: rankedAll.length, list: [...direct, ...parents].slice(0, 100), parentHint: direct.length === 0 && parents.length > 0 };
    }
    return { totalGyms: rankedAll.length, list: direct.slice(0, 120), parentHint: false };
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
              Search all {aggregated.totalGyms.toLocaleString()} medaling academies worldwide — tap any gym or 🥇/🥈/🥉 badge for athlete results.
            </p>
          </div>
          <button onClick={onClose} style={{ background:'#1e293b', color:'#fff', border:'1px solid #475569', borderRadius:'6px', padding:'6px 11px', cursor:'pointer', fontWeight:'bold', fontSize:'0.84rem', flexShrink:0 }}>✕ Close</button>
        </div>

        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'10px', alignItems:'center', flexShrink:0 }}>
          {[['ALL','🌐 All Circuits'],['IBJJF','IBJJF'],['ADCC','ADCC'],['JJWL','JJWL'],['AGF','AGF'],['AJP','AJP'],['SMOOTHCOMP','Smoothcomp']].map(([k, lbl]) => (
            <button key={k} onClick={() => setFed(k)} style={{ padding:'6px 10px', borderRadius:'6px', border: fed === k ? '1px solid #38bdf8' : '1px solid #2d3748', background: fed === k ? '#162536' : '#181c24', color: fed === k ? '#38bdf8' : '#cbd5e1', fontWeight:'bold', fontSize:'0.78rem', cursor:'pointer' }}>{lbl}</button>
          ))}
          {[['ALL','All Ages'],['YOUTH','🐯 Youth'],['ADULT','🥋 Adult']].map(([ak, albl]) => (
            <button key={ak} onClick={() => setAge(ak)} style={{ padding:'6px 9px', borderRadius:'6px', border:'1px solid #2d3748', background: age === ak ? '#2d3748' : '#181c24', color: age === ak ? '#fff' : '#94a3b8', fontSize:'0.76rem', fontWeight:'bold', cursor:'pointer' }}>{albl}</button>
          ))}
          <input value={qStr} onChange={e => setQStr(e.target.value)} placeholder="Search any academy..." style={{ flex:'1 1 130px', minWidth:'120px', padding:'7px 10px', borderRadius:'6px', background:'#181c24', color:'#fff', border:'1px solid #2d3748', fontSize:'0.85rem', boxSizing:'border-box' }} />
        </div>

        {aggregated.parentHint && (
          <div style={{ background:'#162032', border:'1px solid #2b4c7e', borderRadius:'6px', padding:'7px 10px', marginBottom:'8px', fontSize:'0.76rem', color:'#cbd5e1', flexShrink:0 }}>
            💡 Note: IBJJF groups local chapters under their parent association banner (shown below) — tap the parent team to search individual medalists!
          </div>
        )}

        <div style={{ overflowY:'auto', border:'1px solid #242b38', borderRadius:'8px', background:'#151922', flex:1 }}>
          {aggregated.list.map((r) => {
            const i = r.trueRank - 1;
            const isOpen = expandedKey === r.key;
            const bkt = bucketOfKey(r.key);
            const bktItems = bucketMap[bkt] || [];
            const isLoadingThis = isOpen && (loadingBucket === bkt || !bucketMap[bkt]);

            const gymMedalists = isOpen && bucketMap[bkt]
              ? bktItems.filter(m =>
                  normGymKey(m.a) === r.key &&
                  (fed === 'ALL' || m.f === fed) &&
                  (age === 'ALL' || !m.ag || m.ag === age) &&
                  (medalFilter === 'ALL' || Number(m.p) === Number(medalFilter))
                )
              : [];

            const gymUpcoming = isOpen && rosterCache
              ? rosterCache.filter(c => normGymKey(c.a) === r.key).slice(0, 30)
              : [];

            return (
              <div key={`${r.key}_${r.trueRank}`} style={{ borderBottom:'1px solid #1f2532' }}>
                <div
                  onClick={() => toggleGym(r.key, 'ALL')}
                  style={{
                    display:'flex', flexDirection:'column', gap:'6px',
                    padding:'11px 12px', cursor:'pointer',
                    backgroundColor: isOpen ? '#1a2230' : 'transparent'
                  }}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px' }}>
                    <div style={{ display:'flex', alignItems:'baseline', gap:'7px', minWidth:0, flex:1 }}>
                      <strong style={{ color: i < 3 ? '#facc15' : '#64748b', fontSize:'0.9rem', flexShrink:0 }}>#{r.trueRank}</strong>
                      <strong style={{ color:'#fff', fontSize:'0.96rem', lineHeight:1.3, wordBreak:'break-word' }}>{r.Academy}</strong>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', flexShrink:0 }}>
                      <span style={{ color:'#34d399', fontWeight:'bold', fontSize:'0.85rem', whiteSpace:'nowrap' }}>{r.Points.toLocaleString()} pts</span>
                      <span style={{ color:'#64748b', fontSize:'0.75rem' }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'6px' }}>
                    <div style={{ display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap' }}>
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
                        {age === 'YOUTH' ? `🐯 ${r.YouthMedals}` : age === 'ADULT' ? `🥋 ${r.AdultMedals}` : (r.YouthMedals + r.AdultMedals > 0 ? `🐯 ${r.YouthMedals} · 🥋 ${r.AdultMedals}` : `🏅 ${r.Gold + r.Silver + r.Bronze} Verified Club Medals`)}
                      </span>
                    </div>
                    <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                      {Array.from(r.Feds).map(f => (
                        <span key={f} style={{ fontSize:'0.65rem', padding:'2px 6px', borderRadius:'4px', background:'#1e293b', color:'#94a3b8', fontWeight:'600' }}>{f}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div style={{ background:'#0e1218', borderTop:'1px solid #242b38', padding:'12px' }}>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', alignItems:'center', justifyContent:'space-between', background:'#141a24', border:'1px solid #222c3c', borderRadius:'6px', padding:'8px 10px', marginBottom:'10px', fontSize:'0.78rem', color:'#cbd5e1' }}>
                      <span>
                        <strong>2026 Verified Tally:</strong> 🥇 {r.Gold} · 🥈 {r.Silver} · 🥉 {r.Bronze} ({r.YouthMedals} Youth / {r.AdultMedals} Adult){r.Subs > 0 ? ` · 🔥 ${r.Subs} Submissions` : ''}
                      </span>
                      <div style={{ display:'flex', gap:'4px' }}>
                        {[['ALL','All'],[1,'🥇'],[2,'🥈'],[3,'🥉']].map(([mf, mlbl]) => (
                          <button
                            key={mf}
                            type="button"
                            onClick={() => setMedalFilter(mf)}
                            style={{
                              padding:'3px 8px', borderRadius:'5px', fontSize:'0.73rem', cursor:'pointer', fontWeight:'bold',
                              background: medalFilter === mf ? '#0284c7' : '#181c24',
                              color: '#fff', border: medalFilter === mf ? '1px solid #38bdf8' : '1px solid #2d3748'
                            }}
                          >
                            {mlbl}
                          </button>
                        ))}
                      </div>
                    </div>

                    {isLoadingThis ? (
                      <div style={{ color:'#38bdf8', fontSize:'0.8rem', padding:'6px 0' }}>Loading verified podium records...</div>
                    ) : (
                      <>
                        {gymMedalists.length > 0 ? (
                          <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginBottom: gymUpcoming.length > 0 ? '12px' : 0 }}>
                            {gymMedalists.slice(0, 120).map((m, idx) => (
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
                          <div style={{ color:'#94a3b8', fontSize:'0.77rem', background:'#141922', border:'1px solid #1f2735', borderRadius:'6px', padding:'8px 10px', marginBottom: gymUpcoming.length > 0 ? '10px' : 0, lineHeight:1.45 }}>
                            Official team medal totals verified via {Array.from(r.Feds).join(' & ')} — individual athlete division podiums appear automatically for IBJJF & public Smoothcomp athlete rankings.
                          </div>
                        )}

                        {medalFilter === 'ALL' && gymUpcoming.length > 0 && (
                          <div>
                            <div style={{ color:'#ff9f43', fontSize:'0.76rem', fontWeight:'bold', marginBottom:'6px' }}>
                              🥋 Active Competitors Registered in Upcoming Brackets ({gymUpcoming.length}{gymUpcoming.length === 30 ? '+' : ''})
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
