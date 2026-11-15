import { Archive, Check, MailOpen, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useSyncStatus } from '../../context/SyncStatusContext';
import { deleteMessage, updateMessageStatus } from '../../services/portfolioService';
import type { ContactMessage, MessageStatus } from '../../types/portfolio';
import { formatMalawiTime } from '../../utils/portfolioLogic';

interface MessagesInboxProps {
  messages: ContactMessage[];
}

export function MessagesInbox({ messages }: MessagesInboxProps) {
  const { setSaving, setSaved, setSyncError } = useSyncStatus();
  const [filter, setFilter] = useState<'all' | MessageStatus>('all');
  const [confirmDelete, setConfirmDelete] = useState<ContactMessage | null>(null);

  const filtered = messages.filter((m) => (filter === 'all' ? true : m.status === filter));

  const handleStatus = async (id: string, status: MessageStatus) => {
    setSaving();
    try {
      await updateMessageStatus(id, status);
      setSaved();
    } catch {
      setSyncError();
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setSaving();
    try {
      await deleteMessage(confirmDelete.id);
      setSaved();
      setConfirmDelete(null);
    } catch {
      setSyncError();
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-400/15 pb-5">
        <h1 className="font-display text-2xl font-bold text-[#F8FAFC]">Contact Messages</h1>
        <p className="mt-1 text-sm text-[#94A3B8]">
          Private visitor inquiries protected by Firestore Security Rules.
        </p>
      </div>

      <div role="tablist" aria-label="Filter contact messages" className="flex flex-wrap gap-2">
        {(['all', 'unread', 'read', 'archived'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={filter === tab}
            onClick={() => setFilter(tab)}
            className={`min-h-[40px] rounded-lg px-3.5 py-2 text-xs font-medium capitalize ${
              filter === tab
                ? 'bg-[#2563EB] text-white'
                : 'border border-slate-400/20 bg-[#080D1C] text-[#94A3B8]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="kl-surface rounded-2xl p-10 text-center text-sm text-[#94A3B8]">
          No messages in this view.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((msg) => (
            <article key={msg.id} className="kl-surface rounded-2xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-400/15 pb-4">
                <div>
                  <p className="text-xs font-medium text-[#22D3EE]">
                    {msg.status.toUpperCase()} · {msg.senderName} ({msg.senderEmail})
                  </p>
                  <h2 className="mt-1 font-display text-lg font-semibold text-[#F8FAFC]">
                    {msg.subject}
                  </h2>
                </div>
                <span className="font-mono text-xs text-[#94A3B8] tabular-nums">
                  {formatMalawiTime(msg.createdAt) || 'Received'}
                </span>
              </div>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[#F8FAFC]/90">
                {msg.message}
              </p>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-400/15 pt-4">
                <a
                  href={`mailto:${encodeURIComponent(msg.senderEmail)}?subject=${encodeURIComponent(`Re: ${msg.subject}`)}`}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 text-xs font-semibold text-white"
                >
                  Reply via Email
                </a>

                {msg.status === 'unread' ? (
                  <button
                    type="button"
                    onClick={() => void handleStatus(msg.id, 'read')}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-400/20 px-3 text-xs text-[#F8FAFC]"
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Mark Read</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleStatus(msg.id, 'unread')}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-400/20 px-3 text-xs text-[#94A3B8]"
                  >
                    <MailOpen className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Mark Unread</span>
                  </button>
                )}

                {msg.status !== 'archived' && (
                  <button
                    type="button"
                    onClick={() => void handleStatus(msg.id, 'archived')}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-400/20 px-3 text-xs text-[#94A3B8]"
                  >
                    <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Archive</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setConfirmDelete(msg)}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-400/20 px-3 text-xs text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Delete</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delete message"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#050816]/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#080D1C] p-6">
            <h3 className="font-display text-lg font-semibold text-[#F8FAFC]">
              Delete this message?
            </h3>
            <p className="mt-2 text-sm text-[#94A3B8]">
              This permanently removes the message from {confirmDelete.senderName}. This action
              cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="min-h-[44px] rounded-lg border border-slate-400/20 px-4 text-xs text-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                className="min-h-[44px] rounded-lg bg-rose-600 px-4 text-xs font-semibold text-white"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
