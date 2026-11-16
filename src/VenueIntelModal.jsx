import React, { useState, useEffect, useCallback } from 'react';
import {
  collection, getDocs, addDoc, deleteDoc, updateDoc, doc, increment
} from 'firebase/firestore';
import { db } from './firebase';

const CATS = [
  ['ALL', 'All Tips'],
  ['PARKING', '🅿️ Parking'],
  ['SEATING', '🪑 Seating'],
  ['TEMP', '🥶 Arena Temp'],
  ['WEIGHINS', '⚖️ Weigh-ins'],
  ['FOOD', '🍔 Food/Coffee'],
  ['PROTIP', '💡 Pro Tip']
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
    getDocs(collection(db, 'venue_commenn(snap => setDocs(snap.docs.map(d => d.data())))
      .catch(() => {});
  }, [refreshTick]);

  return useCallback((ev) => {
    if (!ev || !docs.length) return 0;
    const vk = getVenueKey(ev);
    let n = 0;
    for (const d of docs) {
      if (d.eventId === ev.id || (vk && d.venueKey === vk)) n++;
    }
    return n;
  }, [docs]);
}

export function VenueIntelModal({
  event, user, isAdmin, onRequireAuth, onClose, onChanged
}) {
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('ALL');
  const [postCat, setPostCat] = useState('PARKING');
  const [text, setText] = useState('');
  const [authorName, setAuthorName] = useState(() => {
    return localStorage.getItem('md_tip_author') || '';
  });
  const [upvoted, setUpvoted] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('md_tip_likes') || '{}');
    } catch {
      return {};
    }
  });
  const [submitting, setSubmitting] = useState(false);

  const venueKey = getVenueKey(event);

  const loadTips = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'venue_comments'));
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => d.eventId === event.id || (venueKey && d.venueKey === venueKey))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setTips(all);
    } catch (err) {
      console.error('Error loading venue tips:', err);
    } finally {
      setLoading(false);
    }
  }, [event.id, venueKey]);

  useEffect(() => {
    loadTips();
  }, [loadTips]);

  useEffect(() => {
    if (user && !authorName) {
      const fallback = user.displayName || (user.email || '').split('@')[0] || 'Grappler';
      setAuthorName(fallback);
    }
  }, [user, authorName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    const cleanText = text.trim();
    if (cleanText.length < 4) return;
    const cleanAuthor = (authorName || '').trim() || 'BJJ Community';
    localStorage.setItem('md_tip_author', cleanAuthor);
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'venue_comments'), {
        eventId: event.id,
        eventName: event.name || '',
        venueKey,
        venueName: event.venue || event.location || '',
        category: postCat,
        text: cleanText,
        author: cleanAuthor.slice(0, 40),
        uid: user.uid,
        likes: 0,
        createdAt: new Date().toISOString()
      });
      setText('');
      await loadTips();
      if (onChanged) onChanged();
    } catch (err) {
      alert('Could not post tip (' + (err.code || err.message) + ').');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (item) => {
    if (upvoted[item.id]) return;
    const next = { ...upvoted, [item.id]: true };
    setUpvoted(next);
    localStorage.setItem('md_tip_likes', JSON.stringify(next));
    setTips(prev => prev.map(t => (
      t.id === item.id ? { ...t, likes: (t.likes || 0) + 1 } : t
    )));
    try {
      await updateDoc(doc(db, 'venue_comments', item.id), {
        likes: increment(1)
      });
    } catch {}
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this tip?')) return;
    try {
      await deleteDoc(doc(db, 'venue_comments', item.id));
      setTips(prev => prev.filter(t => t.id !== item.id));
      if (onChanged) onChanged();
    } catch (err) {
      alert('Delete failed: ' + (err.code || err.message));
    }
  };

  const visible = tips.filter(t => filterCat === 'ALL' || t.category === filterCat);

  const overlay = {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.86)',
    zIndex: 9999, display: 'flex', justifyContent: 'center',
    alignItems: 'center', padding: '16px'
  };
  const card = {
    backgroundColor: '#11141b', padding: '22px', borderRadius: '12px',
    border: '1px solid #2d3748', width: '100%', maxWidth: '720px',
    maxHeight: '88vh', display: 'flex', flexDirection: 'column'
  };

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={e => e.stopPropagation()} style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.25rem' }}>
              💬 Venue Event Intel
            </h2>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.82rem' }}>
              {event.name} {event.venue ? `• ${event.venue}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#1e293b', color: '#fff', border: '1px solid #334155',
              borderRadius: '6px', padding: '6px 12px', cursor: 'pointer',
              height: 'fit-content'
            }}
          >
            Close
          </button>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '12px 0' }}>
          {CATS.map(([k, lbl]) => (
            <button
              key={k}
              onClick={() => setFilterCat(k)}
              style={{
                padding: '5px 10px', borderRadius: '14px', cursor: 'pointer',
                fontSize: '0.78rem', fontWeight: 'bold',
                border: filterCat === k ? '1px solid #38bdf8' : '1px solid #2d3748',
              background: filterCat === k ? '#162536' : '#181c24',
                color: filterCat === k ? '#38bdf8' : '#cbd5e1'
              }}
            >
              {lbl}
            </button>
          ))}
        </div>

        <div style={{
          flex: 1, overflowY: 'auto', border: '1px solid #242b38',
          borderRadius: '8px', background: '#151922', marginBottom: '12px'
        }}>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
              Loading community tips...
            </div>
          ) : visible.length === 0 ? (
            <div style={{ padding: '26px', textAlign: 'center', color: '#64748b' }}>
              No tips posted yet—be the first to share parking, seating, AC temp,
              or weigh-in intel!
            </div>
          ) : visible.map(item => {
            const canDel = (user && item.uid === user.uid) || isAdmin;
            const dateStr = item.createdAt
              ? new Date(item.createdAt).LocaleDateString(undefined, {
                  month: 'short', day: 'numeric'
                })
              : '';
            return (
              <div
                key={item.id}
                style={{
                  padding: '12px 14px', borderBottom: '1px solid #1f2532'
                }}
              >
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', gap: '8px', flexWrap: 'wrap',
                  marginBottom: '6px'
                }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px',
                      background: '#1e293b', color: '#38bdf8', fontWeight: 'bold'
                    }}>
                      {CAT_LABELS[item.category] || '💡 Tip'}
                    </span>
                    <strong style={{ color: '#e2e8f0 fontSize: '0.84rem' }}>
                      {item.author}
                    </strong>
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                      {dateStr}
                    </span>
                    {item.eventId !== event.id && item.eventName && (
                      <span style={{
                        fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px',
                        background: '#1a202c', color: '#ff9f43',
                        border: '1px solid #4a3520'
                      }}>
                        🏟️ Venue tip from {item.eventName.slice(0, 28)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => handleLike(item)}
                      style={{
                        background: upvoted[item.id] ? '#162536' : '#181c24',
                        co upvoted[item.id] ? '#38bdf8' : '#94a3b8',
                        border: '1px solid #2d3748', borderRadius: '5px',
                        padding: '3px 8px', fontSize: '0.76rem', cursor: 'pointer'
                      }}
                    >
                      👍 {item.likes || 0}
                    </button>
                    {canDel && (
                      <button
                        onClick={() => handleDelete(item)}
                        style={{
                          background: 'transparent', color: '#ef4444',
                          border: 'none', fontSize: '0.75rem', cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ color: '#f1f5f9', fontSize: '0.9rem', lineHeight: 1.45 }}>
                  {item.text}
                </div>
              </div>
            );
          })}
        </div>

      {!user ? (
          <button
            onClick={onRequireAuth}
            style={{
              padding: '11px', borderRadius: '8px', background: '#162536',
              color: '#38bdf8', border: '1px solid #0284c7', fontWeight: 'bold',
              cursor: 'pointer', fontSize: '0.9rem'
            }}
          >
            🔐 Sign In to Share a Venue or Event Tip
          </button>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <select
                value={postCat}
                onChange={e => setPostCat(e.target.value)}
                style={{
                  padding: '8px 10px', borderRadius: '6px', background: '#181c24',
                  color: '#fff', border: '1px solid #2d3748', fontWeight: 'bold'
                }}
              >
                {CATS.slice(1).map(([k, lbl]) => (
                  <option key={k} vae={k}>{lbl}</option>
                ))}
              </select>
              <input
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                placeholder="Display name (e.g. Roberta • BJJ Parent)"
                maxLength={40}
                style={{
                  flex: 1, minWidth: '180px', padding: '8px 10px',
                  borderRadius: '6px', background: '#181c24', color: '#fff',
                  border: '1px solid #2d3748', fontSize: '0.85rem'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Parking fee, chair rules, AC temp, weigh-in lines, coffee spots..."
                maxLength={320}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: '6px',
                  background: '#181c24', color: '#fff', rder: '1px solid #38bdf8',
                  fontSize: '0.9rem'
                }}
              />
              <button
                type="submit"
                disabled={submitting || text.trim().length < 4}
                style={{
                  padding: '10px 16px', borderRadius: '6px', background: '#ff9f43',
                  color: '#000', border: 'none', fontWeight: 'bold',
                  cursor: 'pointer', opacity: text.trim().length < 4 ? 0.5 : 1
                }}
              >
                {submitting ? '...' : 'Post'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
