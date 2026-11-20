import { athBucketsForQuery, smartAthleteMatch, canonicalPersonKey, findProAthlete, PRO_SUPERFIGHTS } from "./proHubData";
import { AcademyProSuite } from "./proWorkspaces";
import { auth } from "./firebase";
import { computeEliteSpotlight } from "./proHubData";
import { SuperFightsPanel, AthleteTrophyRoomModal } from "./proTrophyModal";
import { UniversalAthleteLookupModal } from "./proModals";
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
function TrophyCardModal({ cardData, onClose }) {
  const [imgUrl, setImgUrl] = React.useState('');

  React.useEffect(() => {
    if (!cardData) return;
    const c = document.createElement('canvas');
    c.width = 1080;
    c.height = 1920;
    const ctx = c.getContext('2d');

    // Deep arena gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, 1920);
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(0.5, '#111827');
    grad.addColorStop(1, '#090d16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Gold border frame
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 8;
    ctx.strokeRect(44, 44, 992, 1832);

    // Top brand header
    ctx.fillStyle = '#ff9f43';
    ctx.font = 'bold 42px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MATDATES.COM • 2026 VERIFIED PODIUMS', 540, 140);

    // Subtitle badge
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 34px system-ui, -apple-system, sans-serif';
    ctx.fillText(cardData.badge || '2026 SEASON TROPHY CARD', 540, 220);

    // Main Title (Athlete or Academy Name) - word-wrapped cleanly
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px system-ui, -apple-system, sans-serif';
    const words = (cardData.title || '').split(/\s+/);
    let line = '', y = 330;
    for (let i = 0; i < words.length; i++) {
      const test = line + words[i] + ' ';
      if (ctx.measureText(test).width > 900 && line) {
        ctx.fillText(line.trim(), 540, y);
        line = words[i] + ' ';
        y += 84;
      } else {
        line = test;
      }
    }
    if (line.trim()) { ctx.fillText(line.trim(), 540, y); y += 70; }

    if (cardData.subtitle) {
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 38px system-ui, -apple-system, sans-serif';
      ctx.fillText(cardData.subtitle.slice(0, 48), 540, y + 10);
      y += 75;
    }

    // Gold / Silver / Bronze Medal Boxes
    const boxY = Math.max(y + 30, 520);
    const medals = [
      ['GOLD', cardData.gold, '#facc15', '#422006'],
      ['SILVER', cardData.silver, '#e2e8f0', '#1e293b'],
      ['BRONZE', cardData.bronze, '#fb923c', '#431407']
    ];
    medals.forEach(([lbl, val, col, bg], idx) => {
      const bx = 90 + idx * 310;
      ctx.fillStyle = bg;
      ctx.fillRect(bx, boxY, 280, 220);
      ctx.strokeStyle = col;
      ctx.lineWidth = 4;
      ctx.strokeRect(bx, boxY, 280, 220);
      ctx.fillStyle = col;
      ctx.font = 'bold 84px system-ui, -apple-system, sans-serif';
      ctx.fillText(String(val || 0), bx + 140, boxY + 115);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
      ctx.fillText(lbl, bx + 140, boxY + 178);
    });

    // Highlights List
    let hy = boxY + 305;
    ctx.fillStyle = '#ff9f43';
    ctx.font = 'bold 34px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('2026 TOURNAMENT HIGHLIGHTS', 95, hy);
    hy += 55;

    (cardData.lines || []).slice(0, 9).forEach((ln) => {
      ctx.fillStyle = '#161f30';
      ctx.fillRect(90, hy - 38, 900, 78);
      ctx.strokeStyle = '#2b3954';
      ctx.lineWidth = 2;
      ctx.strokeRect(90, hy - 38, 900, 78);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
      const cleanLn = ln.length > 58 ? ln.slice(0, 56) + '…' : ln;
      ctx.fillText(cleanLn, 115, hy + 10);
      hy += 94;
    });

    // Footer CTA with Direct Deep-Link
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '30px system-ui, -apple-system, sans-serif';
    ctx.fillText('View Full 2026 Podiums, Live Brackets & Mat Alerts:', 540, 1758);
    ctx.fillStyle = '#38bdf8';
    const dispLink = (cardData.deepLink || 'https://matdates.com').replace(/^https?:\/\//, '');
    ctx.font = dispLink.length > 34 ? 'bold 34px system-ui, -apple-system, sans-serif' : 'bold 42px system-ui, -apple-system, sans-serif';
    ctx.fillText(dispLink.length > 46 ? dispLink.slice(0, 44) + '…' : dispLink, 540, 1818);

    setImgUrl(c.toDataURL('image/png'));
  }, [cardData]);

  const [copiedMsg, setCopiedMsg] = React.useState('');

  const handleShare = async () => {
    if (!imgUrl) return;
    try {
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const file = new File([blob], 'matdates-trophy-card.png', { type: 'image/png' });
      // Passing ONLY { files } (without text/url) makes iOS recognize a pure photo share so Instagram Stories appears directly!
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return;
    }
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = 'matdates-trophy-card.png';
    a.click();
  };

  const handleCopyOpenIG = async () => {
    if (!imgUrl) return;
    try {
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
        setCopiedMsg('Copied! Paste sticker in IG Story');
      }
    } catch {}
    setTimeout(() => { window.location.href = 'instagram://story-camera'; }, 250);
  };

  const handleCopyDeepLink = async () => {
    const link = cardData.deepLink || 'https://matdates.com';
    try {
      await navigator.clipboard.writeText(link);
      setCopiedMsg('🔗 Direct link copied for IG Link Sticker / Bio!');
    } catch {
      window.prompt('Copy direct profile link:', link);
    }
  };

  return (
    <div onClick={onClose} style={{ position:'fixed', top:0, left:0, right:0, bottom:0, width:'100%', maxWidth:'100vw', backgroundColor:'rgba(0,0,0,0.9)', zIndex:10090, display:'flex', justifyContent:'center', alignItems:'center', padding:'12px', boxSizing:'border-box' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor:'#11141b', border:'1px solid #334155', borderRadius:'12px', padding:'14px', width:'100%', maxWidth:'380px', maxHeight:'88svh', overflowY:'auto', boxSizing:'border-box', textAlign:'center' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
          <strong style={{ color:'#fff', fontSize:'0.95rem' }}>📲 Share 2026 Trophy Card</strong>
          <button onClick={onClose} style={{ background:'#1e293b', color:'#fff', border:'1px solid #475569', borderRadius:'6px', padding:'4px 10px', cursor:'pointer', fontWeight:'bold' }}>✕</button>
        </div>
        {imgUrl && <img src={imgUrl} alt="Trophy Card" style={{ width:'100%', maxHeight:'54svh', objectFit:'contain', borderRadius:'8px', border:'1px solid #2d3748', marginBottom:'10px' }} />}
        {copiedMsg && <div style={{ color:'#34d399', fontSize:'0.76rem', fontWeight:'bold', marginBottom:'6px' }}>{copiedMsg}</div>}
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
          <button onClick={handleShare} style={{ flex:'1 1 140px', padding:'10px 8px', borderRadius:'7px', background:'#ff9f43', color:'#000', border:'none', fontWeight:'bold', fontSize:'0.84rem', cursor:'pointer' }}>
            📲 Share Image (Pick IG)
          </button>
          <button onClick={handleCopyOpenIG} style={{ flex:'1 1 140px', padding:'10px 8px', borderRadius:'7px', background:'#1e293b', color:'#38bdf8', border:'1px solid #38bdf8', fontWeight:'bold', fontSize:'0.82rem', cursor:'pointer' }}>
            📸 Copy & Open IG Camera
          </button>
          <button onClick={handleCopyDeepLink} style={{ flex:'1 1 100%', padding:'9px 8px', borderRadius:'7px', background:'#162032', color:'#cbd5e1', border:'1px solid #475569', fontWeight:'bold', fontSize:'0.8rem', cursor:'pointer' }}>
            🔗 Copy Direct Link (for IG Link Sticker)
          </button>
        </div>
      </div>
    </div>
  );
}

const normGymKey = (raw) => {
  const k = (raw || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (k.startsWith("aoj") || k.startsWith("artofjiujitsu")) return "artofjiujitsu";
  if (k.startsWith("atoshq") || k === "atosjiujitsuhq") return "atos";
  return ({
    aoj: 'artofjiujitsu',
    atosjiujitsu: 'atos',
    carlsongracieteam: 'carlsongracie',
    gb: 'graciebarra',
    braziliantopteam: 'btt',
    checkmatbjj: 'checkmat',
    alliancebjj: 'alliance',
    tmcombatacademy: 'carlsongraciesanantonio',
    tmcombat: 'carlsongraciesanantonio',
    thiagomendescombatacademy: 'carlsongraciesanantonio',
    carlsongraciejiujitsusanantonio: 'carlsongraciesanantonio',
    carlsongraciesanantoniotx: 'carlsongraciesanantonio'
  })[k] || k;
};

const bucketOfKey = (k) => {
  if (!k) return '00';
  let h = 2166136261;
  for (let i = 0; i < k.length; i++) {
    h ^= k.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h & 0xff).toString(16).padStart(2, '0');
};

const foldAscii = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const athLastBucket = (qRaw) => {
  const stop = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'da', 'de', 'do', 'dos', 'das', 'del', 'la', 'el']);
  const parts = foldAscii(qRaw)
    .split(/\s+/)
    .map(p => p.replace(/[^a-z0-9]/g, ''))
    .filter(p => p.length >= 2 && !stop.has(p));
  if (!parts.length) return '';
  return parts[parts.length - 1].slice(0, 2);
};

const athleteMatchesQuery = (recName, qRaw) => {
  const nl = foldAscii(recName).trim();
  const q = foldAscii(qRaw).trim();
  if (!q || !nl) return false;
  if (nl.includes(q)) return true;
  const qParts = q.split(/\s+/).filter(Boolean);
  if (qParts.every(t => nl.includes(t))) return true;
  if (qParts.length >= 2) {
    const abbrev = `${qParts[0][0]}. ${qParts[qParts.length - 1]}`;
    if (nl === abbrev || (nl.startsWith(`${qParts[0][0]}. `) && nl.endsWith(` ${qParts[qParts.length - 1]}`))) return true;
  }
  return false;
};

const buildShareOrigin = () => {
  if (typeof window === 'undefined') return 'https://matdates.com';
  const h = window.location.hostname;
  return (h === 'localhost' || h === '127.0.0.1') ? window.location.origin : 'https://matdates.com';
};


function canonicalizeHits(hits) {
  const stripG = (k) => (k || "").replace(/(jiujitsu|bjj|team|hq|academy)+$/g, "");
  const hqRoots = ["carlsongracie", "graciebarra", "alliance", "checkmat", "atos", "ares", "gfteam", "zrteam", "unity", "btt"];
  const gymsCompat = (a, b) => {
    if (!a || !b || a === b) return true;
    const sa = stripG(a), sb = stripG(b);
    if (!sa || !sb || sa === sb || sa.startsWith(sb) || sb.startsWith(sa)) return true;
    return hqRoots.some(r => (sa === r && sb.startsWith(r)) || (sb === r && sa.startsWith(r)));
  };
  const parseN = (raw) => {
    const clean = foldAscii(raw).replace(/\b(jr\.?|sr\.?|ii|iii|iv)\b/g, " ").trim();
    const toks = clean.split(/\s+/).map(t => t.replace(/[^a-z0-9]/g, "")).filter(Boolean);
    const first = toks[0] || "";
    return { first, fi: first[0] || "", isInit: first.length === 1, last: toks[toks.length - 1] || "" };
  };
  const pickGym = (curA, curK, newA, newK) => {
    if (!curA) return [newA, newK];
    if (stripG(newK).length > stripG(curK).length) return [newA, newK];
    if (curA.length <= 4 && newA.length > curA.length) return [newA, newK];
    return [curA, curK];
  };
  const parsed = hits.map(m => ({ m, np: parseN(m.n), ak: normGymKey(m.a) }));
  const clusters = [];
  parsed.filter(x => !x.np.isInit).forEach(({ m, np, ak }) => {
    let c = clusters.find(x => !x.np.isInit && x.np.first === np.first && x.np.last === np.last && gymsCompat(x.ak, ak));
    if (!c) { c = { bestN: m.n, bestA: m.a, ak, np, rows: [], seen: new Set() }; clusters.push(c); }
    else {
      if ((m.n || "").length > (c.bestN || "").length) c.bestN = m.n;
      [c.bestA, c.ak] = pickGym(c.bestA, c.ak, m.a, ak);
    }
    c.rows.push(m);
  });
  parsed.filter(x => x.np.isInit).forEach(({ m, np, ak }) => {
    const cands = clusters.filter(x => !x.np.isInit && x.np.fi === np.fi && x.np.last === np.last && gymsCompat(x.ak, ak));
    let c = cands.length === 1 ? cands[0] : clusters.find(x => x.np.isInit && x.np.fi === np.fi && x.np.last === np.last && gymsCompat(x.ak, ak));
    if (!c) { c = { bestN: m.n, bestA: m.a, ak, np, rows: [], seen: new Set() }; clusters.push(c); }
    else { [c.bestA, c.ak] = pickGym(c.bestA, c.ak, m.a, ak); }
    c.rows.push(m);
  });
  const out = [];
  clusters.forEach(c => {
    c.rows.forEach(m => {
      const dk = foldAscii(m.ev) + "|" + foldAscii(m.d) + "|" + m.p;
      if (c.seen.has(dk)) return;
      c.seen.add(dk);
      out.push({ ...m, n: c.bestN, a: c.bestA });
    });
  });
  return out;
}

export function LeaderboardModal({ onClose }) {
  const [podiumWatchPick, setPodiumWatchPick] = useState(null);
  const { getWatch: getPodiumWatch, removeWatch: removePodiumWatch } = useWatchedAthletes();
  const initParams = React.useMemo(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const g = sp.get('gym');
      const a = sp.get('athlete');
      return {
        gymKey: g ? normGymKey(g) : null,
        athlete: a ? a.replace(/\+/g, ' ').trim() : ''
      };
    } catch { return { gymKey: null, athlete: '' }; }
  }, []);

  const [rows, setRows] = useState([]);
  const [rowsLoaded, setRowsLoaded] = useState(false);
  const [mode, setMode] = useState(initParams.athlete ? 'ATHLETES' : 'GYMS');
  const [fed, setFed] = useState('ALL');
  const [age, setAge] = useState('ALL');
  const [qStr, setQStr] = useState('');
  const [athQuery, setAthQuery] = useState(initParams.athlete || '');
  const [selectedGymKey, setSelectedGymKey] = useState(initParams.gymKey || null);
  const [medalFilter, setMedalFilter] = useState('ALL');
  const [bucketMap, setBucketMap] = useState({});
  const [athShardMap, setAthShardMap] = useState({});
  const [rosterCache, setRosterCache] = useState(null);
  const [loadingBucket, setLoadingBucket] = useState('');
  const [loadingAthShard, setLoadingAthShard] = useState('');
  const [trophyCard, setTrophyCard] = useState(null);
  const [sortBy, setSortBy] = useState("MEDALS");
  const [openAthTrophy, setOpenAthTrophy] = useState(() => { const t = new URLSearchParams(window.location.search).get("trophy"); return t ? { name: t, academy: "", g: 0, s: 0, b: 0, events: [] } : null; });
  const [copiedToast, setCopiedToast] = useState('');

  const copyDirectLink = async (paramName, paramVal) => {
    const u = `${buildShareOrigin()}/?${paramName}=${encodeURIComponent(paramVal).replace(/%20/g, '+')}`;
    try {
      await navigator.clipboard.writeText(u);
      setCopiedToast(`🔗 Link copied: ${u.replace(/^https?:\/\//, '')}`);
      setTimeout(() => setCopiedToast(''), 2800);
    } catch {
      window.prompt('Copy direct link:', u);
    }
  };

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
        setRowsLoaded(true);
      })
      .catch(() => setRowsLoaded(true));
    if (initParams.gymKey) {
      loadGymBucket(initParams.gymKey);
    }
  }, []);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('gym');
      url.searchParams.delete('athlete');
      if (selectedGymKey) {
        url.searchParams.set('gym', selectedGymKey);
      } else if (mode === 'ATHLETES' && athQuery.trim().length >= 2) {
        url.searchParams.set('athlete', athQuery.trim());
      }
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);
    } catch {}
  }, [selectedGymKey, mode, athQuery]);

  const loadGymBucket = async (gymKey) => {
    const bkt = bucketOfKey(gymKey);
    // Fire upcoming roster fetch in background WITHOUT blocking Trophy Room render!
    if (rosterCache === null) {
      setRosterCache([]);
      getDocs(query(collection(db, 'event_competitors'), where('event_id', '==', '__athlete_index__')))
        .then(rSnap => {
          const rItems = [];
          rSnap.docs.forEach(d => (d.data().items || []).forEach(it => rItems.push(it)));
          setRosterCache(rItems);
        })
        .catch(() => {});
    }
    if (bucketMap[bkt]) return;
    setLoadingBucket(bkt);
    try {
      let mSnap = await getDocs(query(collection(db, 'event_competitors'), where('event_id', '==', `__m2_${bkt}__`)));
      const mItems = [];
      mSnap.docs.forEach(d => (d.data().items || []).forEach(it => mItems.push(it)));
      setBucketMap(prev => ({ ...prev, [bkt]: mItems }));
    } catch (e) {
      console.warn('Micro-shard fetch warn:', e);
      setBucketMap(prev => ({ ...prev, [bkt]: [] }));
    } finally {
      setLoadingBucket('');
    }
  };

  useEffect(() => {
    if (mode !== 'ATHLETES') return;
    const trimmed = athQuery.trim();
    if (trimmed.length < 2) return;
    const bkts = athBucketsForQuery(trimmed);
    const fallback = athLastBucket(trimmed);
    if (fallback && !bkts.includes(fallback)) bkts.push(fallback);
    const missing = bkts.filter(b => b && !athShardMap[b]);
    if (!missing.length) return;
    setLoadingAthShard(missing[0]);
    Promise.all(missing.map(bkt =>
      getDocs(query(collection(db, 'event_competitors'), where('event_id', '==', `__a2_${bkt}__`)))
        .then(snap => {
          const arr = [];
          snap.docs.forEach(d => (d.data().items || []).forEach(it => arr.push(it)));
          return [bkt, arr];
        }).catch(() => [bkt, []])
    )).then(pairs => {
      setAthShardMap(prev => {
        const next = { ...prev };
        pairs.forEach(([b, arr]) => { next[b] = arr; });
        return next;
      });
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
      if (b === 'smoothcomp_clubs') { if (!rows.some(x => x.Board === 'smoothcomp_clubs_2026')) scClubs26.push(r); return; }
      if (b === 'smoothcomp_clubs_2026') { scClubs26.push(r); return; }
      const rFed = b.startsWith('ibjjf') ? 'IBJJF'
        : b.startsWith('adcc') ? 'ADCC'
        : b.startsWith('agf') ? 'AGF'
        : b.startsWith('ajp') ? 'AJP'
        : b.startsWith('smoothcomp') ? 'SMOOTHCOMP'
        : 'JJWL';
      const rAge = b.includes('youth') ? 'YOUTH' : 'ADULT';
      const rFedNorm = /ufc/i.test((r.Event||"")+" "+(rFed||"")) ? "UFC" : rFed;
      if ((fed !== 'ALL' && rFedNorm !== fed) || (age !== 'ALL' && rAge !== age)) return;
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
        const cg = Number(fed === 'SMOOTHCOMP' && r.RawClub2026G !== undefined ? r.RawClub2026G : (r.Gold || 0));
        const cs = Number(fed === 'SMOOTHCOMP' && r.RawClub2026S !== undefined ? r.RawClub2026S : (r.Silver || 0));
        const cb = Number(fed === 'SMOOTHCOMP' && r.RawClub2026B !== undefined ? r.RawClub2026B : (r.Bronze || 0));
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
      .sort((a, b) => sortBy === "POINTS" ? (b.Points - a.Points || b.Gold - a.Gold) : sortBy === "TOTAL" ? ((b.Gold+b.Silver+b.Bronze)-(a.Gold+a.Silver+a.Bronze) || b.Gold-a.Gold) : (b.Gold-a.Gold || b.Silver-a.Silver || b.Bronze-a.Bronze || b.Points-a.Points))
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
  }, [rows, fed, age, qStr, sortBy]);

  const athleteResults = React.useMemo(() => {
    const trimmed = athQuery.trim();
    if (trimmed.length < 2) return [];
    const bkts = athBucketsForQuery(trimmed);
    const fb = athLastBucket(trimmed);
    if (fb && !bkts.includes(fb)) bkts.push(fb);
    const rawPool = [];
    bkts.forEach(b => { if (athShardMap[b]) rawPool.push(...athShardMap[b]); });

    const hits = canonicalizeHits(rawPool).filter(m =>
      smartAthleteMatch(m.n, m.a, trimmed) &&
      (fed === "ALL" || (/ufc/i.test((m.ev || "") + " " + (m.f || "")) ? "UFC" : m.f) === fed) &&
      (age === "ALL" || !m.ag || m.ag === age)
    );

    const parentHQs = new Set(['carlsongracie', 'graciebarra', 'alliance', 'checkmat', 'atos', 'ares', 'btt']);
    const grouped = new Map();

    // Include matching Pro / SuperFight stars when searching in Athlete Podium Search too!
    PRO_SUPERFIGHTS.forEach(p => {
      if (!smartAthleteMatch(p.name, p.academy, trimmed)) return;
      if (fed !== "ALL" && !(p.feds || []).includes(fed)) return;
      if (age === "YOUTH") return;
      const pk = canonicalPersonKey(p.name, p.academy);
      grouped.set(pk, { name: p.name, academy: p.academy, g: 0, s: 0, b: 0, events: [], seen: new Set(), isPro: true });
    });

    hits.forEach(m => {
      const pro = findProAthlete(m.n);
      const gk = pro ? ("pro:" + pro.name.toLowerCase()) : canonicalPersonKey(m.n, m.a);
      if (!grouped.has(gk)) {
        grouped.set(gk, {
          name: pro ? pro.name : m.n,
          academy: pro ? pro.academy : m.a,
          g: 0, s: 0, b: 0, events: [], seen: new Set(), isPro: Boolean(pro)
        });
      }
      const rec = grouped.get(gk);
      const dk = `${(m.ev || "").toLowerCase()}|${(m.d || "").toLowerCase()}|${m.p}`;
      if (rec.seen.has(dk)) return;
      rec.seen.add(dk);
      if (!rec.isPro) {
        const curAk = normGymKey(rec.academy);
        const newAk = normGymKey(m.a);
        if ((parentHQs.has(curAk) && !parentHQs.has(newAk)) || ((m.a || "").length > (rec.academy || "").length && !parentHQs.has(newAk))) {
          rec.academy = m.a;
        }
        if ((m.n || "").length > (rec.name || "").length) rec.name = m.n;
      }
      if (m.mg !== undefined || m.ms !== undefined || m.mb !== undefined) {
        rec.g += Number(m.mg || 0); rec.s += Number(m.ms || 0); rec.b += Number(m.mb || 0);
      } else {
        if (Number(m.p) === 1) rec.g += 1;
        else if (Number(m.p) === 2) rec.s += 1;
        else rec.b += 1;
      }
      rec.events.push(m);
    });

    return Array.from(grouped.values())
      .sort((a, b) => (b.g * 9 + b.s * 3 + b.b + (b.isPro ? 12 : 0)) - (a.g * 9 + a.s * 3 + a.b + (a.isPro ? 12 : 0)))
      .slice(0, 80);
  }, [athQuery, athShardMap, fed, age, sortBy]);

  const activeGym = selectedGymKey ? aggregated.byKey[selectedGymKey] : null;
  const box = { position:'fixed', top:0, left:0, right:0, bottom:0, width:'100%', maxWidth:'100vw', overflowX:'hidden', overflowY:'auto', backgroundColor:'rgba(0,0,0,0.9)', zIndex:9999, display:'flex', justifyContent:'center', alignItems:'flex-start', padding:'8px', boxSizing:'border-box' };
  const card = { backgroundColor:'#11141b', padding:'12px', boxSizing:'border-box', overflowX:'hidden', overflowY:'auto', WebkitOverflowScrolling:'touch', borderRadius:'12px', border:'1px solid #2d3748', width:'calc(100vw - 16px)', maxWidth:'880px', maxHeight:'92dvh', display:'flex', flexDirection:'column', textAlign:'left', margin:'auto 0' };

  if (selectedGymKey && !activeGym && !rowsLoaded) {
    return (
      <div onClick={onClose} style={box}>
        <div onClick={e => e.stopPropagation()} style={{ ...card, padding:'32px 20px', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
          <div style={{ color:'#38bdf8', fontWeight:'bold', fontSize:'1rem' }}>🏆 Opening Academy Trophy Room...</div>
        </div>
      </div>
    );
  }

  // Dedicated Full-View Academy Trophy Room when a gym is clicked!
  if (activeGym) {
    const bkt = bucketOfKey(activeGym.key);
    const rawItems = bucketMap[bkt] || [];
    const isLoading = loadingBucket === bkt || !bucketMap[bkt];
    const matchingAll = rawItems.filter(m =>
      normGymKey(m.a) === activeGym.key &&
      (fed === "ALL" || (/ufc/i.test((m.ev||"")+" "+(m.f||"")) ? "UFC" : m.f) === fed) &&
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
          {trophyCard && <TrophyCardModal cardData={trophyCard} onClose={() => setTrophyCard(null)} />}
          {copiedToast && <div style={{ background:'#064e3b', color:'#6ee7b7', border:'1px solid #10b981', borderRadius:'6px', padding:'6px 10px', fontSize:'0.76rem', fontWeight:'bold', marginBottom:'8px', textAlign:'center' }}>{copiedToast}</div>}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'6px', flexWrap:'wrap', marginBottom:'10px', flexShrink:0 }}>
            <button
              onClick={() => setSelectedGymKey(null)}
              style={{ background:'#1e293b', color:'#38bdf8', border:'1px solid #38bdf8', borderRadius:'6px', padding:'6px 10px', cursor:'pointer', fontWeight:'bold', fontSize:'0.8rem' }}
            >
              ← Standings
            </button>
            <div style={{ display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap' }}>
              <button
                type="button"
                onClick={() => copyDirectLink('gym', activeGym.key)}
                style={{ background:'#162536', color:'#38bdf8', border:'1px solid #0284c7', borderRadius:'6px', padding:'6px 9px', cursor:'pointer', fontWeight:'bold', fontSize:'0.76rem' }}
              >
                🔗 Copy Link
              </button>
              <button
                type="button"
                onClick={() => setTrophyCard({
                  badge: `GLOBAL RANK #${activeGym.trueRank} • ACADEMY TROPHY CARD`,
                  title: activeGym.Academy,
                  subtitle: `${activeGym.Points.toLocaleString()} Season Pts • ${Array.from(activeGym.Feds).join(' / ')}`,
                  gold: activeGym.Gold,
                  silver: activeGym.Silver,
                  bronze: activeGym.Bronze,
                  deepLink: `${buildShareOrigin()}/?gym=${activeGym.key}`,
                  lines: [
                    ...indivList.slice(0, 6).map(m => `${Number(m.p) === 1 ? '🥇' : Number(m.p) === 2 ? '🥈' : '🥉'} ${m.n} — ${m.ev}`),
                    ...eventSummaries.slice(0, 4).map(ev => `${ev.n} (${ev.d.split('(')[0].trim()})`)
                  ]
                })}
                style={{ background:'#ff9f43', color:'#000', border:'none', borderRadius:'6px', padding:'6px 10px', cursor:'pointer', fontWeight:'bold', fontSize:'0.78rem' }}
              >
                📲 Share Stats
              </button>
              <button onClick={onClose} style={{ background:'#1e293b', color:'#fff', border:'1px solid #475569', borderRadius:'6px', padding:'6px 10px', cursor:'pointer', fontWeight:'bold', fontSize:'0.8rem' }}>
                ✕
              </button>
            </div>
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
                <AcademyProSuite gymName={activeGym.Academy} gymKey={activeGym.key} user={auth.currentUser} isAdmin={false} onRequireAuth={() => alert("Please Sign In at the top right of MatDates first!")} />
                {indivList.length > 0 && (
                  <div>
                    <div style={{ color:'#38bdf8', fontSize:'0.8rem', fontWeight:'bold', marginBottom:'6px' }}>
                      🥋 Verified 2026 Individual Podium Finishers ({indivList.length})
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                      {indivList.slice(0, 150).map((m, idx) => (
                        <div key={idx} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px', background:'#151b24', border:'1px solid #222b3a', borderRadius:'6px', padding:'8px 10px', fontSize:'0.82rem' }}>
                          <div style={{ minWidth:0 }}>
                            <div
                              onClick={() => setOpenAthTrophy({ name: m.n, academy: activeGym.Academy, g: 0, s: 0, b: 0, events: [] })}
                              style={{ color:'#fff', fontWeight:'bold', wordBreak:'break-word', cursor:'pointer' }}
                              title="View full athlete podium record"
                            >
                              {Number(m.p) === 1 ? '🥇 ' : Number(m.p) === 2 ? '🥈 ' : '🥉 '}
                              <span style={{ textDecoration:'underline', textDecorationColor:'rgba(56,189,248,0.45)' }}>{m.n}</span>
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
      {trophyCard && <TrophyCardModal cardData={trophyCard} onClose={() => setTrophyCard(null)} />}
          {copiedToast && <div style={{ background:'#064e3b', color:'#6ee7b7', border:'1px solid #10b981', borderRadius:'6px', padding:'6px 10px', fontSize:'0.76rem', fontWeight:'bold', marginBottom:'8px', textAlign:'center' }}>{copiedToast}</div>}
      <div onClick={e => e.stopPropagation()} style={card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px', gap:'10px', flexShrink:0 }}>
          <div style={{ minWidth:0 }}>
            <h2 style={{ margin:0, color:'#fff', fontSize:'1.16rem', lineHeight:1.25 }}>🏆 2026 BJJ Medal Standings & Podiums</h2>
            {!(qStr.trim() || athQuery.trim()) && <p style={{ margin:'3px 0 0', color:'#94a3b8', fontSize:'0.75rem', lineHeight:1.3 }}>
              {mode === 'GYMS'
                ? `${aggregated.totalGyms.toLocaleString()} medaling academies ranked — tap any academy to open its full Trophy Room.`
                : 'Search any competitor across 90,000+ verified 2026 IBJJF, ADCC, AGF, AJP & Smoothcomp podiums.'}
            </p>}
          </div>
          <button onClick={onClose} style={{ background:'#1e293b', color:'#fff', border:'1px solid #475569', borderRadius:'6px', padding:'6px 11px', cursor:'pointer', fontWeight:'bold', fontSize:'0.84rem', flexShrink:0 }}>✕ Close</button>
        </div>

        {/* Mode Toggle: Academy Standings vs Individual Athlete Podium Search */}
        <div style={{ display:'flex', gap:'5px', marginBottom:'8px', flexShrink:0, overflowX:'auto' }}>
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
            <button onClick={() => setMode("SUPERFIGHTS")} style={{ padding:"8px 12px", borderRadius:"7px", fontWeight:"bold", fontSize:"0.82rem", cursor:"pointer", background: mode === "SUPERFIGHTS" ? "#14b8a6" : "#181c24", color: mode === "SUPERFIGHTS" ? "#000" : "#cbd5e1", border: mode === "SUPERFIGHTS" ? "1px solid #14b8a6" : "1px solid #2d3748" }}>🥊 SuperFights &amp; Majors</button>
        </div>

        <div style={{ width:"100%", flex:"0 0 auto", position:"relative", marginBottom:"8px", textAlign:"left" }}>
          <span style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>🔍</span>
          <input enterKeyHint="search" value={mode === "ATHLETES" ? athQuery : qStr} onChange={e => mode === "ATHLETES" ? setAthQuery(e.target.value) : setQStr(e.target.value)} placeholder={mode === "GYMS" ? "Search any academy or local chapter (e.g. Carlson Gracie San Antonio, AOJ, Atos)..." : mode === "SUPERFIGHTS" ? "Search SuperFight champions, belts, or cards (e.g. Cassia Moura, Helena Crevar, UFC BJJ)..." : "Search any competitor full or last name (e.g. Isabella King, Steven Ortiz, Cassia Moura)..."} style={{ display:"block", width:"100%", padding:"10px 34px 10px 36px", borderRadius:"8px", background:"#18202c", color:"#fff", border:"1.5px solid #38bdf8", fontSize:"0.92rem", boxSizing:"border-box" }} />
          {(mode === "ATHLETES" ? athQuery : qStr) && <button type="button" onClick={() => mode === "ATHLETES" ? setAthQuery("") : setQStr("")} style={{ position:"absolute", right:"8px", top:"50%", transform:"translateY(-50%)", background:"#2d3748", color:"#fff", border:"none", borderRadius:"50%", width:"22px", height:"22px", cursor:"pointer" }}>✕</button>}
        </div>
        <div style={{ display:"flex", gap:"5px", flexWrap:"nowrap", overflowX:"auto", WebkitOverflowScrolling:"touch", paddingBottom:"4px", marginBottom:"8px", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", gap:"5px", flexWrap:"nowrap", alignItems:"center", flexShrink:0 }}>
            {[["ALL","🌐 All"],["IBJJF","IBJJF"],["ADCC","ADCC"],["UFC","🟥 UFC BJJ"],["JJWL","JJWL"],["AGF","AGF"],["AJP","AJP"],["SMOOTHCOMP","Smoothcomp"]].map(([k, lbl]) => (
              <button key={k} onClick={() => setFed(k)} style={{ padding:"5px 8px", borderRadius:"6px", border: fed === k ? "1px solid #38bdf8" : "1px solid #2d3748", background: fed === k ? "#162536" : "#181c24", color: fed === k ? "#38bdf8" : "#cbd5e1", fontWeight:"bold", fontSize:"0.74rem", cursor:"pointer" }}>{lbl}</button>
            ))}
            {mode !== "SUPERFIGHTS" && [["ALL","All Ages"],["YOUTH","🐯 Youth"],["ADULT","🥋 Adult"]].map(([ak, albl]) => (
              <button key={ak} onClick={() => setAge(ak)} style={{ padding:"5px 7px", borderRadius:"6px", border:"1px solid #2d3748", background: age === ak ? "#2d3748" : "#181c24", color: age === ak ? "#fff" : "#94a3b8", fontSize:"0.73rem", fontWeight:"bold", cursor:"pointer" }}>{albl}</button>
            ))}
          </div>
          {mode !== "SUPERFIGHTS" && (
            <div style={{ display:"flex", gap:"4px", alignItems:"center", flexShrink:0 }}>
              {[["MEDALS","🥇 Medals"],["POINTS","📈 Points"],["TOTAL","🏅 Total"]].map(([sk, sl]) => (
                <button key={sk} onClick={() => setSortBy(sk)} style={{ padding:"4px 8px", borderRadius:"6px", border: sortBy === sk ? "1px solid #fbbf24" : "1px solid #2d3748", background: sortBy === sk ? "#292011" : "#141820", color: sortBy === sk ? "#fde68a" : "#94a3b8", fontSize:"0.72rem", fontWeight:"bold", cursor:"pointer" }}>{sl}</button>
              ))}
            </div>
          )}
        </div>

        {mode === "SUPERFIGHTS" ? (<SuperFightsPanel fed={fed} qStr={qStr} getWatch={getPodiumWatch} onOpenTrophy={setOpenAthTrophy} onWatch={(nm, ac) => setPodiumWatchPick({ event: { id: "", name: "All Upcoming Tournaments", link: "https://matdates.com/?athlete=" + encodeURIComponent(nm).replace(/%20/g, "+"), sort_date: "" }, comp: { Name: nm, Academy: ac || "", Division: "" }, division: "" })} />) : mode === "ATHLETES" ? (
          <div style={{ overflowY:'auto', WebkitOverflowScrolling:'touch', border:'1px solid #242b38', borderRadius:'8px', background:'#151922', flex:'1 1 auto', minHeight:'260px', padding:'10px' }}>
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
                        <div onClick={() => setOpenAthTrophy(a)} title="Open Official Trophy Room" style={{ color:"#fff", fontWeight:"bold", fontSize:"0.96rem", cursor:"pointer", textDecoration:"underline", textDecorationColor:"rgba(245,158,11,0.55)" }}>{a.name}</div>
                        <div
                          onClick={() => { const gk = normGymKey(a.academy); if (aggregated.byKey[gk]) openTrophyRoom(gk, 'ALL'); }}
                          style={{ color:'#ff9f43', fontSize:'0.78rem', fontWeight:'600', cursor:'pointer', textDecoration:'underline', textDecorationColor:'rgba(255,159,67,0.4)' }}
                        >
                          {a.academy} →
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap' }}>
                        <div style={{ display:'flex', gap:'6px', fontSize:'0.8rem', background:'#111620', padding:'4px 8px', borderRadius:'6px', border:'1px solid #263145' }}>
                          <span>🥇 <strong>{a.g}</strong></span>
                          <span>🥈 <strong>{a.s}</strong></span>
                          <span>🥉 <strong>{a.b}</strong></span>
                        </div>
                        <button type="button" onClick={() => { const nm = a.name || a.n || ""; const ac = a.academy || a.a || ""; setPodiumWatchPick({ event: { id: "", name: "All Upcoming Tournaments", link: "https://matdates.com/?athlete=" + encodeURIComponent(nm).replace(/%20/g, "+"), sort_date: "" }, comp: { Name: nm, Academy: ac, Division: "" }, division: "" }); }} style={{ background: getPodiumWatch(a.name || a.n) ? "#132a1c" : "#162536", color: getPodiumWatch(a.name || a.n) ? "#2ecc71" : "#38bdf8", border: getPodiumWatch(a.name || a.n) ? "1px solid #2ecc71" : "1px solid #0284c7", borderRadius:"6px", padding:"5px 9px", fontSize:"0.74rem", fontWeight:"bold", cursor:"pointer", whiteSpace:"nowrap" }}>{getPodiumWatch(a.name || a.n) ? "✓ Watching" : "🔔 Watch"}</button>
                        <button type="button" onClick={() => setOpenAthTrophy(a)} style={{ background:"#f59e0b", color:"#000", border:"none", borderRadius:"6px", padding:"5px 9px", fontSize:"0.74rem", fontWeight:"800", cursor:"pointer" }}>🏆 Trophy Room</button>
                        <button
                          type="button"
                          onClick={() => copyDirectLink('athlete', a.name)}
                          style={{ background:'#162536', color:'#38bdf8', border:'1px solid #0284c7', borderRadius:'6px', padding:'5px 8px', fontSize:'0.74rem', fontWeight:'bold', cursor:'pointer' }}
                        >
                          🔗 Link
                        </button>
                        <button
                          type="button"
                          onClick={() => setTrophyCard({
                            badge: '2026 VERIFIED ATHLETE TROPHY CARD',
                            title: a.name,
                            subtitle: a.academy,
                            gold: a.g,
                            silver: a.s,
                            bronze: a.b,
                            deepLink: `${buildShareOrigin()}/?athlete=${encodeURIComponent(a.name).replace(/%20/g, '+')}`,
                            lines: a.events.map(m => `${Number(m.p) === 1 ? '🥇' : Number(m.p) === 2 ? '🥈' : '🥉'} ${m.ev} (${m.d.split('/').slice(-2).join('/').trim()})`)
                          })}
                          style={{ background:'#ff9f43', color:'#000', border:'none', borderRadius:'6px', padding:'5px 9px', fontSize:'0.75rem', fontWeight:'bold', cursor:'pointer' }}
                        >
                          📲 Share Stats
                        </button>
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
          <div style={{ overflowY:'auto', WebkitOverflowScrolling:'touch', border:'1px solid #242b38', borderRadius:'8px', background:'#151922', flex:'1 1 auto', minHeight:'260px' }}>
            {aggregated.list.length === 0 && <div style={{ padding:'22px 14px', textAlign:'center', color:'#94a3b8', fontSize:'0.85rem' }}>No academies matched <b>{qStr}</b> under the selected filter — try tapping <b>🌐 All</b> above!</div>}
            {aggregated.list.map((r) => {
              const i = r.trueRank - 1;
              return (
                <div
                  key={`${r.key}_${r.trueRank}`}
                  onClick={() => { document.activeElement?.blur?.(); openTrophyRoom(r.key, 'ALL'); }}
                  style={{ display:'flex', flexDirection:'column', gap:'6px', padding:'11px 12px', borderBottom:'1px solid #1f2532', cursor:'pointer' }}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'6px', width:'100%', minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'baseline', gap:'6px', minWidth:0, flex:1 }}>
                      <strong style={{ color: i < 3 ? '#facc15' : '#64748b', fontSize:'0.86rem', flexShrink:0 }}>#{r.trueRank}</strong>
                      <strong style={{ color:'#fff', fontSize:'0.92rem', lineHeight:1.28, overflowWrap:'anywhere' }}>{r.Academy}</strong>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'5px', flexShrink:0 }}>
                      <span style={{ color:'#34d399', fontWeight:'bold', fontSize:'0.8rem', whiteSpace:'nowrap' }}>{r.Points.toLocaleString()} pts</span>
                      <span style={{ background:'#162536', border:'1px solid #0284c7', borderRadius:'5px', padding:'2px 6px', color:'#38bdf8', fontSize:'0.72rem', fontWeight:'bold', whiteSpace:'nowrap' }}>View →</span>
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
    {openAthTrophy && <div onClick={e=>e.stopPropagation()}><AthleteTrophyRoomModal athlete={openAthTrophy} onClose={() => setOpenAthTrophy(null)} isWatching={Boolean(getPodiumWatch(openAthTrophy.name || openAthTrophy.n))} onWatch={(nm, ac) => setPodiumWatchPick({ event: { id: "", name: "All Upcoming Tournaments", link: "https://matdates.com/?athlete=" + encodeURIComponent(nm).replace(/%20/g, "+"), sort_date: "" }, comp: { Name: nm, Academy: ac || "", Division: "" }, division: "" })} onShareCard={(cd) => { setOpenAthTrophy(null); setTrophyCard(cd); }} /></div>}
      {podiumWatchPick && <div onClick={e=>e.stopPropagation()}><MatAlertModal event={podiumWatchPick.event} comp={podiumWatchPick.comp} division={podiumWatchPick.division} existingWatch={getPodiumWatch(podiumWatchPick.comp.Name)} onRemove={removePodiumWatch} onClose={()=>setPodiumWatchPick(null)}/></div>}</div>
  );
}

export function AthleteSearchModal({ events, onClose, onOpenBracket }) {
  return <UniversalAthleteLookupModal events={events} onClose={onClose} onOpenBracket={onOpenBracket} />;
}
