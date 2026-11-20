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

export const findProAthlete = (nm) => {
  const f = foldStr(nm).replace(/\b(jr\.?|sr\.?|ii|iii|iv|professor|prof\.?|coach)\b/g, " ").replace(/\s+/g, " ").trim();
  if (!f) return null;
  const fToks = sigNameTokens(nm);
  return PRO_SUPERFIGHTS.find(p => {
    const pf = foldStr(p.name);
    if (pf === f) return true;
    if ((p.aliases || []).some(al => foldStr(al) === f)) return true;
    const pToks = sigNameTokens(p.name);
    // Match First Name + ANY shared Surname token (unifies "Cassia Moura Remesar" AND "Cassia Remesar Moura" -> "Cassia Moura"!)
    if (fToks.length >= 2 && pToks.length >= 2 && fToks[0] === pToks[0]) {
      const pSurnames = new Set(pToks.slice(1));
      if (fToks.slice(1).some(st => pSurnames.has(st))) return true;
    }
    return false;
  }) || null;
};

const COMPOUND_SHARD_HINTS = {
  dalpra: ["co", "da"], pessanha: ["ma", "pe"], pato: ["ba", "ol"],
  hokage: ["ba", "an"], andrey: ["ba", "an"], munis: ["sa", "mu"],
  andrew: ["si", "an"], hugo: ["ma", "hu"], bastos: ["ba"],
  moura: ["mo", "re"], galvao: ["ga"], babyshark: ["re"],
  mendes: ["me", "ba", "pa"], henson: ["he"], heinsohn: ["he"], grounds: ["gr"]
};

export const athBucketsForQuery = (q) => {
  const clean = foldStr(q).replace(/\b(jr\.?|sr\.?|ii|iii|iv|professor|prof\.?|coach)\b/g, " ").trim();
  if (clean.length < 2) return [];
  const words = clean.split(/[\s-]+/).map(w => w.replace(/[^a-z]/g, "")).filter(w => w.length >= 2);
  const set = new Set();
  words.forEach(w => set.add(w.slice(0, 2)));
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
export const sameCompetitorCluster = (nameA, acadA, nameB, acadB) => {
  if (matchesYouthInitial(nameA, nameB)) return true;
  const proA = findProAthlete(nameA), proB = findProAthlete(nameB);
  if (proA && proB) return proA.name === proB.name;
  const tA = sigNameTokens(nameA), tB = sigNameTokens(nameB);
  if (tA.length >= 2 && tB.length >= 2 && tA[0] === tB[0]) {
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
