// Extra sample data for demos and reports: 30 more Interior Designers, 200 Customers, 15 companies, 20 categories,
// 50 projects and their ratings, favourites, views, availability and reported issues.
// The rows are generated from a fixed seed (the same every time) and inserted in bulk. They are added only once:
// the run is skipped when the sample accounts already exist. Run it with:  npx tsx scripts/seed-sample.ts
import type { Db } from "../db";
import { addDays, todayLocal } from "../lib/dates";
import { hashPassword } from "../lib/password";

export const SAMPLE_PASSWORD = "12345678";
/** Every sample account's email ends with this, which is also how a second run knows the data is already there. */
export const SAMPLE_EMAIL_DOMAIN = "example.net";

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

// How many of each row to add.
const DESIGNERS = 30;
const CUSTOMERS = 200;
const COMPANIES = 15;
const CATEGORIES = 20;
const PROJECTS = 50;
const RATINGS = 600;
/** The best-reviewed project gets exactly this many ratings, all 4 or 5 stars. No other project gets as many. */
const FEATURED_RATINGS = 29;
const SLOTS_DESIGNERS = 16; // 16 designers x 3 days x 2 slots = 96 slots in November 2026
const ISSUES = 71;
const ISSUES_FROM = "2026-10-13"; // 30 days before 12 November 2026
const ISSUES_TO = "2026-11-12";
/** Favourites for the 10 most-shortlisted projects, all made in the last 14 days. Each one is also a SHORTLIST activity. */
const HOT_FAVOURITES = [24, 25, 24, 26, 25, 24, 26, 25, 24, 27];
const OTHER_FAVOURITES = 10;
/** Views for the 11 most-viewed projects; 9 more projects get one view each. */
const POPULAR_VIEWS = [16, 15, 14, 14, 13, 13, 13, 12, 12, 12, 12];
const SINGLE_VIEWS = 9;
// 260 shortlist activities (one per favourite) + 155 views = 415 project activities.

export interface SampleDataResult {
  added: {
    designers: number; customers: number; companies: number; categories: number; projects: number; currentProjects: number;
    ratings: number; favourites: number; activities: number; views: number; shortlists: number; slots: number; issues: number;
  };
  checks: SampleDataChecks;
}

export interface SampleDataChecks {
  /** Projects with more than 23 shortlists (SHORTLIST activities) in the last 30 days. */
  projectsShortlistedOver23In30Days: number;
  /** Sample projects whose view count is 12 to 70. */
  projectsWith12To70Views: number;
  /** Sample projects whose view count differs from their VIEW activities (should be 0). */
  projectsWithViewCountMismatch: number;
  featuredProject: { title: string; ratings: number; lowestScore: number };
  mostRatingsOnAnyOtherProject: number;
  lowestScoreOnOtherProjects: number;
  slots: { total: number; booked: number; available: number; outsideNovember2026: number; overlapping: number };
  issues: { total: number; pending: number; reviewed: number; rectified: number; outsideDateRange: number };
}

// --------------------------------------------------------------------------------------------- helpers

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;
const int = (r: Rand, min: number, max: number) => min + Math.floor(r() * (max - min + 1));
const pick = <T>(r: Rand, list: readonly T[]): T => list[Math.floor(r() * list.length)];
function shuffle<T>(r: Rand, list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function weighted<T>(r: Rand, options: [T, number][]): T {
  let x = r() * options.reduce((n, [, w]) => n + w, 0);
  for (const [value, w] of options) if ((x -= w) < 0) return value;
  return options[options.length - 1][0];
}
/** A random moment between two times (ms). */
const between = (r: Rand, from: number, to: number) => new Date(from + r() * Math.max(0, to - from));
const iso = (d: Date) => d.toISOString();
const sgDate = (d: Date) => todayLocal(d);

const CHUNK = 400;

/** Inserts rows with one multi-row statement per 400 rows. Every value is a typed parameter. */
async function insertRows<T = Record<string, unknown>>(
  db: Db, table: string, columns: [string, string][], rows: unknown[][], returning = "",
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const params: unknown[] = [];
    const tuples = rows.slice(i, i + CHUNK).map((row) =>
      `(${row.map((value, j) => { params.push(value); return `$${params.length}::${columns[j][1]}`; }).join(", ")})`);
    const text = `insert into ${table} (${columns.map((c) => c[0]).join(", ")}) values ${tuples.join(", ")}${returning ? ` returning ${returning}` : ""}`;
    out.push(...(await db.query<T>(text, params)));
  }
  return out;
}

// ----------------------------------------------------------------------------------------- word lists

const WESTERN_GIVEN = ["Rachel", "Jonathan", "Megan", "Ryan", "Chloe", "Nicholas", "Grace", "Ethan", "Hannah", "Joshua", "Natalie",
  "Brandon", "Vanessa", "Gabriel", "Clara", "Isaac", "Jasmine", "Lucas", "Amanda", "Kenneth", "Samantha", "Victor", "Charlotte",
  "Darren", "Felicia", "Justin", "Melissa", "Terence", "Abigail", "Shawn", "Valerie", "Eugene", "Cheryl", "Bryan", "Joanne", "Leon",
  "Denise", "Gavin", "Audrey", "Wesley"];
const CN_SURNAMES = ["Tan", "Lim", "Lee", "Ng", "Ong", "Wong", "Goh", "Chua", "Chan", "Koh", "Teo", "Ang", "Yeo", "Tay", "Ho", "Low",
  "Toh", "Sim", "Chong", "Chia", "Seah", "Foo", "Quek", "Heng", "Phua", "Loh", "Khoo", "Yap", "Pang", "Lau"];
