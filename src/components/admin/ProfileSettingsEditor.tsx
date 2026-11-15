import { Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSyncStatus } from '../../context/SyncStatusContext';
import { savePrivateSettings, savePublicProfile } from '../../services/portfolioService';
import type { PrivateSettings, PublicProfile } from '../../types/portfolio';
import { publicProfileSchema } from '../../utils/validation';
import { MediaUploadField } from './MediaUploadField';

interface ProfileSettingsEditorProps {
  profile: PublicProfile;
  privateSettings: PrivateSettings;
}

export function ProfileSettingsEditor({
  profile,
  privateSettings,
}: ProfileSettingsEditorProps) {
  const { setSaving, setSaved, setUnsaved, setSyncError, isOnline } = useSyncStatus();
  const [form, setForm] = useState<PublicProfile>(profile);
  const [settings, setSettings] = useState<PrivateSettings>(privateSettings);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  useEffect(() => {
    setSettings(privateSettings);
  }, [privateSettings]);

  const updateProfile = <K extends keyof PublicProfile>(key: K, value: PublicProfile[K]) => {
    setError(null);
    setSavedNotice(null);
    setUnsaved(true);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedNotice(null);

    const parsed = publicProfileSchema.safeParse({
      ownerName: form.ownerName,
      headline: form.headline,
      tagline: form.tagline,
      location: form.location,
      shortBio: form.shortBio,
      expandedBio: form.expandedBio ?? '',
      availabilityNote: form.availabilityNote ?? '',
      portraitUrl: form.portraitUrl ?? '',
      githubUrl: form.githubUrl ?? '',
      linkedinUrl: form.linkedinUrl ?? '',
      xUrl: form.xUrl ?? '',
      publicEmail: form.publicEmail ?? '',
      cvUrl: form.cvUrl ?? '',
      cvFileName: form.cvFileName ?? '',
      cvEnabled: form.cvEnabled,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Please check your profile inputs.');
      return;
    }

    if (!isOnline) {
      setError('You are offline. Reconnect to save profile changes to Cloud Firestore.');
      return;
    }

    setSubmitting(true);
    setSaving();
    try {
      await savePublicProfile(parsed.data);
      await savePrivateSettings(settings);
      setSaved();
      setSavedNotice('Public profile, CV configuration, and settings saved to cloud.');
    } catch {
      setSyncError();
      setError('Failed to save changes to Cloud Firestore. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSaveAll} className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-400/15 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F8FAFC]">
            Profile, CV & Site Settings
          </h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Manage your public portfolio identity, biography, portrait, CV download, and links.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          <span>{submitting ? 'Saving…' : 'Save Changes'}</span>
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}
      {savedNotice && (
        <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-sm text-emerald-200">
          {savedNotice}
        </div>
      )}

      <section className="kl-surface space-y-5 rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">Identity & Bio</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="prof-name" className="block text-xs font-medium text-[#F8FAFC]">
              Full name
            </label>
            <input
              id="prof-name"
              type="text"
              value={form.ownerName}
              onChange={(e) => updateProfile('ownerName', e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
            />
          </div>
          <div>
            <label htmlFor="prof-location" className="block text-xs font-medium text-[#F8FAFC]">
              Location & audience
            </label>
            <input
              id="prof-location"
              type="text"
              value={form.location}
              onChange={(e) => updateProfile('location', e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="prof-headline" className="block text-xs font-medium text-[#F8FAFC]">
              Professional identity
            </label>
            <input
              id="prof-headline"
              type="text"
              value={form.headline}
              onChange={(e) => updateProfile('headline', e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
            />
          </div>
          <div>
            <label htmlFor="prof-tagline" className="block text-xs font-medium text-[#F8FAFC]">
              Tagline
            </label>
            <input
              id="prof-tagline"
              type="text"
              value={form.tagline}
              onChange={(e) => updateProfile('tagline', e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="prof-short-bio" className="block text-xs font-medium text-[#F8FAFC]">
            Primary biography
          </label>
          <textarea
            id="prof-short-bio"
            rows={4}
            value={form.shortBio}
            onChange={(e) => updateProfile('shortBio', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-400/20 bg-[#050816] p-3.5 text-sm text-[#F8FAFC]"
          />
        </div>

        <div>
          <label htmlFor="prof-exp-bio" className="block text-xs font-medium text-[#F8FAFC]">
            Expandable engineering perspective (optional)
          </label>
          <textarea
            id="prof-exp-bio"
            rows={4}
            value={form.expandedBio ?? ''}
            onChange={(e) => updateProfile('expandedBio', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-400/20 bg-[#050816] p-3.5 text-sm text-[#F8FAFC]"
          />
        </div>

        <div>
          <label htmlFor="prof-avail" className="block text-xs font-medium text-[#F8FAFC]">
            Availability note
          </label>
          <input
            id="prof-avail"
            type="text"
            value={form.availabilityNote ?? ''}
            onChange={(e) => updateProfile('availabilityNote', e.target.value)}
            className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
          />
        </div>

        <MediaUploadField
          label="Owner portrait photo (optional)"
          helperText="Upload a real photograph from your device. When empty, the homepage renders an architectural visual without fabricating a portrait."
          folder="images"
          value={form.portraitUrl ?? ''}
          onChange={(url) => updateProfile('portraitUrl', url)}
        />
      </section>

      <section className="kl-surface space-y-5 rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">
          Curriculum Vitae (PDF)
        </h2>

        <MediaUploadField
          label="Upload CV PDF"
          helperText="Upload your latest CV PDF. Visitors only see a download button when public availability is enabled below."
          folder="cv"
          value={form.cvUrl ?? ''}
          fileName={form.cvFileName}
          onChange={(url, name) => {
            updateProfile('cvUrl', url);
            updateProfile('cvFileName', name ?? '');
          }}
        />

        <label className="flex min-h-[44px] items-center gap-3 text-sm text-[#F8FAFC]">
          <input
            type="checkbox"
            checked={form.cvEnabled}
            onChange={(e) => updateProfile('cvEnabled', e.target.checked)}
            className="h-4 w-4 accent-[#2563EB]"
          />
          <span>Allow visitors on the public website to download my CV</span>
        </label>
      </section>

      <section className="kl-surface space-y-4 rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">Social Links</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="prof-gh" className="block text-xs font-medium text-[#F8FAFC]">
              GitHub URL
            </label>
            <input
              id="prof-gh"
              type="url"
              value={form.githubUrl ?? ''}
              onChange={(e) => updateProfile('githubUrl', e.target.value)}
              placeholder="https://github.com/..."
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
            />
          </div>
          <div>
            <label htmlFor="prof-li" className="block text-xs font-medium text-[#F8FAFC]">
              LinkedIn URL
            </label>
            <input
              id="prof-li"
              type="url"
              value={form.linkedinUrl ?? ''}
              onChange={(e) => updateProfile('linkedinUrl', e.target.value)}
              placeholder="https://linkedin.com/in/..."
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
            />
          </div>
          <div>
            <label htmlFor="prof-x" className="block text-xs font-medium text-[#F8FAFC]">
              X / Twitter URL
            </label>
            <input
              id="prof-x"
              type="url"
              value={form.xUrl ?? ''}
              onChange={(e) => updateProfile('xUrl', e.target.value)}
              placeholder="https://x.com/..."
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
            />
          </div>
        </div>
      </section>

      <section className="kl-surface space-y-4 rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">
          Private Workspace Notes
        </h2>
        <p className="text-xs text-[#94A3B8]">
          Stored inside /siteContent/privateSettings and strictly unreadable by public visitors.
        </p>
        <div>
          <label htmlFor="priv-sec" className="block text-xs font-medium text-[#F8FAFC]">
            Security note
          </label>
          <input
            id="priv-sec"
            type="text"
            value={settings.securityContactNote ?? ''}
            onChange={(e) => {
              setUnsaved(true);
              setSettings((prev) => ({ ...prev, securityContactNote: e.target.value }));
            }}
            className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC]"
          />
        </div>
      </section>
    </form>
  );
}
