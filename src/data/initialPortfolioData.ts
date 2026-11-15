import type {
  ExperienceEntry,
  PrivateSettings,
  Project,
  PublicProfile,
  ResearchEntry,
  Skill,
} from '../types/portfolio';

export const HERO_FALLBACK_IMAGE = '/src/assets/images/hero_fluid_architecture_1794724820786.jpg';

export const DEFAULT_PUBLIC_PROFILE: PublicProfile = {
  ownerName: 'Clarence L. Chilongo',
  headline: 'Computer Engineering Student | Software Developer',
  tagline: 'Think Beyond Code. Engineer Possibility.',
  location: 'Malawi · Open to Global Collaboration',
  shortBio:
    'I am a Computer Engineering student and software developer focused on building resilient web platforms, low-bandwidth mobile workflows, and practical embedded systems. My work bridges low-level hardware constraints with clean, accessible user experiences designed to perform reliably even on modest devices and intermittent connectivity.',
  expandedBio:
    'Studying Computer Engineering in Malawi has shaped how I evaluate software quality: an application is only as strong as its behavior under real-world limits—constrained memory, slow cellular links, and varied screen sizes. Through KLARENCY, I document active engineering projects, foundational prototypes, and ongoing technical investigations honestly as they evolve from early concept to tested implementation.',
  availabilityNote: 'Open to software engineering internships, technical attachments, and collaborative builds.',
  portraitUrl: '',
  githubUrl: '',
  linkedinUrl: '',
  xUrl: '',
  publicEmail: '',
  cvUrl: '',
  cvFileName: '',
  cvEnabled: false,
};

