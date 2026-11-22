import React, { useState, useEffect } from 'react';
import { doc, setDoc, getDoc, collection, getDocs, increment, onSnapshot, arrayUnion, query, where } from 'firebase/firestore';
import { db, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';

export function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true
  );
}

export function isIosSafariBrowser() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  return isIOS && !isStandalonePwa();
}

const IMPRESSION_METRICS = new Set([
  'pageViews', 'trophyViews', 'bracketOpens', 'shareStatsClicks',
  'matAlertsCreated', 'standingsOpens', 'eventHubOpens', 'athleteSearches', 'jitsGgOutclicks', 'appShares'
]);

export function trackEvent(metric, extra = {}) {
  if (typeof window === 'undefined') return;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return;
  try {
    const nowIso = new Date().toISOString();
    const day = nowIso.slice(0, 10);
    const monthKey = 'month_' + nowIso.slice(0, 7);
    const impPatch = IMPRESSION_METRICS.has(metric) ? { verifiedImpressions: increment(1) } : {};
    const patch = { [metric]: increment(1), ...impPatch, updatedAt: nowIso, ...extra };
    setDoc(doc(db, 'site_stats', day), { day, ...patch }, { merge: true }).catch(() => {});
    setDoc(doc(db, 'site_stats', monthKey), { month: nowIso.slice(0, 7), ...patch }, { merge: true }).catch(() => {});
    setDoc(doc(db, 'site_stats', '__totals__'), patch, { merge: true }).catch(() => {});
  } catch {}
}

