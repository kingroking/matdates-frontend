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

const athLastBucket = (qRaw) => {
  const cleaned = (qRaw || '').toLowerCase().replace(/\b(jr\.?|sr\.?|ii|iii|iv)\b/g, '').trim();
  const parts = cleaned.split(/\s+/).map(p => p.replace(/[^a-z0-9]/g, '')).filter(Boolean);
  if (!parts.length) return '';
  const ch = parts[parts.length - 1][0];
  return ch >= 'a' && ch <= 'z' ? ch : '0';
};

const athleteMatchesQuery = (recName, qRaw) => {
  const nl = (recName || '').toLowerCase().trim();
  const q = (qRaw || '').toLowerCase().trim();
  if (!q || !nl) return false;
  if (nl.includes(q)) return true;
  const qParts = q.split(/\s+/).filter(Boolean);
  if (qParts.every(t => nl.includes(t))) return true;
  // Match full youth name e.g. "Isabella King" -> IBJJF youth format "I. King"
  if (qParts.length >= 2) {
    const abbrev = `${qParts[0][0]}. ${qParts[qParts.length - 1]}`;
    if (nl === abbrev || nl.startsWith(`${qParts[0][0]}. `) && nl.endsWith(` ${qParts[qParts.length - 1]}`)) return true;
  }
  return false;
};

