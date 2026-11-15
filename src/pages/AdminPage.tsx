import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  FolderKanban,
  FolderPlus,
  LayoutDashboard,
  Layers,
  LogOut,
  Mail,
  Menu,
  Search,
  ShieldCheck,
  UserCog,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardHome, type AdminSection } from '../components/admin/DashboardHome';
import {
  ExperienceManager,
  ResearchManager,
  SkillsManager,
} from '../components/admin/CollectionsManagers';
import { GuidedProjectWizard } from '../components/admin/GuidedProjectWizard';
import { MessagesInbox } from '../components/admin/MessagesInbox';
import { OnboardingModal } from '../components/admin/OnboardingModal';
import { ProfileSettingsEditor } from '../components/admin/ProfileSettingsEditor';
import { ProjectsManager } from '../components/admin/ProjectsManager';
import { CommandPalette } from '../components/shared/CommandPalette';
import { useAuth } from '../context/AuthContext';
import { useSyncStatus } from '../context/SyncStatusContext';
import { DEFAULT_PRIVATE_SETTINGS, DEFAULT_PUBLIC_PROFILE } from '../data/initialPortfolioData';
import { loadLocalDraft, purgeExpiredDrafts } from '../services/indexedDbDrafts';
import {
  bootstrapOwnerDataIfEmpty,
  savePrivateSettings,
  subscribeAdminWorkspace,
  subscribePublicPortfolio,
} from '../services/portfolioService';
import type {
  AuditLog,
  ContactMessage,
  ExperienceEntry,
  PrivateSettings,
  Project,
  PublicProfile,
  ResearchEntry,
  SearchableItem,
  Skill,
} from '../types/portfolio';
import { getSyncStatusCopy } from '../utils/portfolioLogic';

const SIDEBAR_ITEMS: Array<{ key: AdminSection; label: string; icon: typeof LayoutDashboard }> = [
  { key: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'wizard', label: 'Add Project', icon: FolderPlus },
  { key: 'projects', label: 'Projects', icon: FolderKanban },
  { key: 'profile', label: 'Profile & CV', icon: UserCog },
  { key: 'skills', label: 'Skills', icon: Layers },
  { key: 'research', label: 'Research', icon: BookOpen },
  { key: 'experience', label: 'Experience', icon: Briefcase },
  { key: 'messages', label: 'Messages', icon: Mail },
];

