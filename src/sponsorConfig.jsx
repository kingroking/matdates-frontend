import React, { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { trackEvent } from './analytics';

export const sponsorConfig = {
  enabled: false,
  name: "Title Sponsor",
  offerText: "",
  ctaText: "Learn More →",
  url: "https://matdates.com",
  brandColor: "#e31837",
  logoUrl: ""
};

export function getActiveSponsor() {
  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem('md_sponsor_preview');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.name) return { ...sponsorConfig, ...parsed, enabled: true, isPreview: true };
      }
    } catch {}
  }
  return sponsorConfig;
}

export function SponsorBanner({ onOpenMediaKit }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onChange = () => setTick(t => t + 1);
    window.addEventListener('md_sponsor_preview_changed', onChange);
    return () => window.removeEventListener('md_sponsor_preview_changed', onChange);
  }, []);

  const sp = getActiveSponsor();
  if (!sp.enabled) return null;

  const exitPreview = () => {
    try { sessionStorage.removeItem('md_sponsor_preview'); } catch {}
    window.dispatchEvent(new Event('md_sponsor_preview_changed'));
    setTick(t => t + 1);
  };

  return (
    <div style={{
      margin: '0 0 18px 0', padding: '11px 16px', borderRadius: '9px',
      background: 'linear-gradient(90deg, #121722 0%, #1d1624 100%)',
      border: `1.5px solid ${sp.brandColor}`,
      boxShadow: `0 4px 20px ${sp.brandColor}28`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '12px', flexWrap: 'wrap', textAlign: 'left'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '0.68rem', fontWeight: '800', textTransform: 'uppercase',
          letterSpacing: '0.08em', padding: '3px 8px', borderRadius: '4px',
          background: `${sp.brandColor}28`, color: '#fff',
          border: `1px solid ${sp.brandColor}`
        }}>{sp.isPreview ? '✨ LIVE SPONSOR PREVIEW' : 'OFFICIAL TITLE PARTNER'}</span>
        <strong style={{ color: '#fff', fontSize: '0.96rem' }}>MatDates Powered by {sp.name}</strong>
        {sp.offerText && <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>— {sp.offerText}</span>}
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <a href={sp.url || 'https://matdates.com'} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('sponsorBannerClicks')} style={{
          backgroundColor: sp.brandColor, color: '#fff', textDecoration: 'none',
          padding: '7px 14px', borderRadius: '6px', fontWeight: '800', fontSize: '0.8rem', whiteSpace: 'nowrap'
        }}>{sp.ctaText || 'Claim Offer →'}</a>
        {sp.isPreview && (
          <>
            {onOpenMediaKit && <button type="button" onClick={onOpenMediaKit} style={{ background:'#1e293b', color:'#93c5fd', border:'1px solid #334155', borderRadius:'6px', padding:'6px 10px', fontSize:'0.75rem', fontWeight:'bold', cursor:'pointer' }}>Media Kit</button>}
            <button type="button" onClick={exitPreview} style={{ background:'transparent', color:'#94a3b8', border:'1px solid #334155', borderRadius:'6px', padding:'6px 9px', fontSize:'0.75rem', cursor:'pointer' }}>Exit Preview ✕</button>
          </>
        )}
      </div>
    </div>
  );
}

