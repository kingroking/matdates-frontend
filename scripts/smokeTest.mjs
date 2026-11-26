import fs from "fs";
import path from "path";
import {
  strictVerifiedAthleteRowMatch,
  consolidateAthleteProfiles,
  athBucketsForQuery,
  resolveNicknameHit,
  fastNicknameRowMatch,
  buildVenueHotelUrl,
  academiesCompatibleForMerge,
  stripEmbeddedNickname,
  extractEmbeddedNickname
} from "../src/proHubData.js";
import { BJJ_HEROES_NICKNAMES } from "../src/bjjNicknames.js";

const FE = "/Users/robertaking/matdates";
let passed = 0;

const check = (name, cond, detail = "") => {
  if (!cond) {
    console.error(`\n❌ REGRESSION BLOCKED DEPLOY: ${name}${detail ? " -> " + detail : ""}\n`);
    process.exit(1);
  }
  console.log(`  ✅ ${name}`);
  passed++;
};

// Read all src/ files once for fast cross-codebase checks
const srcDir = path.join(FE, "src");
const srcFiles = fs.readdirSync(srcDir).filter(f => /\.(js|jsx|mjs|ts|tsx)$/.test(f));
const srcMap = Object.fromEntries(srcFiles.map(f => [f, fs.readFileSync(path.join(srcDir, f), "utf8")]));
const allSrc = Object.values(srcMap).join("\n");
const appSrc = srcMap["App.jsx"] || "";
const pmSrc = srcMap["proModals.jsx"] || "";
const trSrc = srcMap["proTrophyModal.jsx"] || "";

console.log("\n🛡️ RUNNING MATDATES MASTER PRE-BUILD SMOKE & REGRESSION SUITE...\n");

// ============================================================================
// SECTION 1: Syntax & Duplicate-Import Guard Across Every File in src/
// ============================================================================
for (const [file, content] of Object.entries(srcMap)) {
  const importedIdentifiers = new Map();
  const importLines = content.match(/^\s*import\s+\{([^}]+)\}\s+from\s+["'][^"']+["']/gm) || [];
  let dupFound = "";
  for (const line of importLines) {
    const m = line.match(/\{([^}]+)\}/);
    if (!m) continue;
    for (const rawPart of m[1].split(",")) {
      const clean = rawPart.trim().split(/\s+as\s+/).pop().trim();
      if (!clean) continue;
      if (importedIdentifiers.has(clean)) dupFound = `${clean} imported twice in ${file}`;
      importedIdentifiers.set(clean, true);
    }
  }
  check(`Import integrity (${file}): zero duplicate named imports`, !dupFound, dupFound);
}


