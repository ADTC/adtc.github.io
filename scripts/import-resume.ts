/**
 * Generates src/data/resume.json from the resume Markdown in the private resume-hd repo.
 *
 *   npm run import-resume
 *   npm run import-resume -- path/to/resume.md
 *
 * This repo is public. Only link entries are kept from the Contact section, and the
 * script refuses to write output that contains an email address or a phone number.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Lexer, type Token, type Tokens } from "marked";
import type {
  Company,
  Education,
  Period,
  ProfileLink,
  Project,
  Resume,
  SkillGroup,
  SkillItem,
} from "../src/lib/resume-types.ts";

const DEFAULT_SOURCE = "../resume-hd/resumes/Resume-Senior-Full-Stack-Engineer.md";
const OUTPUT = "src/data/resume.json";
const OWN_HOST = "adtc.github.io";
const SECTIONS = [
  "Contact",
  "Top Skills",
  "Languages",
  "Certifications",
  "Summary",
  "Experience",
  "Projects",
  "Education",
];

interface Group {
  title: string;
  body: Token[];
}

interface Entry {
  lead: string[];
  bullets: string[];
  trail: string[];
}

const clean = (text: string) => text.replace(/\s*\n\s*/g, " ").trim();

function isHeading(token: Token, depth: number): token is Tokens.Heading {
  return token.type === "heading" && (token as Tokens.Heading).depth === depth;
}

function splitByHeading(tokens: Token[], depth: number): { lead: Token[]; groups: Group[] } {
  const lead: Token[] = [];
  const groups: Group[] = [];
  for (const token of tokens) {
    const current = groups.at(-1);
    if (isHeading(token, depth)) groups.push({ title: clean(token.text), body: [] });
    else if (current) current.body.push(token);
    else lead.push(token);
  }
  return { lead, groups };
}

/** Paragraphs before the first list, list items, then paragraphs after the list. */
function parseEntry(tokens: Token[], where: string): Entry {
  const entry: Entry = { lead: [], bullets: [], trail: [] };
  for (const token of tokens) {
    if (token.type === "space") continue;
    if (token.type === "paragraph") {
      const text = clean((token as Tokens.Paragraph).text);
      (entry.bullets.length ? entry.trail : entry.lead).push(text);
    } else if (token.type === "list") {
      entry.bullets.push(...(token as Tokens.List).items.map((item) => clean(item.text)));
    } else {
      throw new Error(`${where}: unexpected ${token.type} block:\n${token.raw}`);
    }
  }
  return entry;
}

function onlyParagraphs(tokens: Token[], where: string): string[] {
  const { lead, bullets } = parseEntry(tokens, where);
  if (bullets.length) throw new Error(`${where}: expected paragraphs only, found a list`);
  return lead;
}

function onlyListItems(tokens: Token[], where: string): string[] {
  const { lead, bullets, trail } = parseEntry(tokens, where);
  if (lead.length || trail.length) throw new Error(`${where}: expected a list only, found paragraphs`);
  return bullets;
}

function parsePeriod(text: string, where: string): Period {
  const match = /^(.+?)\s+[-–]\s+(.+?)(?:\s+\((.+)\))?$/.exec(text);
  if (!match) throw new Error(`${where}: can't read the dates in "${text}"`);
  const [, start = "", end = "", duration] = match;
  return duration ? { start, end, duration } : { start, end };
}

function parseLinks(tokens: Token[]): ProfileLink[] {
  return onlyListItems(tokens, "Contact").flatMap((item) => {
    const match = /^\*\*(.+?):\*\*\s*\[(.+?)\]\((.+?)\)$/.exec(item);
    if (!match) return [];
    const [, label = "", text = "", url = ""] = match;
    const { protocol, hostname } = new URL(url);
    if (!["https:", "http:"].includes(protocol) || hostname === OWN_HOST) return [];
    return [{ label, text, url }];
  });
}

/** Splits on commas that aren't inside parentheses. */
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of text) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
}

function parseSkill(text: string): SkillItem {
  const match = /^(.+?)\s*\((.+)\)$/.exec(text);
  return match?.[1] && match[2] ? { name: match[1], detail: match[2] } : { name: text };
}

function parseSkills(tokens: Token[]): SkillGroup[] {
  const { lead, groups } = splitByHeading(tokens, 3);
  if (onlyParagraphs(lead, "Top Skills").length) {
    throw new Error('Top Skills: unexpected text before the first "###" group');
  }
  return groups.map(({ title, body }) => ({
    title,
    rows: onlyListItems(body, `Top Skills › ${title}`).map((item) => {
      const match = /^\*\*(.+?):\*\*\s*(.+)$/.exec(item);
      if (!match?.[1] || !match[2]) {
        throw new Error(`Top Skills › ${title}: expected "**Label:** items", found "${item}"`);
      }
      return { label: match[1], items: splitTopLevel(match[2]).map(parseSkill) };
    }),
  }));
}