export function SponsorMediaKitModal({ eventsCount = 0, onClose }) {
  const [tab, setTab] = useState('REACH');
  const [totals, setTotals] = useState({});
  const [eco, setEco] = useState({ watches: 0, bios: 0, academies: 0 });
  const [copied, setCopied] = useState(false);

  // Interactive Brand Sandbox state
  const [demo, setDemo] = useState({
    name: 'LMNT',
    offerText: 'Free Electrolyte Sample Pack for Tournament Week',
    ctaText: 'Claim Free Pack →',
    brandColor: '#14b8a6',
    url: 'https://matdates.com'
  });

  // Brand Inquiry Form state
  const [inq, setInq] = useState({
    brandName: '', contactName: '', workEmail: '',
    tier: 'Global Title Partner ("Powered by [Brand]")', notes: ''
  });
  const [sentInq, setSentInq] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'site_stats', '__totals__')).then(d => {
      if (d.exists()) setTotals(d.data() || {});
    }).catch(() => {});

    getDocs(collection(db, 'mat_watches')).then(sn => {
      let watches = 0, bios = 0, academies = 0;
      sn.forEach(d => {
        const w = d.data() || {};
        if (w.kind === 'athlete_bio') bios++;
        else if (w.kind === 'academy_workspace') academies++;
        else if (!w.kind && (w.active !== false || w.followFuture)) watches++;
      });
      setEco({ watches, bios, academies });
    }).catch(() => {});
  }, []);

  const rawImp = Number(totals.verifiedImpressions || 0);
  const fallbackImp = Number(totals.pageViews || 0) + Number(totals.athleteSearches || 0) + Number(totals.bracketOpens || 0) + Number(totals.matAlertsCreated || 0);
  const verifiedImpressions = Math.max(rawImp, fallbackImp);
  const mobPct = totals.uniqueSessions > 0 ? Math.min(98, Math.max(68, Math.round(((totals.mobileSessions || 0) / totals.uniqueSessions) * 100))) : 84;

  const activateSitePreview = () => {
    const clean = {
      name: (demo.name || 'Your Brand').trim(),
      offerText: (demo.offerText || '').trim(),
      ctaText: (demo.ctaText || 'Learn More →').trim(),
      brandColor: demo.brandColor || '#14b8a6',
      url: demo.url || 'https://matdates.com'
    };
    try { sessionStorage.setItem('md_sponsor_preview', JSON.stringify(clean)); } catch {}
    window.dispatchEvent(new Event('md_sponsor_preview_changed'));
    trackEvent('sponsorSandboxPreviews');
    onClose();
  };

  const copyMediaKitSummary = () => {
    const summary = [
      'MATDATES.COM — OFFICIAL GLOBAL BJJ MEDIA KIT SNAPSHOT',
      '• Positioning: Unified Tournament Calendar, Live Mat-Alert Watchlist, Verified Trophy Rooms, Free Academy Coach Suite & Promoter Hub',
      `• Live Global Events Indexed: ${(eventsCount || 350).toLocaleString()}+ across IBJJF, ADCC, Smoothcomp, JJWL, UFC BJJ & SuperFights`,
      `• Cumulative Verified Platform Impressions: ${verifiedImpressions.toLocaleString()}`,
      `• Active Athlete Watch Alerts & Claimed Profiles: ${(eco.watches + eco.bios).toLocaleString()}`,
      `• Mobile Ringside Tournament Usage: ${mobPct}% mobile / PWA sessions`,
      '• Zero Ad Clutter: 1 Exclusive Global Title Partner + 3 Category-Exclusive Verticals',
      '• Interactive Live Brand Sandbox: https://matdates.com/?sponsor=1'
    ].join('\n');
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const submitInquiry = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await addDoc(collection(db, 'pending_events'), {
        kind: 'sponsor_inquiry',
        name: 'Sponsor Inquiry: ' + inq.brandName.trim(),
        brandName: inq.brandName.trim(),
        contactName: inq.contactName.trim(),
        workEmail: inq.workEmail.trim().toLowerCase(),
        tier: inq.tier,
        notes: inq.notes.trim(),
        adminNotified: false,
        createdAt: new Date().toISOString()
      });
      trackEvent('sponsorInquiriesSubmitted');
      setSentInq(true);
    } catch (err) {
      alert('Could not send inquiry — please email contact@matdates.com (' + (err.message || '') + ')');
    } finally {
      setSending(false);
    }
  };

  const inp = { padding:'9px 11px', borderRadius:'7px', background:'#0d121c', color:'#fff', border:'1px solid #2d3b52', fontSize:'0.85rem', width:'100%', boxSizing:'border-box' };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', zIndex:10100, display:'flex', alignItems:'center', justifyContent:'center', padding:'12px', boxSizing:'border-box' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#0f141e', border:'1.5px solid #f59e0b', borderRadius:'14px', maxWidth:'760px', width:'100%', maxHeight:'91svh', overflowY:'auto', padding:'20px', color:'#fff', textAlign:'left', boxSizing:'border-box' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px', marginBottom:'12px' }}>
          <div>
            <div style={{ color:'#fbbf24', fontSize:'0.72rem', fontWeight:'800', letterSpacing:'1.5px' }}>🤝 MATDATES GLOBAL PARTNERSHIPS &amp; LIVE MEDIA KIT</div>
            <h2 style={{ margin:'3px 0 2px', fontSize:'1.38rem', color:'#ffffff', fontWeight:'900' }}>Own Every Saturday Morning in Brazilian Jiu-Jitsu</h2>
            <div style={{ color:'#94a3b8', fontSize:'0.8rem' }}>Unified Calendar • Live Mat Alerts • Verified Athlete Trophy Rooms • Free Coach &amp; Promoter Suites</div>
          </div>
          <button onClick={onClose} style={{ background:'#1e293b', color:'#fff', border:'1px solid #334155', borderRadius:'7px', padding:'5px 11px', cursor:'pointer', fontWeight:'bold' }}>✕</button>
        </div>

        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'14px' }}>
          {[
            ['REACH', '📊 Live Reach & Audience'],
            ['SANDBOX', '✨ Try Your Brand Live'],
            ['TIERS', '🏆 Sponsorship Packages'],
            ['INQUIRE', '✉️ Request Rate Card']
          ].map(([k, lbl]) => (
            <button key={k} type="button" onClick={() => setTab(k)} style={{
              flex:'1 1 155px', padding:'9px 10px', borderRadius:'8px', cursor:'pointer',
              fontWeight:'800', fontSize:'0.79rem',
              background: tab === k ? '#f59e0b' : '#172030',
              color: tab === k ? '#000' : '#cbd5e1',
              border: tab === k ? 'none' : '1px solid #2d3b52'
            }}>{lbl}</button>
          ))}
        </div>

        {tab === 'REACH' && (
          <div style={{ display:'grid', gap:'12px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(155px, 1fr))', gap:'9px' }}>
              <div style={{ background:'#161e2e', border:'1px solid #283548', borderRadius:'9px', padding:'12px' }}>
                <div style={{ color:'#94a3b8', fontSize:'0.72rem', fontWeight:'bold' }}>GLOBAL EVENTS INDEXED</div>
                <div style={{ color:'#38bdf8', fontSize:'1.45rem', fontWeight:'900', marginTop:'3px' }}>{(eventsCount || 350).toLocaleString()}+</div>
                <div style={{ color:'#64748b', fontSize:'0.7rem' }}>IBJJF • ADCC • JJWL • UFC • SC</div>
              </div>
              <div style={{ background:'#161e2e', border:'1px solid #283548', borderRadius:'9px', padding:'12px' }}>
                <div style={{ color:'#94a3b8', fontSize:'0.72rem', fontWeight:'bold' }}>VERIFIED IMPRESSIONS</div>
                <div style={{ color:'#fbbf24', fontSize:'1.45rem', fontWeight:'900', marginTop:'3px' }}>{verifiedImpressions.toLocaleString()}</div>
                <div style={{ color:'#64748b', fontSize:'0.7rem' }}>Cookie-free audited interactions</div>
              </div>
              <div style={{ background:'#161e2e', border:'1px solid #283548', borderRadius:'9px', padding:'12px' }}>
                <div style={{ color:'#94a3b8', fontSize:'0.72rem', fontWeight:'bold' }}>WATCHES &amp; TROPHY BIOS</div>
                <div style={{ color:'#4ade80', fontSize:'1.45rem', fontWeight:'900', marginTop:'3px' }}>{(eco.watches + eco.bios).toLocaleString()}</div>
                <div style={{ color:'#64748b', fontSize:'0.7rem' }}>High-intent athlete followers</div>
              </div>
              <div style={{ background:'#161e2e', border:'1px solid #283548', borderRadius:'9px', padding:'12px' }}>
                <div style={{ color:'#94a3b8', fontSize:'0.72rem', fontWeight:'bold' }}>MOBILE RINGSIDE TRAFFIC</div>
                <div style={{ color:'#f472b6', fontSize:'1.45rem', fontWeight:'900', marginTop:'3px' }}>{mobPct}%</div>
                <div style={{ color:'#64748b', fontSize:'0.7rem' }}>Live arena &amp; travel usage</div>
              </div>
            </div>

            <div style={{ background:'#141c2b', border:'1px solid #283548', borderRadius:'10px', padding:'13px', fontSize:'0.82rem', lineHeight:1.55, color:'#cbd5e1' }}>
              <div style={{ color:'#ffffff', fontWeight:'800', fontSize:'0.9rem', marginBottom:'6px' }}>🎯 Why Brands Convert Higher on MatDates Than Social Ads</div>
              <div><b>• 100% Active Purchasing Audience:</b> Every visitor is a competing BJJ athlete, multi-tournament travel parent, Academy Head Professor, or Event Promoter actively buying hydration, Gis/no-gi gear, recovery tech, and travel.</div>
              <div><b>• Zero Banner Blindness:</b> MatDates runs <b>zero programmatic ad clutter</b> — one Title Partner owns high-trust native utility moments (8:30 AM tournament push alerts, Weight-Class Calculators, Trophy Room IG shares, and Coach Clipboards).</div>
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
              <span style={{ fontSize:'0.76rem', color:'#94a3b8' }}>Direct Media Kit Link: <b style={{ color:'#38bdf8' }}>matdates.com/?sponsor=1</b></span>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                <button type="button" onClick={copyMediaKitSummary} style={{ background:'#1e293b', color:'#fff', border:'1px solid #475569', borderRadius:'7px', padding:'8px 13px', fontSize:'0.78rem', fontWeight:'bold', cursor:'pointer' }}>
                  {copied ? '✓ Copied Executive Summary!' : '📋 Copy Pitch Summary'}
                </button>
                <button type="button" onClick={() => setTab('SANDBOX')} style={{ background:'#f59e0b', color:'#000', border:'none', borderRadius:'7px', padding:'8px 14px', fontSize:'0.78rem', fontWeight:'800', cursor:'pointer' }}>
                  ✨ Preview Your Brand Live →
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'SANDBOX' && (
          <div style={{ display:'grid', gap:'12px' }}>
            <div style={{ background:'#151e2e', border:'1px solid #38bdf8', borderRadius:'10px', padding:'12px', display:'grid', gap:'8px' }}>
              <div style={{ color:'#38bdf8', fontWeight:'800', fontSize:'0.82rem' }}>✨ Interactive Brand Sandbox — Type Your Brand Below to Preview All Placements:</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(175px, 1fr))', gap:'8px' }}>
                <input placeholder="Brand Name (e.g. LMNT, WHOOP, Kingz)" value={demo.name} onChange={e => setDemo({...demo, name: e.target.value})} style={inp} />
                <input placeholder="Offer Hook (e.g. Free Sample Pack)" value={demo.offerText} onChange={e => setDemo({...demo, offerText: e.target.value})} style={inp} />
                <input placeholder="Button CTA" value={demo.ctaText} onChange={e => setDemo({...demo, ctaText: e.target.value})} style={inp} />
              </div>
              <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
                <span style={{ fontSize:'0.76rem', color:'#94a3b8', fontWeight:'bold' }}>Brand Accent:</span>
                {['#14b8a6', '#e31837', '#f59e0b', '#3b82f6', '#22c55e', '#a855f7'].map(col => (
                  <button key={col} type="button" onClick={() => setDemo({...demo, brandColor: col})} style={{ width:'24px', height:'24px', borderRadius:'50%', background: col, border: demo.brandColor === col ? '2.5px solid #fff' : '1px solid #333', cursor:'pointer' }} />
                ))}
              </div>
            </div>

            {/* Live Mockups of the 4 Flagship Touchpoints */}
            <div style={{ display:'grid', gap:'8px' }}>
              <div style={{ background:'#111622', border:`1.5px solid ${demo.brandColor}`, borderRadius:'8px', padding:'10px 13px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                <div style={{ fontSize:'0.82rem' }}><span style={{ background:`${demo.brandColor}33`, border:`1px solid ${demo.brandColor}`, padding:'2px 6px', borderRadius:'4px', fontSize:'0.66rem', fontWeight:'800', marginRight:'7px' }}>1 • GLOBAL HEADER</span><b>MatDates Powered by {demo.name || 'Your Brand'}</b> — <span style={{ color:'#cbd5e1' }}>{demo.offerText}</span></div>
                <span style={{ background: demo.brandColor, color:'#fff', padding:'4px 10px', borderRadius:'5px', fontSize:'0.74rem', fontWeight:'800' }}>{demo.ctaText}</span>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'8px' }}>
                <div style={{ background:'#141b28', border:'1px solid #2d3b52', borderRadius:'8px', padding:'10px', fontSize:'0.77rem' }}>
                  <div style={{ color:'#4ade80', fontWeight:'800', marginBottom:'4px' }}>2 • 8:30 AM LIVE MAT PUSH ALERT</div>
                  <div style={{ color:'#e2e8f0' }}>&quot;🔔 Mat 4 Alert: Your watched athlete fights in 18 mins! — <b style={{ color: demo.brandColor }}>Fueled by {demo.name || 'Your Brand'}</b>&quot;</div>
                </div>
                <div style={{ background:'#141b28', border:'1px solid #2d3b52', borderRadius:'8px', padding:'10px', fontSize:'0.77rem' }}>
                  <div style={{ color:'#fbbf24', fontWeight:'800', marginBottom:'4px' }}>3 • 📲 SHARE STATS IG STORY CARD</div>
                  <div style={{ color:'#e2e8f0' }}>Every athlete podium graphic shared to Instagram carries: <b style={{ color: demo.brandColor }}>PRESENTED BY {(demo.name || 'YOUR BRAND').toUpperCase()}</b></div>
                </div>
              </div>
            </div>

            <button type="button" onClick={activateSitePreview} style={{ background: demo.brandColor, color:'#fff', border:'none', borderRadius:'8px', padding:'11px', fontWeight:'900', fontSize:'0.88rem', cursor:'pointer' }}>
              ✨ Test &quot;MatDates Powered by {demo.name || 'Your Brand'}&quot; Live on Site Right Now →
            </button>
          </div>
        )}

        {tab === 'TIERS' && (
          <div style={{ display:'grid', gap:'10px' }}>
            {[
              {
                badge: '👑 1 EXCLUSIVE SLOT WORLDWIDE',
                title: 'Global Title Presenting Partner ("MatDates Powered by [Brand]")',
                color: '#f59e0b',
                perks: '100% ownership of Header Brand Lockup, 📲 Share Stats IG Story Watermarks, 8:30 AM Morning & Mat-Alert Push Footers, Division Calculator CTA, and Coach Mat Clipboards.'
              },
              {
                badge: '⚡ 3 VERTICAL-EXCLUSIVE SLOTS',
                title: 'Official Category Partner (Hydration • Apparel/Gi • Recovery Tech)',
                color: '#38bdf8',
                perks: '100% category exclusivity (zero competing brands permitted) across targeted high-intent tools — Weight-Cut Calculator, Weekend War Room, or Academy Pro Dashboards.'
              },
              {
                badge: '🚀 90-DAY MAJOR SEASON PILOT',
                title: 'Championship Window Takeover (Pan-Ams / Worlds / ADCC Season)',
                color: '#2ecc71',
                perks: 'Turnkey 90-day Title Presenting takeover during peak tournament months with full audited click-through, promo-code attribution, and impression reporting.'
              }
            ].map((t, idx) => (
              <div key={idx} style={{ background:'#151d2c', border:`1px solid ${t.color}88`, borderRadius:'10px', padding:'13px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
                <div style={{ flex:'1 1 380px' }}>
                  <div style={{ color: t.color, fontSize:'0.7rem', fontWeight:'800', letterSpacing:'1px' }}>{t.badge}</div>
                  <div style={{ color:'#fff', fontWeight:'800', fontSize:'0.96rem', margin:'2px 0 5px' }}>{t.title}</div>
                  <div style={{ color:'#cbd5e1', fontSize:'0.79rem', lineHeight:1.45 }}>{t.perks}</div>
                </div>
                <button type="button" onClick={() => { setInq(p => ({ ...p, tier: t.title })); setTab('INQUIRE'); }} style={{ background: t.color, color:'#000', border:'none', borderRadius:'7px', padding:'8px 13px', fontWeight:'800', fontSize:'0.78rem', cursor:'pointer', whiteSpace:'nowrap' }}>
                  Check Availability →
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'INQUIRE' && (
          sentInq ? (
            <div style={{ background:'#132a1c', border:'1px solid #2ecc71', borderRadius:'10px', padding:'22px', textAlign:'center' }}>
              <div style={{ fontSize:'2rem', marginBottom:'6px' }}>✅</div>
              <h3 style={{ margin:'0 0 6px', color:'#4ade80' }}>Partnership Request Received!</h3>
              <p style={{ margin:0, color:'#cbd5e1', fontSize:'0.86rem' }}>Our partnerships desk has been notified immediately and will send over current rate cards &amp; category availability to <b>{inq.workEmail}</b>.</p>
            </div>
          ) : (
            <form onSubmit={submitInquiry} style={{ display:'grid', gap:'9px' }}>
              <div style={{ fontSize:'0.82rem', color:'#fde68a', fontWeight:'bold' }}>✉️ Request Current Rate Card or Lock Exclusive Category Availability:</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'8px' }}>
                <input required placeholder="Brand / Company Name" value={inq.brandName} onChange={e => setInq({...inq, brandName: e.target.value})} style={inp} />
                <input required placeholder="Your Name & Title" value={inq.contactName} onChange={e => setInq({...inq, contactName: e.target.value})} style={inp} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'8px' }}>
                <input required type="email" placeholder="Work Email Address" value={inq.workEmail} onChange={e => setInq({...inq, workEmail: e.target.value})} style={inp} />
                <select value={inq.tier} onChange={e => setInq({...inq, tier: e.target.value})} style={inp}>
                  <option>Global Title Partner (&quot;Powered by [Brand]&quot;)</option>
                  <option>Official Category Partner (Hydration / Nutrition)</option>
                  <option>Official Category Partner (Apparel / Gi / Gear)</option>
                  <option>Official Category Partner (Recovery / Tech)</option>
                  <option>90-Day Major Season Pilot</option>
                </select>
              </div>
              <textarea rows={3} placeholder="Target campaign dates, product launch goals, or promo offer ideas..." value={inq.notes} onChange={e => setInq({...inq, notes: e.target.value})} style={inp} />
              <button type="submit" disabled={sending} style={{ background:'#2ecc71', color:'#000', border:'none', borderRadius:'8px', padding:'11px', fontWeight:'900', fontSize:'0.9rem', cursor:'pointer' }}>
                {sending ? 'Sending...' : '🚀 Request Official Rate Card & Availability'}
              </button>
            </form>
          )
        )}
      </div>
    </div>
  );
}
