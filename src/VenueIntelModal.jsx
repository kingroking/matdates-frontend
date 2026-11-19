import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from './firebase';

const CATS = [
  ['ALL', 'All Info & Q&A'],
  ['OFFICIAL', '📢 Official Updates'],
  ['QUESTION', '❓ Competitor Q&A'],
  ['PARKING', '🅿️ Parking'],
  ['WEIGHINS', '⚖️ Weigh-ins & Rules'],
  ['SEATING', '🪑 Seating & Temp'],
  ['PROTIP', '💡 Venue Tip']
];
const CAT_LABELS = Object.fromEntries(CATS);

export function getVenueKey(ev) {
  const raw = (ev?.venue || '').trim();
  if (!raw || raw.length < 4) return '';
  if (/^(tba|tbd|venue|online|united states|usa)$/i.test(raw)) return '';
  if (/live stream|fight pass|flograppling/i.test(raw)) return '';
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function useVenueTipCounts(refreshTick = 0) {
  const [docs, setDocs] = useState([]);
  useEffect(() => {
    getDocs(collection(db, 'venue_comments')).then(snap => setDocs(snap.docs.map(d => d.data()))).catch(() => {});
  }, [refreshTick]);
  return useCallback((ev) => {
    if (!ev || !docs.length) return 0;
    const vk = getVenueKey(ev);
    let n = 0;
    for (const d of docs) { if (d.eventId === ev.id || (vk && d.venueKey === vk)) n++; }
    return n;
  }, [docs]);
}

export function VenueIntelModal({ event, user, isAdmin, onRequireAuth, onClose, onChanged }) {
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('ALL');
  const [postCat, setPostCat] = useState('QUESTION');
  const [text, setText] = useState('');
  const [upvoted, setUpvoted] = useState(() => {
    try { return JSON.parse(localStorage.getItem('md_tip_likes') || '{}'); } catch { return {}; }
  });
  const [submitting, setSubmitting] = useState(false);
  const venueKey = getVenueKey(event);

  const verifiedAuthor = user ? (user.displayName || (user.email || '').split('@')[0] || 'Verified Member') : '';

  const loadTips = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'venue_comments'));
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => d.eventId === event.id || (venueKey && d.venueKey === venueKey))
        .sort((a, b) => (a.category === 'OFFICIAL' ? -1 : 1) - (b.category === 'OFFICIAL' ? -1 : 1) || (b.createdAt || '').localeCompare(a.createdAt || ''));
      setTips(all);
    } catch (err) {
      console.error('Error loading info:', err);
    } finally {
      setLoading(false);
    }
  }, [event.id, venueKey]);

  useEffect(() => { loadTips(); }, [loadTips]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { onRequireAuth(); return; }
    const cleanText = text.trim();
    if (cleanText.length < 4) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'venue_comments'), {
        eventId: event.id, eventName: event.name || '', venueKey,
        venueName: event.venue || event.location || '', category: postCat,
        text: cleanText, author: verifiedAuthor.slice(0, 40), uid: user.uid,
        likes: 0, createdAt: new Date().toISOString()
      });
      setText('');
      await loadTips();
      if (onChanged) onChanged();
    } catch (err) {
      alert('Could not post (' + (err.code || err.message) + ').');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (item) => {
    if (upvoted[item.id]) return;
    const next = { ...upvoted, [item.id]: true };
    setUpvoted(next);
    localStorage.setItem('md_tip_likes', JSON.stringify(next));
    setTips(p => p.map(t => t.id === item.id ? { ...t, likes: (t.likes || 0) + 1 } : t));
    try { await updateDoc(doc(db, 'venue_comments', item.id), { likes: increment(1) }); } catch {}
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await deleteDoc(doc(db, 'venue_comments', item.id));
      setTips(p => p.filter(t => t.id !== item.id));
      if (onChanged) onChanged();
    } catch (err) { alert('Delete failed: ' + (err.code || err.message)); }
  };

  const visible = tips.filter(t => filterCat === 'ALL' || t.category === filterCat);
  const box = { position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.86)', zIndex:9999, display:'flex', justifyContent:'center', alignItems:'center', padding:'10px', boxSizing:'border-box' };
  const card = { backgroundColor:'#11141b', padding:'16px', boxSizing:'border-box', overflowX:'hidden', borderRadius:'12px', border:'1px solid #2d3748', width:'100%', maxWidth:'720px', maxHeight:'88svh', display:'flex', flexDirection:'column', textAlign:'left' };

  return (
    <div onClick={onClose} style={box}><div onClick={e => e.stopPropagation()} style={card}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:'12px' }}>
        <div>
          <h2 style={{ margin:0, color:'#ffffff', fontSize:'1.22rem' }}>💬 Event Info, Competitor Q&amp;A &amp; Venue Tips</h2>
          <p style={{ margin:'4px 0 0', color:'#94a3b8', fontSize:'0.82rem' }}>{event.name} • 📅 {event.date} {event.venue ? `• ${event.venue}` : ''}</p>
        </div>
        <button onClick={onClose} style={{ background:'#1e293b', color:'#fff', border:'1px solid #334155', borderRadius:'6px', padding:'6px 12px', cursor:'pointer', height:'fit-content' }}>✕</button>
      </div>
      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', margin:'12px 0' }}>
        {CATS.map(([k, lbl]) => (
          <button key={k} onClick={() => setFilterCat(k)} style={{ padding:'5px 10px', borderRadius:'14px', cursor:'pointer', fontSize:'0.77rem', fontWeight:'bold', border: filterCat === k ? '1px solid #38bdf8' : '1px solid #2d3748', background: filterCat === k ? '#162536' : '#181c24', color: filterCat === k ? '#38bdf8' : '#cbd5e1' }}>{lbl}</button>
        ))}
      </div>
      <div style={{ flex:1, overflowY:'auto', border:'1px solid #242b38', borderRadius:'8px', background:'#151922', marginBottom:'12px' }}>
        {loading ? <div style={{ padding:'24px', textAlign:'center', color:'#94a3b8' }}>Loading event updates, Q&amp;A &amp; venue tips...</div>
          : visible.length === 0 ? <div style={{ padding:'26px', textAlign:'center', color:'#64748b' }}>Have a question about weigh-ins, rules, coach passes, parking, or schedules? Post it below!</div>
          : visible.map(it => {
            const canDel = (user && it.uid === user.uid) || isAdmin;
            const dt = it.createdAt ? new Date(it.createdAt).toLocaleDateString(undefined, { month:'short', day:'numeric' }) : '';
            const isOff = it.category === 'OFFICIAL';
            return (
              <div key={it.id} style={{ padding:'12px 14px', borderBottom:'1px solid #1f2532', background: isOff ? '#132226' : 'transparent' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'8px', flexWrap:'wrap', marginBottom:'6px' }}>
                  <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
                    <span style={{ fontSize:'0.72rem', padding:'2px 8px', borderRadius:'10px', background: isOff ? '#14b8a6' : '#1e293b', color: isOff ? '#000' : '#38bdf8', fontWeight:'800' }}>{CAT_LABELS[it.category] || 'Tip'}</span>
                    <strong style={{ color:'#e2e8f0', fontSize:'0.84rem' }}>✓ {it.author}</strong>
                    <span style={{ color:'#64748b', fontSize:'0.75rem' }}>{dt}</span>
                    {it.eventId !== event.id && it.eventName && <span style={{ fontSize:'0.7rem', padding:'2px 6px', borderRadius:'4px', background:'#1a202c', color:'#ff9f43', border:'1px solid #4a3520' }}>Venue tip from {it.eventName.slice(0, 28)}</span>}
                  </div>
                  <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                    <button onClick={() => handleLike(it)} style={{ background: upvoted[it.id] ? '#162536' : '#181c24', color: upvoted[it.id] ? '#38bdf8' : '#94a3b8', border:'1px solid #2d3748', borderRadius:'5px', padding:'3px 8px', fontSize:'0.76rem', cursor:'pointer' }}>👍 {it.likes || 0}</button>
                    {canDel && <button onClick={() => handleDelete(it)} style={{ background:'transparent', color:'#ef4444', border:'none', fontSize:'0.75rem', cursor:'pointer' }}>Delete</button>}
                  </div>
                </div>
                <div style={{ color:'#f1f5f9', fontSize:'0.9rem', lineHeight:1.45 }}>{it.text}</div>
              </div>
            );
          })}
      </div>
      {!user ? (
        <button onClick={onRequireAuth} style={{ padding:'11px', borderRadius:'8px', background:'#162536', color:'#38bdf8', border:'1px solid #0284c7', fontWeight:'bold', cursor:'pointer', fontSize:'0.9rem' }}>Sign In to Ask a Competitor Question or Share a Venue Tip</button>
      ) : (
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between' }}>
            <select value={postCat} onChange={e => setPostCat(e.target.value)} style={{ padding:'8px 10px', borderRadius:'6px', background:'#181c24', color:'#fff', border:'1px solid #2d3748', fontWeight:'bold' }}>
              {CATS.slice(isAdmin ? 1 : 2).map(([k, lbl]) => <option key={k} value={k}>{lbl}</option>)}
            </select>
            <div style={{ padding:'6px 11px', borderRadius:'6px', background:'#132a1c', border:'1px solid #22c55e', color:'#4ade80', fontSize:'0.78rem', fontWeight:'bold', userSelect:'none' }}>
              🔒 Posting as Verified User: {verifiedAuthor}
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <input value={text} onChange={e => setText(e.target.value)} placeholder="Ask an event question or share weigh-in, parking, or arena info..." maxLength={360} style={{ flex:1, padding:'10px 12px', borderRadius:'6px', background:'#181c24', color:'#fff', border:'1px solid #38bdf8', fontSize:'0.9rem' }} />
            <button type="submit" disabled={submitting || text.trim().length < 4} style={{ padding:'10px 16px', borderRadius:'6px', background:'#ff9f43', color:'#000', border:'none', fontWeight:'bold', cursor:'pointer', opacity: text.trim().length < 4 ? 0.5 : 1 }}>{submitting ? '...' : 'Post'}</button>
          </div>
        </form>
      )}
    </div></div>
  );
}
