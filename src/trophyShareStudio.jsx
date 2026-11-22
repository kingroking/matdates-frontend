import React, { useState, useEffect, useRef } from 'react';
import { trackEvent } from './analytics';

function parseBeltVisual(rawBelt) {
  const b = String(rawBelt || '').toLowerCase().trim();
  const stripeMatch = b.match(/(\d)\s*(?:stripe|stripes|st|grau)/i);
  const stripes = stripeMatch ? Math.min(4, Math.max(0, parseInt(stripeMatch[1], 10))) : 0;
  if (!b) return null;
  if (b.includes('black') && !b.includes('grey') && !b.includes('gray') && !b.includes('yellow') && !b.includes('orange') && !b.includes('green')) {
    return { main: '#111827', center: null, bar: '#dc2626', text: '#ffffff', label: rawBelt.toUpperCase(), stripes };
  }
  if (b.includes('brown')) return { main: '#6b3e26', center: null, bar: '#111111', text: '#ffffff', label: rawBelt.toUpperCase(), stripes };
  if (b.includes('purple')) return { main: '#6d28d9', center: null, bar: '#111111', text: '#ffffff', label: rawBelt.toUpperCase(), stripes };
  if (b.includes('blue')) return { main: '#1d4ed8', center: null, bar: '#111111', text: '#ffffff', label: rawBelt.toUpperCase(), stripes };
  const hasBlackStripe = b.includes('/black') || b.includes('-black') || b.includes(' black');
  const hasWhiteStripe = b.includes('/white') || b.includes('-white') || b.includes(' white');
  const center = hasBlackStripe ? '#111827' : (hasWhiteStripe ? '#f8fafc' : null);
  if (b.includes('green')) return { main: '#16a34a', center, bar: '#111111', text: '#ffffff', label: rawBelt.toUpperCase(), stripes };
  if (b.includes('orange')) return { main: '#ea580c', center, bar: '#111111', text: '#ffffff', label: rawBelt.toUpperCase(), stripes };
  if (b.includes('yellow')) return { main: '#eab308', center, bar: '#111111', text: '#111827', label: rawBelt.toUpperCase(), stripes };
  if (b.includes('grey') || b.includes('gray')) return { main: '#64748b', center, bar: '#111111', text: '#ffffff', label: rawBelt.toUpperCase(), stripes };
  if (b.includes('white')) return { main: '#f1f5f9', center: null, bar: '#111111', text: '#0f172a', label: rawBelt.toUpperCase(), stripes };
  return { main: '#334155', center: null, bar: '#111111', text: '#ffffff', label: rawBelt.toUpperCase(), stripes };
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function loadCorsImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export default function TrophyShareStudioModal({
  isOpen, onClose, name, nickname, spiritEmoji, academy, belt, coach,
  avatarData, handle, songRepeat, g26, s26, b26, totG, totS, totB,
  initialEra = '2026', isYouth = false, jitsRating = '', jitsRank = ''
}) {
  const [tab, setTab] = useState('card'); // 'card' | 'qr'
  const [cardEra, setCardEra] = useState(initialEra || '2026');
  const [copied, setCopied] = useState(false);
  const [sharingImg, setSharingImg] = useState(false);
  const [cardDataUrl, setCardDataUrl] = useState('');
  const canvasRef = useRef(null);

  useEffect(() => { setCardEra(initialEra || '2026'); }, [initialEra]);

  const cleanName = (name || 'Athlete').trim();
  const shareUrl = 'https://matdates.com/?athlete=' + encodeURIComponent(cleanName).replace(/%20/g, '+');
  const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=340x340&margin=8&data=' + encodeURIComponent(shareUrl);

  const g = cardEra === 'ALLTIME' ? totG : g26;
  const s = cardEra === 'ALLTIME' ? totS : s26;
  const b = cardEra === 'ALLTIME' ? totB : b26;
  const pts = g * 9 + s * 3 + b;
  const initials = cleanName.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '🥋';

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const renderCard = async (skipExternalImages = false) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const W = 1080, H = 1350;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');

      // 1. Deep Championship Obsidian + Gold Radial Glow Background
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#090d16');
      bg.addColorStop(0.5, '#11192c');
      bg.addColorStop(1, '#070a12');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const glow = ctx.createRadialGradient(W / 2, 310, 40, W / 2, 310, 560);
      glow.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
      glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // Subtle diagonal sport lines
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.05)';
      ctx.lineWidth = 2;
      for (let i = -H; i < W + H; i += 64) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i - H * 0.45, H);
        ctx.stroke();
      }

      // 2. Double Gold-Foil Championship Frame
      const foil = ctx.createLinearGradient(0, 0, W, H);
      foil.addColorStop(0, '#fde047');
      foil.addColorStop(0.35, '#f59e0b');
      foil.addColorStop(0.7, '#fbbf24');
      foil.addColorStop(1, '#b45309');

      roundRectPath(ctx, 28, 28, W - 56, H - 56, 34);
      ctx.lineWidth = 6;
      ctx.strokeStyle = foil;
      ctx.stroke();

      roundRectPath(ctx, 42, 42, W - 84, H - 84, 26);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
      ctx.stroke();

      // 3. Top Header Badge
      roundRectPath(ctx, W / 2 - 270, 68, 540, 52, 26);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
      ctx.stroke();

      ctx.font = '900 22px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.fillText('MATDATES.COM  •  OFFICIAL TROPHY CARD', W / 2, 102);

      // 4. Circular Athlete Portrait (Center-Cropped)
      const cx = W / 2, cy = 278, rad = 122;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, rad + 8, 0, Math.PI * 2);
      ctx.fillStyle = foil;
      ctx.fill();
      ctx.restore();

      const avatarImg = (!skipExternalImages || (avatarData && avatarData.startsWith('data:')))
        ? await loadCorsImage(avatarData)
        : null;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = '#162033';
      ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);

      if (avatarImg) {
        const iw = avatarImg.width || 1, ih = avatarImg.height || 1;
        const scale = Math.max((rad * 2) / iw, (rad * 2) / ih);
        const dw = iw * scale, dh = ih * scale;
        ctx.drawImage(avatarImg, cx - dw / 2, cy - dh / 2, dw, dh);
      } else {
        ctx.fillStyle = '#fbbf24';
        ctx.font = '900 84px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials, cx, cy + 4);
      }
      ctx.restore();
      ctx.textBaseline = 'alphabetic';

      // 5. Athlete Name, Nickname & Academy
      let y = 456;
      const dispTitle = cleanName + (spiritEmoji ? ' ' + spiritEmoji : '');
      let nameFont = 56;
      if (dispTitle.length > 22) nameFont = 44;
      if (dispTitle.length > 30) nameFont = 36;
      ctx.font = `900 ${nameFont}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(dispTitle, W / 2, y);

      if (nickname && nickname.trim()) {
        y += 42;
        ctx.font = '800 28px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#fde047';
        ctx.fillText(`"${nickname.trim()}"`, W / 2, y);
      }

      y += 46;
      ctx.font = '800 30px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ff9f43';
      const acadLabel = (academy || 'Independent').length > 38 ? (academy || '').slice(0, 36) + '…' : (academy || 'Independent');
      ctx.fillText('🏛️ ' + acadLabel, W / 2, y);

      const subParts = [];
      if (coach && coach.trim()) subParts.push(coach.trim());
      if (handle && handle.trim()) subParts.push('@' + handle.replace(/^@+/, '').trim());
      if (subParts.length > 0) {
        y += 36;
        ctx.font = '700 23px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(subParts.join('  •  ').slice(0, 56), W / 2, y);
      }

      // 6. Authentic IBJJF Belt Rank Bar
      const bv = parseBeltVisual(belt);
      if (bv) {
        y += 28;
        const bw = 460, bh = 44, bx = (W - bw) / 2;
        ctx.save();
        roundRectPath(ctx, bx, y, bw, bh, 10);
        ctx.clip();
        ctx.fillStyle = bv.main;
        ctx.fillRect(bx, y, bw, bh);
        if (bv.center) {
          ctx.fillStyle = bv.center;
          ctx.fillRect(bx, y + bh * 0.33, bw, bh * 0.34);
        }
        // Black/Red Grading Tip Bar on right
        const tipW = 104;
        ctx.fillStyle = bv.bar;
        ctx.fillRect(bx + bw - tipW, y, tipW, bh);
        for (let st = 0; st < bv.stripes; st++) {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(bx + bw - tipW + 16 + st * 20, y + 4, 10, bh - 8);
        }
        ctx.restore();
        roundRectPath(ctx, bx, y, bw, bh, 10);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.stroke();

        ctx.font = '900 20px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = bv.center ? '#ffffff' : bv.text;
        ctx.textAlign = 'left';
        ctx.shadowColor = 'rgba(0,0,0,0.65)';
        ctx.shadowBlur = 4;
        ctx.fillText(bv.label.slice(0, 22), bx + 18, y + 29);
        ctx.shadowBlur = 0;
        y += bh;
      }

      // 7. Medal Scoreboard (Gold / Silver / Bronze)
      const boardTop = Math.max(y + 38, 690);
      ctx.textAlign = 'center';
      ctx.font = '900 23px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(
        cardEra === 'ALLTIME'
          ? `🏛️ ALL-TIME CAREER HARDWARE  •  ${pts} PTS`
          : `🔥 2026 SEASON HARDWARE  •  ${pts} PTS`,
        W / 2,
        boardTop
      );

      const boxY = boardTop + 22;
      const boxW = 280, boxH = 195, gap = 28;
      const startX = (W - (boxW * 3 + gap * 2)) / 2;
      const cols = [
        { lbl: 'GOLD', val: g, col: '#fde047', bg: 'rgba(245,158,11,0.14)', brd: '#f59e0b' },
        { lbl: 'SILVER', val: s, col: '#e2e8f0', bg: 'rgba(148,163,184,0.14)', brd: '#94a3b8' },
        { lbl: 'BRONZE', val: b, col: '#fdba74', bg: 'rgba(217,119,6,0.14)', brd: '#d97706' }
      ];

      cols.forEach((m, idx) => {
        const mx = startX + idx * (boxW + gap);
        roundRectPath(ctx, mx, boxY, boxW, boxH, 22);
        ctx.fillStyle = m.bg;
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = m.brd;
        ctx.stroke();

        ctx.font = '900 84px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = m.col;
        ctx.fillText(String(m.val || 0), mx + boxW / 2, boxY + 112);

        ctx.font = '800 22px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(m.lbl, mx + boxW / 2, boxY + 162);
      });

      // 8. Optional Walkout Song / Youth Jits Strip
      let extraY = boxY + boxH + 28;
      const pills = [];
      if (songRepeat && songRepeat.trim()) pills.push('🎧 Walkout: ' + songRepeat.trim().slice(0, 42));
      if (isYouth && jitsRating) pills.push(`⚡ Jits Rating: ${jitsRating}${jitsRank ? ' (' + jitsRank + ')' : ''}`);
      if (pills.length > 0) {
        roundRectPath(ctx, 90, extraY, W - 180, 56, 16);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.stroke();
        ctx.font = '700 22px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#e0f2fe';
        ctx.fillText(pills.join('   •   ').slice(0, 68), W / 2, extraY + 36);
      }

      // 9. Footer Callout + Scannable QR Code
      const footY = 1072;
      roundRectPath(ctx, 76, footY, W - 152, 206, 24);
      ctx.fillStyle = 'rgba(13, 19, 33, 0.95)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = '900 30px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Follow Live Brackets & Mat Alerts', 112, footY + 66);

      ctx.font = '700 22px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Scan QR or visit Official Trophy Room:', 112, footY + 108);

      ctx.font = '800 24px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#fbbf24';
      const prettyUrl = ('matdates.com/?athlete=' + cleanName.replace(/\s+/g, '+')).slice(0, 40);
      ctx.fillText(prettyUrl, 112, footY + 152);

      const qrImg = !skipExternalImages ? await loadCorsImage(qrUrl) : null;
      if (qrImg) {
        roundRectPath(ctx, W - 266, footY + 21, 164, 164, 14);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.drawImage(qrImg, W - 260, footY + 27, 152, 152);
      }

      if (cancelled) return;
      try {
        const url = canvas.toDataURL('image/png');
        setCardDataUrl(url);
      } catch {
        if (!skipExternalImages) renderCard(true);
      }
    };

    renderCard(false);
    return () => { cancelled = true; };
  }, [isOpen, cleanName, nickname, spiritEmoji, academy, belt, coach, avatarData, handle, songRepeat, g, s, b, pts, cardEra, isYouth, jitsRating, jitsRank, qrUrl, initials]);

  if (!isOpen) return null;

  const shareText = `Check out ${cleanName}'s Official BJJ Trophy Room on MatDates (${g}🥇 ${s}🥈 ${b}🥉) — follow live brackets & match alerts!`;

  const handleNativeLinkShare = async () => {
    trackEvent('shareStatsClicks');
    if (navigator.share) {
      try {
        await navigator.share({ title: `${cleanName} — MatDates Trophy Room`, text: shareText, url: shareUrl });
        return;
      } catch (e) {
        if (e?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2600);
    } catch {}
  };

  const handleCopyLink = async () => {
    trackEvent('shareStatsClicks');
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2600);
    } catch {}
  };

  const handleShareOrDownloadCard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    trackEvent('shareStatsClicks');
    setSharingImg(true);
    try {
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
      if (blob) {
        const fileName = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-matdates-card.png';
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${cleanName} — Official MatDates Card`,
            text: shareText
          });
          setSharingImg(false);
          return;
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch {}
    setSharingImg(false);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(3,7,18,0.92)', zIndex: 10120,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', boxSizing: 'border-box'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0d1322', border: '1.5px solid #f59e0b', borderRadius: '16px',
          maxWidth: '460px', width: '100%', maxHeight: '90dvh', overflowY: 'auto',
          padding: '15px', color: '#fff', boxShadow: '0 24px 60px rgba(0,0,0,0.9)', textAlign: 'center'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <strong style={{ fontSize: '0.96rem', color: '#fde047' }}>⚡ Share &amp; Athlete Flex Pass</strong>
          <button type="button" onClick={onClose} style={{ background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: '7px', padding: '4px 10px', cursor: 'pointer', fontWeight: '800' }}>✕</button>
        </div>

        {/* Mode Switcher: Trading Card vs Instant Mat-Side QR Pass */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', background: '#090d16', padding: '4px', borderRadius: '10px', border: '1px solid #1e293b', marginBottom: '11px' }}>
          <button
            type="button"
            onClick={() => setTab('card')}
            style={{
              padding: '7px 8px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: '0.78rem',
              background: tab === 'card' ? '#f59e0b' : 'transparent', color: tab === 'card' ? '#000' : '#94a3b8'
            }}
          >
            🃏 BJJ Trading Card
          </button>
          <button
            type="button"
            onClick={() => setTab('qr')}
            style={{
              padding: '7px 8px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: '0.78rem',
              background: tab === 'qr' ? '#38bdf8' : 'transparent', color: tab === 'qr' ? '#000' : '#94a3b8'
            }}
          >
            📱 Mat-Side QR Scan
          </button>
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {tab === 'card' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
              <button type="button" onClick={() => setCardEra('2026')} style={{ padding: '3px 10px', borderRadius: '999px', border: '1px solid #334155', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer', background: cardEra === '2026' ? '#1e293b' : 'transparent', color: cardEra === '2026' ? '#fde047' : '#94a3b8' }}>
                2026 Stats ({g26}🥇)
              </button>
              <button type="button" onClick={() => setCardEra('ALLTIME')} style={{ padding: '3px 10px', borderRadius: '999px', border: '1px solid #334155', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer', background: cardEra === 'ALLTIME' ? '#1e293b' : 'transparent', color: cardEra === 'ALLTIME' ? '#38bdf8' : '#94a3b8' }}>
                All-Time Stats ({totG}🥇)
              </button>
            </div>

            {cardDataUrl ? (
              <img
                src={cardDataUrl}
                alt={cleanName + ' Trading Card'}
                style={{ width: '100%', maxWidth: '300px', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.5)', boxShadow: '0 12px 30px rgba(0,0,0,0.65)', margin: '0 auto 12px', display: 'block' }}
              />
            ) : (
              <div style={{ padding: '40px 10px', color: '#94a3b8', fontSize: '0.82rem' }}>Generating Championship Card...</div>
            )}

            <div style={{ display: 'grid', gap: '8px' }}>
              <button
                type="button"
                onClick={handleShareOrDownloadCard}
                disabled={sharingImg}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg,#f59e0b,#fbbf24)', color: '#000',
                  fontWeight: '900', fontSize: '0.86rem', cursor: 'pointer'
                }}
              >
                {sharingImg ? '⏳ Preparing Card...' : '🃏 Share / Save Trading Card (IG Story • Text)'}
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '7px' }}>
                <button
                  type="button"
                  onClick={handleNativeLinkShare}
                  style={{
                    padding: '10px 12px', borderRadius: '10px', border: '1px solid #0284c7',
                    background: '#0f2238', color: '#38bdf8', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer'
                  }}
                >
                  📲 Send to Contacts / Text / AirDrop
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  style={{
                    padding: '10px 12px', borderRadius: '10px', border: '1px solid #334155',
                    background: copied ? '#132a1c' : '#161f30', color: copied ? '#4ade80' : '#cbd5e1',
                    fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap'
                  }}
                >
                  {copied ? '✓ Copied!' : '🔗 Copy Link'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '6px 4px' }}>
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '16px', display: 'inline-block', border: '4px solid #f59e0b', boxShadow: '0 10px 30px rgba(245,158,11,0.25)', marginBottom: '10px' }}>
              <img src={qrUrl} alt="Scan Trophy Room QR" style={{ width: '220px', height: '220px', display: 'block' }} />
            </div>
            <div style={{ fontWeight: '900', fontSize: '1.05rem', color: '#fff' }}>{cleanName}</div>
            <div style={{ color: '#ff9f43', fontSize: '0.82rem', fontWeight: '800', marginTop: '2px' }}>🏛️ {academy || 'Independent'}</div>
            <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: '8px 0 12px', lineHeight: 1.4 }}>
              Hold up your phone mat-side — teammates, coaches, or friends can point their camera right here to open {cleanName.split(' ')[0]}&apos;s Trophy Room &amp; tap <b>🔔 Watch</b>!
            </p>
            <button
              type="button"
              onClick={handleNativeLinkShare}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: '10px', border: 'none',
                background: '#0284c7', color: '#fff', fontWeight: '900', fontSize: '0.85rem', cursor: 'pointer'
              }}
            >
              📲 Or Send via Text / AirDrop / Contacts
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