const CN_GIVEN = ["Wei Ming", "Jia Hui", "Xin Yi", "Jun Jie", "Hui Min", "Zhi Hao", "Li Ting", "Kai Wen", "Shu Fen", "Yong Sheng",
  "Mei Ling", "Jia Wei", "Pei Shan", "Wen Jie", "Hui Ling", "Cheng Han", "Siew Lan", "Boon Keng", "Ai Ling", "Kok Wai", "Yi Xuan",
  "Jun Hao", "Xiu Ying", "Zi Yang"];
const OTHER_NAMES = ["Nurul Aisyah", "Muhammad Hafiz", "Ahmad Faizal", "Nur Atiqah", "Mohd Irfan", "Farah Hanim", "Syafiq Rahman",
  "Aqilah Yusof", "Hazwan Ismail", "Liyana Kamal", "Haikal Rosli", "Amirah Zainal", "Rizwan Osman", "Nadia Salleh", "Iskandar Hamid",
  "Sabrina Jamal", "Firdaus Ali", "Hidayah Karim", "Zulkifli Bakar", "Nabilah Hassan", "Arjun Menon", "Kavitha Raj", "Rahul Pillai",
  "Deepa Krishnan", "Vikram Singh", "Anjali Nair", "Suresh Kumar", "Meena Subramaniam", "Karthik Rajan", "Divya Pillay",
  "Ravi Chandran", "Lakshmi Iyer", "Naveen Das", "Shalini Gopal", "Harish Varma", "Pooja Sharma", "Ganesh Murthy", "Revathi Bala",
  "Sanjay Rao", "Nisha Kaur", "Sarah De Souza", "Matthew Pereira", "Michelle Fernandez", "Andrew Rodrigues", "Joanne Da Silva",
  "Christopher Gomes", "Natasha Oliveiro", "Benjamin Shepherdson", "Rebecca Scully", "Adrian Theseira"];

const CUSTOMER_BIOS = ["Planning a renovation for our new BTO flat.", "First-time homeowner looking for practical, cosy ideas.",
  "Renovating our family home after 15 years.", "Love warm timber, plants and natural light.", "Looking for a designer for a small condo unit.",
  "Moving into a resale flat next year and collecting ideas.", "Our family is growing - we need smarter storage.",
  "Interested in minimalist and wabi-sabi interiors."];
const DESIGNER_FOCUS = ["HDB and condo renovations", "warm, liveable family homes", "small-space storage solutions",
  "commercial and F&B fit-outs", "heritage shophouse restorations", "luxury residential interiors", "sustainable materials",
  "bespoke carpentry and lighting"];

const COMPANY_NAMES = ["Studio Kanso Interiors", "Oakline Design Co.", "Haus & Hearth Interiors", "Verdant Living Studio",
  "Monochrome Atelier", "Lumiere Home Design", "Kampong Modern Interiors", "Teakwood & Tile Studio", "Northlight Interiors",
  "Casa Serene Design", "Urban Nest Design Studio", "Brick & Linen Interiors", "Sagewood Design House", "Arcadia Interior Works",
  "The Joinery Collective"];
const STREETS = ["Ubi Crescent", "Kaki Bukit Road", "Jalan Besar", "Upper Thomson Road", "Tai Seng Street", "Kallang Avenue",
  "Telok Ayer Street", "East Coast Road", "Bukit Merah Central", "MacPherson Road", "Joo Chiat Place", "Sin Ming Lane",
  "Paya Lebar Road", "Alexandra Road", "Defu Lane"];

export const SAMPLE_CATEGORIES: [string, string][] = [
  ["Home Office", "Study rooms and work-from-home corners"],
  ["Dining Room", "Dining rooms and breakfast nooks"],
  ["Kids' Room", "Bedrooms and play areas for children"],
  ["Nursery", "Calm, safe rooms for babies"],
  ["Guest Room", "Guest bedrooms and multi-purpose rooms"],
  ["Walk-in Wardrobe", "Dressing rooms and wardrobe systems"],
  ["Study & Library", "Reading rooms, studies and home libraries"],
  ["Entryway & Foyer", "Entrances, foyers and shoe storage"],
  ["Laundry & Utility", "Laundry areas, yards and utility rooms"],
  ["Home Theatre", "Media rooms and home cinemas"],
  ["Rooftop & Terrace", "Roof terraces and open-air living spaces"],
  ["Hotel & Hospitality", "Hotels, serviced apartments and lobbies"],
  ["Clinic & Healthcare", "Clinics, dental practices and wellness centres"],
  ["Showroom & Gallery", "Showrooms, galleries and exhibition spaces"],
  ["Spa & Wellness", "Spas, salons and fitness studios"],
  ["Bar & Lounge", "Bars, lounges and night-time venues"],
  ["Shophouse Restoration", "Conservation shophouses and heritage homes"],
  ["HDB BTO Renovation", "Renovations of new Build-To-Order flats"],
  ["Smart Home", "Home automation, smart lighting and security"],
  ["Sustainable Design", "Eco-friendly materials and energy-saving homes"],
];
/** Used instead if some of the names above already exist, so that 20 new categories are always added. */
const SPARE_CATEGORIES: [string, string][] = [
  ["Pantry & Wet Kitchen", "Dry and wet kitchens, pantries and bar counters"],
  ["Prayer Room", "Prayer and meditation rooms"],
  ["Pet-friendly Home", "Homes designed around pets"],
  ["Ageing-in-place", "Safe, accessible homes for seniors"],
  ["Student Hostel", "Student housing and dormitories"],
];

