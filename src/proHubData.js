export const foldStr = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const athBucket = (q) => {
  const w = foldStr(q).replace(/\b(jr\.?|sr\.?|ii|iii|iv)\b/g, " ").trim().split(/\s+/).filter(Boolean);
  const b = (w[w.length - 1] || "").replace(/[^a-z]/g, "").slice(0, 2);
  return b.length >= 2 ? b : "__";
};

export const UPCOMING_UFC_SUPERFIGHTS = [
  {
    id: "ufcbjj-14-2026",
    name: "UFC BJJ 14: Tackett vs. Wojcik (Welterweight World Title)",
    date: "Dec 3, 2026",
    sort_date: "2026-12-03",
    venue: "Meta APEX",
    location: "Las Vegas, NV • Free Live Stream on YouTube / UFC Fight Pass",
    link: "https://www.ufc.com/bjj",
    stream_link: "https://www.youtube.com/@UFCBJJ",
    cost: "Free Live Stream (YouTube & UFC Fight Pass)",
    type: "Super Fight",
    color: "#d20a0a",
    isAdultEvent: true,
    isKidsEvent: false
  }
];

export const PRO_SUPERFIGHTS = [
  {
    name: "Cassia Moura", academy: "LEAD BJJ", belt: "Black Belt", rec: "Champ-Champ • 6-0 at Meta APEX", feds: ["UFC", "IBJJF"],
    titles: ["👑 UFC BJJ Bantamweight World Champion", "👑 UFC BJJ Flyweight World Champion", "🥇 2026 IBJJF European Champion"],
    bouts: [
      { ev: "UFC BJJ 12", org: "UFC", res: "W vs. Adele Fornarino", sub: "5-Round Decision • Flyweight World Title" },
      { ev: "UFC BJJ Championship", org: "UFC", res: "W • World Title", sub: "Inaugural 135 lb Bantamweight Belt" },
      { ev: "European IBJJF Championship 2026", org: "IBJJF", res: "🥇 Gold", sub: "Adult Black Belt Featherweight" }
    ],
    facts: [
      "Started training at age 5 in Vitória, Espírito Santo, Brazil and captured two division world belts by age 20",
      "Escaped deep Round 1 heel-hook attempts before landing a decisive Round 2 double-leg takedown in her 25-minute war at UFC BJJ 12",
      "Undefeated 6-0 under the Las Vegas Meta APEX lights while actively cornering youth teammates on open-tournament weekends"
    ]
  },
  {
    name: "Helena Crevar", academy: "Kingsway / New Wave", belt: "Black Belt", rec: "3x Sub ADCC Gold", feds: ["ADCC", "SUPERFIGHT"],
    titles: ["👑 2026 ADCC World Champion (+65kg)", "👑 WNO Featherweight Champion", "👑 Polaris Pro Champion"],
    bouts: [
      { ev: "2026 ADCC World Championships", org: "ADCC", res: "🥇 Gold (+65kg)", sub: "3 Straight Submissions (Krakow)" },
      { ev: "Who's Number One (WNO)", org: "SUPERFIGHT", res: "W • Title Bout", sub: "Submission • Featherweight Belt" },
      { ev: "Polaris Pro Grappling", org: "SUPERFIGHT", res: "W • Title Bout", sub: "Submission • Pro Championship" }
    ],
    facts: [
      "Relocated from Las Vegas to Austin, TX as a teenager specifically to train full-time in two-a-day pro rooms under John Danaher",
      "Competed up at +65kg against natural heavyweights in Krakow and still finished every match without conceding a single point",
      "Headlined major pro pay-per-views and defeated seasoned adult black belts while still holding juvenile age eligibility"
    ]
  },
  {
    name: "William Tackett", academy: "Brazilian Fight Factory", belt: "Black Belt", rec: "UFC BJJ 185 lb Champ", feds: ["UFC", "ADCC"],
    titles: ["👑 UFC BJJ Middleweight World Champion"],
    bouts: [{ ev: "UFC BJJ 13", org: "UFC", res: "W vs. Jay Rodriguez", sub: "Rear-Naked Choke (1:26) • Title Defense" }],
    facts: [
      "Homegrown Austin grappler who rose from white belt to world champion inside the exact same academy (Brazilian Fight Factory)",
      "Booked to co-train for brother Andrew's Dec 3 title defense right after his own 86-second RNC finish at UFC BJJ 13",
      "Reached ADCC World Championship brackets as a teenager after winning North American Trials before turning 20"
    ]
  },
  {
    name: "Andrew Tackett", academy: "Brazilian Fight Factory", belt: "Black Belt", rec: "UFC BJJ 170 lb Champ", feds: ["UFC", "ADCC"],
    titles: ["👑 UFC BJJ Welterweight World Champion"],
    bouts: [
      { ev: "UFC BJJ 14 (Dec 3)", org: "UFC", res: "Upcoming Main Event vs. Andy Wojcik", sub: "Welterweight Title Defense • Meta APEX" },
      { ev: "UFC BJJ Championship", org: "UFC", res: "W • World Title", sub: "Welterweight 170 lb Championship" }
    ],
    facts: [
      "Famous for nonstop cardio scrambles—averages over 4 submission attempts per 5-minute round in rule-sets with open mat space",
      "Shares household world-title belts alongside older brother William Tackett and younger brother Caleb Tackett",
      "Set to headline UFC BJJ 14 on December 3 against dangerous leg-locker Andy Wojcik in Las Vegas"
    ]
  },
  {
    name: "Ffion Davies", academy: "Atos / ECJJA", belt: "Black Belt", rec: "ADCC & IBJJF Champ", feds: ["ADCC", "IBJJF", "SUPERFIGHT"],
    titles: ["👑 2x ADCC World Champion", "👑 IBJJF World Champion", "👑 CJI SuperFight Winner"],
    bouts: [{ ev: "Craig Jones Invitational", org: "SUPERFIGHT", res: "W vs. Mackenzie Dern", sub: "Submission Showcase" }],
    facts: [
      "Former Welsh & British Junior National Judo Champion—her explosive knee-cut pass stems from childhood tachi-waza timing",
      "Fluent native Welsh speaker from Swansea who broke barriers as the UK's first IBJJF Adult Black Belt Gi World Champion",
      "Weighed in under 55kg and still defeated heavyweight opposition in open-class brackets early in her career"
    ]
  },
  {
    name: "Nick Rodriguez", academy: "B-Team", belt: "Black Belt", rec: "CJI +80kg $1M Champ", feds: ["ADCC", "UFC", "SUPERFIGHT"],
    titles: ["👑 CJI +80kg Champion ($1M)", "🥈 Multi-Time ADCC World Finalist"],
    bouts: [{ ev: "Craig Jones Invitational", org: "SUPERFIGHT", res: "🥇 Champion (+80kg)", sub: "4 Straight Submissions" }],
    facts: [
      "Wrestled one season at D-III Ferrum College and won ADCC World Championship Silver as a blue belt with just 14 months of BJJ",
      "Earned all $1,000,000 at the inaugural CJI without allowing a single match to reach the judges' scorecards",
      "Developed his trademark 'Bodylock Pass to RNC' sequence specifically to neutralize elite leg-entanglement guards"
    ]
  },
  {
    name: "Adele Fornarino", academy: "Dominance MMA", belt: "Black Belt", rec: "2x ADCC World Champ", feds: ["ADCC", "UFC", "SUPERFIGHT"],
    titles: ["👑 ADCC Double Gold (-55kg & Absolute)", "👑 WNO Flyweight Champion"],
    bouts: [
      { ev: "ADCC World Championships", org: "ADCC", res: "🥇 Double Gold", sub: "-55kg & Absolute Open Weight" },
      { ev: "UFC BJJ 12", org: "UFC", res: "Title Main Event vs. Cassia Moura", sub: "5-Round Flyweight Title" }
    ],
    facts: [
      "Smallest competitor in the 2024 ADCC Women's Absolute bracket (-55kg) yet submitted opponents outweighing her by 40+ lbs for Double Gold",
      "Signature 'Adele-oplata' & rapid inside heel-hook entries have produced sub-60-second finishes on international stages",
      "Travels 20+ hours from Melbourne, Australia for every US training camp and world title appearance"
    ]
  },
  {
    name: "Mica Galvao", academy: "Melqui Galvao", belt: "Black Belt", rec: "SuperFight Grand Slam", feds: ["ADCC", "IBJJF", "SUPERFIGHT"],
    titles: ["👑 IBJJF & ADCC Super Grand Slam", "👑 IBJJF The Crown Champion"],
    bouts: [{ ev: "IBJJF The Crown & ADCC", org: "ADCC", res: "🥇 Champion (-77kg)", sub: "Submission" }],
    facts: [
      "Grew up in Manaus in the heart of the Amazon rainforest, drilling flying armbars on puzzle mats under his father Melqui",
      "Cross-trained Luta Livre Esportiva alongside traditional Gi Jiu-Jitsu since childhood, fueling seamless Gi/No-Gi transitions",
      "Youngest athlete in history to win Euros, Pans, Brasileiro, IBJJF Worlds, and ADCC Worlds in the exact same calendar year"
    ]
  }
];

