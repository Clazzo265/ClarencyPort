export type PublishState = 'draft' | 'published' | 'archived' | 'trashed';
export type SimplePublishState = 'draft' | 'published' | 'archived';

export type DevStatus =
  | 'Completed'
  | 'In progress'
  | 'Prototype'
  | 'Experimental'
  | 'Archived';

export type SkillCategory =
  | 'Programming Languages'
  | 'Frontend Development'
  | 'Backend Development'
  | 'Mobile Development'
  | 'Databases'
  | 'Tools & Technologies';

export type SkillProficiency =
  | 'Beginner'
  | 'Developing'
  | 'Intermediate'
  | 'Advanced';

export type ResearchStage =
  | 'Research Interest'
  | 'Ongoing Investigation'
  | 'Completed Academic Work'
  | 'Published Research';

export type ExperienceType =
  | 'Education'
  | 'Relevant Experience'
  | 'Industrial Attachment'
  | 'Technical Training'
  | 'Certification';

export type MessageStatus = 'unread' | 'read' | 'archived';

export type MediaVisibility = 'PRIVATE' | 'UNPUBLISHED' | 'PUBLIC';

export type MediaCategory =
  | 'profile'
  | 'project-cover'
  | 'project-screenshot'
  | 'project-demo'
  | 'cv'
  | 'research'
  | 'experience'
  | 'certificate'
  | 'other';

export type MediaUploadState =
  | 'preparing'
  | 'waiting-auth'
  | 'uploading'
  | 'paused'
  | 'resuming'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type MediaDeliveryStatus = 'private' | 'unverified' | 'verified' | 'failed';

export type MediaStorageProviderId = 'google-drive';

export interface MediaFileRecord {
  id: string;
  name: string;
  originalName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
  size: number;
  sha256?: string;
  width?: number;
  height?: number;
  driveFileId: string;
  driveFolderId: string;
  drivePermissionId?: string;
  category: MediaCategory;
  description?: string;
  visibility: MediaVisibility;
  uploadStatus: 'completed';
  storageProvider: MediaStorageProviderId;
  publicUrl?: string;
  fallbackPublicUrl?: string;
  deliveryStatus: MediaDeliveryStatus;
  deliveryError?: string;
  uploadedBy: string;
  createdAt?: string;
  updatedAt?: string;
  schemaVersion: number;
}

export interface DriveFolderMap {
  rootId: string;
  profileId: string;
  projectsId: string;
  projectCoversId: string;
  projectScreenshotsId: string;
  projectDemosId: string;
  cvId: string;
  researchId: string;
  experienceId: string;
  certificatesId: string;
  otherId: string;
}

export interface DriveWorkspaceConfig {
  provider: MediaStorageProviderId;
  rootFolderName: string;
  folderIds: DriveFolderMap;
  connectedEmail?: string;
  updatedAt?: string;
}

export interface PublicProfile {
  ownerName: string;
  headline: string;
  tagline: string;
  location: string;
  shortBio: string;
  expandedBio?: string;
  availabilityNote?: string;
  portraitUrl?: string;
  portraitMediaId?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  xUrl?: string;
  publicEmail?: string;
  cvUrl?: string;
  cvMediaId?: string;
  cvFileName?: string;
  cvEnabled: boolean;
  updatedAt?: string;
}

export interface PrivateSettings {
  onboardingCompleted: boolean;
  contactRateLimitMinutes?: number;
  securityContactNote?: string;
  siteAnnouncement?: string;
  maintenanceMode: boolean;
  updatedAt?: string;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  summary: string;
  problem?: string;
  intendedUsers?: string;
  solution?: string;
  features?: string[];
  technologies: string[];
  challenges?: string;
  lessonsLearned?: string;
  devStatus: DevStatus;
  publishState: PublishState;
  featured: boolean;
  sortOrder: number;
  imageUrl?: string;
  coverMediaId?: string;
  galleryMediaIds?: string[];
  galleryImageUrls?: string[];
  githubUrl?: string;
  liveUrl?: string;
  ownerId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectRevision {
  id: string;
  projectId: string;
  title: string;
  summary: string;
  devStatus: DevStatus;
  publishState: PublishState;
  note?: string;
  savedBy: string;
  createdAt?: string;
}

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  proficiency: SkillProficiency;
  description?: string;
  publishState: SimplePublishState;
  sortOrder: number;
  updatedAt?: string;
}

export interface ResearchEntry {
  id: string;
  title: string;
  stage: ResearchStage;
  researchQuestion?: string;
  objectives?: string;
  summary: string;
  methods?: string;
  findings?: string;
  references?: string;
  documentUrl?: string;
  documentMediaId?: string;
  publishState: SimplePublishState;
  updatedAt?: string;
}

export interface ExperienceEntry {
  id: string;
  title: string;
  organization: string;
  entryType: ExperienceType;
  dateRange: string;
  location?: string;
  description?: string;
  verificationUrl?: string;
  certificateMediaId?: string;
  publishState: SimplePublishState;
  sortOrder: number;
  updatedAt?: string;
}

export interface ContactMessage {
  id: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  status: MessageStatus;
  createdAt?: string;
}

export interface AuditLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  createdAt?: string;
}

export type SyncStatus =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'unsaved'
  | 'offline'
  | 'reconnecting'
  | 'waiting-sync'
  | 'error';

export interface SearchableItem {
  id: string;
  kind: 'project' | 'skill' | 'research' | 'experience' | 'message' | 'media' | 'action';
  title: string;
  subtitle: string;
  statusLabel?: string;
  targetSection?: string;
}
