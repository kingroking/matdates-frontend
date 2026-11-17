import { isIosSafariBrowser, trackEvent } from './analytics';
import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { db, auth } from './firebase';

const LS_KEY = 'md_watches_v1';
const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
  catch { return []; }
};
const writeLocal = (arr) => {
  localStorage.setItem(LS_KEY, JSON.stringify(arr));
  window.dispatchEvent(new Event('md-watches-updated'));
};

let fgBound = false;
function bindForegroundPush() {
  if (fgBound || typeof window === 'undefined') return;
  fgBound = true;
  isSupported().then((ok) => {
    if (!ok) return;
    try {
      onMessage(getMessaging(), (payload) => {
        const d = payload.data || {};
        const title = (payload.notification && payload.notification.title) || d.title || 'MatDates Live Alert';
        const body = (payload.notification && payload.notification.body) || d.body || '';
        if ('Notification' in window && Notification.permission === 'granted') {
          try { new Notification(title, { body, icon: '/mat-icon.png' }); } catch {}
        }
        window.dispatchEvent(new CustomEvent('md-live-push', { detail: { title, body, url: d.url || '' } }));
      });
    } catch {}
  }).catch(() => {});
}

export function useWatchedAthletes() {
  const [fsList, setFsList] = useState([]);
  const [locList, setLocList] = useState(readLocal);

  useEffect(() => {
    bindForegroundPush();
    const sync = () => setLocList(readLocal());
    window.addEventListener('md-watches-updated', sync);
    let unsubFs = null;
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (unsubFs) { unsubFs(); unsubFs = null; }
      if (!u) { setFsList([]); return; }
      const q = query(collection(db, 'mat_watches'), where('uid', '==', u.uid));
      unsubFs = onSnapshot(q, (snap) => {
        setFsList(
          snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(w => w.active !== false || w.followFuture === true)
        );
      }, () => {});
    });
    return () => {
      window.removeEventListener('md-watches-updated', sync);
      if (unsubFs) unsubFs();
      unsubAuth();
    };
  }, []);

  const merged = new Map();
  [...locList, ...fsList].forEach(w => {
    if (w && (w.active !== false || w.followFuture === true) && w.athleteName) {
      const k = w.id || `${w.eventId || ''}::${w.athleteName.toLowerCase()}`;
      merged.set(k, w);
    }
  });
  const watches = Array.from(merged.values());

  const getWatch = (name, eventId) => {
    const n = (name || '').trim().toLowerCase();
    if (!n) return null;
    return watches.find(w =>
      (w.athleteName || '').trim().toLowerCase() === n &&
      (!eventId || !w.eventId || w.eventId === eventId || w.followFuture === true)
    ) || null;
  };

  const removeWatch = async (w) => {
    if (!w) return;
    writeLocal(readLocal().filter(x =>
      x.id !== w.id && !(x.athleteName === w.athleteName && x.eventId === w.eventId)
    ));
    if (w.id) {
      try { await deleteDoc(doc(db, 'mat_watches', w.id)); }
      catch {
        try { await updateDoc(doc(db, 'mat_watches', w.id), { active: false, followFuture: false }); }
        catch (e) { console.warn('Remove watch warn:', e); }
      }
    }
  };

  return { watches, getWatch, removeWatch };
}

const OVERLAY = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.86)',
  zIndex: 10050, display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '12px', boxSizing: 'border-box'
};
const BOX = {
  backgroundColor: '#12151c', border: '1px solid #2d3748', borderRadius: '12px',
  maxWidth: '450px', width: '100%', boxSizing: 'border-box', padding: '18px',
  maxHeight: '88svh', overflowY: 'auto', textAlign: 'left'
};

