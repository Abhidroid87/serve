'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CircleHelp, LoaderCircle, MapPin, MessageSquareText, PackageCheck, Printer, Star, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { createMarketplaceReview, deleteAddress, saveAddress, subscribeAddresses, subscribeCustomerOrders, subscribeCustomerRepairBookings, subscribeCustomerTickets } from '@/lib/marketplace-data';
import type { MarketplaceOrder, MarketplaceOrderStatus, SavedAddress, SupportTicket } from '@/lib/types';

type AccountTab = 'orders' | 'addresses' | 'support';

const statusCopy: Record<MarketplaceOrderStatus, string> = {
  pending: '🕒 Awaiting confirmation',
  accepted: '✅ Confirmed',
  preparing: '🍳 Preparing',
  ready: '📦 Ready',
  confirmed: '📅 Confirmed slot',
  in_progress: '🛠️ In progress',
  completed: '✅ Completed',
  cancelled: 'Cancelled',
};

function displayDate(value: MarketplaceOrder['createdAt'] | SupportTicket['createdAt']) {
  const date = typeof value === 'string' ? new Date(value) : value.toDate();
  return date.toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' });
}

function signedInState(
  user: ReturnType<typeof useAuth>['user'],
  setShowAuthModal: ReturnType<typeof useAuth>['setShowAuthModal'],
) {
  if (user) return null;
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
      <h2 className="text-xl font-bold">Sign in to your Kehi account</h2>
      <p className="mt-2 text-sm text-neutral-500">Your orders, addresses, and support requests are private to your account.</p>
      <button onClick={() => setShowAuthModal(true)} className="mt-5 rounded-xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white">Sign in</button>
    </div>
  );
}

