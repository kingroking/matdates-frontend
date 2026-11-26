import { buildVenueHotelUrl } from "./proHubData";
import { AthleteTrophyRoomModal } from "./proTrophyModal";
import { athBucketsForQuery, athBucket, getCachedShardItems, strictVerifiedAthleteRowMatch, universalGymKey, inferTargetGender } from "./proHubData";
import { GuidedTourModal, MultiCategoryDropdown, AcademyProSuite, PromoterHomeDashboard } from "./proWorkspaces";
import { EventPortalModal } from "./EventPortalModal";
import { UPCOMING_UFC_SUPERFIGHTS, getEventGiTags, getDeadlineBadge, cleanAcademyName } from "./proHubData";
import { EventPhotogModal, fetchPhotogCounts, getTotalPhotogCount } from "./photogModal";
import { TaleOfTheTapeModal, WeekendWarRoomModal, SubmitEventModal } from "./proModals";
import { formatEventLoc, resolveEventUrl } from './locationFmt';
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { MatAlertModal, WatchedAthletesModal, useWatchedAthletes } from './MatAlertModal';
import { VenueIntelModal, useVenueTipCounts } from './VenueIntelModal';
import { db, auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import AuthModal from './AuthModal';
import { SponsorBanner, SponsorMediaKitModal } from './sponsorConfig';
import { AnalyticsAndPwaManager, trackEvent } from './analytics'; 
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { calculateWeightClass } from './rulesets';
import { StoryShareModal, EventSquadChips, LeaderboardModal, AthleteSearchModal } from './phase4Tools';

const cleanProfileUrl = (url) => {
  if (!url || url === "#") return "#";
  if (url.startsWith("http")) return url;
  const path = url.split("smoothcomp.com").pop();
  return `https://smoothcomp.com${path.startsWith("/") ? path : "/" + path}`;
};

function CompetitorTable({ calcResult, event, onClose }) {
  const [searchTerm, setSearchTerm] = useState("");
  const deferredCompSearch = React.useDeferredValue(searchTerm);
  const [liveCompetitors, setLiveCompetitors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [editingCompId, setEditingCompId] = useState(null);
  const [tempUrl, setTempUrl] = useState("");
  const [storyPayload, setStoryPayload] = useState(null);
  const [watchTarget, setWatchTarget] = useState(null);
  const [scoutPair, setScoutPair] = useState([]);
  const [bracketTrophyAth, setBracketTrophyAth] = useState(null);
  const [compMedalMap, setCompMedalMap] = useState({});
  useEffect(() => { if (event && event.id) trackEvent('bracketOpens'); }, [event?.id]);
  const { getWatch, removeWatch } = useWatchedAthletes();

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
    if (!liveCompetitors.length) { setCompMedalMap({}); return; }
    let cancelled = false;
    const bktSet = new Set();
    liveCompetitors.forEach(c => {
      if (!c.Name) return;
      athBucketsForQuery(c.Name).forEach(b => { if (b && b !== "__") bktSet.add(b); });
      const fb = athBucket(c.Name);
      if (fb && fb !== "__") bktSet.add(fb);
    });
    const bkts = Array.from(bktSet);
    Promise.all([
      (bkts.length > 35 ? Promise.resolve([]) : Promise.all(bkts.slice(0, 16).map(b => getCachedShardItems(db, collection, query, where, getDocs, "__a2_" + b + "__")))),
      (bkts.length > 20 ? Promise.resolve([]) : Promise.all(bkts.slice(0, 16).map(b => getCachedShardItems(db, collection, query, where, getDocs, "__alltime_a2_" + b + "__"))))
    ]).then(([s26Arrs, histArrs]) => {
      if (cancelled) return;
      const byLast2_26 = new Map();
      const byLast2_H = new Map();
      bkts.forEach((b, idx) => {
        byLast2_26.set(b, s26Arrs[idx] || []);
        byLast2_H.set(b, histArrs[idx] || []);
      });
      const nextMap = {};
      liveCompetitors.forEach(c => {
        if (!c.Name) return;
        const myBkts = Array.from(new Set([...athBucketsForQuery(c.Name), athBucket(c.Name)])).filter(b => b && b !== "__");
        const cGen = /female|girls|women/i.test(c.Division || "") ? "F" : (/\b(male|boys|men)\b/i.test(c.Division || "") ? "M" : "");
        let g = 0, s = 0, b = 0, hg = 0, hs = 0, hb = 0;
        const evs26 = [], seen26 = new Set(), seenH = new Set();
        myBkts.forEach(bk => {
          (byLast2_26.get(bk) || []).forEach(it => {
            if (strictVerifiedAthleteRowMatch(it.n, it.a, it.d, c.Name, c.Academy || "", cGen) ||
                strictVerifiedAthleteRowMatch(it.n, it.a, it.d, c.Name, "", cGen)) {
              const dk = (it.ev || "") + "|" + (it.d || "") + "|" + it.p;
              if (seen26.has(dk)) return;
              seen26.add(dk);
              const p = Number(it.p || 3);
              if (p === 1) g++; else if (p === 2) s++; else b++;
              evs26.push(it);
            }
          });
          (byLast2_H.get(bk) || []).forEach(it => {
            if (strictVerifiedAthleteRowMatch(it.n, it.a, it.d, c.Name, c.Academy || "", cGen) ||
                strictVerifiedAthleteRowMatch(it.n, it.a, it.d, c.Name, "", cGen)) {
              const dk = (it.ev || "") + "|" + (it.d || "") + "|" + it.p;
              if (seenH.has(dk) || seen26.has(dk)) return;
              seenH.add(dk);
              const p = Number(it.p || 3);
              if (p === 1) hg++; else if (p === 2) hs++; else hb++;
            }
          });
        });
        if (g + s + b + hg + hs + hb > 0) {
          nextMap[c.id] = { g, s, b, totG: g + hg, totS: s + hs, totB: b + hb, events: evs26 };
        }
      });
      setCompMedalMap(nextMap);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [liveCompetitors]);

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
      alert('Please enter a valid Jits or Smoothcomp URL.');
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

  const normalizeDivText = (str) => {
    return (str || '')
      .toLowerCase()
      .replace(/(\d),(\d)/g, '$1.$2')          // -50,0 kg -> -50.0 kg
      .replace(/\.0\b/g, '')                   // 50.0 -> 50 so 50 and 50.0 both match
      .replace(/\([^)]*lbs?[^)]*\)/gi, ' ')    // strip dual-unit "(110 lbs)" when kg is primary
      .replace(/[()[\]/,+]/g, ' ')              // strip brackets, parens, slashes
      .replace(/\s+/g, ' ')
      .trim();
  };

  const NOISE_WORDS = new Set([
    'adcc', 'ibjjf', 'jjwl', 'smoothcomp', 'agf', 'naga', 'grappling', 'industries',
    'gi', 'no-gi', 'nogi', 'no', 'years', 'year', 'yrs', 'old', 'belt', 'belts',
    'kg', 'kgs', 'lb', 'lbs', 'division', 'class', 'the', 'and'
  ]);

  const filteredCompetitors = liveCompetitors.filter(comp => {
    if (!searchTerm) return true;
    const rawTerm = searchTerm.toLowerCase().trim();

    if (
      (comp.Name && comp.Name.toLowerCase().includes(rawTerm)) ||
      (comp.Academy && comp.Academy.toLowerCase().includes(rawTerm)) ||
      (comp.Division && comp.Division.toLowerCase().includes(rawTerm))
    ) {
      return true;
    }

    const normSearch = normalizeDivText(searchTerm);
    const normDiv = normalizeDivText(comp.Division);
    const normCombined = `${(comp.Name || '').toLowerCase()} ${(comp.Academy || '').toLowerCase()} ${normDiv}`;

    // Extract meaningful division tokens (e.g. "girls", "13-14", "-50" / "50")
    const rawTokens = normSearch.split(/\s+/).filter(Boolean);
    const coreTokens = rawTokens.filter(t => {
      const clean = t.replace(/^-/, '');
      if (!clean) return false;
      if (NOISE_WORDS.has(t) || NOISE_WORDS.has(clean)) return false;
      return clean.length >= 2 || /^\d+$/.test(clean);
    });

    if (coreTokens.length > 0) {
      return coreTokens.every(tok => {
        const cleanTok = tok.replace(/^-/, '');
        // For numeric weights/ages (e.g. "50" or "13-14"), match cleanly on word/number boundaries
        if (/^\d+(\.\d+)?(-\d+(\.\d+)?)?$/.test(cleanTok)) {
          const escaped = cleanTok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return new RegExp(`(^|[^0-9.])${escaped}([^0-9.]|$)`).test(normDiv);
        }
        // Handle Male/Men/Boys & Female/Women/Girls synonyms across federations
        if (cleanTok === 'male' || cleanTok === 'men' || cleanTok === 'mens') {
          return /\b(male|men|mens)\b/.test(normDiv);
        }
        if (cleanTok === 'professional') return /\b(professional|pro|championship|advanced)\b/.test(normDiv);
        if (cleanTok === 'female' || cleanTok === 'women' || cleanTok === 'womens') {
          return /\b(female|women|womens)\b/.test(normDiv);
        }
        return normCombined.includes(cleanTok);
      });
    }

    return normCombined.includes(normSearch);
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
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: '#111', padding: '16px', boxSizing: 'border-box', borderRadius: '12px', border: '1px solid #444', width: '100%', maxWidth: '1000px', maxHeight: '88svh', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ minWidth: 0, textAlign: 'left' }}>
              <h2 style={{ fontSize: '1.15rem', lineHeight: 1.25, fontWeight: 'bold', margin: 0, color: '#fff', wordBreak: 'break-word' }}>
                📋 {event.name}
              </h2>
              <p style={{ color: '#aaa', margin: '4px 0 0 0', fontSize: '0.82rem' }}>
                {event.date ? `📅 ${event.date}` : ''}{event.location ? ` • 📍 ${event.location}` : ''} • {loading ? <span style={{ color: '#ff9f43' }}>Fetching live brackets...</span> : `${liveCompetitors.length} athletes registered`}
              </p>
            </div>
            <button onClick={onClose} aria-label="Close" style={{ padding: '7px 12px', backgroundColor: '#1e293b', color: '#fff', border: '1px solid #475569', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.88rem', flexShrink: 0 }}>
              ✕ Close
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
            <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 0 }}>
              <input
                type="text"
                placeholder="Search name, academy, or division..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '9px 32px 9px 11px', borderRadius: '6px', border: '1px solid #444', backgroundColor: '#222', color: '#fff', width: '100%', boxSizing: 'border-box', fontSize: '0.9rem' }}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#aaa', fontSize: '1.15rem', cursor: 'pointer' }}>&times;</button>
              )}
            </div>
            {(() => {
              let rawU = ''; try { const r = typeof resolveEventUrl === 'function' ? resolveEventUrl(event) : ''; rawU = typeof r === 'string' && r ? r : String(event?.link || event?.url || ''); } catch { rawU = String(event?.link || event?.url || ''); }
              if (!rawU || !rawU.startsWith('http')) return null;
              const bracketU = rawU.includes('smoothcomp.com') ? rawU.replace(/\/$/, '') + '/schedule' : rawU;
              return (
                <a href={bracketU} target="_blank" rel="noopener noreferrer" style={{ padding: '9px 12px', backgroundColor: '#162536', color: '#38bdf8', border: '1px solid #0284c7', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.82rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  Official Brackets ↗
                </a>
              );
            })()}
              {!(/live stream|online|flograppling|fight pass/i.test((event?.venue||"")+" "+(event?.location||""))) && (<a href={buildVenueHotelUrl(event)} target="_blank" rel="noopener noreferrer" style={{padding:"9px 12px",backgroundColor:"#312e81",color:"#e0e7ff",border:"1px solid #818cf8",borderRadius:"6px",textDecoration:"none",fontWeight:"bold",fontSize:"0.82rem",whiteSpace:"nowrap",flexShrink:0}}>🏨 Hotels Near Venue ↗</a>)}
          </div>
        </div>

        {storyPayload && <StoryShareModal payload={storyPayload} onClose={() => setStoryPayload(null)} />}
          {bracketTrophyAth && (
            <AthleteTrophyRoomModal
              athlete={bracketTrophyAth}
              onClose={() => setBracketTrophyAth(null)}
              onBack={() => setBracketTrophyAth(null)}
              backLabel="← Back to Bracket"
            />
          )}
        {scoutPair.length === 2 && <TaleOfTheTapeModal compA={scoutPair[0]} compB={scoutPair[1]} division={event.name} onClose={() => setScoutPair([])} />}
        {watchTarget && <MatAlertModal event={event} comp={watchTarget.comp} division={watchTarget.division} existingWatch={getWatch(watchTarget.comp.Name, event.id)} onRemove={removeWatch} onClose={() => setWatchTarget(null)} />}
          <EventSquadChips competitors={liveCompetitors} onSelectGym={setSearchTerm} />
          <div style={{ overflowY: 'auto', backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid #333', padding: '10px' }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#ff9f43' }}>Loading athletes from database...</div>
          ) : sortedDivisions.length > 0 ? (
            sortedDivisions.map(division => (
              <div key={division} style={{ marginBottom: '20px', backgroundColor: '#222', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#333', padding: '10px 15px', fontWeight: 'bold', color: '#ff9f43', borderBottom: '2px solid #444' }}>
                  <span style={{ display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%', gap:'8px', flexWrap:'wrap' }}><span>{division} ({groupedCompetitors[division].length} Competitors)</span><button onClick={() => setStoryPayload({ event, division, comps: groupedCompetitors[division] })} style={{ backgroundColor:'#111', color:'#fff', border:'1px solid #666', borderRadius:'4px', padding:'4px 10px', fontSize:'0.78rem', cursor:'pointer' }}>Share IG Story</button></span>
                </div>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <tbody>
                    {groupedCompetitors[division].map(comp => (
                      <tr key={comp.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                        <td style={{ padding: "12px", fontWeight: "bold", color: "#fff", width: "38%" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "6px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const st = compMedalMap[comp.id];
                                    setBracketTrophyAth({
                                      name: comp.Name,
                                      academy: comp.Academy || "",
                                      g: st?.g || 0,
                                      s: st?.s || 0,
                                      b: st?.b || 0,
                                      events: st?.events || []
                                    });
                                  }}
                                  title="Open Official MatDates Trophy Room"
                                  style={{ background: "none", border: "none", padding: 0, color: "#fff", fontWeight: "800", textDecoration: "underline", textDecorationColor: "rgba(251,191,36,0.6)", cursor: "pointer", textAlign: "left", lineHeight: 1.35, fontSize: "0.95rem" }}
                                >
                                  {comp.Name} 🏆
                                </button>
                                {compMedalMap[comp.id] && (
                                  <span
                                    onClick={() => {
                                      const st = compMedalMap[comp.id];
                                      setBracketTrophyAth({ name: comp.Name, academy: comp.Academy || "", g: st?.g || 0, s: st?.s || 0, b: st?.b || 0, events: st?.events || [] });
                                    }}
                                    title="Verified Career Medals (tap for full Trophy Room)"
                                    style={{ background: "rgba(245,158,11,0.16)", border: "1px solid rgba(245,158,11,0.45)", color: "#fde047", borderRadius: "999px", padding: "1px 7px", fontSize: "0.7rem", fontWeight: "800", cursor: "pointer", whiteSpace: "nowrap" }}
                                  >
                                    🥇{compMedalMap[comp.id].totG} 🥈{compMedalMap[comp.id].totS} 🥉{compMedalMap[comp.id].totB}
                                  </span>
                                )}
                              </div>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                              <button onClick={() => setWatchTarget({ comp, division })} title="Live Mat # & Match Time alerts" style={{ background: getWatch(comp.Name, event.id) ? "#132a1c" : "#162536", color: getWatch(comp.Name, event.id) ? "#2ecc71" : "#38bdf8", border: getWatch(comp.Name, event.id) ? "1px solid #2ecc71" : "1px solid #0284c7", borderRadius: "5px", padding: "3px 8px", fontSize: "0.71rem", cursor: "pointer", fontWeight: "bold", whiteSpace: "nowrap" }}>{getWatch(comp.Name, event.id) ? (getWatch(comp.Name, event.id).fcmToken ? "✓ Watching 📲" : "✓ Watching ✉️") : "🔔 Watch"}</button>
                              <button onClick={() => setScoutPair(p => p.some(x => x.id === comp.id) ? p.filter(x => x.id !== comp.id) : [...p.slice(-1), comp])} title="Compare 2 athletes side-by-side" style={{ background: scoutPair.some(x => x.id === comp.id) ? "#431407" : "#1e293b", color: scoutPair.some(x => x.id === comp.id) ? "#fbbf24" : "#cbd5e1", border: "1px solid #475569", borderRadius: "5px", padding: "3px 7px", fontSize: "0.7rem", cursor: "pointer", fontWeight: "bold", whiteSpace: "nowrap" }}>{scoutPair.some(x => x.id === comp.id) ? "🆚 Pick 2nd" : "🆚 Compare"}</button>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px', color: '#ff9f43', width: '35%' }}>
                            {comp.Academy && comp.Academy !== 'Independent' ? (
                              <a href={"/?gym=" + encodeURIComponent(universalGymKey(comp.Academy))} style={{ color: '#ff9f43', textDecoration: 'underline', textDecorationColor: 'rgba(255,159,67,0.45)', fontWeight: '700', fontSize: '0.86rem' }} title={"Open " + comp.Academy + " Trophy Room"}>{comp.Academy}</a>
                            ) : (comp.Academy || 'Independent')}
                          </td>
                        <td style={{ padding: '12px', textAlign: 'right', width: '35%' }}>
                          {(isKid(comp) && !comp.JitsProfile) || (!isKid(comp) && (!comp.Profile || comp.Profile === "#")) ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                              <a href={getProfileLink(comp)} target="_blank" rel="noreferrer" onClick={() => { if (isKid(comp)) trackEvent('jitsGgOutclicks'); }} style={{ color: isKid(comp) ? '#3498db' : '#ff9f43', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                🔍 Search {isKid(comp) ? 'Jits' : 'Smoothcomp'}
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
                            <a href={getProfileLink(comp)} target="_blank" rel="noreferrer" onClick={() => { if (isKid(comp)) trackEvent('jitsGgOutclicks'); }} style={{ color: isKid(comp) ? '#3498db' : '#ff9f43', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>
                              {isKid(comp) ? 'Jits Profile' : 'Smoothcomp Profile'}
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

function App() {
  const [events, setEvents] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [sharedAppToast, setSharedAppToast] = useState(false);
  const handleShareMatDatesApp = async () => {
    trackEvent('appShares');
    const shareData = {
      title: 'MatDates.com — Every Mat. Every Bracket. Every Podium.',
      text: 'Check out MatDates — free live BJJ tournament brackets, mat time push alerts & Official Athlete Trophy Rooms!',
      url: 'https://matdates.com'
    };
    if (navigator.share) {
      try { await navigator.share(shareData); return; } catch (e) { if (e?.name === 'AbortError') return; }
    }
    try {
      await navigator.clipboard.writeText('https://matdates.com');
      setSharedAppToast(true);
      setTimeout(() => setSharedAppToast(false), 2500);
    } catch {}
  };
  const [showLeaderboard, setShowLeaderboard] = useState(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      return Boolean(sp.get('gym') || sp.get('athlete'));
    } catch { return false; }
  });
  const [showAthleteSearch, setShowAthleteSearch] = useState(false);
  const [showSponsorKit, setShowSponsorKit] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('sponsor') === '1'; } catch { return false; }
  });
  const [showWatchedModal, setShowWatchedModal] = useState(false);
  const [showWarRoom, setShowWarRoom] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('warroom') === '1'; } catch { return false; }
  });
  const [photogEvent, setPhotogEvent] = useState(null);
  const [photogCounts, setPhotogCounts] = useState({});
  const refreshPhotogCounts = () => { fetchPhotogCounts().then(setPhotogCounts); };
  useEffect(() => { refreshPhotogCounts(); }, []);
  useEffect(() => { if (new URLSearchParams(window.location.search).get("trophy")) setShowLeaderboard(true); }, []);
  const handleDeepLinkAction = (detail = {}) => {
    try {
      const rawUrl = detail.url || '';
      const sp = rawUrl ? new URL(rawUrl, window.location.origin).searchParams : new URLSearchParams(detail.search || '');
      const evFocus = sp.get('event') || '';
      if (evFocus) {
        setHighlightBracketEventId(evFocus);
        setTimeout(() => {
          const el = document.getElementById('ev-card-' + evFocus);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 250);
      }
      const ath = sp.get('athlete') || sp.get('trophy') || (detail.view === 'trophy' ? detail.athleteName : '');
      const gym = sp.get('gym') || '';
      if (ath || gym) {
        const nextUrl = new URL(window.location.href);
        if (ath) nextUrl.searchParams.set('athlete', ath);
        if (gym) nextUrl.searchParams.set('gym', gym);
        nextUrl.searchParams.delete('warroom');
        window.history.replaceState({}, '', nextUrl.pathname + nextUrl.search + nextUrl.hash);
        setShowWarRoom(false);
        setShowLeaderboard(true);
        return;
      }
      setShowLeaderboard(false);
      setShowWarRoom(true);
    } catch {
      setShowWarRoom(true);
    }
  };

  useEffect(() => {
    const onCustomDeep = (e) => handleDeepLinkAction(e.detail || {});
    const onSwMessage = (e) => {
      if (e?.data?.type === 'MD_PUSH_DEEPLINK') handleDeepLinkAction(e.data);
    };
    window.addEventListener('md-open-deeplink', onCustomDeep);
    if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', onSwMessage);
    return () => {
      window.removeEventListener('md-open-deeplink', onCustomDeep);
      if ('serviceWorker' in navigator) navigator.serviceWorker.removeEventListener('message', onSwMessage);
    };
  }, []);

  const [livePushToast, setLivePushToast] = useState(null);
  useEffect(() => {
    const h = (e) => { setLivePushToast(e.detail); setTimeout(() => setLivePushToast(null), 12000); };
    window.addEventListener('md-live-push', h);
    return () => window.removeEventListener('md-live-push', h);
  }, []);
  const { watches: myWatches, removeWatch: removeMyWatch } = useWatchedAthletes();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [homeSearchInput, setHomeSearchInput] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(45);
  useEffect(() => {
    const t = setTimeout(() => { setSearchTerm(homeSearchInput); setVisibleLimit(45); }, 160);
    return () => clearTimeout(t);
  }, [homeSearchInput]);
  const deferredHomeSearch = React.useDeferredValue(searchTerm);
  const [federationFilter, setFederationFilter] = useState('All');
  const [selectedFeds, setSelectedFeds] = useState([]);
  const [userRole, setUserRole] = useState('user');
  const [portalEvent, setPortalEvent] = useState(null);
  const [portalSupport, setPortalSupport] = useState('');
  const [showSiteTour, setShowSiteTour] = useState(false);
  const closeSiteTour = () => {
    try { localStorage.setItem("md_seen_tour_v1", "1"); } catch {}
    setShowSiteTour(false);
  };
  const [ageFilter, setAgeFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');
  const [viewMode, setViewMode] = useState('list'); 

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState('month');

  const [showCalcModal, setShowCalcModal] = useState(false);
  const [selectedCalcEvent, setSelectedCalcEvent] = useState(null);
  const [selectedCompetitorEvent, setSelectedCompetitorEvent] = useState(null);
  const [highlightBracketEventId, setHighlightBracketEventId] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('event') || ''; } catch { return ''; }
  });
  const [selectedCommentEvent, setSelectedCommentEvent] = useState(null);
  const [tipRefreshTick, setTipRefreshTick] = useState(0);
  const getTipCount = useVenueTipCounts(tipRefreshTick);

  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedReminderEvent, setSelectedReminderEvent] = useState(null);
  const [reminderEmail, setReminderEmail] = useState('');
  const [reminderSubmitted, setReminderSubmitted] = useState(false);
  const [reminderTier, setReminderTier] = useState('final_48h');
  const [calcUnit, setCalcUnit] = useState('lbs');
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [savedIds, setSavedIds] = useState([]);
  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u);
    if (u) {
      try {
        const snap = await getDocs(query(collection(db, 'reminders'), where('uid', '==', u.uid), where('type', '==', 'saved_schedule')));
        if (!snap.empty) setSavedIds(snap.docs[0].data().eventIds || []);
      } catch {}
    } else { setSavedIds([]); setShowSavedOnly(false); }
  }), []);
  const toggleSaveEvent = async (id) => {
    if (!user) { setShowAuthModal(true); return; }
    const n = savedIds.includes(id) ? savedIds.filter(x => x !== id) : [...savedIds, id];
    setSavedIds(n);
    try { await setDoc(doc(db, 'reminders', `sched_${user.uid}`), { uid: user.uid, email: user.email, type: 'saved_schedule', eventIds: n }, { merge: true }); } catch {}
  };
  const getGoogleCalUrl = (ev) => { const d = (ev.sort_date && !ev.sort_date.includes('2099')) ? ev.sort_date.replace(/-/g, '') : new Date().toISOString().slice(0,10).replace(/-/g, ''); const n = new Date((ev.sort_date && !ev.sort_date.includes('2099') ? ev.sort_date : new Date().toISOString().slice(0,10)) + 'T12:00:00'); n.setDate(n.getDate() + 1); const d2 = n.toISOString().slice(0,10).replace(/-/g, ''); const loc = [ev.venue, ev.address || ev.location].filter(Boolean).join(', '); const det = [ev.cost ? `Entry: ${ev.cost}` : '', ev.deadline ? `Deadline: ${ev.deadline}` : '', ev.link || ''].filter(Boolean).join(' | '); return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.name || 'BJJ Event')}&dates=${d}/${d2}&location=${encodeURIComponent(loc)}&details=${encodeURIComponent(det)}`; };
  const downloadIcs = (list, fn = 'matdates-event.ics') => { const r = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MatDates//EN']; list.forEach(ev => { const d = (ev.sort_date && !ev.sort_date.includes('2099')) ? ev.sort_date.replace(/-/g, '') : new Date().toISOString().slice(0,10).replace(/-/g, ''); r.push('BEGIN:VEVENT',`UID:${ev.id}@matdates.com`,`DTSTART;VALUE=DATE:${d}`,`SUMMARY:${(ev.name||'BJJ').replace(/,/g,' ')}`,`LOCATION:${[ev.venue,ev.address||ev.location].filter(Boolean).join(' - ')}`,`DESCRIPTION:${ev.link||''}`,'END:VEVENT'); }); r.push('END:VCALENDAR'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([r.join('\r\n')], {type:'text/calendar'})); a.download = fn; a.click(); };

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

        if (type === 'Super Fight' || evId.startsWith('flograp') || evId.startsWith('ufc')) {
          isKids = false;
          isAdult = true;
        } else if (type === 'Seminar') { isKids = isKidsWord || Boolean(ev.has_youth) || /\b(all\s*ages|family)\b/.test(evNameLow); isAdult = true; } else if (evId.startsWith('ibjjf')) {
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

        const cleanVenue = /^location(\s*&\s*accommodation)?$/i.test((ev.venue || '').trim()) ? '' : (ev.venue || '');
        return { ...ev, venue: cleanVenue, name: evName, cost: displayCost, type, color, isKidsEvent: isKids, isAdultEvent: isAdult };
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

  const loadPendingEvents = async () => {
    try {
      const snap = await getDocs(collection(db, "pending_events"));
      setPendingEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  };

  const handleLogoClick = () => {
    setClickCount(prev => {
      if (prev + 1 >= 3) {
        setIsAdmin(curr => { if (!curr) loadPendingEvents(); return !curr; });
        return 0;
      }
      return prev + 1;
    });
  };

  const handleApprovePending = async (pev) => {
    try {
      const id = `custom_${Date.now()}`;
      const sd = pev.date && /^\d{4}-\d{2}-\d{2}$/.test(pev.date) ? pev.date : new Date().toISOString().slice(0, 10);
      const evObj = { id, name: pev.name || 'Event', date: pev.date || '', sort_date: sd, location: pev.location || '', venue: pev.venue || '', link: pev.link || '', cost: pev.cost || '', type: pev.type || 'Tournament', color: pev.color || '#ff9f43', isKidsEvent: true, isAdultEvent: true };
      await setDoc(doc(db, "live_events", id), evObj);
      await deleteDoc(doc(db, "pending_events", pev.id));
      setPendingEvents(p => p.filter(x => x.id !== pev.id));
      setEvents(p => [...p, evObj].sort((x, y) => (x.sort_date || '').localeCompare(y.sort_date || '')));
    } catch (e) { alert("Approve error: " + (e.code || e.message)); }
  };

  const handleRejectPending = async (id) => {
    try {
      await deleteDoc(doc(db, "pending_events", id));
      setPendingEvents(p => p.filter(x => x.id !== id));
    } catch (e) { alert("Reject error: " + (e.code || e.message)); }
  };

  useEffect(() => {
    if (!highlightBracketEventId || !events.length) return;
    const timer = setTimeout(() => {
      const el = document.getElementById('ev-card-' + highlightBracketEventId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350);
    return () => clearTimeout(timer);
  }, [highlightBracketEventId, events.length]);

  const anyModalOpen = Boolean(selectedCompetitorEvent || showCalcModal || showReminderModal || showSubmitModal);
  useEffect(() => {
    if (anyModalOpen) {
      if (!window.history.state?.mdModal) window.history.pushState({ mdModal: true }, '');
      const onPop = () => { setSelectedCompetitorEvent(null); setShowCalcModal(false); setShowReminderModal(false); setShowSubmitModal(false); };
      window.addEventListener('popstate', onPop);
      return () => window.removeEventListener('popstate', onPop);
    }
  }, [anyModalOpen]);

  const getMapsUrl = (ev) => {
    const q = [ev.venue, ev.location].filter(Boolean).join(', ') || ev.name || '';
    return /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent || '')
      ? `https://maps.apple.com/?q=${encodeURIComponent(q)}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
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
    setCalcData(prev => {
      let nextBelt = prev.belt;
      const adccTiers = ['Beginner', 'Intermediate', 'Advanced', 'Professional'];
      if (isAdcc && !adccTiers.includes(nextBelt)) {
        if (nextBelt === 'White') nextBelt = 'Beginner';
        else if (['Grey', 'Yellow', 'Blue', 'Purple'].includes(nextBelt)) nextBelt = 'Intermediate';
        else nextBelt = 'Advanced';
      } else if (!isAdcc && adccTiers.includes(nextBelt)) {
        nextBelt = 'White';
      }
      return { ...prev, type: isAdcc ? 'No-Gi' : 'Gi', belt: nextBelt };
    });
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
    const wLbs = calcUnit === 'kg' ? (parseFloat(calcData.weight) * 2.20462).toFixed(1) : calcData.weight;
    const result = calculateWeightClass(federation, parseInt(calcData.age), calcData.gender, wLbs, calcData.belt, isGi);
    setCalcResult(result);
  };

  const handleReminderSubmit = async (e) => {
    e.preventDefault();
    if (!reminderEmail || !selectedReminderEvent) return;
    
    try {
      await addDoc(collection(db, "reminders"), {
        eventId: selectedReminderEvent.id,
        eventName: selectedReminderEvent.name,
        email: reminderEmail, tier: reminderTier, deadline: selectedReminderEvent.deadline || '',
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

  useEffect(() => {
    if (!user) { setUserRole('user'); return; }
    // Clear any legacy test dropdown cache so users never get stuck on Promoter/Academy accidentally
    try { localStorage.removeItem('md_role_' + user.uid); } catch {}
    setUserRole('user');
    const em = (user.email || '').toLowerCase();
    Promise.all([
      getDocs(query(collection(db, 'mat_watches'), where('uid', '==', user.uid))),
      getDocs(query(collection(db, 'mat_watches'), where('kind', '==', 'academy_workspace'))),
      getDocs(query(collection(db, 'mat_watches'), where('kind', '==', 'promoter_workspace')))
    ]).then(([uSnap, acadSnap, promSnap]) => {
      const hasPromWs = promSnap.docs.some(d => d.data().ownerUid === user.uid || (d.data().staffEmails || []).includes(em));
      const hasAcadWs = acadSnap.docs.some(d => d.data().ownerUid === user.uid || (d.data().staffEmails || []).includes(em));
      const rDoc = uSnap.docs.map(d => d.data()).find(x => x.kind === 'user_role');
      if (hasPromWs || rDoc?.explicitSignUpRole === 'promoter') setUserRole('promoter');
      else if (hasAcadWs || rDoc?.explicitSignUpRole === 'academy') setUserRole('academy');
      else setUserRole('user');
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!events || events.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const hubId = params.get('hub');
    if (hubId) {
      const target = events.find(e => e.id === hubId) || UPCOMING_UFC_SUPERFIGHTS.find(e => e.id === hubId);
      if (target) { setPortalSupport(params.get('support') || ''); setPortalEvent(target); }
    }
    try {
      if (!localStorage.getItem('md_seen_tour_v1')) {
        const t = setTimeout(() => {
          try { localStorage.setItem('md_seen_tour_v1', '1'); } catch {}
          setShowSiteTour(true);
        }, 700);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [events]);

  const cycleOrSetRole = async (nextRole) => {
    if (!user) return;
    setUserRole(nextRole);
    try { localStorage.setItem('md_role_' + user.uid, nextRole); } catch {}
    await setDoc(doc(db, 'mat_watches', 'role_' + user.uid), { kind: 'user_role', uid: user.uid, email: (user.email || '').toLowerCase(), role: nextRole, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
  };

  const mergedWithUfcCards = React.useMemo(() => {
    const ids = new Set(events.map(e => e.id));
    const extras = UPCOMING_UFC_SUPERFIGHTS.filter(u => !ids.has(u.id) && !events.some(e => (e.name || "").toLowerCase().includes("ufc bjj 14")));
    return [...events, ...extras].sort((a, b) => (a.sort_date || "2099").localeCompare(b.sort_date || "2099"));
  }, [events]);
  const filteredEvents = React.useMemo(() => mergedWithUfcCards.filter(ev => {
    const evNameLow = ev.name ? ev.name.toLowerCase() : '';
    const evId = ev.id ? ev.id.toLowerCase() : "";
    if (/\b(judo|wrestling|karate|antarctica|taekwondo|kickboxing|muay thai|ping pong|table tennis|sumo)\b/.test(evNameLow)) return false; 

    const searchTarget = `${evNameLow} ${(ev.venue || '').toLowerCase()} ${(ev.address || '').toLowerCase()} ${(ev.location || '').toLowerCase()} ${(ev.date || '').toLowerCase()}`;
    const searchKeywords = deferredHomeSearch.toLowerCase().split(/\s+/).filter(kw => kw.length > 0);
    const matchesSearch = searchKeywords.every(kw => searchTarget.includes(kw));

    const matchesAge = ageFilter === 'All' ? true : ageFilter === 'Kids' ? ev.isKidsEvent : ageFilter === 'Adults' ? ev.isAdultEvent : false;
    const isUfcEv = /\bufc\b/i.test(evId + " " + evNameLow);
    const checkSingleFed = (fKey) => (
      fKey === 'IBJJF' ? evId.startsWith('ibjjf') :
      fKey === 'JJWL' ? evId.startsWith('jjwl') :
      fKey === 'ADCC' ? (evId.includes('adcc') || evNameLow.includes('adcc')) :
      fKey === 'UFC' ? isUfcEv :
      fKey === 'Smoothcomp' ? (evId.startsWith('smoothcomp') && !isUfcEv) :
      fKey === 'Super Fight' ? (ev.type === 'Super Fight' || evId.startsWith('flograp') || evId.startsWith('ufcfightpass') || evId.startsWith('ufcbjj-') || evId.startsWith('one-') || (isUfcEv && !/\bopen\b/i.test(evNameLow))) :
      fKey === 'Seminars' ? (ev.type === 'Seminar' || evId.startsWith('seminar')) : false
    );
    const matchesFed = selectedFeds.length > 0 ? selectedFeds.some(checkSingleFed) : (federationFilter === 'All' ? true : checkSingleFed(federationFilter));
    const matchesMonth = monthFilter === 'All' ? true : (ev.sort_date && ev.sort_date.startsWith(monthFilter));
      
    return matchesSearch && matchesFed && matchesAge && matchesMonth && (!showSavedOnly || savedIds.includes(ev.id));
  }), [mergedWithUfcCards, deferredHomeSearch, ageFilter, selectedFeds, federationFilter, monthFilter, showSavedOnly, savedIds]);

  const calendarEvents = React.useMemo(() => filteredEvents.map(ev => {
    let startDate = new Date();
    if (ev.sort_date) {
      const [y, m, d] = ev.sort_date.split('-');
      startDate = new Date(y, m - 1, d);
    }
    return { title: `${ev.isKidsEvent ? '🐯 ' : ''}${ev.name}`, start: startDate, end: startDate, resource: ev };
  }), [filteredEvents]);

  const isAdccEvent = selectedCalcEvent && (selectedCalcEvent.id.toLowerCase().includes('adcc') || selectedCalcEvent.name.toLowerCase().includes('adcc'));

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: 'sans-serif', position: 'relative' }}>
      
      {showAuthModal && <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onRoleSaved={setUserRole} />}
      {livePushToast && (
        <div style={{ position:'fixed', top:'18px', right:'18px', zIndex:10099, background:'#132a1c', border:'2px solid #2ecc71', borderRadius:'10px', padding:'14px 18px', maxWidth:'calc(100vw - 36px)', boxShadow:'0 10px 30px rgba(0,0,0,0.6)', color:'#fff' }}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:'10px', alignItems:'flex-start' }}>
            <strong style={{ color:'#2ecc71', fontSize:'0.95rem' }}>{livePushToast.title}</strong>
            <button onClick={() => setLivePushToast(null)} style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer' }}>✕</button>
          </div>
          <div style={{ color:'#cbd5e1', fontSize:'0.83rem', marginTop:'4px' }}>{livePushToast.body}</div>
        </div>
      )}
      {showWarRoom && <WeekendWarRoomModal events={events} watches={myWatches} onRemoveWatch={removeMyWatch} onOpenAthlete={(w) => { const ev = events.find(x => x.id === w.eventId); setShowWarRoom(false); if (ev) { setCalcResult(w.athleteName); setSelectedCompetitorEvent(ev); } else if (w.eventLink) { window.open(w.eventLink, '_blank'); } }} onClose={() => {
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('warroom');
          url.searchParams.delete('watch');
          window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);
        } catch {}
        setShowWarRoom(false);
      }} onOpenEvent={(ev) => { setShowWarRoom(false); setSelectedCompetitorEvent(ev); }} />}
      {showWatchedModal && <WatchedAthletesModal watches={myWatches} onRemove={removeMyWatch} onClose={() => setShowWatchedModal(false)} onOpenAthlete={(w) => { const ev = events.find(x => x.id === w.eventId); setShowWatchedModal(false); if (ev) { setCalcResult(w.athleteName); setSelectedCompetitorEvent(ev); } else if (w.eventLink) { window.open(w.eventLink, '_blank'); } }} />}
      {showLeaderboard && <LeaderboardModal onClose={() => {
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('gym');
          url.searchParams.delete('athlete');
          window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);
        } catch {}
        setShowLeaderboard(false);
      }} />}
      {showAthleteSearch && <AthleteSearchModal events={events} onClose={() => setShowAthleteSearch(false)} onOpenBracket={(ev, nm) => { setShowAthleteSearch(false); setCalcResult(nm); setSelectedCompetitorEvent(ev); }} />}
      {showSubmitModal && <SubmitEventModal onClose={() => setShowSubmitModal(false)} />}

      {showReminderModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#111', padding: '20px', boxSizing: 'border-box', borderRadius: '12px', border: '1px solid #444', width: 'calc(100vw - 24px)', maxHeight: '88svh', overflowY: 'auto', maxWidth: '400px' }}>
            <h2 style={{ margin: '0 0 5px 0', fontSize: '1.5rem', color: '#fff' }}>⏰ Set a Reminder</h2>
            <p style={{ margin: '0 0 20px 0', color: '#aaa', fontSize: '0.9rem' }}>We will email you 48 hours before the registration deadline for: <br/><strong style={{color: '#fff'}}>{selectedReminderEvent?.name}</strong></p>
            
            {reminderSubmitted ? (
              <div style={{ padding: '20px', backgroundColor: '#2ecc71', color: '#fff', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold' }}>
                ✅ Reminder Saved!
              </div>
            ) : (
              <form onSubmit={handleReminderSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <select value={reminderTier} onChange={e => setReminderTier(e.target.value)} style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', fontSize: '0.95rem' }}>
                      <option value="early_bird">Alert before Early Bird price jump</option>
                      <option value="normal_tier">Alert before Normal to Late price jump</option>
                      <option value="final_48h">Alert 48h before Final Registration closes</option>
                      <option value="all_tiers">Alert for ALL price jumps & final deadline</option>
                    </select>
                    <input type="email" placeholder="Enter your email address" value={reminderEmail} onChange={e => setReminderEmail(e.target.value)} style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', fontSize: '1rem' }} required />
                    <button type="submit" style={{ padding: '14px', backgroundColor: '#ff9f43', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>Save Price & Deadline Alert</button>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a href={selectedReminderEvent ? getGoogleCalUrl(selectedReminderEvent) : '#'} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: 'center', padding: '9px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: '6px', textDecoration: 'none', fontSize: '0.85rem' }}>+ Google Cal</a>
                      <button type="button" onClick={() => selectedReminderEvent && downloadIcs([selectedReminderEvent], `${selectedReminderEvent.id}.ics`)} style={{ flex: 1, padding: '9px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>+ Apple .ICS</button>
                    </div>
                  </form>
            )}
            <button onClick={() => setShowReminderModal(false)} style={{ marginTop: '20px', padding: '12px', width: '100%', backgroundColor: 'transparent', color: '#aaa', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem' }}>Close</button>
          </div>
        </div>
      )}

      {showCalcModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#111', padding: '20px', boxSizing: 'border-box', borderRadius: '12px', border: '1px solid #444', width: 'calc(100vw - 24px)', maxHeight: '88svh', overflowY: 'auto', maxWidth: '400px' }}>
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
                    {isAdccEvent ? (
                      <>
                        <option value="Beginner">Beginner (White Belt / &lt;2 yrs)</option>
                        <option value="Intermediate">Intermediate (Grey–Yellow / Blue–Purple)</option>
                        <option value="Advanced">Advanced (Orange–Green+ / Brown–Black)</option>
                        <option value="Professional">Professional / Championship (Adults)</option>
                      </>
                    ) : (
                      <>
                        <option value="White">White Belt</option><option value="Grey">Grey Belt</option><option value="Yellow">Yellow Belt</option><option value="Orange">Orange Belt</option><option value="Green">Green Belt</option><option value="Blue">Blue Belt</option><option value="Purple">Purple Belt</option><option value="Brown">Brown Belt</option><option value="Black">Black Belt</option>
                      </>
                    )}
                  </select>
              <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="number" placeholder={calcUnit === 'lbs' ? "Body Weight in LBS" : "Body Weight in KG"} value={calcData.weight} step="0.1" onChange={e => setCalcData({...calcData, weight: e.target.value})} style={{ flex: 1, padding: '12px', borderRadius: '6px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', fontSize: '1rem' }} required />
                      <select value={calcUnit} onChange={e => setCalcUnit(e.target.value)} style={{ width: '88px', padding: '12px', borderRadius: '6px', backgroundColor: '#222', color: '#ff9f43', border: '1px solid #444', fontWeight: 'bold' }}><option value="lbs">LBS</option><option value="kg">KG</option></select>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#9aa4b2', backgroundColor: '#191919', padding: '8px 10px', borderRadius: '6px' }}>
                      {isAdccEvent ? 'ADCC Scale: Weigh-in wearing rashguard & shorts.' : calcData.type === 'Gi' && selectedCalcEvent?.id?.startsWith('ibjjf') ? 'IBJJF Gi Tip: Weigh-in WEARING full Gi & belt (~3-3.8 lbs) right before Match 1.' : selectedCalcEvent?.id?.startsWith('jjwl') ? 'JJWL Tip: 1 lb allowance + No-Gi weigh-in option available.' : 'Check event rules for Gi vs. No-Gi weigh-in allowance.'}
                    </div>
              <button type="submit" style={{ padding: '14px', backgroundColor: '#ff9f43', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>Calculate Division</button>
            </form>
            {calcResult && (
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#222', borderRadius: '6px', textAlign: 'center', border: '1px solid #ff9f43' }}>
                <p style={{ margin: '0 0 10px 0', color: '#aaa', fontSize: '0.9rem' }}>Based on your entry, you should register for:</p>
                <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#ff9f43' }}>{calcResult}</p>
                
                {(selectedCalcEvent.id.startsWith('smoothcomp') || selectedCalcEvent.id.startsWith('ibjjf') || selectedCalcEvent.id.startsWith('jjwl')) && (
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

      {showSiteTour && <GuidedTourModal mode="SITE" onClose={closeSiteTour} />}
      {portalEvent && <EventPortalModal event={portalEvent} user={user} initialSupport={portalSupport} onRequireAuth={() => setShowAuthModal(true)} onOpenQa={() => setSelectedCommentEvent(portalEvent)} onClose={() => { setPortalEvent(null); setPortalSupport(''); }} />}
      {showSponsorKit && <SponsorMediaKitModal eventsCount={mergedWithUfcCards.length} onClose={() => setShowSponsorKit(false)} />}
      {photogEvent && <EventPhotogModal event={photogEvent} onClose={() => setPhotogEvent(null)} onRefreshCounts={refreshPhotogCounts} />}
      {selectedCommentEvent && (
        <VenueIntelModal
          event={selectedCommentEvent}
          user={user}
          isAdmin={isAdmin}
          onRequireAuth={() => setShowAuthModal(true)}
          onClose={() => setSelectedCommentEvent(null)}
          onChanged={() => setTipRefreshTick(t => t + 1)}
        />
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto', minHeight: 'calc(100vh - 120px)' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <button onClick={handleShareMatDatesApp} title="Share MatDates via Text, Contacts, AirDrop or Email" style={{ backgroundColor: sharedAppToast ? '#132a1c' : 'transparent', color: sharedAppToast ? '#4ade80' : '#cbd5e1', padding: '3px 10px', border: sharedAppToast ? '1px solid #22c55e' : '1px solid #334155', borderRadius: '12px', fontSize: '0.73rem', fontWeight: '700', cursor: 'pointer' }}>{sharedAppToast ? '✓ Link Copied!' : '📤 Share'}</button>
            <button onClick={() => setShowSiteTour(true)} title="Take quick spotlight tour" style={{ backgroundColor: 'transparent', color: '#64748b', padding: '3px 9px', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '0.73rem', cursor: 'pointer' }}>❓ Site Guide</button>
          </div>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
  <div onClick={handleLogoClick} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }}>
    <img src="/mat-icon.png" alt="MatDates" style={{ height: '58px', width: '58px', objectFit: 'contain' }} />
    <div style={{ textAlign: "left" }}>
      <h1 style={{ margin: 0, fontSize: "2.8rem", lineHeight: 1, fontWeight: "900", letterSpacing: "1px", textAlign: "left" }}>
        <span style={{ color: '#fff' }}>Mat</span><span style={{ color: '#e31837' }}>Dates</span><span style={{ color: '#e31837', fontSize: '1rem' }}>.com</span>
      </h1>
      <p style={{ color: '#9aa4b2', margin: '4px 0 0 0', fontSize: '0.82rem', letterSpacing: '3px', fontWeight: '600', textTransform: 'uppercase' }}>Every Mat. Every Bracket. Every Podium.</p>
    </div>
  </div>
  <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
    <button data-tour="nav-standings" onClick={() => { trackEvent('standingsOpens'); setShowLeaderboard(true); }} style={{ backgroundColor:'#141820', color:'#f8fafc', padding:'9px 14px', border:'1px solid #475569', borderRadius:'7px', fontWeight:'bold', cursor:'pointer', fontSize:'0.88rem' }}>🏆 Standings</button>
    <button data-tour="nav-lookup" onClick={() => setShowAthleteSearch(true)} style={{ backgroundColor:'#141820', color:'#38bdf8', padding:'9px 14px', border:'1px solid #0284c7', borderRadius:'7px', fontWeight:'bold', cursor:'pointer', fontSize:'0.88rem' }}>🔍 Athlete &amp; Academy Lookup</button>
    <button data-tour="nav-warroom" onClick={() => setShowWarRoom(true)} style={{ backgroundColor: myWatches.length > 0 ? '#132a1c' : '#141820', color: myWatches.length > 0 ? '#4ade80' : '#cbd5e1', padding:'9px 14px', border: myWatches.length > 0 ? '1px solid #2ecc71' : '1px solid #334155', borderRadius:'7px', fontWeight:'bold', cursor:'pointer', fontSize:'0.88rem' }}>🔥 War Room{myWatches.length > 0 ? ` (${myWatches.length})` : ''}</button>
    <button onClick={() => setShowSubmitModal(true)} style={{ backgroundColor:'#ff9f43', color:'#000', padding:'9px 14px', border:'none', borderRadius:'7px', fontWeight:'800', cursor:'pointer', fontSize:'0.88rem' }}>+ Submit</button>
    <button onClick={() => user ? signOut(auth) : setShowAuthModal(true)} style={{ backgroundColor:'transparent', color:'#94a3b8', padding:'8px 10px', border:'1px solid #262f3d', borderRadius:'7px', cursor:'pointer', fontSize:'0.8rem' }}>{user ? 'Sign Out' : 'Sign In'}</button>
  </div>
</header>
        <SponsorBanner onOpenMediaKit={() => setShowSponsorKit(true)} />
        {user && <AcademyProSuite user={user} isAdmin={isAdmin} isHomepage={true} staffOnlyIfNotAcademyRole={userRole !== 'academy'} onRequireAuth={() => setShowAuthModal(true)} />}
        {user && userRole === 'promoter' && <PromoterHomeDashboard events={mergedWithUfcCards} user={user} />}
        <AnalyticsAndPwaManager />
{isAdmin && (
  <div style={{ backgroundColor: '#161616', border: '1px solid #ff9f43', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
      <strong style={{ color: '#ff9f43' }}>Admin Review Queue ({pendingEvents.length} Pending)</strong>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={loadPendingEvents} style={{ backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer' }}>Refresh</button>
        <button onClick={() => setIsAdmin(false)} style={{ backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer' }}>Close</button>
      </div>
    </div>
    {pendingEvents.length === 0 ? <p style={{ margin: 0, color: '#aaa' }}>No pending submissions.</p> : pendingEvents.map(pev => (
      <div key={pev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#222', padding: '10px', borderRadius: '6px', marginTop: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <div><strong style={{ color: '#fff' }}>{pev.name}</strong> <span style={{ color: '#aaa', fontSize: '0.85rem' }}>({pev.date} - {pev.location})</span> {pev.link && <a href={pev.link} target="_blank" rel="noreferrer" style={{ color: '#3498db', marginLeft: '6px' }}>Link</a>}</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => handleApprovePending(pev)} style={{ backgroundColor: '#2ecc71', color: '#000', border: 'none', borderRadius: '4px', padding: '5px 10px', fontWeight: 'bold', cursor: 'pointer' }}>Approve</button>
          <button onClick={() => handleRejectPending(pev.id)} style={{ backgroundColor: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', padding: '5px 10px', fontWeight: 'bold', cursor: 'pointer' }}>Reject</button>
        </div>
      </div>
    ))}
  </div>
)}

        <div className="md-sticky-filters">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
          <div className="md-filter-pills" style={{ display: 'flex', gap: '10px', fontSize: '0.9rem', flexWrap: 'wrap', alignItems: 'center', userSelect: 'none' }}>
            <span onClick={() => { if (!user) { setShowAuthModal(true); return; } setShowSavedOnly(p => !p); }} style={{ cursor: 'pointer', padding: '4px 10px', backgroundColor: showSavedOnly ? '#ff9f43' : '#1a1a1a', color: showSavedOnly ? '#000' : '#ff9f43', fontWeight: 'bold', borderRadius: '6px', border: '1px solid #ff9f43' }}>★ My Schedule ({savedIds.length})</span>{showSavedOnly && savedIds.length > 0 && <button onClick={() => downloadIcs(events.filter(x => savedIds.includes(x.id)), 'my-bjj-season.ics')} style={{ marginLeft: '6px', cursor: 'pointer', padding: '4px 10px', backgroundColor: '#222', color: '#2ecc71', border: '1px solid #2ecc71', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.82rem' }}>Export .ICS</button>}
          </div>
          
          <div style={{ display: 'flex', gap: '0' }}>
            <button onClick={() => setViewMode('list')} style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: viewMode === 'list' ? '#333' : '#111', color: '#fff', border: '1px solid #444', borderRadius: '4px 0 0 4px' }}>List</button>
            <button onClick={() => setViewMode('grid')} style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: viewMode === 'grid' ? '#333' : '#111', color: '#fff', borderTop: '1px solid #444', borderBottom: '1px solid #444', borderLeft: 'none', borderRight: 'none' }}>Grid</button>
            <button onClick={() => setViewMode('calendar')} style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: viewMode === 'calendar' ? '#333' : '#111', color: '#fff', border: '1px solid #444', borderRadius: '0 4px 4px 0' }}>Calendar</button>
          </div>
        </div>

        <div data-tour="filter-bar" style={{ backgroundColor:'#12161f', border:'1px solid #232b3a', borderRadius:'10px', padding:'11px 13px', marginBottom:'14px', textAlign:'left' }}>
          <div style={{ color:'#94a3b8', fontSize:'0.7rem', fontWeight:'800', letterSpacing:'1.6px', textTransform:'uppercase', marginBottom:'7px' }}>Filter Events</div>
          <div className="md-filter-inputs" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <input type="text" placeholder="Search events or locations..." value={homeSearchInput} onChange={(e) => setHomeSearchInput(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 35px 12px 12px', borderRadius: '5px', border: '1px solid #333', backgroundColor: '#111', color: '#fff', fontSize: '1rem' }} />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#aaa', fontSize: '1.2rem', cursor: 'pointer', padding: '0 5px' }}>
                &times;
              </button>
            )}
          </div>
          
          <MultiCategoryDropdown selected={selectedFeds} onChange={setSelectedFeds} />
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
        </div>
        </div>

        {showSavedOnly && user && (<div style={{ backgroundColor:'#141820', border:'1px solid #3155', borderRadius:'8px', padding:'12px 16px', marginBottom:'18px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'10px' }}><span style={{ color:'#e2e8f0', fontSize:'0.92rem' }}>Showing <strong>{savedIds.length}</strong> saved tournaments in your personal schedule ({user.email}).</span>{savedIds.length > 0 && <button onClick={() => downloadIcs(events.filter(x => savedIds.includes(x.id)), 'my-matdates-schedule.ics')} style={{ backgroundColor:'#1e293b', color:'#38bdf8', border:'1px solid #38bdf8', borderRadius:'6px', padding:'7px 12px', fontWeight:'bold', cursor:'pointer', fontSize:'0.85rem' }}>📅 Add My {savedIds.length} Saved Events to Phone Calendar</button>}</div>)}
          {viewMode === 'calendar' ? (
          <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', color: '#000' }}>
            <Calendar localizer={localizer} events={calendarEvents} startAccessor="start" endAccessor="end" style={{ height: 750 }} date={calendarDate} onNavigate={setCalendarDate} view={calendarView} onView={setCalendarView} views={['month', 'week', 'agenda']} onSelectEvent={(event) => { if(event.resource.link) window.open(event.resource.link, '_blank'); }} />
          </div>
        ) : (
          <div style={{ display: viewMode === 'grid' ? 'grid' : 'flex', flexDirection: viewMode === 'list' ? 'column' : 'row', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : 'none', gap: '20px' }}>
            {filteredEvents.slice(0, visibleLimit).map((ev, evIdx) => {
              const isJJWL = ev.id && ev.id.toLowerCase().startsWith('jjwl');
              const isADCC = (ev.id && ev.id.toLowerCase().includes('adcc')) || (ev.name && ev.name.toLowerCase().includes('adcc'));
              const isUFC = /\bufc\b/i.test((ev.id || '') + ' ' + (ev.name || ''));
              
              const isStreamOnly = Boolean(ev.id && (ev.id.toLowerCase().startsWith('flograp') || ev.id.toLowerCase().startsWith('ufc') || ev.id.toLowerCase().startsWith('one-') || ev.id.toLowerCase().includes('fightpass'))) || /subscription|fight pass|flograppling|prime video|onefc|ppv/i.test(ev.cost || '');
              const extLink = resolveEventUrl(ev);
              const streamUrl = resolveEventUrl({ ...ev, link: ev.stream_link || (isStreamOnly ? ev.link : '') });
              const evBorderColor = isUFC ? '#d20a0a' : isADCC ? '#F1C40F' : (ev.type === 'Super Fight' || isStreamOnly) ? '#14b8a6' : (isJJWL ? '#ffffff' : (ev.color || '#ff9f43'));
              
              return (
                <div id={`ev-card-${ev.id}`} key={ev.id} data-tour={evIdx === 0 ? 'first-card' : undefined} style={{ backgroundColor: '#111', borderLeft: `5px solid ${evBorderColor}`, padding: '20px', borderRadius: '4px', display: 'flex', flexDirection: 'column' }}>
                  {(() => { const dbadge = getDeadlineBadge(ev); return dbadge ? <div style={{ background: dbadge.bg, color: dbadge.color, border: "1px solid " + dbadge.border, borderRadius: "5px", padding: "4px 9px", fontSize: "0.73rem", fontWeight: "800", marginBottom: "8px", textAlign: "left" }}>{dbadge.text}</div> : null; })()}
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}><span>{ev.name} {ev.isKidsEvent && <span>🐯</span>}</span><button onClick={() => toggleSaveEvent(ev.id)} title="Save to My Schedule" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.35rem', lineHeight: 1, color: savedIds.includes(ev.id) ? '#ff9f43' : '#555', padding: 0 }}>{savedIds.includes(ev.id) ? '★' : '☆'}</button></h3>
                  {(() => { const gt = getEventGiTags(ev); return (
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
                      {gt.gi && <span style={{ background: "#172033", color: "#93c5fd", border: "1px solid #1d4ed8", borderRadius: "4px", padding: "2px 7px", fontSize: "0.71rem", fontWeight: "bold" }}>🥋 Gi</span>}
                      {gt.nogi && <span style={{ background: "#271b0c", color: "#fcd34d", border: "1px solid #b45309", borderRadius: "4px", padding: "2px 7px", fontSize: "0.71rem", fontWeight: "bold" }}>⚡ No-Gi</span>}
                    </div>
                  ); })()}
                  <div style={{ flexGrow: 1, color: '#aaa', fontSize: '0.95rem', lineHeight: '1.6', margin: '8px 0' }}>
                    <div style={{ marginBottom: '2px' }}>📅 {ev.date}</div><div style={{ marginBottom: '4px' }}>{isStreamOnly || /live stream/i.test(ev.location || '') ? <span>📡 {ev.location || 'Live Stream'}</span> : <a href={getMapsUrl(ev)} target="_blank" rel="noreferrer" title="Open in Maps" style={{ color: '#ddd', textDecoration: 'none' }}>📍 <span style={{ borderBottom: '1px dashed #666' }}>{formatEventLoc(ev)}</span><span style={{ whiteSpace: 'nowrap', color: '#94a3b8', fontSize: '0.85em' }}>{'\u00A0↗'}</span></a>}</div>
                    {ev.cost && (
                      <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>
                        {isStreamOnly
                          ? ((streamUrl || extLink) ? (
                            <a
                              href={streamUrl || extLink}
                              target="_blank"
                              rel="noreferrer"
                              title="Watch Live Broadcast"
                              style={{ color: '#2ecc71', fontWeight: 'bold', textDecoration: 'none', borderBottom: '1px dashed #2ecc71', cursor: 'pointer' }}
                            >
                              📺 Stream: {ev.cost.replace(/^Watch on\s+/i, '')}{'\u00A0↗'}
                            </a>
                          ) : `📺 Stream: ${ev.cost.replace(/^Watch on\s+/i, '')}`)
                          : ev.type === 'Super Fight'
                            ? (/admission|spectator|ticket|free/i.test(ev.cost)
                                ? `🎟️ Spectator: ${ev.cost}`
                                : `🥋 Match Entry: ${ev.cost}`)
                            : ev.type === 'Seminar'
                              ? `🎟️ Seminar Fee: ${ev.cost}`
                              : `💳 Entry: ${ev.cost}`}
                      </span>
                    )}
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
                    {(ev.type === 'Super Fight' || isStreamOnly || ev.autoApproved) && (
                      <button onClick={() => { trackEvent('eventHubOpens'); setPortalEvent(ev); }} title="Official Competitor Info, Virtual Weigh-In, Corner Passes & VIP Tables" style={{ flex: 1, backgroundColor: '#112226', color: '#5eead4', border: '1px solid #14b8a6', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', minWidth: '135px' }}>
                        🎟️ Event Hub & Tickets
                      </button>
                    )}

                    {!isStreamOnly && ev.type !== 'Seminar' && (
                      <button 
                        onClick={() => {
                          trackEvent('bracketOpens');
                          if (highlightBracketEventId === ev.id) {
                            setHighlightBracketEventId('');
                            try {
                              const u = new URL(window.location.href);
                              u.searchParams.delete('event');
                              window.history.replaceState({}, '', u.pathname + (u.search ? u.search : '') + u.hash);
                            } catch {}
                          }
                          setCalcResult(''); 
                          setSelectedCompetitorEvent(ev);
                        }} 
                        style={{
                          flex: 1,
                          backgroundColor: highlightBracketEventId === ev.id ? '#132a1c' : '#1a1a1a',
                          color: highlightBracketEventId === ev.id ? '#4ade80' : '#ff9f43',
                          border: highlightBracketEventId === ev.id ? '2px solid #2ecc71' : '1px solid #ff9f43',
                          boxShadow: highlightBracketEventId === ev.id ? '0 0 16px rgba(46,204,113,0.45)' : 'none',
                          padding: '8px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          minWidth: '120px'
                        }}
                      >
                        {highlightBracketEventId === ev.id ? '👥 Brackets (Updated! ●)' : '👥 Brackets'}
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
                    </button> <button onClick={() => downloadIcs([ev], `${ev.id}.ics`)} title="Add to Calendar (.ics)" style={{ backgroundColor: '#222', color: '#ccc', border: '1px solid #444', padding: '8px 10px', borderRadius: '4px', cursor: 'pointer' }}>+ Cal</button> {(() => { const tc = getTipCount(ev); return (<button onClick={() => setSelectedCommentEvent(ev)} title="Venue & Event Intel" style={{ backgroundColor: tc > 0 ? '#162536' : '#222', color: tc > 0 ? '#38bdf8' : '#ccc', border: tc > 0 ? '1px solid #0284c7' : '1px solid #444', padding: '8px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: tc > 0 ? 'bold' : 'normal', whiteSpace: 'nowrap' }}>💬 Tips{tc > 0 ? ` (${tc})` : ''}</button>); })()} {!isStreamOnly && (() => { const pCnt = getTotalPhotogCount(ev, photogCounts); return (<button onClick={() => setPhotogEvent(ev)} title="Book or list event photography & highlight reels" style={{ backgroundColor: pCnt ? '#14261c' : '#222', color: pCnt ? '#4ade80' : '#38bdf8', border: pCnt ? '1px solid #22c55e' : '1px solid #0284c7', padding: '8px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}>📸 Photogs{pCnt ? ` (${pCnt})` : ''}</button>); })()}

                    {!isStreamOnly && extLink && (
                      <a href={extLink} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: 'center', color: '#fff', textDecoration: 'none', backgroundColor: '#333', padding: '8px 12px', borderRadius: '4px', fontWeight: 'bold', minWidth: '120px' }}>
                        {ev.type === 'Super Fight' ? (/flograppling|ufc|onefc|youtube/i.test(extLink) ? '📺 Card & Stream' : '🥋 Event Info') : '🎟️ Register'}
                      </a>
                    )}
                    {streamUrl ? (
                      <a href={streamUrl} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: 'center', color: evBorderColor, textDecoration: 'none', backgroundColor: '#1a1a1a', border: `1px solid ${evBorderColor}`, padding: '8px 12px', borderRadius: '4px', fontWeight: 'bold', minWidth: '120px' }}>
                        📺 Watch
                      </a>
                    ) : null}
                  </div>
                </div>
              )
            })}
            {filteredEvents.length > visibleLimit && (
              <div style={{ textAlign: 'center', margin: '16px 0 8px' }}>
                <button
                  type="button"
                  onClick={() => setVisibleLimit(v => v + 60)}
                  style={{ background: '#172234', color: '#38bdf8', border: '1.5px solid #0284c7', borderRadius: '8px', padding: '11px 22px', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer' }}
                >
                  ▼ Show More Events ({filteredEvents.length - visibleLimit} more matching)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <footer style={{ marginTop: '50px', padding: '30px 20px', borderTop: '1px solid #333', textAlign: 'center', backgroundColor: '#0a0a0a', color: '#777', fontSize: '0.85rem', lineHeight: '1.6' }}>
        <div style={{ marginBottom: '15px' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', display: 'inline-flex', alignItems: 'center', gap: '8px' }}><img src="/mat-icon.png" alt="" style={{ height: '28px', width: '28px', objectFit: 'contain' }} /><span style={{ color: '#fff' }}>Mat</span><span style={{ color: '#e31837' }}>Dates</span></h2>
        </div>
        <p style={{ maxWidth: '800px', margin: '0 auto 15px auto' }}>
          MatDates is an independent BJJ event aggregator built for the community. We are not affiliated with, officially endorsed by, or sponsored by IBJJF, ADCC, Smoothcomp, Jiu Jitsu World League, or any listed federations. All trademarks and event data belong to their respective owners.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => { trackEvent('sponsorKitOpens'); setShowSponsorKit(true); }} style={{ background: 'none', border: 'none', padding: 0, color: '#fbbf24', fontWeight: '800', fontSize: '0.88rem', cursor: 'pointer', textDecoration: 'underline' }}>🤝 Partner / Sponsor MatDates (Live Media Kit)</button>
          <span>|</span>
          <span style={{ color: '#777' }}>Privacy Policy</span>
          <span>|</span>
          <span>© {new Date().getFullYear()} MatDates. All Rights Reserved.</span>
        </div>
      </footer>
    </div>
  );
}
class MatDatesSafeBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (this.state.err) {
      return (
        <div style={{ minHeight:'100vh', background:'#0b0e14', color:'#fff', padding:'32px', textAlign:'center', fontFamily:'sans-serif' }}>
          <h2 style={{ color:'#ff9f43' }}>MatDates Quick Reload Needed</h2>
          <p style={{ color:'#94a3b8', fontSize:'0.9rem' }}>{String(this.state.err?.message || this.state.err)}</p>
          <button onClick={() => window.location.reload()} style={{ padding:'10px 18px', background:'#e31837', color:'#fff', border:'none', borderRadius:'7px', fontWeight:'bold', cursor:'pointer' }}>Reload MatDates</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function SafeApp(props) { return <MatDatesSafeBoundary><App {...props} /></MatDatesSafeBoundary>; }
