import React from 'react';

export const sponsorConfig = {
  enabled: false,
  name: "Title Sponsor",
  offerText: "",
  ctaText: "Learn More →",
  url: "https://matdates.com",
  brandColor: "#e31837",
  logoUrl: ""
};

export function SponsorBanner() {
  if (!sponsorConfig.enabled) return null;
  return (
    <div style={{
      margin: '0 0 18px 0', padding: '10px 16px', borderRadius: '8px',
      background: 'linear-gradient(90deg, #141821 0%, #1f1622 100%)',
      border: `1px solid ${sponsorConfig.brandColor}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '12px', flexWrap: 'wrap'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '0.68rem', fontWeight: 'bold', textTransform: 'uppercase',
          letterSpacing: '0.06em', padding: '2px 7px', borderRadius: '4px',
          background: `${sponsorConfig.brandColor}26`, color: '#fca5a5',
          border: `1px solid ${sponsorConfig.brandColor}66`
        }}>Title Partner</span>
        <strong style={{ color: '#fff', fontSize: '0.92rem' }}>{sponsorConfig.name}</strong>
        <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>— {sponsorConfig.offerText}</span>
      </div>
      <a href={sponsorConfig.url} target="_blank" rel="noopener noreferrer" style={{
        backgroundColor: sponsorConfig.brandColor, color: '#fff', textDecoration: 'none',
        padding: '6px 13px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.8rem', whiteSpace: 'nowrap'
      }}>{sponsorConfig.ctaText}</a>
    </div>
  );
}