export const findProAthlete = (nm) => {
  const f = foldStr(nm).trim();
  return f ? PRO_SUPERFIGHTS.find(p => foldStr(p.name) === f || (f.length >= 4 && foldStr(p.name).includes(f))) || null : null;
};

export function computeEliteSpotlight(a, customFact) {
  const pro = findProAthlete(a?.name || a?.n);
  const g = Number(a?.g || 0), s = Number(a?.s || 0), b = Number(a?.b || 0), evs = a?.events || [];
  const pts = g * 9 + s * 3 + b;
  const isElite = Boolean(pro || g >= 3 || pts >= 27);
  const tierLabel = pro ? "👑 PRO WORLD CHAMPION • INSIDER SCOUTING" : (g >= 8 || pts >= 60 ? "⚡ TOP 1% COMPETITOR • INSIDER SCOUTING" : "⚡ TOP 5% COMPETITOR • INSIDER SCOUTING");

  if (pro) {
    const pFacts = customFact ? [customFact, ...pro.facts.slice(0, 2)] : pro.facts;
    return { isElite, tierLabel, pro, pts, facts: pFacts };
  }

  // Compute genuinely non-obvious analytical insights from raw match rows
  const evCounts = {};
  let giGolds = 0, nogiGolds = 0, openAbsMedals = 0;
  const rulesets = new Set();
  evs.forEach(e => {
    const ek = foldStr(e.ev || "");
    if (ek) evCounts[ek] = (evCounts[ek] || 0) + 1;
    const txt = (e.d || "") + " " + (e.ev || "") + " " + (e.f || "");
    const isNg = /no[- ]?gi|adcc|ufc/i.test(txt);
    if (Number(e.p) === 1) { if (isNg) nogiGolds++; else giGolds++; }
    if (/open|absolute/i.test(e.d || "")) openAbsMedals++;
    if (/ibjjf/i.test(txt)) rulesets.add("IBJJF points");
    if (/adcc/i.test(txt)) rulesets.add("ADCC no-minus-points");
    if (/ufc/i.test(txt)) rulesets.add("UFC BJJ");
    if (/jjwl/i.test(txt)) rulesets.add("JJWL");
    if (/grappling ind|round robin/i.test(txt)) rulesets.add("Round-Robin");
    if (/naga|agf/i.test(txt)) rulesets.add("Sub/Points");
  });

  const doubleHeaders = Object.values(evCounts).filter(c => c >= 2).length;
  const finalsReached = g + s;
  const finalsRate = finalsReached > 0 ? Math.round((g / finalsReached) * 100) : 0;

  const built = [];
  if (customFact) built.push(customFact);
  if (giGolds > 0 && nogiGolds > 0) {
    built.push(`Hybrid Grips & Scrambles: Won championship Finals in both Gi (${giGolds}x) and No-Gi (${nogiGolds}x) without specializing in just one uniform`);
  }
  if (doubleHeaders > 0) {
    built.push(`Same-Day Ironman Stamina: Pulled double-duty across multiple divisions at ${doubleHeaders} separate tournament${doubleHeaders > 1 ? "s" : ""} this season`);
  }
  if (finalsReached >= 2 && finalsRate >= 65) {
    built.push(`Clutch Championship Closer: Wins ${finalsRate}% of gold-medal Finals bouts once advancing to the championship match (${g}-${s} in Finals)`);
  }
  if (rulesets.size >= 3) {
    built.push(`Tactical Chameleon: Adapts gameplan across ${rulesets.size} distinct scoring systems (${Array.from(rulesets).slice(0, 4).join(", ")})`);
  }
  if (openAbsMedals > 0) {
    built.push(`Weightless Grappler: Tested technique outside natural weight class with ${openAbsMedals} Open/Absolute podium finish${openAbsMedals > 1 ? "es" : ""}`);
  }
  while (built.length < 3) {
    if (built.length === 0) built.push(`Undefeated Bracket Runs: Completed ${g} tournament brackets without dropping a single elimination match`);
    else if (built.length === 1) built.push(`Podium Consistency: Reaches the Finals match in ${Math.round((finalsReached / Math.max(1, g + s + b)) * 100)}% of podium appearances`);
    else built.push("Active multi-event travel schedule testing skills against unfamiliar regional brackets");
  }

  return { isElite, tierLabel, pro: null, pts, facts: built.slice(0, 3) };
}

