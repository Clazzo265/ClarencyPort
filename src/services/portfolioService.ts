import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  DEFAULT_PRIVATE_SETTINGS,
  DEFAULT_PUBLIC_PROFILE,
  INITIAL_EXPERIENCES,
  INITIAL_PROJECTS,
  INITIAL_RESEARCH,
  INITIAL_SKILLS,
} from '../data/initialPortfolioData';
import type {
  AuditLog,
  ContactMessage,
  ExperienceEntry,
  MessageStatus,
  PrivateSettings,
  Project,
  ProjectRevision,
  PublicProfile,
  PublishState,
  ResearchEntry,
  Skill,
} from '../types/portfolio';
import { contactFormSchema, type ContactFormValues } from '../utils/validation';
import { auth, db, handleFirestoreError, OperationType } from './firebase';

const PUBLIC_CACHE_KEY = 'klarency_public_cache_v1';

function toIsoString(val: unknown): string | undefined {
  if (!val) return undefined;
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  return undefined;
}

function makeDocId(prefix: string): string {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${stamp}-${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function savePublicCache(data: {
  profile: PublicProfile;
  projects: Project[];
  skills: Skill[];
  research: ResearchEntry[];
  experiences: ExperienceEntry[];
}): void {
  try {
    localStorage.setItem(
      PUBLIC_CACHE_KEY,
      JSON.stringify({ ...data, cachedAt: new Date().toISOString() }),
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function loadPublicCache(): {
  profile: PublicProfile;
  projects: Project[];
  skills: Skill[];
  research: ResearchEntry[];
  experiences: ExperienceEntry[];
} {
  try {
    const raw = localStorage.getItem(PUBLIC_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.profile && Array.isArray(parsed.projects)) {
        return {
          profile: parsed.profile,
          projects: parsed.projects,
          skills: parsed.skills ?? INITIAL_SKILLS,
          research: parsed.research ?? INITIAL_RESEARCH,
          experiences: parsed.experiences ?? INITIAL_EXPERIENCES,
        };
      }
    }
  } catch {
    // Fallback to initial data
  }
  return {
    profile: DEFAULT_PUBLIC_PROFILE,
    projects: INITIAL_PROJECTS,
    skills: INITIAL_SKILLS,
    research: INITIAL_RESEARCH,
    experiences: INITIAL_EXPERIENCES,
  };
}

export function subscribePublicPortfolio(callbacks: {
  onProfile: (profile: PublicProfile) => void;
  onProjects: (projects: Project[]) => void;
  onSkills: (skills: Skill[]) => void;
  onResearch: (research: ResearchEntry[]) => void;
  onExperiences: (experiences: ExperienceEntry[]) => void;
}): () => void {
  const unsubs: Unsubscribe[] = [];

  const profileRef = doc(db, 'siteContent', 'publicProfile');
  unsubs.push(
    onSnapshot(
      profileRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          callbacks.onProfile({
            ...(DEFAULT_PUBLIC_PROFILE as PublicProfile),
            ...(data as Partial<PublicProfile>),
            updatedAt: toIsoString(data.updatedAt),
          });
        } else {
          callbacks.onProfile(DEFAULT_PUBLIC_PROFILE);
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'siteContent/publicProfile'),
    ),
  );

  const pubProjectsQuery = query(
    collection(db, 'projects'),
    where('publishState', '==', 'published'),
  );
  unsubs.push(
    onSnapshot(
      pubProjectsQuery,
      (snap) => {
        if (snap.empty) {
          callbacks.onProjects(INITIAL_PROJECTS);
          return;
        }
        const items: Project[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: String(data.title ?? ''),
            slug: String(data.slug ?? d.id),
            summary: String(data.summary ?? ''),
            problem: data.problem ? String(data.problem) : '',
            intendedUsers: data.intendedUsers ? String(data.intendedUsers) : '',
            solution: data.solution ? String(data.solution) : '',
            features: Array.isArray(data.features) ? data.features.map(String) : [],
            technologies: Array.isArray(data.technologies) ? data.technologies.map(String) : [],
            challenges: data.challenges ? String(data.challenges) : '',
            lessonsLearned: data.lessonsLearned ? String(data.lessonsLearned) : '',
            devStatus: data.devStatus,
            publishState: data.publishState,
            featured: Boolean(data.featured),
            sortOrder: Number(data.sortOrder ?? 0),
            imageUrl: data.imageUrl ? String(data.imageUrl) : '',
            githubUrl: data.githubUrl ? String(data.githubUrl) : '',
            liveUrl: data.liveUrl ? String(data.liveUrl) : '',
            ownerId: String(data.ownerId ?? ''),
            createdAt: toIsoString(data.createdAt),
            updatedAt: toIsoString(data.updatedAt),
          };
        });
        callbacks.onProjects(items);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'projects'),
    ),
  );

  const pubSkillsQuery = query(
    collection(db, 'skills'),
    where('publishState', '==', 'published'),
  );
  unsubs.push(
    onSnapshot(
      pubSkillsQuery,
      (snap) => {
        if (snap.empty) {
          callbacks.onSkills(INITIAL_SKILLS);
          return;
        }
        const items: Skill[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: String(data.name ?? ''),
              category: data.category,
              proficiency: data.proficiency,
              description: data.description ? String(data.description) : '',
              publishState: data.publishState,
              sortOrder: Number(data.sortOrder ?? 0),
              updatedAt: toIsoString(data.updatedAt),
            };
          })
          .sort((a, b) => a.sortOrder - b.sortOrder);
        callbacks.onSkills(items);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'skills'),
    ),
  );

  const pubResearchQuery = query(
    collection(db, 'research'),
    where('publishState', '==', 'published'),
  );
  unsubs.push(
    onSnapshot(
      pubResearchQuery,
      (snap) => {
        if (snap.empty) {
          callbacks.onResearch(INITIAL_RESEARCH);
          return;
        }
        const items: ResearchEntry[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: String(data.title ?? ''),
            stage: data.stage,
            researchQuestion: data.researchQuestion ? String(data.researchQuestion) : '',
            objectives: data.objectives ? String(data.objectives) : '',
            summary: String(data.summary ?? ''),
            methods: data.methods ? String(data.methods) : '',
            findings: data.findings ? String(data.findings) : '',
            references: data.references ? String(data.references) : '',
            documentUrl: data.documentUrl ? String(data.documentUrl) : '',
            publishState: data.publishState,
            updatedAt: toIsoString(data.updatedAt),
          };
        });
        callbacks.onResearch(items);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'research'),
    ),
  );

  const pubExpQuery = query(
    collection(db, 'experiences'),
    where('publishState', '==', 'published'),
  );
  unsubs.push(
    onSnapshot(
      pubExpQuery,
      (snap) => {
        if (snap.empty) {
          callbacks.onExperiences(INITIAL_EXPERIENCES);
          return;
        }
        const items: ExperienceEntry[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: String(data.title ?? ''),
              organization: String(data.organization ?? ''),
              entryType: data.entryType,
              dateRange: String(data.dateRange ?? ''),
              location: data.location ? String(data.location) : '',
              description: data.description ? String(data.description) : '',
              verificationUrl: data.verificationUrl ? String(data.verificationUrl) : '',
              publishState: data.publishState,
              sortOrder: Number(data.sortOrder ?? 0),
              updatedAt: toIsoString(data.updatedAt),
            };
          })
          .sort((a, b) => a.sortOrder - b.sortOrder);
        callbacks.onExperiences(items);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'experiences'),
    ),
  );

  return () => {
    for (const unsub of unsubs) unsub();
  };
}

