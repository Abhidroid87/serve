'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { hasAdminAccess } from '@/lib/data';
import { subscribeAdminTickets, updateSupportTicket } from '@/lib/marketplace-data';
import type { SupportTicket } from '@/lib/types';

export default function AdminTicketsPage() {
  const { user, loading: authLoading, setShowAuthModal } = useAuth();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setShowAuthModal(true);
      setChecking(false);
      return;
    }
    let active = true;
    hasAdminAccess(user.uid)
      .then((result) => { if (active) setAllowed(result); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not check admin permissions.'); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [authLoading, user, setShowAuthModal]);

  useEffect(() => {
    if (!allowed) return;
    try {
      return subscribeAdminTickets(setTickets, (cause) => setError(cause.message));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load support tickets.');
    }
  }, [allowed]);

  const updateTicket = async (ticket: SupportTicket, status: SupportTicket['status'], reply?: string) => {
    setBusy(ticket.id);
    setError('');
    try {
      await updateSupportTicket(ticket.id, status, reply);
      setDrafts((current) => ({ ...current, [ticket.id]: '' }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the support ticket.');
    } finally {
      setBusy('');
    }
  };

  if (checking || authLoading) return <main className="p-10 text-center">Checking administrator access…</main>;
  if (!user) return <main className="p-10 text-center">Sign in with an administrator account to continue.</main>;
  if (!allowed) return <main className="mx-auto max-w-xl p-10 text-center"><h1 className="text-xl font-bold">Access restricted</h1><p className="mt-2 text-sm text-neutral-600">This page requires Firebase administrator access.</p><Link className="mt-4 inline-block underline" href="/admin/">Return to admin</Link></main>;

  const sortedTickets = [...tickets].sort((a, b) => Number(a.status === 'resolved') - Number(b.status === 'resolved'));
  return (
    <main className="min-h-screen bg-[#080d12] px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><Link href="/admin/" className="text-sm text-slate-400 hover:text-white">← Admin control</Link><h1 className="mt-3 text-3xl font-bold">Support desk</h1><p className="mt-1 text-sm text-slate-400">{tickets.filter((ticket) => ticket.status !== 'resolved').length} open or in-progress tickets</p></div>
          <Link href="/admin/" className="rounded-lg border border-white/15 px-4 py-2 text-sm">Admin dashboard</Link>
        </div>
        {error && <p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
        <div className="mt-6 space-y-4">
          {sortedTickets.map((ticket) => (
            <article key={ticket.id} className="rounded-2xl border border-white/10 bg-[#0b1218] p-5">
              <div className="flex flex-wrap justify-between gap-3">
                <div><p className="font-semibold">{ticket.subject}</p><p className="mt-1 text-xs text-slate-400">#{ticket.ticketId} · {ticket.category} · {ticket.userPhone}{ticket.orderId ? ` · Order ${ticket.orderId}` : ''}</p></div>
                <span className="h-fit rounded-full bg-white/10 px-3 py-1 text-xs capitalize">{ticket.status.replace('_', ' ')}</span>
              </div>
              <div className="mt-4 space-y-2">{ticket.chatLogs.map((entry, index) => <p key={`${ticket.id}-${index}`} className={`rounded-lg p-3 text-sm ${entry.sender === 'admin' ? 'ml-6 bg-emerald-900/30' : 'mr-6 bg-white/5'}`}><strong className="capitalize">{entry.sender}: </strong>{entry.message}</p>)}</div>
              {ticket.status !== 'resolved' && <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <input value={drafts[ticket.id] || ''} onChange={(event) => setDrafts((current) => ({ ...current, [ticket.id]: event.target.value }))} maxLength={2000} placeholder="Write a reply…" className="h-10 rounded-lg border border-white/15 bg-[#080d12] px-3 text-sm" />
                <button disabled={busy === ticket.id || !drafts[ticket.id]?.trim()} onClick={() => void updateTicket(ticket, ticket.status, drafts[ticket.id])} className="rounded-lg bg-emerald-700 px-4 text-sm font-semibold disabled:opacity-50">{busy === ticket.id ? 'Saving…' : 'Reply'}</button>
                <button disabled={busy === ticket.id} onClick={() => void updateTicket(ticket, 'resolved')} className="rounded-lg border border-white/15 px-4 text-sm">Resolve</button>
                {ticket.status === 'open' && <button disabled={busy === ticket.id} onClick={() => void updateTicket(ticket, 'in_progress')} className="rounded-lg border border-white/15 px-4 py-2 text-sm sm:col-start-2">Mark in progress</button>}
              </div>}
            </article>
          ))}
          {!sortedTickets.length && <div className="rounded-2xl border border-dashed border-white/20 p-10 text-center text-sm text-slate-400">No support tickets yet.</div>}
        </div>
      </div>
    </main>
  );
}
