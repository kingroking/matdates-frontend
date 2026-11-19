export const foldStr = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const athBucket = (q) => {
  const w = foldStr(q).replace(/\b(jr\.?|sr\.?|ii|iii|iv)\b/g, " ").trim().split(/\s+/).filter(Boolean);
  const b = (w[w.length - 1] || "").replace(/[^a-z]/g, "").slice(0, 2);
  return b.length >= 2 ? b : "__";
};

export const PRO_SUPERFIGHTS = [
  {
    name: "Cassia Moura", academy: "LEAD BJJ", belt: "Black Belt", rec: "Champ-Champ • Title Unbeaten", feds: ["UFC", "IBJJF"],
    titles: ["👑 UFC BJJ Bantamweight World Champion", "👑 UFC BJJ Flyweight World Champion", "🥇 2026 IBJJF European Champion"],
    bouts: [
      { ev: "UFC BJJ 12", org: "UFC", res: "W vs. Adele Fornarino", sub: "Decision • Flyweight World Title" },
      { ev: "UFC BJJ Championship", org: "UFC", res: "W • World Title", sub: "Inaugural 135 lb Bantamweight Belt" },
      { ev: "European IBJJF Championship 2026", org: "IBJJF", res: "🥇 Gold", sub: "Adult Black Belt Featherweight" }
    ],
    facts: [
      "First two-division champion in UFC BJJ history (simultaneous Bantamweight & Flyweight belts)",
      "Dual-ruleset phenom: Won 2026 IBJJF European Gi Gold & two UFC BJJ No-Gi belts in one season",
      "Edged ADCC World Champion Adele Fornarino at UFC BJJ 12 to cement Champ-Champ status"
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
      "Submitted all 3 opponents at the 2026 ADCC World Championships in Poland for +65kg Gold",
      "Youngest multi-promotion pro champion across ADCC Worlds, WNO & Polaris",
      "100% finish rate across her 2026 World Championship bracket run"
    ]
  },
  {
    name: "William Tackett", academy: "Brazilian Fight Factory", belt: "Black Belt", rec: "UFC BJJ 185 lb Champ", feds: ["UFC", "ADCC"],
    titles: ["👑 UFC BJJ Middleweight World Champion"],
    bouts: [{ ev: "UFC BJJ 13", org: "UFC", res: "W vs. Jay Rodriguez", sub: "Rear-Naked Choke (1:26) • Title Defense" }],
    facts: [
      "Submitted Jay Rodriguez in 86 seconds via RNC at UFC BJJ 13",
      "Reigning UFC BJJ Middleweight Champion out of Austin, TX",
      "Holds simultaneous UFC BJJ family gold alongside brother Andrew Tackett"
    ]
  },
  {
    name: "Andrew Tackett", academy: "Brazilian Fight Factory", belt: "Black Belt", rec: "UFC BJJ 170 lb Champ", feds: ["UFC", "ADCC"],
    titles: ["👑 UFC BJJ Welterweight World Champion"],
    bouts: [{ ev: "UFC BJJ Championship", org: "UFC", res: "W • World Title", sub: "Welterweight 170 lb Championship" }],
    facts: [
      "Reigning UFC BJJ 170 lb Welterweight World Champion",
      "Forms BJJ's first sibling UFC BJJ Championship duo with William Tackett",
      "Renowned for relentless pace and scramble back-takes"
    ]
  },
  {
    name: "Ffion Davies", academy: "Atos / ECJJA", belt: "Black Belt", rec: "ADCC & IBJJF Champ", feds: ["ADCC", "IBJJF", "SUPERFIGHT"],
    titles: ["👑 2x ADCC World Champion", "👑 IBJJF World Champion", "👑 CJI SuperFight Winner"],
    bouts: [{ ev: "Craig Jones Invitational", org: "SUPERFIGHT", res: "W vs. Mackenzie Dern", sub: "Submission Showcase" }],
    facts: [
      "Simultaneous ADCC, IBJJF Gi World & No-Gi World Champion",
      "Won landmark CJI women's superfight via submission",
      "First European & Welsh grappler to win multiple ADCC World titles"
    ]
  },
  {
    name: "Nick Rodriguez", academy: "B-Team", belt: "Black Belt", rec: "CJI +80kg $1M Champ", feds: ["ADCC", "UFC", "SUPERFIGHT"],
    titles: ["👑 CJI +80kg Champion ($1M)", "🥈 Multi-Time ADCC World Finalist"],
    bouts: [{ ev: "Craig Jones Invitational", org: "SUPERFIGHT", res: "🥇 Champion (+80kg)", sub: "4 Straight Submissions" }],
    facts: [
      "Submitted all 4 opponents to capture the $1M CJI +80kg title",
      "Multiple-time ADCC World Championship heavyweight medalist",
      "Highest RNC finish percentage in heavyweight no-gi grappling"
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
      "Historic ADCC -55kg & Open-Weight Absolute Double Champion",
      "First Australian female grappler to win ADCC World Gold",
      "Co-headlined UFC BJJ 12 Flyweight Championship SuperFight"
    ]
  },
  {
    name: "Mica Galvao", academy: "Melqui Galvao", belt: "Black Belt", rec: "SuperFight Grand Slam", feds: ["ADCC", "IBJJF", "SUPERFIGHT"],
    titles: ["👑 IBJJF & ADCC Super Grand Slam", "👑 IBJJF The Crown Champion"],
    bouts: [{ ev: "IBJJF The Crown & ADCC", org: "ADCC", res: "🥇 Champion (-77kg)", sub: "Submission" }],
    facts: [
      "Completed the calendar-year Super Grand Slam across IBJJF & ADCC",
      "Over 80% submission rate across black belt major finals",
      "Undefeated across 2025-2026 pro invitational headliners"
    ]
  }
];

