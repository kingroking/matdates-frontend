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
  const parts = loc.split(',').map(p => p.trim()).filter(Boolean);
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