export const DEFAULT_PRIVATE_SETTINGS: PrivateSettings = {
  onboardingCompleted: false,
  contactRateLimitMinutes: 1,
  securityContactNote: 'Protected under Firebase Authentication & Cloud Firestore security rules.',
  siteAnnouncement: '',
  maintenanceMode: false,
};

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'klarency-platform',
    title: 'KLARENCY Portfolio & CMS Platform',
    slug: 'klarency-platform',
    summary:
      'A mobile-manageable personal engineering portfolio paired with an authenticated cloud CMS, offline draft recovery, and strict Firestore access boundaries.',
    problem:
      'Updating static developer portfolios often requires editing source code on a laptop, creating friction when publishing project progress or uploading screenshots from a phone.',
    intendedUsers:
      'Recruiters, engineering collaborators, and a solo developer managing portfolio updates across desktop and Android devices.',
    solution:
      'Built a decoupled React and Firebase platform with a public showcase and a private, role-verified dashboard featuring guided project creation, IndexedDB draft protection, and client-side image optimization.',
    features: [
      'Nine-step mobile-friendly guided project creation workflow',
      'Client-side EXIF stripping and image resizing prior to cloud storage upload',
      'IndexedDB local draft protection with honest cloud sync indicators',
      'Split public/private Firestore schema enforcing draft confidentiality',
    ],
    technologies: ['TypeScript', 'React', 'Tailwind CSS', 'Firebase', 'Zod'],
    challenges:
      'Ensuring drafts remain completely unreadable by public queries while keeping initial page load lightweight on budget mobile hardware.',
    lessonsLearned:
      'Separating public and private Firestore documents alongside strict rule-side list predicates removes reliance on client filtering.',
    devStatus: 'In progress',
    publishState: 'published',
    featured: true,
    sortOrder: 1,
    imageUrl: '/src/assets/images/project_systems_interface_1794724822058.jpg',
    githubUrl: '',
    liveUrl: '',
    ownerId: 'seed',
  },
  {
    id: 'solar-bench-telemetry',
    title: 'Campus Solar Bench Telemetry Prototype',
    slug: 'solar-bench-telemetry',
    summary:
      'An embedded microcontroller prototype measuring DC bus voltage and charging load on off-grid study stations with buffered serial logging.',
    problem:
      'Off-grid charging points frequently experience unmonitored deep-discharge cycles that shorten battery lifespan without clear diagnostic logs.',
    intendedUsers:
      'Campus electrical maintenance teams and student engineering clubs evaluating small-scale solar storage.',
    solution:
      'Designed an ADC voltage-divider sensing stage paired with a compact microcontroller firmware loop that records timestamped readings locally before batch transmission.',
    features: [
      'Hardware-calibrated voltage and current sampling pipeline',
      'Local ring-buffer storage during network dropouts',
      'Low-power sleep scheduling between measurement intervals',
    ],
    technologies: ['C++', 'Embedded C', 'Microcontrollers', 'Python'],
    challenges:
      'Filtering switching noise on breadboard prototypes and protecting analog input pins against transient voltage spikes.',
    lessonsLearned:
      'Hardware filtering and conservative sampling tolerances matter far more in the field than complex visualization layers.',
    devStatus: 'Prototype',
    publishState: 'published',
    featured: true,
    sortOrder: 2,
    imageUrl: '/src/assets/images/project_embedded_bench_1794724822093.jpg',
    githubUrl: '',
    liveUrl: '',
    ownerId: 'seed',
  },
  {
    id: 'low-bandwidth-study-sync',
    title: 'Offline-First Academic Notes Organizer',
    slug: 'low-bandwidth-study-sync',
    summary:
      'A lightweight web study tool engineered for affordable Android browsers, prioritizing instant local persistence in IndexedDB over constant network round-trips.',
    problem:
      'Students working across intermittent campus Wi-Fi or metered mobile data often lose unsaved notes or wait through heavy bundle downloads.',
    intendedUsers:
      'University engineering and computer science students studying across mobile and shared lab machines.',
    solution:
      'Structured a zero-bloat web interface storing structured course notes locally first with deterministic conflict-safe sync metadata.',
    features: [
      'Sub-second cold start and minimal JavaScript payload',
      'Local IndexedDB persistence with automatic recovery after tab refresh',
      'Keyboard-accessible search across modules and topics',
    ],
    technologies: ['TypeScript', 'React', 'IndexedDB', 'Tailwind CSS'],
    challenges:
      'Designing intuitive sync-state feedback so users never confuse locally cached entries with cloud-backed backups.',
    lessonsLearned:
      'Explicit status labels and deterministic state transitions build user trust far better than silent background retries.',
    devStatus: 'Prototype',
    publishState: 'published',
    featured: false,
    sortOrder: 3,
    imageUrl: '/src/assets/images/project_mobile_sync_1794724822509.jpg',
    githubUrl: '',
    liveUrl: '',
    ownerId: 'seed',
  },
];

export const INITIAL_SKILLS: Skill[] = [
  {
    id: 'skill-ts',
    name: 'TypeScript & JavaScript',
    category: 'Programming Languages',
    proficiency: 'Intermediate',
    description: 'Strict typing, modular application logic, and asynchronous data flows.',
    publishState: 'published',
    sortOrder: 1,
  },
  {
    id: 'skill-cpp',
    name: 'C / C++',
    category: 'Programming Languages',
    proficiency: 'Developing',
    description: 'Memory-aware systems programming, data structures, and microcontroller firmware.',
    publishState: 'published',
    sortOrder: 2,
  },
  {
    id: 'skill-python',
    name: 'Python',
    category: 'Programming Languages',
    proficiency: 'Intermediate',
    description: 'Automation scripting, data processing, and engineering utilities.',
    publishState: 'published',
    sortOrder: 3,
  },
  {
    id: 'skill-react',
    name: 'React & Accessible UI',
    category: 'Frontend Development',
    proficiency: 'Intermediate',
    description: 'Component architecture, keyboard navigation, and responsive Tailwind CSS layouts.',
    publishState: 'published',
    sortOrder: 4,
  },
  {
    id: 'skill-firebase',
    name: 'Firebase & Cloud Firestore',
    category: 'Backend Development',
    proficiency: 'Developing',
    description: 'Authentication boundaries, schema modeling, and zero-trust security rules.',
    publishState: 'published',
    sortOrder: 5,
  },
  {
    id: 'skill-node',
    name: 'Node.js & REST APIs',
    category: 'Backend Development',
    proficiency: 'Developing',
    description: 'Express services, input validation with Zod, and structured error handling.',
    publishState: 'published',
    sortOrder: 6,
  },
  {
    id: 'skill-mobile-web',
    name: 'Mobile-First Responsive Web',
    category: 'Mobile Development',
    proficiency: 'Intermediate',
    description: 'Touch-friendly interfaces tuned for budget Android viewports and slow links.',
    publishState: 'published',
    sortOrder: 7,
  },
  {
    id: 'skill-db',
    name: 'Firestore & IndexedDB',
    category: 'Databases',
    proficiency: 'Developing',
    description: 'Document modeling, query indexing, and browser-local draft recovery.',
    publishState: 'published',
    sortOrder: 8,
  },
  {
    id: 'skill-git',
    name: 'Git, Linux & Hardware Tooling',
    category: 'Tools & Technologies',
    proficiency: 'Intermediate',
    description: 'Version control workflows, shell scripting, and embedded serial debugging.',
    publishState: 'published',
    sortOrder: 9,
  },
];

