'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench, ArrowLeft, Star, Calendar, Clock, Zap, CheckCircle2, Radio, Power, Check,
  MapPin, Phone, User, TrendingUp, Loader2, Bell, Navigation, X, LogOut, MessageSquareText,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import type { Provider, Booking, Service, ServiceCategory, ProviderAvailability, InstantRequest } from '@/lib/types';
import {
  createProviderProfile, getMarketplaceCatalog, getProviderById, getBookingsByProvider, getProviderAvailability, getProviderServices, getProviderEnquiries,
  getInstantRequestsForProvider, onProviderBookings, acceptInstantRequest, updateProviderCheckIn,
  saveProviderAvailability, saveProviderServices, verifyOTPAndComplete, formatPrice, formatTime, haversineDistance,
  type ProviderProfileInput, type ProviderEnquiry,
} from '@/lib/data';
import { cn } from '@/lib/utils';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ProviderPage() {
  const { user, loading: authLoading, setShowAuthModal, signOut } = useAuth();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [catalogServices, setCatalogServices] = useState<Service[]>([]);
  const [catalogCategories, setCatalogCategories] = useState<ServiceCategory[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availability, setAvailability] = useState<ProviderAvailability[]>([]);
  const [providerServices, setProviderServices] = useState<Service[]>([]);
  const [instantRequests, setInstantRequests] = useState<InstantRequest[]>([]);
  const [providerEnquiries, setProviderEnquiries] = useState<ProviderEnquiry[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [setupError, setSetupError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    if (!user) {
      setProvider(null);
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    setSetupError('');
    Promise.all([getProviderById(user.uid), getMarketplaceCatalog()])
      .then(([profile, catalog]) => {
        if (!active) return;
        setProvider(profile);
        setCatalogCategories(catalog.categories);
        setCatalogServices(catalog.services);
      })
      .catch((error) => {
        if (!active) return;
        const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unavailable';
        setSetupError(`Firebase could not load your provider profile (${code}).`);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, authLoading]);

  const loadProviderData = useCallback(async (id: string) => {
    const [p, a, s] = await Promise.all([
      getProviderById(id),
      getProviderAvailability(id),
      getProviderServices(id),
    ]);
    const [b, ir, enquiries] = await Promise.all([
      getBookingsByProvider(id, s.map((service) => service.id)),
      getInstantRequestsForProvider(id),
      getProviderEnquiries(id),
    ]);
    setProvider(p); setBookings(b); setAvailability(a); setProviderServices(s);
    setInstantRequests(ir);
    setProviderEnquiries(enquiries);
  }, []);

  useEffect(() => {
    if (!provider?.id) return;
    return onProviderBookings(provider.id, () => {
      void loadProviderData(provider.id);
    });
  }, [provider?.id, loadProviderData]);

  useEffect(() => {
    if (!provider?.id || !provider.is_checked_in) return;
    const interval = setInterval(async () => {
      const ir = await getInstantRequestsForProvider(provider.id);
      setInstantRequests(ir);
    }, 3000);
    return () => clearInterval(interval);
  }, [provider?.id, provider?.is_checked_in]);

  const handleCheckInToggle = async () => {
    if (!provider) return;
    await updateProviderCheckIn(provider.id, !provider.is_checked_in);
    setProvider({ ...provider, is_checked_in: !provider.is_checked_in });
  };

  const handleAcceptInstant = async (requestId: string) => {
    if (!provider) return;
    try {
      const accepted = await acceptInstantRequest(requestId, provider.id);
      if (accepted) {
        setInstantRequests((prev) => prev.filter((r) => r.id !== requestId));
        alert(`Instant request accepted! Customer: ${accepted.customer_name}, Phone: ${accepted.customer_phone}`);
        loadProviderData(provider.id);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to accept request');
    }
  };

  const handleVerifyOTP = async (bookingId: string) => {
    const otp = otpInputs[bookingId];
    if (!otp || otp.length !== 4) return;
    const result = await verifyOTPAndComplete(bookingId, otp);
    if (result.success) { alert('Payment released!'); if (provider) loadProviderData(provider.id); }
    else alert(result.message);
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
      <Link href="/" className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to Marketplace</Link>
      <Wrench className="h-9 w-9" />
      <h1 className="text-2xl font-bold">Provider Portal</h1>
      <p className="max-w-md text-sm text-muted-foreground">Sign in or create an account to set up your provider profile and choose the services you offer.</p>
      <button onClick={() => setShowAuthModal(true)} className="h-11 rounded-lg bg-foreground px-5 text-sm font-medium text-background">Sign in or create account</button>
    </div>
  );
  if (!provider) return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to Marketplace</Link>
          <button onClick={() => void signOut()} className="flex h-9 items-center gap-2 border border-border px-3 text-sm font-medium hover:bg-secondary"><LogOut className="h-4 w-4" />Log out</button>
        </div>
      </header>
      <ProviderOnboarding
        userName={user.displayName || user.email?.split('@')[0] || ''}
        userEmail={user.email || ''}
        categories={catalogCategories}
        services={catalogServices}
        initialError={setupError}
        onCreate={async (profile, serviceIds) => {
          const created = await createProviderProfile(user.uid, user.email || '', profile, serviceIds);
          setProvider(created);
          setProviderServices(catalogServices.filter((service) => serviceIds.includes(service.id)));
          setActiveTab('overview');
        }}
      />
    </>
  );

  const activeBookings = bookings.filter((b) => b.status === 'confirmed' || b.status === 'in_progress');
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const totalEarnings = completedBookings.reduce((s, b) => s + b.total_price, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Back to Marketplace</span></Link>
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-foreground text-background">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="font-bold text-lg leading-none tracking-tight">Provider Dashboard</h1>
                  <p className="text-[10px] text-muted-foreground mt-0.5 editorial-tracking">Kehi Pro</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-sm font-medium sm:inline">{provider.business_name || provider.name}</span>
              <button
                onClick={handleCheckInToggle}
                className={cn(
                  'h-9 px-4 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5',
                  provider.is_checked_in ? 'bg-foreground text-background' : 'border border-border hover:bg-secondary',
                )}
              >
                <Power className="h-3.5 w-3.5" />
                {provider.is_checked_in ? 'Checked In' : 'Check In'}
              </button>
              <button onClick={() => void signOut()} className="flex h-9 items-center gap-2 border border-border px-3 text-sm font-medium transition-colors hover:bg-secondary"><LogOut className="h-3.5 w-3.5" /><span className="hidden sm:inline">Log out</span></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden border border-border mb-6">
          {[
            { icon: Star, label: 'Rating', value: provider.rating.toFixed(1), sub: `${provider.total_reviews} reviews` },
            { icon: CheckCircle2, label: 'Jobs Done', value: String(provider.total_jobs), sub: 'all time' },
            { icon: TrendingUp, label: 'Earnings', value: formatPrice(totalEarnings), sub: 'completed jobs' },
            { icon: Calendar, label: 'Active Jobs', value: String(activeBookings.length), sub: 'scheduled' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground editorial-tracking">{stat.label}</span>
                </div>
                <p className="font-bold text-2xl editorial-heading">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-border">
          {[
            { id: 'overview', label: 'Bookings', icon: Calendar },
            { id: 'services', label: 'My Services', icon: Wrench },
            { id: 'instant', label: 'Instant Work', icon: Zap, badge: instantRequests.length },
            { id: 'enquiries', label: 'Enquiries', icon: MessageSquareText, badge: providerEnquiries.length },
            { id: 'availability', label: 'Availability', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                  activeTab === tab.id ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.badge ? (
                  <span className="ml-1 h-5 px-1.5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Bookings */}
        {activeTab === 'overview' && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg mb-2">Incoming Bookings</h3>
            {bookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No bookings yet.</p>
              </div>
            ) : (
              <AnimatePresence>
                {bookings.map((booking, i) => {
                  const isConfirmed = booking.status === 'confirmed';
                  const isCompleted = booking.status === 'completed';
                  return (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="border border-border rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm">{booking.service?.name || 'Service'}</h4>
                            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', isCompleted ? 'bg-foreground/10 text-foreground' : 'bg-foreground text-background')}>
                              {isCompleted ? 'Completed' : 'Confirmed'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{booking.customer_name}</span>
                            <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{booking.customer_phone}</span>
                            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />
                              {new Date(booking.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatTime(booking.scheduled_start_time)}</span>
                          </div>
                          {booking.customer_address && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{booking.customer_address}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatPrice(booking.total_price)}</p>
                          {isConfirmed && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Radio className="h-3 w-3" /> In escrow</p>}
                          {isCompleted && <p className="text-xs text-foreground/60 flex items-center gap-1 mt-0.5"><CheckCircle2 className="h-3 w-3" /> Released</p>}
                        </div>
                      </div>
                      {isConfirmed && (
                        <div className="flex gap-2 items-center mt-3 pt-3 border-t border-border">
                          <input
                            maxLength={4} placeholder="Enter customer OTP"
                            value={otpInputs[booking.id] || ''}
                            onChange={(e) => setOtpInputs((prev) => ({ ...prev, [booking.id]: e.target.value.replace(/\D/g, '') }))}
                            className="h-9 max-w-[160px] px-3 rounded-lg border border-border bg-background text-sm font-mono tracking-widest focus:outline-none focus:border-foreground/30"
                          />
                          <button
                            onClick={() => handleVerifyOTP(booking.id)}
                            disabled={(otpInputs[booking.id] || '').length !== 4}
                            className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
                          >
                            Complete & Release
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        )}

        {/* Instant Work */}
        {activeTab === 'instant' && (
          <div className="space-y-4">
            <div className={cn('rounded-xl border p-4 flex items-center gap-3', provider.is_checked_in ? 'bg-foreground/5 border-foreground/20' : 'bg-secondary border-border')}>
              <div className={cn('flex items-center justify-center h-10 w-10 rounded-full', provider.is_checked_in ? 'bg-foreground/10' : 'bg-secondary')}>
                {provider.is_checked_in ? <Radio className="h-5 w-5 animate-pulse" /> : <Power className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{provider.is_checked_in ? 'You are checked in and available' : 'You are checked out'}</p>
                <p className="text-xs text-muted-foreground">
                  {provider.is_checked_in ? 'Receiving instant work requests within 3km' : 'Check in to receive instant work dispatch requests'}
                </p>
              </div>
              <button
                onClick={handleCheckInToggle}
                className={cn('h-9 px-4 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5', provider.is_checked_in ? 'bg-foreground text-background' : 'border border-border hover:bg-secondary')}
              >
                <Power className="h-3.5 w-3.5" />
                {provider.is_checked_in ? 'Check Out' : 'Check In'}
              </button>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2 flex items-center gap-2"><Bell className="h-5 w-5" /> Live Requests</h3>
              {instantRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Zap className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">
                    {provider.is_checked_in ? 'No instant requests right now. Waiting for dispatch...' : 'Check in to start receiving instant work requests.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {instantRequests.map((req) => {
                      const dist = provider.latitude === null || provider.longitude === null
                        ? null
                        : haversineDistance(provider.latitude, provider.longitude, req.customer_latitude, req.customer_longitude);
                      return (
                        <motion.div
                          key={req.id}
                          initial={{ opacity: 0, scale: 0.97 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.97 }}
                          className="border border-border rounded-xl p-4"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Zap className="h-4 w-4" />
                                <h4 className="font-semibold text-sm">{req.service?.name}</h4>
                                <span className="px-2 py-0.5 rounded-full bg-foreground text-background text-xs font-medium">Instant</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{req.customer_name}</span>
                                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{req.customer_phone}</span>
                                <span className="flex items-center gap-1"><Navigation className="h-3.5 w-3.5" />{dist === null ? 'Location unavailable' : `${dist.toFixed(1)}km away`}</span>
                              </div>
                              {req.customer_address && (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{req.customer_address}</p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleAcceptInstant(req.id)}
                            className="w-full h-10 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2"
                          >
                            <Zap className="h-4 w-4" /> Accept Request — First come, first served
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <ServiceEditor
            services={catalogServices}
            categories={catalogCategories}
            initialIds={providerServices.map((service) => service.id)}
            onSave={async (serviceIds) => {
              await saveProviderServices(provider.id, serviceIds);
              const saved = await getProviderServices(provider.id);
              setProviderServices(saved);
              setInstantRequests(await getInstantRequestsForProvider(provider.id));
            }}
          />
        )}

        {activeTab === 'enquiries' && (
          <section className="max-w-5xl space-y-3">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Customer enquiries</h2>
              <p className="mt-1 text-sm text-muted-foreground">Requests sent directly from your provider directory profile.</p>
            </div>
            {providerEnquiries.length === 0 ? (
              <div className="border border-border py-12 text-center text-sm text-muted-foreground">No customer enquiries yet.</div>
            ) : providerEnquiries.map((enquiry) => (
              <article key={enquiry.id} className="border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{enquiry.customer_name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{catalogServices.find((service) => service.id === enquiry.service_id)?.name || 'Service enquiry'} · {new Date(enquiry.created_at).toLocaleString()}</p>
                  </div>
                  <a href={`tel:${enquiry.customer_phone}`} className="flex h-9 items-center gap-2 border border-border px-3 text-xs font-medium hover:bg-secondary"><Phone className="h-3.5 w-3.5" />Call {enquiry.customer_phone}</a>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{enquiry.message}</p>
              </article>
            ))}
          </section>
        )}

        {/* Availability */}
        {activeTab === 'availability' && (
          <AvailabilityEditor
            providerId={provider.id}
            availability={availability}
            onSave={async (slots) => {
              await saveProviderAvailability(provider.id, slots);
              const a = await getProviderAvailability(provider.id);
              setAvailability(a);
              alert('Availability updated!');
            }}
          />
        )}
      </main>
    </div>
  );
}

function ProviderOnboarding({
  userName,
  userEmail,
  categories,
  services,
  initialError,
  onCreate,
}: {
  userName: string;
  userEmail: string;
  categories: ServiceCategory[];
  services: Service[];
  initialError: string;
  onCreate: (profile: ProviderProfileInput, serviceIds: string[]) => Promise<void>;
}) {
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(initialError);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedCategoryIds.length === 0) {
      setError('Choose at least one category you provide.');
      return;
    }
    const serviceIds = services
      .filter((service) => selectedCategoryIds.includes(service.category_id))
      .map((service) => service.id);
    if (serviceIds.length === 0) {
      setError('No services are available for the selected categories.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onCreate({
        name: userName,
        business_name: businessName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
      }, serviceIds);
    } catch (saveError) {
      const code = typeof saveError === 'object' && saveError && 'code' in saveError ? String(saveError.code) : '';
      setError(code.includes('permission-denied')
        ? 'Firestore denied this profile write. Its rules must allow a signed-in user to create their own UID-keyed provider profile and service links.'
        : saveError instanceof Error ? saveError.message : 'Could not save provider setup.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-7 max-w-2xl">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Provider onboarding</p>
        <h1 className="mt-2 text-3xl font-bold">Set up your service profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">Signed in as {userEmail}. Add your business details and choose the work you take on.</p>
      </div>
      <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section className="space-y-4">
          <label className="block text-sm font-medium">Business name
            <input required value={businessName} onChange={(event) => setBusinessName(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3" />
          </label>
          <label className="block text-sm font-medium">Contact phone
            <input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3" />
          </label>
          <label className="block text-sm font-medium">Work address
            <input required value={address} onChange={(event) => setAddress(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3" />
          </label>
          <label className="block text-sm font-medium">City / service area
            <input required value={city} onChange={(event) => setCity(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3" />
          </label>
        </section>
        <section>
          <h2 className="mb-1 text-lg font-semibold">Services you provide</h2>
          <p className="mb-4 text-sm text-muted-foreground">Select every service you are qualified to take on.</p>
          <ServiceCategoryChoices categories={categories} services={services} selectedIds={selectedCategoryIds} onChange={setSelectedCategoryIds} />
          {error && <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={saving || services.length === 0} className="mt-5 h-11 w-full rounded-lg bg-foreground text-sm font-medium text-background disabled:opacity-50">
            {saving ? 'Saving profile…' : 'Create Provider Profile'}
          </button>
        </section>
      </form>
    </main>
  );
}

function ServiceEditor({
  services,
  categories,
  initialIds,
  onSave,
}: {
  services: Service[];
  categories: ServiceCategory[];
  initialIds: string[];
  onSave: (serviceIds: string[]) => Promise<void>;
}) {
  const [selectedIds, setSelectedIds] = useState(initialIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setSelectedIds(initialIds), [initialIds]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave(selectedIds);
    } catch (saveError) {
      const code = typeof saveError === 'object' && saveError && 'code' in saveError ? String(saveError.code) : '';
      setError(code.includes('permission-denied')
        ? 'Firestore denied this update. Check the provider_services rules for this signed-in account.'
        : saveError instanceof Error ? saveError.message : 'Could not save services.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="max-w-5xl">
      <h2 className="text-xl font-semibold">Services you offer</h2>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">Only matched services appear in your incoming work feed.</p>
      <ServiceCategoryChoices
        categories={categories}
        services={services}
        selectedIds={categories
          .filter((category) => services.some((service) => service.category_id === category.id && selectedIds.includes(service.id)))
          .map((category) => category.id)}
        onChange={(categoryIds) => setSelectedIds(services.filter((service) => categoryIds.includes(service.category_id)).map((service) => service.id))}
      />
      {error && <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      <button onClick={save} disabled={saving} className="mt-5 h-11 rounded-lg bg-foreground px-5 text-sm font-medium text-background disabled:opacity-50">
        {saving ? 'Saving…' : 'Save services'}
      </button>
    </section>
  );
}

function ServiceCategoryChoices({
  categories,
  services,
  selectedIds,
  onChange,
}: {
  categories: ServiceCategory[];
  services: Service[];
  selectedIds: string[];
  onChange: (serviceIds: string[]) => void;
}) {
  const toggle = (categoryId: string) => {
    onChange(selectedIds.includes(categoryId)
      ? selectedIds.filter((id) => id !== categoryId)
      : [...selectedIds, categoryId]);
  };

  const availableCategories = categories.filter((category) => services.some((service) => service.category_id === category.id));
  if (availableCategories.length === 0) return <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">No service options are available yet.</p>;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {availableCategories.map((category) => {
        const selected = selectedIds.includes(category.id);
        const categoryServices = services.filter((service) => service.category_id === category.id);
        return (
          <label key={category.id} className={cn('flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors', selected ? 'border-foreground bg-secondary/60' : 'border-border hover:bg-secondary/30')}>
            <input type="checkbox" checked={selected} onChange={() => toggle(category.id)} className="sr-only" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{category.name}</span>
                {selected && <Check className="h-4 w-4 shrink-0" aria-label="Selected" />}
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{category.description || categoryServices.map((service) => service.name).join(', ')}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{categoryServices.length} available services</p>
            </div>
          </label>
        );
      })}
    </div>
  );
}

function AvailabilityEditor({
  providerId: _providerId,
  availability,
  onSave,
}: {
  providerId: string;
  availability: ProviderAvailability[];
  onSave: (slots: { day_of_week: number; start_time: string; end_time: string; max_simultaneous_jobs: number }[]) => void;
}) {
  const [slots, setSlots] = useState<{ day_of_week: number; start_time: string; end_time: string; max_simultaneous_jobs: number }[]>(
    availability.map((a) => ({ day_of_week: a.day_of_week, start_time: a.start_time.slice(0, 5), end_time: a.end_time.slice(0, 5), max_simultaneous_jobs: a.max_simultaneous_jobs })),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSlots(availability.map((a) => ({ day_of_week: a.day_of_week, start_time: a.start_time.slice(0, 5), end_time: a.end_time.slice(0, 5), max_simultaneous_jobs: a.max_simultaneous_jobs })));
  }, [availability]);

  const toggleDay = (day: number) => {
    const existing = slots.find((s) => s.day_of_week === day);
    if (existing) setSlots(slots.filter((s) => s.day_of_week !== day));
    else setSlots([...slots, { day_of_week: day, start_time: '09:00', end_time: '17:00', max_simultaneous_jobs: 1 }]);
  };

  const updateSlot = (day: number, field: string, value: string | number) => {
    setSlots(slots.map((s) => (s.day_of_week === day ? { ...s, [field]: value } : s)));
  };

  const handleSave = async () => { setSaving(true); await onSave(slots); setSaving(false); };

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h3 className="font-semibold text-lg mb-1">Weekly Availability</h3>
        <p className="text-sm text-muted-foreground">Set your working hours for each day. Customers will see available time slots based on this schedule.</p>
      </div>
      <div className="space-y-2">
        {DAYS.map((day, i) => {
          const slot = slots.find((s) => s.day_of_week === i);
          const isEnabled = !!slot;
          return (
            <div key={i} className={cn('border border-border rounded-lg p-3', !isEnabled && 'opacity-50')}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleDay(i)}
                  className={cn('flex items-center justify-center h-6 w-6 rounded-md border transition-colors flex-shrink-0', isEnabled ? 'bg-foreground border-foreground text-background' : 'border-border bg-card')}
                >
                  {isEnabled && <CheckCircle2 className="h-4 w-4" />}
                </button>
                <span className="font-medium text-sm w-24">{day}</span>
                {isEnabled && slot ? (
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <input type="time" value={slot.start_time} onChange={(e) => updateSlot(i, 'start_time', e.target.value)}
                      className="h-8 w-28 px-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:border-foreground/30" />
                    <span className="text-xs text-muted-foreground">to</span>
                    <input type="time" value={slot.end_time} onChange={(e) => updateSlot(i, 'end_time', e.target.value)}
                      className="h-8 w-28 px-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:border-foreground/30" />
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-xs text-muted-foreground">Max jobs:</span>
                      <input type="number" min={1} max={5} value={slot.max_simultaneous_jobs}
                        onChange={(e) => updateSlot(i, 'max_simultaneous_jobs', parseInt(e.target.value) || 1)}
                        className="h-8 w-16 px-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:border-foreground/30" />
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Off</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={handleSave} disabled={saving}
        className="w-full h-11 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
        {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : 'Save Availability'}
      </button>
    </div>
  );
}
