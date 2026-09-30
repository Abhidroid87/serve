'use client';

import { useEffect, useState } from 'react';
import { getIdTokenResult } from 'firebase/auth';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity, ArrowUpRight, BriefcaseBusiness, Check, ClipboardList,
  Clock3, FileSearch, LayoutDashboard, LoaderCircle, LogOut, RefreshCw,
  Search, ShieldAlert, Users, X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  assignBookingProvider, getAdminModerationData, updateProviderModeration,
  type AdminModerationData, type ModerationEnquiry,
} from '@/lib/data';
import { cn } from '@/lib/utils';

type Panel = 'overview' | 'approvals' | 'enquiries' | 'assignments';
type Access = 'checking' | 'signed-out' | 'denied' | 'allowed';

const navigation: { id: Panel; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'approvals', label: 'Provider queue', icon: Users },
  { id: 'enquiries', label: 'Enquiry log', icon: FileSearch },
  { id: 'assignments', label: 'Job routing', icon: BriefcaseBusiness },
];

export default function AdminPage() {
  const { user, loading: authLoading, setShowAuthModal, signOut } = useAuth();
  const [access, setAccess] = useState<Access>('checking');
  const [data, setData] = useState<AdminModerationData | null>(null);
  const [panel, setPanel] = useState<Panel>('overview');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | ModerationEnquiry['source']>('all');
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setAccess('signed-out');
      setLoading(false);
      return;
    }
    let active = true;
    setAccess('checking');
    getIdTokenResult(user, true)
      .then(async (token) => {
        if (!active) return;
        if (token.claims.admin !== true) {
          setAccess('denied');
          setLoading(false);
          return;
        }
        setAccess('allowed');
        const next = await getAdminModerationData();
        if (active) setData(next);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Could not load moderation data.');
        setAccess('allowed');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authLoading, user]);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getAdminModerationData());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not refresh moderation data.');
    } finally {
      setLoading(false);
    }
  };

  const moderateProvider = async (providerId: string, approved: boolean) => {
    setBusy(providerId);
    setError('');
    try {
      await updateProviderModeration(providerId, approved);
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not update provider status.');
    } finally {
      setBusy('');
    }
  };

  const assignJob = async (bookingId: string) => {
    const providerId = assignments[bookingId];
    if (!providerId) return;
    setBusy(bookingId);
    setError('');
    try {
      await assignBookingProvider(bookingId, providerId);
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not assign this job.');
    } finally {
      setBusy('');
    }
  };

  if (authLoading || access === 'checking') return <GateState label="Checking administrator access" />;
  if (access === 'signed-out') return (
    <GateState
      icon={<ShieldAlert className="h-6 w-6" />}
      title="Administrator sign-in required"
      label="Sign in with an account that has moderation access."
      action={() => setShowAuthModal(true)}
      actionLabel="Sign in"
    />
  );
  if (access === 'denied') return (
    <GateState
      icon={<ShieldAlert className="h-6 w-6" />}
      title="Access restricted"
      label="This account does not have the Firebase admin claim required for moderation."
      action={() => void signOut()}
      actionLabel="Sign out"
    />
  );

  const providers = data?.providers || [];
  const pendingProviders = providers.filter((provider) => !provider.is_verified && !(provider as typeof provider & { is_rejected?: boolean }).is_rejected);
  const activeBookings = (data?.bookings || []).filter((booking) => !['completed', 'cancelled'].includes(booking.status));
  const openRequests = (data?.requests || []).filter((request) => request.status === 'broadcasting');
  const filteredEnquiries = (data?.enquiries || []).filter((enquiry) => {
    const matchesSource = sourceFilter === 'all' || enquiry.source === sourceFilter;
    const text = `${enquiry.customerName} ${enquiry.customerPhone} ${enquiry.serviceName} ${enquiry.address}`.toLowerCase();
    return matchesSource && text.includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-[#080d12] text-slate-100">
      <div className="pointer-events-none fixed inset-0 opacity-[0.16]" style={{ backgroundImage: 'linear-gradient(rgba(99, 229, 200, .12) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 229, 200, .12) 1px, transparent 1px)', backgroundSize: '56px 56px', maskImage: 'linear-gradient(to bottom, black, transparent 82%)' }} />
      <div className="relative grid min-h-screen lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="border-b border-white/10 bg-[#0b1218]/90 px-5 py-5 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-emerald-300/30 bg-emerald-300/10 text-emerald-200"><Activity className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-semibold tracking-[0.16em]">KEHI / OPS</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-500">Moderation control</p>
            </div>
          </div>
          <div className="mt-8 flex items-center gap-2 border-y border-white/10 py-3 text-[11px] uppercase tracking-[0.16em] text-emerald-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" /> System live
          </div>
          <nav className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-1" aria-label="Admin sections">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => setPanel(item.id)} className={cn('flex h-10 items-center gap-3 border px-3 text-left text-sm transition-colors', panel === item.id ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100' : 'border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.03] hover:text-white')}>
                  <Icon className="h-4 w-4" /> {item.label}
                  {item.id === 'approvals' && pendingProviders.length > 0 && <span className="ml-auto text-xs text-emerald-200">{pendingProviders.length}</span>}
                </button>
              );
            })}
          </nav>
          <div className="mt-8 hidden border border-white/10 p-3 lg:block">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Signed in</p>
            <p className="mt-2 truncate text-xs text-slate-300">{user?.email}</p>
            <button onClick={() => void signOut()} className="mt-3 flex items-center gap-2 text-xs text-slate-500 transition-colors hover:text-white"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
          </div>
        </aside>

        <main className="min-w-0 px-4 pb-10 sm:px-7 lg:px-10">
          <header className="flex min-h-[76px] items-center justify-between border-b border-white/10">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Operations / {navigation.find((item) => item.id === panel)?.label}</p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{panel === 'overview' ? 'Control room' : navigation.find((item) => item.id === panel)?.label}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-slate-500 sm:inline">{user?.email}</span>
              <button aria-label="Refresh moderation data" title="Refresh" onClick={() => void refresh()} disabled={loading} className="flex h-9 w-9 items-center justify-center border border-white/10 text-slate-400 transition-colors hover:border-emerald-300/40 hover:text-emerald-200 disabled:opacity-50"><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /></button>
              <button aria-label="Sign out" title="Sign out" onClick={() => void signOut()} className="flex h-9 w-9 items-center justify-center border border-white/10 text-slate-400 hover:text-white lg:hidden"><LogOut className="h-4 w-4" /></button>
            </div>
          </header>

          {error && <p role="alert" className="mt-4 border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
          {loading && !data ? <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Loading live moderation data</div> : (
            <AnimatePresence mode="wait">
              <motion.section key={panel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="pt-7">
                {panel === 'overview' && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                      <Metric label="Provider network" value={providers.length} detail="registered profiles" icon={Users} accent="text-cyan-200" />
                      <Metric label="Awaiting review" value={pendingProviders.length} detail="provider applications" icon={Clock3} accent="text-amber-200" />
                      <Metric label="Active jobs" value={activeBookings.length} detail="scheduled or underway" icon={BriefcaseBusiness} accent="text-emerald-200" />
                      <Metric label="Live enquiries" value={openRequests.length} detail="instant requests broadcasting" icon={Activity} accent="text-lime-200" />
                    </div>
                    <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
                      <section className="border border-white/10 bg-[#0b1218]/80">
                        <SectionHeading title="Recent activity" detail="Latest customer touchpoints" actionLabel="Open enquiry log" onAction={() => setPanel('enquiries')} />
                        <EnquiryRows enquiries={(data?.enquiries || []).slice(0, 6)} />
                      </section>
                      <section className="border border-white/10 bg-[#0b1218]/80">
                        <SectionHeading title="Provider review queue" detail={`${pendingProviders.length} need a decision`} actionLabel="Review queue" onAction={() => setPanel('approvals')} />
                        <div className="divide-y divide-white/[0.06]">
                          {pendingProviders.slice(0, 4).map((provider, index) => <motion.div layout key={provider.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }} className="flex items-center justify-between gap-3 px-4 py-3">
                            <div className="min-w-0"><p className="truncate text-sm font-medium">{provider.business_name || provider.name}</p><p className="mt-1 truncate text-xs text-slate-500">{provider.city || provider.email || 'New provider'}</p></div>
                            <button onClick={() => setPanel('approvals')} className="shrink-0 text-xs text-emerald-200 hover:text-white">Review <ArrowUpRight className="ml-1 inline h-3 w-3" /></button>
                          </motion.div>)}
                          {pendingProviders.length === 0 && <EmptyState label="No providers awaiting review" />}
                        </div>
                      </section>
                    </div>
                  </>
                )}

                {panel === 'approvals' && (
                  <section className="border border-white/10 bg-[#0b1218]/80">
                    <SectionHeading title="Provider applications" detail="Approve verified tradespeople or reject incomplete applications" />
                    <div className="divide-y divide-white/[0.06]">
                      {pendingProviders.map((provider, index) => <motion.article layout key={provider.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }} className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2"><h2 className="font-medium">{provider.business_name || provider.name}</h2><span className="border border-amber-300/20 bg-amber-300/[0.07] px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-200">Pending</span></div>
                          <p className="mt-1 text-xs text-slate-400">{provider.name} · {provider.email || 'No email'} · {provider.phone || 'No phone'}</p>
                          <p className="mt-1 text-xs text-slate-500">{[provider.address, provider.city].filter(Boolean).join(', ') || 'No address provided'}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">{(data?.providerServiceLinks || []).filter((link) => link.provider_id === provider.id).map((link) => <span key={link.service_id} className="border border-white/10 px-2 py-1 text-[10px] text-slate-400">{data?.services.find((service) => service.id === link.service_id)?.name || link.service_id}</span>)}</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => void moderateProvider(provider.id, false)} disabled={busy === provider.id} className="flex h-9 items-center gap-2 border border-rose-300/20 px-3 text-xs text-rose-200 transition-colors hover:bg-rose-300/10 disabled:opacity-50"><X className="h-3.5 w-3.5" /> Reject</button>
                          <button onClick={() => void moderateProvider(provider.id, true)} disabled={busy === provider.id} className="flex h-9 items-center gap-2 border border-emerald-300/30 bg-emerald-300/10 px-3 text-xs text-emerald-100 transition-colors hover:bg-emerald-300/20 disabled:opacity-50">{busy === provider.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Approve</button>
                        </div>
                      </motion.article>)}
                      {pendingProviders.length === 0 && <EmptyState label="All provider applications have been reviewed" />}
                    </div>
                  </section>
                )}

                {panel === 'enquiries' && (
                  <section className="border border-white/10 bg-[#0b1218]/80">
                    <SectionHeading title="Enquiry stream" detail="Bookings, instant dispatch, and submitted customer queries" />
                    <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex h-10 min-w-0 items-center gap-2 border border-white/10 px-3 sm:max-w-sm sm:flex-1"><Search className="h-4 w-4 shrink-0 text-slate-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer, service, area" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-600" /></label>
                      <div className="flex gap-1 overflow-x-auto">{(['all', 'booking', 'instant', 'query'] as const).map((filter) => <button key={filter} onClick={() => setSourceFilter(filter)} className={cn('h-9 shrink-0 border px-3 text-xs capitalize', sourceFilter === filter ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100' : 'border-white/10 text-slate-500 hover:text-white')}>{filter}</button>)}</div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px] text-left text-sm">
                        <thead className="text-[10px] uppercase tracking-[0.15em] text-slate-500"><tr className="border-b border-white/[0.07]"><th className="px-4 py-3 font-medium">Customer / service</th><th className="px-4 py-3 font-medium">Source</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Received</th></tr></thead>
                        <tbody className="divide-y divide-white/[0.05]">{filteredEnquiries.map((enquiry, index) => <motion.tr layout key={enquiry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(index * 0.015, 0.2) }} className="hover:bg-white/[0.025]"><td className="px-4 py-3"><p className="font-medium">{enquiry.customerName}</p><p className="mt-1 text-xs text-slate-500">{enquiry.serviceName}{enquiry.address ? ` · ${enquiry.address}` : ''}</p><p className="mt-1 text-[11px] text-slate-600">{enquiry.customerPhone || 'No phone provided'}</p></td><td className="px-4 py-3"><span className="border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400">{enquiry.source}</span></td><td className="px-4 py-3"><span className="text-xs text-emerald-200">{enquiry.status.replaceAll('_', ' ')}</span></td><td className="px-4 py-3 text-xs text-slate-500">{formatDate(enquiry.createdAt)}</td></motion.tr>)}</tbody>
                      </table>
                      {filteredEnquiries.length === 0 && <EmptyState label="No matching enquiries" />}
                    </div>
                  </section>
                )}

                {panel === 'assignments' && (
                  <section className="border border-white/10 bg-[#0b1218]/80">
                    <SectionHeading title="Manual job routing" detail="Assign active bookings to an approved provider qualified for that service" />
                    <div className="divide-y divide-white/[0.06]">
                      {activeBookings.map((booking, index) => {
                        const eligibleProviders = providers.filter((provider) => provider.is_verified && data?.providerServiceLinks.some((link) => link.provider_id === provider.id && link.service_id === booking.service_id));
                        const currentIsEligible = eligibleProviders.some((provider) => provider.id === booking.provider_id);
                        const selectedId = assignments[booking.id] ?? (currentIsEligible ? booking.provider_id : '');
                        return <motion.article layout key={booking.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.025 }} className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)_auto] lg:items-center lg:px-5">
                          <div className="min-w-0"><p className="font-medium">{booking.service?.name || 'Service booking'}</p><p className="mt-1 text-xs text-slate-400">{booking.customer_name} · {booking.customer_phone}</p><p className="mt-1 text-xs text-slate-500">{booking.customer_address || 'No address'} · {booking.status.replaceAll('_', ' ')}</p></div>
                          <select aria-label={`Provider for ${booking.customer_name}`} value={selectedId} onChange={(event) => setAssignments((previous) => ({ ...previous, [booking.id]: event.target.value }))} className="h-10 w-full border border-white/10 bg-[#080d12] px-3 text-sm text-slate-200 outline-none focus:border-emerald-300/40">
                            <option value="">{eligibleProviders.length ? 'Select qualified provider' : 'No qualified provider available'}</option>
                            {eligibleProviders.map((provider) => <option key={provider.id} value={provider.id}>{provider.business_name || provider.name}</option>)}
                          </select>
                          <button onClick={() => void assignJob(booking.id)} disabled={!selectedId || selectedId === booking.provider_id || busy === booking.id} className="flex h-10 items-center justify-center gap-2 border border-emerald-300/30 bg-emerald-300/10 px-4 text-xs text-emerald-100 hover:bg-emerald-300/20 disabled:cursor-not-allowed disabled:opacity-40">{busy === booking.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />} Assign</button>
                        </motion.article>;
                      })}
                      {activeBookings.length === 0 && <EmptyState label="No active bookings to route" />}
                    </div>
                  </section>
                )}
              </motion.section>
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  );
}