export function MatAlertModal({ event, comp, division, existingWatch, onRemove, onClose }) {
  const curUser = auth.currentUser;
  const iosSafari = isIosSafariBrowser();
  const [email, setEmail] = useState(
    () => (curUser && curUser.email) || localStorage.getItem('md_alert_email') || ''
  );
  const [wantPush, setWantPush] = useState(() => !iosSafari);
  const [followFuture, setFollowFuture] = useState(true);
  const [fcmToken, setFcmToken] = useState('');
  const [pushStatus, setPushStatus] = useState('idle');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const acquirePushToken = async () => {
    await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const reg = await navigator.serviceWorker.ready;
    if (reg.installing || reg.waiting) {
      await new Promise((r) => setTimeout(r, 500));
    }
    const vapid = import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined;
    const opts = vapid ? { serviceWorkerRegistration: reg, vapidKey: vapid } : { serviceWorkerRegistration: reg };
    try {
      return await getToken(getMessaging(), opts);
    } catch {
      await new Promise((r) => setTimeout(r, 700));
      return await getToken(getMessaging(), opts);
    }
  };

  useEffect(() => {
    if (existingWatch || typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      setPushStatus('requesting');
      isSupported().then((ok) => {
        if (!ok) return setPushStatus('idle');
        return acquirePushToken().then((tok) => {
          if (tok) { setFcmToken(tok); setPushStatus('ready'); }
          else setPushStatus('idle');
        });
      }).catch(() => setPushStatus('idle'));
    } else if (Notification.permission === 'denied') {
      setPushStatus('denied');
      setWantPush(false);
    }
  }, [existingWatch]);

  const requestPushNow = async () => {
    if (fcmToken) return fcmToken;
    setPushStatus('requesting');
    try {
      const ok = await isSupported();
      if (!ok || !('Notification' in window) || !('serviceWorker' in navigator)) {
        setPushStatus('unsupported');
        return '';
      }
      const perm = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
      if (perm === 'denied') { setPushStatus('denied'); return ''; }
      if (perm !== 'granted') { setPushStatus('idle'); return ''; }
      const tok = await acquirePushToken();
      if (tok) { setFcmToken(tok); setPushStatus('ready'); return tok; }
      setPushStatus('email_only');
      return '';
    } catch (e) {
      console.warn('Web push fallback:', e);
      setPushStatus('email_only');
      return '';
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalToken = fcmToken;
      if (wantPush && !iosSafari && !finalToken) {
        finalToken = await requestPushNow();
      }
      if (!email.trim() && !finalToken) {
        alert('Please enter an email address (or allow Push Notifications when prompted) so we have a way to reach you.');
        setSaving(false);
        return;
      }
      if (email.trim()) localStorage.setItem('md_alert_email', email.trim());
      const initId = event.id || '';
      const payload = {
        eventId: initId,
        eventName: event.name || '',
        eventLink: event.link || '',
        sortDate: event.sort_date || '',
        athleteName: comp.Name || '',
        academy: comp.Academy || '',
        division: division || comp.Division || '',
        profileUrl: comp.Profile || comp.JitsProfile || '',
        email: email.trim(),
        fcmToken: finalToken || '',
        uid: curUser ? curUser.uid : '',
        followFuture: Boolean(followFuture),
        notifiedEvents: initId ? [initId] : [],
        lastMat: '',
        lastTime: '',
        active: true,
        createdAt: new Date().toISOString()
      };
      const ref = await addDoc(collection(db, 'mat_watches'), payload);
      writeLocal([...readLocal(), { id: ref.id, ...payload }]);
      trackEvent('matAlertsCreated');
      setDoc(doc(db, 'site_stats', '__totals__'), {
        activeWatches: increment(1),
        ...(finalToken ? { activePushWatches: increment(1) } : {})
      }, { merge: true }).catch(() => {});
      if (finalToken) trackEvent('pushAlertsEnabled');
      setDone(true);
    } catch (err) {
      alert('Could not save alert (' + (err.code || err.message) + ')');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} style={OVERLAY}>
      <div onClick={e => e.stopPropagation()} style={BOX}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
          <h3 style={{ margin:0, color:'#fff', fontSize:'1.08rem' }}>{'\u{1F514}'} Live Athlete Alerts</h3>
          <button onClick={onClose} aria-label="Close" style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'6px', color:'#e2e8f0', fontSize:'1rem', padding:'4px 9px', cursor:'pointer', flexShrink:0 }}>{'\u2715'}</button>
        </div>
        <p style={{ margin:'0 0 12px', color:'#cbd5e1', fontSize:'0.84rem', lineHeight:1.4 }}>
          Watch <strong style={{ color:'#ff9f43' }}>{comp.Name}</strong> ({division}) at <strong>{event.name}</strong>.
        </p>
        {existingWatch && !done ? (
          <div style={{ background:'#132a1c', border:'1px solid #2ecc71', borderRadius:'8px', padding:'14px' }}>
            <div style={{ color:'#2ecc71', fontWeight:'bold', marginBottom:'6px' }}>{'\u2713'} Active Athlete Watch</div>
            <div style={{ color:'#cbd5e1', fontSize:'0.82rem', marginBottom:'10px', lineHeight:1.55 }}>
              <div>{existingWatch.fcmToken ? '\u{1F4F2} Phone / Browser Push: Enabled' : '\u{1F4F2} Phone / Browser Push: Off'}</div>
              <div>{existingWatch.email ? `\u2709\uFE0F Email Alerts: ${existingWatch.email}` : '\u2709\uFE0F Email Alerts: None'}</div>
              <div>{existingWatch.followFuture ? '\u{1F501} Following All Future Tournaments: Yes' : '\u{1F501} Following Future Tournaments: This Event Only'}</div>
              {(existingWatch.lastMat || existingWatch.lastTime) && (
                <div style={{ color:'#ff9f43', marginTop:'4px' }}>
                  Latest: {[existingWatch.lastMat, existingWatch.lastTime && `Est. ${existingWatch.lastTime}`].filter(Boolean).join(' • ')}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={async () => { await onRemove(existingWatch); onClose(); }}
              style={{ width:'100%', padding:'9px 12px', background:'#7f1d1d', color:'#fecaca', border:'1px solid #ef4444', borderRadius:'6px', fontWeight:'bold', cursor:'pointer' }}
            >
              Stop Watching {comp.Name}
            </button>
          </div>
        ) : done ? (
          <div style={{ background:'#132a1c', border:'1px solid #2ecc71', borderRadius:'8px', padding:'14px', textAlign:'center' }}>
            <div style={{ color:'#2ecc71', fontWeight:'bold', marginBottom:'6px' }}>{'\u2713'} Athlete Alerts Activated!</div>
            <div style={{ color:'#cbd5e1', fontSize:'0.82rem', marginBottom:'12px', lineHeight:1.45 }}>
              Delivering via <strong>{[fcmToken && 'Phone/Browser Push', email.trim() && 'Email'].filter(Boolean).join(' + ')}</strong> when Mat # or Match Time posts{followFuture ? ' — plus automatic alerts whenever they register for future tournaments!' : '.'}
            </div>
            <button onClick={onClose} style={{ padding:'8px 18px', background:'#2ecc71', color:'#000', border:'none', borderRadius:'6px', fontWeight:'bold', cursor:'pointer' }}>Done</button>
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {iosSafari ? (
              <div style={{ background:'#131b26', border:'1px solid #0284c7', borderRadius:'8px', padding:'10px 12px', fontSize:'0.79rem', color:'#cbd5e1', lineHeight:1.45 }}>
                <div style={{ color:'#38bdf8', fontWeight:'bold', marginBottom:'3px' }}>{'\u{1F4F2}'} Want Lock-Screen iPhone Push Too?</div>
                Tap Safari's <strong>Share ({'\u2B06\uFE0F'})</strong> {'\u2192'} <strong>"Add to Home Screen"</strong> and open the MatDates app icon — or enter your email below right now!
              </div>
            ) : (
              <label style={{
                display:'flex', alignItems:'flex-start', gap:'10px', cursor:'pointer',
                padding:'10px 12px', borderRadius:'8px',
                background: wantPush ? (fcmToken ? '#132a1c' : '#131f2e') : '#181c24',
                border: wantPush ? (fcmToken ? '1px solid #2ecc71' : '1px solid #0284c7') : '1px solid #334155'
              }}>
                <input
                  type="checkbox"
                  checked={wantPush}
                  onChange={async (e) => {
                    const checked = e.target.checked;
                    setWantPush(checked);
                    if (checked && !fcmToken) await requestPushNow();
                  }}
                  style={{ marginTop:'3px', width:'18px', height:'18px', accentColor:'#2ecc71', flexShrink:0 }}
                />
                <div style={{ fontSize:'0.82rem', lineHeight:1.38 }}>
                  <div style={{ color: fcmToken && wantPush ? '#2ecc71' : '#fff', fontWeight:'bold' }}>
                    {fcmToken && wantPush
                      ? '\u2713 Instant Phone / Browser Push Ready!'
                      : '\u{1F4F2} Send Instant Phone / Browser Push Alerts'}
                  </div>
                  <div style={{ color:'#94a3b8', fontSize:'0.75rem', marginTop:'2px' }}>
                    {fcmToken && wantPush
                      ? 'This device is connected for lock-screen & live push alerts.'
                      : pushStatus === 'denied'
                        ? 'Blocked in browser settings — using Email Alerts below.'
                        : 'Tap "Allow" if your phone/browser asks when you activate below.'}
                  </div>
                </div>
              </label>
            )}

            <label style={{
              display:'flex', alignItems:'flex-start', gap:'10px', cursor:'pointer',
              padding:'10px 12px', borderRadius:'8px',
              background: followFuture ? '#1a1829' : '#181c24',
              border: followFuture ? '1px solid #a78bfa' : '1px solid #334155'
            }}>
              <input
                type="checkbox"
                checked={followFuture}
                onChange={(e) => setFollowFuture(e.target.checked)}
                style={{ marginTop:'3px', width:'18px', height:'18px', accentColor:'#a78bfa', flexShrink:0 }}
              />
              <div style={{ fontSize:'0.82rem', lineHeight:1.38 }}>
                <div style={{ color: followFuture ? '#ddd6fe' : '#fff', fontWeight:'bold' }}>
                  {'\u{1F501}'} Follow Across All Future Tournaments
                </div>
                <div style={{ color:'#94a3b8', fontSize:'0.75rem', marginTop:'2px' }}>
                  Auto-alert me whenever {comp.Name} registers for any new tournament & track their mat times automatically.
                </div>
              </div>
            </label>

            <div>
              <label style={{ display:'block', color:'#cbd5e1', fontSize:'0.78rem', fontWeight:'bold', marginBottom:'4px' }}>
                {'\u2709\uFE0F'} Backup Email Address {wantPush && !iosSafari ? '(Recommended)' : '(Required)'}
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required={!wantPush || iosSafari}
                style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', borderRadius:'6px', background:'#1a202c', color:'#fff', border:'1px solid #334155', fontSize:'0.95rem' }}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{ padding:'12px', borderRadius:'7px', background:'#ff9f43', color:'#000', border:'none', fontWeight:'bold', fontSize:'0.94rem', cursor:'pointer' }}
            >
              {saving
                ? (pushStatus === 'requesting' ? 'Tap "Allow" on Prompt...' : 'Activating Alerts...')
                : `\u{1F514} Activate ${wantPush && !iosSafari ? 'Push & Email ' : ''}Alerts`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function WatchedAthletesModal({ watches, onRemove, onOpenAthlete, onClose }) {
  return (
    <div onClick={onClose} style={OVERLAY}>
      <div onClick={e => e.stopPropagation()} style={BOX}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
          <h3 style={{ margin:0, color:'#fff', fontSize:'1.1rem' }}>
            {'\u{1F514}'} My Watched Athletes ({watches.length})
          </h3>
          <button onClick={onClose} aria-label="Close" style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'6px', color:'#e2e8f0', fontSize:'1rem', padding:'4px 9px', cursor:'pointer', flexShrink:0 }}>{'\u2715'}</button>
        </div>
        <p style={{ margin:'0 0 14px', color:'#94a3b8', fontSize:'0.8rem', lineHeight:1.4 }}>
          Live Mat # & Match Time polling on tournament weekends — plus new-event alerts for followed athletes.
        </p>
        {watches.length === 0 ? (
          <div style={{ padding:'22px 14px', textAlign:'center', background:'#181c24', borderRadius:'8px', color:'#94a3b8', fontSize:'0.86rem' }}>
            No active athlete watches yet. Open any tournament division roster and tap <strong style={{ color:'#38bdf8' }}>{'\u{1F514}'} Mat Alert</strong> next to an athlete.
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {watches.map((w, idx) => (
              <div key={w.id || idx} style={{ background:'#181c24', border:'1px solid #2d3748', borderRadius:'8px', padding:'12px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px', marginBottom:'4px', flexWrap:'wrap' }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ color:'#fff', fontWeight:'bold', fontSize:'0.95rem', wordBreak:'break-word' }}>{w.athleteName}</div>
                    <div style={{ color:'#94a3b8', fontSize:'0.77rem' }}>
                      {[w.division, w.academy].filter(Boolean).join(' • ')}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                    {w.fcmToken && (
                      <span style={{ background:'#132a1c', color:'#2ecc71', border:'1px solid #2ecc71', borderRadius:'4px', padding:'2px 6px', fontSize:'0.68rem', fontWeight:'bold' }}>
                        {'\u{1F4F2}'} Push
                      </span>
                    )}
                    {w.email && (
                      <span style={{ background:'#162536', color:'#38bdf8', border:'1px solid #0284c7', borderRadius:'4px', padding:'2px 6px', fontSize:'0.68rem', fontWeight:'bold' }}>
                        {'\u2709\uFE0F'} Email
                      </span>
                    )}
                    {w.followFuture && (
                      <span style={{ background:'#1e1b38', color:'#c4b5fd', border:'1px solid #8b5cf6', borderRadius:'4px', padding:'2px 6px', fontSize:'0.68rem', fontWeight:'bold' }}>
                        {'\u{1F501}'} Following
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ color:'#ff9f43', fontSize:'0.8rem', fontWeight:'bold', marginTop:'4px', wordBreak:'break-word' }}>
                  {w.eventName || 'Following Upcoming Tournaments'}
                </div>
                <div style={{ color:'#cbd5e1', fontSize:'0.76rem', marginTop:'3px', marginBottom:'9px' }}>
                  {(w.lastMat || w.lastTime)
                    ? `Live Schedule: ${[w.lastMat, w.lastTime && `Est. ${w.lastTime}`].filter(Boolean).join(' • ')}`
                    : 'Waiting for tournament mat & match time assignment...'}
                </div>
                <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                  {w.eventId && (
                    <button
                      onClick={() => onOpenAthlete(w)}
                      style={{ padding:'5px 10px', background:'#222938', color:'#e2e8f0', border:'1px solid #475569', borderRadius:'5px', fontSize:'0.76rem', cursor:'pointer', fontWeight:'bold' }}
                    >
                      View Roster
                    </button>
                  )}
                  <button
                    onClick={() => onRemove(w)}
                    style={{ padding:'5px 10px', background:'#3b181e', color:'#fca5a5', border:'1px solid #7f1d1d', borderRadius:'5px', fontSize:'0.76rem', cursor:'pointer', fontWeight:'bold' }}
                  >
                    Stop
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
