import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase'; 
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { calculateWeightClass } from './rulesets';

const cleanProfileUrl = (url) => {
  if (!url || url === "#") return "#";
  if (url.startsWith("http")) return url;
  const path = url.split("smoothcomp.com").pop();
  return `https://smoothcomp.com${path.startsWith("/") ? path : "/" + path}`;
};

function CompetitorTable({ calcResult, event, onClose }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [liveCompetitors, setLiveCompetitors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [editingCompId, setEditingCompId] = useState(null);
  const [tempUrl, setTempUrl] = useState("");

  useEffect(() => {
    const fetchCompetitors = async () => {
      try {
        const q = query(collection(db, "event_competitors"), where("event_id", "==", event.id));
        const compSnapshot = await getDocs(q);
        const comps = compSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLiveCompetitors(comps);
      } catch (error) {
        console.error("Error fetching live competitors:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCompetitors();
  }, [event.id]);

  useEffect(() => {
    if (calcResult) {
      setSearchTerm(calcResult);
    } else {
      setSearchTerm("");
    }
  }, [calcResult]);

  const handleSaveUrl = async (compId) => {
    let cleaned = tempUrl.trim();
    if (cleaned && !cleaned.startsWith('http')) {
      cleaned = `https://${cleaned}`;
    }
    if (!cleaned.includes('jits.gg') && !cleaned.includes('smoothcomp.com')) {
      alert('Please enter a valid Jits.gg or Smoothcomp URL.');
      return;
    }
    try {
      const targetComp = liveCompetitors.find(c => c.id === compId);
      const matchingRows = targetComp
        ? liveCompetitors.filter(c => c.Name === targetComp.Name)
        : [{ id: compId }];

      for (const row of matchingRows) {
        await setDoc(doc(db, "event_competitors", row.id), { JitsProfile: cleaned }, { merge: true });
      }

      const updatedIds = new Set(matchingRows.map(r => r.id));
      setLiveCompetitors(prev => prev.map(c => updatedIds.has(c.id) ? { ...c, JitsProfile: cleaned } : c));
      setEditingCompId(null);
      setTempUrl("");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Firebase blocked saving this link (" + (error.code || error.message) + "). Updating Firestore rules fixes this!");
    }
  };

  const filteredCompetitors = liveCompetitors.filter(comp => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    
    if (
      (comp.Name && comp.Name.toLowerCase().includes(term)) ||
      (comp.Academy && comp.Academy.toLowerCase().includes(term)) ||
      (comp.Division && comp.Division.toLowerCase().includes(term))
    ) {
      return true;
    }
    
    const keywords = term.split(/[\s/]+/).filter(k => k.length > 2);
    if (keywords.length > 1 && comp.Division) {
      const divLow = comp.Division.toLowerCase();
      return keywords.every(kw => divLow.includes(kw));
    }
    
    return false;
  });

  const groupedCompetitors = filteredCompetitors.reduce((acc, comp) => {
    const div = comp.Division || "Unassigned Division";
    if (!acc[div]) acc[div] = [];
    acc[div].push(comp);
    return acc;
  }, {});
  
  const sortedDivisions = Object.keys(groupedCompetitors).sort();

  const isKid = (comp) => {
    if (/boys|girls|youth|kids|juvenile|tiny|little|teen/i.test(comp.Division || "")) return true;
    if (/adult|master|senior|mens|womens|men|women/i.test(comp.Division || "")) return false;
    return event.isKidsEvent && !event.isAdultEvent;
  };

  const getProfileLink = (comp) => {
    if (isKid(comp)) {
      if (comp.JitsProfile) return comp.JitsProfile;
      return `https://jits.gg/search?q=${encodeURIComponent(comp.Name)}`;
    }
    if (comp.Profile && comp.Profile !== "#") return cleanProfileUrl(comp.Profile);
    return `https://www.google.com/search?q=site:smoothcomp.com/profile+${encodeURIComponent(comp.Name)}`;
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: '#111', padding: '24px', borderRadius: '12px', border: '1px solid #444', width: '100%', maxWidth: '1000px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: '#fff' }}>
              📋 {event.name} Competitors
            </h2>
            <p style={{ color: '#aaa', margin: '5px 0 0 0', fontSize: '0.9rem' }}>
              {loading ? <span style={{ color: '#ff9f43' }}>Fetching live brackets...</span> : `${liveCompetitors.length} athletes registered`}
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search name, academy, or division..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '10px 35px 10px 15px', borderRadius: '5px', border: '1px solid #444', backgroundColor: '#222', color: '#fff', width: '250px' }}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#aaa', fontSize: '1.2rem', cursor: 'pointer' }}>&times;</button>
              )}
            </div>
            <button onClick={onClose} style={{ padding: '10px 15px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
              Close
            </button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid #333', padding: '10px' }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#ff9f43' }}>Loading athletes from database...</div>
          ) : sortedDivisions.length > 0 ? (
            sortedDivisions.map(division => (
              <div key={division} style={{ marginBottom: '20px', backgroundColor: '#222', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#333', padding: '10px 15px', fontWeight: 'bold', color: '#ff9f43', borderBottom: '2px solid #444' }}>
                  {division} ({groupedCompetitors[division].length} Competitors)
                </div>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <tbody>
                    {groupedCompetitors[division].map(comp => (
                      <tr key={comp.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                        <td style={{ padding: "12px", fontWeight: "bold", color: "#fff", width: "30%" }}><a href={getProfileLink(comp)} target="_blank" rel="noreferrer" style={{ color: "#fff", textDecoration: "none" }}>{comp.Name}</a></td>
                        <td style={{ padding: '12px', color: '#ccc', width: '35%' }}>{comp.Academy}</td>
                        <td style={{ padding: '12px', textAlign: 'right', width: '35%' }}>
                          {(isKid(comp) && !comp.JitsProfile) || (!isKid(comp) && (!comp.Profile || comp.Profile === "#")) ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                              <a href={getProfileLink(comp)} target="_blank" rel="noreferrer" style={{ color: isKid(comp) ? '#3498db' : '#ff9f43', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                🔍 Search {isKid(comp) ? 'Jits.gg' : 'Smoothcomp'}
                              </a>
                              {editingCompId === comp.id ? (
                                <div style={{ display: 'flex', gap: '5px' }}>
                                  <input type="url" placeholder="Paste link..." value={tempUrl} onChange={e => setTempUrl(e.target.value)} style={{ padding: '4px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#000', color: '#fff', width: '130px' }} />
                                  <button onClick={() => handleSaveUrl(comp.id)} style={{ backgroundColor: '#2ecc71', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px', fontSize: '0.8rem', fontWeight: 'bold' }}>Save</button>
                                  <button onClick={() => { setEditingCompId(null); setTempUrl(""); }} style={{ backgroundColor: '#444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px', fontSize: '0.8rem' }}>X</button>
                                </div>
                              ) : (
                                <button onClick={() => setEditingCompId(comp.id)} style={{ backgroundColor: 'transparent', color: '#aaa', border: '1px solid #444', borderRadius: '4px', cursor: 'pointer', padding: '2px 8px', fontSize: '0.75rem' }}>
                                  🔗 Add Profile Link
                                </button>
                              )}
                            </div>
                          ) : (
                            <a href={getProfileLink(comp)} target="_blank" rel="noreferrer" style={{ color: isKid(comp) ? '#3498db' : '#ff9f43', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>
                              {isKid(comp) ? 'Jits.gg Profile' : 'Smoothcomp Profile'}
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          ) : (
            <div style={{ padding: '30px', textAlign: 'center', color: '#777' }}>No competitors found matching "{searchTerm}"</div>
          )}
        </div>
      </div>
    </div>
  );
}

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

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
  const [selectedCompetitorEvent, setSelectedCompetitorEvent] = useState(null);

  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedReminderEvent, setSelectedReminderEvent] = useState(null);
  const [reminderEmail, setReminderEmail] = useState('');
  const [reminderSubmitted, setReminderSubmitted] = useState(false);

  const [calcData, setCalcData] = useState({ gender: 'Male', age: 18, weight: '', belt: 'White', type: 'Gi' });
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
    
    const rawEvents = liveSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(ev => {
        if (!ev.sort_date) return true;
        if (ev.sort_date.includes('2099')) return true; 
        const eventDate = new Date(ev.sort_date + 'T00:00:00');
        return eventDate >= today;
      })
      .map(ev => {
        const evName = ev.name || '';
        const evNameLow = evName.toLowerCase();
        const evId = ev.id ? ev.id.toLowerCase() : "";

        const isSeminarOrCamp = /\b(seminar|camp|clinic|course)\b/.test(evNameLow);
        const isSuperFightTitle = /\b(superfight|super\s+fight|invitational|showcase|wno|who's\s+number\s+one|ufc\s+bjj|polaris|cji|quintet|ebi|combat\s+jiu|cage\s+series)\b/.test(evNameLow);
        const isTournament = /\b(tournament|championship|campeonato|open|cup|league|nationals)\b/.test(evNameLow);

        let type = ev.type || 'Tournament';
        let color = ev.color || '#ff9f43';

        if (isSeminarOrCamp && !isTournament) {
          type = 'Seminar';
          color = '#9b59b6';
        } else if (isSuperFightTitle && !/\bopen\b/.test(evNameLow)) {
          type = 'Super Fight';
          color = '#e31837';
        }

        // Clean Price Formatter: Strip "See Smoothcomp.com" placeholders & label Early/Late ranges cleanly
        let displayCost = (ev.cost || '').trim();
        if (/^see\s+/i.test(displayCost) || displayCost === 'N/A') {
          displayCost = '';
        } else {
          displayCost = displayCost.replace(/^Registration:\s*/i, '').replace(/\$\s+/g, '$');
          const rangeMatch = displayCost.match(/^([A-Z$€£R]+\s?\d+(?:\.\d{2})?(?:\s?[A-Z]{3})?)\s*[-–]\s*([A-Z$€£R]*\s?\d+(?:\.\d{2})?(?:\s?[A-Z]{3})?)$/i);
          if (rangeMatch) {
            displayCost = `${rangeMatch[1].trim()} Early – ${rangeMatch[2].trim()} Late`;
          }
        }

        // Accurate Kids vs Adult Classification & Tiger Icon Flag
        const isKidsWord = /\b(kids|youth|juvenile|boy|girl|boys|girls|child|tots|peewee|pee-wee|mighty|teens?)\b/.test(evNameLow);
        const isAdultsOnlyWord = /\b(adults?\s+only|adults|master|masters|veterans|trials|pro\s+championship)\b/.test(evNameLow) && !isKidsWord;
        const isAllAgesOrg = /\b(adcc|jjwl|naga|grappling\s+industries|newbreed|agf|fuji|grappling\s+x|good\s+fight|tap\s+cancer|sub\s+spectrum)\b/.test(evNameLow) || evId.startsWith('jjwl');

        let isKids = Boolean(ev.has_youth);
        let isAdult = true;

        if (type === 'Super Fight' || type === 'Seminar' || evId.startsWith('flograp') || evId.startsWith('ufc')) {
          isKids = false;
          isAdult = true;
        } else if (evId.startsWith('ibjjf')) {
          // IBJJF runs separate "Kids International Open" cards vs Adult/Juvenile cards
          isKids = isKidsWord || Boolean(ev.has_youth);
          isAdult = !isKidsWord;
        } else if (isAllAgesOrg) {
          // ADCC Opens, JJWL, NAGA, Grappling Industries, AGF, Fuji, Newbreed include Kids + Adults unless marked Adults/Trials!
          isKids = !isAdultsOnlyWord;
          isAdult = !isKidsWord || /\b(adcc|jjwl|naga|grappling\s+industries|newbreed|agf|fuji)\b/.test(evNameLow);
        } else {
          isKids = isKidsWord || Boolean(ev.has_youth);
          isAdult = !isKidsWord || !/\bonly\b/.test(evNameLow);
        }

        return { ...ev, name: evName, cost: displayCost, type, color, isKidsEvent: isKids, isAdultEvent: isAdult };
      });
    // Deduplication filter: Prevent duplicate event cards by unique Name + Date combination
    const seenMap = new Map();
    const fetchedEvents = [];
    for (const ev of rawEvents) {
      const uniqueKey = `${ev.name.toLowerCase().trim()}_${ev.sort_date || ev.date}`;
      if (!seenMap.has(uniqueKey)) {
        seenMap.set(uniqueKey, true);
        fetchedEvents.push(ev);
      }
    }

    fetchedEvents.sort((a, b) => {
      if (!a.sort_date) return 1;
      if (!b.sort_date) return -1;
      return new Date(a.sort_date) - new Date(b.sort_date);
    });
    
    setEvents(fetchedEvents);
    if (isAdmin) {
      const pendingSnapshot = await getDocs(collection(db, "pending_events"));
      setPendingEvents(pendingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
  };

  const handleLogoClick = () => {
    setClickCount(prev => {
      const nextCount = prev + 1;
      if (nextCount >= 3) {
        setIsAdmin(true);
        fetchEvents();
        return 0;
      }
      return nextCount;
    });
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
    // If event is ADCC, default calculator to No-Gi
    const isAdcc = ev.id.toLowerCase().includes('adcc') || ev.name.toLowerCase().includes('adcc');
    setCalcData(prev => ({ ...prev, type: isAdcc ? 'No-Gi' : 'Gi' }));
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
    
    const isGi = calcData.type === 'Gi';
    const result = calculateWeightClass(federation, parseInt(calcData.age), calcData.gender, calcData.weight, calcData.belt, isGi);
    setCalcResult(result);
  };

  const handleReminderSubmit = async (e) => {
    e.preventDefault();
    if (!reminderEmail || !selectedReminderEvent) return;
    
    try {
      await addDoc(collection(db, "reminders"), {
        eventId: selectedReminderEvent.id,
        eventName: selectedReminderEvent.name,
        email: reminderEmail,
        requestedAt: new Date().toISOString()
      });
      setReminderSubmitted(true);
      setTimeout(() => {
        setShowReminderModal(false);
        setReminderSubmitted(false);
        setReminderEmail('');
      }, 2000);
    } catch (error) {
      console.error("Error saving reminder:", error);
    }
  };

  const monthOptions = Array.from(new Set(events.map(ev => ev.sort_date ? ev.sort_date.substring(0, 7) : null).filter(Boolean))).sort();
  const formatMonthDisplay = (yyyy_mm) => {
    const [y, m] = yyyy_mm.split('-');
    return new Date(y, m - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
  };

  const filteredEvents = events.filter(ev => {
    const evNameLow = ev.name ? ev.name.toLowerCase() : '';
    const evId = ev.id ? ev.id.toLowerCase() : "";
    if (/\b(judo|wrestling|karate|taekwondo|kickboxing|muay thai|ping pong|table tennis|sumo)\b/.test(evNameLow)) return false; 

    const searchTarget = `${evNameLow} ${(ev.location || '').toLowerCase()} ${(ev.date || '').toLowerCase()}`;
    const searchKeywords = searchTerm.toLowerCase().split(/\s+/).filter(kw => kw.length > 0);
    const matchesSearch = searchKeywords.every(kw => searchTarget.includes(kw));

    const matchesAge = ageFilter === 'All' ? true : ageFilter === 'Kids' ? ev.isKidsEvent : ageFilter === 'Adults' ? ev.isAdultEvent : false;
    const matchesFed = federationFilter === 'All' ? true :
      federationFilter === 'IBJJF' ? evId.startsWith('ibjjf') :
      federationFilter === 'JJWL' ? evId.startsWith('jjwl') :
      federationFilter === 'ADCC' ? (evId.includes('adcc') || evNameLow.includes('adcc')) :
      federationFilter === 'Smoothcomp' ? evId.startsWith('smoothcomp') :
      federationFilter === 'Super Fight' ? (ev.type === 'Super Fight' || evId.startsWith('flograp') || evId.startsWith('ufcfightpass')) :
      federationFilter === 'Seminars' ? (ev.type === 'Seminar' || evId.startsWith('seminar')) : false;
    const matchesMonth = monthFilter === 'All' ? true : (ev.sort_date && ev.sort_date.startsWith(monthFilter));
      
    return matchesSearch && matchesFed && matchesAge && matchesMonth;
  });

  const calendarEvents = filteredEvents.map(ev => {
    let startDate = new Date();
    if (ev.sort_date) {
      const [y, m, d] = ev.sort_date.split('-');
      startDate = new Date(y, m - 1, d);
    }
    return { title: `${ev.isKidsEvent ? '🐯 ' : ''}${ev.name}`, start: startDate, end: startDate, resource: ev };
  });

  const isAdccEvent = selectedCalcEvent && (selectedCalcEvent.id.toLowerCase().includes('adcc') || selectedCalcEvent.name.toLowerCase().includes('adcc'));

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: 'sans-serif', position: 'relative' }}>
      
      {showSubmitModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#111', padding: '30px', borderRadius: '12px', border: '1px solid #444', width: '90%', maxWidth: '500px' }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '1.5rem', color: '#fff' }}>Submit an Event</h2>
            <form onSubmit={handlePublicSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input type="text" placeholder="Event Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', fontSize: '1rem' }} required />
              <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', fontSize: '1rem' }} required />
              <input type="text" placeholder="Location (City, State)" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', fontSize: '1rem' }} required />
              <input type="url" placeholder="Registration Link" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', fontSize: '1rem' }} required />
              <button type="submit" style={{ padding: '14px', backgroundColor: '#ff9f43', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>Submit for Review</button>
            </form>
            <button onClick={() => setShowSubmitModal(false)} style={{ marginTop: '20px', padding: '12px', width: '100%', backgroundColor: 'transparent', color: '#aaa', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem' }}>Cancel</button>
          </div>
        </div>
      )}

      {showReminderModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#111', padding: '30px', borderRadius: '12px', border: '1px solid #444', width: '90%', maxWidth: '400px' }}>
            <h2 style={{ margin: '0 0 5px 0', fontSize: '1.5rem', color: '#fff' }}>⏰ Set a Reminder</h2>
            <p style={{ margin: '0 0 20px 0', color: '#aaa', fontSize: '0.9rem' }}>We will email you 48 hours before the registration deadline for: <br/><strong style={{color: '#fff'}}>{selectedReminderEvent?.name}</strong></p>
            
            {reminderSubmitted ? (
              <div style={{ padding: '20px', backgroundColor: '#2ecc71', color: '#fff', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold' }}>
                ✅ Reminder Saved!
              </div>
            ) : (
              <form onSubmit={handleReminderSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input type="email" placeholder="Enter your email address" value={reminderEmail} onChange={e => setReminderEmail(e.target.value)} style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', fontSize: '1rem' }} required />
                <button type="submit" style={{ padding: '14px', backgroundColor: '#ff9f43', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>Save Reminder</button>
              </form>
            )}
            <button onClick={() => setShowReminderModal(false)} style={{ marginTop: '20px', padding: '12px', width: '100%', backgroundColor: 'transparent', color: '#aaa', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem' }}>Close</button>
          </div>
        </div>
      )}

      {showCalcModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#111', padding: '30px', borderRadius: '12px', border: '1px solid #444', width: '90%', maxWidth: '400px' }}>
            <h2 style={{ margin: '0 0 5px 0', fontSize: '1.5rem', color: '#fff' }}>⚖️ Weight Class Check</h2>
            <p style={{ margin: '0 0 20px 0', color: '#aaa', fontSize: '0.9rem' }}>Event: {selectedCalcEvent?.name}</p>
            <form onSubmit={handleCalculate} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              {!isAdccEvent ? (
                <select value={calcData.type} onChange={e => setCalcData({...calcData, type: e.target.value})} style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', fontSize: '1rem' }}>
                  <option value="Gi">Gi (Uniform)</option>
                  <option value="No-Gi">No-Gi</option>
                </select>
              ) : (
                <div style={{ padding: '10px 12px', backgroundColor: '#222', borderRadius: '6px', color: '#F1C40F', border: '1px solid #F1C40F', fontWeight: 'bold', textAlign: 'center' }}>
                  ⚡ ADCC is No-Gi Only
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <select value={calcData.gender} onChange={e => setCalcData({...calcData, gender: e.target.value})} style={{ flex: 1, padding: '12px', borderRadius: '6px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', fontSize: '1rem' }}><option value="Male">Male</option><option value="Female">Female</option></select>
                <input type="number" placeholder="Age" value={calcData.age} onChange={e => setCalcData({...calcData, age: e.target.value})} style={{ flex: 1, padding: '12px', borderRadius: '6px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', fontSize: '1rem' }} required />
              </div>
              <select value={calcData.belt} onChange={e => setCalcData({...calcData, belt: e.target.value})} style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', fontSize: '1rem' }}>
                <option value="White">White Belt</option><option value="Grey">Grey Belt</option><option value="Yellow">Yellow Belt</option><option value="Orange">Orange Belt</option><option value="Green">Green Belt</option><option value="Blue">Blue Belt</option><option value="Purple">Purple Belt</option><option value="Brown">Brown Belt</option><option value="Black">Black Belt</option>
              </select>
              <input type="number" placeholder="Weight in LBS" value={calcData.weight} step="0.1" onChange={e => setCalcData({...calcData, weight: e.target.value})} style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', fontSize: '1rem' }} required />
              <button type="submit" style={{ padding: '14px', backgroundColor: '#ff9f43', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>Calculate Division</button>
            </form>
            {calcResult && (
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#222', borderRadius: '6px', textAlign: 'center', border: '1px solid #ff9f43' }}>
                <p style={{ margin: '0 0 10px 0', color: '#aaa', fontSize: '0.9rem' }}>Based on your entry, you should register for:</p>
                <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#ff9f43' }}>{calcResult}</p>
                
                {selectedCalcEvent.id.startsWith('smoothcomp') && (
                  <button 
                    onClick={() => {
                      setShowCalcModal(false);
                      setSelectedCompetitorEvent(selectedCalcEvent);
                    }}
                    style={{ marginTop: '15px', padding: '10px', width: '100%', backgroundColor: '#ff9f43', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    🔍 Find Opponents in this Division
                  </button>
                )}
              </div>
            )}
            <button onClick={() => setShowCalcModal(false)} style={{ marginTop: '20px', padding: '12px', width: '100%', backgroundColor: 'transparent', color: '#aaa', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem' }}>Close</button>
          </div>
        </div>
      )}

      {selectedCompetitorEvent && (
        <CompetitorTable 
          calcResult={calcResult} 
          event={selectedCompetitorEvent} 
          onClose={() => setSelectedCompetitorEvent(null)} 
        />
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto', minHeight: 'calc(100vh - 120px)' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
          <div style={{ textAlign: 'left' }}>
            <h1 onClick={handleLogoClick} style={{ cursor: 'pointer', margin: 0, padding: 0, fontSize: '3.2rem', userSelect: 'none', fontWeight: '900', letterSpacing: '2px' }}><span style={{ color: '#ffffff' }}>Mat</span><span style={{ color: '#e31837' }}>Dates</span></h1>
            <p style={{ color: '#aaa', margin: '10px 0 0 0', fontSize: '1.1rem' }}>The Ultimate BJJ Event Hub</p>
          </div>
          <button onClick={() => setShowSubmitModal(true)} style={{ backgroundColor: '#ff9f43', color: '#000', padding: '10px 20px', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>+ Submit Event</button>
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
            <Calendar localizer={localizer} events={calendarEvents} startAccessor="start" endAccessor="end" style={{ height: 750 }} date={calendarDate} onNavigate={setCalendarDate} view={calendarView} onView={setCalendarView} views={['month', 'week', 'agenda']} onSelectEvent={(event) => { if(event.resource.link) window.open(event.resource.link, '_blank'); }} />
          </div>
        ) : (
          <div style={{ display: viewMode === 'grid' ? 'grid' : 'flex', flexDirection: viewMode === 'list' ? 'column' : 'row', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : 'none', gap: '20px' }}>
            {filteredEvents.map(ev => {
              const isJJWL = ev.id && ev.id.toLowerCase().startsWith('jjwl');
              const isADCC = (ev.id && ev.id.toLowerCase().includes('adcc')) || (ev.name && ev.name.toLowerCase().includes('adcc'));
              
              const isStreamOnly = ev.type === 'Super Fight' || (ev.id && (ev.id.toLowerCase().startsWith('flograp') || ev.id.toLowerCase().startsWith('ufc') || ev.id.toLowerCase().includes('fightpass')));
              const evBorderColor = isADCC ? '#F1C40F' : (ev.type === 'Super Fight' || isStreamOnly) ? '#e31837' : (isJJWL ? '#ffffff' : (ev.color || '#ff9f43'));
              
              return (
                <div key={ev.id} style={{ backgroundColor: '#111', borderLeft: `5px solid ${evBorderColor}`, padding: '20px', borderRadius: '4px', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{ev.name}</span> {ev.isKidsEvent && <span>🐯</span>}
                  </h3>
                  <div style={{ flexGrow: 1, color: '#aaa', fontSize: '0.95rem', lineHeight: '1.6', margin: '8px 0' }}>
                    📅 {ev.date} &nbsp;|&nbsp; 📍 {ev.location}<br/>
                    {ev.cost && <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>💳 {ev.cost}</span>}
                    {ev.deadline && <span style={{ color: '#e31837', display: 'block', fontSize: '0.85rem' }}>⏳ Deadline: {ev.deadline}</span>}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' }}>
                    
                  {!isStreamOnly && ev.type !== 'Seminar' && (
                      <button onClick={() => handleOpenCalc(ev)} style={{ flex: 1, backgroundColor: '#222', color: '#fff', border: '1px solid #444', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', minWidth: '120px' }}>
                        ⚖️ Find Division
                      </button>
                    )}
                    
                    {isStreamOnly && (
                      <button 
                        onClick={() => {
                          setCalcResult(''); 
                          setSelectedCompetitorEvent(ev);
                        }} 
                        style={{ flex: 1, backgroundColor: '#1a1a1a', color: evBorderColor, border: `1px solid ${evBorderColor}`, padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', minWidth: '120px' }}
                      >
                        🥊 View Fight Card
                      </button>
                    )}

                    {!isStreamOnly && ev.type !== 'Seminar' && (
                      <button 
                        onClick={() => {
                          setCalcResult(''); 
                          setSelectedCompetitorEvent(ev);
                        }} 
                        style={{ flex: 1, backgroundColor: '#1a1a1a', color: '#ff9f43', border: '1px solid #ff9f43', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', minWidth: '120px' }}
                      >
                        👥 Brackets
                      </button>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => {
                        setSelectedReminderEvent(ev);
                        setShowReminderModal(true);
                      }} 
                      style={{ flex: 1, backgroundColor: '#222', color: '#fff', border: '1px solid #444', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', minWidth: '120px' }}
                    >
                      ⏰ Remind Me
                    </button>

                    {!isStreamOnly && ev.link && (
                      <a href={ev.link} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: 'center', color: '#fff', textDecoration: 'none', backgroundColor: '#333', padding: '8px 12px', borderRadius: '4px', fontWeight: 'bold', minWidth: '120px' }}>
                        🎟️ Register
                      </a>
                    )}

                    {(isStreamOnly && ev.link) || ev.stream_link ? (
                      <a href={ev.stream_link || ev.link} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: 'center', color: evBorderColor, textDecoration: 'none', backgroundColor: '#1a1a1a', border: `1px solid ${evBorderColor}`, padding: '8px 12px', borderRadius: '4px', fontWeight: 'bold', minWidth: '120px' }}>
                        📺 Watch
                      </a>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <footer style={{ marginTop: '50px', padding: '30px 20px', borderTop: '1px solid #333', textAlign: 'center', backgroundColor: '#0a0a0a', color: '#777', fontSize: '0.85rem', lineHeight: '1.6' }}>
        <div style={{ marginBottom: '15px' }}>
          <h2 style={{ margin: 0, padding: 0, fontSize: '1.5rem', fontWeight: '900', letterSpacing: '1px' }}>
            <span style={{ color: '#ffffff' }}>Mat</span><span style={{ color: '#e31837' }}>Dates</span>
          </h2>
        </div>
        <p style={{ maxWidth: '800px', margin: '0 auto 15px auto' }}>
          MatDates is an independent BJJ event aggregator built for the community. We are not affiliated with, officially endorsed by, or sponsored by IBJJF, ADCC, Smoothcomp, Jiu Jitsu World League, or any listed federations. All trademarks and event data belong to their respective owners.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <a href="mailto:contact@matdates.com" style={{ color: '#ff9f43', textDecoration: 'none', fontWeight: 'bold' }}>Partner With Us</a>
          <span>|</span>
          <span style={{ color: '#777' }}>Privacy Policy</span>
          <span>|</span>
          <span>© {new Date().getFullYear()} MatDates. All Rights Reserved.</span>
        </div>
      </footer>
    </div>
  );
}