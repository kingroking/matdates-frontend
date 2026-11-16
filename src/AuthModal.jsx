import React, { useState } from 'react';
import { auth } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';

export default function AuthModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [err, setErr] = useState('');

  if (!isOpen) return null;

  const handleAuth = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      onClose();
    } catch (error) {
      const msg = (error.message || '').replace('Firebase: ', '');
      setErr(msg);
    }
  };

  const inp = {
    width: '100%', boxSizing: 'border-box', padding: '11px 12px',
    borderRadius: '6px', backgroundColor: '#1a202c', color: '#fff',
    border: '1px solid #334155', fontSize: '0.95rem'
  };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.82)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor:'#12151c', border:'1px solid #2d3748', borderRadius:'10px', maxWidth:'380px', width:'100%', padding:'22px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
          <h3 style={{ margin:0, color:'#fff', fontSize:'1.15rem' }}>{isSignUp ? 'Create MatDates Account' : 'Sign In to MatDates'}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#94a3b8', fontSize:'1.2rem', cursor:'pointer' }}>✕</button>
        </div>
        <p style={{ color:'#94a3b8', fontSize:'0.83rem', margin:'0 0 14px', lineHeight:1.4 }}>
          Save your personal tournament schedule, post venue tips, and sync division alerts.
        </p>
        {err && (
          <div style={{ backgroundColor:'#3b181e', border:'1px solid #7f1d1d', color:'#fca5a5', padding:'9px 11px', borderRadius:'6px', fontSize:'0.82rem', marginBottom:'12px' }}>
            {err}
          </div>
        )}
        <form onSubmit={handleAuth} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          <div>
            <label style={{ display:'block', color:'#cbd5e1', fontSize:'0.78rem', fontWeight:'bold', marginBottom:'4px' }}>Email Address</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} style={inp} required />
          </div>
          <div>
            <label style={{ display:'block', color:'#cbd5e1', fontSize:'0.78rem', fontWeight:'bold', marginBottom:'4px' }}>Password {isSignUp ? '(6+ characters)' : ''}</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} minLength={6} style={inp} required />
          </div>
          <button type="submit" style={{ padding:'11px', borderRadius:'6px', backgroundColor:'#e31837', color:'#fff', border:'none', fontWeight:'bold', fontSize:'0.95rem', cursor:'pointer', marginTop:'2px' }}>
            {isSignUp ? 'Create Account' : 'Sign In'}
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
