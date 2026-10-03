'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { hasAdminAccess } from '@/lib/data';
import { subscribeAdminOrders, updateMarketplaceOrderStatus } from '@/lib/marketplace-data';
import type { MarketplaceOrder, MarketplaceOrderStatus } from '@/lib/types';

function orderDate(order: MarketplaceOrder) {
  const date = typeof order.createdAt === 'string' ? new Date(order.createdAt) : order.createdAt.toDate();
  return date.toLocaleString();
}

export default function AdminOrdersPage() {
  const { user, loading: authLoading, setShowAuthModal } = useAuth();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

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
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not check administrator access.'); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [authLoading, user, setShowAuthModal]);

  useEffect(() => {
    if (!allowed) return;
    try {
      return subscribeAdminOrders(setOrders, (cause) => setError(cause.message));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load orders.');
    }
  }, [allowed]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((order) => [order.orderId, order.customerPhone, order.customerName, order.merchantName].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [orders, search]);
  const activeCount = orders.filter((order) => !['completed', 'cancelled'].includes(order.status)).length;
  const gmv = orders.filter((order) => order.status !== 'cancelled').reduce((sum, order) => sum + order.totalAmount, 0);
  const merchantCount = new Set(orders.map((order) => order.merchantId)).size;

  const changeStatus = async (order: MarketplaceOrder, status: MarketplaceOrderStatus) => {
    setBusy(order.id);
    setError('');
    try { await updateMarketplaceOrderStatus(order.id, status); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update order status.'); }
    finally { setBusy(''); }
  };

  if (checking || authLoading) return <main className="p-10 text-center">Checking administrator access…</main>;
  if (!user || !allowed) return <main className="p-10 text-center"><p>Administrator access is required.</p><Link href="/admin/" className="mt-3 inline-block underline">Return to admin</Link></main>;

  return (
    <main className="min-h-screen bg-[#080d12] px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><Link href="/admin/" className="text-sm text-slate-400">← Admin control</Link><h1 className="mt-3 text-3xl font-bold">Order audit</h1></div><Link href="/admin/tickets/" className="rounded-lg border border-white/15 px-4 py-2 text-sm">Support desk</Link></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Metric label="Active orders" value={activeCount.toLocaleString()} />
          <Metric label="Recorded order GMV" value={`NPR ${gmv.toLocaleString('en-IN')}`} />
          <Metric label="Payment collection" value="Not connected" />
          <Metric label="Merchants with orders" value={merchantCount.toLocaleString()} />
        </div>
        {error && <p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
        <div className="mt-6 rounded-xl border border-white/10 bg-[#0b1218]">
          <div className="border-b border-white/10 p-4"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order ID, customer phone/name, or merchant" className="h-10 w-full rounded-lg border border-white/15 bg-[#080d12] px-3 text-sm" /></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase text-slate-400"><tr><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Merchant</th><th className="p-3">Type / payment</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3">Created</th></tr></thead>
              <tbody>{filtered.map((order) => <tr key={order.id} className="border-t border-white/10">
                <td className="p-3 font-mono text-xs">{order.orderId}</td>
                <td className="p-3">{order.customerName}<span className="block text-xs text-slate-400">{order.customerPhone}</span></td>
                <td className="p-3">{order.merchantName}</td>
                <td className="p-3 capitalize">{order.businessType.replace('_', ' ')}<span className="block text-xs text-slate-400">{order.paymentMethod}{order.escrowStatus ? ` · ${order.escrowStatus}` : ''}</span></td>
                <td className="p-3">NPR {order.totalAmount.toLocaleString('en-IN')}</td>
                <td className="p-3"><select aria-label={`Update status for ${order.orderId}`} disabled={busy === order.id} value={order.status} onChange={(event) => void changeStatus(order, event.target.value as MarketplaceOrderStatus)} className="rounded-lg border border-white/15 bg-[#080d12] px-2 py-1 text-xs">{(['pending', 'accepted', 'preparing', 'ready', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const).map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select></td>
                <td className="p-3 text-xs text-slate-400">{orderDate(order)}</td>
              </tr>)}</tbody>
            </table>
          </div>
          {!filtered.length && <p className="p-8 text-center text-sm text-slate-400">No orders match this search.</p>}
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <section className="rounded-xl border border-white/10 bg-[#0b1218] p-4"><p className="text-xs uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></section>;
}
