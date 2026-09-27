export type Focus = "recent" | "relevant" | "balanced";

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type LanguageStatus = "native" | "bilingual";

export interface LanguageProficiency {
  framework: "CEFR";
  level: CefrLevel;
  status?: LanguageStatus;
}

export interface XcvWorkMeta {
  id?: string;
  sourceId?: string;
  proficiency?: LanguageProficiency;
}

export interface WorkEntry {
  name: string;
  location?: string;
  description?: string;
  position: string;
  url?: string;
  startDate: string;
  endDate?: string;
  summary?: string;
  highlights?: string[];
  keywords?: string[];
  "x-cv"?: XcvWorkMeta;
}

export interface EducationEntry {
  institution: string;
  url?: string;
  area?: string;
  studyType?: string;
  startDate?: string;
  endDate?: string;
  score?: string;
  courses?: string[];
  "x-cv"?: XcvWorkMeta;
}

export interface LanguageEntry {
  language: string;
  fluency: string;
  "x-cv"?: XcvWorkMeta;
}

export interface SkillEntry {
  name: string;
  level?: string;
  keywords?: string[];
}

export interface StrengthEntry {
  name: string;
  keywords: string[];
}

export interface OtherExperience {
  count: number;
  totalCareerEntries: number;
  dateRange?: string;
  highlightedWorkIds: string[];
  highlightedNames: string[];
  summary: string;
}

export interface Resume {
  $schema?: string;
  basics?: {
    name?: string;
    label?: string;
    image?: string;
    email?: string;
    phone?: string;
    url?: string;
    summary?: string;
    location?: Record<string, string>;
    profiles?: Array<Record<string, string>>;
  };
  work?: WorkEntry[];
  volunteer?: Array<Record<string, unknown>>;
  education?: EducationEntry[];
  awards?: Array<Record<string, string>>;
  certificates?: Array<Record<string, string>>;
  publications?: Array<Record<string, unknown>>;
  skills?: SkillEntry[];
  languages?: LanguageEntry[];
  interests?: Array<Record<string, unknown>>;
  references?: Array<Record<string, unknown>>;
  projects?: Array<Record<string, unknown>>;
  meta?: Record<string, unknown> & {
    "x-cv"?: {
      kind: "canonical" | "printable";
      language?: string;
      source?: string;
      canonicalPath?: string;
      canonicalSha256?: string;
      useCase?: string;
      targetJob?: string | null;
      focus?: Focus;
      selectedWorkIds?: string[];
      omittedWorkIds?: string[];
    };
  };
  "x-cv"?: {
    strengths?: StrengthEntry[];
    otherExperience?: OtherExperience;
  };
}

export interface ValidationResult {
  valid: boolean;
  kind: "canonical" | "printable" | "standard";
  errors: string[];
  warnings: string[];
  canonicalPath?: string;
  pageCount?: number;
}
