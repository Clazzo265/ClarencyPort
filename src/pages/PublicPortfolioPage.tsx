import { useEffect, useState } from 'react';
import { AboutSection } from '../components/public/AboutSection';
import { ContactSection } from '../components/public/ContactSection';
import { ExperienceSection } from '../components/public/ExperienceSection';
import { HeroSection } from '../components/public/HeroSection';
import { OfflineBanner } from '../components/public/OfflineBanner';
import { ProjectDetailModal } from '../components/public/ProjectDetailModal';
import { ProjectsSection } from '../components/public/ProjectsSection';
import { PublicFooter } from '../components/public/PublicFooter';
import { PublicHeader } from '../components/public/PublicHeader';
import { ResearchSection } from '../components/public/ResearchSection';
import { SkillsSection } from '../components/public/SkillsSection';
import { CommandPalette } from '../components/shared/CommandPalette';
import {
  loadPublicCache,
  savePublicCache,
  subscribePublicPortfolio,
} from '../services/portfolioService';
import type {
  ExperienceEntry,
  Project,
  PublicProfile,
  ResearchEntry,
  SearchableItem,
  Skill,
} from '../types/portfolio';

export function PublicPortfolioPage() {
  const initial = loadPublicCache();
  const [profile, setProfile] = useState<PublicProfile>(initial.profile);
  const [projects, setProjects] = useState<Project[]>(initial.projects);
  const [skills, setSkills] = useState<Skill[]>(initial.skills);
  const [research, setResearch] = useState<ResearchEntry[]>(initial.research);
  const [experiences, setExperiences] = useState<ExperienceEntry[]>(initial.experiences);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribePublicPortfolio({
      onProfile: setProfile,
      onProjects: setProjects,
      onSkills: setSkills,
      onResearch: setResearch,
      onExperiences: setExperiences,
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    savePublicCache({ profile, projects, skills, research, experiences });
  }, [profile, projects, skills, research, experiences]);

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

  const handleSelectSearch = (item: SearchableItem) => {
    if (item.kind === 'project') {
      const match = projects.find((p) => p.id === item.id);
      if (match) {
        setSelectedProject(match);
        return;
      }
    }
    if (item.targetSection) {
      const el = document.getElementById(item.targetSection);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#050816] text-[#F8FAFC] kl-atmosphere">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[#2563EB] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>

      <OfflineBanner />
      <PublicHeader />

      <main id="main-content">
        <HeroSection profile={profile} />
        <AboutSection profile={profile} />
        <SkillsSection skills={skills} />
        <ProjectsSection projects={projects} onSelectProject={setSelectedProject} />
        <ResearchSection research={research} />
        <ExperienceSection experiences={experiences} profile={profile} />
        <ContactSection />
      </main>

      <PublicFooter profile={profile} onOpenSearch={() => setSearchOpen(true)} />

      <ProjectDetailModal project={selectedProject} onClose={() => setSelectedProject(null)} />

      <CommandPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        isAdmin={false}
        projects={projects}
        skills={skills}
        research={research}
        experiences={experiences}
        messages={[]}
        onSelectItem={handleSelectSearch}
      />
    </div>
  );
}