interface ProjectKind { category: string; nouns: string[]; commercial?: boolean }
const PROJECT_KINDS: ProjectKind[] = [
  { category: "Living Room", nouns: ["Living Room", "Family Lounge", "Living and Dining Area"] },
  { category: "Bedroom", nouns: ["Master Bedroom", "Bedroom Suite"] },
  { category: "Kitchen", nouns: ["Kitchen", "Open-concept Kitchen"] },
  { category: "Bathroom", nouns: ["Bathroom", "Ensuite Bathroom"] },
  { category: "Whole Home", nouns: ["4-Room HDB Makeover", "Condo Renovation", "Terrace House Revamp", "5-Room Flat Renovation"] },
  { category: "Office / Commercial", nouns: ["Office Fit-out", "Studio Workspace"], commercial: true },
  { category: "Retail & F&B", nouns: ["Cafe", "Boutique Store"], commercial: true },
  { category: "Home Office", nouns: ["Home Office"] },
  { category: "Dining Room", nouns: ["Dining Room"] },
  { category: "Kids' Room", nouns: ["Kids' Room"] },
  { category: "Nursery", nouns: ["Nursery"] },
  { category: "Guest Room", nouns: ["Guest Room"] },
  { category: "Walk-in Wardrobe", nouns: ["Walk-in Wardrobe"] },
  { category: "Study & Library", nouns: ["Study and Library"] },
  { category: "Entryway & Foyer", nouns: ["Entryway"] },
  { category: "Laundry & Utility", nouns: ["Laundry and Utility Room"] },
  { category: "Home Theatre", nouns: ["Home Theatre"] },
  { category: "Rooftop & Terrace", nouns: ["Rooftop Terrace"] },
  { category: "Hotel & Hospitality", nouns: ["Boutique Hotel Lobby"], commercial: true },
  { category: "Clinic & Healthcare", nouns: ["Dental Clinic"], commercial: true },
  { category: "Showroom & Gallery", nouns: ["Furniture Showroom"], commercial: true },
  { category: "Spa & Wellness", nouns: ["Day Spa"], commercial: true },
  { category: "Bar & Lounge", nouns: ["Cocktail Bar"], commercial: true },
  { category: "Shophouse Restoration", nouns: ["Shophouse Restoration"] },
  { category: "HDB BTO Renovation", nouns: ["BTO Flat Renovation"] },
  { category: "Smart Home", nouns: ["Smart Home Upgrade"] },
  { category: "Sustainable Design", nouns: ["Eco-friendly Apartment"] },
];
const ADJECTIVES = ["Serene", "Warm", "Bright", "Cosy", "Timeless", "Airy", "Bold", "Earthy", "Elegant", "Quiet", "Refined", "Playful",
  "Light-filled", "Textured"];
const STYLES = ["Minimalist", "Industrial", "Modern luxury", "Contemporary", "Mid-century modern", "Tropical", "Wabi-sabi", "Coastal",
  "Peranakan", "Art Deco", "Rustic", "Bohemian", "Muji-inspired", "Neo-classical", "Modern farmhouse", "Urban modern"];
const LOCATIONS = ["Ang Mo Kio", "Bedok", "Bishan", "Bukit Batok", "Bukit Timah", "Hougang", "Jurong East", "Kallang", "Novena",
  "Pasir Ris", "Queenstown", "Sengkang", "Serangoon", "Toa Payoh", "Woodlands", "Yishun", "Holland Village", "Katong", "Tiong Bahru",
  "River Valley", "Marine Parade", "Bukit Panjang", "Choa Chu Kang", "Tengah", "Dempsey Hill", "Tanjong Pagar", "Joo Chiat"];
const CLIENTS = ["a young couple", "a family of four", "a retired couple", "a work-from-home professional", "first-time homeowners",
  "a multi-generational family"];
const BUSINESS_CLIENTS = ["a growing tech start-up", "a neighbourhood business", "a boutique brand", "a family-run business"];
const FEATURES = [
  "We used warm oak veneers, soft indirect lighting and plenty of hidden storage.",
  "Natural stone, fluted glass and brushed brass details give it a crafted feel.",
  "Built-in carpentry keeps the space clutter-free while the palette stays light and calm.",
  "Acoustic panels, layered lighting and durable finishes make it easy to live and work in.",
  "Terrazzo, rattan and indoor plants bring a relaxed, tropical mood.",
  "A muted palette with textured plaster walls creates a quiet, gallery-like backdrop.",
  "Smart lighting and concealed wiring keep the look clean and modern.",
  "Reclaimed timber and black steel frames add character without feeling heavy.",
];
const CURRENT_NOTES = ["Currently in the carpentry phase.", "Works are under way and due to finish soon.",
  "Now in the electrical and lighting stage.", "The design is approved and site works have started."];
const PAST_NOTES = ["Completed on schedule and within budget.", "Handed over to very happy owners.",
  "Completed and photographed for our portfolio.", "Finished with a full defect check before handover."];

