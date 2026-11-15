import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Send } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { submitContactMessage } from '../../services/portfolioService';
import { canSubmitContact } from '../../utils/portfolioLogic';
import { contactFormSchema, type ContactFormValues } from '../../utils/validation';

export function ContactSection() {
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lastSubmittedAtRef = useRef<number | null>(null);
  const lastPayloadHashRef = useRef<string>('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      senderName: '',
      senderEmail: '',
      subject: '',
      message: '',
    },
  });

  const onSubmit = async (values: ContactFormValues) => {
    setErrorMessage(null);

    const payloadKey = `${values.senderEmail.trim().toLowerCase()}::${values.subject.trim()}::${values.message.trim()}`;
    if (payloadKey === lastPayloadHashRef.current) {
      setErrorMessage('This exact message has already been submitted.');
      return;
    }

    const cooldown = canSubmitContact(lastSubmittedAtRef.current, Date.now(), 30_000);
    if (!cooldown.allowed) {
      setErrorMessage(`Please wait ${cooldown.waitSeconds} seconds before sending another message.`);
      return;
    }

    setSubmitState('submitting');
    try {
      await submitContactMessage(values);
      lastSubmittedAtRef.current = Date.now();
      lastPayloadHashRef.current = payloadKey;
      setSubmitState('success');
      reset();
    } catch {
      setSubmitState('error');
      setErrorMessage(
        'Could not send your message right now. Please check your connection and try again.',
      );
    }
  };

  return (
    <section id="contact" className="py-16 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-5">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-[#F8FAFC] sm:text-3xl">
            Get in Touch
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[#94A3B8] sm:text-base">
            Have an internship opportunity, software build, or engineering collaboration in mind?
            Send a direct message below—no account required.
          </p>

          <div className="mt-8 space-y-3 border-t border-slate-400/15 pt-6 text-sm text-[#94A3B8]">
            <p>
              <span className="font-medium text-[#F8FAFC]">Base:</span> Malawi (CAT / UTC+2)
            </p>
            <p>
              <span className="font-medium text-[#F8FAFC]">Privacy:</span> Messages are stored
              privately and visible only to the portfolio owner.
            </p>
          </div>
        </div>

        <div className="lg:col-span-7">
          {submitState === 'success' ? (
            <div
              role="status"
              className="kl-surface rounded-2xl p-8"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[#22D3EE]" aria-hidden="true" />
                <div>
                  <h3 className="font-display text-xl font-semibold text-[#F8FAFC]">
                    Message received
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
                    Thank you for reaching out. Your inquiry has been securely delivered to Clarence
                    L. Chilongo&apos;s private inbox.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmitState('idle')}
                    className="mt-5 min-h-[44px] rounded-lg border border-slate-400/25 px-4 py-2 text-sm font-medium text-[#F8FAFC] hover:bg-[#101A2E]"
                  >
                    Send another message
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="kl-surface space-y-5 rounded-2xl p-6 sm:p-8"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="contact-name"
                    className="block text-sm font-medium text-[#F8FAFC]"
                  >
                    Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    autoComplete="name"
                    {...register('senderName')}
                    className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/60 focus:border-[#22D3EE]"
                    placeholder="Your full name"
                  />
                  {errors.senderName && (
                    <p role="alert" className="mt-1.5 text-xs text-rose-400">
                      {errors.senderName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="contact-email"
                    className="block text-sm font-medium text-[#F8FAFC]"
                  >
                    Email address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    autoComplete="email"
                    {...register('senderEmail')}
                    className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/60 focus:border-[#22D3EE]"
                    placeholder="you@organization.com"
                  />
                  {errors.senderEmail && (
                    <p role="alert" className="mt-1.5 text-xs text-rose-400">
                      {errors.senderEmail.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="contact-subject"
                  className="block text-sm font-medium text-[#F8FAFC]"
                >
                  Subject
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  {...register('subject')}
                  className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3.5 text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/60 focus:border-[#22D3EE]"
                  placeholder="Internship, project inquiry, or collaboration"
                />
                {errors.subject && (
                  <p role="alert" className="mt-1.5 text-xs text-rose-400">
                    {errors.subject.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  className="block text-sm font-medium text-[#F8FAFC]"
                >
                  Message
                </label>
                <textarea
                  id="contact-message"
                  rows={5}
                  {...register('message')}
                  className="mt-1.5 w-full rounded-lg border border-slate-400/20 bg-[#050816] p-3.5 text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/60 focus:border-[#22D3EE]"
                  placeholder="Share details about your inquiry or project timeline..."
                />
                {errors.message && (
                  <p role="alert" className="mt-1.5 text-xs text-rose-400">
                    {errors.message.message}
                  </p>
                )}
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-lg border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-300"
                >
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={submitState === 'submitting'}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8] disabled:opacity-60 sm:w-auto"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                <span>{submitState === 'submitting' ? 'Sending message…' : 'Send Message'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
