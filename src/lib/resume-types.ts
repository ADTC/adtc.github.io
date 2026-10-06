export interface Period {
  start: string;
  end: string;
  duration?: string;
}

export interface ProfileLink {
  label: string;
  text: string;
  url: string;
}

export interface SkillItem {
  name: string;
  detail?: string;
}

export interface SkillRow {
  label: string;
  items: SkillItem[];
}

export interface SkillGroup {
  title: string;
  rows: SkillRow[];
}

export interface Role {
  title: string;
  period: Period;
  meta: string[];
  bullets: string[];
  notes: string[];
}

export interface Company {
  name: string;
  duration?: string;
  roles: Role[];
}

export interface Project {
  name: string;
  period: Period;
  association?: { org: string; role: string };
  description: string[];
  bullets: string[];
  skills: string[];
  notes: string[];
}

export interface Education {
  school: string;
  credential: string;
  period: Period;
  bullets: string[];
}

export interface Resume {
  updated: string;
  name: string;
  headline: string;
  links: ProfileLink[];
  skills: SkillGroup[];
  languages: string[];
  certifications: string[];
  summary: string[];
  experience: Company[];
  projects: Project[];
  education: Education[];
}