const COMMENTS: Record<number, string[]> = {
  5: ["Absolutely love the result - it feels like a new home.", "Professional from start to finish and the details are perfect.",
    "Exceeded our expectations. Would hire again in a heartbeat.", "Beautiful work and great communication throughout.",
    "The space is so much more functional now. Thank you!", "Stunning design, finished right on schedule."],
  4: ["Very happy overall, a few small delays along the way.", "Great ideas and good workmanship.",
    "Lovely design; the carpentry took a little longer than planned.", "Responsive team and a well-thought-out layout.",
    "Good value for the budget and nicely finished."],
  3: ["Decent result, but communication could be better.", "Nice design, though some finishing needed touch-ups.",
    "Okay overall - the timeline slipped a few weeks.", "Some good ideas, a few things we would change."],
};

const SLOT_TIMES: [string, string][][] = [
  [["10:00", "12:00"], ["14:00", "16:00"]],
  [["09:30", "11:30"], ["13:30", "15:30"]],
  [["11:00", "13:00"], ["15:00", "17:30"]],
];
const SLOT_NOTES = ["Consultation / site visit", "Showroom meeting", "Online consultation", "Design presentation"];

const ISSUE_TEXT: Record<string, [string, string][]> = {
  BUG: [
    ["Search results do not load", "When I filter projects by category the page sometimes shows no results until I refresh."],
    ["Image missing on a project page", "The cover photo on one of the kitchen projects shows a broken image."],
    ["Calendar jumped to the wrong month", "The availability calendar went back to last month after I clicked Next."],
    ["Rating did not save", "I submitted a rating but it did not appear under the reviews."],
    ["Page loads slowly on mobile", "Project pages take more than 10 seconds to load on my phone."],
    ["Favourites button not responding", "Clicking Save to favourites did nothing on the first try."],
  ],
  CONTENT: [
    ["Typo in a project description", "The description of a living room project spells 'cabinet' wrongly."],
    ["Project in the wrong category", "A bathroom project is listed under Kitchen."],
    ["Outdated company phone number", "The phone number on a designer's company page no longer works."],
    ["Rude language in a review", "One review on a bedroom project contains rude language."],
    ["Duplicate project listing", "The same renovation appears twice in the search results."],
  ],
  ACCOUNT: [
    ["Cannot change my email", "Saving a new email address on my profile shows an error."],
    ["Locked out after a password change", "I changed my password and now cannot log in."],
    ["Profile name not updating", "My new display name does not show in the top menu."],
    ["Please close my account", "I would like my account to be closed, please."],
  ],
  SPAM: [
    ["Account posting links in reviews", "An account keeps leaving reviews with links to another website."],
    ["Fake designer profile", "A designer profile copies another company's photos."],
    ["Repeated promotional reviews", "Several five-star reviews look copied from each other."],
  ],
  OTHER: [
    ["Suggestion: filter by budget", "It would be great to filter projects by budget range."],
    ["More Peranakan projects, please", "I would love to see more Peranakan-style projects."],
    ["How do I book a slot?", "How do I confirm a consultation slot with a designer?"],
    ["Feedback on the website", "The new project pages look great, thank you!"],
  ],
};
const REVIEWED_NOTES = ["Thanks for flagging this - we are looking into it.", "We have passed this to the team and will update you soon.",
  "Thanks! We are checking this with the designer concerned.", "Received - we are investigating and will follow up."];
const RECTIFIED_NOTES = ["Fixed - thank you for letting us know!", "This has been corrected. Thanks for your patience.",
  "Resolved. Please let us know if you still see the problem.", "We have updated the listing. Thank you!",
  "The account has been reviewed and the issue resolved."];

// ---------------------------------------------------------------------------------------- generator

interface Person { id: number; username: string; createdAt: number }
interface SampleProject { id: number; title: string; designerId: number; createdAt: number; status: "CURRENT" | "PAST" }

/** Names for the sample accounts: always the same list, in the same order. */
function sampleNames(r: Rand, count: number): string[] {
  const names = new Set<string>(OTHER_NAMES);
  for (let i = 0; names.size < count + 40; i++) {
    names.add(`${WESTERN_GIVEN[i % WESTERN_GIVEN.length]} ${CN_SURNAMES[(i * 7 + Math.floor(i / 30)) % CN_SURNAMES.length]}`);
    names.add(`${CN_SURNAMES[(i * 11 + 3) % CN_SURNAMES.length]} ${CN_GIVEN[(i * 5 + Math.floor(i / 24)) % CN_GIVEN.length]}`);
  }
  return shuffle(r, [...names]).slice(0, count);
}

function phone(r: Rand, prefix: string) {
  return `+65 ${prefix}${int(r, 100, 999)} ${int(r, 1000, 9999)}`;
}