export function AnalyticsAndPwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [iosBanner, setIosBanner] = useState(false);
  const [showIosSteps, setShowIosSteps] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('md_pwa_dismissed') === '1');
  const [newPhonePushUser, setNewPhonePushUser] = useState(null);
  const [syncingPhonePush, setSyncingPhonePush] = useState(false);
  const [showStats, setShowStats] = useState(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('stats') === '1'
  );

  useEffect(() => {
    const day = new Date().toISOString().slice(0, 10);
    const seenKey = `md_seen_${day}`;
    trackEvent('pageViews');
    if (!sessionStorage.getItem(seenKey)) {
      sessionStorage.setItem(seenKey, '1');
      const isMob = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent || '');
      const extra = {};
      if (isMob) extra.mobileSessions = increment(1);
      if (isStandalonePwa()) extra.pwaSessions = increment(1);
      trackEvent('uniqueSessions', extra);
    }

    if (isIosSafariBrowser()) setIosBanner(true);

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setNewPhonePushUser(null); return; }
      try {
        if (localStorage.getItem('md_push_dismiss_' + u.uid) === '1') return;
        const sup = await isSupported().catch(() => false);
        if (!sup || typeof Notification === 'undefined' || Notification.permission !== 'default') {
          setNewPhonePushUser(null);
          return;
        }
        // Check if this returning user already owns watches or claimed Trophy Rooms in the cloud
        const em = (u.email || '').toLowerCase();
        const [byUid, byOwner] = await Promise.all([
          getDocs(query(collection(db, 'mat_watches'), where('uid', '==', u.uid))),
          getDocs(query(collection(db, 'mat_watches'), where('ownerUid', '==', u.uid)))
        ]);
        if (!byUid.empty || !byOwner.empty || em) {
          setNewPhonePushUser(u);
        }
      } catch {}
    });
    return () => unsub();
  }, []);

  const activatePushOnNewPhone = async () => {
    if (!newPhonePushUser) return;
    setSyncingPhonePush(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        const tok = await getToken(getMessaging(), { serviceWorkerRegistration: reg });
        if (tok) {
          await setDoc(doc(db, 'mat_watches', 'pushdev_' + newPhonePushUser.uid), {
            kind: 'user_push_device',
            uid: newPhonePushUser.uid,
            email: (newPhonePushUser.email || '').toLowerCase(),
            fcmTokens: arrayUnion(tok),
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
        setNewPhonePushUser(null);
      }
    } catch {}
    setSyncingPhonePush(false);
  };

  const dismissPwa = () => {
    localStorage.setItem('md_pwa_dismissed', '1');
    setDismissed(true);
    setShowIosSteps(false);
  };

  const installAndroid = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const res = await deferredPrompt.userChoice;
    if (res && res.outcome === 'accepted') {
      trackEvent('pwaInstalls');
      dismissPwa();
    }
    setDeferredPrompt(null);
  };

  return (
    <>
      {!dismissed && !isStandalonePwa() && (deferredPrompt || iosBanner) && (
        <div style={{
          margin: '0 0 14px 0', padding: '10px 14px', borderRadius: '8px',
          background: '#131b26', border: '1px solid #0284c7',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '10px', flexWrap: 'wrap'
        }}>
          <div style={{ color: '#e2e8f0', fontSize: '0.84rem', lineHeight: 1.4 }}>
            <strong style={{ color: '#38bdf8' }}>{'\u{1F4F2}'} Get the MatDates App:</strong>{' '}
            {iosBanner
              ? 'Add to your iPhone Home Screen for 1-tap tournament access & live iOS Push Alerts.'
              : 'Install MatDates on your Home Screen for instant bracket access & live Push Alerts.'}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => iosBanner ? setShowIosSteps(s => !s) : installAndroid()}
              style={{
                background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px',
                padding: '6px 12px', fontWeight: 'bold', fontSize: '0.78rem', cursor: 'pointer'
              }}
            >
              {iosBanner ? (showIosSteps ? 'Hide Steps' : 'How to Add') : 'Install App'}
            </button>
            <button
              onClick={dismissPwa}
              title="Dismiss"
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.95rem' }}
            >
              {'\u2715'}
            </button>
          </div>
          {showIosSteps && (
            <div style={{
              width: '100%', marginTop: '6px', padding: '10px 12px', borderRadius: '6px',
              background: '#0d1117', border: '1px solid #1e293b', color: '#cbd5e1', fontSize: '0.8rem', lineHeight: 1.5
            }}>
              <div><strong>Step 1:</strong> Tap the <strong>Share</strong> icon ({'\u2B06\uFE0F'}) at the bottom of Safari.</div>
              <div><strong>Step 2:</strong> Scroll down and tap <strong>"Add to Home Screen"</strong> {'\u2192'} <strong>Add</strong>.</div>
              <div style={{ color: '#2ecc71', marginTop: '3px' }}>Opening MatDates from your Home Screen icon unlocks instant iPhone Push Notifications!</div>
            </div>
          )}
        </div>
      )}
      {newPhonePushUser && (
        <div style={{
          margin: '0 0 14px 0', padding: '10px 14px', borderRadius: '8px',
          background: '#132a1c', border: '1px solid #22c55e',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap'
        }}>
          <div style={{ color: '#e2e8f0', fontSize: '0.83rem', lineHeight: 1.4 }}>
            <strong style={{ color: '#4ade80' }}>📲 Signed in on this device:</strong> Tap once to link live Mat # &amp; Bracket Opponent Push Alerts to this phone!
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={activatePushOnNewPhone} disabled={syncingPhonePush} style={{ background: '#22c55e', color: '#000', border: 'none', borderRadius: '6px', padding: '6px 12px', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer' }}>
              {syncingPhonePush ? 'Linking...' : '🔔 Enable Push on This Phone'}
            </button>
            <button onClick={() => { try { localStorage.setItem('md_push_dismiss_' + newPhonePushUser.uid, '1'); } catch {} setNewPhonePushUser(null); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.95rem' }}>✕</button>
          </div>
        </div>
      )}
      {showStats && <SponsorStatsModal onClose={() => setShowStats(false)} />}
    </>
  );
}

function SponsorStatsModal({ onClose }) {
  const [totalsDoc, setTotalsDoc] = useState({});
  const [allDaily, setAllDaily] = useState([]);
  const [watchStats, setWatchStats] = useState({ active: 0, push: 0, claimedBios: 0, pushDevices: 0 });
  const [accountStats, setAccountStats] = useState({ total: 0, user: 0, academy: 0, promoter: 0 });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Live listener on site_stats so opening ?stats=1 never races ahead of trackEvent() writes
    const unsubStats = onSnapshot(collection(db, 'site_stats'), (snap) => {
      let rawTotals = {};
      const dateRows = [];
      const monthDocs = {};

      snap.forEach(d => {
        const data = d.data() || {};
        if (d.id === '__totals__') {
          rawTotals = data;
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(d.id)) {
          dateRows.push({ id: d.id, ...data });
        } else if (/^month_\d{4}-\d{2}$/.test(d.id)) {
          monthDocs[d.id] = data;
        }
      });

      dateRows.sort((a, b) => b.id.localeCompare(a.id));
      setAllDaily(dateRows);
      setTotalsDoc(rawTotals);

      // Auto-heal __totals__ & current month_YYYY-MM if historical YYYY-MM-DD rows exceed stored counters!
      const metricKeys = [
        'uniqueSessions', 'pageViews', 'athleteSearches', 'bracketOpens',
        'matAlertsCreated', 'jitsGgOutclicks', 'trophyViews', 'shareStatsClicks',
        'igOutclicks', 'standingsOpens', 'eventHubOpens', 'verifiedImpressions',
        'mobileSessions', 'pwaSessions', 'pwaInstalls'
      ];
      const summedAll = {};
      const curMonthPrefix = new Date().toISOString().slice(0, 7);
      const curMonthKey = 'month_' + curMonthPrefix;
      const summedMonth = {};

      dateRows.forEach(r => {
        metricKeys.forEach(k => {
          const v = Number(r[k] || 0);
          if (v > 0) {
            summedAll[k] = (summedAll[k] || 0) + v;
            if (r.id.startsWith(curMonthPrefix)) {
              summedMonth[k] = (summedMonth[k] || 0) + v;
            }
          }
        });
      });

      const totalsPatch = {};
      metricKeys.forEach(k => {
        if ((summedAll[k] || 0) > Number(rawTotals[k] || 0)) {
          totalsPatch[k] = summedAll[k];
        }
      });
      if (Object.keys(totalsPatch).length > 0) {
        setDoc(doc(db, 'site_stats', '__totals__'), { ...totalsPatch, reconciledAt: new Date().toISOString() }, { merge: true }).catch(() => {});
      }

      const curMonthDoc = monthDocs[curMonthKey] || {};
      const monthPatch = {};
      metricKeys.forEach(k => {
        if ((summedMonth[k] || 0) > Number(curMonthDoc[k] || 0)) {
          monthPatch[k] = summedMonth[k];
        }
      });
      if (Object.keys(monthPatch).length > 0) {
        setDoc(doc(db, 'site_stats', curMonthKey), { month: curMonthPrefix, ...monthPatch }, { merge: true }).catch(() => {});
      }
    }, () => {});

    // Separate real Athlete Watches from Claimed Trophy Rooms & Push Devices
    const unsubWatches = onSnapshot(collection(db, 'mat_watches'), (snap) => {
      let active = 0, push = 0, claimedBios = 0, pushDevices = 0;
      const roleByKey = new Map();
      const acadOwners = new Set();
      const promOwners = new Set();
      snap.forEach(d => {
        const w = d.data() || {};
        if (w.kind === 'athlete_bio') {
          claimedBios += 1;
          return;
        }
        if (w.kind === 'user_push_device') {
          const toks = Array.isArray(w.fcmTokens) ? w.fcmTokens.filter(Boolean) : [];
          pushDevices += toks.length;
          return;
        }
        if (w.kind === 'user_role') {
          const uk = w.uid || (w.email || '').toLowerCase() || d.id;
          roleByKey.set(uk, w.role || 'user');
          return;
        }
        if (w.kind === 'academy_workspace') {
          const uk = w.ownerUid || (w.ownerEmail || '').toLowerCase();
          if (uk) acadOwners.add(uk);
          return;
        }
        if (w.kind === 'promoter_workspace') {
          const uk = w.ownerUid || (w.ownerEmail || '').toLowerCase();
          if (uk) promOwners.add(uk);
          return;
        }
        if (w.kind) return;
        if (w.active !== false || w.followFuture === true) {
          active += 1;
          if (w.fcmToken) push += 1;
        }
      });
      acadOwners.forEach(k => { if (!roleByKey.has(k) || roleByKey.get(k) === 'user') roleByKey.set(k, 'academy'); });
      promOwners.forEach(k => { if (!roleByKey.has(k) || roleByKey.get(k) === 'user') roleByKey.set(k, 'promoter'); });
      let uCnt = 0, aCnt = 0, pCnt = 0;
      roleByKey.forEach(r => {
        if (r === 'academy') aCnt++;
        else if (r === 'promoter') pCnt++;
        else uCnt++;
      });
      setAccountStats({ total: roleByKey.size, user: uCnt, academy: aCnt, promoter: pCnt });
      setWatchStats({ active, push, claimedBios, pushDevices });
    }, () => {});

    return () => {
      unsubStats();
      unsubWatches();
    };
  }, []);

  // Compute true totals (always taking the higher of __totals__ or sum of all YYYY-MM-DD rows)
  const sumKey = (k, prefix = '') => allDaily.reduce((acc, r) => acc + ((!prefix || r.id.startsWith(prefix)) ? Number(r[k] || 0) : 0), 0);
  const getTot = (k) => Math.max(Number(totalsDoc[k] || 0), sumKey(k));

  const curMonth = new Date().toISOString().slice(0, 7);
  const monthVisits = sumKey('uniqueSessions', curMonth);
  const monthViews = sumKey('pageViews', curMonth);
  const days = allDaily.slice(0, 14);

  const cards = [
    { label: 'Unique Visits (All-Time)', val: getTot('uniqueSessions'), sub: `${monthVisits.toLocaleString()} in ${curMonth}`, color: '#38bdf8' },
    { label: 'Total Pageviews', val: getTot('pageViews'), sub: `${monthViews.toLocaleString()} in ${curMonth}`, color: '#e2e8f0' },
    { label: 'Trophy Room Views', val: getTot('trophyViews'), sub: `${watchStats.claimedBios} Claimed Profiles`, color: '#fbbf24' },
    { label: 'Athlete Lookups', val: getTot('athleteSearches'), sub: `${getTot('standingsOpens')} Standings Opens`, color: '#ff9f43' },
    { label: 'Bracket / Roster Opens', val: getTot('bracketOpens'), sub: `${getTot('jitsGgOutclicks')} Record Clicks`, color: '#a78bfa' },
    { label: 'Mat Alerts Created', val: getTot('matAlertsCreated'), sub: `${getTot('shareStatsClicks')} Trophy Shares`, color: '#2ecc71' },
    { label: 'Active Athlete Watches', val: `${watchStats.active} (${watchStats.push} Push)`, sub: `${watchStats.claimedBios} Verified Trophy Rooms`, color: '#34d399' }
  ];

  const copySummary = () => {
    const txt = [
      'MatDates.com — Live BJJ Audience & Engagement Snapshot',
      `• Unique Competitor/Parent Visits: ${getTot('uniqueSessions').toLocaleString()} (${monthVisits.toLocaleString()} this month)`,
      `• Total Pageviews: ${getTot('pageViews').toLocaleString()}`,
      `• Official Trophy Room Views: ${getTot('trophyViews').toLocaleString()} (${watchStats.claimedBios.toLocaleString()} Claimed Profiles)`,
      `• Athlete & Squad Searches: ${getTot('athleteSearches').toLocaleString()}`,
      `• Live Division Roster Opens: ${getTot('bracketOpens').toLocaleString()}`,
      `• Active Athlete Mat Watches: ${watchStats.active.toLocaleString()} (${watchStats.push.toLocaleString()} Push Enabled)`,
      '• 100% Exclusive Single-Sponsor Inventory (Zero Ad Clutter)'
    ].join('\n');
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.86)', zIndex:10080, display:'flex', alignItems:'center', justifyContent:'center', padding:'10px', boxSizing:'border-box' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#11141b', border:'1px solid #2d3748', borderRadius:'12px', maxWidth:'720px', width:'100%', padding:'16px', boxSizing:'border-box', overflowX:'hidden', maxHeight:'88svh', overflowY:'auto', color:'#fff' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
          <h3 style={{ margin:0, fontSize:'1.2rem' }}>{'\u{1F4CA}'} MatDates Traction &amp; Sponsor Metrics</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#94a3b8', fontSize:'1.1rem', cursor:'pointer' }}>{'\u2715'}</button>
        </div>
        <p style={{ margin:'0 0 14px', color:'#94a3b8', fontSize:'0.8rem' }}>
          Live self-reconciling engagement counters (excludes localhost). Bookmark <strong>matdates.com/?stats=1</strong> anytime.
        </p>
        <div style={{ background:'#161d2b', border:'1px solid #334155', borderRadius:'10px', padding:'10px 13px', marginBottom:'12px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'10px' }}>
          <div style={{ fontSize:'0.82rem', fontWeight:'800', color:'#f8fafc' }}>
            👥 Registered Accounts: <span style={{ color:'#38bdf8', fontSize:'1.05rem' }}>{accountStats.total.toLocaleString()}</span>
          </div>
          <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', fontSize:'0.77rem', color:'#cbd5e1', fontWeight:'700' }}>
            <span>🥋 Athletes / Parents: <b style={{ color:'#fde047' }}>{accountStats.user}</b></span>
            <span>🏛️ Academies: <b style={{ color:'#ff9f43' }}>{accountStats.academy}</b></span>
            <span>🏟️ Promoters: <b style={{ color:'#4ade80' }}>{accountStats.promoter}</b></span>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(190px, 1fr))', gap:'10px', marginBottom:'16px' }}>
          {cards.map((c, i) => (
            <div key={i} style={{ background:'#181c24', border:'1px solid #242b38', borderRadius:'8px', padding:'12px' }}>
              <div style={{ color:'#94a3b8', fontSize:'0.74rem', marginBottom:'4px' }}>{c.label}</div>
              <div style={{ color:c.color, fontSize:'1.28rem', fontWeight:'bold' }}>
                {typeof c.val === 'number' ? c.val.toLocaleString() : c.val}
              </div>
              {c.sub && <div style={{ color:'#64748b', fontSize:'0.7rem', marginTop:'3px' }}>{c.sub}</div>}
            </div>
          ))}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px', gap:'8px', flexWrap:'wrap' }}>
          <strong style={{ fontSize:'0.88rem', color:'#cbd5e1' }}>Last 14 Days Activity (Daily UTC)</strong>
          <button onClick={copySummary} style={{ background:'#ff9f43', color:'#000', border:'none', borderRadius:'6px', padding:'6px 12px', fontWeight:'bold', fontSize:'0.78rem', cursor:'pointer' }}>
            {copied ? '\u2713 Copied Sponsor Summary!' : '\u{1F4CB} Copy Sponsor Pitch Summary'}
          </button>
        </div>
        <div style={{ border:'1px solid #242b38', borderRadius:'8px', overflowX:'auto', background:'#151922' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.8rem', textAlign:'left' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid #242b38', color:'#94a3b8' }}>
                <th style={{ padding:'8px 10px' }}>Date (UTC)</th>
                <th style={{ padding:'8px 10px' }}>Visits</th>
                <th style={{ padding:'8px 10px' }}>Views</th>
                <th style={{ padding:'8px 10px' }}>Trophies</th>
                <th style={{ padding:'8px 10px' }}>Lookups</th>
                <th style={{ padding:'8px 10px' }}>Rosters</th>
                <th style={{ padding:'8px 10px' }}>Alerts</th>
              </tr>
            </thead>
            <tbody>
              {days.length === 0 ? (
                <tr><td colSpan={7} style={{ padding:'14px', textAlign:'center', color:'#64748b' }}>Live production metrics begin recording as visitors browse matdates.com.</td></tr>
              ) : days.map(d => (
                <tr key={d.id} style={{ borderBottom:'1px solid #1f2532' }}>
                  <td style={{ padding:'8px 10px', fontWeight:'bold' }}>{d.id}</td>
                  <td style={{ padding:'8px 10px', color:'#38bdf8' }}>{d.uniqueSessions || 0}</td>
                  <td style={{ padding:'8px 10px' }}>{d.pageViews || 0}</td>
                  <td style={{ padding:'8px 10px', color:'#fbbf24' }}>{d.trophyViews || 0}</td>
                  <td style={{ padding:'8px 10px', color:'#ff9f43' }}>{d.athleteSearches || 0}</td>
                  <td style={{ padding:'8px 10px', color:'#a78bfa' }}>{d.bracketOpens || 0}</td>
                  <td style={{ padding:'8px 10px', color:'#2ecc71' }}>{d.matAlertsCreated || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
