import { isIosSafariBrowser, trackEvent } from './analytics';
import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { db, auth } from './firebase';

const GUEST_LS_KEY = 'md_watches_guest_v2';
const userLsKey = (uid) => (uid ? `md_watches_u_${uid}` : GUEST_LS_KEY);

const readLocal = (uid = (auth.currentUser && auth.currentUser.uid) || '') => {
  try {
    const raw = JSON.parse(localStorage.getItem(userLsKey(uid)) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
};

const writeLocal = (arr, uid = (auth.currentUser && auth.currentUser.uid) || '') => {
  try {
    localStorage.setItem(userLsKey(uid), JSON.stringify(arr));
  } catch {}
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

function normWatchPerson(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function watchNamesMatch(aRaw, bRaw) {
  const a = normWatchPerson(aRaw);
  const b = normWatchPerson(bRaw);
  if (!a || !b) return false;
  if (a === b) return true;
  const ap = a.split(" ");
  const bp = b.split(" ");
  if (ap.length >= 2 && bp.length >= 2 && ap[0] === bp[0]) {
    const al = ap[ap.length - 1];
    const bl = bp[bp.length - 1];
    if (al.length >= 2 && bl.length >= 2 && (al.startsWith(bl) || bl.startsWith(al))) {
      return true;
    }
  }
  return false;
}

export function useWatchedAthletes() {
  const [curUid, setCurUid] = useState(() => (auth.currentUser && auth.currentUser.uid) || '');
  const [uidDocs, setUidDocs] = useState([]);
  const [emailDocs, setEmailDocs] = useState([]);
  const [locList, setLocList] = useState(() => readLocal((auth.currentUser && auth.currentUser.uid) || ''));

  useEffect(() => {
    bindForegroundPush();
    // Clean up legacy shared v1 key if signed in so stranger/test entries never bleed across accounts!
    const sync = () => setLocList(readLocal((auth.currentUser && auth.currentUser.uid) || ''));
    window.addEventListener('md-watches-updated', sync);

    let unsubUid = null;
    let unsubEmail = null;

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (unsubUid) { unsubUid(); unsubUid = null; }
      if (unsubEmail) { unsubEmail(); unsubEmail = null; }

      const nextUid = u ? u.uid : '';
      setCurUid(nextUid);
      setLocList(readLocal(nextUid));

      if (!u) {
        setUidDocs([]);
        setEmailDocs([]);
        return;
      }

      // Remove legacy unscoped shared localStorage list so old test watches never pollute signed-in accounts
      try { localStorage.removeItem('md_watches_v1'); } catch {}

      // 1) Live subscription to watches owned by this Firebase UID
      const qUid = query(collection(db, 'mat_watches'), where('uid', '==', u.uid));
      unsubUid = onSnapshot(qUid, (snap) => {
        const rows = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(w => w.active !== false || w.followFuture === true);
        setUidDocs(rows);
        writeLocal(rows, u.uid);
      }, () => {});

      // 2) Live subscription to watches created under this user's email BEFORE signing in (auto-claims them to uid!)
      const cleanEmail = (u.email || '').trim();
      if (cleanEmail) {
        const qEmail = query(collection(db, 'mat_watches'), where('email', '==', cleanEmail));
        unsubEmail = onSnapshot(qEmail, (snap) => {
          const rows = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(w => (!w.uid || w.uid === u.uid) && (w.active !== false || w.followFuture === true));
          setEmailDocs(rows);
          // Permanently link pre-login email watches to u.uid so future logins on any device find them immediately!
          rows.forEach(w => {
            if (!w.uid && w.id) {
              updateDoc(doc(db, 'mat_watches', w.id), { uid: u.uid }).catch(() => {});
            }
          });
        }, () => {});
      }
    });

    return () => {
      window.removeEventListener('md-watches-updated', sync);
      if (unsubUid) unsubUid();
      if (unsubEmail) unsubEmail();
      unsubAuth();
    };
  }, []);

  const merged = new Map();
  // Signed-in users trust Firestore (uidDocs + emailDocs) + their own uid-scoped cache; never leak other users' local items!
  const sourceItems = curUid
    ? [...locList.filter(w => !w.uid || w.uid === curUid), ...emailDocs, ...uidDocs]
    : locList;

  sourceItems.forEach(w => {
    if (w && (w.active !== false || w.followFuture === true) && w.athleteName) {
      // Deduplicate by eventId + athleteName so email-claimed + uid-synced copies never double-count!
      const dedupKey = `${w.eventId || ''}::${(w.athleteName || '').trim().toLowerCase()}`;
      const prev = merged.get(dedupKey);
      if (!prev || (!prev.id && w.id) || (!prev.uid && w.uid)) {
        merged.set(dedupKey, w);
      }
    }
  });
  const watches = Array.from(merged.values());

  const getWatch = (name, eventId) => {
    const n = normWatchPerson(name);
    if (!n) return null;
    return watches.find(w =>
      watchNamesMatch(w.athleteName, name) &&
      (!eventId || !w.eventId || w.eventId === eventId || w.followFuture === true)
    ) || watches.find(w => watchNamesMatch(w.athleteName, name)) || null;
  };

  const removeWatch = async (w) => {
    if (!w) return;
    const activeUid = (auth.currentUser && auth.currentUser.uid) || '';
    const targetName = w.athleteName || w.Name || '';
    writeLocal(
      readLocal(activeUid).filter(x =>
        x.id !== w.id && !(watchNamesMatch(x.athleteName, targetName) && (!w.eventId || (x.eventId || '') === (w.eventId || '')))
      ),
      activeUid
    );
    const matchingDocs = watches.filter(x =>
      x.id && (x.id === w.id || (watchNamesMatch(x.athleteName, targetName) && (!w.eventId || (x.eventId || '') === (w.eventId || ''))))
    );
    const idsToRemove = matchingDocs.length ? matchingDocs.map(x => x.id) : (w.id ? [w.id] : []);
    for (const docId of idsToRemove) {
      try { await deleteDoc(doc(db, 'mat_watches', docId)); }
      catch {
        try { await updateDoc(doc(db, 'mat_watches', docId), { active: false, followFuture: false }); }
        catch (e) { console.warn('Remove watch warn:', e); }
      }
    }
  };

  return { watches, getWatch, removeWatch };
}

const OVERLAY = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.86)',
  zIndex: 20050, display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '12px', boxSizing: 'border-box'
};
const BOX = {
  backgroundColor: '#12151c', border: '1px solid #2d3748', borderRadius: '12px',
  maxWidth: '450px', width: '100%', boxSizing: 'border-box', padding: '18px',
  maxHeight: '88svh', overflowY: 'auto', textAlign: 'left'
};

