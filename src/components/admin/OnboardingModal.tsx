import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';

const ONBOARDING_STEPS = [
  {
    title: '1. Your Owner Studio Dashboard',
    body: 'Track profile completeness, project states, unread visitor inquiries, and live cloud synchronization at a glance from your phone or computer.',
  },
  {
    title: '2. Editing Profile & CV',
    body: 'Update your biography, social links, portrait photo, and CV PDF inside Profile & CV. You can toggle public CV downloads on or off anytime.',
  },
  {
    title: '3. Guided 9-Step Project Creation',
    body: 'Add new engineering work step-by-step without writing code. Progress is saved locally in your browser so intermittent mobile data never erases your work.',
  },
  {
    title: '4. Phone-First Photo Uploads',
    body: 'Select screenshots or hardware photos directly from your Android or iPhone gallery. KLARENCY resizes images and strips EXIF metadata before uploading.',
  },
  {
    title: '5. Drafts, Previews & Publishing',
    body: 'Drafts remain strictly private under Firestore Security Rules. Preview how a project looks publicly before clicking Publish, or archive/restore entries anytime.',
  },
  {
    title: '6. Managing Contact Messages',
    body: 'Visitor messages are private to you. Read inquiries, mark them read or archived, and reply directly from the Messages inbox.',
  },
];

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingModal({ open, onComplete, onSkip }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  if (!open) return null;

  const current = ONBOARDING_STEPS[step];
  const isLast = step === ONBOARDING_STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#050816]/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-400/20 bg-[#080D1C] p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-[#22D3EE]">
              Guide · Step {step + 1} of {ONBOARDING_STEPS.length}
            </p>
            <h2
              id="onboarding-title"
              className="mt-1.5 font-display text-xl font-semibold text-[#F8FAFC]"
            >
              {current.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onSkip}
            aria-label="Skip onboarding guide"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#101A2E] hover:text-[#F8FAFC]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-[#94A3B8]">{current.body}</p>

        <div className="mt-6 flex items-center gap-1.5">
          {ONBOARDING_STEPS.map((s, idx) => (
            <span
              key={s.title}
              className={`h-1.5 flex-1 rounded-full ${
                idx <= step ? 'bg-[#22D3EE]' : 'bg-slate-400/20'
              }`}
            />
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-400/15 pt-5">
          <button
            type="button"
            onClick={onSkip}
            className="min-h-[44px] px-3 text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC]"
          >
            Skip for now
          </button>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-slate-400/20 px-4 py-2 text-xs font-medium text-[#F8FAFC] hover:bg-[#101A2E]"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <span>Back</span>
              </button>
            )}

            {isLast ? (
              <button
                type="button"
                onClick={onComplete}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>Finish Guide</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