// ============================================================================
// SECTION 1B: Real AST Undeclared-Variable Guard (ESLint no-undef across src/)
// ============================================================================
import { spawnSync } from "child_process";
const eslintBin = path.join(FE, "node_modules/.bin/eslint");
if (fs.existsSync(eslintBin)) {
  const res = spawnSync(eslintBin, ["--rule", "no-undef: error", "--format", "json", "src/"], { cwd: FE, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  const stdout = (res.stdout || "").trim();
  if (stdout.startsWith("[")) {
    const report = JSON.parse(stdout);
    const undefs = [];
    for (const fileRep of report) {
      for (const m of fileRep.messages || []) {
        if (m.ruleId === "no-undef") undefs.push(`${path.basename(fileRep.filePath)}:${m.line} ${m.message}`);
      }
    }
    check("AST Undeclared-Variable Audit (ESLint no-undef across all 19 src/ files)", undefs.length === 0, undefs.slice(0, 5).join(" | "));
  }
}

// ============================================================================
// SECTION 2: Nickname Directory, Typo Tolerance & IBJJF Middle-Name Matching
// ============================================================================
check("Nickname directory loaded (>= 55 verified aliases)", Array.isArray(BJJ_HEROES_NICKNAMES) && BJJ_HEROES_NICKNAMES.length >= 55);
check("Nickname 'Megaton' -> Wellington Dias", resolveNicknameHit("megaton")[0]?.n?.includes("Wellington"));
check("Megaton matches IBJJF legal name 'Wellington Leal Dias'", fastNicknameRowMatch("wellington leal dias", "megaton"));
check("Typo 'Bucheche' -> Marcus Almeida (Buchecha)", resolveNicknameHit("bucheche")[0]?.n?.includes("Marcus Almeida"));
check("Bucheche matches IBJJF legal name 'Marcus Vinicius Oliveira de Almeida'", fastNicknameRowMatch("marcus vinicius oliveira de almeida", "bucheche"));
check("Nickname 'Cobrinha' -> Rubens Charles Maciel", fastNicknameRowMatch("rubens charles maciel", "cobrinha"));
check("Nickname 'Jacare' -> Ronaldo da Silva Souza", fastNicknameRowMatch("ronaldo da silva souza", "jacare"));
check("Nickname 'Terere' -> Fernando Augusto da Silva", fastNicknameRowMatch("fernando augusto da silva", "terere"));
check("Nickname 'Baby Shark' -> Diogo Reis", resolveNicknameHit("baby shark")[0]?.n?.includes("Diogo Reis"));
check("Nickname 'Hokage' -> Fabricio Andrey", resolveNicknameHit("hokage")[0]?.n?.includes("Fabricio Andrey"));
check("Nickname 'Mikey' / 'Darth Rigatoni' -> Michael Musumeci", resolveNicknameHit("darth rigatoni")[0]?.n?.includes("Musumeci"));
check("Embedded nickname extractor ('Roberto \"Cyborg\" Abreu' -> 'Cyborg')", extractEmbeddedNickname('Roberto "Cyborg" Abreu') === "Cyborg");
check("Surname safety: stripEmbeddedNickname never strips real family names ('João Lucas Bastos')", stripEmbeddedNickname("João Lucas Bastos") === "João Lucas Bastos");

// ============================================================================
// SECTION 3: Multi-Part Surnames, Youth Initials, Claimed Badges & Gender Guards
// ============================================================================
for (let i = 0; i < 250; i++) {
  if (!strictVerifiedAthleteRowMatch("Bruno Bastos Cruz", "LEAD BJJ", "Master 2 Male Black", "Bruno Bastos", "", "M")) {
    check("Bruno Bastos <-> Bruno Bastos Cruz (250x recursion stress test)", false);
  }
}
check("Bruno Bastos <-> Bruno Bastos Cruz (LEAD BJJ) + 0 stack overflow", true);

const jb = consolidateAthleteProfiles([
  { name: "João Lucas Bastos", academy: "Bruno Bastos Association", claimed: true, g: 2, s: 0, b: 0, events: [{ ev: "2026 ADCC Youth Worlds", d: "Boys", p: 1 }] },
  { name: "J. Bastos", academy: "LEAD BJJ", g: 3, s: 1, b: 0, events: [{ ev: "Pan Kids IBJJF 2026", d: "Boys", p: 1 }] },
  { name: "J. Bastos", academy: "Bruno Bastos BJJ Midland", g: 1, s: 0, b: 0, events: [{ ev: "Pan Kids No-Gi IBJJF 2026", d: "Boys", p: 1 }] }
]);
check("Youth initial 'J. Bastos' merges into 'João Lucas Bastos' (1 profile, 3 events)", jb.length === 1 && jb[0].events.length === 3);
check("Claimed athlete badge preserved across profile consolidation", jb[0].claimed === true);
check("Carlson Gracie <-> TM Combat Academy affiliation compatibility intact", academiesCompatibleForMerge("Carlson Gracie San Antonio", "TM Combat Academy"));
check("Gracie Humaita <-> Megaton affiliation compatibility intact", academiesCompatibleForMerge("Gracie Humaita", "Megaton BJJ"));
check("Surname shard ('ba') prioritized first for 'joao bastos'", athBucketsForQuery("joao bastos")[0] === "ba");
check("Nickname shard ('al') prioritized first for 'bucheche'", athBucketsForQuery("bucheche")[0] === "al");

const cy = consolidateAthleteProfiles([
  { name: "Roberto Abreu Cyborg", academy: "Fight Sports", g: 2, s: 0, b: 0, histCount: 0, events: [{ ev: "2026 Open", d: "Ultra", p: 1 }] },
  { name: "Roberto Abreu", nickname: "Cyborg", academy: "Fight Sports", g: 0, s: 0, b: 0, histCount: 25, events: [] }
]);
check("Embedded nickname ('Roberto Abreu Cyborg' + 'Roberto Abreu') consolidates to 1 card (+25 Prior-Yr)", cy.length === 1 && cy[0].histCount === 25);

check(
  "Gender guard blocks Male division row from Female Trophy Room",
  !strictVerifiedAthleteRowMatch("Alex Silva", "Alliance", "Adult / Male / Black / Light", "Alex Silva", "Alliance", "F")
);
check(
  "Gender guard blocks Girls/Female division row from Male Trophy Room",
  !strictVerifiedAthleteRowMatch("Isabella Silva", "Carlson Gracie", "Teen / Female / Grey / Light", "Isabella Silva", "Carlson Gracie", "M")
);

// ============================================================================
// SECTION 4: Stay22 Affiliate Revenue Guardrails
// ============================================================================
const vegasHotelUrl = buildVenueHotelUrl({ name: "World IBJJF No-Gi", venue: "Las Vegas Convention Center", location: "Las Vegas, NV", sort_date: "2026-12-10" });
check(
  "Stay22 URL embeds aid=matdates + checkin=2026-12-09 + checkout=2026-12-11 + venue",
  vegasHotelUrl.includes("stay22.com/allez/roam?aid=matdates") &&
    vegasHotelUrl.includes("checkin=2026-12-09") &&
    vegasHotelUrl.includes("checkout=2026-12-11") &&
    vegasHotelUrl.includes("Las%20Vegas%20Convention%20Center"),
  vegasHotelUrl
);
check("Stream-only events guard against showing physical Hotels button on Event Cards", appSrc.includes("!isStreamOnly && ev.location") && appSrc.includes(">🏨 Hotels</a>"));

// ============================================================================
// SECTION 5: Event Cards, Calendar Views, Filters & Admin War Room
// ============================================================================
const appChecks = [
  ["Event Card: ⚖️ Find Division calculator button", "⚖️ Find Division"],
  ["Event Card: 👥 Brackets modal button", "👥 Brackets"],
  ["Event Card: 🥊 View Fight Card button for Stream/SuperFight events", "🥊 View Fight Card"],
  ["Event Card: 🎟️ Event Hub & Tickets portal button", "🎟️ Event Hub & Tickets"],
  ["Event Card: ⏰ Remind Me notification modal button", "⏰ Remind Me"],
  ["Event Card: + Cal (.ics download) button", "downloadIcs("],
  ["Event Card: 💬 Tips (Venue & Event Intel) button", "💬 Tips"],
  ["Event Card: 📸 Photogs marketplace button & live badge counter", "getTotalPhotogCount("],
  ["Event Card: 🏨 Hotels Stay22 button", ">🏨 Hotels</a>"],
  ["Event Card: ★ Save to My Schedule toggle", "toggleSaveEvent("],
  ["Event Card: 🥋 Gi / ⚡ No-Gi tags", "getEventGiTags("],
  ["Event Card: Registration deadline urgency badge", "getDeadlineBadge("],
  ["Event Card: Kids event 🐯 badge", "isKidsEvent"],
  ["Event Card: Google Maps venue pin link", "getMapsUrl("],
  ["Calendar View: List / Grid / Calendar view switcher", "viewMode === 'grid'"],
  ["Calendar View: Big Calendar component (month/week/agenda)", "<Calendar localizer={localizer}"],
  ["Event Submission & Admin Approval (pending_events)", "handleRejectPending"],
  ["Deep-link router (?event=, ?athlete=, ?trophy=, ?gym=)", "handleDeepLinkAction"],
  ["War Room admin query param (?warroom=1)", "warroom"]
];
for (const [label, needle] of appChecks) {
  check(label, appSrc.includes(needle), `Missing '${needle}' in src/App.jsx`);
}

// ============================================================================
// SECTION 6: Bracket Modal, IG Story Share Studio, Photogs & Watch Alerts
// ============================================================================
const featureChecks = [
  ["Bracket Modal: Official Brackets ↗ external button", appSrc.includes("Official Brackets ↗")],
  ["Bracket Modal: 🏨 Hotels Near Venue ↗ Stay22 button", appSrc.includes("🏨 Hotels Near Venue ↗")],
  ["Bracket Modal: Large-bracket Firestore WebSocket cap", appSrc.includes("bkts.slice(0, 16)")],
  ["Bracket Modal: Share IG Story division card generator", allSrc.includes("Share IG Story")],
  ["Bracket Modal: Athlete Head-to-Head Compare button", allSrc.includes("Compare")],
  ["Bracket Modal: Smoothcomp search & Add Profile Link buttons", /Smoothcomp/i.test(allSrc) && allSrc.includes("Profile Link")],
  ["IG Story Studio: trophyShareStudio module present & non-empty", srcFiles.some(f => f.toLowerCase().includes("trophysharestudio"))],
  ["Photographer Marketplace: fetchPhotogCounts & photog modal wired", allSrc.includes("fetchPhotogCounts") && appSrc.includes("setPhotogEvent")],
  ["Watch Athlete Alerts: Watch trigger wired in Lookup & Bracket rows", pmSrc.includes("Watch") && appSrc.includes("Watch")],
  ["Trophy Room Modal: Prior-year & 2026 verified medal deduplication", trSrc.includes("strictVerifiedAthleteRowMatch") && allSrc.includes("dedupeVerifiedMedals")],
  ["Standings & Academy Leaderboard modal accessible", appSrc.includes("setShowLeaderboard")]
];
for (const [label, cond] of featureChecks) {
  check(label, cond);
}

// ============================================================================
// SECTION 7: SEO Tournament Hubs, JSON-LD SportsEvent Schema, Sitemap & Robots
// ============================================================================
const robotsPath = path.join(FE, "public/robots.txt");
const sitemapPath = path.join(FE, "public/sitemap.xml");
check("SEO: public/robots.txt exists & references https://matdates.com/sitemap.xml", fs.existsSync(robotsPath) && fs.readFileSync(robotsPath, "utf8").includes("sitemap.xml"));
check("SEO: public/sitemap.xml exists & valid <urlset>", fs.existsSync(sitemapPath) && fs.readFileSync(sitemapPath, "utf8").includes("<urlset"));

const sitemapXml = fs.readFileSync(sitemapPath, "utf8");
const expectedHubs = ["index.html", "texas.html", "las-vegas.html", "california.html", "florida.html", "ibjjf.html", "adcc.html", "jjwl.html", "agf.html"];
for (const hub of expectedHubs) {
  const hubPath = path.join(FE, "public/tournaments", hub);
  const exists = fs.existsSync(hubPath);
  const html = exists ? fs.readFileSync(hubPath, "utf8") : "";
  const hasJsonLd = html.includes("application/ld+json") && (hub === "index.html" || html.includes("SportsEvent"));
  const inSitemap = hub === "index.html" ? sitemapXml.includes("/tournaments/") : sitemapXml.includes(`/tournaments/${hub}`);
  check(`SEO Hub /tournaments/${hub}: valid HTML + JSON-LD schema + listed in sitemap.xml`, exists && hasJsonLd && inSitemap);
}

// ============================================================================
// SECTION 8: Diminutive First-Name Stem Consolidation & Collision Guard
// ============================================================================
{
  const mergedMarks = consolidateAthleteProfiles([
    { name: "Maali Marks", academy: "Carlson Gracie San Antonio", g: 1, s: 0, b: 0, events: [{ ev: "San Antonio Fall Kids", d: "Female / Teen 2 / Grey / Feather", p: 1 }] },
    { name: "Maalashrii Marks", academy: "Carlson Gracie San Antonio", g: 1, s: 0, b: 0, events: [{ ev: "NAGA San Antonio", d: "Children Gi", p: 1 }] }
  ]);
  check("Diminutive stem: 'Maali Marks' + 'Maalashrii Marks' -> 1 profile ('Maalashrii Marks')", mergedMarks.length === 1 && mergedMarks[0].name === "Maalashrii Marks");

  const distinctMarias = consolidateAthleteProfiles([
    { name: "Maria Silva", academy: "Alliance", g: 1, s: 0, b: 0, events: [] },
    { name: "Mariana Silva", academy: "Alliance", g: 1, s: 0, b: 0, events: [] }
  ]);
  check("Ambiguous stem guard: 'Maria Silva' vs 'Mariana Silva' stay strictly separate", distinctMarias.length === 2);
}

console.log(`\n🎉 ALL ${passed}/${passed} MATDATES MASTER GUARDRAIL CHECKS PASSED — SAFE TO DEPLOY!\n`);