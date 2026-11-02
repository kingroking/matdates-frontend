import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase'; 

export default function App() {
  const [events, setEvents] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [federationFilter, setFederationFilter] = useState('All');
  const [ageFilter, setAgeFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');
  const [viewMode, setViewMode] = useState('list');

  const [formData, setFormData] = useState({
    name: '', date: '', location: '', link: '', cost: '', type: 'Tournament', color: '#ff9f43'
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const liveSnapshot = await getDocs(collection(db, "live_events"));
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const fetchedEvents = liveSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(ev => {
        if (!ev.sort_date) return true;
        if (ev.sort_date.includes('2099')) return true; 
        
        const eventDate = new Date(ev.sort_date + 'T00:00:00');
        return eventDate >= today;
      })
      .map(ev => {
        const evNameLow = ev.name ? ev.name.toLowerCase() : '';
        const isSeminarOrCamp = /\b(seminar|camp|clinic)\b/.test(evNameLow);
        const isTournament = /\b(tournament|championship|campeonato|open|cup|league|classic)\b/.test(evNameLow);

        if (isSeminarOrCamp && !isTournament) {
            return { ...ev, type: 'Seminar', color: '#9b59b6' };
        }
        return ev;
      })
      .sort((a, b) => (a.sort_date > b.sort_date ? 1 : -1));
    
    setEvents(fetchedEvents);
    
    if (isAdmin) {
      const pendingSnapshot = await getDocs(collection(db, "pending_events"));
      setPendingEvents(pendingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
  };

  const handleLogoClick = () => {
    setClickCount(prev => prev + 1);
    if (clickCount >= 2) {
      setIsAdmin(true);
      setClickCount(0);
      fetchEvents();
    }
  };

  const handlePublicSubmit = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "pending_events"), formData);
    setShowSubmitModal(false);
    alert("Event submitted for review!");
    setFormData({ name: '', date: '', location: '', link: '', cost: '', type: 'Tournament', color: '#ff9f43' });
  };

  const approveEvent = async (eventData) => {
    await addDoc(collection(db, "live_events"), eventData);
    await deleteDoc(doc(db, "pending_events", eventData.id));
    fetchEvents();
  };

  const deletePending = async (id) => {
    await deleteDoc(doc(db, "pending_events", id));
    fetchEvents();
  };

  const monthOptions = Array.from(new Set(events.map(ev => ev.sort_date ? ev.sort_date.substring(0, 7) : null).filter(Boolean))).sort();
  
  const formatMonthDisplay = (yyyy_mm) => {
    const [y, m] = yyyy_mm.split('-');
    const date = new Date(y, m - 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  };

  const filteredEvents = events.filter(ev => {
    const evNameLow = ev.name ? ev.name.toLowerCase() : '';
    
    if (/\b(judo|wrestling|karate|taekwondo|kickboxing|muay thai)\b/.test(evNameLow)) {
        return false; 
    }

    const matchesSearch = (evNameLow + (ev.location || '').toLowerCase() + (ev.date || '').toLowerCase()).includes(searchTerm.toLowerCase());
    const evId = ev.id ? ev.id.toLowerCase() : "";
    
    let isKidsEvent = true;
    let isAdultEvent = true;
    
    if (evId.startsWith('ibjjf')) {
        isKidsEvent = evNameLow.includes('kids');
        isAdultEvent = !evNameLow.includes('kids');
    } else if (ev.type === 'Super Fight') {
        isKidsEvent = false;
        isAdultEvent = true;
    } else {
        if ((evNameLow.includes('kids') || evNameLow.includes('youth') || evNameLow.includes('juvenile')) && 
            !evNameLow.includes('adult') && !evNameLow.includes('master') && !evNameLow.includes('all ages')) {
            isAdultEvent = false; 
        }
        if ((evNameLow.includes('adult') || evNameLow.includes('master')) && 
            !evNameLow.includes('kids') && !evNameLow.includes('youth')) {
            isKidsEvent = false;
        }
    }

    const matchesAge = 
      ageFilter === 'All' ? true :
      ageFilter === 'Kids' ? isKidsEvent :
      ageFilter === 'Adults' ? isAdultEvent : false;

    const matchesFed = 
      federationFilter === 'All' ? true :
      federationFilter === 'IBJJF' ? evId.startsWith('ibjjf') :
      federationFilter === 'JJWL' ? evId.startsWith('jjwl') :
      federationFilter === 'ADCC' ? (evId.includes('adcc') || evNameLow.includes('adcc')) :
      federationFilter === 'Smoothcomp' ? evId.startsWith('smoothcomp') :
      federationFilter === 'Super Fight' ? (ev.type === 'Super Fight' || evId.startsWith('flograp') || evId.startsWith('ufcfightpass')) :
      federationFilter === 'Seminars' ? (ev.type === 'Seminar' || evId.startsWith('seminar')) : false;

    const matchesMonth = 
      monthFilter === 'All' ? true :
      (ev.sort_date && ev.sort_date.startsWith(monthFilter));
      
    return matchesSearch && matchesFed && matchesAge && matchesMonth;
  });

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
          <div style={{ textAlign: 'left' }}>
            <h1 onClick={handleLogoClick} style={{ 
              cursor: 'pointer', margin: 0, padding: 0, fontSize: '3.2rem', userSelect: 'none',
              fontWeight: '900', letterSpacing: '2px'
            }}>
              <span style={{ color: '#ffffff' }}>Mat</span><span style={{ color: '#e31837' }}>Dates</span>
            </h1>
            <p style={{ color: '#aaa', margin: '10px 0 0 0', fontSize: '1.1rem' }}>The Ultimate BJJ Event Hub</p>
          </div>
          <button onClick={() => setShowSubmitModal(true)} style={{ backgroundColor: '#ff9f43', color: '#000', padding: '10px 20px', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
            + Submit Event
          </button>
        </header>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '15px', fontSize: '0.95rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span><span style={{ color: '#ff9f43' }}>■</span> Smoothcomp</span>
            <span><span style={{ color: '#0055a4' }}>■</span> IBJJF</span>
            <span><span style={{ color: '#ffffff', textShadow: '0 0 2px #000' }}>■</span> JJWL</span>
            <span><span style={{ color: '#F1C40F' }}>■</span> ADCC</span>
            <span><span style={{ color: '#e31837' }}>■</span> Super Fights</span>
            <span><span style={{ color: '#9b59b6' }}>■</span> Seminars</span>
            <span style={{ marginLeft: '10px' }}><span style={{ fontSize: '1.2rem' }}>🐯</span> Kids/Youth Events</span>
          </div>
          
          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={() => setViewMode('list')} style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: viewMode === 'list' ? '#333' : '#111', color: '#fff', border: '1px solid #444', borderRadius: '4px 0 0 4px' }}>List</button>
            <button onClick={() => setViewMode('grid')} style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: viewMode === 'grid' ? '#333' : '#111', color: '#fff', border: '1px solid #444', borderRadius: '0 4px 4px 0' }}>Grid</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <input type="text" placeholder="Search events or locations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 35px 12px 12px', borderRadius: '5px', border: '1px solid #333', backgroundColor: '#111', color: '#fff', fontSize: '1rem' }} />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#aaa', fontSize: '1.2rem', cursor: 'pointer', padding: '0 5px' }}>
                &times;
              </button>
            )}
          </div>
          
          <select value={federationFilter} onChange={(e) => setFederationFilter(e.target.value)} style={{ padding: '12px', borderRadius: '5px', border: '1px solid #333', backgroundColor: '#111', color: '#fff', fontSize: '1rem', cursor: 'pointer' }}>
            <option value="All">All Federations</option>
            <option value="IBJJF">IBJJF Only</option>
            <option value="JJWL">JJWL Only</option>
            <option value="ADCC">ADCC Only</option>
            <option value="Smoothcomp">Smoothcomp</option>
            <option value="Super Fight">Super Fights</option>
            <option value="Seminars">Seminars</option>
          </select>

          <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} style={{ padding: '12px', borderRadius: '5px', border: '1px solid #333', backgroundColor: '#111', color: '#fff', fontSize: '1rem', cursor: 'pointer' }}>
            <option value="All">All Months</option>
            {monthOptions.map(m => (
              <option key={m} value={m}>{formatMonthDisplay(m)}</option>
            ))}
          </select>

          <select value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)} style={{ padding: '12px', borderRadius: '5px', border: '1px solid #333', backgroundColor: '#111', color: '#fff', fontSize: '1rem', cursor: 'pointer' }}>
            <option value="All">All Ages</option>
            <option value="Kids">Kids Events 🐯</option>
            <option value="Adults">Adult Events</option>
          </select>
        </div>

        <div style={{ 
          display: viewMode === 'grid' ? 'grid' : 'flex', 
          flexDirection: viewMode === 'list' ? 'column' : 'row',
          gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : 'none',
          gap: '20px' 
        }}>
          {filteredEvents.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: '1.2rem', textAlign: 'center', marginTop: '40px', width: '100%' }}>No events found matching your filters.</p>
          ) : (
            filteredEvents.map(ev => {
              const isJJWL = ev.id && ev.id.toLowerCase().startsWith('jjwl');
              const isADCC = (ev.id && ev.id.toLowerCase().includes('adcc')) || (ev.name && ev.name.toLowerCase().includes('adcc'));
              const evBorderColor = isADCC ? '#F1C40F' : ev.type === 'Super Fight' ? '#e31837' : (isJJWL ? '#ffffff' : (ev.color || '#ff9f43'));
              
              return (
                <div key={ev.id} style={{ backgroundColor: '#111', borderLeft: `5px solid ${evBorderColor}`, padding: '20px', borderRadius: '4px', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                  
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                    <span>{ev.name}</span>
                    {ev.name && (ev.name.toLowerCase().includes('kids') || ev.name.toLowerCase().includes('youth') || ev.name.toLowerCase().includes('juvenile')) && (
                      <span style={{ fontSize: '1.3rem', flexShrink: 0 }} title="Kids Event">🐯</span>
                    )}
                  </h3>
                  
                  <div style={{ flexGrow: 1 }}>
                    <p style={{ margin: '5px 0', color: '#aaa' }}>📅 {ev.date}</p>
                    <p style={{ margin: '5px 0', color: '#aaa' }}>📍 {ev.location}</p>
                    
                    {ev.cost && ev.cost !== "See Smoothcomp.com" && !ev.cost.includes("Watch on") && (
                      <p style={{ margin: '5px 0', color: '#aaa' }}>💰 {ev.cost}</p>
                    )}
                    
                    {ev.deadline && <p style={{ margin: '5px 0', color: '#ff4d4d', fontSize: '0.95rem', fontWeight: 'bold' }}>⏰ Deadline: {ev.deadline}</p>}
                  </div>
                  
                  {ev.link && (
                    <a href={ev.link} target="_blank" rel="noreferrer" style={{ 
                      display: 'inline-block', 
                      alignSelf: 'flex-start',
                      marginTop: '15px', 
                      color: '#fff', 
                      textDecoration: 'none', 
                      textAlign: 'center',
                      backgroundColor: ev.type === 'Super Fight' 
                         ? ((ev.id && ev.id.includes('ufc')) || (ev.link && ev.link.includes('ufc')) ? '#1a1a1a' : '#2563eb') 
                         : '#333',
                      border: ev.type === 'Super Fight' && ((ev.id && ev.id.includes('ufc')) || (ev.link && ev.link.includes('ufc'))) ? '1px solid #e31837' : 'none',
                      padding: '8px 18px', 
                      borderRadius: '4px', 
                      fontSize: '0.9rem',
                      fontWeight: 'bold'
                    }}>
                      {ev.type === 'Super Fight' 
                         ? ((ev.id && ev.id.includes('ufc')) || (ev.link && ev.link.includes('ufc')) ? '🥊 Watch on UFC Fight Pass' : '📺 Watch on FloGrappling') 
                         : '🎟️ More Info / Tickets'}
                    </a>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  );
}