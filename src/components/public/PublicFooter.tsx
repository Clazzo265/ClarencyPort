import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PublicProfile } from '../../types/portfolio';
import { sanitizeExternalUrl } from '../../utils/validation';

interface PublicFooterProps {
  profile: PublicProfile;
  onOpenSearch: () => void;
}

export function PublicFooter({ profile, onOpenSearch }: PublicFooterProps) {
  const github = sanitizeExternalUrl(profile.githubUrl);
  const linkedin = sanitizeExternalUrl(profile.linkedinUrl);
  const xUrl = sanitizeExternalUrl(profile.xUrl);
  const cvUrl = profile.cvEnabled ? sanitizeExternalUrl(profile.cvUrl) : '';

  return (
    <footer className="border-t border-slate-400/15 bg-[#050816] py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <p className="font-display text-sm font-semibold text-[#F8FAFC]">
            KLARENCY · {profile.ownerName}
          </p>
          <p className="mt-1 text-xs text-[#94A3B8]">
            {profile.tagline} · {new Date().getFullYear()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-[#94A3B8]">
          <button
            type="button"
            onClick={onOpenSearch}
            className="inline-flex min-h-[36px] items-center gap-1.5 text-[#94A3B8] hover:text-[#F8FAFC]"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Search Portfolio</span>
          </button>

          {cvUrl && (
            <a
              href={cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#F8FAFC]"
            >
              Download CV
            </a>
          )}
          {github && (
            <a href={github} target="_blank" rel="noopener noreferrer" className="hover:text-[#F8FAFC]">
              GitHub
            </a>
          )}
          {linkedin && (
            <a href={linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-[#F8FAFC]">
              LinkedIn
            </a>
          )}
          {xUrl && (
            <a href={xUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#F8FAFC]">
              X
            </a>
          )}

          <Link to="/admin" className="text-[#22D3EE] hover:underline">
            Owner Studio
          </Link>
        </div>
      </div>
    </footer>
  );
}