export function MatAlertModal({ event, comp, division, existingWatch, onRemove, onClose }) {
  const { getWatch: internalGetWatch, removeWatch: internalRemoveWatch } = useWatchedAthletes();
  const resolvedWatch = existingWatch || internalGetWatch(comp && comp.Name, event && event.id ? event.id : undefined);
  const resolvedRemove = onRemove || internalRemoveWatch;
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
    if (resolvedWatch || typeof window === 'undefined' || !('Notification' in window)) return;
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
  }, [resolvedWatch]);

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
      const tok = await Promise.race([acquirePushToken(), new Promise(res => setTimeout(() => res(''), 2500))]);
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
      const saveUid = curUser ? curUser.uid : '';
        writeLocal([...readLocal(saveUid), { id: ref.id, ...payload }], saveUid);
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
          {event && event.id
            ? <>Watch <strong style={{ color:'#ff9f43' }}>{comp.Name}</strong>{division ? ` (${division})` : ''} at <strong>{event.name}</strong>.</>
            : <>Follow <strong style={{ color:'#ff9f43' }}>{comp.Name}</strong>{comp.Academy ? ` (${comp.Academy})` : ''} — get an instant alert the moment they join any upcoming tournament bracket, plus live Mat # &amp; Match Time updates!</>}
        </p>
        {resolvedWatch && !done ? (
          <div style={{ background:'#132a1c', border:'1px solid #2ecc71', borderRadius:'8px', padding:'14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
              <div style={{ color:'#2ecc71', fontWeight:'bold' }}>{'\u2713'} Active Athlete Watch</div>
              <button
                type="button"
                title="Stop Watching"
                onClick={async () => { await resolvedRemove(resolvedWatch); onClose(); }}
                style={{ background:'#7f1d1d', color:'#fecaca', border:'1px solid #ef4444', borderRadius:'6px', padding:'3px 8px', fontSize:'0.75rem', fontWeight:'900', cursor:'pointer' }}
              >
                {'\u2715'} Remove
              </button>
            </div>
            <div style={{ color:'#cbd5e1', fontSize:'0.82rem', marginBottom:'12px', lineHeight:1.55 }}>
              <div>{resolvedWatch.fcmToken ? '\u{1F4F2} Phone / Browser Push: Enabled' : '\u{1F4F2} Phone / Browser Push: Off'}</div>
              <div>{resolvedWatch.email ? `\u2709\uFE0F Email Alerts: ${resolvedWatch.email}` : '\u2709\uFE0F Email Alerts: None'}</div>
              <div>{resolvedWatch.followFuture ? '\u{1F501} Following All Future Tournaments: Yes' : '\u{1F501} Following Future Tournaments: This Event Only'}</div>
              {(resolvedWatch.lastMat || resolvedWatch.lastTime) && (
                <div style={{ color:'#ff9f43', marginTop:'4px' }}>
                  Latest: {[resolvedWatch.lastMat, resolvedWatch.lastTime && `Est. ${resolvedWatch.lastTime}`].filter(Boolean).join(' • ')}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={async () => { await resolvedRemove(resolvedWatch); onClose(); }}
              style={{ width:'100%', padding:'10px 12px', background:'#991b1b', color:'#ffffff', border:'1px solid #ef4444', borderRadius:'7px', fontWeight:'900', fontSize:'0.88rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}
            >
              {'\u2715'} Stop Watching {comp.Name}
            </button>
          </div>
        ) : done ? (
          <div style={{ background:'#132a1c', border:'1px solid #2ecc71', borderRadius:'8px', padding:'14px', textAlign:'center' }}>
            <div style={{ color:'#2ecc71', fontWeight:'bold', marginBottom:'6px' }}>{'\u2713'} Athlete Alerts Activated!</div>
            <div style={{ color:'#cbd5e1', fontSize:'0.82rem', marginBottom:'12px', lineHeight:1.45 }}>
              Delivering via <strong>{[fcmToken && 'Phone/Browser Push', email.trim() && 'Email'].filter(Boolean).join(' + ')}</strong> when Mat #, Match Time, or Final Podium Results post{followFuture ? ' — plus automatic alerts whenever they register for future tournaments!' : '.'}
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
          Live Mat #, Match Time & Final Bracket Podium Result alerts on tournament weekends — plus new-event alerts for followed athletes.
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
                  {w.finalResult
                    ? `🏆 Final Result: ${w.finalResult}${w.finalPodium ? ` (${w.finalPodium})` : ''}`
                    : (w.lastMat || w.lastTime)
                      ? `Live Schedule: ${[w.lastMat, w.lastTime && `Est. ${w.lastTime}`].filter(Boolean).join(' • ')}`
                      : 'Waiting for tournament mat, match time & final bracket result...'}
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