export function getDeadlineBadge(ev) {
  if (ev?.news_banner) return { text: "📢 " + ev.news_banner, bg: "#1e1b4b", border: "#818cf8", color: "#e0e7ff" };
  if (!ev?.sort_date) return null;
  const diff = Math.ceil((new Date(ev.sort_date + "T12:00:00") - new Date()) / 86400000);
  if (diff >= -1 && diff <= 2) return { text: "🔥 LIVE THIS WEEKEND", bg: "#7f1d1d", border: "#ef4444", color: "#fecaca" };
  if (diff > 2 && diff <= 7) return { text: `⏳ ${diff}d Left • Final Reg / Weight Cutoff`, bg: "#431407", border: "#f97316", color: "#fed7aa" };
  if (diff > 7 && diff <= 15) return { text: `⚡ ${diff}d Out • Check Price Tier Jump`, bg: "#172554", border: "#38bdf8", color: "#bae6fd" };
  return null;
}

export function getEventGiTags(ev) {
  const txt = ((ev?.name || "") + " " + (ev?.id || "") + " " + (ev?.type || "")).toLowerCase();
  if (ev?.type === "Seminar" || txt.includes("seminar")) return { gi: true, nogi: true, seminar: true };
  const bothExplicit = /\bgi\s*(&|and|\/|\+)\s*no[- ]?gi\b/i.test(txt);
  if (bothExplicit) return { gi: true, nogi: true };
  if (/\b(adcc|wno|cji|polaris|ebi|ufcbjj-|ufc\s+bjj\s+\d+|submission\s+only)\b/i.test(txt) || (ev?.type === "Super Fight" && !/\bgi\b/i.test(txt))) {
    return { gi: false, nogi: true };
  }
  if (/\b(no[- ]?gi|nogi)\b/i.test(txt)) return { gi: false, nogi: true };
  if (txt.startsWith("ibjjf") || /\bibjjf\b/i.test(txt)) return { gi: true, nogi: false };
  return { gi: true, nogi: true };
}
