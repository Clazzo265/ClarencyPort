import { useMemo, useState } from 'react';
import type { Skill, SkillCategory, SkillProficiency } from '../../types/portfolio';

const CATEGORIES: Array<'All' | SkillCategory> = [
  'All',
  'Programming Languages',
  'Frontend Development',
  'Backend Development',
  'Mobile Development',
  'Databases',
  'Tools & Technologies',
];

const PROFICIENCY_LEVELS: SkillProficiency[] = [
  'Beginner',
  'Developing',
  'Intermediate',
  'Advanced',
];

interface SkillsSectionProps {
  skills: Skill[];
}

export function SkillsSection({ skills }: SkillsSectionProps) {
  const [activeCategory, setActiveCategory] = useState<'All' | SkillCategory>('All');

  const publishedSkills = useMemo(
    () =>
      skills
        .filter((s) => s.publishState === 'published')
        .filter((s) => (activeCategory === 'All' ? true : s.category === activeCategory)),
    [skills, activeCategory],
  );

  return (
    <section id="skills" className="border-b border-slate-400/15 bg-[#080D1C]/50 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-[#F8FAFC] sm:text-3xl">
              Technical Skills
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#94A3B8]">
              Honest representation of current engineering capabilities across languages, web and
              mobile interfaces, data stores, and systems tooling.
            </p>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Filter skills by category"
          className="mt-8 flex flex-wrap gap-2"
        >
          {CATEGORIES.map((category) => {
            const isSelected = activeCategory === category;
            return (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveCategory(category)}
                className={`min-h-[40px] rounded-lg px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-[#2563EB] text-white'
                    : 'border border-slate-400/20 bg-[#101A2E]/70 text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {publishedSkills.length === 0 ? (
          <div className="mt-8 rounded-xl border border-slate-400/15 bg-[#101A2E]/40 p-8 text-center text-sm text-[#94A3B8]">
            No published skills in this category yet.
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {publishedSkills.map((skill) => {
              const levelIndex = PROFICIENCY_LEVELS.indexOf(skill.proficiency);
              return (
                <article
                  key={skill.id}
                  className="kl-surface flex flex-col justify-between rounded-xl p-5"
                >
                  <div>
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-display text-base font-semibold text-[#F8FAFC]">
                        {skill.name}
                      </h3>
                      <span className="font-mono text-xs text-[#22D3EE] whitespace-nowrap shrink-0">
                        {skill.proficiency}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#94A3B8]">{skill.category}</p>
                    {skill.description && (
                      <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
                        {skill.description}
                      </p>
                    )}
                  </div>

                  <div
                    className="mt-5 grid grid-cols-4 gap-1.5"
                    aria-label={`Proficiency stage: ${skill.proficiency}`}
                  >
                    {PROFICIENCY_LEVELS.map((lvl, idx) => (
                      <span
                        key={lvl}
                        className={`h-1 rounded-full ${
                          idx <= levelIndex ? 'bg-[#22D3EE]' : 'bg-slate-400/20'
                        }`}
                      />
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
