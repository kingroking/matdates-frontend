import React, { useState } from 'react';
import { auth, db } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const ROLE_DESCRIPTIONS = {
  user: '🥋 For competitors, parents, friends & family — claim Athlete Trophy Rooms & get live mat alerts whenever your loved ones compete!',
  academy: '🏛️ For Professors, Coaches & Gym Owners — unlock your free Saturday Coach Mat Clipboard & Sunday Team Podium Photo Album.',
  promoter: '🏟️ For SuperFight Promoters & Matchmakers — automated fighter check-ins, protected matchmaking & VIP table/ticket tracking.'
};

function formatAuthError(error) {
  const code = error?.code || '';
  if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') return 'Invalid email or password. Need to reset your password? Click "Forgot password?" below.';
  if (code === 'auth/wrong-password') return 'Incorrect password. Click "Forgot password?" below to reset it.';
  if (code === 'auth/email-already-in-use') return 'An account with this email already exists. Switch to Sign In below!';
  if (code === 'auth/invalid-email') return 'Please enter a valid email address.';
  if (code === 'auth/too-many-requests') return 'Too many attempts. Please wait a minute or reset your password.';
  return (error?.message || 'Authentication error').replace('Firebase: ', '');
}

export default function AuthModal({ isOpen, onClose, onRoleSaved }) {
  const [email, setEmail] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetSent, setResetSent] = useState('');
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState('user');
  const [orgName, setOrgName] = useState('');
  const [err, setErr] = useState('');

  if (!isOpen) return null;

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErr('');
    setResetSent('');
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErr('Please enter your email address first so we can send your reset link.');
      return;
    }
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setResetSent(`Password reset link sent to ${cleanEmail}! Check your inbox (and spam folder) to set a new password.`);
    } catch (error) {
      setErr(formatAuthError(error));
    } finally {
      setBusy(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (isResetMode) return handleResetPassword(e);
    setErr('');
    setResetSent('');
    setBusy(true);
    try {
      let cred;
      if (isSignUp) {
        cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const rDoc = {
          kind: 'user_role',
          uid: cred.user.uid,
          email: email.trim().toLowerCase(),
          role,
          explicitSignUpRole: role,
          orgName: orgName.trim(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'mat_watches', 'role_' + cred.user.uid), rDoc, { merge: true });
        if (role === 'academy' && orgName.trim()) {
          const gk = orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
          await setDoc(doc(db, 'mat_watches', 'acad_ws_' + gk), {
            kind: 'academy_workspace', gymKey: gk, gymName: orgName.trim(),
            ownerUid: cred.user.uid, ownerEmail: email.trim().toLowerCase(),
            staffEmails: [email.trim().toLowerCase()], createdAt: new Date().toISOString()
          }, { merge: true });
        } else if (role === 'promoter' && orgName.trim()) {
          const pk = orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
          await setDoc(doc(db, 'mat_watches', 'prom_ws_' + pk), {
            kind: 'promoter_workspace', orgName: orgName.trim(),
            ownerUid: cred.user.uid, ownerEmail: email.trim().toLowerCase(),
            staffEmails: [email.trim().toLowerCase()], createdAt: new Date().toISOString()
          }, { merge: true });
        }
        if (onRoleSaved) onRoleSaved(role);
      } else {
        cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        getDoc(doc(db, 'mat_watches', 'role_' + cred.user.uid)).then(rd => {
          if (!rd.exists()) {
            setDoc(doc(db, 'mat_watches', 'role_' + cred.user.uid), {
              kind: 'user_role', uid: cred.user.uid, email: email.trim().toLowerCase(),
              role: 'user', updatedAt: new Date().toISOString()
            }, { merge: true }).catch(() => {});
          }
        }).catch(() => {});
      }
      onClose();
    } catch (error) {
      setErr(formatAuthError(error));
    } finally {
      setBusy(false);
    }
  };

  const inp = { width:'100%', boxSizing:'border-box', padding:'11px 12px', borderRadius:'6px', backgroundColor:'#1a202c', color:'#fff', border:'1px solid #334155', fontSize:'0.93rem' };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.84)', zIndex:10090, display:'flex', alignItems:'center', justifyContent:'center', padding:'10px', boxSizing:'border-box' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor:'#12151c', border:'1px solid #2d3748', borderRadius:'12px', maxWidth:'435px', width:'100%', padding:'18px', boxSizing:'border-box', textAlign:'left' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
          <h3 style={{ margin:0, color:'#fff', fontSize:'1.15rem' }}>
            {isResetMode ? 'Reset Your Password' : isSignUp ? 'Create MatDates Account' : 'Sign In to MatDates'}
          </h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#94a3b8', fontSize:'1.2rem', cursor:'pointer' }}>✕</button>
        </div>
        <p style={{ color:'#94a3b8', fontSize:'0.81rem', margin:'0 0 12px', lineHeight:1.4 }}>
          {isResetMode
            ? 'Enter the email address on your MatDates account and we will send you an instant password reset link.'
            : isSignUp
              ? 'Select who is using this free account below:'
              : 'Sign in to manage your watched athletes, Trophy Rooms, or hubs.'}
        </p>
        {err && <div style={{ backgroundColor:'#3b181e', border:'1px solid #7f1d1d', color:'#fca5a5', padding:'9px 11px', borderRadius:'6px', fontSize:'0.82rem', marginBottom:'12px' }}>{err}</div>}
        {resetSent && <div style={{ backgroundColor:'#132a1c', border:'1px solid #2ecc71', color:'#86efac', padding:'10px 12px', borderRadius:'6px', fontSize:'0.82rem', marginBottom:'12px', lineHeight:1.45 }}>{resetSent}</div>}

        <form onSubmit={handleAuth} style={{ display:'flex', flexDirection:'column', gap:'11px' }}>
          {!isResetMode && isSignUp && (
            <div>
              <label style={{ display:'block', color:'#cbd5e1', fontSize:'0.76rem', fontWeight:'bold', marginBottom:'6px' }}>Account Type</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'6px' }}>
                {[
                  ['user', '🥋 User', 'Athlete, Family & Fans'],
                  ['academy', '🏛️ Academy', 'Professors, Coaches & Owners'],
                  ['promoter', '🏟️ Promoter', 'Promoters & Matchmakers']
                ].map(([k, t, sub]) => (
                  <div key={k} onClick={() => setRole(k)} style={{ padding:'8px 5px', borderRadius:'7px', cursor:'pointer', textAlign:'center', background: role===k ? '#17253b' : '#181d27', border: role===k ? '1.5px solid #38bdf8' : '1px solid #2d3748' }}>
                    <div style={{ color:'#fff', fontWeight:'800', fontSize:'0.8rem' }}>{t}</div>
                    <div style={{ color:'#94a3b8', fontSize:'0.66rem', marginTop:'3px', lineHeight:1.25 }}>{sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:'7px', padding:'8px 10px', borderRadius:'6px', background:'#161f2e', border:'1px solid #283548', color:'#cbd5e1', fontSize:'0.75rem', lineHeight:1.4 }}>
                {ROLE_DESCRIPTIONS[role]}
              </div>
            </div>
          )}
          {!isResetMode && isSignUp && role !== 'user' && (
            <div>
              <label style={{ display:'block', color:'#cbd5e1', fontSize:'0.76rem', fontWeight:'bold', marginBottom:'4px' }}>{role === 'academy' ? 'Academy / Team Name' : 'Promotion / Organization Name'}</label>
              <input required placeholder={role === 'academy' ? 'e.g. Carlson Gracie San Antonio' : 'e.g. Lone Star SuperFights'} value={orgName} onChange={e => setOrgName(e.target.value)} style={inp} />
            </div>
          )}
          <div>
            <label style={{ display:'block', color:'#cbd5e1', fontSize:'0.78rem', fontWeight:'bold', marginBottom:'4px' }}>Email Address</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} style={inp} required />
          </div>
          {!isResetMode && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px' }}>
                <label style={{ color:'#cbd5e1', fontSize:'0.78rem', fontWeight:'bold' }}>Password {isSignUp ? '(6+ characters)' : ''}</label>
                <span onClick={() => setShowPw(!showPw)} style={{ cursor:'pointer', color:'#38bdf8', fontSize:'0.76rem' }}>{showPw ? 'Hide' : '👁️ Show'}</span>
              </div>
              <input type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} minLength={6} style={inp} required />
              {!isSignUp && (
                <div style={{ textAlign:'right', marginTop:'6px' }}>
                  <button
                    type="button"
                    onClick={() => { setIsResetMode(true); setErr(''); setResetSent(''); }}
                    style={{ background:'none', border:'none', color:'#38bdf8', fontSize:'0.77rem', fontWeight:'600', cursor:'pointer', padding:0 }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>
          )}
          <button disabled={busy} type="submit" style={{ padding:'11px', borderRadius:'6px', backgroundColor:'#e31837', color:'#fff', border:'none', fontWeight:'bold', fontSize:'0.95rem', cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.75 : 1, marginTop:'2px' }}>
            {busy ? 'Please wait...' : isResetMode ? 'Send Password Reset Link' : isSignUp ? 'Create Free Account' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign:'center', marginTop:'14px', display:'flex', flexDirection:'column', gap:'8px' }}>
          {isResetMode ? (
            <button type="button" onClick={() => { setIsResetMode(false); setErr(''); setResetSent(''); }} style={{ background:'none', border:'none', color:'#94a3b8', textDecoration:'underline', fontSize:'0.83rem', cursor:'pointer' }}>
              ← Back to Sign In
            </button>
          ) : (
            <button type="button" onClick={() => { setIsSignUp(!isSignUp); setErr(''); setResetSent(''); }} style={{ background:'none', border:'none', color:'#94a3b8', textDecoration:'underline', fontSize:'0.83rem', cursor:'pointer' }}>
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
