import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { db, auth } from './firebase';

export function MatAlertModal({ event, comp, division, onClose }) {
  const curUser = auth.currentUser;
  const [email, setEmail] = useState(
    () => (curUser && curUser.email) || localStorage.getItem('md_alert_email') || ''
  );
  const [fcmToken, setFcmToken] = useState('');
  const [pushStatus, setPushStatus] = useState('idle');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const enablePush = async () => {
    setPushStatus('requesting');
    try {
      const ok = await isSupported();
      if (!ok || !('Notification' in window)) {
        setPushStatus('unsupported');
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setPushStatus('denied');
        return;
      }
      const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const messaging = getMessaging();
      const vapid = import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined;
      const tok = await getToken(
        messaging,
        vapid ? { serviceWorkerRegistration: reg, vapidKey: vapid } : { serviceWorkerRegistration: reg }
      );
      if (tok) {
        setFcmToken(tok);
        setPushStatus('ready');
      } else {
        setPushStatus('email_only');
      }
    } catch (e) {
      console.warn('Web push fallback to email:', e);
      setPushStatus('email_only');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!email.trim() && !fcmToken) return;
    if (email.trim()) localStorage.setItem('md_alert_email', email.trim());
    setSaving(true);
    try {
      await addDoc(collection(db, 'mat_watches'), {
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
      });
      setDone(true);
    } catch (err) {
      alert('Could not save alert (' + (err.code || err.message) + ')');
    } finally {
      setSaving(false);
    }
  };

  const overlay = { position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.86)', zIndex:10050, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' };
  const box = { backgroundColor:'#12151c', border:'1px solid #2d3748', borderRadius:'12px', maxWidth:'420px', width:'100%', padding:'22px' };

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={e => e.stopPropagation()} style={box}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
          <h3 style={{ margin:0, color:'#fff', fontSize:'1.12rem' }}>{'\u{1F514}'} Live Mat & Time Alert</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#94a3b8', fontSize:'1.1rem', cursor:'pointer' }}>✕</button>
        </div>
        <p style={{ margin:'0 0 12px', color:'#cbd5e1', fontSize:'0.85rem', lineHeight:1.4 }}>
          Watch <strong style={{ color:'#ff9f43' }}>{comp.Name}</strong> ({division}) at <strong>{event.name}</strong>. We check live tournament schedules and alert you when their Mat # or Fight Time posts or shifts.
        </p>
        {done ? (
          <div style={{ background:'#132a1c', border:'1px solid #2ecc71', borderRadius:'8px', padding:'14px', textAlign:'center' }}>
            <div style={{ color:'#2ecc71', fontWeight:'bold', marginBottom:'6px' }}>✓ Live Mat Watch Active!</div>
            <div style={{ color:'#cbd5e1', fontSize:'0.82rem', marginBottom:'12px' }}>
              You will be notified {fcmToken ? 'via Browser Push & Email' : 'via Email'} as soon as mat assignments post or shift.
            </div>
            <button onClick={onClose} style={{ padding:'8px 16px', background:'#2ecc71', color:'#000', border:'none', borderRadius:'6px', fontWeight:'bold', cursor:'pointer' }}>Done</button>
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            <button type="button" onClick={enablePush} style={{ padding:'9px 12px', borderRadius:'6px', border: pushStatus === 'ready' ? '1px solid #2ecc71' : '1px solid #0284c7', background: pushStatus === 'ready' ? '#132a1c' : '#162536', color: pushStatus === 'ready' ? '#2ecc71' : '#38bdf8', fontWeight:'bold', cursor:'pointer', fontSize:'0.84rem' }}>
              {pushStatus === 'ready' ? '✓ Browser Push Enabled!' : pushStatus === 'requesting' ? 'Requesting Permission...' : '\u{1F4F2} Enable Instant Browser Push (Optional)'}
            </button>
            {pushStatus === 'email_only' && <div style={{ color:'#94a3b8', fontSize:'0.76rem' }}>Browser push unavailable on this device — instant email alerts will be used.</div>}
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
