import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSearchIndex,
  canSubmitContact,
  computeProfileCompletion,
  computeProjectCounts,
  filterPublicProjects,
  getSyncStatusCopy,
} from './portfolioLogic';
import { contactFormSchema, generateSlug, projectSchema, sanitizeExternalUrl } from './validation';
import type { ContactMessage, Project, PublicProfile, Skill } from '../types/portfolio';

const sampleProjects: Project[] = [
  {
    id: 'p1',
    title: 'Grid Telemetry Node',
    slug: 'grid-telemetry-node',
    summary: 'Microcontroller voltage and current logger for campus solar benches.',
    technologies: ['C++', 'TypeScript', 'Firebase'],
    devStatus: 'Prototype',
    publishState: 'published',
    featured: true,
    sortOrder: 2,
    ownerId: 'owner-1',
  },
  {
    id: 'p2',
    title: 'Draft Secret Project',
    slug: 'draft-secret-project',
    summary: 'Unpublished prototype should never leak publicly.',
    technologies: ['React', 'Tailwind CSS'],
    devStatus: 'Experimental',
    publishState: 'draft',
    featured: false,
    sortOrder: 1,
    ownerId: 'owner-1',
  },
  {
    id: 'p3',
    title: 'Offline Study Sync',
    slug: 'offline-study-sync',
    summary: 'IndexedDB-backed note organizer built for intermittent campus Wi-Fi.',
    technologies: ['React', 'TypeScript', 'IndexedDB'],
    devStatus: 'In progress',
    publishState: 'published',
    featured: false,
    sortOrder: 1,
    ownerId: 'owner-1',
  },
  {
    id: 'p4',
    title: 'Trashed Old Concept',
    slug: 'trashed-old-concept',
    summary: 'Moved to trash by owner.',
    technologies: ['Python'],
    devStatus: 'Archived',
    publishState: 'trashed',
    featured: false,
    sortOrder: 4,
    ownerId: 'owner-1',
  },
];

const sampleSkills: Skill[] = [
  {
    id: 's1',
    name: 'TypeScript',
    category: 'Programming Languages',
    proficiency: 'Intermediate',
    publishState: 'published',
    sortOrder: 1,
  },
  {
    id: 's2',
    name: 'Rust (Draft)',
    category: 'Programming Languages',
    proficiency: 'Beginner',
    publishState: 'draft',
    sortOrder: 2,
  },
];

const sampleMessages: ContactMessage[] = [
  {
    id: 'm1',
    senderName: 'Recruiter One',
    senderEmail: 'recruiter@example.com',
    subject: 'Internship Inquiry',
    message: 'Would love to discuss software engineering opportunities.',
    status: 'unread',
  },
];

test('filterPublicProjects excludes drafts and trashed items and sorts featured first', () => {
  const results = filterPublicProjects(sampleProjects, {});
  assert.equal(results.length, 2);
  assert.equal(results[0].id, 'p1');
  assert.equal(results[1].id, 'p3');
});

test('filterPublicProjects filters by devStatus and technology query', () => {
  const byTech = filterPublicProjects(sampleProjects, { technology: 'IndexedDB' });
  assert.equal(byTech.length, 1);
  assert.equal(byTech[0].id, 'p3');

  const byStatus = filterPublicProjects(sampleProjects, { devStatus: 'Prototype' });
  assert.equal(byStatus.length, 1);
  assert.equal(byStatus[0].id, 'p1');
});

test('computeProjectCounts aggregates statuses accurately and excludes trashed from active total', () => {
  const counts = computeProjectCounts(sampleProjects);
  assert.equal(counts.total, 3);
  assert.equal(counts.published, 2);
  assert.equal(counts.draft, 1);
  assert.equal(counts.trashed, 1);
  assert.equal(counts.byDevStatus.Prototype, 1);
  assert.equal(counts.byDevStatus['In progress'], 1);
});

test('buildSearchIndex never leaks drafts or contact messages to non-admin users', () => {
  const publicResults = buildSearchIndex({
    isAdmin: false,
    query: '',
    projects: sampleProjects,
    skills: sampleSkills,
    research: [],
    experiences: [],
    messages: sampleMessages,
  });

  assert.equal(publicResults.some((item) => item.id === 'p2'), false);
  assert.equal(publicResults.some((item) => item.id === 's2'), false);
  assert.equal(publicResults.some((item) => item.kind === 'message'), false);

  const adminResults = buildSearchIndex({
    isAdmin: true,
    query: 'Internship',
    projects: sampleProjects,
    skills: sampleSkills,
    research: [],
    experiences: [],
    messages: sampleMessages,
  });
  assert.equal(adminResults.length, 1);
  assert.equal(adminResults[0].kind, 'message');
});

test('computeProfileCompletion scores real completed fields accurately', () => {
  const profile: PublicProfile = {
    ownerName: 'Clarence L. Chilongo',
    headline: 'Computer Engineering Student | Software Developer',
    tagline: 'Think Beyond Code. Engineer Possibility.',
    location: 'Malawi',
    shortBio: 'Computer engineering student building reliable software and embedded prototypes.',
    githubUrl: 'https://github.com/clarence',
    cvEnabled: false,
  };
  const completion = computeProfileCompletion(profile, sampleProjects, sampleSkills);
  assert.equal(completion.percent, 83);
  assert.equal(completion.items.find((i) => i.key === 'cv')?.completed, false);
});

test('validation schemas enforce strict boundaries and URL sanitization', () => {
  assert.equal(generateSlug('  KLARENCY 4.0 — Portfolio! '), 'klarency-40-portfolio');
  assert.equal(sanitizeExternalUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeExternalUrl('https://github.com/test'), 'https://github.com/test');

  const badContact = contactFormSchema.safeParse({
    senderName: 'A',
    senderEmail: 'not-an-email',
    subject: 'Hi',
    message: 'Short',
  });
  assert.equal(badContact.success, false);

  const validProject = projectSchema.safeParse({
    title: 'Telemetry Dashboard',
    slug: 'telemetry-dashboard',
    summary: 'Real-time campus power monitoring dashboard.',
    technologies: ['React', 'TypeScript'],
    devStatus: 'In progress',
    publishState: 'draft',
    featured: false,
    sortOrder: 0,
  });
  assert.equal(validProject.success, true);
});

test('contact cooldown and sync status helpers behave deterministically', () => {
  const blocked = canSubmitContact(1000, 15000, 30000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.waitSeconds, 16);

  const allowed = canSubmitContact(1000, 35000, 30000);
  assert.equal(allowed.allowed, true);

  assert.equal(getSyncStatusCopy('offline').tone, 'warning');
  assert.equal(getSyncStatusCopy('saved', '10:30').label, 'Saved · 10:30');
});
