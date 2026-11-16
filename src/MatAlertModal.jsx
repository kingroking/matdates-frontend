import { isIosSafariBrowser, trackEvent } from './analytics';
import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
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
          snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(w => w.active !== false)
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
    if (w && w.active !== false && w.athleteName) {
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
      (!eventId || !w.eventId || w.eventId === eventId)
    ) || null;
  };

  const removeWatch = async (w) => {
    if (!w) return;
    writeLocal(readLocal().filter(x =>
      x.id !== w.id && !(x.athleteName === w.athleteName && x.eventId === w.eventId)
    ));
    if (w.id && auth.currentUser) {
      try { await deleteDoc(doc(db, 'mat_watches', w.id)); }
      catch (e) { console.warn('Remove watch warn:', e); }
    }
  };

  return { watches, getWatch, removeWatch };
}

const OVERLAY = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.86)',
  zIndex: 10050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
};
const BOX = {
  backgroundColor: '#12151c', border: '1px solid #2d3748', borderRadius: '12px',
  maxWidth: '460px', width: '100%', padding: '22px', maxHeight: '84vh', overflowY: 'auto'
};

export function MatAlertModal({ event, comp, division, existingWatch, onRemove, onClose }) {
  const curUser = auth.currentUser;
  const [email, setEmail] = useState(
    () => (curUser && curUser.email) || localStorage.getItem('md_alert_email') || ''
  );
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
    }
  }, [existingWatch]);

  const enablePush = async () => {
    setPushStatus('requesting');
    try {
      const ok = await isSupported();
      if (!ok || !('Notification' in window) || !('serviceWorker' in navigator)) {
        return setPushStatus('unsupported');
      }
      const perm = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
      if (perm === 'denied') return setPushStatus('denied');
      if (perm !== 'granted') return setPushStatus('idle');
      const tok = await acquirePushToken();
      if (tok) { setFcmToken(tok); setPushStatus('ready'); }
      else setPushStatus('email_only');
    } catch (e) {
      console.warn('Web push fallback:', e);
      setPushStatus('email_only');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!email.trim() && !fcmToken) return;
    if (email.trim()) localStorage.setItem('md_alert_email', email.trim());
    setSaving(true);
    try {
      const payload = {
        eventId: event.id || '',
        eventName: event.name || '',
        eventLink: event.link || '',
        sortDate: event.sort_date || '',
        athleteName: comp.Name || '',
        academy: comp.Academy || '',
        division: division || comp.Division || '',
        profileUrl: comp.Profile || comp.JitsProfile || '',
        email: email.trim(),
        fcmToken: fcmToken || '',
        uid: curUser ? curUser.uid : '',
        lastMat: '',
        lastTime: '',
        active: true,
        createdAt: new Date().toISOString()
      };
      const ref = await addDoc(collection(db, 'mat_watches'), payload);
      writeLocal([...readLocal(), { id: ref.id, ...payload }]);
      trackEvent('matAlertsCreated');
      if (fcmToken) trackEvent('pushAlertsEnabled');
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
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
          <h3 style={{ margin:0, color:'#fff', fontSize:'1.12rem' }}>{'\u{1F514}'} Live Mat & Time Alert</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#94a3b8', fontSize:'1.1rem', cursor:'pointer' }}>{'\u2715'}</button>
        </div>
        <p style={{ margin:'0 0 12px', color:'#cbd5e1', fontSize:'0.85rem', lineHeight:1.4 }}>
          Watch <strong style={{ color:'#ff9f43' }}>{comp.Name}</strong> ({division}) at <strong>{event.name}</strong>.
        </p>
        {existingWatch && !done ? (
          <div style={{ background:'#132a1c', border:'1px solid #2ecc71', borderRadius:'8px', padding:'14px' }}>
            <div style={{ color:'#2ecc71', fontWeight:'bold', marginBottom:'6px' }}>{'\u2713'} Active Watch Enabled</div>
            <div style={{ color:'#cbd5e1', fontSize:'0.83rem', marginBottom:'10px', lineHeight:1.5 }}>
              <div>{existingWatch.fcmToken ? '\u{1F4F2} Instant Browser Push: Enabled' : '\u{1F4F2} Instant Browser Push: Off'}</div>
              <div>{existingWatch.email ? `\u2709\uFE0F Email Fallback: ${existingWatch.email}` : '\u2709\uFE0F Email Fallback: None'}</div>
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
              Turn Off Watch for {comp.Name}
            </button>
          </div>
        ) : done ? (
          <div style={{ background:'#132a1c', border:'1px solid #2ecc71', borderRadius:'8px', padding:'14px', textAlign:'center' }}>
            <div style={{ color:'#2ecc71', fontWeight:'bold', marginBottom:'6px' }}>{'\u2713'} Live Mat Watch Active!</div>
            <div style={{ color:'#cbd5e1', fontSize:'0.82rem', marginBottom:'12px' }}>
              You will be notified {fcmToken ? 'via Browser Push & Email' : 'via Email'} when Mat # or Fight Time posts or shifts.
            </div>
            <button onClick={onClose} style={{ padding:'8px 16px', background:'#2ecc71', color:'#000', border:'none', borderRadius:'6px', fontWeight:'bold', cursor:'pointer' }}>Done</button>
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {isIosSafariBrowser() ? (
              <div style={{ background:'#131b26', border:'1px solid #0284c7', borderRadius:'7px', padding:'10px 12px', fontSize:'0.79rem', color:'#cbd5e1', lineHeight:1.45 }}>
                <div style={{ color:'#38bdf8', fontWeight:'bold', marginBottom:'3px' }}>{'\u{1F4F2}'} Want Instant iPhone Push Alerts?</div>
                Tap Safari's <strong>Share ({'\u2B06\uFE0F'})</strong> {'\u2192'} <strong>"Add to Home Screen"</strong>, then open MatDates from your Home Screen icon — or use instant Email Alerts below right now!
              </div>
            ) : (
            <button type="button" onClick={enablePush} style={{ padding:'9px 12px', borderRadius:'6px', border: pushStatus === 'ready' ? '1px solid #2ecc71' : '1px solid #0284c7', background: pushStatus === 'ready' ? '#132a1c' : '#162536', color: pushStatus === 'ready' ? '#2ecc71' : '#38bdf8', fontWeight:'bold', cursor:'pointer', fontSize:'0.84rem' }}>
              {pushStatus === 'ready' ? '\u2713 Browser Push Enabled!' : pushStatus === 'requesting' ? 'Connecting Instant Push...' : '\u{1F4F2} Enable Instant Browser Push (Optional)'}
            </button>
            )}
            {(pushStatus === 'email_only' || pushStatus === 'unsupported') && <div style={{ color:'#94a3b8', fontSize:'0.76rem' }}>Instant push isn't supported in this browser (e.g. in-app viewer or iOS outside Home Screen) — email alerts below will be used automatically.</div>}
            {pushStatus === 'denied' && <div style={{ color:'#fca5a5', fontSize:'0.76rem' }}>Notifications blocked in browser settings — using email fallback below.</div>}
            <div>
              <label style={{ display:'block', color:'#cbd5e1', fontSize:'0.78rem', fontWeight:'bold', marginBottom:'4px' }}>Alert Email Address</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required={!fcmToken} style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', borderRadius:'6px', background:'#1a202c', color:'#fff', border:'1px solid #334155', fontSize:'0.92rem' }} />
            </div>
            <button type="submit" disabled={saving} style={{ padding:'11px', borderRadius:'6px', background:'#ff9f43', color:'#000', border:'none', fontWeight:'bold', fontSize:'0.92rem', cursor:'pointer' }}>
              {saving ? 'Activating...' : '\u{1F514} Activate Mat & Time Watch'}
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
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
          <h3 style={{ margin:0, color:'#fff', fontSize:'1.14rem' }}>
            {'\u{1F514}'} My Watched Athletes ({watches.length})
          </h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#94a3b8', fontSize:'1.1rem', cursor:'pointer' }}>{'\u2715'}</button>
        </div>
        <p style={{ margin:'0 0 14px', color:'#94a3b8', fontSize:'0.81rem', lineHeight:1.4 }}>
          Checked every ~90 seconds on tournament weekends for live Smoothcomp & JJWL Mat # and Match Time updates.
        </p>
        {watches.length === 0 ? (
          <div style={{ padding:'22px 14px', textAlign:'center', background:'#181c24', borderRadius:'8px', color:'#94a3b8', fontSize:'0.86rem' }}>
            No active athlete watches yet. Open any tournament division roster and tap <strong style={{ color:'#38bdf8' }}>{'\u{1F514}'} Mat Alert</strong> next to an athlete.
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {watches.map((w, idx) => (
              <div key={w.id || idx} style={{ background:'#181c24', border:'1px solid #2d3748', borderRadius:'8px', padding:'12px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px', marginBottom:'4px' }}>
                  <div>
                    <div style={{ color:'#fff', fontWeight:'bold', fontSize:'0.95rem' }}>{w.athleteName}</div>
                    <div style={{ color:'#94a3b8', fontSize:'0.78rem' }}>
                      {[w.division, w.academy].filter(Boolean).join(' • ')}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'5px', flexShrink:0 }}>
                    {w.fcmToken && (
                      <span style={{ background:'#132a1c', color:'#2ecc71', border:'1px solid #2ecc71', borderRadius:'4px', padding:'2px 6px', fontSize:'0.7rem', fontWeight:'bold' }}>
                        {'\u{1F4F2}'} Push On
                      </span>
                    )}
                    {w.email && (
                      <span style={{ background:'#162536', color:'#38bdf8', border:'1px solid #0284c7', borderRadius:'4px', padding:'2px 6px', fontSize:'0.7rem', fontWeight:'bold' }}>
                        {'\u2709\uFE0F'} Email
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ color:'#ff9f43', fontSize:'0.8rem', fontWeight:'bold', marginTop:'4px' }}>
                  {w.eventName || 'Tournament'}
                </div>
                <div style={{ color:'#cbd5e1', fontSize:'0.76rem', marginTop:'3px', marginBottom:'9px' }}>
                  {(w.lastMat || w.lastTime)
                    ? `Live Schedule: ${[w.lastMat, w.lastTime && `Est. ${w.lastTime}`].filter(Boolean).join(' • ')}`
                    : 'Waiting for tournament mat & match time assignment...'}
                </div>
                <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                  <button
                    onClick={() => onOpenAthlete(w)}
                    style={{ padding:'5px 10px', background:'#222938', color:'#e2e8f0', border:'1px solid #475569', borderRadius:'5px', fontSize:'0.76rem', cursor:'pointer', fontWeight:'bold' }}
                  >
                    View Roster
                  </button>
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