function Metric({ label, value, detail, icon: Icon, accent }: { label: string; value: number; detail: string; icon: typeof Users; accent: string }) {
  return <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} className="border border-white/10 bg-[#0b1218]/85 p-4 sm:p-5">
    <div className="flex items-start justify-between"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p><Icon className={cn('h-4 w-4', accent)} /></div>
    <p className="mt-5 font-mono text-3xl tracking-tight">{value.toLocaleString()}</p>
    <p className="mt-1 text-xs text-slate-500">{detail}</p>
  </motion.div>;
}

function SectionHeading({ title, detail, actionLabel, onAction }: { title: string; detail: string; actionLabel?: string; onAction?: () => void }) {
  return <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-4 sm:px-5"><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-xs text-slate-500">{detail}</p></div>{actionLabel && onAction && <button onClick={onAction} className="shrink-0 text-xs text-emerald-200 hover:text-white">{actionLabel} <ArrowUpRight className="ml-1 inline h-3 w-3" /></button>}</div>;
}

function EnquiryRows({ enquiries }: { enquiries: ModerationEnquiry[] }) {
  return <div className="divide-y divide-white/[0.06]">{enquiries.map((enquiry) => <div key={enquiry.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"><div className="min-w-0"><p className="truncate text-sm font-medium">{enquiry.customerName}</p><p className="mt-1 truncate text-xs text-slate-500">{enquiry.serviceName} · {enquiry.source}</p></div><span className="shrink-0 text-[11px] text-slate-600">{formatDate(enquiry.createdAt, true)}</span></div>)}{enquiries.length === 0 && <EmptyState label="No activity recorded yet" />}</div>;
}

function EmptyState({ label }: { label: string }) {
  return <div className="flex min-h-28 flex-col items-center justify-center gap-2 px-4 py-7 text-center text-xs text-slate-500"><ClipboardList className="h-5 w-5 text-slate-700" />{label}</div>;
}

function GateState({ icon, title, label, action, actionLabel }: { icon?: React.ReactNode; title?: string; label: string; action?: () => void; actionLabel?: string }) {
  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080d12] px-5 text-slate-100"><div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(99, 229, 200, .12) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 229, 200, .12) 1px, transparent 1px)', backgroundSize: '48px 48px' }} /><div className="relative max-w-md border border-white/10 bg-[#0b1218] p-7 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center border border-emerald-300/30 bg-emerald-300/10 text-emerald-200">{icon || <LoaderCircle className="h-5 w-5 animate-spin" />}</div>{title && <h1 className="mt-5 text-lg font-semibold">{title}</h1>}<p className="mt-2 text-sm text-slate-400">{label}</p>{action && <button onClick={action} className="mt-5 h-10 border border-emerald-300/30 bg-emerald-300/10 px-4 text-sm text-emerald-100 hover:bg-emerald-300/20">{actionLabel}</button>}</div></main>;
}

function formatDate(value: string, short = false): string {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString(undefined, short
    ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}