/**
 * Word lists for the deterministic ATS checker. No network, no model.
 * Sources: 2026 ATS checklists (Jobscan, ATSChecker study), OpenResume parser heuristics,
 * recruiter guidance on "AI-sounding" prose, and common job-description boilerplate.
 */

const ACTION_VERB_BASES = [
  "act", "adopt", "advocate", "approve", "arrange", "attain", "automate", "calculate", "capture", "certify", "chair", "collect", "compile", "compose", "conceive", "conduct", "consult",
  "convert", "correct", "craft", "customize", "decommission", "delegate", "demonstrate", "deprecate", "derive", "devise", "digitize", "discover", "distribute", "draft", "earn", "edit",
  "embed", "encrypt", "enforce", "enrich", "examine", "exceed", "expedite", "experiment", "explain", "explore", "export", "extract", "finalize", "forecast", "formulate", "gather", "govern",
  "host", "incorporate", "index", "influence", "inform", "inspect", "install", "institute", "instruct", "interface", "interpret", "interview", "invent", "isolate", "iterate", "liaise",
  "localize", "log", "lower", "maximize", "mediate", "merge", "minimize", "mitigate", "modify", "normalize", "observe", "obtain", "originate", "outline", "oversee", "package", "parallelize",
  "patch", "pinpoint", "pioneer", "port", "predict", "prepare", "preserve", "prevent", "process", "procure", "profile", "protect", "prove", "provision", "quantify", "query", "rank", "reach",
  "realize", "recommend", "reconcile", "record", "recover", "reengineer", "refine", "reinforce", "relaunch", "renew", "reorganize", "repair", "reproduce", "respond", "restore", "retire",
  "retrieve", "revamp", "revise", "rotate", "route", "run", "safeguard", "save", "schedule", "script", "segment", "shape", "share", "shorten", "showcase", "shrink", "sketch", "slash", "sort",
  "source", "split", "stage", "start", "steer", "store", "study", "submit", "summarize", "supply", "surpass", "survey", "switch", "synchronize", "synthesize", "tailor", "target", "tighten",
  "trace", "transfer", "transition", "trim", "uncover", "unblock", "undertake", "update", "upskill", "vet", "visualize", "volunteer", "wire",
  "accelerate", "achieve", "adapt", "add", "administer", "advise", "align", "analyze", "analyse", "architect", "assemble", "assess", "audit", "author", "automate",
  "build", "benchmark", "boost", "centralize", "champion", "clarify", "coach", "code", "collaborate", "communicate", "complete", "configure", "consolidate", "contribute", "coordinate", "create", "cut",
  "debug", "decrease", "define", "deliver", "deploy", "design", "detect", "develop", "diagnose", "direct", "document", "double", "drive",
  "eliminate", "enable", "engineer", "enhance", "ensure", "establish", "estimate", "evaluate", "execute", "expand", "extend",
  "facilitate", "fix", "formalize", "found", "generate", "grow", "guide", "halve", "handle", "harden", "hire", "identify", "implement", "improve", "increase", "initiate", "instrument", "integrate", "introduce", "investigate",
  "launch", "lead", "maintain", "manage", "map", "measure", "mentor", "migrate", "model", "modernize", "monitor", "negotiate",
  "onboard", "operate", "optimize", "optimise", "orchestrate", "organize", "overhaul", "own", "partner", "perform", "pilot", "plan", "present", "prioritize", "produce", "program", "promote", "propose", "prototype", "provide", "publish",
  "raise", "rebuild", "recruit", "redesign", "reduce", "refactor", "release", "remediate", "remove", "replace", "report", "research", "resolve", "restructure", "review", "rewrite", "roll",
  "scale", "secure", "select", "serve", "set", "ship", "simplify", "solve", "specify", "speed", "sponsor", "stabilize", "standardize", "streamline", "strengthen", "structure", "supervise", "support", "sustain",
  "teach", "test", "track", "train", "transform", "translate", "triage", "triple", "troubleshoot", "tune", "unify", "upgrade", "validate", "verify", "win", "write",
];

const IRREGULAR_PAST: Record<string, string[]> = {
  build: ["built"], cut: ["cut"], drive: ["drove", "driven"], found: ["founded"], grow: ["grew", "grown"], lead: ["led"], make: ["made"], run: ["ran", "run"], set: ["set"],
  win: ["won"], write: ["wrote", "written"], speed: ["sped"], hold: ["held"], keep: ["kept"], bring: ["brought"], teach: ["taught"], rebuild: ["rebuilt"], rewrite: ["rewrote", "rewritten"],
};

