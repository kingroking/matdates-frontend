import React, { useState } from 'react';
import { auth } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

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
      if (isSignUp) await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
      onClose();
    } catch (error) {
      setErr(error.message.replace('Firebase: ', ''));
    }
  };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.82)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor:'#12151c', border:'1px solid #2d3748', borderRadius:'10px', maxWidth:'380px', width:'100%', padding:'22px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
          <h3 style={{ margin:0, color:'#fff', fontSize:'1.15rem' }}>{isSignUp ? 'Create MatDates Account' : 'Sign In to MatDates'}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#94a3b8', fontSize:'1.2rem', cursor:'pointer' }}>✕</button>
        </div>
        <p style={{ margin:'0 0 16px 0', color:'#94a3b8', fontSize:'0.83rem', lineHeight:1.4 }}>Save your personal tournament schedule and sync division alerts across desktop and mobile.</p>
        {err && <div style={{ backgroundColor:'#2d161a', color:'#f87171', padding:'8px 10px', borderRadius:'6px', fontSize:'0.8rem', marginBottom:'12px' }}>{err}</div>}
        <form onSubmit={handleAuth}>
          <input type="email" placehoer="Email address" value={email} onChange={e => setEmail(e.target.value)} required style={{ width:'100%', boxSizing:'border-box', backgroundColor:'#1a202c', color:'#fff', padding:'10px 12px', borderRadius:'6px', border:'1px solid #334155', marginBottom:'10px' }} />
          <input type="password" placeholder="Password (6+ characters)" value={password} onChange={e => setPassword(e.target.value)} required style={{ width:'100%', boxSizing:'border-box', backgroundColor:'#1a202c', color:'#fff', padding:'10px 12px', borderRadius:'6px', border:'1px solid #334155', marginBottom:'14px' }} />
          <button type="submit" style={{ width:'100%', backgroundColor:'#e31837', color:'#fff', fontWeight:'bold', padding:'10px', border:'none', borderRadius:'6px', cursor:'pointer' }}>{isSignUp ? 'Create Account' : 'Sign In'}</button>
        </form>
        <div style={{ marginTop:'12px', textAlign:'center' }}>
          <button type="button" onClick={() => { setIsSignUp(!isSignUp); setErr(''); }} style={{ background:'none', border:'none', color:'#cbd5e1', fontSize:'0.82rem', cursor:'pointer', textDecoration:'underline' }}>
            {isSignUp ? 'Already have an account? Sign in' : 'New here? Create a free account'}
          </button>
        </div>
      </div>
    </div>
  );
}