/** Adds the sample data. Returns null (and changes nothing) if it was added before. Run it inside a transaction. */
export async function addSampleData(db: Db, now = new Date()): Promise<SampleDataResult | null> {
  const already = await db.query(`select 1 from user_accounts where email like $1 limit 1`, [`%@${SAMPLE_EMAIL_DOMAIN}`]);
  if (already.length) return null;

  const r = seeded(20261112);
  const t = now.getTime();
  const today = sgDate(now);

  // ---------------------------------------------------------------- accounts
  const taken = new Set((await db.query<{ username: string }>(`select username from user_accounts`)).map((u) => u.username));
  const accounts: { username: string; fullName: string; role: string; createdAt: Date; phone: string; bio: string | null; lastLogin: Date | null }[] = [];
  sampleNames(r, DESIGNERS + CUSTOMERS).forEach((fullName, i) => {
    const role = i < DESIGNERS ? "INTERIOR_DESIGNER" : "CUSTOMER";
    const base = fullName.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
    let username = base;
    for (let n = 2; taken.has(username); n++) username = `${base}${n}`;
    taken.add(username);
    const createdAt = role === "CUSTOMER" ? new Date(t - int(r, 30, 365) * DAY - int(r, 0, 23) * HOUR) : new Date(t - int(r, 150, 700) * DAY);
    const bio = role === "CUSTOMER"
      ? (r() < 0.5 ? pick(r, CUSTOMER_BIOS) : null)
      : `Interior designer with ${int(r, 3, 20)} years of experience in ${pick(r, DESIGNER_FOCUS)}.`;
    const lastLogin = r() < 0.7 ? between(r, Math.max(createdAt.getTime(), t - 20 * DAY), t - HOUR) : null;
    accounts.push({ username, fullName, role, createdAt, phone: phone(r, pick(r, ["8", "9"])), bio, lastLogin });
  });
  const hashes = await Promise.all(accounts.map(() => hashPassword(SAMPLE_PASSWORD)));
  const inserted = await insertRows<{ id: number; username: string }>(db, "user_accounts",
    [["username", "text"], ["email", "text"], ["full_name", "text"], ["password_hash", "text"], ["role", "text"], ["phone", "text"],
      ["bio", "text"], ["created_at", "timestamptz"], ["last_login_at", "timestamptz"]],
    accounts.map((a, i) => [a.username, `${a.username}@${SAMPLE_EMAIL_DOMAIN}`, a.fullName, hashes[i], a.role, a.phone, a.bio,
      iso(a.createdAt), a.lastLogin ? iso(a.lastLogin) : null]),
    "id, username");
  const idOf = new Map(inserted.map((u) => [u.username, u.id]));
  const people = accounts.map((a) => ({ id: idOf.get(a.username)!, username: a.username, createdAt: a.createdAt.getTime(), role: a.role }));
  const designers: Person[] = people.filter((p) => p.role === "INTERIOR_DESIGNER");
  const customers: Person[] = people.filter((p) => p.role === "CUSTOMER");

  // --------------------------------------------------------------- companies
  await insertRows(db, "companies",
    [["designer_id", "int"], ["name", "text"], ["registration_number", "text"], ["description", "text"], ["address", "text"],
      ["phone", "text"], ["email", "text"], ["website", "text"], ["years_in_business", "int"], ["specialties", "text"], ["updated_at", "timestamptz"]],
    COMPANY_NAMES.slice(0, COMPANIES).map((name, i) => {
      const slug = name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");
      const styles = shuffle(r, STYLES).slice(0, 2).join(", ");
      return [designers[i].id, name, `20${int(r, 10, 23)}${int(r, 10000, 99999)}${pick(r, ["K", "M", "N", "R", "W"])}`,
        `${name} designs ${pick(r, DESIGNER_FOCUS)}, from the first sketch to the final handover.`,
        `${int(r, 1, 120)} ${STREETS[i]}, #0${int(r, 1, 9)}-${int(r, 10, 40)}`, phone(r, "6"), `hello@${slug}.${SAMPLE_EMAIL_DOMAIN}`,
        `https://${slug}.${SAMPLE_EMAIL_DOMAIN}`, int(r, 2, 25), `${styles}, ${pick(r, ["HDB & condo renovation", "Landed homes", "Commercial fit-outs", "Small spaces"])}`,
        iso(new Date(designers[i].createdAt + int(r, 1, 30) * DAY))];
    }));

  // -------------------------------------------------------------- categories
  const existing = new Set((await db.query<{ name: string }>(`select lower(name) as name from categories`)).map((c) => c.name));
  const newCategories = [...SAMPLE_CATEGORIES, ...SPARE_CATEGORIES].filter(([name]) => !existing.has(name.toLowerCase())).slice(0, CATEGORIES);
  await insertRows(db, "categories", [["name", "text"], ["description", "text"], ["created_at", "timestamptz"]],
    newCategories.map(([name, description]) => [name, description, iso(new Date(t - int(r, 60, 400) * DAY))]));
  const categoryId = new Map((await db.query<{ id: number; name: string }>(`select id, name from categories`)).map((c) => [c.name, c.id]));

  // ---------------------------------------------------------------- projects
  // Projects 0, 3, 6, ... 27 are the 10 most-shortlisted; project 1 is the best-reviewed. 18 are past, 32 are current.
  const HOT = HOT_FAVOURITES.map((_, i) => i * 3);
  const FEATURED = 1;
  const kinds = [...shuffle(r, PROJECT_KINDS), ...shuffle(r, PROJECT_KINDS)];
  const titles = new Set<string>();
  const projectRows: unknown[][] = [];
  const planned: Omit<SampleProject, "id">[] = [];
  for (let i = 0; i < PROJECTS; i++) {
    const designer = designers[i < DESIGNERS ? i : i - DESIGNERS];
    const status = i % 3 === 1 || i === 2 ? "PAST" : "CURRENT";
    const kind = kinds[i];
    const style = pick(r, STYLES), place = pick(r, LOCATIONS), noun = pick(r, kind.nouns);
    const styleTitle = style.replace(/(^|[\s-])([a-z])/g, (_, sep: string, c: string) => sep + c.toUpperCase()); // "Urban Modern"
    let title = `${pick(r, ADJECTIVES)} ${styleTitle} ${noun} in ${place}`;
    while (titles.has(title)) title = `${pick(r, ADJECTIVES)} ${styleTitle} ${noun} in ${pick(r, LOCATIONS)}`;
    titles.add(title);
    const latest = HOT.includes(i) ? t - 40 * DAY : i === FEATURED ? t - 60 * DAY : t - 20 * DAY;
    const created = between(r, Math.max(designer.createdAt + 7 * DAY, t - 330 * DAY), latest);
    const createdDay = sgDate(created);
    const end = status === "PAST" ? addDays(createdDay, -int(r, 0, 20)) : null;
    const start = end ? addDays(end, -int(r, 25, 140)) : addDays(createdDay, -int(r, 0, 25));
    const budget = kind.commercial ? int(r, 120, 520) * 500 : int(r, 24, 190) * 500;
    const description = `A ${style.toLowerCase()} ${noun.toLowerCase()} for ${pick(r, kind.commercial ? BUSINESS_CLIENTS : CLIENTS)} in ${place}. `
      + `${pick(r, FEATURES)} ${pick(r, status === "PAST" ? PAST_NOTES : CURRENT_NOTES)}`;
    projectRows.push([designer.id, categoryId.get(kind.category) ?? categoryId.get("Whole Home") ?? null, title, description, style, place,
      budget, status, start, end, iso(created), iso(created)]);
    planned.push({ title, designerId: designer.id, createdAt: created.getTime(), status });
  }
  const projectIds = new Map((await insertRows<{ id: number; title: string }>(db, "design_projects",
    [["designer_id", "int"], ["category_id", "int"], ["title", "text"], ["description", "text"], ["style", "text"], ["location", "text"],
      ["budget", "numeric"], ["status", "text"], ["start_date", "date"], ["end_date", "date"], ["created_at", "timestamptz"], ["updated_at", "timestamptz"]],
    projectRows, "id, title")).map((p) => [p.title, p.id]));
  const projects: SampleProject[] = planned.map((p) => ({ ...p, id: projectIds.get(p.title)! }));

  /** Customers in random order who already had an account at the given time. */
  const customersBefore = (time: number) => shuffle(r, customers.filter((c) => c.createdAt < time - DAY));

  // ----------------------------------------------- favourites (+ SHORTLIST activity each)
  const favourites: [number, number, string][] = []; // customer, project, time
  HOT.forEach((index, k) => {
    const p = projects[index];
    for (const c of customersBefore(t - 14 * DAY).slice(0, HOT_FAVOURITES[k])) favourites.push([c.id, p.id, iso(between(r, t - 14 * DAY, t - 2 * HOUR))]);
  });
  const others = shuffle(r, projects.filter((_, i) => !HOT.includes(i))).slice(0, OTHER_FAVOURITES);
  for (const p of others) {
    const c = customersBefore(t)[0];
    favourites.push([c.id, p.id, iso(between(r, Math.max(p.createdAt, c.createdAt) + DAY, t - 2 * HOUR))]);
  }
  await insertRows(db, "favourites", [["customer_id", "int"], ["project_id", "int"], ["created_at", "timestamptz"]], favourites);

  // ---------------------------------------------------------------- views
  const views: [number, number | null, string][] = []; // project, viewer (null = visitor), time
  const viewCount = new Map<number, number>();
  const popular = [...HOT, 30];
  const single = shuffle(r, projects.map((_, i) => i).filter((i) => !popular.includes(i))).slice(0, SINGLE_VIEWS);
  [...popular.map((i, k) => [i, POPULAR_VIEWS[k]]), ...single.map((i) => [i, 1])].forEach(([index, n]) => {
    const p = projects[index];
    viewCount.set(p.id, n);
    for (let v = 0; v < n; v++) {
      const at = r() < 0.6 ? between(r, Math.max(p.createdAt, t - 30 * DAY), t - HOUR) : between(r, p.createdAt, t - HOUR);
      const viewer = r() < 0.35 ? null : customersBefore(at.getTime())[0] ?? null;
      views.push([p.id, viewer?.id ?? null, iso(at)]);
    }
  });
  await insertRows(db, "project_activities", [["project_id", "int"], ["user_id", "int"], ["type", "text"], ["occurred_at", "timestamptz"]],
    [...views.map(([p, u, at]) => [p, u, "VIEW", at]), ...favourites.map(([c, p, at]) => [p, c, "SHORTLIST", at])]);
  await db.query(
    `update design_projects p set view_count = coalesce(v.n, 0), shortlist_count = coalesce(f.n, 0)
       from design_projects q
       left join (select project_id, count(*)::int as n from project_activities where type = 'VIEW' group by project_id) v on v.project_id = q.id
       left join (select project_id, count(*)::int as n from favourites group by project_id) f on f.project_id = q.id
      where p.id = q.id and p.id = any(string_to_array($1, ',')::int[])`,
    [projects.map((p) => p.id).join(",")],
  );

  // ---------------------------------------------------------------- ratings
  // The featured project gets 29 ratings of 4 or 5 stars. The other 571 are spread over the other 49 projects
  // (4 to 20 each, past projects more often), all 3 stars or more.
  const ratingCounts = projects.map((_, i) => (i === FEATURED ? FEATURED_RATINGS : 4));
  let left = RATINGS - ratingCounts.reduce((a, b) => a + b, 0);
  while (left > 0) {
    const i = Math.floor(r() * PROJECTS);
    if (i === FEATURED || ratingCounts[i] >= 20) continue;
    if (projects[i].status === "CURRENT" && r() < 0.4) continue;
    ratingCounts[i]++;
    left--;
  }
  const ratingRows: unknown[][] = [];
  projects.forEach((p, i) => {
    for (const c of customersBefore(t - 2 * DAY).slice(0, ratingCounts[i])) {
      const score = i === FEATURED ? weighted(r, [[5, 0.7], [4, 0.3]]) : weighted(r, [[5, 0.35], [4, 0.45], [3, 0.2]]);
      const at = iso(between(r, Math.max(p.createdAt, c.createdAt) + DAY, t - HOUR));
      ratingRows.push([c.id, p.id, score, r() < 0.8 ? pick(r, COMMENTS[score]) : null, at, at]);
    }
  });
  await insertRows(db, "ratings",
    [["customer_id", "int"], ["project_id", "int"], ["score", "int"], ["comment", "text"], ["created_at", "timestamptz"], ["updated_at", "timestamptz"]],
    ratingRows);

  // ------------------------------------------------- availability (November 2026)
  const novemberDays: string[] = [];
  for (let d = 1; d <= 30; d++) {
    const day = `2026-11-${String(d).padStart(2, "0")}`;
    if (new Date(`${day}T00:00:00Z`).getUTCDay() !== 0) novemberDays.push(day); // no Sundays
  }
  const slotRows: unknown[][] = [];
  designers.slice(0, SLOTS_DESIGNERS).forEach((d, i) => {
    const times = SLOT_TIMES[i % SLOT_TIMES.length];
    for (let k = 0; k < 3; k++) {
      const day = novemberDays[(i * 3 + k * 8) % novemberDays.length];
      for (const [start, end] of times) {
        const booked = r() < (day < today ? 0.7 : 0.35);
        slotRows.push([d.id, day, start, end, booked ? "BOOKED" : "AVAILABLE", pick(r, SLOT_NOTES)]);
      }
    }
  });
  await insertRows(db, "availability_slots",
    [["designer_id", "int"], ["slot_date", "date"], ["start_time", "time"], ["end_time", "time"], ["status", "text"], ["note", "text"]], slotRows);

  // -------------------------------------------- reported issues (13 Oct - 12 Nov 2026)
  const staff = await db.query<{ id: number }>(
    `select id from user_accounts where role in ('USER_ADMIN','PLATFORM_MANAGEMENT') and status = 'ACTIVE' order by id`);
  const from = new Date(`${ISSUES_FROM}T08:00:00+08:00`).getTime();
  const to = new Date(`${ISSUES_TO}T23:00:00+08:00`).getTime();
  const pattern = ["RECTIFIED", "REVIEWED", "PENDING", "RECTIFIED", "REVIEWED", "RECTIFIED", "PENDING"];
  const issueRows: unknown[][] = [];
  for (let i = 0; i < ISSUES; i++) {
    const slice = (to - from) / ISSUES;
    let created = new Date(from + slice * i + r() * slice);
    const hour = Number(new Date(created.getTime() + 8 * HOUR).toISOString().slice(11, 13));
    if (hour < 8) created = new Date(created.getTime() + 9 * HOUR); // reports arrive in waking hours
    const at = created.getTime();
    const reporters = r() < 0.8 ? customers : designers;
    const reporter = shuffle(r, reporters.filter((p) => p.createdAt < at))[0] ?? designers[0];
    const type = weighted(r, [["BUG", 0.35], ["CONTENT", 0.2], ["ACCOUNT", 0.15], ["SPAM", 0.1], ["OTHER", 0.2]]);
    const [subject, description] = pick(r, ISSUE_TEXT[type]);
    let status = at > t - 2 * DAY || !staff.length ? "PENDING" : pattern[i % pattern.length];
    const handled = new Date(Math.min(at + int(r, 4, 72) * HOUR, t - HOUR));
    if (handled.getTime() <= at) status = "PENDING";
    const handler = status === "PENDING" ? null : staff[i % staff.length].id;
    const note = status === "REVIEWED" ? pick(r, REVIEWED_NOTES) : status === "RECTIFIED" ? pick(r, RECTIFIED_NOTES) : null;
    issueRows.push([reporter.id, type, subject, description, status, note, handler, iso(created),
      iso(status === "PENDING" ? created : handled), status === "RECTIFIED" ? iso(handled) : null]);
  }
  await insertRows(db, "issue_reports",
    [["reporter_id", "int"], ["type", "text"], ["subject", "text"], ["description", "text"], ["status", "text"], ["resolution_note", "text"],
      ["handled_by_id", "int"], ["created_at", "timestamptz"], ["updated_at", "timestamptz"], ["resolved_at", "timestamptz"]], issueRows);

  return {
    added: {
      designers: designers.length, customers: customers.length, companies: COMPANIES, categories: newCategories.length,
      projects: projects.length, currentProjects: projects.filter((p) => p.status === "CURRENT").length, ratings: ratingRows.length,
      favourites: favourites.length, activities: views.length + favourites.length, views: views.length, shortlists: favourites.length,
      slots: slotRows.length, issues: issueRows.length,
    },
    checks: await checkSampleData(db, projects, FEATURED, now),
  };
}