function parseExperience(tokens: Token[]): Company[] {
  const companies: Company[] = [];
  for (const { title: name, body } of splitByHeading(tokens, 3).groups) {
    const { lead, groups } = splitByHeading(body, 4);
    const roles = groups.map(({ title, body: roleBody }) => {
      const where = `Experience › ${name} › ${title}`;
      const { lead: [period, ...meta], bullets, trail } = parseEntry(roleBody, where);
      if (!period) throw new Error(`${where}: missing the dates line`);
      return { title, period: parsePeriod(period, where), meta, bullets, notes: trail };
    });
    if (!roles.length) throw new Error(`Experience › ${name}: no "####" role headings`);

    const [duration, ...extra] = onlyParagraphs(lead, `Experience › ${name}`);
    if (extra.length) throw new Error(`Experience › ${name}: expected at most one line before the roles`);

    const previous = companies.at(-1);
    if (previous?.name === name) previous.roles.push(...roles);
    else companies.push(duration ? { name, duration, roles } : { name, roles });
  }
  return companies;
}

function parseProjects(tokens: Token[]): Project[] {
  return splitByHeading(tokens, 3).groups.map(({ title: name, body }) => {
    const where = `Projects › ${name}`;
    const { lead: [period, ...lead], bullets, trail } = parseEntry(body, where);
    if (!period) throw new Error(`${where}: missing the dates line`);

    let association: Project["association"];
    const description: string[] = [];
    for (const text of lead) {
      const match = /^Associated with (.+?):\s*(.+)$/.exec(text);
      if (match?.[1] && match[2]) association = { org: match[1], role: match[2] };
      else description.push(text);
    }

    let skills: string[] = [];
    const notes: string[] = [];
    for (const text of trail) {
      const match = /^Skills:\s*(.+)$/.exec(text);
      if (match?.[1]) skills = match[1].split(/\s*,\s*/);
      else notes.push(text);
    }

    return {
      name,
      period: parsePeriod(period, where),
      ...(association && { association }),
      description,
      bullets,
      skills,
      notes,
    };
  });
}

function parseEducation(tokens: Token[]): Education[] {
  return splitByHeading(tokens, 3).groups.map(({ title: school, body }) => {
    const where = `Education › ${school}`;
    const { lead, bullets, trail } = parseEntry(body, where);
    const match = lead.length === 1 && !trail.length ? /^(.*?)\s*·\s*\((.+)\)$/.exec(lead[0] ?? "") : null;
    if (!match?.[1] || !match[2]) throw new Error(`${where}: expected one "Credential · (Start - End)" line`);
    return { school, credential: match[1], period: parsePeriod(match[2], where), bullets };
  });
}

function lastUpdated(file: string): string {
  const cwd = dirname(file);
  try {
    const git = (...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
    const committed = git("log", "-1", "--format=%cs", "--", file);
    if (committed && !git("status", "--porcelain", "--", file)) return committed;
  } catch {
    // Not a git checkout: fall back to the file's modification date.
  }
  return statSync(file).mtime.toLocaleDateString("en-CA");
}

function findLeaks(json: string): string[] {
  const checks: [RegExp, string][] = [
    [/[\w.+-]+@[\w-]+\.[\w.-]+/, "an email address"],
    [/\+\d[\d\s-]{6,}\d/, "an international phone number"],
    [/\b\d{3,4}[\s-]\d{3}[\s-]\d{4}\b/, "a local phone number"],
    [/\b(?:mailto|tel):/i, "a mailto: or tel: link"],
  ];
  return checks.flatMap(([pattern, what]) => {
    const match = pattern.exec(json);
    return match ? [`${what} ("${match[0]}")`] : [];
  });
}

const source = resolve(process.argv[2] ?? DEFAULT_SOURCE);
const { lead: intro, groups } = splitByHeading(Lexer.lex(readFileSync(source, "utf8")), 2);

const nameHeading = intro.find((token): token is Tokens.Heading => isHeading(token, 1));
const [headline, ...extraIntro] = onlyParagraphs(
  intro.filter((token) => token !== nameHeading),
  "Introduction",
);
if (!nameHeading || !headline || extraIntro.length) {
  throw new Error('Expected a "# Name" heading followed by one headline paragraph');
}

const sections = new Map(groups.map(({ title, body }) => [title, body]));
for (const { title } of groups) {
  if (!SECTIONS.includes(title)) {
    throw new Error(`Unknown section "## ${title}". Teach scripts/import-resume.ts about it before publishing.`);
  }
}
if (sections.size !== groups.length) throw new Error("A section heading appears more than once");
const section = (title: string) => {
  const body = sections.get(title);
  if (!body) throw new Error(`Missing section "## ${title}"`);
  return body;
};

const resume: Resume = {
  updated: lastUpdated(source),
  name: clean(nameHeading.text),
  headline,
  links: parseLinks(section("Contact")),
  skills: parseSkills(section("Top Skills")),
  languages: Object.values(parseEntry(section("Languages"), "Languages")).flat(),
  certifications: onlyListItems(section("Certifications"), "Certifications"),
  summary: onlyParagraphs(section("Summary"), "Summary"),
  experience: parseExperience(section("Experience")),
  projects: parseProjects(section("Projects")),
  education: parseEducation(section("Education")),
};

const json = `${JSON.stringify(resume, null, 2)}\n`;
const leaks = findLeaks(json);
if (leaks.length) {
  throw new Error(`Refusing to write ${OUTPUT} because it would publish:\n- ${leaks.join("\n- ")}`);
}

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, json);

const roles = resume.experience.reduce((count, company) => count + company.roles.length, 0);
console.log(
  `Wrote ${OUTPUT} from ${source}\n` +
    `  ${resume.links.length} links, ${resume.experience.length} companies, ${roles} roles, ` +
    `${resume.projects.length} projects, ${resume.education.length} schools (updated ${resume.updated})`,
);