function inflect(base: string): string[] {
  const forms = new Set<string>([base]);
  const last = base.at(-1)!;
  const beforeLast = base.at(-2) ?? "";
  const vowels = "aeiou";
  if (base.endsWith("e")) {
    forms.add(`${base}d`).add(`${base.slice(0, -1)}ing`).add(`${base}s`);
  } else if (last === "y" && !vowels.includes(beforeLast)) {
    forms.add(`${base.slice(0, -1)}ied`).add(`${base}ing`).add(`${base.slice(0, -1)}ies`);
  } else if (/[sxz]$|ch$|sh$/.test(base)) {
    forms.add(`${base}ed`).add(`${base}ing`).add(`${base}es`);
  } else if (base.length <= 5 && !vowels.includes(last) && vowels.includes(beforeLast) && !vowels.includes(base.at(-3) ?? "") && !"wxy".includes(last)) {
    forms.add(`${base}${last}ed`).add(`${base}${last}ing`).add(`${base}s`);
  } else {
    forms.add(`${base}ed`).add(`${base}ing`).add(`${base}s`);
  }
  for (const irregular of IRREGULAR_PAST[base] ?? []) forms.add(irregular);
  return [...forms];
}

/** Every accepted first word of a highlight, lower-cased. */
export const ACTION_VERB_FORMS: ReadonlySet<string> = new Set([
  ...ACTION_VERB_BASES.flatMap(inflect),
  "co-founded", "cofounded", "co-led", "re-architected", "rearchitected", "spearheaded",
]);

/** Vocabulary that reads as generated text to recruiters and LLM rankers. Multi-word entries are matched as phrases. */
export const AI_TELL_WORDS: readonly string[] = [
  "spearheaded", "spearhead", "leveraged", "leverage", "leveraging", "passionate", "results-driven", "cutting-edge", "synergy", "synergies",
  "delve", "dynamic", "seamless", "seamlessly", "robust", "utilize", "utilized", "utilizing", "innovative", "visionary", "holistic", "empower", "empowered", "empowering",
  "foster", "fostered", "fostering", "meticulous", "proactive", "state-of-the-art", "best-in-class", "world-class", "detail-oriented", "team player", "self-starter",
  "pivotal", "tapestry", "navigate", "navigated", "unlock", "unlocked", "harness the", "harnessed the", "elevate", "elevated", "game-changer", "thought leader", "go-getter",
];

/** Duty phrasing that hides the outcome. */
export const WEAK_PHRASES: readonly string[] = [
  "responsible for", "duties included", "helped with", "worked on", "involved in", "assisted with", "tasked with", "in charge of", "participated in",
];

/**
 * Degree words that parsers and screeners recognise. Abbreviations alone ("MSc", "BSc") and
 * local titles ("Ingeniero", "Diplom-Informatiker") often read as "no degree found".
 */
export const DEGREE_WORDS = /\b(bachelor|master|doctor|doctorate|ph\.?\s?d|associate|diploma|mba|certificate)\b/i;

export const FIRST_PERSON = /\b(i|my|me|mine|we|our|ours)\b/i;

/** Acronym and spelled-out pairs; either side counts as the other for keyword matching. */
export const ACRONYMS: ReadonlyArray<readonly [string, string]> = [
  ["AWS", "Amazon Web Services"], ["GCP", "Google Cloud Platform"], ["K8s", "Kubernetes"], ["CI/CD", "Continuous Integration"], ["CI/CD", "Continuous Delivery"],
  ["IaC", "Infrastructure as Code"], ["ML", "Machine Learning"], ["AI", "Artificial Intelligence"], ["NLP", "Natural Language Processing"], ["ETL", "Extract Transform Load"],
  ["SRE", "Site Reliability Engineering"], ["TDD", "Test-Driven Development"], ["DDD", "Domain-Driven Design"], ["OOP", "Object-Oriented Programming"], ["SaaS", "Software as a Service"],
  ["BI", "Business Intelligence"], ["IoT", "Internet of Things"], ["ROS", "Robot Operating System"], ["QA", "Quality Assurance"], ["KPI", "Key Performance Indicator"],
  ["SDLC", "Software Development Life Cycle"], ["UX", "User Experience"], ["UI", "User Interface"], ["TS", "TypeScript"], ["JS", "JavaScript"], ["API", "Application Programming Interface"],
  ["REST", "Representational State Transfer"], ["SQL", "Structured Query Language"], ["IAM", "Identity and Access Management"], ["SSO", "Single Sign-On"], ["MFA", "Multi-Factor Authentication"],
  ["SIEM", "Security Information and Event Management"], ["SOC", "Security Operations Center"], ["GDPR", "General Data Protection Regulation"], ["PCI DSS", "Payment Card Industry Data Security Standard"],
  ["OWASP", "Open Worldwide Application Security Project"], ["RBAC", "Role-Based Access Control"], ["SAML", "Security Assertion Markup Language"], ["OIDC", "OpenID Connect"],
  ["ISMS", "Information Security Management System"], ["GRC", "Governance Risk and Compliance"], ["DevOps", "Development and Operations"], ["PM", "Product Manager"], ["EM", "Engineering Manager"],
];