/** Reads the sample data back from the database and measures it against the targets. */
async function checkSampleData(db: Db, projects: SampleProject[], featured: number, now: Date): Promise<SampleDataChecks> {
  const ids = projects.map((p) => p.id).join(",");
  const sampleIds = `string_to_array($1, ',')::int[]`;
  const since = new Date(now.getTime() - 30 * DAY).toISOString();
  const domain = `%@${SAMPLE_EMAIL_DOMAIN}`;
  const n = async (text: string, params: unknown[]) => Number((await db.query<{ n: number }>(text, params))[0]?.n ?? 0);

  const featuredRow = (await db.query<{ count: number; low: number }>(
    `select count(*)::int as count, coalesce(min(score), 0)::int as low from ratings where project_id = $1::int`, [projects[featured].id]))[0];
  const otherRatings = (await db.query<{ most: number; low: number }>(
    `select coalesce(max(c), 0)::int as most, coalesce(min(low), 0)::int as low from (
       select count(*) as c, min(score) as low from ratings where project_id = any(${sampleIds}) and project_id <> $2::int group by project_id) x`,
    [ids, projects[featured].id]))[0];
  const slots = (await db.query<{ total: number; booked: number; outside: number }>(
    `select count(*)::int as total, count(*) filter (where s.status = 'BOOKED')::int as booked,
            count(*) filter (where s.slot_date < date '2026-11-01' or s.slot_date > date '2026-11-30')::int as outside
       from availability_slots s join user_accounts u on u.id = s.designer_id where u.email like $1`, [domain]))[0];
  const issues = (await db.query<{ total: number; pending: number; reviewed: number; rectified: number; outside: number }>(
    `select count(*)::int as total, count(*) filter (where i.status = 'PENDING')::int as pending,
            count(*) filter (where i.status = 'REVIEWED')::int as reviewed, count(*) filter (where i.status = 'RECTIFIED')::int as rectified,
            count(*) filter (where i.created_at < timestamptz '${ISSUES_FROM} 00:00:00+08' or i.created_at >= timestamptz '${ISSUES_TO} 00:00:00+08' + interval '1 day')::int as outside
       from issue_reports i join user_accounts u on u.id = i.reporter_id where u.email like $1`, [domain]))[0];

  return {
    projectsShortlistedOver23In30Days: await n(
      `select count(*)::int as n from (select project_id from project_activities where type = 'SHORTLIST' and occurred_at >= $1::timestamptz
         group by project_id having count(*) > 23) x`, [since]),
    projectsWith12To70Views: await n(
      `select count(*)::int as n from design_projects where id = any(${sampleIds}) and view_count between 12 and 70`, [ids]),
    projectsWithViewCountMismatch: await n(
      `select count(*)::int as n from design_projects p where p.id = any(${sampleIds})
         and p.view_count <> (select count(*) from project_activities a where a.project_id = p.id and a.type = 'VIEW')`, [ids]),
    featuredProject: { title: projects[featured].title, ratings: featuredRow.count, lowestScore: featuredRow.low },
    mostRatingsOnAnyOtherProject: otherRatings.most,
    lowestScoreOnOtherProjects: otherRatings.low,
    slots: {
      total: slots.total, booked: slots.booked, available: slots.total - slots.booked, outsideNovember2026: slots.outside,
      overlapping: await n(
        `select count(*)::int as n from availability_slots a join availability_slots b
            on a.designer_id = b.designer_id and a.slot_date = b.slot_date and a.id < b.id
           and a.start_time < b.end_time and b.start_time < a.end_time
          join user_accounts u on u.id = a.designer_id where u.email like $1`, [domain]),
    },
    issues: { total: issues.total, pending: issues.pending, reviewed: issues.reviewed, rectified: issues.rectified, outsideDateRange: issues.outside },
  };
}