export function subscribeAdminWorkspace(callbacks: {
  onPrivateSettings: (settings: PrivateSettings) => void;
  onAllProjects: (projects: Project[]) => void;
  onAllSkills: (skills: Skill[]) => void;
  onAllResearch: (research: ResearchEntry[]) => void;
  onAllExperiences: (experiences: ExperienceEntry[]) => void;
  onMessages: (messages: ContactMessage[]) => void;
  onAuditLogs: (logs: AuditLog[]) => void;
}): () => void {
  const unsubs: Unsubscribe[] = [];

  unsubs.push(
    onSnapshot(
      doc(db, 'siteContent', 'privateSettings'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          callbacks.onPrivateSettings({
            ...DEFAULT_PRIVATE_SETTINGS,
            ...(data as Partial<PrivateSettings>),
            updatedAt: toIsoString(data.updatedAt),
          });
        } else {
          callbacks.onPrivateSettings(DEFAULT_PRIVATE_SETTINGS);
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'siteContent/privateSettings'),
    ),
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'projects'),
      (snap) => {
        const items: Project[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: String(data.title ?? ''),
              slug: String(data.slug ?? d.id),
              summary: String(data.summary ?? ''),
              problem: data.problem ? String(data.problem) : '',
              intendedUsers: data.intendedUsers ? String(data.intendedUsers) : '',
              solution: data.solution ? String(data.solution) : '',
              features: Array.isArray(data.features) ? data.features.map(String) : [],
              technologies: Array.isArray(data.technologies) ? data.technologies.map(String) : [],
              challenges: data.challenges ? String(data.challenges) : '',
              lessonsLearned: data.lessonsLearned ? String(data.lessonsLearned) : '',
              devStatus: data.devStatus,
              publishState: data.publishState,
              featured: Boolean(data.featured),
              sortOrder: Number(data.sortOrder ?? 0),
              imageUrl: data.imageUrl ? String(data.imageUrl) : '',
              githubUrl: data.githubUrl ? String(data.githubUrl) : '',
              liveUrl: data.liveUrl ? String(data.liveUrl) : '',
              ownerId: String(data.ownerId ?? ''),
              createdAt: toIsoString(data.createdAt),
              updatedAt: toIsoString(data.updatedAt),
            };
          })
          .sort((a, b) => a.sortOrder - b.sortOrder);
        callbacks.onAllProjects(items);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'projects'),
    ),
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'skills'),
      (snap) => {
        const items: Skill[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: String(data.name ?? ''),
              category: data.category,
              proficiency: data.proficiency,
              description: data.description ? String(data.description) : '',
              publishState: data.publishState,
              sortOrder: Number(data.sortOrder ?? 0),
              updatedAt: toIsoString(data.updatedAt),
            };
          })
          .sort((a, b) => a.sortOrder - b.sortOrder);
        callbacks.onAllSkills(items);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'skills'),
    ),
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'research'),
      (snap) => {
        const items: ResearchEntry[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: String(data.title ?? ''),
            stage: data.stage,
            researchQuestion: data.researchQuestion ? String(data.researchQuestion) : '',
            objectives: data.objectives ? String(data.objectives) : '',
            summary: String(data.summary ?? ''),
            methods: data.methods ? String(data.methods) : '',
            findings: data.findings ? String(data.findings) : '',
            references: data.references ? String(data.references) : '',
            documentUrl: data.documentUrl ? String(data.documentUrl) : '',
            publishState: data.publishState,
            updatedAt: toIsoString(data.updatedAt),
          };
        });
        callbacks.onAllResearch(items);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'research'),
    ),
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'experiences'),
      (snap) => {
        const items: ExperienceEntry[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: String(data.title ?? ''),
              organization: String(data.organization ?? ''),
              entryType: data.entryType,
              dateRange: String(data.dateRange ?? ''),
              location: data.location ? String(data.location) : '',
              description: data.description ? String(data.description) : '',
              verificationUrl: data.verificationUrl ? String(data.verificationUrl) : '',
              publishState: data.publishState,
              sortOrder: Number(data.sortOrder ?? 0),
              updatedAt: toIsoString(data.updatedAt),
            };
          })
          .sort((a, b) => a.sortOrder - b.sortOrder);
        callbacks.onAllExperiences(items);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'experiences'),
    ),
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'contactMessages'), orderBy('createdAt', 'desc')),
      (snap) => {
        const items: ContactMessage[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            senderName: String(data.senderName ?? ''),
            senderEmail: String(data.senderEmail ?? ''),
            subject: String(data.subject ?? ''),
            message: String(data.message ?? ''),
            status: data.status,
            createdAt: toIsoString(data.createdAt),
          };
        });
        callbacks.onMessages(items);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'contactMessages'),
    ),
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(25)),
      (snap) => {
        const items: AuditLog[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            actorUid: String(data.actorUid ?? ''),
            actorEmail: String(data.actorEmail ?? ''),
            action: String(data.action ?? ''),
            targetType: String(data.targetType ?? ''),
            targetId: String(data.targetId ?? ''),
            summary: String(data.summary ?? ''),
            createdAt: toIsoString(data.createdAt),
          };
        });
        callbacks.onAuditLogs(items);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'auditLogs'),
    ),
  );

  return () => {
    for (const unsub of unsubs) unsub();
  };
}