export const findProAthlete = (nm) => {
  const f = foldStr(nm).trim();
  return f ? PRO_SUPERFIGHTS.find(p => foldStr(p.name) === f || (f.length >= 4 && foldStr(p.name).includes(f))) || null : null;
};

export function computeEliteSpotlight(a) {
  const pro = findProAthlete(a?.name || a?.n);
  const g = Number(a?.g || 0), s = Number(a?.s || 0), b = Number(a?.b || 0), evs = a?.events || [];
  const pts = g * 9 + s * 3 + b;
  const feds = Array.from(new Set([...(pro?.feds || []), ...evs.map(e => /ufc/i.test((e.ev || "") + " " + (e.f || "")) ? "UFC" : e.f).filter(Boolean)]));
  const hasGi = evs.some(e => !/no[- ]?gi|adcc/i.test((e.d || "") + " " + (e.ev || "")));
  const hasNoGi = evs.some(e => /no[- ]?gi|adcc|ufc/i.test((e.d || "") + " " + (e.ev || "")));
  const isElite = Boolean(pro || g >= 3 || pts >= 27);
  const tierLabel = pro ? "👑 PRO WORLD CHAMPION • TOP 1% ELITE" : (g >= 8 || pts >= 60 ? "⚡ TOP 1% ELITE COMPETITOR" : "⚡ TOP 5% ELITE COMPETITOR");
  const facts = pro ? pro.facts : [
    feds.length >= 3 ? `${feds.length}-Circuit Medalist: Verified podiums across ${feds.join(", ")}` : `Championship Gold Finisher: ${g}x Verified 1st-Place Titles in 2026`,
    hasGi && hasNoGi ? "Dual-Ruleset Threat: Captured 2026 podium finishes in both Gi & No-Gi divisions" : `High-Efficiency Podium Rate: ${Math.round((g / Math.max(1, g + s + b)) * 100)}% Gold-medal conversion`,
    `${pts} Verified Season Points (🥇${g} · 🥈${s} · 🥉${b}) representing ${a?.academy || a?.a || "their academy"}`
  ];
  return { isElite, tierLabel, pro, pts, feds, facts };
}

export function getDeadlineBadge(ev) {
  if (!ev?.sort_date) return null;
  const diff = Math.ceil((new Date(ev.sort_date + "T12:00:00") - new Date()) / 86400000);
  if (diff >= -1 && diff <= 2) return { text: "🔥 LIVE THIS WEEKEND", bg: "#7f1d1d", border: "#ef4444", color: "#fecaca" };
  if (diff > 2 && diff <= 7) return { text: `⏳ ${diff}d Left • Final Reg / Weight Cutoff`, bg: "#431407", border: "#f97316", color: "#fed7aa" };
  if (diff > 7 && diff <= 15) return { text: `⚡ ${diff}d Out • Check Price Tier Jump`, bg: "#172554", border: "#38bdf8", color: "#bae6fd" };
  return null;
}
