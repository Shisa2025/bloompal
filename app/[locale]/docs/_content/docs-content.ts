export type Maturity = "CURRENT" | "PROPOSED" | "FUTURE" | "OPEN QUESTION";

export type DocsNavItem = {
  title: string;
  slug: string;
  description: string;
};

export type DocsNavGroup = {
  title: string;
  items: DocsNavItem[];
};

export type DocsBlock =
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "callout"; status: Maturity; title: string; body: string[] }
  | { type: "cards"; items: { title: string; status?: Maturity; body: string }[] }
  | { type: "comparison"; columns: { title: string; status: Maturity; items: string[] }[] }
  | { type: "steps"; items: string[] }
  | { type: "code"; language: string; value: string }
  | { type: "table"; headers: string[]; rows: string[][] };

export type DocsSection = {
  id: string;
  title: string;
  blocks: DocsBlock[];
};

export type DocsPage = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  status: Maturity;
  sections: DocsSection[];
};

const navItem = (title: string, slug: string, description: string): DocsNavItem => ({
  title,
  slug,
  description,
});

export const docsNavigation: DocsNavGroup[] = [
  {
    title: "Getting Started",
    items: [
      navItem("Introduction", "introduction", "Documentation home and maturity framing."),
      navItem("Current Prototype Status", "current-prototype-status", "What exists today in the prototype."),
      navItem("Roadmap & Maturity Labels", "maturity-labels", "How CURRENT, PROPOSED, FUTURE, and OPEN QUESTION should be read."),
      navItem("Terminology", "terminology", "Shared product, clinical, and technical vocabulary."),
    ],
  },
  {
    title: "Product & Users",
    items: [
      navItem("Product Vision", "product-vision", "BloomPal's rehabilitation-first product thesis."),
      navItem("Patient Experience", "patient-experience", "The patient-facing experience BloomPal is designed around."),
      navItem("Therapist / Clinician Experience", "therapist-experience", "How clinician review and guidance may evolve."),
      navItem("Organisation Administration", "organisation-administration", "Future institution-level administration at a high level."),
      navItem("BloomPal Administration", "bloompal-administration", "Future platform administration at a high level."),
    ],
  },
  {
    title: "Clinical Model",
    items: [
      navItem("Rehabilitation First / Game Second", "rehab-first-game-second", "How games support rehabilitation rather than replace it."),
      navItem("Rehabilitation Content Model", "rehabilitation-content-model", "How movements, exercises, tasks, and game activities relate."),
      navItem("Clinician Authority", "clinician-authority", "Future plan configuration and review authority."),
      navItem("Patient Agency", "patient-agency", "How patient choice can exist inside an authorised programme."),
      navItem("Personalisation & Difficulty", "personalisation-difficulty", "Difficulty and adaptation principles."),
      navItem("Progress Measurement", "progress-measurement", "From game scores toward meaningful progress indicators."),
      navItem("Human Oversight", "human-oversight", "Why automation should support clinical judgement."),
    ],
  },
  {
    title: "Architecture",
    items: [
      navItem("Current System Overview", "current-system-overview", "Current framework, routes, and prototype surfaces derived from code."),
      navItem("Application Surfaces", "application-surfaces", "Main, docs, app portal, and admin surface mapping."),
      navItem("Data Flow", "data-flow", "High-level flow from gameplay to dashboard review."),
      navItem("Current vs Future Architecture", "current-vs-future-architecture", "How the prototype maps to a future institutional product."),
      navItem("Future Cloud Architecture", "future-cloud-architecture", "Huawei and managed-cloud ideas as target architecture, not current deployment claims."),
    ],
  },
  {
    title: "Developer Guide",
    items: [
      navItem("Project Structure", "project-structure", "Current repository and application organisation."),
      navItem("Local Environment", "local-environment", "Local development setup notes."),
      navItem("Environment Variables", "environment-variables", "Environment variable names and handling without exposing values."),
      navItem("API", "api", "Currently observable route handlers and future API documentation boundary."),
      navItem("Database Schema & Data Dictionary", "database-schema-data-dictionary", "Current tables from migrations plus future modelling notes."),
      navItem("Migrations", "migrations", "Current migration scripts and safety notes."),
      navItem("Backup / Restore", "backup-restore", "Future backup and restore documentation boundary."),
      navItem("Testing", "testing", "Current test tooling and future test expectations."),
      navItem("Deployment", "deployment", "Current deployment documentation boundary and future hosting notes."),
    ],
  },
  {
    title: "Identity & Access",
    items: [
      navItem("Role Model", "role-model", "Current MVP roles and future conceptual authority model."),
      navItem("Current MVP Authentication", "current-mvp-authentication", "Current authentication behaviour derived from code."),
      navItem("Future Permission Model", "future-permission-model", "Future least-privilege permission model."),
      navItem("Privileged Administration", "privileged-administration", "Future privileged admin boundary."),
      navItem("Audit Logging", "audit-logging", "Future auditability requirements at a public-safe level."),
    ],
  },
  {
    title: "AI & Data",
    items: [
      navItem("Hand Tracking", "hand-tracking", "Current webcam hand tracking and future measurement direction."),
      navItem("Measurement Pipeline", "measurement-pipeline", "How interaction events can become progress metrics."),
      navItem("AI Maturity Model", "ai-maturity-model", "Responsible AI progression for BloomPal."),
      navItem("Model Governance", "model-governance", "Future model lifecycle and review principles."),
      navItem("Data Minimisation", "data-minimisation", "Collecting only useful and justified data."),
      navItem("Analytics", "analytics", "Current dashboard analytics and future interpretation boundaries."),
    ],
  },
  {
    title: "Security, Privacy & Compliance",
    items: [
      navItem("Security / Compliance Principles", "security-compliance-principles", "Safe public principles without claiming certification."),
      navItem("Privacy & Data Governance", "privacy-data-governance", "Public data-governance principles."),
      navItem("Role Separation", "role-separation", "Why access boundaries matter in future healthcare settings."),
      navItem("Regulatory Positioning", "regulatory-positioning", "Future regulatory questions and non-claims."),
      navItem("Quality / Change Control", "quality-change-control", "Future quality-process boundary."),
      navItem("Incident Management", "incident-management", "Future incident-response boundary."),
    ],
  },
  {
    title: "Roadmap & Pilots",
    items: [
      navItem("Public Product Roadmap", "public-product-roadmap", "Prototype-to-institutional-readiness roadmap."),
      navItem("Pilot Readiness", "pilot-readiness", "What BloomPal would need before a responsible pilot."),
      navItem("Partnership Direction", "partnership-direction", "High-level partner categories for future validation."),
    ],
  },
];