export async function bootstrapOwnerDataIfEmpty(uid: string, email: string): Promise<void> {
  try {
    const profileSnap = await getDoc(doc(db, 'siteContent', 'publicProfile'));
    if (profileSnap.exists()) return;

    const batch = writeBatch(db);
    batch.set(doc(db, 'siteContent', 'publicProfile'), {
      ...DEFAULT_PUBLIC_PROFILE,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'siteContent', 'privateSettings'), {
      ...DEFAULT_PRIVATE_SETTINGS,
      updatedAt: serverTimestamp(),
    });

    for (const project of INITIAL_PROJECTS) {
      const { id, createdAt: _c, updatedAt: _u, ...rest } = project;
      batch.set(doc(db, 'projects', id), {
        ...rest,
        ownerId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const skill of INITIAL_SKILLS) {
      const { id, updatedAt: _u, ...rest } = skill;
      batch.set(doc(db, 'skills', id), { ...rest, updatedAt: serverTimestamp() });
    }

    for (const item of INITIAL_RESEARCH) {
      const { id, updatedAt: _u, ...rest } = item;
      batch.set(doc(db, 'research', id), { ...rest, updatedAt: serverTimestamp() });
    }

    for (const exp of INITIAL_EXPERIENCES) {
      const { id, updatedAt: _u, ...rest } = exp;
      batch.set(doc(db, 'experiences', id), { ...rest, updatedAt: serverTimestamp() });
    }

    batch.set(doc(db, 'auditLogs', makeDocId('log')), {
      actorUid: uid,
      actorEmail: email,
      action: 'bootstrap',
      targetType: 'workspace',
      targetId: 'klarency',
      summary: 'Initialized KLARENCY portfolio workspace collections in Cloud Firestore.',
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'siteContent/publicProfile');
  }
}

export async function recordAuditLog(
  action: string,
  targetType: string,
  targetId: string,
  summary: string,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const id = makeDocId('log');
  try {
    await setDoc(doc(db, 'auditLogs', id), {
      actorUid: user.uid,
      actorEmail: user.email ?? 'owner',
      action: action.slice(0, 100),
      targetType: targetType.slice(0, 60),
      targetId: targetId.slice(0, 128),
      summary: summary.slice(0, 300),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `auditLogs/${id}`);
  }
}

export async function savePublicProfile(profile: PublicProfile): Promise<void> {
  try {
    const { updatedAt: _u, ...rest } = profile;
    await setDoc(doc(db, 'siteContent', 'publicProfile'), {
      ...rest,
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog('update', 'publicProfile', 'publicProfile', 'Updated public profile and portfolio bio.');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'siteContent/publicProfile');
  }
}

export async function savePrivateSettings(settings: PrivateSettings): Promise<void> {
  try {
    const { updatedAt: _u, ...rest } = settings;
    await setDoc(doc(db, 'siteContent', 'privateSettings'), {
      ...rest,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'siteContent/privateSettings');
  }
}

export async function saveProject(
  projectInput: Omit<Project, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
  existingProject?: Project | null,
  revisionNote?: string,
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Administrator authentication required.');

  const id = existingProject?.id || makeDocId('proj');
  const path = `projects/${id}`;

  try {
    if (existingProject) {
      await updateDoc(doc(db, 'projects', id), {
        title: projectInput.title,
        slug: projectInput.slug,
        summary: projectInput.summary,
        problem: projectInput.problem ?? '',
        intendedUsers: projectInput.intendedUsers ?? '',
        solution: projectInput.solution ?? '',
        features: projectInput.features ?? [],
        technologies: projectInput.technologies,
        challenges: projectInput.challenges ?? '',
        lessonsLearned: projectInput.lessonsLearned ?? '',
        devStatus: projectInput.devStatus,
        publishState: projectInput.publishState,
        featured: projectInput.featured,
        sortOrder: projectInput.sortOrder,
        imageUrl: projectInput.imageUrl ?? '',
        githubUrl: projectInput.githubUrl ?? '',
        liveUrl: projectInput.liveUrl ?? '',
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'projects', id), {
        title: projectInput.title,
        slug: projectInput.slug,
        summary: projectInput.summary,
        problem: projectInput.problem ?? '',
        intendedUsers: projectInput.intendedUsers ?? '',
        solution: projectInput.solution ?? '',
        features: projectInput.features ?? [],
        technologies: projectInput.technologies,
        challenges: projectInput.challenges ?? '',
        lessonsLearned: projectInput.lessonsLearned ?? '',
        devStatus: projectInput.devStatus,
        publishState: projectInput.publishState,
        featured: projectInput.featured,
        sortOrder: projectInput.sortOrder,
        imageUrl: projectInput.imageUrl ?? '',
        githubUrl: projectInput.githubUrl ?? '',
        liveUrl: projectInput.liveUrl ?? '',
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const revId = makeDocId('rev');
    await setDoc(doc(db, 'projects', id, 'revisions', revId), {
      projectId: id,
      title: projectInput.title,
      summary: projectInput.summary,
      devStatus: projectInput.devStatus,
      publishState: projectInput.publishState,
      note: revisionNote || (existingProject ? 'Updated project details' : 'Initial save'),
      savedBy: user.uid,
      createdAt: serverTimestamp(),
    });

    await recordAuditLog(
      existingProject ? 'update' : 'create',
      'project',
      id,
      `${existingProject ? 'Updated' : 'Created'} project "${projectInput.title}" (${projectInput.publishState}).`,
    );
    return id;
  } catch (error) {
    handleFirestoreError(error, existingProject ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function transitionProjectState(
  projectId: string,
  publishState: PublishState,
  title: string,
): Promise<void> {
  try {
    await updateDoc(doc(db, 'projects', projectId), {
      publishState,
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog(
      'transition',
      'project',
      projectId,
      `Changed "${title}" visibility to ${publishState}.`,
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}`);
  }
}

export async function updateProjectFeatureOrder(
  projectId: string,
  featured: boolean,
  sortOrder: number,
): Promise<void> {
  try {
    await updateDoc(doc(db, 'projects', projectId), {
      featured,
      sortOrder,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}`);
  }
}

export async function deleteProjectPermanently(projectId: string, title: string): Promise<void> {
  try {
    const revSnap = await getDocs(collection(db, 'projects', projectId, 'revisions'));
    const batch = writeBatch(db);
    revSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'projects', projectId));
    await batch.commit();
    await recordAuditLog('delete', 'project', projectId, `Permanently deleted "${title}".`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}`);
  }
}

export async function fetchProjectRevisions(projectId: string): Promise<ProjectRevision[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'projects', projectId, 'revisions'), orderBy('createdAt', 'desc')),
    );
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        projectId: String(data.projectId ?? projectId),
        title: String(data.title ?? ''),
        summary: String(data.summary ?? ''),
        devStatus: data.devStatus,
        publishState: data.publishState,
        note: data.note ? String(data.note) : '',
        savedBy: String(data.savedBy ?? ''),
        createdAt: toIsoString(data.createdAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/revisions`);
  }
}

export async function restoreProjectFromRevision(
  project: Project,
  revision: ProjectRevision,
): Promise<void> {
  await saveProject(
    {
      ...project,
      title: revision.title,
      summary: revision.summary,
      devStatus: revision.devStatus,
      publishState: revision.publishState,
    },
    project,
    `Restored from revision ${revision.id}`,
  );
}

export async function saveSkill(skill: Omit<Skill, 'id' | 'updatedAt'>, existingId?: string): Promise<void> {
  const id = existingId || makeDocId('skill');
  try {
    await setDoc(doc(db, 'skills', id), {
      ...skill,
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog(existingId ? 'update' : 'create', 'skill', id, `Saved skill "${skill.name}".`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `skills/${id}`);
  }
}

export async function deleteSkill(id: string, name: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'skills', id));
    await recordAuditLog('delete', 'skill', id, `Deleted skill "${name}".`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `skills/${id}`);
  }
}

export async function saveResearch(
  entry: Omit<ResearchEntry, 'id' | 'updatedAt'>,
  existingId?: string,
): Promise<void> {
  const id = existingId || makeDocId('res');
  try {
    await setDoc(doc(db, 'research', id), {
      ...entry,
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog(
      existingId ? 'update' : 'create',
      'research',
      id,
      `Saved research entry "${entry.title}".`,
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `research/${id}`);
  }
}

export async function deleteResearch(id: string, title: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'research', id));
    await recordAuditLog('delete', 'research', id, `Deleted research entry "${title}".`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `research/${id}`);
  }
}

export async function saveExperience(
  entry: Omit<ExperienceEntry, 'id' | 'updatedAt'>,
  existingId?: string,
): Promise<void> {
  const id = existingId || makeDocId('exp');
  try {
    await setDoc(doc(db, 'experiences', id), {
      ...entry,
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog(
      existingId ? 'update' : 'create',
      'experience',
      id,
      `Saved ${entry.entryType} "${entry.title}".`,
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `experiences/${id}`);
  }
}

export async function deleteExperience(id: string, title: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'experiences', id));
    await recordAuditLog('delete', 'experience', id, `Deleted experience entry "${title}".`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `experiences/${id}`);
  }
}

export async function submitContactMessage(values: ContactFormValues): Promise<string> {
  const parsed = contactFormSchema.parse(values);
  const id = makeDocId('msg');
  try {
    await setDoc(doc(db, 'contactMessages', id), {
      senderName: parsed.senderName,
      senderEmail: parsed.senderEmail,
      subject: parsed.subject,
      message: parsed.message,
      status: 'unread',
      createdAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `contactMessages/${id}`);
  }
}

export async function updateMessageStatus(id: string, status: MessageStatus): Promise<void> {
  try {
    await updateDoc(doc(db, 'contactMessages', id), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `contactMessages/${id}`);
  }
}

export async function deleteMessage(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'contactMessages', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `contactMessages/${id}`);
  }
}