export const INITIAL_RESEARCH: ResearchEntry[] = [
  {
    id: 'research-offline-resilience',
    title: 'Resilient Offline-First Web Architectures for Metered Mobile Networks',
    stage: 'Ongoing Investigation',
    researchQuestion:
      'How can browser-native IndexedDB queues and optimistic UI state machines prevent data loss without misleading users about cloud synchronization?',
    objectives:
      'Evaluate lightweight client persistence patterns, deterministic retry backoff, and accessible sync status communication on entry-level Android devices.',
    summary:
      'Investigating practical patterns for keeping web tools dependable when cellular data drops mid-edit, balancing local draft safety with transparent cloud verification.',
    methods:
      'Prototype benchmarking using throttled network profiles, IndexedDB lifecycle tests, and strict state-transition unit verification.',
    findings: '',
    references: '',
    documentUrl: '',
    publishState: 'published',
  },
  {
    id: 'research-edge-telemetry',
    title: 'Low-Cost Microcontroller Telemetry in Off-Grid Energy Systems',
    stage: 'Research Interest',
    researchQuestion:
      'What sampling frequencies and local buffering strategies minimize power draw while retaining diagnostic utility for small solar installations?',
    objectives:
      'Explore energy-efficient ADC calibration, sleep-wake firmware cycles, and ruggedized telemetry serialization for academic campus hardware.',
    summary:
      'Exploring reliable hardware-software co-design for distributed voltage and environmental sensing in resource-constrained environments.',
    methods: 'Literature review and benchtop microcontroller power profiling.',
    findings: '',
    references: '',
    documentUrl: '',
    publishState: 'published',
  },
];

export const INITIAL_EXPERIENCES: ExperienceEntry[] = [
  {
    id: 'exp-ce-degree',
    title: 'Bachelor of Engineering in Computer Engineering (In Progress)',
    organization: 'Malawi — Undergraduate Engineering Studies',
    entryType: 'Education',
    dateRange: 'Ongoing',
    location: 'Malawi',
    description:
      'Core coursework spanning digital logic design, microprocessor architecture, computer networks, data structures, algorithms, and software engineering systems.',
    verificationUrl: '',
    publishState: 'published',
    sortOrder: 1,
  },
  {
    id: 'exp-klarency-build',
    title: 'Independent Full-Stack & Embedded Systems Projects',
    organization: 'KLARENCY Engineering Practice',
    entryType: 'Relevant Experience',
    dateRange: '2024 — Present',
    location: 'Malawi',
    description:
      'Designing, testing, and documenting software applications and hardware prototypes with an emphasis on security rules, offline recoverability, and accessible interfaces.',
    verificationUrl: '',
    publishState: 'published',
    sortOrder: 2,
  },
];
