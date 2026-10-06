import type { APIRoute } from "astro";
import data from "../data/resume.json";
import type { Period, Resume } from "../lib/resume-types";
import { site as profile } from "../site";

const resume: Resume = data;

const dates = (period: Period) => `${period.start} to ${period.end}`;

export const GET: APIRoute = ({ site }) => {
  const lines = [
    `# ${resume.name}`,
    "",
    `> ${resume.headline}`,
    "",
    `${profile.jobTitle} based in ${profile.location}. Languages: ${resume.languages.join(", ")}. Resume last updated ${resume.updated}.`,
    "",
    ...resume.summary.flatMap((text) => [text, ""]),
    "Skills:",
    "",
    ...resume.skills.flatMap((group) =>
      group.rows.map(
        (row) =>
          `- ${row.label}: ${row.items.map((item) => (item.detail ? `${item.name} (${item.detail})` : item.name)).join(", ")}`,
      ),
    ),
    "",
    "Experience:",
    "",
    ...resume.experience.flatMap((company) =>
      company.roles.map((role) => `- ${role.title}, ${company.name} (${dates(role.period)})`),
    ),
    "",
    "Selected projects:",
    "",
    ...resume.projects.map(
      (project) =>
        `- ${project.name}${project.association ? `, ${project.association.org}` : ""} (${dates(project.period)}): ${project.description.join(" ")}`,
    ),
    "",
    "Education:",
    "",
    ...resume.education.map((school) => `- ${school.credential}, ${school.school} (${dates(school.period)})`),
    "",
    "## Resume",
    "",
    `- [Full resume](${new URL("/", site)}): skills, experience, projects, education and certifications`,
    "",
    "## Profiles",
    "",
    ...resume.links.map((link) => `- [${link.label}](${link.url})`),
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