/**
 * Acronyms whose spelled-out form job postings and filters actually use. Only these trigger an
 * "add the expansion" suggestion; nobody writes "Structured Query Language" on a CV.
 */
export const ACRONYM_SUGGEST: ReadonlySet<string> = new Set([
  "AWS", "GCP", "CI/CD", "IaC", "ML", "AI", "NLP", "SRE", "TDD", "DDD", "OOP", "SaaS", "BI", "IoT", "QA", "KPI",
  "IAM", "SSO", "MFA", "SIEM", "GDPR", "OWASP", "RBAC", "GRC", "ISMS",
]);

/** English function words plus job-posting boilerplate that never counts as a skill. */
export const STOPWORDS: ReadonlySet<string> = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "else", "of", "in", "on", "at", "to", "for", "with", "without", "from", "by", "as", "is", "are", "was", "were", "be", "been", "being",
  "it", "its", "this", "that", "these", "those", "there", "here", "you", "your", "yours", "we", "our", "ours", "us", "they", "their", "them", "he", "she", "his", "her", "i", "my", "me",
  "will", "would", "should", "could", "can", "may", "might", "must", "shall", "do", "does", "did", "done", "have", "has", "had", "having", "not", "no", "yes", "so", "than", "too", "very",
  "also", "about", "across", "after", "before", "between", "into", "over", "under", "through", "up", "down", "out", "off", "per", "via", "while", "within", "both", "each", "all", "any", "some",
  "such", "more", "most", "other", "another", "own", "same", "new", "well", "who", "whom", "what", "which", "when", "where", "why", "how", "etc",
  "experience", "experienced", "years", "year", "team", "teams", "strong", "ability", "able", "knowledge", "skills", "skill", "preferred", "required", "requirements", "requirement",
  "responsibilities", "responsibility", "role", "roles", "position", "job", "work", "working", "candidate", "candidates", "ideal", "plus", "bonus", "nice", "good", "great", "excellent",
  "proven", "track", "record", "background", "familiarity", "familiar", "understanding", "understand", "hands-on", "hands", "including", "include", "includes", "related", "relevant",
  "degree", "bachelor", "master", "equivalent", "field", "fields", "environment", "environments", "company", "companies", "customer", "customers", "product", "products", "business",
  "stakeholders", "stakeholder", "communication", "collaborate", "collaboration", "collaborative", "fast-paced", "join", "looking", "seeking", "offer", "offers", "benefits", "salary",
  "location", "remote", "hybrid", "onsite", "full-time", "part-time", "m/f/d", "w/m/d", "f/m/d", "m/w/d", "d/f/m", "gn", "mfd", "wmd", "fmd", "mwd", "dfm", "apply", "application",
  "english", "german", "fluent", "fluency", "level", "senior", "junior", "lead", "mid", "staff", "principal", "engineer", "engineers", "engineering", "developer", "developers", "development",
  "software", "technical", "technology", "technologies", "tools", "tool", "using", "use", "used", "build", "building", "design", "designing", "develop", "developing", "deliver", "delivering",
  "ensure", "ensuring", "support", "supporting", "help", "helping", "drive", "driving", "own", "owning", "manage", "managing", "day", "days", "week", "weeks", "month", "months",
  "we're", "you're", "you'll", "we'll", "what", "about", "us", "who", "are", "role", "responsibilities", "qualifications", "requirements",
]);

