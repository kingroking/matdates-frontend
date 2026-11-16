const US_STATES = {
  alabama:'AL',alaska:'AK',arizona:'AZ',arkansas:'AR',california:'CA',colorado:'CO',
  connecticut:'CT',delaware:'DE',florida:'FL',georgia:'GA',hawaii:'HI',idaho:'ID',
  illinois:'IL',indiana:'IN',iowa:'IA',kansas:'KS',kentucky:'KY',louisiana:'LA',
  maine:'ME',maryland:'MD',massachusetts:'MA',michigan:'MI',minnesota:'MN',
  mississippi:'MS',missouri:'MO',montana:'MT',nebraska:'NE',nevada:'NV',
  'new hampshire':'NH','new jersey':'NJ','new mexico':'NM','new york':'NY',
  'north carolina':'NC','north dakota':'ND',ohio:'OH',oklahoma:'OK',oregon:'OR',
  pennsylvania:'PA','rhode island':'RI','south carolina':'SC','south dakota':'SD',
  tennessee:'TN',texas:'TX',utah:'UT',vermont:'VT',virginia:'VA',washington:'WA',
  'west virginia':'WV',wisconsin:'WI',wyoming:'WY','district of columbia':'DC'
};
export function formatEventLoc(ev) {
  let loc = (ev.location || '').replace(/\s+/g, ' ').trim();
  loc = loc.replace(/,\s*(United States( of America)?|USA|U\.S\.A\.?|US)$/i, '').trim();
  const wasUS = /,\s*(United States( of America)?|USA|U\.S\.A\.?|US)$/i.test(ev.location || '');
  const parts = loc.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 1 && wasUS) {
    const am = (ev.address || '').match(/,\s*([A-Z]{2})(?:\s+\d{5}|,|$)/);
    const st = (am && am[1]) || US_CITIES[parts[0].toLowerCase()];
    if (st) loc = `${parts[0]}, ${st}`;
  }
  if (parts.length >= 2) {
    const last = parts[parts.length - 1].replace(/\s+\d{5}(-\d{4})?$/, '').trim();
    const code = US_STATES[last.toLowerCase()] || (/^[A-Za-z]{2}$/.test(last) ? last.toUpperCase() : null);
    if (code) loc = `${parts[parts.length - 2]}, ${code}`;
  }
  let ven = (ev.venue || '').replace(/\s+/g, ' ').trim();
  if (/^(tba|tbd|location.*|venue|united states|usa|hall of fame|championships|rankings)$/i.test(ven)) ven = '';
  if (ven && loc && loc.toLowerCase().includes(ven.toLowerCase())) ven = '';
  if (ven && loc && ven.toLowerCase() === loc.toLowerCase()) ven = '';
  return ven && loc ? `${ven} • ${loc}` : (loc || ven || 'TBA');
}

const US_CITIES = {
  'lake forest':'CA','san marcos':'CA','san diego':'CA','los angeles':'CA','anaheim':'CA',
  'long beach':'CA','fresno':'CA','sacramento':'CA','san jose':'CA','irvine':'CA','ontario':'CA',
  'duncanville':'TX','san antonio':'TX','austin':'TX','round rock':'TX','dallas':'TX',
  'houston':'TX','fort worth':'TX','plano':'TX','pasadena':'TX','el paso':'TX','midland':'TX',
  'miami':'FL','orlando':'FL','kissimmee':'FL','tampa':'FL','jacksonville':'FL','fort lauderdale':'FL',
  'denver':'CO','chicago':'IL','oak lawn':'IL','las vegas':'NV','reno':'NV','sparks':'NV',
  'phoenix':'AZ','mesa':'AZ','atlanta':'GA','biloxi':'MS','louisville':'KY','owensboro':'KY',
  'chattanooga':'TN','nashville':'TN','rahway':'NJ','edison':'NJ','atlantic city':'NJ',
  'new york':'NY','brooklyn':'NY','pittsburgh':'PA','manheim':'PA','philadelphia':'PA',
  'columbus':'OH','cleveland':'OH','detroit':'MI','indianapolis':'IN','minot':'ND',
  'kennewick':'WA','seattle':'WA','tacoma':'WA','portland':'OR','salt lake city':'UT',
  'albuquerque':'NM','new orleans':'LA','charlotte':'NC','raleigh':'NC','oklahoma city':'OK'
};

export function resolveEventUrl(ev) {
  const raw = (ev?.link || '').trim();
  if (!raw || raw === '#' || /matdates\.(com|web\.app)/i.test(raw)) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) {
    const sig = `${ev?.id || ''} ${ev?.location || ''} ${ev?.cost || ''}`.toLowerCase();
    if (sig.includes('flograp')) return `https://www.flograppling.com${raw}`;
    if (sig.includes('one-')) return `https://www.onefc.com${raw}`;
    if (sig.includes('ibjjf')) return `https://ibjjf.com${raw}`;
    if (sig.includes('jjwl')) return `https://www.jjworldleague.com${raw}`;
    if (sig.includes('smoothcomp')) return `https://smoothcomp.com${raw}`;
  }
  return '';
}
