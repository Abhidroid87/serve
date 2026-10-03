'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CircleCheck, LoaderCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { createSupportTicket, subscribeCustomerOrders } from '@/lib/marketplace-data';
import { isFirebaseConfigured } from '@/lib/firebase';
import type { MarketplaceOrder, SupportTicketCategory } from '@/lib/types';

const issueTypes: SupportTicketCategory[] = ['Missing item', 'Delay', 'Cancel request', 'Overcharged', 'Quality issue'];

export default function SupportPage() {
  const { user, setShowAuthModal } = useAuth();
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [orderId, setOrderId] = useState('');
  const [category, setCategory] = useState<SupportTicketCategory>('Missing item');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState<{ id: string; ticketId: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOrderId(new URLSearchParams(window.location.search).get('orderId') || '');
  }, []);

  useEffect(() => {
    if (!user || !isFirebaseConfigured()) return;
    try {
      return subscribeCustomerOrders(user.uid, setOrders, (cause) => setError(cause.message));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load your orders.');
    }
  }, [user]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      setError('Sign in before submitting a support request.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const created = await createSupportTicket({ orderId: orderId || undefined, subject, category, userPhone: phone, message });
      setTicket({ id: created.id, ticketId: created.ticketId });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the support request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fafaf8] px-4 py-10 text-neutral-900">
      <div className="mx-auto max-w-2xl">
        <Link href="/account/" className="text-sm font-semibold text-neutral-500">← Your account</Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-widest text-emerald-800">Kehi support</p>
        <h1 className="mt-2 text-3xl font-bold">How can we help?</h1>
        <p className="mt-2 text-sm text-neutral-500">Tell us what happened. Your request will be visible to the support team.</p>

        {ticket ? (
          <section className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <CircleCheck className="h-8 w-8 text-emerald-800" />
            <h2 className="mt-3 text-xl font-bold">Support request received</h2>
            <p className="mt-1 text-sm">Ticket <strong>#{ticket.ticketId}</strong> has been saved.</p>
            <Link href="/account/" className="mt-4 inline-block font-semibold underline">View your support tickets</Link>
            <a href={`https://wa.me/?text=${encodeURIComponent(`Hi Kehi Support, I need urgent help with ticket ${ticket.ticketId}.`)}`} target="_blank" rel="noreferrer" className="mt-3 block text-sm font-semibold text-emerald-900 underline">Urgent? Chat with Kehi Support on WhatsApp</a>
          </section>
        ) : (
          <form onSubmit={(event) => void submit(event)} className="mt-7 space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7">
            {!user && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Sign in is required so you can follow your ticket.</div>}
            <label className="block text-sm font-semibold">Related order
              <select value={orderId} onChange={(event) => setOrderId(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm">
                <option value="">General inquiry</option>
                {orders.map((order) => <option key={order.id} value={order.id}>{order.orderId} · {order.merchantName}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">Issue type
              <select value={category} onChange={(event) => setCategory(event.target.value as SupportTicketCategory)} className="mt-1.5 h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm">{issueTypes.map((issue) => <option key={issue}>{issue}</option>)}</select>
            </label>
            <label className="block text-sm font-semibold">Subject<input required maxLength={160} value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm" /></label>
            <label className="block text-sm font-semibold">Phone number<input required type="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm" /></label>
            <label className="block text-sm font-semibold">What happened?<textarea required maxLength={4000} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-1.5 w-full rounded-lg border border-neutral-200 p-3 text-sm" /></label>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-neutral-900 px-5 text-sm font-bold text-white disabled:opacity-60">{saving && <LoaderCircle className="h-4 w-4 animate-spin" />}Submit support request</button>
          </form>
        )}
      </div>
    </main>
  );
}