export function CustomerAccount({ initialTab = 'orders' }: { initialTab?: AccountTab }) {
  const { user, loading: authLoading, setShowAuthModal } = useAuth();
  const [tab, setTab] = useState<AccountTab>(initialTab);
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [repairBookings, setRepairBookings] = useState<MarketplaceOrder[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [error, setError] = useState('');
  const [addressForm, setAddressForm] = useState({ label: 'Home' as SavedAddress['label'], address: '', city: 'Kathmandu' as SavedAddress['city'], landmark: '', phone: '' });
  const [savingAddress, setSavingAddress] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<MarketplaceOrder | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<MarketplaceOrder | null>(null);
  const [trackedOrderId, setTrackedOrderId] = useState('');
  const [now, setNow] = useState(Date.now());
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  useEffect(() => {
    if (!user) return;
    setError('');
    try {
      const stopOrders = subscribeCustomerOrders(user.uid, setOrders, (cause) => setError(cause.message));
      const stopBookings = subscribeCustomerRepairBookings(user.uid, setRepairBookings, (cause) => setError(cause.message));
      const stopTickets = subscribeCustomerTickets(user.uid, setTickets, (cause) => setError(cause.message));
      const stopAddresses = subscribeAddresses(user.uid, setAddresses, (cause) => setError(cause.message));
      return () => { stopOrders(); stopBookings(); stopTickets(); stopAddresses(); };
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load your account.');
    }
  }, [user]);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  const accountOrders = [...orders, ...repairBookings].sort((left, right) => {
    const toMillis = (value: MarketplaceOrder['createdAt']) => typeof value === 'string' ? new Date(value).getTime() : value.toMillis();
    return toMillis(right.createdAt) - toMillis(left.createdAt);
  });

  const addAddress = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingAddress(true);
    setError('');
    try {
      await saveAddress(addressForm);
      setAddressForm({ label: 'Home', address: '', city: 'Kathmandu', landmark: '', phone: '' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the address.');
    } finally {
      setSavingAddress(false);
    }
  };

  const submitReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reviewOrder) return;
    setSavingReview(true);
    setError('');
    try {
      await createMarketplaceReview({
        merchantId: reviewOrder.merchantId,
        customerName: user?.displayName || 'Customer',
        rating: reviewRating,
        comment: reviewText,
        orderId: reviewOrder.id,
      });
      setReviewOrder(null);
      setReviewText('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your review.');
    } finally {
      setSavingReview(false);
    }
  };

  const signedOut = signedInState(user, setShowAuthModal);
  return (
    <main className="min-h-screen bg-[#fafaf8] px-4 py-8 text-neutral-900 sm:px-6">
      <div className="mx-auto max-w-5xl print:hidden">
        <Link href="/" className="text-sm font-semibold text-neutral-500 hover:text-neutral-900">← Marketplace</Link>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-800">Your Kehi</p><h1 className="mt-1 text-3xl font-bold">Account center</h1><p className="mt-2 text-sm text-neutral-500">{user ? `Signed in as ${user.email || user.displayName || 'customer'}` : 'Manage your orders, addresses, and support.'}</p></div>
          <Link href="/support/" className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold"><CircleHelp className="h-4 w-4" />Contact support</Link>
        </div>

        <div className="mt-7 flex gap-2 overflow-x-auto border-b border-neutral-200">
          {([['orders', 'Orders & bookings'], ['addresses', 'Saved addresses'], ['support', 'Support tickets']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold ${tab === id ? 'border-emerald-800 text-emerald-900' : 'border-transparent text-neutral-500'}`}>{label}{id === 'support' && tickets.length > 0 ? ` (${tickets.length})` : ''}</button>
          ))}
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {authLoading ? <div className="py-16 text-center"><LoaderCircle className="mx-auto h-6 w-6 animate-spin" /></div> : signedOut ? <div className="mt-6">{signedOut}</div> : (
          <div className="mt-6">
            {tab === 'orders' && (
              <section className="space-y-4">
                {!accountOrders.length && <EmptyState icon={<PackageCheck />} title="No marketplace orders yet" detail="Orders and bookings from Kehi businesses will appear here." />}
                {accountOrders.map((order) => (
                  <article key={order.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><p className="font-bold">{order.merchantName}</p><p className="mt-1 text-xs text-neutral-500">{order.orderId} · {displayDate(order.createdAt)}</p></div>
                      <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold">{statusCopy[order.status] || order.status}</span>
                    </div>
                    {order.items?.map((item) => <p key={item.id} className="mt-3 text-sm text-neutral-600">{item.qty} × {item.name} · NPR {(item.price * item.qty).toLocaleString('en-IN')}</p>)}
                    {order.serviceSelected && <p className="mt-3 text-sm text-neutral-600">{order.serviceSelected}{order.bookingDate ? ` · ${order.bookingDate} ${order.timeSlot || ''}` : ''}</p>}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
                      <p className="font-bold">NPR {order.totalAmount.toLocaleString('en-IN')} <span className="text-xs font-normal text-neutral-500">· {order.paymentMethod}</span></p>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setReceiptOrder(order)} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold"><Printer className="h-3.5 w-3.5" />Receipt / bill</button>
                        <Link href={`/support/?orderId=${encodeURIComponent(order.id)}`} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold"><CircleHelp className="h-3.5 w-3.5" />Need help?</Link>
                        {!['completed', 'cancelled'].includes(order.status) && <button onClick={() => setTrackedOrderId((current) => current === order.id ? '' : order.id)} className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold">{trackedOrderId === order.id ? 'Close tracker' : 'Open Status Tracker'}</button>}
                        {order.status === 'completed' && order.businessType !== 'home_service' && <button onClick={() => setReviewOrder(order)} className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white"><Star className="h-3.5 w-3.5" />Rate & review</button>}
                      </div>
                    </div>
                    {trackedOrderId === order.id && <div className="mt-4 rounded-xl bg-neutral-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">Live status · {statusCopy[order.status] || order.status}</p><p className="text-xs text-neutral-500">{order.status === 'pending' ? 'Waiting for merchant confirmation' : order.status === 'ready' ? 'Ready for pickup / dispatch' : order.bookingDate ? `Scheduled for ${order.bookingDate}${order.timeSlot ? ` · ${order.timeSlot}` : ''}` : `Estimated ${Math.max(0, Math.ceil((new Date(typeof order.createdAt === 'string' ? order.createdAt : order.createdAt.toDate()).getTime() + 35 * 60_000 - now) / 60_000))} min remaining`}</p></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-200"><div className={`h-full rounded-full bg-emerald-700 transition-all ${order.status === 'pending' ? 'w-1/4' : order.status === 'accepted' || order.status === 'confirmed' ? 'w-1/2' : order.status === 'preparing' || order.status === 'in_progress' ? 'w-3/4' : 'w-full'}`} /></div></div>}
                  </article>
                ))}
              </section>
            )}

            {tab === 'addresses' && (
              <section className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
                <form onSubmit={(event) => void addAddress(event)} className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5">
                  <h2 className="font-bold">Add a delivery address</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-semibold">Label<select value={addressForm.label} onChange={(event) => setAddressForm({ ...addressForm, label: event.target.value as SavedAddress['label'] })} className="mt-1 block h-10 w-full rounded-lg border border-neutral-200 px-2 text-sm"><option>Home</option><option>Office</option><option>Other</option></select></label>
                    <label className="text-xs font-semibold">City<select value={addressForm.city} onChange={(event) => setAddressForm({ ...addressForm, city: event.target.value as SavedAddress['city'] })} className="mt-1 block h-10 w-full rounded-lg border border-neutral-200 px-2 text-sm"><option>Kathmandu</option><option>Lalitpur</option><option>Pokhara</option></select></label>
                  </div>
                  <label className="block text-xs font-semibold">Tole / full address<input required value={addressForm.address} onChange={(event) => setAddressForm({ ...addressForm, address: event.target.value })} className="mt-1 block h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm" /></label>
                  <label className="block text-xs font-semibold">Landmark<input value={addressForm.landmark} onChange={(event) => setAddressForm({ ...addressForm, landmark: event.target.value })} className="mt-1 block h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm" /></label>
                  <label className="block text-xs font-semibold">Phone<input required type="tel" value={addressForm.phone} onChange={(event) => setAddressForm({ ...addressForm, phone: event.target.value })} className="mt-1 block h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm" /></label>
                  <button disabled={savingAddress} className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{savingAddress ? 'Saving…' : 'Save address'}</button>
                </form>
                <div className="space-y-3">
                  {!addresses.length && <EmptyState icon={<MapPin />} title="No saved addresses" detail="Add an address for faster checkout." />}
                  {addresses.map((address) => <article key={address.id} className="flex items-start justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4"><div><p className="font-semibold">{address.label} · {address.city}</p><p className="mt-1 text-sm text-neutral-600">{address.address}</p><p className="text-xs text-neutral-500">{[address.landmark, address.phone].filter(Boolean).join(' · ')}</p></div><button aria-label={`Delete ${address.label} address`} onClick={() => void deleteAddress(address.id).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not delete address.'))} className="rounded-lg p-2 text-neutral-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></article>)}
                </div>
              </section>
            )}

            {tab === 'support' && (
              <section className="space-y-3">
                {!tickets.length && <EmptyState icon={<MessageSquareText />} title="No support tickets" detail="If you need help, open a request and the Kehi team can follow up." />}
                {tickets.map((ticket) => <article key={ticket.id} className="rounded-2xl border border-neutral-200 bg-white p-4"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-semibold">{ticket.subject}</p><p className="mt-1 text-xs text-neutral-500">#{ticket.ticketId} · {ticket.category} · {displayDate(ticket.createdAt)}</p></div><span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold capitalize">{ticket.status.replace('_', ' ')}</span></div><p className="mt-3 text-sm text-neutral-600">{ticket.chatLogs[0]?.message}</p></article>)}
                <Link href="/support/" className="inline-flex rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white">Open a support ticket</Link>
              </section>
            )}
          </div>
        )}
      </div>

      {reviewOrder && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form onSubmit={(event) => void submitReview(event)} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6">
            <h2 className="text-xl font-bold">Review {reviewOrder.merchantName}</h2>
            <div className="flex gap-1" aria-label={`${reviewRating} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" onClick={() => setReviewRating(rating)} aria-label={`${rating} stars`} className={`p-1 ${rating <= reviewRating ? 'text-amber-500' : 'text-neutral-300'}`}><Star className="h-7 w-7 fill-current" /></button>)}
            </div>
            <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} maxLength={2000} rows={4} placeholder="Share details about your experience" className="w-full rounded-xl border border-neutral-200 p-3 text-sm" />
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setReviewOrder(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={savingReview} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">{savingReview ? 'Saving…' : 'Submit review'}</button></div>
          </form>
        </div>
      )}

      {receiptOrder && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 print:static print:block print:bg-white print:p-0">
          <section aria-labelledby="receipt-heading" className="w-full max-w-lg rounded-2xl bg-white p-6 print:max-w-none print:rounded-none print:p-0">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-800">Kehi · Receipt</p><h2 id="receipt-heading" className="mt-2 text-2xl font-bold">{receiptOrder.merchantName}</h2><p className="mt-1 text-sm text-neutral-500">{receiptOrder.orderId} · {displayDate(receiptOrder.createdAt)}</p></div><button onClick={() => setReceiptOrder(null)} aria-label="Close receipt" className="rounded-lg border px-3 py-2 text-sm print:hidden">Close</button></div>
            <div className="my-5 border-y border-dashed border-neutral-300 py-4">
              {receiptOrder.items?.map((item) => <div key={item.id} className="flex justify-between gap-3 py-1.5 text-sm"><span>{item.qty} × {item.name}{item.unit ? ` (${item.unit})` : ''}</span><span>NPR {(item.qty * item.price).toLocaleString('en-IN')}</span></div>)}
              {receiptOrder.serviceSelected && <div className="flex justify-between gap-3 py-1.5 text-sm"><span>{receiptOrder.serviceSelected}</span><span>NPR {receiptOrder.totalAmount.toLocaleString('en-IN')}</span></div>}
            </div>
            <p className="flex justify-between font-bold"><span>Total · {receiptOrder.paymentMethod}</span><span>NPR {receiptOrder.totalAmount.toLocaleString('en-IN')}</span></p>
            <p className="mt-4 text-xs text-neutral-500">Receipt preview. No payment was collected by Kehi.</p>
            <button onClick={() => window.print()} className="mt-5 w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white print:hidden"><Printer className="mr-2 inline h-4 w-4" />Print / Download</button>
          </section>
        </div>
      )}
    </main>
  );
}

function EmptyState({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center"><div className="mx-auto w-fit text-neutral-400">{icon}</div><p className="mt-3 font-semibold">{title}</p><p className="mt-1 text-sm text-neutral-500">{detail}</p></div>;
}
