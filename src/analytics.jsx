import React, { useState, useEffect } from 'react';
import { doc, setDoc, getDoc, collection, getDocs, increment } from 'firebase/firestore';
import { db } from './firebase';

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
  'matAlertsCreated', 'standingsOpens', 'eventHubOpens', 'athleteSearches'
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
      {showStats && <SponsorStatsModal onClose={() => setShowStats(false)} />}
    </>
  );
}

function SponsorStatsModal({ onClose }) {
  const [totals, setTotals] = useState(null);
  const [days, setDays] = useState([]);
  const [watchStats, setWatchStats] = useState({ active: 0, push: 0 });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'site_stats', '__totals__'))
      .then(d => setTotals(d.exists() ? d.data() : {}))
      .catch(() => setTotals({}));

    getDocs(collection(db, 'site_stats'))
      .then(snap => {
        const list = [];
        snap.forEach(d => {
          if (d.id !== '__totals__') list.push({ id: d.id, ...d.data() });
        });
        list.sort((a, b) => b.id.localeCompare(a.id));
        setDays(list.slice(0, 14));
      })
      .catch(() => {});

    getDocs(collection(db, 'mat_watches'))
      .then(snap => {
        let active = 0, push = 0;
        snap.forEach(d => {
          const w = d.data() || {};
          if (w.active !== false) {
            active += 1;
            if (w.fcmToken) push += 1;
          }
        });
        setWatchStats({ active, push });
      })
      .catch(() => {});
  }, []);

  const t = totals || {};
  const cards = [
    { label: 'Unique Daily Visits', val: t.uniqueSessions || 0, color: '#38bdf8' },
    { label: 'Total Pageviews', val: t.pageViews || 0, color: '#e2e8f0' },
    { label: 'Athlete Lookups', val: t.athleteSearches || 0, color: '#ff9f43' },
    { label: 'Bracket / Roster Opens', val: t.bracketOpens || 0, color: '#a78bfa' },
    { label: 'Mat Alerts Created', val: t.matAlertsCreated || 0, color: '#2ecc71' },
    { label: 'Active Live Watches', val: `${watchStats.active || t.activeWatches || 0} (${watchStats.push || t.activePushWatches || 0} Push)`, color: '#34d399' }
  ];

  const copySummary = () => {
    const txt = [
      'MatDates.com — Live BJJ Audience & Engagement Snapshot',
      `• Unique Daily Competitor/Parent Visits: ${(t.uniqueSessions || 0).toLocaleString()}`,
      `• Total Pageviews: ${(t.pageViews || 0).toLocaleString()}`,
      `• Athlete & Squad Searches: ${(t.athleteSearches || 0).toLocaleString()}`,
      `• Live Division Roster Opens: ${(t.bracketOpens || 0).toLocaleString()}`,
      `• Mat & Match Time Alerts Triggered: ${(t.matAlertsCreated || 0).toLocaleString()}`,
      '• 100% Exclusive Single-Sponsor Inventory (Zero Ad Clutter)'
    ].join('\n');
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.86)', zIndex:10080, display:'flex', alignItems:'center', justifyContent:'center', padding:'10px', boxSizing:'border-box' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#11141b', border:'1px solid #2d3748', borderRadius:'12px', maxWidth:'680px', width:'100%', padding:'16px', boxSizing:'border-box', overflowX:'hidden', maxHeight:'88svh', overflowY:'auto', color:'#fff' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
          <h3 style={{ margin:0, fontSize:'1.2rem' }}>{'\u{1F4CA}'} MatDates Traction & Sponsor Metrics</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#94a3b8', fontSize:'1.1rem', cursor:'pointer' }}>{'\u2715'}</button>
        </div>
        <p style={{ margin:'0 0 14px', color:'#94a3b8', fontSize:'0.8rem' }}>
          Cookie-free, privacy-safe engagement counters (excludes localhost). Bookmark <strong>matdates.com/?stats=1</strong> anytime.
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(185px, 1fr))', gap:'10px', marginBottom:'16px' }}>
          {cards.map((c, i) => (
            <div key={i} style={{ background:'#181c24', border:'1px solid #242b38', borderRadius:'8px', padding:'12px' }}>
              <div style={{ color:'#94a3b8', fontSize:'0.75rem', marginBottom:'4px' }}>{c.label}</div>
              <div style={{ color:c.color, fontSize:'1.3rem', fontWeight:'bold' }}>
                {typeof c.val === 'number' ? c.val.toLocaleString() : c.val}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
          <strong style={{ fontSize:'0.88rem', color:'#cbd5e1' }}>Last 14 Days Activity</strong>
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
                <th style={{ padding:'8px 10px' }}>Lookups</th>
                <th style={{ padding:'8px 10px' }}>Rosters</th>
                <th style={{ padding:'8px 10px' }}>Alerts</th>
              </tr>
            </thead>
            <tbody>
              {days.length === 0 ? (
                <tr><td colSpan={6} style={{ padding:'14px', textAlign:'center', color:'#64748b' }}>Live production metrics begin recording as visitors browse matdates.com.</td></tr>
              ) : days.map(d => (
                <tr key={d.id} style={{ borderBottom:'1px solid #1f2532' }}>
                  <td style={{ padding:'8px 10px', fontWeight:'bold' }}>{d.id}</td>
                  <td style={{ padding:'8px 10px', color:'#38bdf8' }}>{d.uniqueSessions || 0}</td>
                  <td style={{ padding:'8px 10px' }}>{d.pageViews || 0}</td>
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