export function LeaderboardModal({ onClose }) {
  const [rows, setRows] = useState([]);
  const [mode, setMode] = useState('GYMS'); // 'GYMS' | 'ATHLETES'
  const [fed, setFed] = useState('ALL');
  const [age, setAge] = useState('ALL');
  const [qStr, setQStr] = useState('');
  const [athQuery, setAthQuery] = useState('');
  const [selectedGymKey, setSelectedGymKey] = useState(null);
  const [medalFilter, setMedalFilter] = useState('ALL');
  const [bucketMap, setBucketMap] = useState({});
  const [athShardMap, setAthShardMap] = useState({});
  const [rosterCache, setRosterCache] = useState(null);
  const [loadingBucket, setLoadingBucket] = useState('');
  const [loadingAthShard, setLoadingAthShard] = useState('');

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
      const [mSnap, rSnap] = await Promise.all([
        needBucket ? getDocs(query(collection(db, 'event_competitors'), where('event_id', '==', `__medalists_${bkt}__`))) : Promise.resolve(null),
        needRoster ? getDocs(query(collection(db, 'event_competitors'), where('event_id', '==', '__athlete_index__'))) : Promise.resolve(null)
      ]);
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
    } finally {
      setLoadingBucket('');
    }
  };

  useEffect(() => {
    if (mode !== 'ATHLETES') return;
    const trimmed = athQuery.trim();
    if (trimmed.length < 2) return;
    const bkt = athLastBucket(trimmed);
    if (!bkt || athShardMap[bkt]) return;
    setLoadingAthShard(bkt);
    getDocs(query(collection(db, 'event_competitors'), where('event_id', '==', `__ath_medals_${bkt}__`)))
      .then(snap => {
        const arr = [];
        snap.docs.forEach(d => (d.data().items || []).forEach(it => arr.push(it)));
        setAthShardMap(prev => ({ ...prev, [bkt]: arr }));
      })
      .catch(() => setAthShardMap(prev => ({ ...prev, [bkt]: [] })))
      .finally(() => setLoadingAthShard(''));
  }, [mode, athQuery, athShardMap]);

  const openTrophyRoom = (gymKey, initMedal = 'ALL') => {
    setSelectedGymKey(gymKey);
    setMedalFilter(initMedal);
    loadGymBucket(gymKey);
  };

  const aggregated = React.useMemo(() => {
    const map = {};
    const scClubs26 = [];
    rows.forEach(r => {
      const b = (r.Board || '').toLowerCase();
      if (b === 'smoothcomp_clubs') return; // skip legacy lifetime-inflated rows
      if (b === 'smoothcomp_clubs_2026') { scClubs26.push(r); return; }
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
        Points: 0, YouthMedals: 0, AdultMedals: 0, Feds: new Set(),
        scG: 0, scS: 0, scB: 0, allTimeClub: null
      };
      const g = Number(r.Gold || 0), sv = Number(r.Silver || 0), br = Number(r.Bronze || 0);
      map[k].Gold += g; map[k].Silver += sv; map[k].Bronze += br;
      if (rFed === 'SMOOTHCOMP') { map[k].scG += g; map[k].scS += sv; map[k].scB += br; }
      map[k].Subs += Number(r.Subs || 0);
      map[k].Points = Math.round((map[k].Points + Number(r.Points || 0)) * 10) / 10;
      if (rAge === 'YOUTH') map[k].YouthMedals += (g + sv + br);
      else map[k].AdultMedals += (g + sv + br);
      map[k].Feds.add(rFed);
    });

    scClubs26.forEach(r => {
      const k = normGymKey(r.Academy);
      if (!k) return;
      const allT = (Number(r.AllTimeGold || 0) + Number(r.AllTimeSilver || 0) + Number(r.AllTimeBronze || 0)) > 0
        ? { g: Number(r.AllTimeGold || 0), s: Number(r.AllTimeSilver || 0), b: Number(r.AllTimeBronze || 0) }
        : null;
      if ((fed === 'ALL' || fed === 'SMOOTHCOMP') && age === 'ALL') {
        const cg = Number(r.Gold || 0), cs = Number(r.Silver || 0), cb = Number(r.Bronze || 0);
        if (!map[k] && (cg + cs + cb > 0 || allT)) {
          map[k] = {
            key: k, Academy: r.Academy, Gold: cg, Silver: cs, Bronze: cb, Subs: 0,
            Points: cg * 9 + cs * 3 + cb, YouthMedals: 0, AdultMedals: 0,
            Feds: new Set(['SMOOTHCOMP']), scG: cg, scS: cs, scB: cb, allTimeClub: allT
          };
        } else if (map[k]) {
          const dg = Math.max(0, cg - map[k].scG);
          const ds = Math.max(0, cs - map[k].scS);
          const db2 = Math.max(0, cb - map[k].scB);
          map[k].Gold += dg; map[k].Silver += ds; map[k].Bronze += db2;
          map[k].Points = Math.round((map[k].Points + dg * 9 + ds * 3 + db2) * 10) / 10;
          map[k].Feds.add('SMOOTHCOMP');
          if (allT) map[k].allTimeClub = allT;
        }
      } else if (map[k] && allT) {
        map[k].allTimeClub = allT;
      }
    });

    const score = x => (x.Gold * 9 + x.Silver * 3 + x.Bronze) + x.Points * 0.05;
    const rankedAll = Object.values(map)
      .filter(x => (x.Gold + x.Silver + x.Bronze) > 0 || x.Points > 0 || x.allTimeClub)
      .sort((a, b) => score(b) - score(a) || b.Points - a.Points)
      .map((item, idx) => ({ ...item, trueRank: idx + 1 }));

    const byKey = {};
    rankedAll.forEach(x => { byKey[x.key] = x; });

    const q = qStr.trim().toLowerCase();
    if (!q) return { totalGyms: rankedAll.length, list: rankedAll.slice(0, 80), byKey };

    const tokens = q.split(/\s+/).filter(Boolean);
    const direct = rankedAll.filter(x => {
      const low = x.Academy.toLowerCase();
      return low.includes(q) || tokens.every(t => low.includes(t));
    });
    if (direct.length < 5 && tokens.length >= 2) {
      const prefix2 = tokens.slice(0, 2).join(' ');
      const seenK = new Set(direct.map(d => d.key));
      const parents = rankedAll.filter(x => !seenK.has(x.key) && x.Academy.toLowerCase().startsWith(prefix2)).slice(0, 10);
      return { totalGyms: rankedAll.length, list: [...direct, ...parents].slice(0, 100), byKey };
    }
    return { totalGyms: rankedAll.length, list: direct.slice(0, 120), byKey };
  }, [rows, fed, age, qStr]);

  const athleteResults = React.useMemo(() => {
    const trimmed = athQuery.trim();
    if (trimmed.length < 2) return [];
    const bkt = athLastBucket(trimmed);
    const pool = athShardMap[bkt] || [];
    const hits = pool.filter(m =>
      athleteMatchesQuery(m.n, trimmed) &&
      (fed === 'ALL' || m.f === fed) &&
      (age === 'ALL' || !m.ag || m.ag === age)
    );
    // Group by Athlete + Academy for a clean trophy summary
    const grouped = {};
    hits.forEach(m => {
      const gk = `${m.n.toLowerCase()}|${normGymKey(m.a)}`;
      if (!grouped[gk]) grouped[gk] = { name: m.n, academy: m.a, g: 0, s: 0, b: 0, events: [] };
      if (Number(m.p) === 1) grouped[gk].g += 1;
      else if (Number(m.p) === 2) grouped[gk].s += 1;
      else grouped[gk].b += 1;
      grouped[gk].events.push(m);
    });
    return Object.values(grouped)
      .sort((a, b) => (b.g * 9 + b.s * 3 + b.b) - (a.g * 9 + a.s * 3 + a.b))
      .slice(0, 80);
  }, [athQuery, athShardMap, fed, age]);

  const activeGym = selectedGymKey ? aggregated.byKey[selectedGymKey] : null;
  const box = { position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.86)', zIndex:9999, display:'flex', justifyContent:'center', alignItems:'center', padding:'10px', boxSizing:'border-box' };
  const card = { backgroundColor:'#11141b', padding:'14px', boxSizing:'border-box', overflowX:'hidden', borderRadius:'12px', border:'1px solid #2d3748', width:'100%', maxWidth:'900px', maxHeight:'88svh', display:'flex', flexDirection:'column', textAlign:'left' };

  // Dedicated Full-View Academy Trophy Room when a gym is clicked!
  if (activeGym) {
    const bkt = bucketOfKey(activeGym.key);
    const rawItems = bucketMap[bkt] || [];
    const isLoading = loadingBucket === bkt || !bucketMap[bkt];
    const matchingAll = rawItems.filter(m =>
      normGymKey(m.a) === activeGym.key &&
      (fed === 'ALL' || m.f === fed) &&
      (age === 'ALL' || !m.ag || m.ag === 'ALL' || m.ag === age)
    );
    const indivList = matchingAll.filter(m => !m.isEventSummary && (medalFilter === 'ALL' || Number(m.p) === Number(medalFilter)));
    const eventSummaries = matchingAll.filter(m => m.isEventSummary && (
      medalFilter === 'ALL' ||
      (Number(medalFilter) === 1 && m.eg > 0) ||
      (Number(medalFilter) === 2 && m.es > 0) ||
      (Number(medalFilter) === 3 && m.eb > 0)
    ));
    const gymUpcoming = rosterCache ? rosterCache.filter(c => normGymKey(c.a) === activeGym.key).slice(0, 35) : [];

    // Find parent association key if this is a local affiliate (e.g. Carlson Gracie San Antonio -> carlsongracie)
    const parentKey = ['carlsongracie', 'graciebarra', 'alliance', 'checkmat', 'atos', 'ares'].find(
      pk => activeGym.key.startsWith(pk) && activeGym.key !== pk && aggregated.byKey[pk]
    );

    return (
      <div onClick={onClose} style={box}>
        <div onClick={e => e.stopPropagation()} style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'8px', marginBottom:'12px', flexShrink:0 }}>
            <button
              onClick={() => setSelectedGymKey(null)}
              style={{ background:'#1e293b', color:'#38bdf8', border:'1px solid #38bdf8', borderRadius:'6px', padding:'7px 12px', cursor:'pointer', fontWeight:'bold', fontSize:'0.84rem' }}
            >
              ← Back to Standings
            </button>
            <button onClick={onClose} style={{ background:'#1e293b', color:'#fff', border:'1px solid #475569', borderRadius:'6px', padding:'7px 12px', cursor:'pointer', fontWeight:'bold', fontSize:'0.84rem' }}>
              ✕ Close
            </button>
          </div>

          <div style={{ background:'#161d29', border:'1px solid #2b384e', borderRadius:'10px', padding:'12px 14px', marginBottom:'12px', flexShrink:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px', flexWrap:'wrap' }}>
              <div>
                <div style={{ color:'#facc15', fontSize:'0.78rem', fontWeight:'bold' }}>GLOBAL RANK #{activeGym.trueRank}</div>
                <h2 style={{ margin:'2px 0 6px', color:'#fff', fontSize:'1.2rem', wordBreak:'break-word' }}>{activeGym.Academy}</h2>
                <div style={{ display:'flex', gap:'5px', flexWrap:'wrap', alignItems:'center' }}>
                  {Array.from(activeGym.Feds).map(f => (
                    <span key={f} style={{ fontSize:'0.68rem', padding:'2px 7px', borderRadius:'4px', background:'#243044', color:'#93c5fd', fontWeight:'bold' }}>{f}</span>
                  ))}
                  {activeGym.Subs > 0 && <span style={{ fontSize:'0.72rem', color:'#fb923c', fontWeight:'bold' }}>🔥 {activeGym.Subs} Submissions</span>}
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ color:'#34d399', fontWeight:'bold', fontSize:'1.05rem' }}>{activeGym.Points.toLocaleString()} pts</div>
                <div style={{ color:'#94a3b8', fontSize:'0.74rem' }}>2026 Season Score</div>
              </div>
            </div>

            {activeGym.allTimeClub && (
              <div style={{ marginTop:'8px', paddingTop:'8px', borderTop:'1px solid #253144', fontSize:'0.76rem', color:'#cbd5e1' }}>
                🏛️ <strong>Smoothcomp All-Time Club Record:</strong> 🥇 {activeGym.allTimeClub.g} · 🥈 {activeGym.allTimeClub.s} · 🥉 {activeGym.allTimeClub.b} ({activeGym.allTimeClub.g + activeGym.allTimeClub.s + activeGym.allTimeClub.b} lifetime medals)
              </div>
            )}

            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginTop:'10px' }}>
              {[
                ['ALL', `All 2026 (${activeGym.Gold + activeGym.Silver + activeGym.Bronze})`],
                [1, `🥇 Gold (${activeGym.Gold})`],
                [2, `🥈 Silver (${activeGym.Silver})`],
                [3, `🥉 Bronze (${activeGym.Bronze})`]
              ].map(([mf, lbl]) => (
                <button
                  key={mf}
                  type="button"
                  onClick={() => setMedalFilter(mf)}
                  style={{
                    padding:'6px 10px', borderRadius:'6px', fontSize:'0.78rem', fontWeight:'bold', cursor:'pointer',
                    background: medalFilter === mf ? '#0284c7' : '#11151d',
                    color: '#fff', border: medalFilter === mf ? '1px solid #38bdf8' : '1px solid #2d3748'
                  }}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:'12px', paddingRight:'2px' }}>
            {isLoading ? (
              <div style={{ padding:'24px', textAlign:'center', color:'#38bdf8' }}>Loading {activeGym.Academy} trophy room...</div>
            ) : (
              <>
                {indivList.length > 0 && (
                  <div>
                    <div style={{ color:'#38bdf8', fontSize:'0.8rem', fontWeight:'bold', marginBottom:'6px' }}>
                      🥋 Verified 2026 Individual Podium Finishers ({indivList.length})
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                      {indivList.slice(0, 150).map((m, idx) => (
                        <div key={idx} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px', background:'#151b24', border:'1px solid #222b3a', borderRadius:'6px', padding:'8px 10px', fontSize:'0.82rem' }}>
                          <div style={{ minWidth:0 }}>
                            <div style={{ color:'#fff', fontWeight:'bold', wordBreak:'break-word' }}>
                              {Number(m.p) === 1 ? '🥇 ' : Number(m.p) === 2 ? '🥈 ' : '🥉 '}
                              {m.n}
                            </div>
                            <div style={{ color:'#94a3b8', fontSize:'0.75rem', marginTop:'2px', wordBreak:'break-word' }}>
                              {[m.d, m.ev].filter(Boolean).join(' • ')}
                            </div>
                          </div>
                          {m.f && <span style={{ fontSize:'0.65rem', padding:'2px 6px', borderRadius:'4px', background:'#1e293b', color:'#cbd5e1', flexShrink:0 }}>{m.f}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {eventSummaries.length > 0 && (
                  <div>
                    <div style={{ color:'#a78bfa', fontSize:'0.8rem', fontWeight:'bold', marginBottom:'6px' }}>
                      🏟️ 2026 Tournament Team Podium Breakdown ({eventSummaries.length} Events)
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                      {eventSummaries.map((ev, idx) => (
                        <div key={idx} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'8px', background:'#151925', border:'1px solid #282f44', borderRadius:'6px', padding:'8px 10px', fontSize:'0.8rem' }}>
                          <div style={{ minWidth:0 }}>
                            <div style={{ color:'#fff', fontWeight:'bold', wordBreak:'break-word' }}>{ev.n}</div>
                            <div style={{ color:'#cbd5e1', fontSize:'0.75rem', marginTop:'2px' }}>{ev.d}</div>
                          </div>
                          <span style={{ fontSize:'0.65rem', padding:'2px 6px', borderRadius:'4px', background:'#1e293b', color:'#c4b5fd', flexShrink:0 }}>{ev.f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {indivList.length === 0 && eventSummaries.length === 0 && (
                  <div style={{ color:'#94a3b8', fontSize:'0.8rem', background:'#151922', border:'1px solid #222938', borderRadius:'8px', padding:'12px', lineHeight:1.45 }}>
                    Official 2026 academy medal count ({activeGym.Gold}🥇 · {activeGym.Silver}🥈 · {activeGym.Bronze}🥉) verified via {Array.from(activeGym.Feds).join(' & ')} season rankings.
                  </div>
                )}

                {gymUpcoming.length > 0 && (
                  <div>
                    <div style={{ color:'#ff9f43', fontSize:'0.8rem', fontWeight:'bold', marginBottom:'6px' }}>
                      📋 Active Squad Registered in Upcoming Tournaments ({gymUpcoming.length})
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                      {gymUpcoming.map((c, ci) => (
                        <span key={ci} style={{ background:'#161d27', border:'1px solid #293446', borderRadius:'5px', padding:'4px 8px', fontSize:'0.75rem', color:'#e2e8f0' }}>
                          <strong>{c.n}</strong>{c.d ? <span style={{ color:'#94a3b8' }}> · {c.d.split('/')[0].trim()}</span> : null}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {parentKey && (
                  <button
                    type="button"
                    onClick={() => openTrophyRoom(parentKey, 'ALL')}
                    style={{ padding:'9px 12px', background:'#172030', color:'#93c5fd', border:'1px solid #2b4c7e', borderRadius:'7px', fontSize:'0.8rem', fontWeight:'bold', cursor:'pointer', textAlign:'center' }}
                  >
                    🔎 Also view nationwide IBJJF HQ banner: {aggregated.byKey[parentKey].Academy} →
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClose} style={box}>
      <div onClick={e => e.stopPropagation()} style={card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px', gap:'10px', flexShrink:0 }}>
          <div style={{ minWidth:0 }}>
            <h2 style={{ margin:0, color:'#fff', fontSize:'1.16rem', lineHeight:1.25 }}>🏆 2026 BJJ Medal Standings & Podiums</h2>
            <p style={{ margin:'3px 0 0', color:'#94a3b8', fontSize:'0.77rem', lineHeight:1.35 }}>
              {mode === 'GYMS'
                ? `${aggregated.totalGyms.toLocaleString()} medaling academies ranked — tap any academy to open its full Trophy Room.`
                : 'Search any competitor across 90,000+ verified 2026 IBJJF, ADCC, AGF, AJP & Smoothcomp podiums.'}
            </p>
          </div>
          <button onClick={onClose} style={{ background:'#1e293b', color:'#fff', border:'1px solid #475569', borderRadius:'6px', padding:'6px 11px', cursor:'pointer', fontWeight:'bold', fontSize:'0.84rem', flexShrink:0 }}>✕ Close</button>
        </div>

        {/* Mode Toggle: Academy Standings vs Individual Athlete Podium Search */}
        <div style={{ display:'flex', gap:'6px', marginBottom:'10px', flexShrink:0 }}>
          <button
            type="button"
            onClick={() => setMode('GYMS')}
            style={{
              flex:1, padding:'8px 10px', borderRadius:'7px', cursor:'pointer', fontWeight:'bold', fontSize:'0.83rem',
              background: mode === 'GYMS' ? '#ff9f43' : '#181c24',
              color: mode === 'GYMS' ? '#000' : '#cbd5e1',
              border: mode === 'GYMS' ? '1px solid #ff9f43' : '1px solid #2d3748'
            }}
          >
            🏛️ Academy Standings
          </button>
          <button
            type="button"
            onClick={() => setMode('ATHLETES')}
            style={{
              flex:1, padding:'8px 10px', borderRadius:'7px', cursor:'pointer', fontWeight:'bold', fontSize:'0.83rem',
              background: mode === 'ATHLETES' ? '#38bdf8' : '#181c24',
              color: mode === 'ATHLETES' ? '#000' : '#cbd5e1',
              border: mode === 'ATHLETES' ? '1px solid #38bdf8' : '1px solid #2d3748'
            }}
          >
            🥋 Athlete Podium Search
          </button>
        </div>

        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'10px', alignItems:'center', flexShrink:0 }}>
          {[['ALL','🌐 All'],['IBJJF','IBJJF'],['ADCC','ADCC'],['JJWL','JJWL'],['AGF','AGF'],['AJP','AJP'],['SMOOTHCOMP','Smoothcomp']].map(([k, lbl]) => (
            <button key={k} onClick={() => setFed(k)} style={{ padding:'5px 9px', borderRadius:'6px', border: fed === k ? '1px solid #38bdf8' : '1px solid #2d3748', background: fed === k ? '#162536' : '#181c24', color: fed === k ? '#38bdf8' : '#cbd5e1', fontWeight:'bold', fontSize:'0.76rem', cursor:'pointer' }}>{lbl}</button>
          ))}
          {[['ALL','All Ages'],['YOUTH','🐯 Youth'],['ADULT','🥋 Adult']].map(([ak, albl]) => (
            <button key={ak} onClick={() => setAge(ak)} style={{ padding:'5px 8px', borderRadius:'6px', border:'1px solid #2d3748', background: age === ak ? '#2d3748' : '#181c24', color: age === ak ? '#fff' : '#94a3b8', fontSize:'0.75rem', fontWeight:'bold', cursor:'pointer' }}>{albl}</button>
          ))}
          {mode === 'GYMS' ? (
            <input value={qStr} onChange={e => setQStr(e.target.value)} placeholder="Search any academy..." style={{ flex:'1 1 140px', minWidth:'120px', padding:'7px 10px', borderRadius:'6px', background:'#181c24', color:'#fff', border:'1px solid #2d3748', fontSize:'0.86rem', boxSizing:'border-box' }} />
          ) : (
            <input value={athQuery} onChange={e => setAthQuery(e.target.value)} placeholder="Athlete full or last name (e.g. Isabella King)..." autoFocus style={{ flex:'1 1 180px', minWidth:'150px', padding:'7px 10px', borderRadius:'6px', background:'#181c24', color:'#fff', border:'1px solid #38bdf8', fontSize:'0.86rem', boxSizing:'border-box' }} />
          )}
        </div>

        {mode === 'ATHLETES' ? (
          <div style={{ overflowY:'auto', border:'1px solid #242b38', borderRadius:'8px', background:'#151922', flex:1, padding:'10px' }}>
            {athQuery.trim().length < 2 ? (
              <div style={{ padding:'24px 12px', textAlign:'center', color:'#94a3b8', fontSize:'0.85rem' }}>
                Type an athlete's full name or last name above (e.g. <strong>Isabella King</strong>, <strong>Cassius King</strong>, or <strong>King</strong>) to view all 2026 tournament podiums.
              </div>
            ) : loadingAthShard ? (
              <div style={{ padding:'20px', textAlign:'center', color:'#38bdf8' }}>Searching 2026 podium records...</div>
            ) : athleteResults.length === 0 ? (
              <div style={{ padding:'20px', textAlign:'center', color:'#94a3b8', fontSize:'0.84rem' }}>
                No 2026 podium records matched "{athQuery}" under the current filter — tip: enter last name or full name!
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {athleteResults.map((a, idx) => (
                  <div key={idx} style={{ background:'#181f2c', border:'1px solid #283347', borderRadius:'8px', padding:'11px 12px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px', flexWrap:'wrap', marginBottom:'6px' }}>
                      <div>
                        <div style={{ color:'#fff', fontWeight:'bold', fontSize:'0.96rem' }}>{a.name}</div>
                        <div style={{ color:'#ff9f43', fontSize:'0.78rem', fontWeight:'600' }}>{a.academy}</div>
                      </div>
                      <div style={{ display:'flex', gap:'6px', fontSize:'0.82rem', background:'#111620', padding:'4px 9px', borderRadius:'6px', border:'1px solid #263145' }}>
                        <span>🥇 <strong>{a.g}</strong></span>
                        <span>🥈 <strong>{a.s}</strong></span>
                        <span>🥉 <strong>{a.b}</strong></span>
                      </div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                      {a.events.map((m, mi) => (
                        <div key={mi} style={{ fontSize:'0.76rem', color:'#cbd5e1', background:'#121721', padding:'5px 8px', borderRadius:'5px', display:'flex', justifyContent:'space-between', gap:'6px' }}>
                          <span>{Number(m.p) === 1 ? '🥇' : Number(m.p) === 2 ? '🥈' : '🥉'} <strong>{m.ev}</strong> — {m.d}</span>
                          <span style={{ color:'#93c5fd', flexShrink:0, fontWeight:'bold', fontSize:'0.68rem' }}>{m.f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ overflowY:'auto', border:'1px solid #242b38', borderRadius:'8px', background:'#151922', flex:1 }}>
            {aggregated.list.map((r) => {
              const i = r.trueRank - 1;
              return (
                <div
                  key={`${r.key}_${r.trueRank}`}
                  onClick={() => openTrophyRoom(r.key, 'ALL')}
                  style={{ display:'flex', flexDirection:'column', gap:'6px', padding:'11px 12px', borderBottom:'1px solid #1f2532', cursor:'pointer' }}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px' }}>
                    <div style={{ display:'flex', alignItems:'baseline', gap:'7px', minWidth:0, flex:1 }}>
                      <strong style={{ color: i < 3 ? '#facc15' : '#64748b', fontSize:'0.9rem', flexShrink:0 }}>#{r.trueRank}</strong>
                      <strong style={{ color:'#fff', fontSize:'0.96rem', lineHeight:1.3, wordBreak:'break-word' }}>{r.Academy}</strong>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', flexShrink:0 }}>
                      <span style={{ color:'#34d399', fontWeight:'bold', fontSize:'0.85rem', whiteSpace:'nowrap' }}>{r.Points.toLocaleString()} pts</span>
                      <span style={{ color:'#38bdf8', fontSize:'0.76rem', fontWeight:'bold' }}>View →</span>
                    </div>
                  </div>

                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'6px' }}>
                    <div style={{ display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap' }}>
                      {[[1, '🥇', r.Gold], [2, '🥈', r.Silver], [3, '🥉', r.Bronze]].map(([pNum, ic, cnt]) => (
                        <button
                          key={pNum}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openTrophyRoom(r.key, pNum); }}
                          style={{ background:'#11151d', border:'1px solid #283142', borderRadius:'6px', padding:'3px 8px', color:'#fff', fontSize:'0.8rem', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:'4px' }}
                        >
                          <span>{ic}</span><strong>{cnt}</strong>
                        </button>
                      ))}
                      {(r.YouthMedals + r.AdultMedals > 0) && (
                        <span style={{ color:'#cbd5e1', fontSize:'0.72rem', background:'#1a202c', border:'1px solid #2d3748', padding:'2px 7px', borderRadius:'4px', whiteSpace:'nowrap' }}>
                          {age === 'YOUTH' ? `🐯 ${r.YouthMedals}` : age === 'ADULT' ? `🥋 ${r.AdultMedals}` : `🐯 ${r.YouthMedals} · 🥋 ${r.AdultMedals}`}
                        </span>
                      )}
                    </div>
                    <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                      {Array.from(r.Feds).map(f => (
                        <span key={f} style={{ fontSize:'0.65rem', padding:'2px 6px', borderRadius:'4px', background:'#1e293b', color:'#94a3b8', fontWeight:'600' }}>{f}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
