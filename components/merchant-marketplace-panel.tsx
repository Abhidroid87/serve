'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Check, LoaderCircle, Plus, Trash2, Upload } from 'lucide-react';
import {
  deleteMerchantCatalogImage, deleteMerchantCatalogItem, replyToMarketplaceReview, saveMerchantCatalogItem,
  subscribeMerchantCatalog, subscribeMerchantOrders, subscribeMerchantReviews, updateMarketplaceOrderStatus,
  uploadMerchantCatalogImage,
} from '@/lib/marketplace-data';
import type { MarketplaceOrder, MarketplaceOrderStatus, MarketplaceReview, MerchantCatalogItem } from '@/lib/types';

function useMerchantOrders(merchantId: string) {
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    try {
      return subscribeMerchantOrders(merchantId, setOrders, (cause) => setError(cause.message));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load orders.');
    }
  }, [merchantId]);
  return { orders, error, setError };
}

export function MerchantOrdersPanel({ merchantId }: { merchantId: string }) {
  const { orders, error, setError } = useMerchantOrders(merchantId);
  const [busy, setBusy] = useState('');
  const advance = (order: MarketplaceOrder): MarketplaceOrderStatus | null => {
    if (order.status === 'pending') return 'accepted';
    if (order.status === 'accepted') {
      if (order.businessType === 'home_service') return 'in_progress';
      return order.businessType === 'salon_spa' || order.businessType === 'dining' || order.businessType === 'fitness_activity' ? 'confirmed' : 'preparing';
    }
    if (order.status === 'preparing') return 'ready';
    if (order.status === 'ready') return 'completed';
    if (order.status === 'confirmed' && order.businessType !== 'home_service') return 'in_progress';
    if (order.status === 'in_progress' && order.businessType !== 'home_service') return 'completed';
    return null;
  };
  const label: Record<string, string> = { pending: 'Accept', accepted: 'Start preparing / confirm', confirmed: 'Start appointment', preparing: 'Mark ready', ready: 'Mark completed', in_progress: 'Complete appointment' };
  const move = async (order: MarketplaceOrder) => {
    const next = advance(order);
    if (!next) return;
    setBusy(order.id);
    setError('');
    try { await updateMarketplaceOrderStatus(order.id, next); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update order status.'); }
    finally { setBusy(''); }
  };

  return (
    <section className="space-y-3">
      <div><h2 className="text-lg font-semibold">Live marketplace orders</h2><p className="text-sm text-muted-foreground">Updates appear here as customers place orders and bookings.</p></div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {!orders.length && !error && <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No marketplace orders yet.</p>}
      {orders.map((order) => <article key={order.id} className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-semibold">{order.orderId} · {order.customerName}</h3><p className="mt-1 text-xs text-muted-foreground">{order.customerPhone} · {order.businessType.replace('_', ' ')}</p></div><span className="h-fit rounded-full bg-secondary px-3 py-1 text-xs font-semibold capitalize">{order.status.replace('_', ' ')}</span></div>
        {order.items?.map((item) => <p key={item.id} className="mt-2 text-sm text-muted-foreground">{item.qty} × {item.name} · NPR {(item.price * item.qty).toLocaleString('en-IN')}</p>)}
        {order.serviceSelected && <p className="mt-2 text-sm text-muted-foreground">{order.serviceSelected}{order.bookingDate ? ` · ${order.bookingDate} ${order.timeSlot || ''}` : ''}{order.stylist ? ` · ${order.stylist}` : ''}</p>}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3"><span className="font-bold">NPR {order.totalAmount.toLocaleString('en-IN')} · {order.paymentMethod}</span>{advance(order) && <button disabled={busy === order.id} onClick={() => void move(order)} className="rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background disabled:opacity-50">{busy === order.id ? 'Updating…' : label[order.status]}</button>}</div>
      </article>)}
    </section>
  );
}

export function MerchantReviewsPanel({ merchantId }: { merchantId: string }) {
  const [reviews, setReviews] = useState<MarketplaceReview[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  useEffect(() => {
    try {
      return subscribeMerchantReviews(merchantId, setReviews, (cause) => setError(cause.message));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load reviews.');
    }
  }, [merchantId]);
  const submitReply = async (review: MarketplaceReview) => {
    setBusy(review.id);
    setError('');
    try {
      await replyToMarketplaceReview(review.id, drafts[review.id] || '');
      setDrafts((current) => ({ ...current, [review.id]: '' }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save reply.');
    } finally {
      setBusy('');
    }
  };
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Customer reviews</h2>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {!reviews.length && !error && <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No customer reviews yet.</p>}
      {reviews.map((review) => <article key={review.id} className="rounded-xl border border-border p-4"><p className="font-semibold">{review.customerName} <span className="ml-2 text-amber-600">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span></p><p className="mt-2 text-sm text-muted-foreground">{review.comment || 'No written comment.'}</p>{review.merchantReply ? <p className="mt-3 rounded-lg bg-secondary p-3 text-sm"><strong>Your reply: </strong>{review.merchantReply}</p> : <div className="mt-3 flex gap-2"><input maxLength={2000} value={drafts[review.id] || ''} onChange={(event) => setDrafts((current) => ({ ...current, [review.id]: event.target.value }))} placeholder="Reply to this review" className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm" /><button disabled={busy === review.id || !drafts[review.id]?.trim()} onClick={() => void submitReply(review)} className="rounded-lg bg-foreground px-4 text-xs font-semibold text-background disabled:opacity-50">{busy === review.id ? 'Saving…' : 'Reply'}</button></div>}</article>)}
    </section>
  );
}

export function MerchantCatalogPanel({ merchantId }: { merchantId: string }) {
  const [items, setItems] = useState<MerchantCatalogItem[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<MerchantCatalogItem | null>(null);
  const [form, setForm] = useState({ title: '', description: '', price: '', imageUrl: '', inStock: true });
  useEffect(() => {
    try {
      return subscribeMerchantCatalog(merchantId, setItems, (cause) => setError(cause.message));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load catalog.');
    }
  }, [merchantId]);

  const edit = (item: MerchantCatalogItem) => {
    setEditing(item);
    setForm({ title: item.title, description: item.description, price: String(item.price), imageUrl: item.imageUrl, inStock: item.inStock });
  };
  const reset = () => {
    setEditing(null);
    setForm({ title: '', description: '', price: '', imageUrl: '', inStock: true });
  };
  const upload = async (file?: File) => {
    if (!file) return;
    setSaving(true);
    setError('');
    try {
      setForm((current) => ({ ...current, imageUrl: '' }));
      const imageUrl = await uploadMerchantCatalogImage(file);
      setForm((current) => ({ ...current, imageUrl }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not upload the image.');
    } finally {
      setSaving(false);
    }
  };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await saveMerchantCatalogItem({ id: editing?.id, ...form, price: Number(form.price) });
      reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this catalog item.');
    } finally {
      setSaving(false);
    }
  };
  const remove = async (item: MerchantCatalogItem) => {
    setError('');
    try {
      await deleteMerchantCatalogItem(item.id);
      if (item.imageUrl) {
        try { await deleteMerchantCatalogImage(item.imageUrl); }
        catch (cause) { setError(cause instanceof Error ? `Item removed, but its image could not be deleted: ${cause.message}` : 'Item removed, but image cleanup failed.'); }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete this item.');
    }
  };

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
      <div className="space-y-3">
        <div><h2 className="text-lg font-semibold">Products & dishes</h2><p className="text-sm text-muted-foreground">Catalog changes are saved to your merchant account.</p></div>
        {items.map((item) => <article key={item.id} className="flex gap-3 rounded-xl border border-border bg-card p-3">
          {item.imageUrl ? <Image src={item.imageUrl} alt="" width={72} height={72} unoptimized className="h-[72px] w-[72px] rounded-lg object-cover" /> : <div className="grid h-[72px] w-[72px] place-items-center rounded-lg bg-secondary"><ShoppingBagIcon /></div>}
          <div className="min-w-0 flex-1"><p className="truncate font-semibold">{item.title}</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p><p className="mt-2 text-xs font-semibold">NPR {item.price.toLocaleString('en-IN')} · {item.inStock ? 'In stock' : 'Out of stock'}</p></div>
          <div className="flex flex-col gap-1"><button onClick={() => edit(item)} className="rounded border border-border px-2 py-1 text-xs">Edit</button><button onClick={() => void remove(item)} aria-label={`Delete ${item.title}`} className="rounded p-1 text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div>
        </article>)}
      </div>
      <form onSubmit={(event) => void submit(event)} className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold">{editing ? 'Edit item' : 'Add a product or dish'}</h3>
        <label className="block text-xs font-semibold">Title<input required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-1 block h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
        <label className="block text-xs font-semibold">Price (NPR)<input required type="number" min="0" step="1" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="mt-1 block h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
        <label className="block text-xs font-semibold">Description<textarea maxLength={2000} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1 block w-full rounded-lg border border-border bg-background p-3 text-sm" /></label>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm"><Upload className="h-4 w-4" />{form.imageUrl ? 'Image uploaded' : 'Upload photo (max 5 MB)'}<input type="file" accept="image/*" className="sr-only" onChange={(event) => void upload(event.target.files?.[0])} /></label>
        {form.imageUrl && <div className="flex items-center gap-2 text-xs text-emerald-800"><Check className="h-4 w-4" />Photo ready</div>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.inStock} onChange={(event) => setForm({ ...form, inStock: event.target.checked })} />In stock / available</label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex gap-2"><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-50">{saving && <LoaderCircle className="h-4 w-4 animate-spin" />}{editing ? 'Save changes' : <><Plus className="h-4 w-4" />Add item</>}</button>{editing && <button type="button" onClick={reset} className="rounded-lg border border-border px-4 py-2.5 text-sm">Cancel</button>}</div>
      </form>
    </section>
  );
}

function ShoppingBagIcon() {
  return <span aria-hidden="true" className="text-muted-foreground">Item</span>;
}