/** Seed list of technologies and practices used to recognise skill terms inside a job description. */
export const TECH_SKILLS: ReadonlySet<string> = new Set([
  // languages
  "typescript", "javascript", "python", "java", "kotlin", "scala", "go", "golang", "rust", "c", "c++", "c#", "ruby", "php", "swift", "objective-c", "dart", "elixir", "erlang", "haskell", "clojure", "r", "matlab", "bash", "shell", "powershell", "sql", "plsql", "t-sql", "graphql", "html", "css", "sass", "less",
  // frontend
  "react", "react native", "next.js", "nextjs", "vue", "vue.js", "nuxt", "angular", "svelte", "sveltekit", "redux", "mobx", "zustand", "tailwind", "tailwind css", "storybook", "webpack", "vite", "babel", "esbuild", "rollup", "jest", "vitest", "cypress", "playwright", "testing library", "web components", "pwa", "accessibility", "wcag", "flutter", "expo", "ios", "android", "swiftui", "jetpack compose",
  // backend
  "node.js", "nodejs", "node", "express", "nestjs", "nest.js", "fastify", "koa", "hapi", "deno", "bun", "spring", "spring boot", "quarkus", "micronaut", "django", "flask", "fastapi", "rails", "ruby on rails", "laravel", "symfony", "asp.net", ".net", "dotnet", "phoenix", "gin", "fiber", "grpc", "rest", "rest api", "restful", "openapi", "swagger", "graphql", "apollo", "websockets", "webhooks", "microservices", "monolith", "event-driven", "event sourcing", "cqrs", "domain-driven design", "ddd", "serverless", "oauth", "oauth2", "oidc", "openid connect", "saml", "jwt", "sso", "mfa",
  // data
  "postgresql", "postgres", "mysql", "mariadb", "sqlite", "oracle", "sql server", "mongodb", "dynamodb", "cassandra", "redis", "memcached", "elasticsearch", "opensearch", "solr", "neo4j", "clickhouse", "snowflake", "bigquery", "redshift", "databricks", "spark", "apache spark", "hadoop", "hive", "presto", "trino", "flink", "kafka", "apache kafka", "rabbitmq", "sqs", "sns", "pub/sub", "kinesis", "airflow", "dbt", "prefect", "dagster", "etl", "elt", "data warehouse", "data lake", "lakehouse", "data modeling", "data pipeline", "data pipelines", "pandas", "numpy", "scikit-learn", "sklearn", "pytorch", "tensorflow", "keras", "xgboost", "mlops", "machine learning", "deep learning", "llm", "llms", "rag", "openai", "anthropic", "langchain", "vector database", "embeddings", "prompt engineering", "tableau", "power bi", "looker", "metabase", "superset", "grafana",
  // cloud and devops
  "aws", "amazon web services", "azure", "gcp", "google cloud", "google cloud platform", "ec2", "s3", "lambda", "ecs", "eks", "fargate", "rds", "aurora", "cloudfront", "route 53", "iam", "cloudformation", "cdk", "terraform", "pulumi", "ansible", "chef", "puppet", "docker", "kubernetes", "k8s", "helm", "istio", "linkerd", "openshift", "nomad", "linux", "ubuntu", "debian", "nginx", "apache", "haproxy", "envoy", "ci/cd", "continuous integration", "continuous delivery", "continuous deployment", "github actions", "gitlab ci", "jenkins", "circleci", "argocd", "argo cd", "flux", "gitops", "prometheus", "datadog", "new relic", "splunk", "elk", "kibana", "logstash", "opentelemetry", "jaeger", "sentry", "pagerduty", "on-call", "sre", "site reliability", "observability", "monitoring", "incident management", "infrastructure as code", "iac", "devops", "platform engineering", "cost optimization", "finops",
  // security and compliance
  "security", "application security", "appsec", "devsecops", "owasp", "penetration testing", "pentesting", "threat modeling", "vulnerability management", "siem", "soc", "soc 2", "soc2", "iso 27001", "iso27001", "nist", "gdpr", "pci dss", "pci-dss", "hipaa", "dora", "nis2", "bafin", "mifid", "kyc", "aml", "fraud detection", "encryption", "tls", "pki", "zero trust", "identity and access management", "rbac", "abac", "secrets management", "vault", "hashicorp vault", "cryptography", "compliance", "risk management", "audit", "grc", "isms", "data protection", "privacy", "security awareness", "incident response", "forensics", "bug bounty", "secure coding", "sast", "dast", "sca", "snyk", "burp suite", "nmap", "wireshark", "metasploit", "kali linux",
  // practices and process
  "agile", "scrum", "kanban", "safe", "lean", "xp", "tdd", "test-driven development", "bdd", "pair programming", "code review", "code reviews", "trunk-based development", "feature flags", "a/b testing", "experimentation", "unit testing", "integration testing", "end-to-end testing", "e2e", "contract testing", "performance testing", "load testing", "chaos engineering", "architecture", "system design", "distributed systems", "high availability", "scalability", "caching", "api design", "clean architecture", "hexagonal architecture", "design patterns", "refactoring", "technical debt", "documentation", "adr", "mentoring", "mentorship", "coaching", "hiring", "roadmap", "okrs", "product discovery", "stakeholder management", "cross-functional", "jira", "confluence", "linear", "notion", "figma", "git", "github", "gitlab", "bitbucket",
  // domains
  "fintech", "payments", "banking", "trading", "brokerage", "insurance", "e-commerce", "ecommerce", "marketplace", "logistics", "supply chain", "healthcare", "healthtech", "edtech", "proptech", "climate tech", "sustainability", "circular economy", "recycling", "waste management", "mobility", "automotive", "iot", "robotics", "telecom", "media", "adtech", "martech", "hr tech", "saas", "b2b", "b2c", "analytics", "reporting", "dashboards", "data intelligence",
]);

export const JOB_COVERAGE_WARN_BELOW = 60;
export const SUMMARY_WORDS = { min: 60, max: 90 } as const;
export const BULLET_MAX_WORDS = 30;
export const STRENGTH_GROUPS = { min: 3, max: 5 } as const;
