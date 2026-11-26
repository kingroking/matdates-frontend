import { BJJ_HEROES_NICKNAMES } from "./bjjNicknames.js";
const _SHARD_TTL_MS = 30 * 60 * 1000;
export function getCachedQueryOnce(cacheKey, fetcherFn) {
  if (typeof window !== "undefined") {
    if (!window.__mdOnceCache) window.__mdOnceCache = new Map();
    const hit = window.__mdOnceCache.get(cacheKey);
    if (hit && (Date.now() - hit.ts) < _SHARD_TTL_MS) return hit.promise;
    const p = fetcherFn().catch(err => {
      window.__mdOnceCache.delete(cacheKey);
      throw err;
    });
    window.__mdOnceCache.set(cacheKey, { ts: Date.now(), promise: p });
    return p;
  }
  return fetcherFn();
}
export function getCachedShardItems(db, collectionFn, queryFn, whereFn, getDocsFn, eventId) {
  if (typeof window !== "undefined") {
    if (!window.__mdShardCache) window.__mdShardCache = new Map();
    const hit = window.__mdShardCache.get(eventId);
    if (hit && (Date.now() - hit.ts) < _SHARD_TTL_MS) {
      return hit.promise;
    }
  }
  const p = getDocsFn(queryFn(collectionFn(db, "event_competitors"), whereFn("event_id", "==", eventId)))
    .then(sn => {
      const items = [];
      sn.forEach(d => {
        const arr = (d.data() || {}).items;
        if (Array.isArray(arr)) {
          for (let i = 0; i < arr.length; i++) items.push(arr[i]);
        }
      });
      return items;
    })
    .catch(err => {
      if (typeof window !== "undefined" && window.__mdShardCache) {
        window.__mdShardCache.delete(eventId);
      }
      throw err;
    });

  if (typeof window !== "undefined" && window.__mdShardCache) {
    window.__mdShardCache.set(eventId, { ts: Date.now(), promise: p });
  }
  return p;
}

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
    name: "Carlson Gracie Jr.", aliases: ["carlson gracie jr", "carlson gracie junior", "master carlson gracie jr"], shards: ["gr"],
    academy: "Carlson Gracie Team HQ", belt: "5th Degree Black Belt", rec: "Head of Carlson Gracie Team • 6x Rio & CBJJ Champion", feds: ["IBJJF", "CBJJ"],
    careerG: 6, careerS: 2, careerB: 1,
    titles: ["🥋 5th-Degree Carlson Gracie Black Belt (Son of Grandmaster Carlson Gracie Sr.)", "🏛️ Global Head of Carlson Gracie Team Federation", "🥇 Multi-Time Rio de Janeiro State & Greco-Roman Champion"],
    careerPodiums: [
      { ev: "Campeonato Estadual de Jiu-Jitsu (Rio de Janeiro)", d: "Adult / Medium-Heavy", p: 1, f: "CBJJ", yr: 1994 },
      { ev: "Campeonato Brasileiro de Equipes CBJJ", d: "Carlson Gracie Team Heavyweight Squad", p: 1, f: "CBJJ", yr: 1996 },
      { ev: "Pan IBJJF Jiu-Jitsu Championship", d: "Master Black Belt Division", p: 2, f: "IBJJF", yr: 2001 }
    ],
    bouts: [{ ev: "Carlson Gracie Legacy & Global Coaching", org: "IBJJF", res: "🏛️ Head Master of Worldwide Carlson Gracie Affiliates", sub: "Classic Carlson Gracie Smash & Top Pressure" }],
    facts: ["Son of Grandmaster Carlson Gracie Sr. (9th-Degree Red Belt) and nephew of Helio Gracie, carrying forward the legendary Rua Figueiredo Magalhães competition lineage worldwide."]
  },
  {
    name: "Carlson Gracie Sr.", aliases: ["carlson gracie sr", "grandmaster carlson gracie", "mestre carlson gracie"], shards: ["gr"],
    academy: "Carlson Gracie Team", belt: "9th Degree Red Belt", rec: "Grandmaster • Undefeated Vale Tudo & BJJ Icon (1932–2006)", feds: ["CBJJ", "VALE TUDO"],
    careerG: 12, careerS: 1, careerB: 0,
    titles: ["🟥 9th-Degree Red Belt Grandmaster", "👑 Undefeated Vale Tudo Champion (Defeated Waldemar Santana)", "🏛️ Founder of the Legendary Carlson Gracie Competition Team"],
    careerPodiums: [
      { ev: "Maracanãzinho Vale Tudo Superfight vs. Waldemar Santana", d: "Openweight Vale Tudo Championship", p: 1, f: "VALE TUDO", yr: 1956 },
      { ev: "Rio de Janeiro Openweight Jiu-Jitsu Championship", d: "Absolute Division", p: 1, f: "CBJJ", yr: 1955 }
    ],
    bouts: [{ ev: "Waldemar Santana Trilogy", org: "VALE TUDO", res: "🏆 Avenged Helio Gracie in front of 40,000 fans at Maracanãzinho", sub: "TKO / Corner Stoppage" }],
    facts: ["Eldest son of Carlos Gracie; revolutionized team-based competition jiu-jitsu and trained champions including Murilo Bustamante, Ricardo De La Riva, Mario Sperry, Vitor Belfort, and Wallid Ismail."]
  },
  {
    name: "Roger Gracie", aliases: ["roger gracie"], shards: ["gr"],
    academy: "Roger Gracie Academy", belt: "Black Belt (Hall of Fame)", rec: "10x IBJJF Black Belt World Champion • ADCC Double Gold", feds: ["IBJJF", "ADCC"],
    careerG: 14, careerS: 5, careerB: 0,
    titles: ["👑 10x IBJJF Black Belt World Champion (3x Open Class)", "🥇 2005 ADCC Weight & Absolute Champion (8/8 Submissions)", "🏛️ IBJJF & ADCC Hall of Fame"],
    careerPodiums: [
      { ev: "World IBJJF Jiu-Jitsu Championship 2010", d: "Male / Adult / Black / Open Class & Super-Heavy", p: 1, f: "IBJJF", yr: 2010 },
      { ev: "World IBJJF Jiu-Jitsu Championship 2009", d: "Male / Adult / Black / Open Class (9/9 Cross-Choke Subs)", p: 1, f: "IBJJF", yr: 2009 },
      { ev: "ADCC Submission Fighting World Championship 2005", d: "-99kg & Absolute Double Gold", p: 1, f: "ADCC", yr: 2005 }
    ],
    bouts: [{ ev: "Buchecha vs. Roger Gracie II (Gracie Pro)", org: "IBJJF", res: "🏆 W via Rear-Naked Choke in Retirement Superfight", sub: "Cross Collar Choke & Mount Mastery" }],
    facts: ["Widely regarded as the greatest Gi competitor of all time, famously submitting all 9 opponents from mount at the 2009 Worlds."]
  },
  {
    name: "Marcus Almeida", aliases: ["buchecha", "bucheche", "marcus buchecha", "marcus vinicius oliveira de almeida"], shards: ["al", "ma"],
    academy: "CheckMat", belt: "Black Belt (Hall of Fame)", rec: "13x IBJJF Black Belt World Champion • 2x ADCC World Champion", feds: ["IBJJF", "ADCC"],
    careerG: 19, careerS: 3, careerB: 2,
    titles: ["👑 13x IBJJF Black Belt World Champion (Record 6x Open Class)", "🥇 2x ADCC World Champion (2013, 2017)", "🏛️ IBJJF Hall of Fame"],
    careerPodiums: [
      { ev: "World IBJJF Jiu-Jitsu Championship 2019", d: "Male / Adult / Black / Ultra-Heavy & Open Class Double Gold", p: 1, f: "IBJJF", yr: 2019 },
      { ev: "World IBJJF Jiu-Jitsu Championship 2018", d: "Male / Adult / Black / Ultra-Heavy & Open Class Double Gold", p: 1, f: "IBJJF", yr: 2018 },
      { ev: "ADCC Submission Fighting World Championship 2017", d: "+99kg World Champion", p: 1, f: "ADCC", yr: 2017 },
      { ev: "World IBJJF Jiu-Jitsu Championship 2016", d: "Male / Adult / Black / Ultra-Heavy & Open Class Double Gold", p: 1, f: "IBJJF", yr: 2016 }
    ],
    bouts: [{ ev: "ADCC World Championship Finals", org: "ADCC", res: "🏆 2x +99kg World Title", sub: "Explosive Double-Leg & Back Takes" }],
    facts: ["Holds the all-time IBJJF record with 13 adult black belt World Championship gold medals."]
  },
  {
    name: "Bruno Bastos", aliases: ["bruno bastos cruz"], shards: ["ba", "cr"],
    academy: "Bruno Bastos Association / LEAD BJJ", belt: "5th Degree Black Belt", rec: "Multiple-Time IBJJF World Master & No-Gi Pan Champion • ADCC Veteran", feds: ["IBJJF", "ADCC"],
    careerG: 12, careerS: 6, careerB: 5,
    titles: ["🥇 Multiple-Time IBJJF World Master & Pan No-Gi Champion", "⚔️ ADCC World Championship Veteran", "🥋 Head Coach — Bruno Bastos Association / LEAD BJJ"],
    careerPodiums: [],
    bouts: [{ ev: "Pro SuperFight & IBJJF Black Belt Circuit", org: "IBJJF / F2W", res: "🏆 Multi-Time Heavyweight & Ultra-Heavy Champion", sub: "Half-Guard Pressure & Kimura Trap" }],
    facts: ["One of the most accomplished active black belt competitors and association leaders in Texas and worldwide."]
  },
  {
    name: "Rickson Gracie", aliases: ["rickson gracie"], shards: ["gr"],
    academy: "Gracie Jiu-Jitsu", belt: "9th Degree Red Belt", rec: "Grandmaster • 1980s Rio & Vale Tudo Legend", feds: ["CBJJ", "VALE TUDO"],
    careerG: 11, careerS: 0, careerB: 0,
    titles: ["🟥 Red Belt Grandmaster", "🥇 2x Vale Tudo Japan Openweight Champion (1994, 1995)", "🏆 Copa Cantão & Brazil Middle-Heavyweight Champion"],
    careerPodiums: [
      { ev: "Vale Tudo Japan Open 1995", d: "8-Man Openweight Tournament", p: 1, f: "VALE TUDO", yr: 1995 },
      { ev: "Vale Tudo Japan Open 1994", d: "8-Man Openweight Tournament", p: 1, f: "VALE TUDO", yr: 1994 }
    ],
    bouts: [{ ev: "PRIDE 1 Main Event (Tokyo Dome)", org: "VALE TUDO", res: "🏆 W vs. Nobuhiko Takada in front of 47,000 fans", sub: "Armbar" }],
    facts: ["Icon of invisible jiu-jitsu and leverage mechanics; undefeated across official Jiu-Jitsu and Vale Tudo bouts."]
  },
  {
    name: "Marcelo Garcia", aliases: ["marcelo garcia", "marcelinho"], shards: ["ga"],
    academy: "Alliance / Marcelo Garcia Academy", belt: "Black Belt (Hall of Fame)", rec: "5x IBJJF World Champion • 4x ADCC World Champion", feds: ["ADCC", "IBJJF"],
    careerG: 9, careerS: 3, careerB: 1,
    titles: ["👑 4x ADCC World Champion (-77kg)", "🥇 5x IBJJF Black Belt World Champion", "🏛️ IBJJF & ADCC Hall of Fame"],
    careerPodiums: [
      { ev: "ADCC Submission Fighting World Championship 2011", d: "-77kg Division", p: 1, f: "ADCC", yr: 2011 },
      { ev: "World IBJJF Jiu-Jitsu Championship 2011", d: "Male / Adult / Black / Middle", p: 1, f: "IBJJF", yr: 2011 },
      { ev: "ADCC Submission Fighting World Championship 2007", d: "-77kg Gold & Absolute Silver", p: 1, f: "ADCC", yr: 2007 }
    ],
    bouts: [{ ev: "ADCC Worlds", org: "ADCC", res: "🔥 Record Submission Rate in -77kg History", sub: "Marcelotine, Butterfly Sweep, X-Guard & Back Take" }],
    facts: ["Pioneered modern No-Gi & Gi middleweight offense with butterfly guard, single-leg X, X-guard, and high-elbow guillotines."]
  },
  {
    name: "Ricardo De La Riva", aliases: ["ricardo de la riva", "de la riva"], shards: ["ri", "la"],
    academy: "Carlson Gracie / De La Riva BJJ", belt: "Coral Belt (7th Degree)", rec: "Coral Belt Master • Creator of the De La Riva Guard", feds: ["CBJJ", "IBJJF"],
    careerG: 5, careerS: 2, careerB: 1,
    titles: ["⬛🟥 7th-Degree Coral Belt under Grandmaster Carlson Gracie Sr.", "🧬 Inventor of the De La Riva Guard", "🏆 Historic Victories over Royler Gracie & Rolker Gracie"],
    careerPodiums: [
      { ev: "Copa Cantão Rio de Janeiro", d: "Black Belt Featherweight", p: 1, f: "CBJJ", yr: 1986 }
    ],
    bouts: [{ ev: "Rio Championship Classic", org: "CBJJ", res: "🏆 Defeated Royler Gracie using revolutionary open guard", sub: "De La Riva Guard Sweeps & Back Attacks" }],
    facts: ["Awarded his Black Belt by Carlson Gracie Sr. in 1986; revolutionized modern open guard play across every weight class."]
  },
  {
    name: "Bruno Bastos", aliases: ["bruno bastos"], shards: ["ba"],
    academy: "Bruno Bastos Association (Midland, TX)", belt: "5th Degree Black Belt", rec: "Multi-Time IBJJF World Master & No-Gi World Champion", feds: ["IBJJF", "ADCC"],
    careerG: 15, careerS: 6, careerB: 4,
    titles: ["🥋 5th-Degree Nova União / Bastos Black Belt", "🥇 Multi-Time IBJJF No-Gi World & Pan Champion", "🏛️ Founder of Bruno Bastos Association (Midland, Texas)"],
    careerPodiums: [
      { ev: "World Master IBJJF Jiu-Jitsu Championship", d: "Male / Master / Black / Ultra-Heavy & Open Class", p: 1, f: "IBJJF", yr: 2022 },
      { ev: "Pan IBJJF Jiu-Jitsu No-Gi Championship", d: "Male / Adult / Black / Ultra-Heavy", p: 1, f: "IBJJF", yr: 2015 }
    ],
    bouts: [{ ev: "ADCC & IBJJF Pro Circuit", org: "IBJJF", res: "🏆 Over 20 Years Competing at Elite Black Belt", sub: "Half Guard & Heavy Top Pressure" }],
    facts: ["Head Professor of Bruno Bastos Association in Midland, Texas and one of the most active Black Belt champions in Texas BJJ."]
  },
  {
    name: "Royce Gracie", aliases: ["royce gracie"], shards: ["gr"],
    academy: "Gracie Jiu-Jitsu", belt: " Coral Belt", rec: "3x UFC Tournament Champion • UFC Hall of Fame", feds: ["UFC", "VALE TUDO"],
    careerG: 4, careerS: 0, careerB: 0,
    titles: ["🏆 UFC 1, UFC 2 & UFC 4 Openweight Tournament Champion", "🏛️ Inaugural UFC Hall of Fame Inductee"],
    careerPodiums: [
      { ev: "UFC 1: The Beginning (1993)", d: "Openweight No-Rules Tournament", p: 1, f: "UFC", yr: 1993 },
      { ev: "UFC 2: No Way Out (1994)", d: "16-Man Openweight Tournament", p: 1, f: "UFC", yr: 1994 }
    ],
    bouts: [{ ev: "UFC 1–4", org: "UFC", res: "🔥 11 Consecutive Submission Wins Introducing BJJ to the World", sub: "Triangle Choke & Rear-Naked Choke" }],
    facts: ["Proved the effectiveness of Brazilian Jiu-Jitsu against larger opponents from every martial art on global television in 1993."]
  },
  {
    name: "Renzo Gracie", aliases: ["renzo gracie"], shards: ["gr"],
    academy: "Renzo Gracie Academy", belt: "Coral Belt (7th Degree)", rec: "2x ADCC World Champion • Legendary Coach", feds: ["ADCC", "IBJJF"],
    careerG: 4, careerS: 1, careerB: 1,
    titles: ["🥇 2x ADCC Submission Fighting World Champion (1998, 2000)", "🏛️ ADCC Hall of Fame & Mentor to Champions"],
    careerPodiums: [
      { ev: "ADCC Submission Fighting World Championship 2000", d: "-77kg Division", p: 1, f: "ADCC", yr: 2000 },
      { ev: "ADCC Submission Fighting World Championship 1998", d: "-77kg Division", p: 1, f: "ADCC", yr: 1998 }
    ],
    bouts: [{ ev: "ADCC Worlds", org: "ADCC", res: "🏆 Back-to-Back ADCC Gold & Legendary NYC Academy Builder", sub: "Guillotine & Armbar" }],
    facts: ["Built one of the most influential academies in grappling history in New York City, mentoring John Danaher, Georges St-Pierre, Matt Serra, and Gordon Ryan."]
  },
  {
    name: "Andre Galvao", aliases: ["andre galvao"], shards: ["ga"],
    academy: "Atos Jiu-Jitsu HQ", belt: "Black Belt (Hall of Fame)", rec: "6x ADCC Champion • 5x IBJJF Black Belt World Champion", feds: ["ADCC", "IBJJF"],
    careerG: 15, careerS: 4, careerB: 2,
    titles: ["👑 6x ADCC World & Superfight Champion (4-Time Undefeated Superfight King)", "🥇 5x IBJJF Black Belt World Champion", "🏛️ Co-Founder of Atos Jiu-Jitsu HQ"],
    careerPodiums: [
      { ev: "ADCC World Championship Superfight 2019", d: "Superfight Championship vs. Felipe Pena", p: 1, f: "ADCC", yr: 2019 },
      { ev: "ADCC Submission Fighting World Championship 2011", d: "-88kg & Absolute Double Gold", p: 1, f: "ADCC", yr: 2011 },
      { ev: "World IBJJF Jiu-Jitsu Championship 2017", d: "Male / Adult / Black / Medium-Heavy", p: 1, f: "IBJJF", yr: 2017 }
    ],
    bouts: [{ ev: "ADCC Superfight Dynasty", org: "ADCC", res: "🏆 Held ADCC Superfight Title from 2011 to 2022", sub: "Takedowns & Dynamic Back Attacks" }],
    facts: ["Co-founded Atos Jiu-Jitsu with Angelica Galvao in San Diego, developing world champions across both Youth and Adult ranks."]
  },
  {
    name: "Gordon Ryan", aliases: ["gordon ryan", "the king gordon ryan"], shards: ["ry"],
    academy: "New Wave Jiu-Jitsu", belt: "Black Belt", rec: "7x ADCC World Champion • IBJJF No-Gi Double Gold", feds: ["ADCC", "IBJJF", "WNO"],
    careerG: 11, careerS: 1, careerB: 0,
    titles: ["👑 7x ADCC World & Superfight Champion across 3 Weight Classes + Absolute", "🥇 IBJJF No-Gi World & Pan Double Gold"],
    careerPodiums: [
      { ev: "ADCC World Championship 2024", d: "Double Superfight Winner (vs. Pena & Yuri Simoes)", p: 1, f: "ADCC", yr: 2024 },
      { ev: "ADCC World Championship 2022", d: "+99kg Gold & Superfight Gold vs. Andre Galvao", p: 1, f: "ADCC", yr: 2022 },
      { ev: "ADCC World Championship 2019", d: "-99kg & Absolute Double Gold", p: 1, f: "ADCC", yr: 2019 }
    ],
    bouts: [{ ev: "ADCC 2022 Historic Double", org: "ADCC", res: "🏆 Won +99kg Bracket + Fastest Submission in ADCC Superfight History", sub: "Rear-Naked Choke & Heel Hook" }],
    facts: ["Only grappler in ADCC history to win gold across three different weight divisions (-88kg, -99kg, +99kg), the Absolute, and the Superfight."]
  },
  {
    name: "Thiago Mendes", aliases: ["professor thiago mendes", "thiago mendes barros"], shards: ["me", "ba"], academy: "Carlson Gracie San Antonio / TM Combat Academy", belt: "3rd Degree Black Belt", rec: "Head Professor • Carlson Gracie Lineage", feds: ["IBJJF", "ADCC", "JJWL"],
    titles: ["🥋 3rd-Degree Carlson Gracie Black Belt", "🏛️ Head Professor — Carlson Gracie San Antonio & TM Combat Academy"],
    bouts: [{ ev: "Championship Coaching Corner", org: "IBJJF", res: "🏆 Multi-Federation Youth & Adult Medalists", sub: "Rio de Janeiro Old-School Pressure + Modern Competition Prep" }],
    facts: ["3rd-degree black belt with deep Rio de Janeiro Carlson Gracie roots leading San Antonio's championship youth and adult squad"]
  },
  {
    name: "Cali Grounds", aliases: ["cali grounds"], shards: ["gr"], academy: "360 Jiu Jitsu / All American MMA", belt: "Youth Grey/Yellow", rec: "ADCC Youth Worlds Absolute Finalist", feds: ["ADCC", "SMOOTHCOMP"],
    titles: ["🥈 ADCC Youth Worlds Absolute Finalist", "⚡ Top National Girls 11–12 Advanced Competitor"],
    bouts: [{ ev: "ADCC Youth Worlds & ADCC US Open Austin", org: "ADCC", res: "🔥 Girls 11–12 yrs Advanced Division Standout", sub: "No-Gi Submission Specialist" }],
    facts: ["Featured in the ADCC Youth Worlds Absolute Final against Bailey Heinsohn"]
  },
  {
    name: "Bailey Heinsohn", aliases: ["bailey henson", "bailey heinsohn"], shards: ["he"], academy: "Art of Jiu Jitsu (AOJ)", belt: "Youth Grey/Orange", rec: "ADCC Austin Open Gold Medalist", feds: ["ADCC", "IBJJF"],
    titles: ["🥇 2026 ADCC US Open Austin Champion", "👑 ADCC Youth Worlds Standout"],
    bouts: [{ ev: "ADCC US Open - Austin, TX", org: "ADCC", res: "🥇 Gold Medalist", sub: "Art of Jiu Jitsu Youth Phenom" }],
    facts: ["Represents Art of Jiu Jitsu (AOJ) on the national ADCC and IBJJF youth circuit"]
  },
  {
    name: "Cassia Moura", aliases: ["cassia remesar moura"], shards: ["mo"], academy: "LEAD BJJ", belt: "Black Belt", rec: "Champ-Champ • 6-0 at Meta APEX", feds: ["UFC", "IBJJF"],
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
    name: "Tainan Dalpra", aliases: ["tainan dalpra costa"], shards: ["da", "co"], academy: "Art of Jiu Jitsu (AOJ)", belt: "Black Belt", rec: "Multi-Time IBJJF World Champion", feds: ["IBJJF", "SUPERFIGHT"],
    titles: ["👑 2x IBJJF World Champion", "👑 IBJJF Pan & European Champion"],
    bouts: [{ ev: "IBJJF World Championship", org: "IBJJF", res: "🥇 Middleweight World Gold", sub: "AOJ Flagship Champion" }],
    facts: ["Moved from Brazil to Costa Mesa as a teen phenom under Guilherme & Rafael Mendes at Art of Jiu Jitsu"]
  },
  {
    name: "Mica Galvao", aliases: ["micael ferreira galvao", "micael galvao"], shards: ["ga"], academy: "Melqui Galvão Jiu-Jitsu", belt: "Black Belt", rec: "Super-Grand Slam World Champion", feds: ["IBJJF", "ADCC", "SUPERFIGHT"],
    titles: ["👑 2024/2026 Super Grand Slam Champion", "👑 ADCC World Champion (77kg)", "👑 IBJJF World Champion"],
    bouts: [{ ev: "ADCC & IBJJF Worlds", org: "ADCC", res: "🥇 Historic Golden Grand Slam", sub: "Euros • Pans • Brasileiro • Worlds • ADCC" }],
    facts: ["Youngest athlete in history to win Euros, Pans, Brasileiro, IBJJF Worlds, and ADCC Worlds in the same calendar year"]
  },
  {
    name: "Gabrieli Pessanha", aliases: ["gabi pessanha", "gabrieli pessanha marinho"], shards: ["pe", "ma"], academy: "Infight JJ", belt: "Black Belt", rec: "Multi-Time Double-Gold World Champion", feds: ["IBJJF", "SUPERFIGHT"],
    titles: ["👑 Multi-Time IBJJF Double-Gold World Champion", "👑 Multi-Time Super Grand Slam Winner"],
    bouts: [{ ev: "IBJJF World Championship", org: "IBJJF", res: "🥇🥇 Super-Heavy & Open Class Gold", sub: "Dominant Pound-for-Pound Gi Streak" }],
    facts: ["Holds the longest modern double-gold championship streak in women's black belt Jiu-Jitsu history"]
  },
  {
    name: "Diego Oliveira", aliases: ["diego pato", "diego pato oliveira", "diego oliveira batista"], shards: ["ol", "ba", "pa"], academy: "Art of Jiu Jitsu (AOJ)", belt: "Black Belt", rec: "ADCC & IBJJF World Champion", feds: ["ADCC", "IBJJF", "SUPERFIGHT"],
    titles: ["👑 ADCC World Champion (-66kg)", "👑 IBJJF World & Pan Champion"],
    bouts: [{ ev: "ADCC World Championship", org: "ADCC", res: "🥇 -66kg World Gold", sub: "Submission Hunter" }],
    facts: ["Known worldwide as 'Pato' for his lethal leg locks and back-takes across both Gi and No-Gi"]
  },
  {
    name: "Fabricio Andrey", aliases: ["hokage", "fabricio andrey batista", "fabricio andrey batista junior"], shards: ["an", "ba"], academy: "Melqui Galvão / Alliance", belt: "Black Belt", rec: "IBJJF World & ADCC Trials Champion", feds: ["IBJJF", "ADCC", "SUPERFIGHT"],
    titles: ["👑 IBJJF World Featherweight Champion", "⚡ Viral Flying Submission Specialist"],
    bouts: [{ ev: "IBJJF & SuperFight Circuit", org: "IBJJF", res: "🥇 Featherweight Gold", sub: "'Hokage' Highlight-Reel Takedowns" }],
    facts: ["Nicknamed 'Hokage' for explosive flying armbars, uchi-matas, and relentless pace"]
  },
  {
    name: "Gordon Ryan", aliases: ["king ryan"], shards: ["ry"], academy: "New Wave Jiu-Jitsu", belt: "Black Belt", rec: "6x ADCC World Champion", feds: ["ADCC", "SUPERFIGHT"],
    titles: ["👑 6x ADCC World Champion", "👑 WNO Heavyweight Champion"],
    bouts: [{ ev: "ADCC World Superfight", org: "ADCC", res: "🥇 Superfight World Champion", sub: "Undisputed No-Gi King" }],
    facts: ["Only grappler in ADCC history to win gold across three different weight divisions plus the Superfight title"]
  },
  {
    name: "Mikey Musumeci", aliases: ["darth rigatoni", "michael musumeci"], shards: ["mu"], academy: " UFC BJJ / Cobrinha", belt: "Black Belt", rec: "5x IBJJF World Champ • UFC BJJ Champ", feds: ["UFC", "IBJJF", "SUPERFIGHT"],
    titles: ["👑 UFC BJJ Bantamweight Champion", "👑 5x IBJJF Black Belt World Champion"],
    bouts: [{ ev: "UFC BJJ", org: "UFC", res: "🥇 World Title Victory", sub: "Leg-Lock Precision" }],
    facts: ["First American-born male grappler to win five IBJJF Black Belt World Championships"]
  },
  {
    name: "Andrew Tackett", aliases: ["andrew tackett"], shards: ["ta"], academy: "Brazilian Fight Factory", belt: "Black Belt", rec: "UFC BJJ Welterweight World Champion", feds: ["UFC", "ADCC", "SUPERFIGHT"],
    titles: ["👑 UFC BJJ Welterweight World Champion", "⚡ CJI & ADCC Knockout Pace"],
    bouts: [{ ev: "UFC BJJ 14", org: "UFC", res: "Welterweight Title Main Event", sub: "Austin, TX Standout" }],
    facts: ["Austin-raised submission machine renowned for non-stop wrestling scrambles and front-headlock finishes"]
  },
  {
    name: "William Tackett", aliases: ["will tackett"], shards: ["ta"], academy: "Brazilian Fight Factory", belt: "Black Belt", rec: "ADCC Trials & Superfight Star", feds: ["ADCC", "UFC", "SUPERFIGHT"],
    titles: ["👑 WNO & Invitational Main Eventer", "🥇 ADCC North American Trials Winner"],
    bouts: [{ ev: "Pro No-Gi Circuit", org: "ADCC", res: "🥇 Main Event Winner", sub: "Brazilian Fight Factory Headliner" }],
    facts: ["Co-leads Austin's Brazilian Fight Factory competition room alongside brother Andrew Tackett"]
  },
  {
    name: "Kade Ruotolo", aliases: ["kade ruotolo"], shards: ["ru"], academy: "Atos", belt: "Black Belt", rec: "ADCC & CJI Million-Dollar Champion", feds: ["ADCC", "SUPERFIGHT"],
    titles: ["👑 CJI -80kg $1M Champion", "👑 Youngest ADCC World Champion (77kg)"],
    bouts: [{ ev: "Craig Jones Invitational", org: "SUPERFIGHT", res: "🥇 $1,000,000 Tournament Winner", sub: "4 Wins in One Night" }],
    facts: ["Became the youngest ADCC World Champion in history at age 19 before winning the inaugural CJI -80kg title"]
  },
  {
    name: "Tye Ruotolo", aliases: ["tye ruotolo"], shards: ["ru"], academy: "Atos", belt: "Black Belt", rec: "IBJJF World Champion & ADCC Medalist", feds: ["IBJJF", "ADCC", "SUPERFIGHT"],
    titles: ["👑 IBJJF Black Belt World Champion", "🥉 ADCC Absolute Medalist"],
    bouts: [{ ev: "IBJJF & Pro Grappling", org: "IBJJF", res: "🥇 World Title", sub: "D'Arce & Passing Pressure" }],
    facts: ["Entered the ADCC Absolute division as a lightweight and submitted super-heavyweights on the world stage"]
  },
  {
    name: "Adele Fornarino", aliases: ["adele fornarino"], shards: ["fo"], academy: "Dominance MMA", belt: "Black Belt", rec: "Double-Gold ADCC World Champion", feds: ["ADCC", "UFC", "SUPERFIGHT"],
    titles: ["👑 2024 ADCC Double-Gold Champion (-55kg & Absolute)", "⚡ UFC BJJ Title Challenger"],
    bouts: [{ ev: "ADCC World Championship", org: "ADCC", res: "🥇🥇 Weight & Absolute Gold", sub: "Australian Submission Ace" }],
    facts: ["Won both under-55kg and the Women's Absolute division at ADCC Worlds out of Melbourne, Australia"]
  },
  {
    name: "Ffion Davies", aliases: ["ffion davies"], shards: ["da"], academy: "ECJJA / Atos", belt: "Black Belt", rec: "ADCC & IBJJF World Champion", feds: ["ADCC", "IBJJF", "SUPERFIGHT"],
    titles: ["👑 2x ADCC World Champion", "👑 2x IBJJF Black Belt World Champion"],
    bouts: [{ ev: "ADCC & IBJJF Worlds", org: "ADCC", res: "🥇 World Gold", sub: "First Welsh BJJ & ADCC World Champ" }],
    facts: ["Former junior international judoka for Wales before conquering both Gi and No-Gi world titles"]
  },
  {
    name: "Cole Abate", aliases: ["ice cole", "cole abate"], shards: ["ab"], academy: "Art of Jiu Jitsu (AOJ)", belt: "Black Belt", rec: "IBJJF World & ADCC Trials Champion", feds: ["IBJJF", "ADCC"],
    titles: ["👑 IBJJF Black Belt Champion", "🥇 Youngest ADCC North American Trials Winner (Age 16)"],
    bouts: [{ ev: "IBJJF Major Circuit", org: "IBJJF", res: "🥇 Featherweight Gold", sub: "AOJ Black Belt Standout" }],
    facts: ["Texas-born prodigy who won ADCC Trials at age 16 as a juvenile blue belt"]
  },
  {
    name: "Dorian Olivarez", aliases: ["dorian olivarez"], shards: ["ol"], academy: "B-Team / Wrestling", belt: "Brown/Black", rec: "ADCC Trials Champion", feds: ["ADCC", "SUPERFIGHT"],
    titles: ["🥇 ADCC East Coast Trials Champion", "⚡ Relentless Wrestling Pace"],
    bouts: [{ ev: "ADCC Trials & Pro SuperFights", org: "ADCC", res: "🥇 Gold", sub: "San Antonio / Texas Native Phenom" }],
    facts: ["Texas-born wrestling & grappling dynamo famous for exhausting world-class black belts with nonstop takedown chains"]
  },
  {
    name: "Sarah Galvao", aliases: ["sarah galvao"], shards: ["ga"], academy: "Atos HQ", belt: "Brown/Black", rec: "Grand Slam Champion", feds: ["IBJJF", "ADCC"],
    titles: ["👑 Multi-Time IBJJF World, Pan & Euro Champion"],
    bouts: [{ ev: "IBJJF Grand Slam", org: "IBJJF", res: "🥇 Division & Open Class Gold", sub: "Atos San Diego Standout" }],
    facts: ["Daughter of Andre & Angelica Galvão continuing the Atos HQ championship legacy"]
  },
  {
    name: "Nicholas Meregali", aliases: ["meregali"], shards: ["me"], academy: "New Wave Jiu-Jitsu", belt: "Black Belt", rec: "3x IBJJF World Champion & ADCC Medalist", feds: ["IBJJF", "ADCC", "SUPERFIGHT"],
    titles: ["👑 3x IBJJF Black Belt World Champion", "🥈🥉 ADCC Double Medalist"],
    bouts: [{ ev: "IBJJF Worlds & WNO", org: "IBJJF", res: "🥇 Heavyweight & Open Gold", sub: "90%+ Submission Rate" }],
    facts: ["Renowned for one of the highest collar-choke and submission finishing rates in modern heavyweight history"]
  },
  {
    name: "Kaynan Duarte", aliases: ["kaynan duarte"], shards: ["du"], academy: "Atos HQ", belt: "Black Belt", rec: "3x ADCC World Champion & IBJJF Champ", feds: ["ADCC", "IBJJF"],
    titles: ["👑 2024 ADCC Double-Gold Champion (-99kg & Absolute)", "👑 2x IBJJF World Champion"],
    bouts: [{ ev: "ADCC Worlds", org: "ADCC", res: "🥇🥇 Double Gold", sub: "Submitted Every Opponent in Absolute" }],
    facts: ["Captured double gold at ADCC 2024 with an extraordinary submission streak across -99kg and Absolute"]
  },
  {
    name: "Erich Munis", aliases: ["erich munis dos santos"], shards: ["mu", "sa"], academy: "Fratres JJ", belt: "Black Belt", rec: "5x IBJJF Black Belt World Champion", feds: ["IBJJF", "SUPERFIGHT"],
    titles: ["👑 5x IBJJF Black Belt World Champion", "👑 Crown Heavyweight Winner"],
    bouts: [{ ev: "IBJJF World Championship", org: "IBJJF", res: "🥇 Super-Heavy & Absolute Gold", sub: "Modern Gi Legend" }],
    facts: ["Multiple-time IBJJF Male Black Belt Athlete of the Year"]
  },
  {
    name: "Fellipe Andrew", aliases: ["fellipe andrew leandro silva", "fellipe andrew silva"], shards: ["an", "si"], academy: "Alliance", belt: "Black Belt", rec: "IBJJF World, Pan & Euro Champion", feds: ["IBJJF", "UFC"],
    titles: ["👑 Multi-Time IBJJF Pan & European Open Class Champion"],
    bouts: [{ ev: "IBJJF Majors", org: "IBJJF", res: "🥇 Gold", sub: "Fastest Triangle in Heavyweight BJJ" }],
    facts: ["Holds dozens of IBJJF major gold medals with signature footlocks and flying triangles"]
  },
  {
    name: "Victor Hugo", aliases: ["victor hugo costa marques"], shards: ["hu", "ma"], academy: "Six Blades Jiu-Jitsu", belt: "Black Belt", rec: "Double-Gold IBJJF World Champion", feds: ["IBJJF", "ADCC"],
    titles: ["👑 IBJJF Double-Gold World Champion (Ultra-Heavy & Absolute)"],
    bouts: [{ ev: "IBJJF Worlds", org: "IBJJF", res: "🥇🥇 Double Gold", sub: "Six Blades Austin Flagship" }],
    facts: ["Trains in Austin, Texas under Xande Ribeiro at Six Blades HQ"]
  },
  {
    name: "Adam Wardzinski", aliases: ["wardzinski"], shards: ["wa"], academy: "Checkmat", belt: "Black Belt", rec: "IBJJF World, Pan & Euro Champion", feds: ["IBJJF"],
    titles: ["👑 IBJJF Heavyweight World Champion", "🦋 Modern Butterfly Guard King"],
    bouts: [{ ev: "IBJJF World Championship", org: "IBJJF", res: "🥇 Heavyweight Gold", sub: "First Polish Male Black Belt World Champ" }],
    facts: ["Revived classic old-school butterfly hook sweeps to win IBJJF Worlds, Pans, and Europeans"]
  },
  {
    name: "Mayssa Bastos", aliases: ["mayssa caldas pereira bastos"], shards: ["ba"], academy: "Art of Jiu Jitsu (AOJ)", belt: "Black Belt", rec: "9x IBJJF World Champion", feds: ["IBJJF", "SUPERFIGHT"],
    titles: ["👑 9x IBJJF Roosterweight World Champion"],
    bouts: [{ ev: "IBJJF World Championship", org: "IBJJF", res: "🥇 Roosterweight World Gold", sub: "Pound-for-Pound Gi Icon" }],
    facts: ["Most decorated roosterweight champion in IBJJF history"]
  },
  {
    name: "Diogo Reis", aliases: ["baby shark", "diogo baby shark reis"], shards: ["re"], academy: "Melqui Galvão Jiu-Jitsu", belt: "Black Belt", rec: "2x ADCC World Champion (-66kg)", feds: ["ADCC", "IBJJF"],
    titles: ["👑 2x ADCC World Champion (-66kg)"],
    bouts: [{ ev: "ADCC World Championship", org: "ADCC", res: "🥇 Back-to-Back -66kg Gold", sub: "Manaus Prodigy" }],
    facts: ["Known globally as 'Baby Shark', winning consecutive ADCC -66kg World Titles"]
  },
  {
    name: "Giancarlo Bodoni", aliases: ["bodoni"], shards: ["bo"], academy: "New Wave Jiu-Jitsu", belt: "Black Belt", rec: "2x ADCC World Champion (-88kg)", feds: ["ADCC", "SUPERFIGHT"],
    titles: ["👑 2x ADCC World Champion (-88kg)"],
    bouts: [{ ev: "ADCC World Championship", org: "ADCC", res: "🥇 Back-to-Back -88kg Gold", sub: "Austin, TX Resident Champion" }],
    facts: ["Captured consecutive -88kg ADCC World Championships out of Austin, Texas"]
  },
  {
    name: "Jozef Chen", aliases: ["jozef chen"], shards: ["ch"], academy: "B-Team", belt: "Black Belt", rec: "ADCC Trials Champ & CJI Finalist", feds: ["ADCC", "SUPERFIGHT"],
    titles: ["🥇 ADCC European Trials Champion", "⚡ CJI Semifinalist"],
    bouts: [{ ev: "CJI & Polaris", org: "SUPERFIGHT", res: "🔥 Fan-Favorite Pass Specialist", sub: "Tripod Passing Innovator" }],
    facts: ["Studied modern grappling tape to reach world-elite No-Gi status within five years of starting BJJ"]
  },
  {
    name: "Levi Jones-Leary", aliases: ["levi jones leary"], shards: ["jo", "le"], academy: "Subversion BJJ", belt: "Black Belt", rec: "CJI $1M Finalist & IBJJF Pan Champ", feds: ["IBJJF", "SUPERFIGHT"],
    titles: ["🥈 CJI -80kg Finalist", "👑 IBJJF Pan Champion"],
    bouts: [{ ev: "Craig Jones Invitational", org: "SUPERFIGHT", res: "🥈 Legendary 5-Round Final vs. Kade Ruotolo", sub: "Impenetrable Guard Retention" }],
    facts: ["Australian black belt famous for one of the most unpassable open guards in Jiu-Jitsu"]
  },
  {
    name: "Craig Jones", aliases: ["craig jones"], shards: ["jo"], academy: "B-Team", belt: "Black Belt", rec: "2x ADCC Silver Medalist & CJI Creator", feds: ["ADCC", "SUPERFIGHT"],
    titles: ["⚡ 2x ADCC World Finalist", "👑 Polaris Multi-Division Champion"],
    bouts: [{ ev: "CJI Superfight", org: "SUPERFIGHT", res: "🥇 Main Event Submission", sub: "Austin B-Team Co-Founder" }],
    facts: ["Co-founded B-Team in Austin, Texas and created the million-dollar Craig Jones Invitational"]
  },
  {
    name: "Brianna Ste-Marie", aliases: ["brianna ste marie"], shards: ["st", "ma"], academy: "Brazilian Top Team", belt: "Black Belt", rec: "ADCC World Finalist & IBJJF World Champ", feds: ["ADCC", "IBJJF", "UFC"],
    titles: ["👑 IBJJF No-Gi World Champion", "🥈 ADCC World Silver Medalist"],
    bouts: [{ ev: "ADCC & UFC BJJ", org: "ADCC", res: "🏅 Podium & Title Contender", sub: "Canadian Grappling Star" }],
    facts: ["Holds multiple world-level medals across ADCC, IBJJF, and UFC Fight Pass Invitational"]
  },
  {
    name: "Roberto Jimenez", aliases: ["roberto jimenez"], shards: ["ji"], academy: "Studio 76", belt: "Black Belt", rec: "WNO Champion & Worlds Finalist", feds: ["IBJJF", "ADCC", "SUPERFIGHT"],
    titles: ["👑 WNO Champion", "👑 Polaris Champion"],
    bouts: [{ ev: "Pro Grappling Main Events", org: "SUPERFIGHT", res: "🥇 Back-Take Submission Specialist", sub: "Texas Fan Favorite" }],
    facts: ["Raised in Texas and revered for hunting the submission from opening bell to finish"]
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

// Phonetic + edit-distance tolerance so misspellings like "Henson" match "Heinsohn"!
const phoneticFold = (w) => foldStr(w)
  .replace(/[^a-z0-9]/g, "")
  .replace(/sohn$/g, "son")
  .replace(/sen$/g, "son")
  .replace(/ph/g, "f")
  .replace(/([a-z])\1+/g, "$1")
  .replace(/[aeiouy]+/g, "a");

const editDistMax2 = (a, b) => {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 9;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
};

const nameStopWords = new Set(["de", "da", "do", "dos", "das", "del", "jr", "sr", "ii", "iii", "iv", "filho", "neto", "professor", "prof", "coach"]);
const sigNameTokens = (nm) => foldStr(nm).split(/[\s-]+/).map(t => t.replace(/[^a-z0-9]/g, "")).filter(t => t.length >= 2 && !nameStopWords.has(t));

const _PRO_EXACT_MAP = new Map();
const _PRO_FIRST_MAP = new Map();
PRO_SUPERFIGHTS.forEach(p => {
  const pf = foldStr(p.name);
  _PRO_EXACT_MAP.set(pf, p);
  (p.aliases || []).forEach(al => _PRO_EXACT_MAP.set(foldStr(al), p));
  const pToks = sigNameTokens(p.name);
  if (pToks.length >= 2) {
    if (!_PRO_FIRST_MAP.has(pToks[0])) _PRO_FIRST_MAP.set(pToks[0], []);
    _PRO_FIRST_MAP.get(pToks[0]).push({ p, surnames: new Set(pToks.slice(1)) });
  }
});

export const findProAthlete = (nm) => {
  if (!nm) return null;
  const f = foldStr(nm).replace(/\b(jr\.?|sr\.?|ii|iii|iv|professor|prof\.?|coach)\b/g, " ").replace(/\s+/g, " ").trim();
  if (!f) return null;
  if (_PRO_EXACT_MAP.has(f)) return _PRO_EXACT_MAP.get(f);
  const fToks = sigNameTokens(nm);
  if (fToks.length >= 2 && _PRO_FIRST_MAP.has(fToks[0])) {
    for (const cand of _PRO_FIRST_MAP.get(fToks[0])) {
      if (fToks.slice(1).some(st => cand.surnames.has(st))) return cand.p;
    }
  }
  return null;
};

const COMPOUND_SHARD_HINTS = {
  dalpra: ["co", "da"], pessanha: ["ma", "pe"], pato: ["ba", "ol"],
  hokage: ["ba", "an"], andrey: ["ba", "an"], munis: ["sa", "mu"],
  andrew: ["si", "an"], hugo: ["ma", "hu"], bastos: ["ba"],
  moura: ["mo", "re"], galvao: ["ga"], babyshark: ["re"],
  mendes: ["me", "ba", "pa"], henson: ["he"], heinsohn: ["he"], grounds: ["gr"]
};

let _nickCacheQ = null, _nickCacheRes = [];
export const resolveNicknameHit = (q) => {
  const qf = foldStr(q || "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  if (qf.length < 3) return [];
  if (_nickCacheQ === qf) return _nickCacheRes;
  const pQf = phoneticFold(qf);
  const scored = [];
  for (let i = 0; i < BJJ_HEROES_NICKNAMES.length; i++) {
    const x = BJJ_HEROES_NICKNAMES[i];
    const nkf = foldStr(x.nk || "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    if (!nkf) continue;
    let sc = 0;
    if (nkf === qf) sc = 100;
    else if (qf.length >= 5 && nkf.startsWith(qf)) sc = 85;
    else if (qf.length >= 5 && nkf.includes(qf)) sc = 75;
    else if (qf.length >= 5 && nkf[0] === qf[0] && Math.abs(nkf.length - qf.length) <= 2) {
      const ed = editDistMax2(nkf.replace(/\s+/g, ""), qf.replace(/\s+/g, ""));
      const maxEd = qf.length >= 7 ? 2 : 1;
      if (ed <= maxEd && (ed <= 1 || phoneticFold(nkf) === pQf)) sc = 70 - ed * 10;
    }
    if (sc > 0) scored.push({ x, sc });
  }
  scored.sort((a, b) => b.sc - a.sc);
  _nickCacheQ = qf;
  _nickCacheRes = scored.slice(0, 6).map(s => s.x);
  return _nickCacheRes;
};

const _STOP_NM = new Set(["de", "da", "do", "dos", "das", "del", "jr", "sr", "ii", "iii", "iv", "filho", "neto"]);
const _sigToks = (s) => foldStr(s || "").replace(/[^a-z\s]/g, " ").trim().split(/\s+/).filter(w => w.length >= 2 && !_STOP_NM.has(w));

export const fastNicknameRowMatch = (nf, qFold) => {
  if (!nf || !qFold || qFold.length < 3) return false;
  const hits = resolveNicknameHit(qFold);
  if (!hits.length) return false;
  const rToks = _sigToks(nf);
  if (rToks.length < 2) return false;
  for (let i = 0; i < hits.length; i++) {
    const cands = [hits[i].n, ...(hits[i].al || [])];
    for (let c = 0; c < cands.length; c++) {
      const hToks = _sigToks(cands[c]);
      if (hToks.length >= 2 && rToks[0] === hToks[0]) {
        let pos = 1, ok = true;
        for (let k = 1; k < hToks.length; k++) {
          const idx = rToks.indexOf(hToks[k], pos);
          if (idx === -1) { ok = false; break; }
          pos = idx + 1;
        }
        if (ok) return true;
      }
    }
  }
  return false;
};

export const athBucketsForQuery = (q) => {
  const clean = foldStr(q).replace(/\b(jr\.?|sr\.?|ii|iii|iv|professor|prof\.?|coach)\b/g, " ").trim();
  if (clean.length < 2) return [];
  const words = clean.split(/[\s-]+/).map(w => w.replace(/[^a-z]/g, "")).filter(w => w.length >= 2);
  const set = new Set();
  // Put resolved nickname real-name shards FIRST (surname shard first!) so .slice() never drops them!
  resolveNicknameHit(clean).slice(0, 2).forEach(hit => {
    [hit.n, ...(hit.al || [])].forEach(nm => {
      const t = _sigToks(nm);
      if (t.length) { set.add(t[t.length - 1].slice(0, 2)); if (t.length > 1) set.add(t[0].slice(0, 2)); }
    });
  });
  words.slice().reverse().forEach(w => set.add(w.slice(0, 2)));
  words.forEach(w => {
    if (COMPOUND_SHARD_HINTS[w]) COMPOUND_SHARD_HINTS[w].forEach(s => set.add(s));
  });
  PRO_SUPERFIGHTS.forEach(p => {
    const blob = foldStr(p.name + " " + (p.aliases || []).join(" ") + " " + p.academy);
    if (words.some(w => w.length >= 4 && blob.includes(w))) {
      (p.shards || [athBucket(p.name)]).forEach(s => { if (s && s !== "__") set.add(s); });
    }
  });
  return Array.from(set).filter(s => s && s.length === 2 && s !== "__").slice(0, 6);
};

export const matchesYouthInitial = (abbrevOrFullA, fullOrAbbrevB) => {
  const a = foldStr(abbrevOrFullA).trim(), b = foldStr(fullOrAbbrevB).trim();
  const mA = a.match(/^([a-z])\.\s+([a-z]{3,})$/);
  const mB = b.match(/^([a-z])\.\s+([a-z]{3,})$/);
  if (mA && !mB) {
    const bw = b.split(/\s+/).filter(Boolean);
    return bw.length >= 2 && bw[0][0] === mA[1] && bw[bw.length - 1] === mA[2];
  }
  if (mB && !mA) {
    const aw = a.split(/\s+/).filter(Boolean);
    return aw.length >= 2 && aw[0][0] === mB[1] && aw[aw.length - 1] === mB[2];
  }
  return false;
};

export const smartAthleteMatch = (candName, candAcad, queryStr, extraNick = "") => {
  if (matchesYouthInitial(candName, queryStr)) return true;
  const qClean = foldStr(queryStr).replace(/\b(professor|prof\.?|coach)\b/g, " ").replace(/\s+/g, " ").trim();
  if (qClean.length < 2) return false;
  const qTerms = qClean.split(/\s+/).filter(Boolean);
  const pro = findProAthlete(candName);
  const blob = foldStr(
    (candName || "") + " " +
    (extraNick || "") + " " +
    (candAcad || "") + " " +
    (pro ? (pro.name + " " + (pro.aliases || []).join(" ") + " " + pro.academy) : "")
  );
  const blobWords = blob.split(/[\s/"'()-]+/).filter(Boolean);
  return qTerms.every(qt => {
    if (blob.includes(qt)) return true;
    if (blobWords.some(bw => bw.startsWith(qt) || (qt.length >= 4 && qt.startsWith(bw) && bw.length >= 4))) return true;
    // Fuzzy/phonetic surname match (e.g. "henson" -> "heinsohn")
    if (qt.length >= 4) {
      const pQt = phoneticFold(qt);
      return blobWords.some(bw => bw.length >= 4 && bw[0] === qt[0] && (phoneticFold(bw) === pQt || editDistMax2(bw, qt) <= (qt.length >= 6 ? 2 : 1)));
    }
    return false;
  });
};

export const canonicalPersonKey = (nm, acad) => {
  const pro = findProAthlete(nm);
  if (pro) return "pro:" + foldStr(pro.name);
  const toks = sigNameTokens(nm);
  if (toks.length >= 2) return toks[0] + "|" + toks[toks.length - 1];
  return foldStr(nm) + "|" + foldStr(acad || "").slice(0, 10);
};

// Merge helper for lists: collapses compound-surname variants like "John Silva" + "John Silva Santos" on the same/compatible team!
const AMBIGUOUS_4STEMS = new Set([
  "mari", "chri", "dani", "alex", "mich", "jenn", "kris", "step",
  "bran", "will", "john", "jona", "juli", "caro", "andr", "anto",
  "gabri", "nich", "robe", "rich", "patr", "vict", "saman", "eliz"
]);
function hasUncommonDiminutiveStem(f1, f2) {
  if (!f1 || !f2) return false;
  const [sh, lg] = f1.length <= f2.length ? [f1, f2] : [f2, f1];
  if (sh.length >= 4 && !AMBIGUOUS_4STEMS.has(sh.slice(0, 4)) && lg.startsWith(sh)) return true;
  const stem = sh.replace(/(ie|i|y)$/, "");
  return stem.length >= 4 && !AMBIGUOUS_4STEMS.has(stem.slice(0, 4)) && lg.startsWith(stem) && lg.length >= sh.length + 2;
}

export const sameCompetitorCluster = (nameA, acadA, nameB, acadB) => {
  if (matchesYouthInitial(nameA, nameB)) return true;
  const proA = findProAthlete(nameA), proB = findProAthlete(nameB);
  if (proA && proB) return proA.name === proB.name;
  const tA = sigNameTokens(nameA), tB = sigNameTokens(nameB);
  if (tA.length >= 2 && tB.length >= 2 && (tA[0] === tB[0] || (tA[tA.length - 1] === tB[tB.length - 1] && hasUncommonDiminutiveStem(tA[0], tB[0])))) {
    const sA = new Set(tA.slice(1));
    if (tB.slice(1).some(s => sA.has(s))) {
      const gA = foldStr(acadA || "").replace(/[^a-z0-9]/g, ""), gB = foldStr(acadB || "").replace(/[^a-z0-9]/g, "");
      if (!gA || !gB || gA.includes(gB.slice(0, 6)) || gB.includes(gA.slice(0, 6))) return true;
    }
  }
  return false;
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

export const BJJ_BELT_GROUPS = [
  {
    group: "Adult & Juvenile Ranks (IBJJF)",
    options: [
      "White Belt", "White Belt • 1 Stripe", "White Belt • 2 Stripes", "White Belt • 3 Stripes", "White Belt • 4 Stripes",
      "Blue Belt", "Blue Belt • 1 Stripe", "Blue Belt • 2 Stripes", "Blue Belt • 3 Stripes", "Blue Belt • 4 Stripes",
      "Purple Belt", "Purple Belt • 1 Stripe", "Purple Belt • 2 Stripes", "Purple Belt • 3 Stripes", "Purple Belt • 4 Stripes",
      "Brown Belt", "Brown Belt • 1 Stripe", "Brown Belt • 2 Stripes", "Brown Belt • 3 Stripes", "Brown Belt • 4 Stripes",
      "Black Belt", "Black Belt • 1st Degree", "Black Belt • 2nd Degree", "Black Belt • 3rd Degree", "Black Belt • 4th Degree", "Black Belt • 5th Degree", "Black Belt • 6th Degree",
      "Coral Belt (7th Degree Red/Black)", "Coral Belt (8th Degree Red/White)", "Red Belt (9th/10th Degree)"
    ]
  },
  {
    group: "Youth / Kids Ranks (Ages 4–15)",
    options: [
      "White Belt (Youth)", "White Belt (Youth) • 1 Stripe", "White Belt (Youth) • 2 Stripes", "White Belt (Youth) • 3 Stripes", "White Belt (Youth) • 4 Stripes",
      "Grey/White Belt", "Grey/White Belt • 1 Stripe", "Grey/White Belt • 2 Stripes", "Grey/White Belt • 3 Stripes", "Grey/White Belt • 4 Stripes",
      "Grey Belt", "Grey Belt • 1 Stripe", "Grey Belt • 2 Stripes", "Grey Belt • 3 Stripes", "Grey Belt • 4 Stripes",
      "Grey/Black Belt", "Grey/Black Belt • 1 Stripe", "Grey/Black Belt • 2 Stripes", "Grey/Black Belt • 3 Stripes", "Grey/Black Belt • 4 Stripes",
      "Yellow/White Belt", "Yellow/White Belt • 1 Stripe", "Yellow/White Belt • 2 Stripes", "Yellow/White Belt • 3 Stripes", "Yellow/White Belt • 4 Stripes",
      "Yellow Belt", "Yellow Belt • 1 Stripe", "Yellow Belt • 2 Stripes", "Yellow Belt • 3 Stripes", "Yellow Belt • 4 Stripes",
      "Yellow/Black Belt", "Yellow/Black Belt • 1 Stripe", "Yellow/Black Belt • 2 Stripes", "Yellow/Black Belt • 3 Stripes", "Yellow/Black Belt • 4 Stripes",
      "Orange/White Belt", "Orange/White Belt • 1 Stripe", "Orange/White Belt • 2 Stripes", "Orange/White Belt • 3 Stripes", "Orange/White Belt • 4 Stripes",
      "Orange Belt", "Orange Belt • 1 Stripe", "Orange Belt • 2 Stripes", "Orange Belt • 3 Stripes", "Orange Belt • 4 Stripes",
      "Orange/Black Belt", "Orange/Black Belt • 1 Stripe", "Orange/Black Belt • 2 Stripes", "Orange/Black Belt • 3 Stripes", "Orange/Black Belt • 4 Stripes",
      "Green/White Belt", "Green/White Belt • 1 Stripe", "Green/White Belt • 2 Stripes", "Green/White Belt • 3 Stripes", "Green/White Belt • 4 Stripes",
      "Green Belt", "Green Belt • 1 Stripe", "Green Belt • 2 Stripes", "Green Belt • 3 Stripes", "Green Belt • 4 Stripes",
      "Green/Black Belt", "Green/Black Belt • 1 Stripe", "Green/Black Belt • 2 Stripes", "Green/Black Belt • 3 Stripes", "Green/Black Belt • 4 Stripes"
    ]
  }
];

export function normalizeBeltValue(raw) {
  const s = (raw || "").trim();
  if (!s) return "";
  const all = BJJ_BELT_GROUPS.flatMap(g => g.options);
  if (all.includes(s)) return s;
  const low = s.toLowerCase().replace(/\s+/g, " ").replace(/gray/g, "grey").replace(/\s*-\s*/g, "/").trim();
  const stripeMatch = low.match(/(\d+)\s*stripe/);
  const degMatch = low.match(/(\d+)(?:st|nd|rd|th)?\s*degree/);
  const baseRaw = low
    .replace(/•.*$/, "")
    .replace(/\(\d+.*\)/, "")
    .replace(/\d+\s*stripes?/, "")
    .replace(/\d+(?:st|nd|rd|th)?\s*degrees?/, "")
    .replace(/belt/g, "")
    .trim();

  const map = {
    "white": "White Belt",
    "white (youth)": "White Belt (Youth)",
    "blue": "Blue Belt",
    "purple": "Purple Belt",
    "brown": "Brown Belt",
    "black": "Black Belt",
    "grey/white": "Grey/White Belt",
    "grey": "Grey Belt",
    "grey/black": "Grey/Black Belt",
    "yellow/white": "Yellow/White Belt",
    "yellow": "Yellow Belt",
    "yellow/black": "Yellow/Black Belt",
    "orange/white": "Orange/White Belt",
    "orange": "Orange Belt",
    "orange/black": "Orange/Black Belt",
    "green/white": "Green/White Belt",
    "green": "Green Belt",
    "green/black": "Green/Black Belt"
  };
  let canonical = map[baseRaw] || map[low] || s;
  if (stripeMatch && canonical.endsWith("Belt") && !canonical.includes("Black Belt")) {
    const n = Math.min(4, Math.max(1, parseInt(stripeMatch[1], 10)));
    canonical = `${canonical} • ${n} Stripe${n > 1 ? "s" : ""}`;
  } else if (degMatch && canonical === "Black Belt") {
    const d = Math.min(6, Math.max(1, parseInt(degMatch[1], 10)));
    const suf = d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th";
    canonical = `Black Belt • ${d}${suf} Degree`;
  }
  return all.includes(canonical) ? canonical : s;
}

export function getBeltVisualSpec(raw) {
  const norm = normalizeBeltValue(raw);
  if (!norm) return null;
  const low = norm.toLowerCase();
  let main = "#f8fafc", mid = null, bar = "#090d16";

  // IMPORTANT: Check Youth belts (Grey/Yellow/Orange/Green — including /Black & /White!) BEFORE Adult Black Belt!
  if (low.includes("grey") || low.includes("gray")) {
    main = "#94a3b8";
    mid = low.includes("/white") ? "#ffffff" : (low.includes("/black") ? "#0b0f19" : null);
    bar = "#0b0f19";
  } else if (low.includes("yellow")) {
    main = "#facc15";
    mid = low.includes("/white") ? "#ffffff" : (low.includes("/black") ? "#0b0f19" : null);
    bar = "#0b0f19";
  } else if (low.includes("orange")) {
    main = "#f97316";
    mid = low.includes("/white") ? "#ffffff" : (low.includes("/black") ? "#0b0f19" : null);
    bar = "#0b0f19";
  } else if (low.includes("green")) {
    main = "#16a34a";
    mid = low.includes("/white") ? "#ffffff" : (low.includes("/black") ? "#0b0f19" : null);
    bar = "#0b0f19";
  } else if (low.includes("coral") && low.includes("white")) {
    main = "#dc2626"; mid = "#ffffff"; bar = "#dc2626";
  } else if (low.includes("coral")) {
    main = "#dc2626"; mid = "#111827"; bar = "#dc2626";
  } else if (low.startsWith("red belt")) {
    main = "#b91c1c"; bar = "#ffffff";
  } else if (low.startsWith("black belt") || low === "black" || low.includes("degree black")) {
    main = "#111827"; bar = "#dc2626";
  } else if (low.includes("brown")) {
    main = "#78350f"; bar = "#090d16";
  } else if (low.includes("purple")) {
    main = "#7e22ce"; bar = "#090d16";
  } else if (low.includes("blue")) {
    main = "#1d4ed8"; bar = "#090d16";
  } else {
    main = "#f8fafc"; bar = "#090d16";
  }

  const sm = low.match(/(\d+)(?:st|nd|rd|th)?\s*(?:stripe|degree)/);
  const stripes = sm ? Math.min(6, parseInt(sm[1], 10)) : 0;
  return { label: norm, main, mid, bar, stripes };
}


// Universal Academy Normalizer — merges 'HQ', 'Jiu-Jitsu', 'BJJ', 'Academy', 'MMA' variations cleanly across ALL gyms!
export function canonicalTournamentStem(evRaw) {
  return foldStr(evRaw || "")
    .replace(/^us\s+open\b/, "adcc us open")
    .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}\s+20\d{2}\b/g, " ")
    .replace(/\b(ii|iii|iv|international|championship|championships|grappling|bjj|jiu|jitsu|open|tournament)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function dedupeVerifiedMedals(rows, referenceRows = []) {
  if (!Array.isArray(rows) || !rows.length) return [];
  const isGenericJitsDiv = (d) => /^(youth\s*(gi|no[\s-]*gi)|official\s*youth\s*division)$/i.test(String(d || "").trim());
  const styleOf = (ev, d) => (/\bno[\s-]*gi\b|\bnogi\b|\badcc\b/i.test((ev || "") + " " + (d || "")) ? "nogi" : "gi");
  const yearOf = (r) => {
    if (r.yr) return String(r.yr);
    const m = String(r.ev || "").match(/\b(201\d|202\d)\b/);
    return m ? m[1] : "";
  };

  // Pass 1: Group exact (Event Stem + Specific Division) so Smoothcomp subgroup leaks (p:1 + p:2 in same bracket)
  //         and 'US Open - Austin' vs 'ADCC US Open - Austin' / 'Carlson Gracie Team' vs local chapter collapse cleanly!
  const bestByDiv = new Map();
  const passthrough = [];

  for (const r of rows) {
    if (!r) continue;
    if (r.mg !== undefined || isGenericJitsDiv(r.d)) {
      passthrough.push(r);
      continue;
    }
    const stem = canonicalTournamentStem(r.ev);
    const divKey = foldStr(r.d || "");
    const key = stem + "::" + divKey;
    const prev = bestByDiv.get(key);
    if (!prev) {
      bestByDiv.set(key, r);
    } else {
      const pCur = Number(r.p || 99);
      const pPrev = Number(prev.p || 99);
      // Prefer best podium placement (1 over 2) when division + tournament are identical;
      // on ties, prefer specific federation (ADCC/UFC/IBJJF over SMOOTHCOMP) & specific local academy over generic 'Team'
      const scoreRow = (x) =>
        (x.f && x.f !== "SMOOTHCOMP" ? 4 : 0) +
        (x.a && !/\bteam$/i.test(cleanAcademyName(x.a)) ? 2 : 0) +
        (String(x.ev || "").length > 18 ? 1 : 0);
      if (pCur < pPrev || (pCur === pPrev && scoreRow(r) > scoreRow(prev))) {
        bestByDiv.set(key, { ...r, a: cleanAcademyName(r.a || prev.a || "") });
      }
    }
  }

  const specificRows = Array.from(bestByDiv.values());
  const allSpecificRef = [...specificRows, ...(Array.isArray(referenceRows) ? referenceRows : [])];

  // Build fuzzy signatures of specific bracket rows to suppress duplicate generic Jits rows (e.g. NAGA SA Oct 18, 2025)
  const refSigs = allSpecificRef.map(x => ({
    stem: canonicalTournamentStem(x.ev),
    yr: yearOf(x),
    style: styleOf(x.ev, x.d),
    p: Number(x.p || 1)
  }));
  const exactRefKeys = new Set(
    (Array.isArray(referenceRows) ? referenceRows : []).map(x => canonicalTournamentStem(x.ev) + "::" + foldStr(x.d || "") + "::" + Number(x.p || 1))
  );

  // Clean specificRows against referenceRows (when filtering histEvs against 2026 s26Evs)
  const out = specificRows.filter(x => {
    const k = canonicalTournamentStem(x.ev) + "::" + foldStr(x.d || "") + "::" + Number(x.p || 1);
    return !exactRefKeys.has(k);
  });

  // Pass 2: Add non-duplicate summary/generic rows
  const seenGeneric = new Set();
  for (const r of passthrough) {
    if (r.mg !== undefined) {
      const mk = foldStr(r.ev) + "|" + r.mg + "|" + r.ms + "|" + r.mb;
      if (!seenGeneric.has(mk)) { seenGeneric.add(mk); out.push(r); }
      continue;
    }
    const rStem = canonicalTournamentStem(r.ev);
    const rYr = yearOf(r);
    const rStyle = styleOf(r.ev, r.d);
    const rP = Number(r.p || 1);
    const rToks = rStem.split(" ").filter(t => t.length >= 3 && !/^20\d{2}$/.test(t) && t !== "gi" && t !== "nogi");

    const alreadyCovered = refSigs.some(ref => {
      if (ref.p !== rP || ref.style !== rStyle) return false;
      if (rYr && ref.yr && rYr !== ref.yr) return false;
      return rToks.length >= 2 && rToks.every(t => ref.stem.includes(t));
    });
    if (!alreadyCovered) {
      out.push(r);
    }
  }
  return out;
}

export function academyAffiliationRoot(raw) {
  const s = foldStr(cleanAcademyName(raw || "")).replace(/[^a-z0-9\s]/g, " ").trim();
  if (!s) return "";
  const stop = new Set(["bjj", "jiu", "jitsu", "jiujitsu", "academy", "team", "association", "affiliation", "international", "hq", "headquarters", "mma", "club"]);
  const toks = s.split(/\s+/).filter(t => t && !stop.has(t));
  return toks.slice(0, 2).join(" ");
}

const AFFILIATION_NETWORK_GROUPS = [
  ["lead", "brunobastos", "bastos"],
  ["graciehumaita", "megaton", "roylergracie"],
  ["carlsongracie", "tmcombat", "thiagomendes"],
  ["atos", "artofjiujitsu", "aoj"],
  ["kingsway", "newwave"],
  ["sixblades", "ribeiro", "xanderibeiro", "sauloribeiro"],
  ["alliance", "dreamart", "cobrinha"],
  ["melquigalvao", "galvao"],
  ["checkmat", "fightzone"],
  ["graciebarra", "gb"],
  ["btt", "braziliantopteam"]
];

export function affiliationFamilyId(raw) {
  const c = foldStr(cleanAcademyName(raw || "")).replace(/[^a-z0-9]/g, "");
  if (!c) return "";
  for (let i = 0; i < AFFILIATION_NETWORK_GROUPS.length; i++) {
    if (AFFILIATION_NETWORK_GROUPS[i].some(tok => c.includes(tok))) return "fam_" + i;
  }
  return "";
}

export function isUmbrellaAcademyName(raw) {
  const s = foldStr(raw || "").trim();
  if (!s) return true;
  if (/\b(team|association|affiliation|international)\b$/i.test(s)) return true;
  const compact = s.replace(/[^a-z0-9]/g, "");
  return ["leadbjj", "lead", "carlsongracie", "graciebarra", "alliance", "checkmat", "atos", "ares", "brunobastos", "gfteam", "zrteam", "btt", "braziliantopteam", "sixblades", "novauniao", "10thplanet", "unity", "dreamart", "cicero", "cicerocostha"].includes(compact);
}

export function academiesCompatibleForMerge(acA, acB) {
  const a = cleanAcademyName(acA || "").trim();
  const b = cleanAcademyName(acB || "").trim();
  if (!a || !b) return true;
  const fa = foldStr(a), fb = foldStr(b);
  if (fa === fb || fa.includes(fb) || fb.includes(fa)) return true;
  const famA = affiliationFamilyId(a), famB = affiliationFamilyId(b);
  if (famA && famA === famB) return true;
  const rootA = academyAffiliationRoot(a);
  const rootB = academyAffiliationRoot(b);
  if (rootA && rootA === rootB) return true;
  return false;
}

export function mergeInitialDuplicateProfiles(profiles) {
  if (!Array.isArray(profiles) || profiles.length < 2) return profiles || [];
  const nameTokens = (nm) => foldStr(nm || "").replace(/[^a-z\s]/g, " ").trim().split(/\s+/).filter(Boolean);
  const fulls = [];
  const abbrevs = [];

  for (const p of profiles) {
    const toks = nameTokens(p.name);
    if (toks.length >= 2 && toks[0].length === 1) {
      abbrevs.push({ p, toks });
    } else {
      fulls.push({ p, toks });
    }
  }
  if (!abbrevs.length || !fulls.length) return profiles;

  const absorbed = new Set();
  for (const ab of abbrevs) {
    const init = ab.toks[0];
    const last = ab.toks[ab.toks.length - 1];
    const cands = fulls.filter(f =>
      f.toks.length >= 2 &&
      f.toks[0][0] === init &&
      f.toks[f.toks.length - 1] === last &&
      academiesCompatibleForMerge(ab.p.academy, f.p.academy)
    );
    if (cands.length === 1) {
      const target = cands[0].p;
      const mergedEvs = dedupeVerifiedMedals([...(target.events || []), ...(ab.p.events || [])]);
      target.events = mergedEvs;
      if (mergedEvs.length > 0) {
        target.g = mergedEvs.reduce((acc, x) => acc + (x.mg !== undefined ? Number(x.mg) : (Number(x.p) === 1 ? 1 : 0)), 0);
        target.s = mergedEvs.reduce((acc, x) => acc + (x.ms !== undefined ? Number(x.ms) : (Number(x.p) === 2 ? 1 : 0)), 0);
        target.b = mergedEvs.reduce((acc, x) => acc + (x.mb !== undefined ? Number(x.mb) : (Number(x.p) >= 3 ? 1 : 0)), 0);
      } else {
        target.g = (target.g || 0) + (ab.p.g || 0);
        target.s = (target.s || 0) + (ab.p.s || 0);
        target.b = (target.b || 0) + (ab.p.b || 0);
      }
      target.histCount = (target.histCount || 0) + (ab.p.histCount || 0);
      if (ab.p.nickVerified) target.nickVerified = true;
      if (ab.p.academy && (!target.academy || (isUmbrellaAcademyName(target.academy) && !isUmbrellaAcademyName(ab.p.academy)))) {
        target.academy = cleanAcademyName(ab.p.academy);
      } else if (target.academy) {
        target.academy = cleanAcademyName(target.academy);
      }
      absorbed.add(ab.p);
    }
  }
  return profiles.filter(p => !absorbed.has(p));
}

export function cleanAcademyName(raw) {
  if (!raw || typeof raw !== "string") return raw || "";
  let s = raw.trim().replace(/\s+/g, " ");
  // Normalize Carlson Gracie San Antonio Hq/HQ variations (preserving '/ TM Combat Academy' when present)
  s = s.replace(
    /\bcarlson\s+gracie(?:\s+(?:jiu[\s-]*jitsu|bjj))?\s+san\s+antonio(?:\s+(?:hq|headquarters))?\b/gi,
    "Carlson Gracie San Antonio"
  );
  // Strip Smoothcomp/IBJJF mixed-case trailing ' Hq' export artifact
  s = s.replace(/\s+Hq\b/g, "").trim();
  return s;
}

export function universalGymKey(raw) {
  const s = foldStr(raw || "").replace(/[^a-z0-9\s]/g, " ");
  let toks = s.split(/\s+/).filter(Boolean);
  const tailNoise = new Set(["hq", "headquarters", "bjj", "jiu", "jitsu", "jiujitsu", "academy", "mma", "team", "club", "association", "tx", "ca", "fl"]);
  while (toks.length > 1 && tailNoise.has(toks[toks.length - 1])) toks.pop();
  if (toks.length >= 4) {
    toks = toks.filter((t, idx) => !(idx > 1 && (t === "jiu" || t === "jitsu" || t === "jiujitsu" || t === "bjj")));
  }
  const k = toks.join("");
  if (k === "aoj" || k.startsWith("artofjiujitsu") || k === "artof") return "artofjiujitsu";
  if (k.startsWith("atoshq") || k === "atosjiujitsu" || k === "atos") return "atos";
  if (k === "gb" || k === "graciebarra") return "graciebarra";
  if (k === "tmcombat" || k === "thiagomendescombat" || k.startsWith("carlsongraciesanantonio")) return "carlsongraciesanantonio";
  return k;
}

export function inferRowGender(divStr) {
  const d = " " + foldStr(divStr || "") + " ";
  if (/\b(female|women|womens|girl|girls|femenino|feminino)\b/.test(d)) return "F";
  if (/\b(male|men|mens|boy|boys|masculino)\b/.test(d)) return "M";
  return "";
}

const COMMON_FEMALE_NAMES = new Set(["isabella","skyla","sky","cassia","cali","bailey","gabi","gabrieli","ffion","helena","mayssa","brianna","rafaela","rayssa","rebecca","sarah","sophia","emma","olivia","ava","mia","amelia","harper","evelyn","abigail","emily","elizabeth","camila","luna","sofia","avery","mila","aria","scarlett","penelope","layla","chloe","victoria","madison","eleanor","grace","nora","riley","zoey","hannah","hazel","lily","ellie","violet","lillian","zoe","stella","aurora","natalie","emilia","everly","leah","aubrey","willow","addison","lucy","audrey","bella","nova","brooklyn","paisley","savannah","claire","skylar","isla","genesis","naomi","elena","caroline","eliana","anna","maya","valentina","ruby","kennedy","ivy","ariana","aaliyah","cora","madelyn","alice","kinsley","hailey","gabriella","allison","gianna","serenity","samantha","autumn","quinn","eva","piper","sophie","sadie","delilah","josephine","nevaeh","adeline","ary","eisley","maria","dudah","eduarda","ana","julia","leticia","bianca","larissa","tamires","luiza","amanda","jessica","vanessa","natalia","fernanda","patricia","mariana","beatriz","bruna","carolina","gabriela","raquel","renata","tatiana","talita","tayane"]);
const COMMON_MALE_NAMES = new Set(["royce","cassius","cash","roman","thiago","patrick","jose","ahmed","gordon","nicholas","mica","micael","tainan","diogo","diego","kade","tye","cole","kaynan","fellipe","felipe","andre","marcus","buchecha","roger","rickson","renzo","ralph","carlson","helio","carlos","royler","rodrigo","rafael","guilherme","gui","paulo","joao","levi","lachlan","craig","nicky","ethan","damien","pj","fabricio","lucas","matheus","mateus","gabriel","pedro","gustavo","henrique","bruno","leandro","romulo","xande","saulo","lovato","jt","keenan","shanahan","giancarlo","luke","owen","declan","liam","noah","oliver","elijah","james","william","benjamin","henry","alexander","mason","michael","daniel","jacob","logan","jackson","sebastian","jack","aiden","matthew","samuel","david","joseph","carter","wyatt","john","leo","jayden","dylan","grayson","isaac","julian","anthony","joshua","christopher","andrew","theodore","caleb","ryan","asher","nathan","thomas","ezra","hudson","charles","isaiah","eli","aaron","connor","adrian","jonathan","nolan","jeremiah","easton","elias","colton","cameron","carson","robert","angel","maverick","dominic","jaxson","greyson","adam","ian","austin","santiago","jordan","cooper","brayden","evan","ezekiel","xavier","jace","jameson","leonardo","bryson","axel","everett","parker","kayden","miles","sawyer","jason"]);

const EXTRA_FEMALE_FIRST = new Set([
  "cassia","anysa","isabella","bella","eisley","gabrieli","gabi","mayssa","ffion","helena",
  "brianna","adele","bia","beatriz","bianca","tammi","thamires","tayane","elisabeth","elizabeth",
  "maria","eduarda","duda","dudah","giovanna","rafaela","luiza","ana","anna","julia","juliana",
  "camila","carolina","leticia","larissa","amanda","fernanda","natalia","vitoria","victoria",
  "sophia","sofia","olivia","emma","ava","mia","chloe","zoey","lily","hannah","grace","sarah",
  "sara","rachel","rebecca","jessica","ashley","emily","madison","abigail","ella","scarlett",
  "aria","penelope","layla","riley","nora","aurora","hazel","violet","stella","maya","lucy",
  "paisley","audrey","skylar","claire","savannah","isla","genesis","kennedy","kinsley","allison",
  "gabriella","alice","cora","ruby","eva","serenity","autumn","adeline","hailey","gianna",
  "valentina","isabelle","quinn","nevaeh","ivy","sadie","piper","lydia","alexa","josephine",
  "emery","julia","delilah","arianna","vivian","kaylee","sophie","brielle","madeline","peyton",
  "rylee","clara","hadley","melanie","mackenzie","reagan","adalynn","liliana","aubree","jade",
  "katherine","isabela","natalie","raelynn","athena","ximena","aryanna","izabella","samantha",
  "leilani","ayla","margaret","valeria","daniella","daniela","ariana","kendall","rose","leah",
  "jennifer","nicole","stephanie","melissa","lauren","megan","amber","brittany","danielle",
  "kayla","alexis","alyssa","courtney","vanessa","jasmine","kelsey","chelsea","brooke","paige",
  "morgan","taylor","haley","destiny","sydney","jocelyn","adriana","alexandra","andrea","angela",
  "brenda","carla","carmen","claudia","diana","elena","erica","erika","gabriela","karina",
  "laura","liliana","lorena","lucia","marcela","mariana","monica","nadia","patricia","paula",
  "priscila","priscilla","raquel","renata","roberta","sabrina","sandrine","silvia","tatiana",
  "teresa","vanessa","veronica","viviane","yasmin","yasmim","zoe","maci","macy","charlotte","amelia"
]);

const EXTRA_MALE_FIRST = new Set([
  "cassio","cassius","roman","jonathan","jon","thiago","patrick","jose","mica","micael","diogo",
  "diego","fabricio","nicholas","nick","gordon","craig","felipe","andre","andrew","marcus",
  "tainan","kaynan","fellipe","gutemberg","erberth","leandro","lucas","matheus","mateus","pedro",
  "gabriel","rafael","gustavo","henrique","bruno","rodrigo","leonardo","eduardo","guilherme",
  "daniel","david","davide","carlos","juan","luis","luiz","miguel","alejandro","alex","antonio",
  "francisco","javier","jorge","manuel","marco","marcos","pablo","ricardo","roberto","sergio",
  "victor","vitor","vinicius","caio","igor","yuri","arthur","artur","bernardo","enzo","heitor",
  "lorenzo","theo","samuel","benjamin","elijah","liam","noah","oliver","james","william","henry",
  "lucas","alexander","ethan","jacob","michael","logan","jackson","levi","sebastian","jack",
  "aiden","owen","isaac","luke","jayden","dylan","grayson","wyatt","isaiah","julian","christopher",
  "joshua","anthony","ryan","nathan","christian","hunter","cameron","connor","eli","ezra","colton",
  "cole","adrian","jonah","nolan","easton","jeremiah","hudson","robert","brayden","nicholas",
  "evan","austin","gavin","chase","jason","ian","adam","xavier","joseph","kevin","brandon",
  "tyler","zachary","kyle","justin","eric","stephen","steven","kenneth","brian","mark","paul",
  "royce","rickson","helio","carlson","ralph","renzo","roger","romulo","xande","saulo","braulio",
  "marcelo","cobrinha","rubens","murilo","gui","keenan","garry","lachlan","kade","tye","cole",
  "dorian","owen","declan","pj","dante","andy","giancarlo","roberto","ronaldo","kaue","kaua"
]);

export function inferTargetGender(fullName, sampleEvents = [], hintDiv = "") {
  const first = foldStr(fullName || "").split(/\s+/)[0]?.replace(/\./g, "") || "";
  if (COMMON_FEMALE_NAMES.has(first) || EXTRA_FEMALE_FIRST.has(first)) return "F";
  if (COMMON_MALE_NAMES.has(first) || EXTRA_MALE_FIRST.has(first)) return "M";

  // Check division hint from explicit watch if available
  if (hintDiv) {
    const hg = inferRowGender(hintDiv);
    if (hg) return hg;
  }

  let mCnt = 0, fCnt = 0;
  (sampleEvents || []).forEach(e => {
    if (foldStr(e.n || "") === foldStr(fullName || "")) {
      const g = inferRowGender(e.d);
      if (g === "M") mCnt++;
      else if (g === "F") fCnt++;
    }
  });
  if (mCnt > fCnt) return "M";
  if (fCnt > mCnt) return "F";
  return "";
}

function isYouthDivisionOrEvent(divStr = "", evName = "") {
  const blob = (" " + foldStr(divStr + " " + evName) + " ");
  return /\b(kids|kid|pee wee|peewee|mighty mite|junior|teen|juvenile 0|youth|children|infantil|mirim|pre mirim|infanto juvenil|grey|gray|yellow|orange|green)\b/.test(blob);
}

function isAdultUpperBeltAthlete(targetName, targetBelt = "") {
  const tFold = foldStr(targetName || "");
  const bFold = foldStr(targetBelt || "");
  if (/\b(blue|purple|brown|black)\b/.test(bFold)) return true;
  // Check PRO_SUPERFIGHTS roster (all verified adult/elite superfight athletes like Cassia Moura!)
  if (Array.isArray(PRO_SUPERFIGHTS)) {
    const hitPro = PRO_SUPERFIGHTS.find(p => foldStr(p.name || "") === tFold);
    if (hitPro) {
      const pb = foldStr(hitPro.belt || "");
      if (!/\b(grey|gray|yellow|orange|green)\b/.test(pb)) return true;
    }
  }
  return false;
}

// Strict Verified Row Matcher — eliminates cross-gender, cross-age/belt & "C. Moura" / "R. Mendes" initial contamination 100%!
function _baseStrictVerifiedAthleteRowMatch(rowName, rowAcad, rowDiv, targetName, targetAcad, targetGender, opts = {}) {
  const rFold = foldStr(rowName || "").replace(/[^a-z\s.]/g, " ").trim();
  const tFold = foldStr(targetName || "").replace(/[^a-z\s.]/g, " ").trim();
  if (!rFold || !tFold) return false;

  // 1. NEVER allow cross-gender division contamination (e.g. Male division on Cassia Moura or Female on Royce Mendes!)
  const rGen = inferRowGender((rowDiv || "") + " " + (opts.evName || ""));
  if (targetGender && rGen && targetGender !== rGen) return false;

  // 2. NEVER allow Adult Upper-Belt / Pro athletes (e.g. Black/Brown/Purple/Blue Belt) to match Kids/Youth/Yellow/Grey/Orange/Green brackets!
  const targetIsAdultUpper = isAdultUpperBeltAthlete(targetName, opts.targetBelt || "");
  if (targetIsAdultUpper && isYouthDivisionOrEvent(rowDiv, opts.evName || "")) {
    return false;
  }

  // Conversely, if target athlete's known belt is a Kids belt (Grey/Yellow/Orange/Green), never match Master / Black / Brown divisions!
  const tBeltFold = foldStr(opts.targetBelt || "");
  if (/\b(grey|gray|yellow|orange|green)\b/.test(tBeltFold)) {
    const rBlob = " " + foldStr((rowDiv || "") + " " + (opts.evName || "")) + " ";
    if (/\b(master|black belt|brown belt|purple belt)\b/.test(rBlob)) return false;
  }

  const rParts = rFold.split(/\s+/).filter(Boolean);
  const tParts = tFold.split(/\s+/).filter(Boolean);
  if (rParts.length < 2 || tParts.length < 2) return false;

  const rFirst = rParts[0].replace(/\./g, "");
  const tFirst = tParts[0].replace(/\./g, "");
  const rLast = rParts[rParts.length - 1].replace(/\./g, "");
  const tLast = tParts[tParts.length - 1].replace(/\./g, "");

  // 3. Exact full name match (all tokens match)
  if (rFold.replace(/\./g, "") === tFold.replace(/\./g, "")) {
    // If target has a known academy AND row has a known academy AND this is a common surname, still allow legitimate gym switches unless age/gender failed above
    return true;
  }

  // 4. Abbreviated First Initial (e.g. "C. Moura" vs "Cassia Moura" or "R. Mendes" vs "Royce Mendes"):
  //    MUST match first initial + exact surname AND have a matching non-empty Academy!
  const isAbbrev = rFirst.length === 1 || tFirst.length === 1;
  if (isAbbrev) {
    if (rFirst[0] !== tFirst[0] || rLast !== tLast) return false;
    const gRow = universalGymKey(rowAcad);
    const gTgt = universalGymKey(targetAcad);
    if (!gRow || !gTgt) return false;
    return gRow === gTgt || gRow.includes(gTgt) || gTgt.includes(gRow);
  }

  // 5. Full First + Last Name match (EXACT first name — NEVER fuzzy 1-char "Cassio" == "Cassia"!)
  if (rFirst === tFirst && rLast === tLast) {
    if (rParts.length >= 3 && tParts.length >= 3) {
      const rMid = rParts[1].replace(/\./g, "");
      const tMid = tParts[1].replace(/\./g, "");
      if (rMid && tMid && rMid[0] !== tMid[0]) return false;
    }
    return true;
  }

  return false;
}

const _KNOWN_NICK_TOKENS = new Set(
  BJJ_HEROES_NICKNAMES
    .filter(x => {
      const nkf = foldStr(x.nk || "").trim();
      const nfWords = new Set(foldStr(x.n || "").split(/\s+/));
      return nkf && !nkf.includes(" ") && nkf.length >= 4 && !nfWords.has(nkf);
    })
    .map(x => foldStr(x.nk).trim())
);

export function stripEmbeddedNickname(rawName) {
  let s = String(rawName || "")
    .replace(/\[[^\]]*\]|"[^"]*"|'[^']*'|“[^”]*”/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = s.split(" ").filter(Boolean);
  if (parts.length >= 3) {
    const lastFold = foldStr(parts[parts.length - 1]).replace(/[^a-z]/g, "");
    if (_KNOWN_NICK_TOKENS.has(lastFold)) {
      parts.pop();
      return parts.join(" ");
    }
  }
  return s;
}

export function extractEmbeddedNickname(rawName) {
  const s = String(rawName || "");
  const qm = s.match(/"([^"]{2,24})"|“([^”]{2,24})”|\[([^\]]{2,24})\]/);
  if (qm) return (qm[1] || qm[2] || qm[3] || "").trim();
  const parts = s.trim().split(/\s+/);
  if (parts.length >= 3) {
    const lastFold = foldStr(parts[parts.length - 1]).replace(/[^a-z]/g, "");
    if (_KNOWN_NICK_TOKENS.has(lastFold)) return parts[parts.length - 1];
  }
  const hit = BJJ_HEROES_NICKNAMES.find(x => foldStr(x.n) === foldStr(stripEmbeddedNickname(s)));
  return hit ? hit.nk : "";
}

export function strictVerifiedAthleteRowMatch(rowName, rowAcad, rowDiv, targetName, targetAcad, targetGender, allowNick = true) {
  const rClean = stripEmbeddedNickname(rowName);
  const tClean = stripEmbeddedNickname(targetName);
  if (_baseStrictVerifiedAthleteRowMatch(rClean, rowAcad, rowDiv, tClean, targetAcad, targetGender)) {
    return true;
  }
  const cleanNameToks = (s) => foldStr(stripEmbeddedNickname(s || ""))
    .replace(/\b(de|da|do|dos|das|del|jr|sr|ii|iii|iv|filho|neto)\b/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const rToks = cleanNameToks(rClean);
  const tToks = cleanNameToks(tClean);
  const dLow = String(rowDiv || "").toLowerCase();
  if (targetGender === "F" && /\b(male|boys|men|masculino)\b/.test(dLow) && !/\b(female|girls|women|feminino)\b/.test(dLow)) return false;
  if (targetGender === "M" && /\b(female|girls|women|feminino)\b/.test(dLow)) return false;

  // Strictly 1-hop nickname lookup (allowNick=false prevents ANY possibility of recursion loops!)
  if (allowNick && tToks.length >= 1 && foldStr(tClean).trim().length >= 4) {
    const nHits = resolveNicknameHit(tClean);
    if (nHits.some(h => foldStr(h.n) !== foldStr(tClean) && strictVerifiedAthleteRowMatch(rClean, rowAcad, rowDiv, h.n, targetAcad || h.a, targetGender, false))) {
      return true;
    }
  }

  // Youth & Adult First-Initial + Shared Final Surname (e.g. 'J. Bastos' <-> 'João Lucas Bastos')
  if (rToks.length >= 2 && tToks.length >= 2 && (rToks[0].length === 1 || tToks[0].length === 1)) {
    if (rToks[0][0] === tToks[0][0] && rToks[rToks.length - 1] === tToks[tToks.length - 1]) {
      if (academiesCompatibleForMerge(rowAcad, targetAcad)) {
        return true;
      }
    }
  }

  // Uncommon 4+ letter diminutive first-name stem + identical surname (e.g. 'Maali Marks' <-> 'Maalashrii Marks')
  if (rToks.length >= 2 && tToks.length >= 2 && rToks[rToks.length - 1] === tToks[tToks.length - 1] && hasUncommonDiminutiveStem(rToks[0], tToks[0])) {
    if (!targetAcad || !rowAcad || academiesCompatibleForMerge(rowAcad, targetAcad)) {
      return true;
    }
  }

  // Brazilian maternal + paternal multi-part surname matcher (e.g. 'Bruno Bastos' <-> 'Bruno Bastos Cruz')
  if (rToks.length >= 2 && tToks.length >= 2 && rToks[0] === tToks[0]) {
    const nonInitShort = (rToks.length <= tToks.length ? rToks : tToks).filter(w => w.length > 1);
    const fullLong = (rToks.length <= tToks.length ? tToks : rToks);
    const orderedNameSubset = nonInitShort.length >= 2 && (() => {
      let pos = 0;
      for (const tok of nonInitShort) {
        const idx = fullLong.indexOf(tok, pos);
        if (idx === -1) return false;
        pos = idx + 1;
      }
      return true;
    })();
    if (orderedNameSubset) {
      if (!targetAcad || !rowAcad || academiesCompatibleForMerge(rowAcad, targetAcad)) {
        return true;
      }
      const rAcFold = foldStr(rowAcad || "");
      const tNmFold = foldStr(tClean || "");
      if (rAcFold && tNmFold && (rAcFold.includes(tNmFold) || rAcFold.includes(nonInitShort[nonInitShort.length - 1]))) {
        return true;
      }
    }
  }

  return false;
}

export function consolidateAthleteProfiles(profiles) {
  if (!Array.isArray(profiles) || profiles.length < 2) return profiles || [];
  const clusters = [];
  for (const rawP of profiles) {
    const cleanedName = stripEmbeddedNickname(rawP.name || "");
    const embNick = rawP.nickname || extractEmbeddedNickname(rawP.name || "");
    const p = { ...rawP, name: cleanedName || rawP.name, ...(embNick ? { nickname: embNick } : {}) };
    const pToks = foldStr(p.name || "").replace(/\b(de|da|do|dos|das|jr|sr|ii|iii|iv)\b/g, " ").replace(/[^a-z\s]/g, " ").trim().split(/\s+/).filter(Boolean);
    if (pToks.length >= 2 && pToks[0].length > 1) {
      const hit = clusters.find(c => {
        if (c.toks.length < 2 || c.toks[0].length === 1) return false;
        if (c.toks[0] !== pToks[0]) {
          if (c.toks[c.toks.length - 1] !== pToks[pToks.length - 1] || !hasUncommonDiminutiveStem(c.toks[0], pToks[0])) return false;
          return academiesCompatibleForMerge(c.p.academy, p.academy);
        }
        const sh = c.toks.length <= pToks.length ? c.toks : pToks;
        const lg = c.toks.length <= pToks.length ? pToks : c.toks;
        let pos = 0;
        for (const t of sh) {
          const idx = lg.indexOf(t, pos);
          if (idx === -1) return false;
          pos = idx + 1;
        }
        return academiesCompatibleForMerge(c.p.academy, p.academy);
      });
      if (hit) {
        const mergedEvs = dedupeVerifiedMedals([...(hit.p.events || []), ...(p.events || [])]);
        hit.p.events = mergedEvs;
        hit.p.g = mergedEvs.reduce((a, x) => a + (x.mg !== undefined ? Number(x.mg) : (Number(x.p) === 1 ? 1 : 0)), 0);
        hit.p.s = mergedEvs.reduce((a, x) => a + (x.ms !== undefined ? Number(x.ms) : (Number(x.p) === 2 ? 1 : 0)), 0);
        hit.p.b = mergedEvs.reduce((a, x) => a + (x.mb !== undefined ? Number(x.mb) : (Number(x.p) >= 3 ? 1 : 0)), 0);
        const mergedHist = dedupeVerifiedMedals([...(hit.p.histEvents || []), ...(p.histEvents || [])]);
        hit.p.histEvents = mergedHist;
        hit.p.hg = mergedHist.length ? mergedHist.reduce((a, x) => a + (Number(x.p) === 1 ? 1 : 0), 0) : Math.max(hit.p.hg || 0, p.hg || 0);
        hit.p.hs = mergedHist.length ? mergedHist.reduce((a, x) => a + (Number(x.p) === 2 ? 1 : 0), 0) : Math.max(hit.p.hs || 0, p.hs || 0);
        hit.p.hb = mergedHist.length ? mergedHist.reduce((a, x) => a + (Number(x.p) >= 3 ? 1 : 0), 0) : Math.max(hit.p.hb || 0, p.hb || 0);
        hit.p.histCount = Math.max(mergedHist.length, hit.p.histCount || 0, p.histCount || 0);
        if (p.claimed) hit.p.claimed = true;
        if (p.nickVerified) hit.p.nickVerified = true;
        if (p.nickname && !hit.p.nickname) hit.p.nickname = p.nickname;
        if (pToks[0].length > hit.toks[0].length || (pToks[0].length === hit.toks[0].length && p.name.length > hit.p.name.length && !/^[a-z]\./i.test(p.name))) { hit.p.name = p.name; hit.toks = pToks; }
        if (p.academy && (!hit.p.academy || (isUmbrellaAcademyName(hit.p.academy) && !isUmbrellaAcademyName(p.academy)))) {
          hit.p.academy = cleanAcademyName(p.academy);
        }
        continue;
      }
    }
    clusters.push({ p, toks: pToks });
  }
  const mergedInit = mergeInitialDuplicateProfiles(clusters.map(c => c.p));
  return mergedInit.map(mp => {
    if ((mp.hg || mp.hs || mp.hb) || (mp.histEvents && mp.histEvents.length)) return mp;
    const matchCluster = clusters.find(c => sameCompetitorCluster(c.p.name, c.p.academy, mp.name, mp.academy));
    if (matchCluster && matchCluster.p) {
      return {
        ...mp,
        hg: matchCluster.p.hg || 0,
        hs: matchCluster.p.hs || 0,
        hb: matchCluster.p.hb || 0,
        histEvents: matchCluster.p.histEvents || []
      };
    }
    return mp;
  });
}

export function buildVenueHotelUrl(ev, partnerId = "matdates") {
  const aid = partnerId || (typeof window !== "undefined" && window.MD_STAY22_AID) || "";
  const dest = [ev?.venue, ev?.location].filter(v => v && !/^(tba|tbd|online)$/i.test(String(v).trim())).join(", ").trim() || (ev?.location || "Las Vegas, NV");
  let checkin = "", checkout = "";
  if (ev?.sort_date && /^202\d-\d{2}-\d{2}$/.test(ev.sort_date)) {
    const dt = new Date(ev.sort_date + "T12:00:00");
    const ci = new Date(dt); ci.setDate(ci.getDate() - 1);
    const co = new Date(dt); co.setDate(dt.getDate() + 1);
    checkin = ci.toISOString().slice(0, 10);
    checkout = co.toISOString().slice(0, 10);
  }
  if (aid) {
    return `https://www.stay22.com/allez/roam?aid=${encodeURIComponent(aid)}&address=${encodeURIComponent(dest)}${checkin ? `&checkin=${checkin}&checkout=${checkout}` : ""}`;
  }
  return `https://www.google.com/travel/hotels/${encodeURIComponent(dest)}${checkin ? `?q=${encodeURIComponent("hotels near " + dest)}&dates=${checkin}_${checkout}` : ""}`;
}