/** True when every requested target is met. Used by the seed script (which rolls back otherwise) and the tests. */
export function sampleDataProblems(result: SampleDataResult): string[] {
  const { added: a, checks: c } = result;
  const problems: string[] = [];
  const need = (ok: boolean, message: string) => { if (!ok) problems.push(message); };
  need(a.designers === DESIGNERS && a.customers === CUSTOMERS, "30 designers and 200 customers");
  need(a.companies === COMPANIES, "15 companies");
  need(a.categories === CATEGORIES, "20 categories");
  need(a.projects === PROJECTS && a.currentProjects >= 30, "50 projects, at least 30 current");
  need(a.ratings === RATINGS, "600 ratings");
  need(c.featuredProject.ratings === FEATURED_RATINGS && c.featuredProject.lowestScore >= 4, "one project with 29 ratings, all above 3");
  need(c.mostRatingsOnAnyOtherProject < FEATURED_RATINGS && c.lowestScoreOnOtherProjects >= 3, "other projects: fewer ratings, all above 2");
  need(a.favourites <= 300 && c.projectsShortlistedOver23In30Days >= 10, "at most 300 favourites; 10+ projects shortlisted over 23 times in 30 days");
  need(a.activities === 415 && c.projectsWith12To70Views >= 10 && c.projectsWithViewCountMismatch === 0, "415 activities; 10+ projects with 12-70 views");
  need(c.slots.total === 96 && c.slots.booked > 0 && c.slots.available > 0 && c.slots.outsideNovember2026 === 0 && c.slots.overlapping === 0,
    "96 non-overlapping November 2026 slots, booked and available");
  need(c.issues.total === ISSUES && c.issues.pending > 0 && c.issues.reviewed > 0 && c.issues.rectified > 0 && c.issues.outsideDateRange === 0,
    "71 issues between 13 Oct and 12 Nov 2026 with all three statuses");
  return problems;
}
