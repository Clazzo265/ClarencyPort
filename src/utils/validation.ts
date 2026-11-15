import { z } from 'zod';

// Regex constants synchronized with firebase-blueprint.json & firestore.rules
export const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
export const SLUG_PATTERN = /^[a-z0-9-]+$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function sanitizeExternalUrl(raw?: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/src/assets/') || trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  return '';
}

export function generateSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 140) || 'untitled-project';
}

export const optionalUrlSchema = z
  .string()
  .max(500, 'URL must be 500 characters or fewer.')
  .refine((val) => val === '' || /^https?:\/\/.+/.test(val.trim()), {
    message: 'Enter a valid URL starting with https:// or http://',
  });

export const optionalMediaUrlSchema = z
  .string()
  .max(1200, 'Media URL must be 1200 characters or fewer.')
  .refine(
    (val) => val === '' || /^https?:\/\/.+/.test(val.trim()) || val.trim().startsWith('/src/assets/'),
    { message: 'Enter a valid image URL or upload a file from your device.' },
  );

export const contactFormSchema = z.object({
  senderName: z
    .string()
    .trim()
    .min(2, 'Please enter your name (at least 2 characters).')
    .max(120, 'Name must be 120 characters or fewer.'),
  senderEmail: z
    .string()
    .trim()
    .min(5, 'Please enter a valid email address.')
    .max(160, 'Email must be 160 characters or fewer.')
    .regex(EMAIL_PATTERN, 'Please enter a valid email address.'),
  subject: z
    .string()
    .trim()
    .min(2, 'Please provide a brief subject.')
    .max(180, 'Subject must be 180 characters or fewer.'),
  message: z
    .string()
    .trim()
    .min(10, 'Please write a message of at least 10 characters.')
    .max(4000, 'Message must be 4000 characters or fewer.'),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const publicProfileSchema = z.object({
  ownerName: z.string().trim().min(2, 'Owner name is required.').max(120),
  headline: z.string().trim().min(2, 'Professional identity is required.').max(160),
  tagline: z.string().trim().min(2, 'Tagline is required.').max(200),
  location: z.string().trim().min(2, 'Location is required.').max(120),
  shortBio: z.string().trim().min(10, 'Biography must be at least 10 characters.').max(1200),
  expandedBio: z.string().max(4000).optional().default(''),
  availabilityNote: z.string().max(240).optional().default(''),
  portraitUrl: optionalMediaUrlSchema.optional().default(''),
  githubUrl: optionalUrlSchema.optional().default(''),
  linkedinUrl: optionalUrlSchema.optional().default(''),
  xUrl: optionalUrlSchema.optional().default(''),
  publicEmail: z
    .string()
    .max(160)
    .refine((v) => v === '' || EMAIL_PATTERN.test(v.trim()), 'Enter a valid email address.')
    .optional()
    .default(''),
  cvUrl: optionalMediaUrlSchema.optional().default(''),
  cvFileName: z.string().max(200).optional().default(''),
  cvEnabled: z.boolean(),
});

export type PublicProfileFormValues = z.infer<typeof publicProfileSchema>;

export const projectSchema = z.object({
  title: z.string().trim().min(2, 'Project name must be at least 2 characters.').max(140),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(140)
    .regex(SLUG_PATTERN, 'Slug may only contain lowercase letters, numbers, and hyphens.'),
  summary: z
    .string()
    .trim()
    .min(10, 'Short description should be at least 10 characters.')
    .max(500, 'Short description must be 500 characters or fewer.'),
  problem: z.string().max(3000).optional().default(''),
  intendedUsers: z.string().max(600).optional().default(''),
  solution: z.string().max(3000).optional().default(''),
  features: z.array(z.string().max(160)).max(20).optional().default([]),
  technologies: z
    .array(z.string().min(1).max(160))
    .min(1, 'Select or add at least one technology.')
    .max(24),
  challenges: z.string().max(2500).optional().default(''),
  lessonsLearned: z.string().max(2500).optional().default(''),
  devStatus: z.enum(['Completed', 'In progress', 'Prototype', 'Experimental', 'Archived']),
  publishState: z.enum(['draft', 'published', 'archived', 'trashed']),
  featured: z.boolean(),
  sortOrder: z.number().min(0).max(10000),
  imageUrl: optionalMediaUrlSchema.optional().default(''),
  githubUrl: optionalUrlSchema.optional().default(''),
  liveUrl: optionalUrlSchema.optional().default(''),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;

export const skillSchema = z.object({
  name: z.string().trim().min(1, 'Skill name is required.').max(80),
  category: z.enum([
    'Programming Languages',
    'Frontend Development',
    'Backend Development',
    'Mobile Development',
    'Databases',
    'Tools & Technologies',
  ]),
  proficiency: z.enum(['Beginner', 'Developing', 'Intermediate', 'Advanced']),
  description: z.string().max(400).optional().default(''),
  publishState: z.enum(['draft', 'published', 'archived']),
  sortOrder: z.number().min(0).max(10000),
});

export const researchSchema = z.object({
  title: z.string().trim().min(3, 'Research title must be at least 3 characters.').max(180),
  stage: z.enum([
    'Research Interest',
    'Ongoing Investigation',
    'Completed Academic Work',
    'Published Research',
  ]),
  researchQuestion: z.string().max(600).optional().default(''),
  objectives: z.string().max(1200).optional().default(''),
  summary: z.string().trim().min(10, 'Summary must be at least 10 characters.').max(2000),
  methods: z.string().max(1500).optional().default(''),
  findings: z.string().max(1500).optional().default(''),
  references: z.string().max(1200).optional().default(''),
  documentUrl: optionalMediaUrlSchema.optional().default(''),
  publishState: z.enum(['draft', 'published', 'archived']),
});

export const experienceSchema = z.object({
  title: z.string().trim().min(2, 'Title is required.').max(160),
  organization: z.string().trim().min(2, 'Organization or institution is required.').max(160),
  entryType: z.enum([
    'Education',
    'Relevant Experience',
    'Industrial Attachment',
    'Technical Training',
    'Certification',
  ]),
  dateRange: z.string().trim().min(2, 'Date range is required.').max(80),
  location: z.string().max(120).optional().default(''),
  description: z.string().max(1500).optional().default(''),
  verificationUrl: optionalUrlSchema.optional().default(''),
  publishState: z.enum(['draft', 'published', 'archived']),
  sortOrder: z.number().min(0).max(10000),
});