const p = (text: string): DocsBlock => ({ type: "paragraph", text });
const bullets = (items: string[]): DocsBlock => ({ type: "bullets", items });
const callout = (status: Maturity, title: string, body: string[]): DocsBlock => ({ type: "callout", status, title, body });
const cards = (items: { title: string; status?: Maturity; body: string }[]): DocsBlock => ({ type: "cards", items });
const comparison = (columns: { title: string; status: Maturity; items: string[] }[]): DocsBlock => ({ type: "comparison", columns });
const table = (headers: string[], rows: string[][]): DocsBlock => ({ type: "table", headers, rows });
const code = (value: string): DocsBlock => ({ type: "code", language: "txt", value });
const steps = (items: string[]): DocsBlock => ({ type: "steps", items });

export const docsPages: Record<string, DocsPage> = {
  introduction: {
    slug: "introduction",
    title: "BloomPal Documentation",
    eyebrow: "Prototype today. Designed for what comes next.",
    description:
      "Structured public product documentation for BloomPal's current prototype and the architecture being explored for a mature rehabilitation product.",
    status: "CURRENT",
    sections: [
      {
        id: "current-stage",
        title: "Current stage",
        blocks: [
          callout("CURRENT", "Tech4City semifinal prototype", [
            "BloomPal is currently a working prototype. These public docs cover implemented capabilities and selected roadmap concepts that are safe to share.",
            "Future clinical, regulatory, security, and institutional sections describe design direction. They are not claims of certification, approval, validation, or production deployment.",
          ]),
          cards([
            {
              title: "Current Prototype",
              status: "CURRENT",
              body: "Login, signup, gardening game routes, webcam-based hand interaction, session persistence, and an admin review dashboard exist in the codebase.",
            },
            {
              title: "Product & Clinical Model",
              status: "PROPOSED",
              body: "BloomPal is being framed as rehabilitation-first: playful interactions should support authorised therapy goals and human oversight.",
            },
            {
              title: "Institutional Readiness",
              status: "FUTURE",
              body: "Healthcare deployment would require stronger role separation, auditability, privacy controls, clinical validation, quality processes, and regulatory assessment.",
            },
          ]),
        ],
      },
      {
        id: "documentation-boundary",
        title: "Documentation boundary",
        blocks: [
          comparison([
            {
              title: "Public product docs",
              status: "CURRENT",
              items: ["Product vision", "Prototype status", "High-level architecture", "Public roadmap", "Safe security/privacy principles"],
            },
            {
              title: "Private governance docs",
              status: "PROPOSED",
              items: ["Detailed authority model", "Internal risk categories", "Technical operations", "Database and security architecture notes"],
            },
            {
              title: "Private pitch strategy",
              status: "OPEN QUESTION",
              items: ["Judge preparation", "Competition tactics", "Confidential commercial assumptions", "Evidence-bank working notes"],
            },
          ]),
        ],
      },
    ],
  },

  "current-prototype-status": {
    slug: "current-prototype-status",
    title: "Current Prototype Status",
    eyebrow: "What exists today",
    description: "A concise view of the working prototype, grounded in the current codebase.",
    status: "CURRENT",
    sections: [
      {
        id: "implemented",
        title: "Implemented or directly observable",
        blocks: [
          bullets([
            "Next.js App Router project using locale-prefixed routes.",
            "Public entry, login, signup, password-change, user dashboard, game routes, docs, app concept, and admin dashboard surfaces.",
            "Gardening-themed gameplay routes for watering, plucking fruit, catching fish, collecting bugs, and snapshots.",
            "MediaPipe/vision assets and hand-tracking related code are present in the project.",
            "Database access is implemented through PostgreSQL using DATABASE_URL with NEONDBAPIKEY as a legacy fallback.",
            "The user dashboard includes a front-house/courtyard shop and music layer backed by wallet, music ownership, asset sale, and coin transaction records.",
            "Admin dashboard routes exist for overview, users, players, sessions, motion, analytics, reports, and CSV report route handlers.",
          ]),
        ],
      },
      {
        id: "prototype-boundary",
        title: "Prototype boundary",
        blocks: [
          callout("OPEN QUESTION", "No overclaiming", [
            "BloomPal does not currently claim HSA approval, medical-device registration, ISO certification, clinical efficacy, hospital deployment, production-grade RBAC, or validated clinical-grade AI accuracy.",
            "Those topics remain future validation and governance work.",
          ]),
        ],
      },
    ],
  },

  "maturity-labels": {
    slug: "maturity-labels",
    title: "Roadmap & Maturity Labels",
    eyebrow: "Shared interpretation",
    description: "The maturity labels used throughout the documentation to separate facts from roadmap thinking.",
    status: "CURRENT",
    sections: [
      {
        id: "labels",
        title: "Labels",
        blocks: [
          table(["Label", "Meaning"], [
            ["CURRENT", "Implemented or directly observable in the prototype/codebase."],
            ["PROPOSED", "A target architecture, design direction, or team proposal that is not necessarily implemented."],
            ["FUTURE", "A capability that becomes relevant if BloomPal progresses toward real institutional or clinical deployment."],
            ["OPEN QUESTION", "A question requiring technical, clinical, regulatory, business, mentor, or stakeholder validation."],
          ]),
          callout("PROPOSED", "Roadmap, not apology", [
            "Future-facing sections show that BloomPal understands the path from MVP to mature product.",
            "They should not be read as missing implementation that the prototype has failed to complete.",
          ]),
        ],
      },
    ],
  },

  terminology: {
    slug: "terminology",
    title: "Terminology",
    eyebrow: "Shared language",
    description: "Product, clinical, and technical terms used across the BloomPal documentation.",
    status: "CURRENT",
    sections: [
      {
        id: "terms",
        title: "Working terms",
        blocks: [
          table(["Term", "Working meaning"], [
            ["Activity", "A playable gardening task such as watering, fruit plucking, bug catching, fish catching, or snapshot tasks."],
            ["Game activity metric", "A current aggregate session/activity value, such as game action counts, attempts, successful actions, duration, or left/right game actions where recorded."],
            ["Programme", "A future clinician-authorised set of activities and targets for a patient."],
            ["Progress", "A future longitudinal interpretation of activity and validated measurement data, not just a single score."],
            ["Admin dashboard", "The current review surface for admin accounts in the prototype."],
          ]),
        ],
      },
    ],
  },

  "product-vision": {
    slug: "product-vision",
    title: "Product Vision",
    eyebrow: "Rehabilitation first, game second",
    description: "BloomPal's long-term thesis: engaging games should support rehabilitation goals, not replace clinical purpose.",
    status: "PROPOSED",
    sections: [
      {
        id: "thesis",
        title: "Product thesis",
        blocks: [
          p("BloomPal should grow from a gamified hand-tracking prototype into a clinician-governed digital rehabilitation platform that makes guided hand rehabilitation more engaging, measurable, and reviewable."),
          cards([
            {
              title: "Engagement",
              status: "PROPOSED",
              body: "BloomPal's design intent is for gardening activities to make repetitive hand practice feel warmer and less clinical.",
            },
            {
              title: "Clinical direction",
              status: "PROPOSED",
              body: "Activities should eventually sit inside clinician-authorised plans rather than being treated as generic games.",
            },
            {
              title: "Evidence path",
              status: "FUTURE",
              body: "Progress claims should be supported by user studies, clinician feedback, and clear measurement definitions.",
            },
          ]),
        ],
      },
    ],
  },

  "patient-experience": {
    slug: "patient-experience",
    title: "Patient Experience",
    eyebrow: "Product & users",
    description: "How BloomPal should feel for elderly users and rehabilitation patients.",
    status: "PROPOSED",
    sections: [
      {
        id: "experience-principles",
        title: "Experience principles",
        blocks: [
          bullets([
            "Warm, calm, garden-inspired interface rather than a cold medical dashboard.",
            "Large, readable UI and clear interaction cues for elderly users.",
            "Positive feedback through garden growth and completion moments.",
            "No guilt-based streaks, punitive loss mechanics, or pressure to over-exercise.",
            "Future access to own programme and results, scoped to what is appropriate and understandable.",
          ]),
        ],
      },
    ],
  },

  "therapist-experience": {
    slug: "therapist-experience",
    title: "Therapist / Clinician Experience",
    eyebrow: "Product & users",
    description: "How BloomPal may support therapists and clinicians without replacing judgement.",
    status: "PROPOSED",
    sections: [
      {
        id: "clinician-workflow",
        title: "Clinician workflow direction",
        blocks: [
          comparison([
            {
              title: "Current",
              status: "CURRENT",
              items: ["Admin dashboard shows assigned users, sessions, game activity metrics, analytics, and reports.", "Current roles are user and admin."],
            },
            {
              title: "Proposed",
              status: "PROPOSED",
              items: ["Clinicians review assigned patients.", "Clinicians configure authorised rehabilitation plans.", "Metrics are interpreted as decision support."],
            },
            {
              title: "Future",
              status: "FUTURE",
              items: ["Clinical governance defines who can prescribe, adjust, and review plans.", "Audit logs capture meaningful changes."],
            },
          ]),
        ],
      },
    ],
  },

  "organisation-administration": {
    slug: "organisation-administration",
    title: "Organisation Administration",
    eyebrow: "Future role concept",
    description: "High-level future organisation administration without claiming implemented institutional RBAC.",
    status: "FUTURE",
    sections: [
      {
        id: "admin-boundary",
        title: "Organisation boundary",
        blocks: [
          callout("FUTURE", "Administration is not clinical authority", [
            "An organisation admin may eventually manage staff access and institution settings.",
            "That should not automatically grant unrestricted clinical access to all patient data.",
          ]),
          bullets(["Manage authorised staff or therapists.", "Manage organisation-level configuration.", "Respect least-privilege and assigned-care boundaries."]),
        ],
      },
    ],
  },

  "bloompal-administration": {
    slug: "bloompal-administration",
    title: "BloomPal Administration",
    eyebrow: "Future platform boundary",
    description: "High-level future BloomPal platform administration boundary.",
    status: "FUTURE",
    sections: [
      {
        id: "platform-boundary",
        title: "Platform operations boundary",
        blocks: [
          callout("FUTURE", "Platform operations are not clinical authority", [
            "BloomPal internal admins may eventually operate and support the platform.",
            "They should not automatically receive unrestricted clinical authority or unrestricted patient access.",
          ]),
          bullets(["Operate platform settings and support workflows.", "Separate support access from clinical decision-making.", "Use auditability and least privilege for sensitive operations."]),
        ],
      },
    ],
  },

  "rehab-first-game-second": {
    slug: "rehab-first-game-second",
    title: "Rehabilitation First / Game Second",
    eyebrow: "Clinical model",
    description: "BloomPal uses game mechanics as a rehabilitation engagement layer.",
    status: "PROPOSED",
    sections: [
      {
        id: "principle",
        title: "Core principle",
        blocks: [
          p("The game should make rehabilitation practice more approachable, but the game is not the clinical goal. Movements, difficulty, rewards, and progress should eventually map back to meaningful rehabilitation intent."),
          callout("PROPOSED", "Engagement without coercion", [
            "Rewards should reinforce appropriate participation.",
            "They should not push users into unsafe volume or guilt-based behaviour.",
          ]),
        ],
      },
    ],
  },

  "rehabilitation-content-model": {
    slug: "rehabilitation-content-model",
    title: "Rehabilitation Content Model",
    eyebrow: "Clinical model",
    description: "A conceptual structure for relating movements, exercises, and games.",
    status: "PROPOSED",
    sections: [
      {
        id: "content-stack",
        title: "Conceptual content stack",
        blocks: [
          table(["Layer", "Meaning"], [
            ["Movement", "A base hand action such as pinch, open/close, reach, or sustained hold."],
            ["Exercise", "A rehabilitation intent built from one or more movements."],
            ["Game task", "A gardening interaction that makes the exercise engaging."],
            ["Programme", "A future clinician-authorised set of activities, frequency, and difficulty boundaries."],
            ["Progress review", "Future interpretation of sessions and validated measurement data over time."],
          ]),
        ],
      },
    ],
  },

  "clinician-authority": {
    slug: "clinician-authority",
    title: "Clinician Authority",
    eyebrow: "Clinical model",
    description: "How clinician governance may shape future BloomPal rehabilitation plans.",
    status: "PROPOSED",
    sections: [
      {
        id: "authority",
        title: "Authority principles",
        blocks: [
          bullets([
            "Clinicians should define or approve rehabilitation plans when BloomPal is used in clinical contexts.",
            "The system should distinguish assigned-care access from general administration.",
            "Automated suggestions should be explainable and reviewable.",
            "Future plan changes should be auditable.",
          ]),
        ],
      },
    ],
  },

  "patient-agency": {
    slug: "patient-agency",
    title: "Patient Agency",
    eyebrow: "Clinical model",
    description: "How BloomPal can keep patient choice while respecting authorised plans.",
    status: "PROPOSED",
    sections: [
      {
        id: "agency",
        title: "Agency inside safe boundaries",
        blocks: [
          p("BloomPal can offer choice between equivalent activities, themes, or session moments while still respecting clinician-authorised movement goals and difficulty limits."),
          bullets(["Give users understandable progress feedback.", "Let users feel ownership of their garden.", "Avoid implying that skipping a session is moral failure.", "Make assistance and stopping states easy to understand."]),
        ],
      },
    ],
  },

  "personalisation-difficulty": {
    slug: "personalisation-difficulty",
    title: "Personalisation & Difficulty",
    eyebrow: "Clinical model",
    description: "How difficulty should be adapted responsibly.",
    status: "PROPOSED",
    sections: [
      {
        id: "difficulty",
        title: "Difficulty as rehabilitation context",
        blocks: [
          comparison([
            {
              title: "Current",
              status: "CURRENT",
              items: ["Games have activity-specific rules and completion behaviour.", "Difficulty is not yet a complete clinical configuration model."],
            },
            {
              title: "Proposed",
              status: "PROPOSED",
              items: ["Difficulty should relate to range, repetitions, timing, accuracy, rest, and hand usage.", "Changes should stay inside safe, authorised boundaries."],
            },
            {
              title: "Open questions",
              status: "OPEN QUESTION",
              items: ["Which parameters are clinically meaningful?", "Who may adjust them?", "When should difficulty stop increasing?"],
            },
          ]),
        ],
      },
    ],
  },

  "progress-measurement": {
    slug: "progress-measurement",
    title: "Progress Measurement",
    eyebrow: "Clinical model",
    description: "How BloomPal should treat scores, sessions, and future measurement data.",
    status: "PROPOSED",
    sections: [
      {
        id: "measurement",
        title: "Measurement principles",
        blocks: [
          bullets([
            "A game score is not automatically clinical progress.",
            "Progress should be interpreted against baseline, goals, condition context, and clinician review.",
            "Current game activity metrics should be explained as support signals unless validated otherwise.",
            "Longitudinal trends are more useful than one isolated session.",
          ]),
        ],
      },
    ],
  },

  "human-oversight": {
    slug: "human-oversight",
    title: "Human Oversight",
    eyebrow: "Clinical model",
    description: "BloomPal should support people, not automate clinical authority prematurely.",
    status: "PROPOSED",
    sections: [
      {
        id: "oversight",
        title: "Oversight principles",
        blocks: [
          callout("PROPOSED", "Decision support, not replacement", [
            "The product direction is to help therapists and patients see patterns more clearly.",
            "It should not independently diagnose, prescribe, or claim clinical effectiveness without validation.",
          ]),
        ],
      },
    ],
  },

  "current-system-overview": {
    slug: "current-system-overview",
    title: "Current System Overview",
    eyebrow: "Derived from codebase",
    description: "A CURRENT technical overview based on the present repository structure.",
    status: "CURRENT",
    sections: [
      {
        id: "framework",
        title: "Framework and structure",
        blocks: [
          bullets([
            "Next.js 16 App Router project using TypeScript and React 19.",
            "Locale-prefixed app routes are under app/[locale].",
            "Shared unlocalized implementations also exist under app for actions, game clients, dashboard components, and API route handlers.",
            "Database access is contained in the database folder and uses the pg PostgreSQL client.",
          ]),
        ],
      },
      {
        id: "important-routes",
        title: "Important current routes",
        blocks: [
          code("/\n/login\n/signup\n/change-password\n/dashboard\n/games/watering\n/games/pluckfruit\n/games/catchfish\n/games/collectbugs\n/games/snapshot\n/games/takesnapshot\n/admin/dashboard\n/docs\n/app\n/api/health"),
        ],
      },
    ],
  },

  "application-surfaces": {
    slug: "application-surfaces",
    title: "Application Surfaces",
    eyebrow: "Site topology",
    description: "Logical product surfaces for the current MVP and future custom-domain architecture.",
    status: "PROPOSED",
    sections: [
      {
        id: "target-topology",
        title: "Target / future topology",
        blocks: [
          table(["Target domain", "Purpose"], [
            ["www.bloompal.sg", "Public / marketing"],
            ["docs.bloompal.sg", "Public product documentation"],
            ["app.bloompal.sg", "Patient / clinician / organisation portal"],
            ["admin.bloompal.sg", "BloomPal internal privileged administration"],
          ]),
        ],
      },
      {
        id: "current-mvp",
        title: "Current MVP mapping",
        blocks: [
          callout("CURRENT", "One project is enough for now", [
            "The current MVP does not require four independent deployments.",
            "The existing Next.js project can expose logical routes while the team validates requirements.",
            "Future domains and subdomains are architectural targets, not current production facts.",
          ]),
          code("/                 -> current BloomPal entry\n/docs            -> public documentation foundation\n/app             -> future portal concept\n/admin/dashboard -> current admin dashboard"),
        ],
      },
    ],
  },

  "data-flow": {
    slug: "data-flow",
    title: "Data Flow",
    eyebrow: "High-level architecture",
    description: "A public-safe flow from game interaction to review surfaces.",
    status: "CURRENT",
    sections: [
      {
        id: "current-flow",
        title: "Current high-level flow",
        blocks: [
          steps([
            "User signs in.",
            "User plays a gardening activity.",
            "Webcam hand tracking supports the interaction.",
            "A game session or activity result is persisted by the current database layer.",
            "Admin dashboard pages read assigned-user activity, session, game activity metric, analytics, and report data for review.",
          ]),
          code("User -> Login -> Gardening Game -> Webcam Hand Tracking -> Session/Result Stored -> Admin Dashboard -> Analytics & Reports"),
        ],
      },
      {
        id: "future-flow",
        title: "Future governed flow",
        blocks: [
          callout("FUTURE", "Clinical interpretation layer", [
            "Future institutional use would require clearer programme authority, metric definitions, auditability, and clinician review workflows.",
          ]),
        ],
      },
    ],
  },

  "current-vs-future-architecture": {
    slug: "current-vs-future-architecture",
    title: "Current vs Future Architecture",
    eyebrow: "Roadmap comparison",
    description: "How the prototype maps toward a more mature rehabilitation product.",
    status: "PROPOSED",
    sections: [
      {
        id: "roadmap",
        title: "Architecture maturity roadmap",
        blocks: [
          comparison([
            {
              title: "Current prototype",
              status: "CURRENT",
              items: ["User + Admin account model", "Neon/PostgreSQL development database", "Working game, hand tracking, and dashboard surfaces"],
            },
            {
              title: "Proposed next stage",
              status: "PROPOSED",
              items: ["Clear patient/clinician authority", "Structured measurement model", "Clinical/user validation", "Better cloud architecture mapping"],
            },
            {
              title: "Future institutional architecture",
              status: "FUTURE",
              items: ["Role-separated access", "Auditability", "Security/privacy controls", "Quality processes", "Regulatory assessment"],
            },
          ]),
        ],
      },
    ],
  },

  "future-cloud-architecture": {
    slug: "future-cloud-architecture",
    title: "Future Cloud Architecture",
    eyebrow: "Target architecture",
    description: "Managed-cloud ideas, including Huawei services, framed as future architecture rather than current implementation.",
    status: "PROPOSED",
    sections: [
      {
        id: "current-vs-target",
        title: "Current development vs target direction",
        blocks: [
          comparison([
            {
              title: "Current",
              status: "CURRENT",
              items: ["Next.js application", "PostgreSQL connection through DATABASE_URL or NEONDBAPIKEY", "Local environment variables", "Prototype database scripts"],
            },
            {
              title: "Proposed cloud direction",
              status: "PROPOSED",
              items: ["Static delivery and asset storage where useful", "API/service boundaries", "Managed identity and access patterns", "Managed relational database options"],
            },
            {
              title: "Future AI/data direction",
              status: "FUTURE",
              items: ["Model lifecycle and evaluation", "Movement-quality models only if validated", "Governed analytics and operational monitoring"],
            },
          ]),
          callout("OPEN QUESTION", "Service choices require requirements mapping", [
            "Huawei services are being evaluated as possible target infrastructure. Final choices should follow product, data, privacy, cost, and team-operability requirements.",
          ]),
        ],
      },
    ],
  },

  "project-structure": {
    slug: "project-structure",
    title: "Project Structure",
    eyebrow: "Developer guide",
    description: "Current repository structure derived from the codebase.",
    status: "CURRENT",
    sections: [
      {
        id: "structure",
        title: "Current important folders",
        blocks: [
          table(["Path", "Current purpose"], [
            ["app/[locale]", "Locale-prefixed App Router routes and page wrappers."],
            ["app/games", "Game client components, rules, and server actions."],
            ["app/admin/dashboard", "Shared admin dashboard components, actions, and styling."],
            ["app/[locale]/admin/dashboard", "Locale route pages for admin dashboard surfaces."],
            ["app/[locale]/docs", "Public documentation site foundation."],
            ["database", "PostgreSQL connection, migrations, auth sessions, users, and game persistence helpers."],
            ["mediapipe / public/mediapipe", "Hand-tracking related code and browser assets."],
            ["docs-internal", "Private repo-only product governance and competition documentation."],
          ]),
        ],
      },
    ],
  },

  "local-environment": {
    slug: "local-environment",
    title: "Local Environment",
    eyebrow: "Developer guide",
    description: "Local setup notes based on current scripts and environment handling.",
    status: "CURRENT",
    sections: [
      {
        id: "scripts",
        title: "Current scripts",
        blocks: [
          table(["Script", "Purpose"], [
            ["npm run dev", "Start the Next.js development server."],
            ["npm run lint", "Run ESLint."],
            ["npm test", "Run Vitest tests."],
            ["npm run db:migrate", "Run database migration script."],
            ["npm run db:seed", "Insert seed data."],
            ["npm run db:reset", "Reset/initialize database only when explicitly allowed by safety env."],
          ]),
        ],
      },
    ],
  },

  "environment-variables": {
    slug: "environment-variables",
    title: "Environment Variables",
    eyebrow: "Developer guide",
    description: "Environment variable names used by the codebase. Values must never be published.",
    status: "CURRENT",
    sections: [
      {
        id: "current-env",
        title: "Current expected names",
        blocks: [
          table(["Variable", "Used for", "Notes"], [
            ["DATABASE_URL", "Primary PostgreSQL connection string", "Preferred current name. Do not expose the value."],
            ["NEONDBAPIKEY", "Legacy database connection fallback", "Despite the name, code treats it as a database URL fallback. Do not expose the value."],
            ["DATABASE_SSL_MODE", "Optional database SSL behaviour", "Read by database connection helpers."],
            ["DATABASE_POOL_MAX", "Optional database pool size", "Defaults are handled in code."],
            ["DATABASE_CA_CERT", "Optional CA certificate content", "Value should remain private."],
            ["ADMIN_SIGNUP_CODE", "Admin signup gate", "Secret-like value; never publish."],
            ["BUILD_STANDALONE", "Optional Next.js standalone output toggle", "Used by next.config.ts."],
            ["ALLOW_DATABASE_RESET", "Safety guard for reset/delete scripts", "Only set intentionally for destructive local DB maintenance."],
          ]),
          callout("CURRENT", "No secrets in documentation", [
            "This page documents names only. Real values belong in local or deployment environment configuration, not in public docs.",
          ]),
        ],
      },
    ],
  },

  api: {
    slug: "api",
    title: "API",
    eyebrow: "Developer guide",
    description: "Currently observable route handlers and the future API documentation boundary.",
    status: "CURRENT",
    sections: [
      {
        id: "current-routes",
        title: "Current observable route handlers",
        blocks: [
          bullets([
            "app/api/health/route.ts provides a health endpoint.",
            "app/[locale]/admin/dashboard/reports/sessions.csv/route.ts provides a CSV report route.",
            "app/[locale]/admin/dashboard/reports/users.csv/route.ts provides a CSV report route.",
          ]),
          callout("PROPOSED", "Future API docs", [
            "If the backend expands, API documentation should describe request/response shapes, authentication expectations, authorization boundaries, and error behaviours.",
          ]),
        ],
      },
    ],
  },

  "database-schema-data-dictionary": {
    slug: "database-schema-data-dictionary",
    title: "Database Schema & Data Dictionary",
    eyebrow: "Developer guide",
    description: "Current tables from migrations plus future modelling boundaries.",
    status: "CURRENT",
    sections: [
      {
        id: "current-tables",
        title: "Current tables from migration",
        blocks: [
          table(["Table", "Current purpose"], [
            ["users", "Accounts, roles, admin assignment, status, locale, and password hash."],
            ["auth_sessions", "Session token hashes and expiry."],
            ["user_plants", "Watering/garden plant records."],
            ["user_dashboard_settings", "User dashboard display settings."],
            ["user_bugs", "Collected bug records."],
            ["user_snapshots", "Snapshot records, generated garden snapshot image data, and storage metadata."],
            ["user_fish", "Caught fish records."],
            ["user_fruits", "Plucked fruit records."],
            ["game_sessions", "Unified game session records for supported activity types."],
            ["user_wallets", "User coin balance and wallet state for the current shop/music layer."],
            ["user_music", "Music tracks owned by a user."],
            ["asset_sales", "Records sold collectible or reward assets from flowers, bugs, fish, or fruit."],
            ["coin_transactions", "Coin economy transaction history."],
          ]),
          callout("PROPOSED", "Future data dictionary", [
            "Future clinical entities such as PlayerProfile, EmployeeProfile, GameTaskResult, MotionRecord, and EmployeeNote should be reconciled with the actual schema before implementation.",
          ]),
        ],
      },
    ],
  },

  migrations: {
    slug: "migrations",
    title: "Migrations",
    eyebrow: "Developer guide",
    description: "Current database migration and reset scripts.",
    status: "CURRENT",
    sections: [
      {
        id: "current-scripts",
        title: "Current scripts",
        blocks: [
          bullets([
            "database/migrate.mjs creates and alters current PostgreSQL tables and indexes.",
            "database/insertData.mjs seeds data.",
            "database/initializeDB.mjs and database/deleteDB.mjs include a safety guard requiring ALLOW_DATABASE_RESET.",
          ]),
          callout("OPEN QUESTION", "Migration maturity", [
            "The current migration script is suitable for the prototype. A future production system may need versioned migrations, rollback policy, backup verification, and change approval.",
          ]),
        ],
      },
    ],
  },

  "backup-restore": {
    slug: "backup-restore",
    title: "Backup / Restore",
    eyebrow: "Developer guide",
    description: "Future backup and restore documentation boundary.",
    status: "OPEN QUESTION",
    sections: [
      {
        id: "future-boundary",
        title: "Future boundary",
        blocks: [
          callout("OPEN QUESTION", "Not currently documented as an implemented capability", [
            "Backup and restore procedures should be designed with the selected database provider, deployment model, retention requirements, and privacy obligations.",
          ]),
        ],
      },
    ],
  },

  testing: {
    slug: "testing",
    title: "Testing",
    eyebrow: "Developer guide",
    description: "Current test tooling and future test expectations.",
    status: "CURRENT",
    sections: [
      {
        id: "current",
        title: "Current test surface",
        blocks: [
          bullets(["Vitest is configured through npm test.", "Existing tests cover selected password input, signup option, and game-rule behaviour."]),
          callout("PROPOSED", "Future testing", [
            "Future work should expand coverage for auth flows, database edge cases, accessibility, game interactions, and admin dashboard reporting.",
          ]),
        ],
      },
    ],
  },

  deployment: {
    slug: "deployment",
    title: "Deployment",
    eyebrow: "Developer guide",
    description: "Current deployment documentation boundary and future hosting notes.",
    status: "OPEN QUESTION",
    sections: [
      {
        id: "current",
        title: "Current status",
        blocks: [
          p("The repository contains current Next.js configuration and Huawei cloud deployment documentation, but these public docs should not imply that a production institutional deployment is complete."),
          callout("OPEN QUESTION", "Future deployment work", [
            "A production deployment plan should define hosting, environment management, database operations, backup/restore, monitoring, support ownership, and incident response.",
          ]),
        ],
      },
    ],
  },

  "role-model": {
    slug: "role-model",
    title: "Role Model",
    eyebrow: "Identity & access",
    description: "Current MVP roles and the future conceptual authority model.",
    status: "PROPOSED",
    sections: [
      {
        id: "current",
        title: "Current MVP",
        blocks: [
          comparison([
            { title: "User", status: "CURRENT", items: ["Can sign in.", "Can play current activities.", "Can use the current personal dashboard experience."] },
            { title: "Admin account", status: "CURRENT", items: ["Can access admin dashboard routes.", "Can review assigned-user activity in the prototype.", "Can manage users through current admin surfaces."] },
          ]),
          p("This deliberately small role model is enough for the current prototype. The future model should be implemented only when requirements are clearer."),
        ],
      },
      {
        id: "future",
        title: "Future conceptual model",
        blocks: [
          cards([
            { title: "Patient", status: "FUTURE", body: "Access own programme and results." },
            { title: "Therapist / Clinician", status: "FUTURE", body: "Access assigned patients, configure authorised rehab plans, and review progress." },
            { title: "Organisation Admin", status: "FUTURE", body: "Manage authorised staff and institution settings without automatic unrestricted clinical access." },
            { title: "BloomPal Admin", status: "FUTURE", body: "Operate and support the platform without automatic unrestricted clinical authority." },
          ]),
          bullets([
            "Role does not equal website.",
            "Higher role does not automatically mean unrestricted access.",
            "Organisation administration and clinical authority differ.",
            "BloomPal platform administration and clinical authority differ.",
            "Least privilege is a future design principle.",
          ]),
        ],
      },
    ],
  },

  "current-mvp-authentication": {
    slug: "current-mvp-authentication",
    title: "Current MVP Authentication",
    eyebrow: "Identity & access",
    description: "Current authentication behaviour derived from code.",
    status: "CURRENT",
    sections: [
      {
        id: "current-auth",
        title: "Current auth facts",
        blocks: [
          bullets([
            "Login, signup, and change-password routes exist.",
            "Passwords are stored as hashes after migration.",
            "auth_sessions stores token hashes with expiry.",
            "Current roles are constrained to admin and user in the database migration.",
            "Admin signup uses ADMIN_SIGNUP_CODE, whose value must remain private.",
          ]),
        ],
      },
    ],
  },

  "future-permission-model": {
    slug: "future-permission-model",
    title: "Future Permission Model",
    eyebrow: "Identity & access",
    description: "Future least-privilege access principles.",
    status: "FUTURE",
    sections: [
      {
        id: "principles",
        title: "Permission principles",
        blocks: [
          bullets(["Authorise server-side, not only through UI visibility.", "Prefer assigned-patient access over broad organisation access.", "Separate support operations from clinical authority.", "Log sensitive changes in future institutional deployments."]),
        ],
      },
    ],
  },

  "privileged-administration": {
    slug: "privileged-administration",
    title: "Privileged Administration",
    eyebrow: "Identity & access",
    description: "Future privileged platform administration boundary.",
    status: "FUTURE",
    sections: [
      {
        id: "boundary",
        title: "Boundary",
        blocks: [
          callout("FUTURE", "Internal platform administration", [
            "A future admin.bloompal.sg surface could be justified for BloomPal internal privileged operations.",
            "That should remain separate from clinical authority and should be governed by least privilege.",
          ]),
        ],
      },
    ],
  },

  "audit-logging": {
    slug: "audit-logging",
    title: "Audit Logging",
    eyebrow: "Identity & access",
    description: "Public-safe auditability principles for future deployments.",
    status: "FUTURE",
    sections: [
      {
        id: "future",
        title: "Future auditability",
        blocks: [
          bullets(["Track who changed a plan.", "Track when sensitive access occurs.", "Track support or administrative actions.", "Make audit retention and review processes part of governance design."]),
        ],
      },
    ],
  },

  "hand-tracking": {
    slug: "hand-tracking",
    title: "Hand Tracking",
    eyebrow: "AI & data",
    description: "Current webcam hand tracking and future measurement direction.",
    status: "CURRENT",
    sections: [
      {
        id: "current",
        title: "Current hand-tracking foundation",
        blocks: [
          p("The project includes MediaPipe/vision assets and hand-motion related code to support webcam-driven gardening interactions."),
          callout("PROPOSED", "Measurement caution", [
            "Hand tracking can support engagement and measurement, but motion metrics should not be treated as validated clinical indicators until the team defines and validates them.",
          ]),
        ],
      },
    ],
  },

  "measurement-pipeline": {
    slug: "measurement-pipeline",
    title: "Measurement Pipeline",
    eyebrow: "AI & data",
    description: "How interaction events can become progress metrics.",
    status: "PROPOSED",
    sections: [
      {
        id: "pipeline",
        title: "Conceptual pipeline",
        blocks: [
          code("Webcam frames -> Hand landmarks -> Game interaction events -> Session record -> Game activity metrics -> Dashboard review -> Future clinician interpretation"),
          callout("OPEN QUESTION", "Metric validity", [
            "The team still needs to define which metrics are reliable, useful, and safe to show for each activity and patient context.",
          ]),
        ],
      },
    ],
  },

  "ai-maturity-model": {
    slug: "ai-maturity-model",
    title: "AI Maturity Model",
    eyebrow: "AI & data",
    description: "Responsible AI progression for BloomPal.",
    status: "PROPOSED",
    sections: [
      {
        id: "stages",
        title: "AI/data maturity stages",
        blocks: [
          comparison([
            { title: "Current", status: "CURRENT", items: ["Webcam hand tracking supports interactions.", "Dashboard displays prototype metrics and history."] },
            { title: "Proposed", status: "PROPOSED", items: ["Define measurement pipeline.", "Validate metrics with user and clinician input.", "Clarify when AI is only assistive."] },
            { title: "Future", status: "FUTURE", items: ["Model evaluation lifecycle.", "Model version governance.", "Bias, drift, and safety review where relevant."] },
          ]),
        ],
      },
    ],
  },

  "model-governance": {
    slug: "model-governance",
    title: "Model Governance",
    eyebrow: "AI & data",
    description: "Future model lifecycle and review principles.",
    status: "FUTURE",
    sections: [
      {
        id: "principles",
        title: "Future principles",
        blocks: [
          bullets(["Document model purpose and limitations.", "Version models and measurement logic.", "Evaluate performance against appropriate user groups.", "Keep human oversight for clinical decisions.", "Avoid unsupported clinical claims."]),
        ],
      },
    ],
  },

  "data-minimisation": {
    slug: "data-minimisation",
    title: "Data Minimisation",
    eyebrow: "AI & data",
    description: "Collecting only useful and justified data.",
    status: "PROPOSED",
    sections: [
      {
        id: "principles",
        title: "Principles",
        blocks: [
          bullets(["Collect only data needed for product function, activity review, safety, or support.", "Avoid storing raw sensitive data where derived metrics are sufficient.", "Current records should distinguish generated garden snapshot image data from raw webcam video or raw MediaPipe landmark history.", "Separate public explanation from private operational detail.", "Define retention and deletion rules before real institutional use."]),
        ],
      },
    ],
  },

  analytics: {
    slug: "analytics",
    title: "Analytics",
    eyebrow: "AI & data",
    description: "Current dashboard analytics and future interpretation boundaries.",
    status: "CURRENT",
    sections: [
      {
        id: "current",
        title: "Current analytics surface",
        blocks: [
          p("The admin dashboard includes analytics surfaces for assigned-user activity review and reporting in the prototype."),
          callout("PROPOSED", "Interpretation boundary", [
            "Future analytics should clearly distinguish gameplay completion, engagement, movement-quality signals, and clinically meaningful progress.",
          ]),
        ],
      },
    ],
  },

  "security-compliance-principles": {
    slug: "security-compliance-principles",
    title: "Security / Compliance Principles",
    eyebrow: "Safe public principles",
    description: "Principles that can be shared publicly without exposing internal security detail.",
    status: "PROPOSED",
    sections: [
      {
        id: "public-safe-principles",
        title: "Public-safe principles",
        blocks: [
          bullets([
            "Collect only data that serves a defined product or rehabilitation purpose.",
            "Treat privacy and security as patient-safety concerns, not only engineering concerns.",
            "Separate public documentation from private operational, vulnerability, financial, and credential material.",
            "Use role separation and auditability as future design principles.",
            "Avoid unsupported clinical, regulatory, or certification claims.",
          ]),
          callout("OPEN QUESTION", "Requires expert validation", [
            "Regulatory positioning, quality management, data retention, incident response, and clinical claims require expert review before real deployment.",
          ]),
        ],
      },
    ],
  },

  "privacy-data-governance": {
    slug: "privacy-data-governance",
    title: "Privacy & Data Governance",
    eyebrow: "Security, privacy & compliance",
    description: "Public-safe privacy and governance principles.",
    status: "PROPOSED",
    sections: [
      {
        id: "principles",
        title: "Principles",
        blocks: [
          bullets(["Define purpose before collecting data.", "Use the smallest practical data set for the job.", "Separate patient, clinician, organisation, and platform authority.", "Document retention, access, export, and deletion requirements before production deployment."]),
        ],
      },
    ],
  },

  "role-separation": {
    slug: "role-separation",
    title: "Role Separation",
    eyebrow: "Security, privacy & compliance",
    description: "Why access boundaries matter in future healthcare settings.",
    status: "PROPOSED",
    sections: [
      {
        id: "separation",
        title: "Separation principles",
        blocks: [
          p("Future BloomPal roles should separate patient agency, clinical authority, organisation administration, and platform operations. This is a safety and privacy principle, not merely a UI preference."),
        ],
      },
    ],
  },

  "regulatory-positioning": {
    slug: "regulatory-positioning",
    title: "Regulatory Positioning",
    eyebrow: "Security, privacy & compliance",
    description: "Future regulatory questions and non-claims.",
    status: "OPEN QUESTION",
    sections: [
      {
        id: "non-claims",
        title: "Current non-claims",
        blocks: [
          callout("OPEN QUESTION", "Regulatory status is not established", [
            "BloomPal does not currently claim medical-device registration, HSA approval, ISO certification, clinical validation, or hospital deployment.",
            "Intended use, claims, clinical evidence, risk classification, and quality processes require future expert review.",
          ]),
        ],
      },
    ],
  },

  "quality-change-control": {
    slug: "quality-change-control",
    title: "Quality / Change Control",
    eyebrow: "Security, privacy & compliance",
    description: "Future quality-process boundary.",
    status: "FUTURE",
    sections: [
      {
        id: "future",
        title: "Future quality needs",
        blocks: [
          bullets(["Version clinically meaningful content and measurement logic.", "Review changes that affect patient experience or progress interpretation.", "Define release, rollback, and validation processes before institutional use."]),
        ],
      },
    ],
  },

  "incident-management": {
    slug: "incident-management",
    title: "Incident Management",
    eyebrow: "Security, privacy & compliance",
    description: "Future incident-response boundary.",
    status: "FUTURE",
    sections: [
      {
        id: "future",
        title: "Future incident boundary",
        blocks: [
          callout("FUTURE", "Not currently a production incident programme", [
            "A future institutional product would require incident detection, escalation, response ownership, communication, and post-incident learning processes.",
          ]),
        ],
      },
    ],
  },

  "public-product-roadmap": {
    slug: "public-product-roadmap",
    title: "Public Product Roadmap",
    eyebrow: "Roadmap & pilots",
    description: "A product maturity roadmap for responsible growth beyond the prototype.",
    status: "PROPOSED",
    sections: [
      {
        id: "roadmap",
        title: "Maturity roadmap",
        blocks: [
          steps([
            "CURRENT: Tech4City prototype.",
            "NEXT: user validation, clinician input, and stronger product definition.",
            "PILOT READINESS: technical validation, governance/security foundations, and deployment/support design.",
            "INSTITUTIONAL DEPLOYMENT: clinical governance, regulatory assessment, auditability, and quality processes.",
            "COMMERCIAL SCALE: repeatable institutional deployment, integration, and broader market expansion.",
          ]),
        ],
      },
    ],
  },

  "pilot-readiness": {
    slug: "pilot-readiness",
    title: "Pilot Readiness",
    eyebrow: "Roadmap & pilots",
    description: "What BloomPal would need before a responsible pilot.",
    status: "PROPOSED",
    sections: [
      {
        id: "pilot",
        title: "Pilot readiness checklist",
        blocks: [
          bullets(["Define the first realistic use case and user segment.", "Validate patient usability and clinician usefulness.", "Define safety, support, and data-handling boundaries.", "Clarify what outcomes the pilot can and cannot claim.", "Document deployment and support responsibilities."]),
        ],
      },
    ],
  },

  "partnership-direction": {
    slug: "partnership-direction",
    title: "Partnership Direction",
    eyebrow: "Roadmap & pilots",
    description: "High-level partner categories for future validation.",
    status: "PROPOSED",
    sections: [
      {
        id: "partners",
        title: "Potential partner categories",
        blocks: [
          p("BloomPal may be relevant to physiotherapy clinics, rehabilitation centres, community care settings, eldercare organisations, and healthcare innovation partners. Specific commercial terms and pitch strategy belong in private documentation."),
        ],
      },
    ],
  },
};

export function getDocsPage(slug: string) {
  return docsPages[slug];
}

export function getDocsNavItem(slug: string) {
  return docsNavigation.flatMap((group) => group.items).find((item) => item.slug === slug);
}

export function getDocsIndex() {
  return docsNavigation.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      group: group.title,
      href: item.slug === "introduction" ? "/docs" : `/docs/${item.slug}`,
    })),
  );
}

export function getPlaceholderPage(item: DocsNavItem): DocsPage {
  return {
    slug: item.slug,
    title: item.title,
    eyebrow: "Documentation section",
    description: item.description,
    status: "OPEN QUESTION",
    sections: [
      {
        id: "open-question",
        title: "Content boundary",
        blocks: [
          callout("OPEN QUESTION", "Needs further source review", [
            "This section exists in the documentation architecture, but should be expanded only when its source, audience, and maturity are clear.",
          ]),
        ],
      },
    ],
  };
}
