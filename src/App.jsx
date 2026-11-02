import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase'; 
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { calculateWeightClass } from './rulesets'; 

const locales = {
  'en-US': enUS,
}
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

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

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState('month');

  const [showCalcModal, setShowCalcModal] = useState(false);
  const [selectedCalcEvent, setSelectedCalcEvent] = useState(null);
  
  // NEW: Added belt rank to the calculator state
  const [calcData, setCalcData] = useState({ gender: 'Male', age: 18, weight: '', belt: 'White' });
  const [calcResult, setCalcResult] = useState('');

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
        const evId = ev.id ? ev.id.toLowerCase() : "";
        
        const isSeminarOrCamp = /\b(seminar|camp|clinic)\b/.test(evNameLow);
        const isTournament = /\b(tournament|championship|campeonato|open|cup|league|classic)\b/.test(evNameLow);

        let type = ev.type || 'Tournament';
        let color = ev.color || '#ff9f43';

        if (isSeminarOrCamp && !isTournament) {
            type = 'Seminar';
            color = '#9b59b6';
        }

        let isKids = true;  
        let isAdult = true; 
        
        if (type === 'Super Fight' || evId.startsWith('flograp') || evId.startsWith('ufc') || evId.includes('fightpass')) {
            isKids = false; 
        } else if (evId.startsWith('ibjjf')) {
            isKids = evNameLow.includes('kids');
            isAdult = !evNameLow.includes('kids');
        } else {
            if (evNameLow.includes('adult only') || evNameLow.includes('masters only') || /\b(pro)\b/.test(evNameLow)) {
                isKids = false;
            }
            if ((evNameLow.includes('kids') || evNameLow.includes('youth') || evNameLow.includes('juvenile')) && !evNameLow.includes('adult') && !evNameLow.includes('all ages')) {
                isAdult = false;
            }
        }

        return { ...ev, type, color, isKidsEvent: isKids, isAdultEvent: isAdult };
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

  const handleOpenCalc = (ev) => {
    setSelectedCalcEvent(ev);
    setCalcResult('');
    setShowCalcModal(true);
  };

  const handleCalculate = (e) => {
    e.preventDefault();
    if (!selectedCalcEvent) return;
    
    let federation = 'Other';
    const evId = selectedCalcEvent.id ? selectedCalcEvent.id.toLowerCase() : "";
    const evNameLow = selectedCalcEvent.name ? selectedCalcEvent.name.toLowerCase() : "";
    
    if (evId.startsWith('ibjjf')) federation = 'IBJJF';
    else if (evId.includes('adcc') || evNameLow.includes('adcc')) federation = 'ADCC';
    else if (evId.startsWith('jjwl')) federation = 'JJWL';
    else if (selectedCalcEvent.type === 'Super Fight' || evId.startsWith('ufc') || evId.startsWith('flograp')) federation = 'Super Fight';
    
    // NEW: Passing the belt value into the calculation
    const result = calculateWeightClass(federation, parseInt(calcData.age), calcData.gender, calcData.weight, calcData.belt);
    setCalcResult(result);
  };

  const monthOptions = Array.from(new Set(events.map(ev => ev.sort_date ? ev.sort_date.substring(0, 7) : null).filter(Boolean))).sort();
  
  const formatMonthDisplay = (yyyy_mm) => {
    const [y, m] = yyyy_mm.split('-');
    const date = new Date(y, m - 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  };

  const filteredEvents = events.filter(ev => {
    const evNameLow = ev.name ? ev.name.toLowerCase() : '';
    const evId = ev.id ? ev.id.toLowerCase() : "";
    
    if (/\b(judo|wrestling|karate|taekwondo|kickboxing|muay thai)\b/.test(evNameLow)) {
        return false; 
    }

    const matchesSearch = (evNameLow + (ev.location || '').toLowerCase() + (ev.date || '').toLowerCase()).includes(searchTerm.toLowerCase());
    
    const matchesAge = 
      ageFilter === 'All' ? true :
      ageFilter === 'Kids' ? ev.isKidsEvent :
      ageFilter === 'Adults' ? ev.isAdultEvent : false;

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

  const calendarEvents = filteredEvents.map(ev => {
    let startDate = new Date();
    if (ev.sort_date) {
      const [y, m, d] = ev.sort_date.split('-');
      startDate = new Date(y, m - 1, d);
    }
    return {
      title: `${ev.isKidsEvent ? '🐯 ' : ''}${ev.name}`,
      start: startDate,
      end: startDate,
      resource: ev 
    };
  });

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: 'sans-serif', position: 'relative' }}>
      
      {showCalcModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#111', padding: '30px', borderRadius: '12px', border: '1px solid #444', width: '90%', maxWidth: '400px' }}>
            <h2 style={{ margin: '0 0 5px 0', fontSize: '1.5rem', color: '#fff' }}>⚖️ Weight Class Check</h2>
            <p style={{ margin: '0 0 20px 0', color: '#aaa', fontSize: '0.9rem' }}>Event: {selectedCalcEvent?.name}</p>
            
            <form onSubmit={handleCalculate} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <select value={calcData.gender} onChange={e => setCalcData({...calcData, gender: e.target.value})} style={{ flex: 1, padding: '12px', borderRadius: '6px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', fontSize: '1rem' }}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <input type="number" placeholder="Age" value={calcData.age} onChange={e => setCalcData({...calcData, age: e.target.value})} style={{ flex: 1, padding: '12px', borderRadius: '6px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', fontSize: '1rem' }} required />
              </div>

              {/* NEW: Belt Dropdown */}
              <select value={calcData.belt} onChange={e => setCalcData({...calcData, belt: e.target.value})} style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', fontSize: '1rem' }}>
                <option value="White">White Belt</option>
                <option value="Grey">Grey Belt</option>
                <option value="Yellow">Yellow Belt</option>
                <option value="Orange">Orange Belt</option>
                <option value="Green">Green Belt</option>
                <option value="Blue">Blue Belt</option>
                <option value="Purple">Purple Belt</option>
                <option value="Brown">Brown Belt</option>
                <option value="Black">Black Belt</option>
              </select>

              <input type="number" placeholder="Enter Weight in LBS" value={calcData.weight} step="0.1" onChange={e => setCalcData({...calcData, weight: e.target.value})} style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', fontSize: '1rem' }} required />
              
              <button type="submit" style={{ padding: '14px', backgroundColor: '#ff9f43', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>Calculate Division</button>
            </form>

            {calcResult && (
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#222', borderRadius: '6px', textAlign: 'center', border: '1px solid #ff9f43' }}>
                <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>Your Division is:</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '1.3rem', fontWeight: 'bold', color: '#fff' }}>{calcResult}</p>
              </div>
            )}

            <button onClick={() => setShowCalcModal(false)} style={{ marginTop: '20px', padding: '12px', width: '100%', backgroundColor: 'transparent', color: '#aaa', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem' }}>Close</button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
          <div style={{ textAlign: 'left' }}>
            <h1 onClick={handleLogoClick} style={{ cursor: 'pointer', margin: 0, padding: 0, fontSize: '3.2rem', userSelect: 'none', fontWeight: '900', letterSpacing: '2px' }}>
              <span style={{ color: '#ffffff' }}>Mat</span><span style={{ color: '#e31837' }}>Dates</span>
            </h1>
            <p style={{ color: '#aaa', margin: '10px 0 0 0', fontSize: '1.1rem' }}>The Ultimate BJJ Event Hub</p>
          </div>
          <button onClick={() => setShowSubmitModal(true)} style={{ backgroundColor: '#ff9f43', color: '#000', padding: '10px 20px', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
            + Submit Event
          </button>
        </header>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '15px', fontSize: '0.95rem', flexWrap: 'wrap', alignItems: 'center', userSelect: 'none' }}>
            <span onClick={() => setFederationFilter(prev => prev === 'Smoothcomp' ? 'All' : 'Smoothcomp')} style={{ cursor: 'pointer', opacity: federationFilter === 'All' || federationFilter === 'Smoothcomp' ? 1 : 0.4, transition: 'opacity 0.2s' }}><span style={{ color: '#ff9f43' }}>■</span> Smoothcomp</span>
            <span onClick={() => setFederationFilter(prev => prev === 'IBJJF' ? 'All' : 'IBJJF')} style={{ cursor: 'pointer', opacity: federationFilter === 'All' || federationFilter === 'IBJJF' ? 1 : 0.4, transition: 'opacity 0.2s' }}><span style={{ color: '#0055a4' }}>■</span> IBJJF</span>
            <span onClick={() => setFederationFilter(prev => prev === 'JJWL' ? 'All' : 'JJWL')} style={{ cursor: 'pointer', opacity: federationFilter === 'All' || federationFilter === 'JJWL' ? 1 : 0.4, transition: 'opacity 0.2s' }}><span style={{ color: '#ffffff', textShadow: '0 0 2px #000' }}>■</span> JJWL</span>
            <span onClick={() => setFederationFilter(prev => prev === 'ADCC' ? 'All' : 'ADCC')} style={{ cursor: 'pointer', opacity: federationFilter === 'All' || federationFilter === 'ADCC' ? 1 : 0.4, transition: 'opacity 0.2s' }}><span style={{ color: '#F1C40F' }}>■</span> ADCC</span>
            <span onClick={() => setFederationFilter(prev => prev === 'Super Fight' ? 'All' : 'Super Fight')} style={{ cursor: 'pointer', opacity: federationFilter === 'All' || federationFilter === 'Super Fight' ? 1 : 0.4, transition: 'opacity 0.2s' }}><span style={{ color: '#e31837' }}>■</span> Super Fights</span>
            <span onClick={() => setFederationFilter(prev => prev === 'Seminars' ? 'All' : 'Seminars')} style={{ cursor: 'pointer', opacity: federationFilter === 'All' || federationFilter === 'Seminars' ? 1 : 0.4, transition: 'opacity 0.2s' }}><span style={{ color: '#9b59b6' }}>■</span> Seminars</span>
            <span onClick={() => setAgeFilter(prev => prev === 'Kids' ? 'All' : 'Kids')} style={{ cursor: 'pointer', marginLeft: '10px', padding: '4px 10px', backgroundColor: ageFilter === 'Kids' ? '#222' : 'transparent', borderRadius: '6px', border: ageFilter === 'Kids' ? '1px solid #555' : '1px solid transparent', opacity: ageFilter === 'Kids' ? 1 : 0.8, transition: 'all 0.2s' }}><span style={{ fontSize: '1.2rem' }}>🐯</span> Kids/Youth Events</span>
          </div>
          
          <div style={{ display: 'flex', gap: '0' }}>
            <button onClick={() => setViewMode('list')} style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: viewMode === 'list' ? '#333' : '#111', color: '#fff', border: '1px solid #444', borderRadius: '4px 0 0 4px' }}>List</button>
            <button onClick={() => setViewMode('grid')} style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: viewMode === 'grid' ? '#333' : '#111', color: '#fff', borderTop: '1px solid #444', borderBottom: '1px solid #444', borderLeft: 'none', borderRight: 'none' }}>Grid</button>
            <button onClick={() => setViewMode('calendar')} style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: viewMode === 'calendar' ? '#333' : '#111', color: '#fff', border: '1px solid #444', borderRadius: '0 4px 4px 0' }}>Calendar</button>
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
            {monthOptions.map(m => (<option key={m} value={m}>{formatMonthDisplay(m)}</option>))}
          </select>
          <select value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)} style={{ padding: '12px', borderRadius: '5px', border: '1px solid #333', backgroundColor: '#111', color: '#fff', fontSize: '1rem', cursor: 'pointer' }}>
            <option value="All">All Ages</option>
            <option value="Kids">Kids Events 🐯</option>
            <option value="Adults">Adult Events</option>
          </select>
        </div>

        {viewMode === 'calendar' ? (
          <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', color: '#000' }}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 750 }}
              date={calendarDate}
              onNavigate={(newDate) => setCalendarDate(newDate)}
              view={calendarView}
              onView={(newView) => setCalendarView(newView)}
              views={['month', 'week', 'agenda']}
              eventPropGetter={(event) => {
                const evId = event.resource.id ? event.resource.id.toLowerCase() : "";
                const isJJWL = evId.startsWith('jjwl');
                const isADCC = evId.includes('adcc') || event.resource.name.toLowerCase().includes('adcc');
                const bgColor = isADCC ? '#F1C40F' : event.resource.type === 'Super Fight' ? '#e31837' : (isJJWL ? '#555' : (event.resource.color || '#ff9f43'));
                return { style: { backgroundColor: bgColor, color: isADCC || isJJWL ? '#000' : '#fff', fontWeight: 'bold' } };
              }}
              onSelectEvent={(event) => {
                if(event.resource.link) window.open(event.resource.link, '_blank');
                else alert(`${event.title}\n📍 ${event.resource.location}`);
              }}
            />
          </div>
        ) : (
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
                      {ev.isKidsEvent && (
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
                    
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' }}>
                      <button onClick={() => handleOpenCalc(ev)} style={{ flex: 1, backgroundColor: '#222', color: '#fff', border: '1px solid #444', padding: '8px 12px', borderRadius: '4px', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                        ⚖️ Find Division
                      </button>
                      
                      {ev.link && (
                        <a href={ev.link} target="_blank" rel="noreferrer" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', textDecoration: 'none', backgroundColor: ev.type === 'Super Fight' ? ((ev.id && ev.id.includes('ufc')) || (ev.link && ev.link.includes('ufc')) ? '#1a1a1a' : '#2563eb') : '#333', border: ev.type === 'Super Fight' && ((ev.id && ev.id.includes('ufc')) || (ev.link && ev.link.includes('ufc'))) ? '1px solid #e31837' : 'none', padding: '8px 12px', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                          {ev.type === 'Super Fight' ? ((ev.id && ev.id.includes('ufc')) || (ev.link && ev.link.includes('ufc')) ? '🥊 UFC Pass' : '📺 FloGrappling') : '🎟️ Register'}
                        </a>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}