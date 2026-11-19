import React, { useState } from 'react';
import { auth, db } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function AuthModal({ isOpen, onClose, onRoleSaved }) {
  const [email, setEmail] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState('user');
  const [orgName, setOrgName] = useState('');
  const [err, setErr] = useState('');

  if (!isOpen) return null;

  const handleAuth = async (e) => {
    e.preventDefault();
    setErr('');
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
        try { localStorage.setItem('md_role_' + cred.user.uid, role); } catch {}
        if (onRoleSaved) onRoleSaved(role);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      onClose();
    } catch (error) {
      setErr((error.message || '').replace('Firebase: ', ''));
    }
  };

  const inp = { width:'100%', boxSizing:'border-box', padding:'11px 12px', borderRadius:'6px', backgroundColor:'#1a202c', color:'#fff', border:'1px solid #334155', fontSize:'0.93rem' };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.84)', zIndex:10090, display:'flex', alignItems:'center', justifyContent:'center', padding:'10px', boxSizing:'border-box' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor:'#12151c', border:'1px solid #2d3748', borderRadius:'12px', maxWidth:'410px', width:'100%', padding:'18px', boxSizing:'border-box', textAlign:'left' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
          <h3 style={{ margin:0, color:'#fff', fontSize:'1.15rem' }}>{isSignUp ? 'Create MatDates Account' : 'Sign In to MatDates'}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#94a3b8', fontSize:'1.2rem', cursor:'pointer' }}>✕</button>
        </div>
        <p style={{ color:'#94a3b8', fontSize:'0.81rem', margin:'0 0 12px', lineHeight:1.4 }}>
          {isSignUp ? 'Choose your account type — Athlete/Parent, Academy/Coach, or Event Promoter (100% Free).' : 'Stay signed in across visits to manage schedules, bios, and dashboards.'}
        </p>
        {err && <div style={{ backgroundColor:'#3b181e', border:'1px solid #7f1d1d', color:'#fca5a5', padding:'9px 11px', borderRadius:'6px', fontSize:'0.82rem', marginBottom:'12px' }}>{err}</div>}
        <form onSubmit={handleAuth} style={{ display:'flex', flexDirection:'column', gap:'11px' }}>
          {isSignUp && (
            <div>
              <label style={{ display:'block', color:'#cbd5e1', fontSize:'0.76rem', fontWeight:'bold', marginBottom:'6px' }}>Account Type</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'6px' }}>
                {[['user','🥋 User','Athlete / Parent'],['academy','🏛️ Academy','Coach / Gym'],['promoter','🏟️ Promoter','Event Host']].map(([k, t, sub]) => (
                  <div key={k} onClick={() => setRole(k)} style={{ padding:'8px 6px', borderRadius:'7px', cursor:'pointer', textAlign:'center', background: role===k ? '#17253b' : '#181d27', border: role===k ? '1.5px solid #38bdf8' : '1px solid #2d3748' }}>
                    <div style={{ color:'#fff', fontWeight:'800', fontSize:'0.8rem' }}>{t}</div>
                    <div style={{ color:'#94a3b8', fontSize:'0.68rem', marginTop:'2px' }}>{sub}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {isSignUp && role !== 'user' && (
            <div>
              <label style={{ display:'block', color:'#cbd5e1', fontSize:'0.76rem', fontWeight:'bold', marginBottom:'4px' }}>{role === 'academy' ? 'Academy / Team Name' : 'Promotion / Organization Name'}</label>
              <input required placeholder={role === 'academy' ? 'e.g. Carlson Gracie San Antonio' : 'e.g. Lone Star SuperFights'} value={orgName} onChange={e => setOrgName(e.target.value)} style={inp} />
            </div>
          )}
          <div>
            <label style={{ display:'block', color:'#cbd5e1', fontSize:'0.78rem', fontWeight:'bold', marginBottom:'4px' }}>Email Address</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} style={inp} required />
          </div>
          <div>
            <label style={{ display:'inline-block', color:'#cbd5e1', fontSize:'0.78rem', fontWeight:'bold', marginBottom:'4px' }}>Password {isSignUp ? '(6+ characters)' : ''}</label>
            <span onClick={() => setShowPw(!showPw)} style={{ float:'right', cursor:'pointer', color:'#38bdf8', fontSize:'0.76rem' }}>{showPw ? 'Hide' : '👁️ Show'}</span>
            <input type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} minLength={6} style={inp} required />
          </div>
          <button type="submit" style={{ padding:'11px', borderRadius:'6px', backgroundColor:'#e31837', color:'#fff', border:'none', fontWeight:'bold', fontSize:'0.95rem', cursor:'pointer', marginTop:'2px' }}>
            {isSignUp ? 'Create Free Account' : 'Sign In'}
          </button>
        </form>
        <div style={{ textAlign:'center', marginTop:'14px' }}>
          <button type="button" onClick={() => { setIsSignUp(!isSignUp); setErr(''); }} style={{ background:'none', border:'none', color:'#94a3b8', textDecoration:'underline', fontSize:'0.83rem', cursor:'pointer' }}>
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}