export default function AdminPage() {
  const { user, authReady, isAdmin, isSigningIn, authError, signInWithGoogle, signOut } = useAuth();
  const { syncStatus, lastSavedAt } = useSyncStatus();

  const [section, setSection] = useState<AdminSection>('overview');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [hasRecoverableDraft, setHasRecoverableDraft] = useState(false);

  const [profile, setProfile] = useState<PublicProfile>(DEFAULT_PUBLIC_PROFILE);
  const [privateSettings, setPrivateSettings] = useState<PrivateSettings>(DEFAULT_PRIVATE_SETTINGS);
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [research, setResearch] = useState<ResearchEntry[]>([]);
  const [experiences, setExperiences] = useState<ExperienceEntry[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    void purgeExpiredDrafts();
    void loadLocalDraft('klarency_wizard_project_draft').then((draft) => {
      setHasRecoverableDraft(Boolean(draft));
    });
  }, [section]);

  useEffect(() => {
    if (!authReady || !isAdmin || !user) return;

    void bootstrapOwnerDataIfEmpty(user.uid, user.email ?? 'owner');

    const unsubPublic = subscribePublicPortfolio({
      onProfile: setProfile,
      onProjects: () => {},
      onSkills: () => {},
      onResearch: () => {},
      onExperiences: () => {},
    });

    const unsubAdmin = subscribeAdminWorkspace({
      onPrivateSettings: (settings) => {
        setPrivateSettings(settings);
        if (!settings.onboardingCompleted) {
          setOnboardingOpen(true);
        }
      },
      onAllProjects: setProjects,
      onAllSkills: setSkills,
      onAllResearch: setResearch,
      onAllExperiences: setExperiences,
      onMessages: setMessages,
      onAuditLogs: setAuditLogs,
    });

    return () => {
      unsubPublic();
      unsubAdmin();
    };
  }, [authReady, isAdmin, user]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleCompleteOnboarding = async () => {
    setOnboardingOpen(false);
    try {
      await savePrivateSettings({ ...privateSettings, onboardingCompleted: true });
    } catch {
      // Ignore if offline
    }
  };

  const handleSelectSearch = (item: SearchableItem) => {
    if (item.kind === 'project') {
      const match = projects.find((p) => p.id === item.id);
      if (match) {
        setEditingProject(match);
        setSection('wizard');
        return;
      }
    }
    if (item.targetSection) {
      setSection(item.targetSection as AdminSection);
    }
  };

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] text-sm text-[#94A3B8]">
        Verifying administrator session…
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] px-4 kl-atmosphere">
        <div className="kl-surface w-full max-w-md rounded-2xl p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2563EB]/20 text-[#22D3EE]">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-[#F8FAFC]">
                KLARENCY Owner Studio
              </h1>
              <p className="text-xs text-[#94A3B8]">Protected Administrator Access</p>
            </div>
          </div>

          <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
            Sign in with the verified owner Google account to manage projects, research, skills,
            CV uploads, and private contact messages. Public registration is disabled.
          </p>

          {authError && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/30 p-3.5 text-xs text-rose-200"
            >
              {authError}
            </div>
          )}

          <div className="mt-6 space-y-3">
            <button
              type="button"
              disabled={isSigningIn}
              onClick={() => void signInWithGoogle()}
              className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8] disabled:opacity-50"
            >
              {isSigningIn ? 'Signing in…' : 'Sign in with Google'}
            </button>

            <Link
              to="/"
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-400/20 px-4 text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Return to public portfolio</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const syncCopy = getSyncStatusCopy(syncStatus, lastSavedAt);
  const unreadCount = messages.filter((m) => m.status === 'unread').length;

  return (
    <div className="min-h-screen bg-[#050816] text-[#F8FAFC] lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-400/15 bg-[#080D1C] p-5 lg:flex">
        <div className="flex items-center justify-between border-b border-slate-400/15 pb-4">
          <Link to="/" className="font-display text-lg font-bold tracking-tight text-[#F8FAFC]">
            KLARENCY
          </Link>
          <span className="font-mono text-[11px] text-[#22D3EE]">Studio</span>
        </div>

        <nav aria-label="Administrator navigation" className="mt-6 flex-1 space-y-1">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = section === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  if (item.key !== 'wizard') setEditingProject(null);
                  setSection(item.key);
                }}
                className={`flex min-h-[44px] w-full items-center justify-between rounded-xl px-3.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#2563EB] text-white'
                    : 'text-[#94A3B8] hover:bg-[#101A2E] hover:text-[#F8FAFC]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </span>
                {item.key === 'messages' && unreadCount > 0 && (
                  <span className="font-mono text-xs tabular-nums">{unreadCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-400/15 pt-4">
          <p className="truncate text-xs text-[#94A3B8]">{user.email}</p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-3 flex min-h-[40px] w-full items-center gap-2 rounded-lg border border-slate-400/20 px-3 text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC]"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-400/15 bg-[#050816]/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((p) => !p)}
              aria-label={mobileMenuOpen ? 'Close studio menu' : 'Open studio menu'}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-400/20 lg:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="text-xs font-medium text-[#94A3B8]">
              Studio / <strong className="text-[#F8FAFC] capitalize">{section}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span
              role="status"
              className={`hidden font-mono text-xs sm:inline-block ${
                syncCopy.tone === 'success'
                  ? 'text-emerald-300'
                  : syncCopy.tone === 'warning'
                    ? 'text-amber-300'
                    : syncCopy.tone === 'danger'
                      ? 'text-rose-300'
                      : 'text-[#94A3B8]'
              }`}
            >
              {syncCopy.label}
            </span>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Open global search"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-400/20 bg-[#080D1C] px-3 text-xs text-[#94A3B8] hover:text-[#F8FAFC]"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Search (Ctrl+K)</span>
            </button>
          </div>
        </header>

        {mobileMenuOpen && (
          <nav
            aria-label="Mobile administrator navigation"
            className="border-b border-slate-400/15 bg-[#080D1C] p-4 lg:hidden"
          >
            <div className="grid grid-cols-2 gap-2">
              {SIDEBAR_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (item.key !== 'wizard') setEditingProject(null);
                    setSection(item.key);
                    setMobileMenuOpen(false);
                  }}
                  className={`min-h-[44px] rounded-lg px-3 text-left text-xs font-medium ${
                    section === item.key
                      ? 'bg-[#2563EB] text-white'
                      : 'border border-slate-400/15 text-[#94A3B8]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-slate-400/20 text-xs text-[#94A3B8]"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </nav>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {section === 'overview' && (
            <DashboardHome
              profile={profile}
              projects={projects}
              skills={skills}
              messages={messages}
              auditLogs={auditLogs}
              hasRecoverableDraft={hasRecoverableDraft}
              onNavigate={(next) => {
                if (next === 'wizard') setEditingProject(null);
                setSection(next);
              }}
              onReopenGuide={() => setOnboardingOpen(true)}
            />
          )}

          {section === 'wizard' && (
            <GuidedProjectWizard
              editingProject={editingProject}
              onFinished={() => {
                setEditingProject(null);
                setSection('projects');
              }}
              onCancel={() => {
                setEditingProject(null);
                setSection('projects');
              }}
            />
          )}

          {section === 'projects' && (
            <ProjectsManager
              projects={projects}
              onCreateNew={() => {
                setEditingProject(null);
                setSection('wizard');
              }}
              onEditProject={(proj) => {
                setEditingProject(proj);
                setSection('wizard');
              }}
            />
          )}

          {section === 'profile' && (
            <ProfileSettingsEditor profile={profile} privateSettings={privateSettings} />
          )}

          {section === 'skills' && <SkillsManager skills={skills} />}
          {section === 'research' && <ResearchManager research={research} />}
          {section === 'experience' && <ExperienceManager experiences={experiences} />}
          {section === 'messages' && <MessagesInbox messages={messages} />}
        </main>
      </div>

      <OnboardingModal
        open={onboardingOpen}
        onComplete={() => void handleCompleteOnboarding()}
        onSkip={() => void handleCompleteOnboarding()}
      />

      <CommandPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        isAdmin={true}
        projects={projects}
        skills={skills}
        research={research}
        experiences={experiences}
        messages={messages}
        onSelectItem={handleSelectSearch}
      />
    </div>
  );
}
