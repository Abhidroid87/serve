'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench, ArrowLeft, Star, Calendar, Clock, Zap, CheckCircle2, Radio, Power, Check,
  MapPin, Phone, User, TrendingUp, Loader2, Bell, Navigation, X, LogOut, MessageSquareText,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import type { Provider, Booking, Service, ServiceCategory, ProviderAvailability, InstantRequest, ProviderBusinessType } from '@/lib/types';
import {
  createProviderProfile, getMarketplaceCatalog, getProviderById, getBookingsByProvider, getProviderAvailability, getProviderServices, getProviderEnquiries,
  getInstantRequestsForProvider, onProviderBookings, acceptInstantRequest, updateProviderCheckIn,
  saveProviderAvailability, saveProviderServices, verifyOTPAndComplete, formatPrice, formatTime, haversineDistance, updateProviderBusinessSettings,
  type ProviderProfileInput, type ProviderEnquiry,
} from '@/lib/data';
import { cn } from '@/lib/utils';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const PROVIDER_TYPES: { id: ProviderBusinessType; label: { en: string; ne: string } }[] = [
  { id: 'service_provider', label: { en: '🔧 Home Repair & Maintenance', ne: '🔧 घर मर्मत तथा सम्भार' } },
  { id: 'retail_store', label: { en: '🏪 Retail Store & Physical Shop', ne: '🏪 खुद्रा पसल तथा भौतिक स्टोर' } },
  { id: 'activity_dining', label: { en: '💇 Salons, Dining & Activities', ne: '💇 सैलुन, भोजन तथा गतिविधिहरू' } },
];

const COPY = {
  en: {
    businessDetails: 'Business details',
    onboarding: 'Provider onboarding',
    setupTitle: 'Set up your provider profile',
    setupDescription: 'Add your business details and choose what you offer.',
    businessName: 'Business name',
    phone: 'Contact phone',
    address: 'Work address',
    city: 'City / service area',
    services: 'Services you provide',
    categoryHelp: 'Select every category that matches your business.',
    repairHelp: 'Select every service you are qualified to take on.',
    providerType: 'Provider type',
    storeFulfillment: 'Store fulfillment',
    visitOptions: 'Visit options',
    walkIn: 'Walk-in / In-store shopping',
    walkInHelp: 'Customers can visit your physical address during open hours.',
    localDelivery: 'Local home delivery',
    localDeliveryHelp: 'Direct doorstep delivery to nearby customers.',
    deliveryRadius: 'Delivery radius (km)',
    deliveryTime: 'Estimated delivery time',
    storePickup: 'Store pickup (Click & Collect)',
    storePickupHelp: 'Customers order online and collect in person from your counter.',
    appointment: 'Appointment / seat reservation required',
    appointmentHelp: 'Require customers to select a time slot before visiting.',
    openingTime: 'Opening time',
    closingTime: 'Closing time',
    liveStatus: 'Live status',
    currentlyOpen: 'Currently Open',
    currentlyClosed: 'Currently Closed',
    save: 'Save settings',
    saving: 'Saving…',
    settings: 'Business settings',
    catalog: 'Catalog categories / price list',
    catalogNote: 'Manage the categories you offer. Product-level inventory and pricing are not configured yet.',
    requests: 'Live Order / Pickup Requests',
    appointments: "Today's Appointments & Table Bookings",
    noOrders: 'No live order or pickup requests yet.',
    noAppointments: 'No appointments or table bookings yet.',
    customer: 'Customer',
    slot: 'Slot time',
    service: 'Service booked',
    phoneLabel: 'Phone',
    repairs: 'Repair services',
    dashboard: 'Provider Dashboard',
    logOut: 'Log out',
    bookings: 'Bookings',
    myServices: 'My Services',
    instantWork: 'Instant Work',
    enquiries: 'Enquiries',
    availability: 'Availability',
  },
  ne: {
    businessDetails: 'व्यापार विवरण',
    onboarding: 'प्रदायक दर्ता',
    setupTitle: 'आफ्नो प्रदायक प्रोफाइल सेटअप गर्नुहोस्',
    setupDescription: 'व्यापार विवरण थप्नुहोस् र तपाईंले प्रदान गर्ने सेवा छान्नुहोस्।',
    businessName: 'व्यापारको नाम',
    phone: 'सम्पर्क फोन',
    address: 'कार्यस्थलको ठेगाना',
    city: 'सहर / सेवा क्षेत्र',
    services: 'तपाईंले प्रदान गर्ने सेवाहरू',
    categoryHelp: 'तपाईंको व्यापारसँग मिल्ने सबै वर्ग छान्नुहोस्।',
    repairHelp: 'तपाईंले गर्न सक्ने सबै सेवा छान्नुहोस्।',
    providerType: 'सेवा प्रदायकको प्रकार',
    storeFulfillment: 'पसल डेलिभरी र सेवा विकल्प',
    visitOptions: 'भ्रमण विकल्पहरू',
    walkIn: 'पसलमा आएर किनमेल',
    walkInHelp: 'खुला समयमा ग्राहकहरू तपाईंको ठेगानामा आउन सक्छन्।',
    localDelivery: 'स्थानीय घर डेलिभरी',
    localDeliveryHelp: 'नजिकका ग्राहकलाई ढोकासम्म सामान पुर्‍याउनुहोस्।',
    deliveryRadius: 'डेलिभरी दूरी (कि.मि.)',
    deliveryTime: 'अनुमानित डेलिभरी समय',
    storePickup: 'पसलबाट लिनुहोस् (Click & Collect)',
    storePickupHelp: 'ग्राहकले अनलाइन अर्डर गरी काउन्टरबाट सामान लिन सक्छन्।',
    appointment: 'अपोइन्टमेन्ट / सिट आरक्षण आवश्यक',
    appointmentHelp: 'भ्रमणअघि ग्राहकले समय छान्नुपर्ने बनाउनुहोस्।',
    openingTime: 'खुल्ने समय',
    closingTime: 'बन्द हुने समय',
    liveStatus: 'लाइभ स्थिति',
    currentlyOpen: 'हाल खुला छ',
    currentlyClosed: 'हाल बन्द छ',
    save: 'सेटिङ सुरक्षित गर्नुहोस्',
    saving: 'सुरक्षित हुँदैछ…',
    settings: 'व्यापार सेटिङ',
    catalog: 'क्याटलग वर्ग / मूल्य सूची',
    catalogNote: 'तपाईंले प्रदान गर्ने वर्ग व्यवस्थापन गर्नुहोस्। वस्तु-स्तरको मौज्दात र मूल्य अझै सेट गरिएको छैन।',
    requests: 'लाइभ अर्डर / पिकअप अनुरोधहरू',
    appointments: 'आजका अपोइन्टमेन्ट र टेबल बुकिङ',
    noOrders: 'अहिलेसम्म कुनै लाइभ अर्डर वा पिकअप अनुरोध छैन।',
    noAppointments: 'अहिलेसम्म कुनै अपोइन्टमेन्ट वा टेबल बुकिङ छैन।',
    customer: 'ग्राहक',
    slot: 'समय',
    service: 'बुक गरिएको सेवा',
    phoneLabel: 'फोन',
    repairs: 'मर्मत सेवा',
    dashboard: 'प्रदायक ड्यासबोर्ड',
    logOut: 'लगआउट',
    bookings: 'बुकिङहरू',
    myServices: 'मेरा सेवाहरू',
    instantWork: 'तत्काल काम',
    enquiries: 'सोधपुछ',
    availability: 'उपलब्धता',
  },
} as const;

const RETAIL_CATEGORIES = [
  { name: 'Kirana & Grocery', description: 'Daily staples, packaged goods, beverages & household essentials.', tag: 'Store pickup & delivery eligible' },
  { name: 'Clothing & Fashion', description: 'Apparel, traditional wear, footwear & boutique accessories.', tag: 'Walk-in & fitting available' },
  { name: 'Electronics & Spares', description: 'Gadgets, mobile accessories, electronic appliances & spares.', tag: 'Warranty & in-store testing' },
  { name: 'Bakeries & Confectionery', description: 'Fresh cakes, bread, local pastries & custom celebration orders.', tag: 'Same-day pickup' },
  { name: 'Hardware & Sanitary Supplies', description: 'Tools, construction fittings, electrical & plumbing supplies.', tag: 'Bulk order eligible' },
];

const EXPERIENCE_CATEGORIES = [
  { name: 'Hair Salon & Grooming', description: 'Haircuts, styling, coloring, beard grooming & head massage.', tag: 'Time-slot appointments' },
  { name: 'Spa & Wellness', description: 'Body therapies, facials, relaxation massages & skin care.', tag: 'Prior booking recommended' },
  { name: 'Cafe & Bistro', description: 'Artisanal coffee, baked treats, casual brunch & dine-in vibes.', tag: 'Dine-in & take-away' },
  { name: 'Gaming & Entertainment', description: 'Console gaming, board games, arcade & recreational zones.', tag: 'Hourly session passes' },
  { name: 'Fitness, Yoga & Gym', description: 'Daily passes, personal training, yoga sessions & gym access.', tag: 'Walk-in & memberships' },
];

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
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [setupError, setSetupError] = useState('');
  const [language, setLanguage] = useState<'en' | 'ne'>('en');

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
    if (!provider?.id || (provider.businessType && provider.businessType !== 'service_provider')) return;
    return onProviderBookings(provider.id, () => {
      void loadProviderData(provider.id);
    });
  }, [provider?.id, provider?.businessType, loadProviderData]);

  useEffect(() => {
    if (!provider?.id || (provider.businessType && provider.businessType !== 'service_provider') || !provider.is_checked_in) return;
    const interval = setInterval(async () => {
      const ir = await getInstantRequestsForProvider(provider.id);
      setInstantRequests(ir);
    }, 3000);
    return () => clearInterval(interval);
  }, [provider?.id, provider?.businessType, provider?.is_checked_in]);

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
          <div className="flex items-center gap-2">
            <LanguageSwitcher language={language} onChange={setLanguage} />
            <button onClick={() => void signOut()} className="flex h-9 items-center gap-2 border border-border px-3 text-sm font-medium hover:bg-secondary"><LogOut className="h-4 w-4" />{COPY[language].logOut}</button>
          </div>
        </div>
      </header>
      <ProviderOnboarding
        userName={user.displayName || user.email?.split('@')[0] || ''}
        userEmail={user.email || ''}
        categories={catalogCategories}
        services={catalogServices}
        initialError={setupError}
        language={language}
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
  const isServiceProvider = !provider.businessType || provider.businessType === 'service_provider';
  const isRetailStore = provider.businessType === 'retail_store';
  const isExperienceProvider = provider.businessType === 'activity_dining' || provider.businessType === 'experience_provider';
  const labels = COPY[language];
  const isOpen = provider.is_open ?? true;
  const dashboardTabs: { id: string; label: string; icon: typeof Calendar; badge?: number }[] = isServiceProvider
    ? [
        { id: 'overview', label: labels.bookings, icon: Calendar },
        { id: 'services', label: labels.myServices, icon: Wrench },
        { id: 'instant', label: labels.instantWork, icon: Zap, badge: instantRequests.length },
        { id: 'enquiries', label: labels.enquiries, icon: MessageSquareText, badge: providerEnquiries.length },
        { id: 'availability', label: labels.availability, icon: Clock },
      ]
    : isRetailStore
      ? [
          { id: 'overview', label: labels.requests, icon: Calendar },
          { id: 'catalog', label: labels.catalog, icon: Wrench },
          { id: 'settings', label: labels.settings, icon: Clock },
        ]
      : [
          { id: 'overview', label: labels.appointments, icon: Calendar },
          { id: 'settings', label: labels.settings, icon: Clock },
        ];

  const toggleOpenStatus = async () => {
    const nextOpen = !isOpen;
    try {
      await updateProviderBusinessSettings(provider.id, {
        fulfillment: provider.fulfillment ?? {},
        opening_time: provider.opening_time || '09:00',
        closing_time: provider.closing_time || '20:00',
        is_open: nextOpen,
      });
      setProvider({ ...provider, is_open: nextOpen });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not update business status.');
    }
  };

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
                  <h1 className="font-bold text-lg leading-none tracking-tight">{labels.dashboard}</h1>
                  <p className="text-[10px] text-muted-foreground mt-0.5 editorial-tracking">Kehi Pro</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-sm font-medium sm:inline">{provider.business_name || provider.name}</span>
              {isServiceProvider ? (
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
              ) : (
                <button
                  onClick={() => void toggleOpenStatus()}
                  className={cn('h-9 px-4 rounded-lg text-sm font-medium transition-colors', isOpen ? 'bg-emerald-700 text-white' : 'bg-red-700 text-white')}
                >
                  {isOpen ? `🟢 ${labels.currentlyOpen}` : `🔴 ${labels.currentlyClosed}`}
                </button>
              )}
              <LanguageSwitcher language={language} onChange={setLanguage} />
              <button onClick={() => void signOut()} className="flex h-9 items-center gap-2 border border-border px-3 text-sm font-medium transition-colors hover:bg-secondary"><LogOut className="h-3.5 w-3.5" /><span className="hidden sm:inline">{labels.logOut}</span></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {isServiceProvider && <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden border border-border mb-6">
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
        </div>}

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-border">
          {dashboardTabs.map((tab) => {
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
        {activeTab === 'overview' && isServiceProvider && (
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

        {activeTab === 'overview' && isRetailStore && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{labels.requests}</h3>
            <EmptyManagementState icon={Calendar} message={labels.noOrders} />
            <ProviderBusinessSettings
              provider={provider}
              language={language}
              onSave={async (settings) => {
                await updateProviderBusinessSettings(provider.id, settings);
                setProvider({ ...provider, ...settings });
              }}
            />
          </div>
        )}

        {activeTab === 'overview' && isExperienceProvider && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{labels.appointments}</h3>
            <EmptyManagementState icon={Calendar} message={labels.noAppointments} />
            <ProviderBusinessSettings
              provider={provider}
              language={language}
              onSave={async (settings) => {
                await updateProviderBusinessSettings(provider.id, settings);
                setProvider({ ...provider, ...settings });
              }}
            />
          </div>
        )}

        {activeTab === 'catalog' && isRetailStore && (
          <section className="max-w-3xl space-y-3">
            <div>
              <h3 className="font-semibold text-lg">{labels.catalog}</h3>
              <p className="text-sm text-muted-foreground">{labels.catalogNote}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(provider.fulfillment?.categories || []).map((category) => (
                <span key={category} className="rounded-md border border-border px-3 py-2 text-sm">{category}</span>
              ))}
            </div>
            {(provider.fulfillment?.categories || []).length === 0 && <EmptyManagementState icon={Wrench} message={labels.catalogNote} />}
          </section>
        )}

        {activeTab === 'settings' && !isServiceProvider && (
          <ProviderBusinessSettings
            provider={provider}
            language={language}
            onSave={async (settings) => {
              await updateProviderBusinessSettings(provider.id, settings);
              setProvider({ ...provider, ...settings });
            }}
          />
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
  language,
  onCreate,
}: {
  userName: string;
  userEmail: string;
  categories: ServiceCategory[];
  services: Service[];
  initialError: string;
  language: 'en' | 'ne';
  onCreate: (profile: ProviderProfileInput, serviceIds: string[]) => Promise<void>;
}) {
  const labels = COPY[language];
  const [providerType, setProviderType] = useState<ProviderBusinessType>('service_provider');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [retailWalkInAllowed, setRetailWalkInAllowed] = useState(true);
  const [experienceWalkInAllowed, setExperienceWalkInAllowed] = useState(true);
  const [localHomeDelivery, setLocalHomeDelivery] = useState(false);
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState('');
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState('');
  const [storePickup, setStorePickup] = useState(false);
  const [appointmentRequired, setAppointmentRequired] = useState(true);
  const [openingTime, setOpeningTime] = useState('09:00');
  const [closingTime, setClosingTime] = useState('20:00');
  const [isOpen, setIsOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(initialError);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const isHomeService = providerType === 'service_provider';
    if (selectedCategoryIds.length === 0) {
      setError('Choose at least one category you provide.');
      return;
    }
    const serviceIds = isHomeService
      ? services.filter((service) => selectedCategoryIds.includes(service.category_id)).map((service) => service.id)
      : [];
    if (isHomeService && serviceIds.length === 0) {
      setError('No services are available for the selected categories.');
      return;
    }
    if (providerType === 'retail_store' && localHomeDelivery
      && (!Number.isFinite(Number(deliveryRadiusKm)) || Number(deliveryRadiusKm) <= 0)) {
      setError('Enter a delivery radius greater than 0 km.');
      return;
    }
    if (closingTime <= openingTime) {
      setError('Closing time must be later than opening time.');
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
        opening_time: openingTime,
        closing_time: closingTime,
        is_open: isOpen,
        businessType: providerType,
        ...(isHomeService ? {
          fulfillmentType: 'doorstep_dispatch' as const,
          isInstantDispatchEligible: true,
        } : {}),
        fulfillment: {
          categories: isHomeService
            ? categories.filter((category) => selectedCategoryIds.includes(category.id)).map((category) => category.name)
            : selectedCategoryIds,
          ...(providerType === 'retail_store'
            ? {
                walkInAllowed: retailWalkInAllowed,
                localHomeDelivery,
                deliveryRadiusKm: localHomeDelivery ? Number(deliveryRadiusKm) : null,
                estimatedDeliveryTime: localHomeDelivery ? estimatedDeliveryTime.trim() : '',
                storePickup,
              }
            : providerType === 'activity_dining' || providerType === 'experience_provider'
              ? { walkInAllowed: experienceWalkInAllowed, appointmentRequired }
              : {}),
        },
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
        <p className="text-xs font-semibold uppercase text-muted-foreground">{labels.onboarding}</p>
        <h1 className="mt-2 text-3xl font-bold">{labels.setupTitle}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{userEmail}. {labels.setupDescription}</p>
      </div>
      <form onSubmit={submit} className="space-y-8">
        <fieldset>
          <legend className="mb-3 text-sm font-semibold">{labels.providerType}</legend>
          <div className="grid gap-3 md:grid-cols-3">
            {PROVIDER_TYPES.map((type) => (
              <label
                key={type.id}
                className={cn('flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm font-medium transition-colors', providerType === type.id ? 'border-foreground bg-secondary/60' : 'border-border hover:bg-secondary/30')}
              >
                <input
                  type="radio"
                  name="providerType"
                  value={type.id}
                  checked={providerType === type.id}
                  onChange={() => {
                    setProviderType(type.id);
                    setSelectedCategoryIds([]);
                    setError('');
                  }}
                />
                {type.label[language]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">{labels.businessDetails}</h2>
            <label className="block text-sm font-medium">{labels.businessName}
              <input required value={businessName} onChange={(event) => setBusinessName(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3" />
            </label>
            <label className="block text-sm font-medium">{labels.phone}
              <input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3" />
            </label>
            <label className="block text-sm font-medium">{labels.address}
              <input required value={address} onChange={(event) => setAddress(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3" />
            </label>
            <label className="block text-sm font-medium">{labels.city}
              <input required value={city} onChange={(event) => setCity(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3" />
            </label>
          </section>
          <section>
            <h2 className="mb-1 text-lg font-semibold">{labels.services}</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {providerType === 'service_provider' ? labels.repairHelp : labels.categoryHelp}
            </p>
            {providerType === 'service_provider' ? (
              <ServiceCategoryChoices categories={categories} services={services} selectedIds={selectedCategoryIds} onChange={setSelectedCategoryIds} />
            ) : (
              <OnboardingCategoryChoices
                options={providerType === 'retail_store' ? RETAIL_CATEGORIES : EXPERIENCE_CATEGORIES}
                selectedIds={selectedCategoryIds}
                onChange={setSelectedCategoryIds}
              />
            )}
            {providerType === 'retail_store' && (
              <fieldset className="mt-5 space-y-3">
                <legend className="mb-2 text-sm font-semibold">{labels.storeFulfillment}</legend>
                <FulfillmentCheckbox label={labels.walkIn} note={labels.walkInHelp} checked={retailWalkInAllowed} onChange={setRetailWalkInAllowed} />
                <div>
                  <FulfillmentCheckbox label={labels.localDelivery} note={labels.localDeliveryHelp} checked={localHomeDelivery} onChange={setLocalHomeDelivery} />
                  {localHomeDelivery && (
                    <div className="ml-7 mt-2 grid max-w-xl gap-3 sm:grid-cols-2">
                      <label className="block text-sm">
                        {labels.deliveryRadius}
                        <input
                          required
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={deliveryRadiusKm}
                          onChange={(event) => setDeliveryRadiusKm(event.target.value)}
                          placeholder="3"
                          className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3"
                        />
                      </label>
                      <label className="block text-sm">
                        {labels.deliveryTime}
                        <input value={estimatedDeliveryTime} onChange={(event) => setEstimatedDeliveryTime(event.target.value)} placeholder="30-45 mins" className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3" />
                      </label>
                    </div>
                  )}
                </div>
                <FulfillmentCheckbox label={labels.storePickup} note={labels.storePickupHelp} checked={storePickup} onChange={setStorePickup} />
              </fieldset>
            )}
            {(providerType === 'activity_dining' || providerType === 'experience_provider') && (
              <fieldset className="mt-5 space-y-3">
                <legend className="mb-2 text-sm font-semibold">{labels.visitOptions}</legend>
                <FulfillmentCheckbox label={labels.walkIn} note={labels.walkInHelp} checked={experienceWalkInAllowed} onChange={setExperienceWalkInAllowed} />
                <FulfillmentCheckbox label={labels.appointment} note={labels.appointmentHelp} checked={appointmentRequired} onChange={setAppointmentRequired} />
              </fieldset>
            )}
            <fieldset className="mt-5 space-y-3">
              <legend className="mb-2 text-sm font-semibold">{labels.liveStatus}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium">{labels.openingTime}
                  <input required type="time" value={openingTime} onChange={(event) => setOpeningTime(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3" />
                </label>
                <label className="block text-sm font-medium">{labels.closingTime}
                  <input required type="time" value={closingTime} onChange={(event) => setClosingTime(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3" />
                </label>
              </div>
              <button
                type="button"
                aria-pressed={isOpen}
                onClick={() => setIsOpen((open) => !open)}
                className={cn('rounded-lg px-3 py-2 text-left text-sm font-medium text-white', isOpen ? 'bg-emerald-700' : 'bg-red-700')}
              >
                {isOpen ? `🟢 ${labels.liveStatus}: ${labels.currentlyOpen}` : `🔴 ${labels.liveStatus}: ${labels.currentlyClosed}`}
              </button>
            </fieldset>
            {error && <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
            <button type="submit" disabled={saving || (providerType === 'service_provider' && services.length === 0)} className="mt-5 h-11 w-full rounded-lg bg-foreground text-sm font-medium text-background disabled:opacity-50">
              {saving ? 'Saving profile…' : 'Create Provider Profile'}
            </button>
          </section>
        </div>
      </form>
    </main>
  );
}

function OnboardingCategoryChoices({
  options,
  selectedIds,
  onChange,
}: {
  options: { name: string; description: string; tag: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (category: string) => {
    onChange(selectedIds.includes(category)
      ? selectedIds.filter((id) => id !== category)
      : [...selectedIds, category]);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const selected = selectedIds.includes(option.name);
        return (
          <label key={option.name} className={cn('flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors', selected ? 'border-foreground bg-secondary/60' : 'border-border hover:bg-secondary/30')}>
            <input className="mt-1" type="checkbox" checked={selected} onChange={() => toggle(option.name)} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{option.name}</span>
                {selected && <Check className="h-4 w-4 shrink-0" aria-label="Selected" />}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
              <p className="mt-2 text-[10px] font-medium text-emerald-700">{option.tag}</p>
            </div>
          </label>
        );
      })}
    </div>
  );
}

function FulfillmentCheckbox({
  label,
  note,
  checked,
  onChange,
}: {
  label: string;
  note?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm">
      <input className="mt-1" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>
        <span className="block font-medium">{label}</span>
        {note && <span className="mt-0.5 block text-xs text-muted-foreground">{note}</span>}
      </span>
    </label>
  );
}

function LanguageSwitcher({
  language,
  onChange,
}: {
  language: 'en' | 'ne';
  onChange: (language: 'en' | 'ne') => void;
}) {
  return (
    <div role="group" aria-label="Language" className="inline-flex h-9 items-center rounded-md border border-border p-0.5 text-xs">
      <button type="button" onClick={() => onChange('en')} aria-pressed={language === 'en'} className={cn('h-full rounded px-2.5', language === 'en' ? 'bg-foreground text-background' : 'text-muted-foreground')}>
        English
      </button>
      <button type="button" onClick={() => onChange('ne')} aria-pressed={language === 'ne'} className={cn('h-full rounded px-2.5', language === 'ne' ? 'bg-foreground text-background' : 'text-muted-foreground')}>
        नेपाली
      </button>
    </div>
  );
}

function EmptyManagementState({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border py-10 text-center text-muted-foreground">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center opacity-40"><Icon className="h-8 w-8" /></div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

function ProviderBusinessSettings({
  provider,
  language,
  onSave,
}: {
  provider: Provider;
  language: 'en' | 'ne';
  onSave: (settings: Pick<Provider, 'fulfillment' | 'opening_time' | 'closing_time' | 'is_open'>) => Promise<void>;
}) {
  const labels = COPY[language];
  const [fulfillment, setFulfillment] = useState<NonNullable<Provider['fulfillment']>>(provider.fulfillment ?? {});
  const [openingTime, setOpeningTime] = useState(provider.opening_time || '09:00');
  const [closingTime, setClosingTime] = useState(provider.closing_time || '20:00');
  const [isOpen, setIsOpen] = useState(provider.is_open ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFulfillment(provider.fulfillment ?? {});
    setOpeningTime(provider.opening_time || '09:00');
    setClosingTime(provider.closing_time || '20:00');
    setIsOpen(provider.is_open ?? true);
  }, [provider]);

  const save = async () => {
    if (closingTime <= openingTime) {
      setError('Closing time must be later than opening time.');
      return;
    }
    if (fulfillment.localHomeDelivery
      && (!Number.isFinite(fulfillment.deliveryRadiusKm) || (fulfillment.deliveryRadiusKm ?? 0) <= 0)) {
      setError('Enter a delivery radius greater than 0 km.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        fulfillment,
        opening_time: openingTime,
        closing_time: closingTime,
        is_open: isOpen,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save business settings.');
    } finally {
      setSaving(false);
    }
  };

  const isRetailStore = provider.businessType === 'retail_store';
  const setOption = (key: keyof NonNullable<Provider['fulfillment']>, value: boolean | number | string | null) => {
    setFulfillment((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="max-w-3xl rounded-xl border border-border p-4 sm:p-6">
      <h3 className="mb-4 font-semibold text-lg">{labels.settings}</h3>
      <div className="space-y-4">
        {isRetailStore ? (
          <>
            <FulfillmentCheckbox label={labels.walkIn} note={labels.walkInHelp} checked={fulfillment.walkInAllowed ?? true} onChange={(value) => setOption('walkInAllowed', value)} />
            <FulfillmentCheckbox label={labels.localDelivery} note={labels.localDeliveryHelp} checked={fulfillment.localHomeDelivery ?? false} onChange={(value) => setOption('localHomeDelivery', value)} />
            {fulfillment.localHomeDelivery && (
              <div className="ml-7 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">{labels.deliveryRadius}
                  <input type="number" min="0.1" step="0.1" value={fulfillment.deliveryRadiusKm ?? ''} onChange={(event) => setOption('deliveryRadiusKm', event.target.value ? Number(event.target.value) : null)} className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3" />
                </label>
                <label className="block text-sm">{labels.deliveryTime}
                  <input value={fulfillment.estimatedDeliveryTime || ''} onChange={(event) => setOption('estimatedDeliveryTime', event.target.value)} placeholder="30-45 mins" className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3" />
                </label>
              </div>
            )}
            <FulfillmentCheckbox label={labels.storePickup} note={labels.storePickupHelp} checked={fulfillment.storePickup ?? false} onChange={(value) => setOption('storePickup', value)} />
          </>
        ) : (
          <>
            <FulfillmentCheckbox label={labels.walkIn} note={labels.walkInHelp} checked={fulfillment.walkInAllowed ?? true} onChange={(value) => setOption('walkInAllowed', value)} />
            <FulfillmentCheckbox label={labels.appointment} note={labels.appointmentHelp} checked={fulfillment.appointmentRequired ?? true} onChange={(value) => setOption('appointmentRequired', value)} />
          </>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">{labels.openingTime}
            <input type="time" value={openingTime} onChange={(event) => setOpeningTime(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3" />
          </label>
          <label className="block text-sm font-medium">{labels.closingTime}
            <input type="time" value={closingTime} onChange={(event) => setClosingTime(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3" />
          </label>
        </div>
        <button
          type="button"
          aria-pressed={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          className={cn('rounded-lg px-3 py-2 text-sm font-medium text-white', isOpen ? 'bg-emerald-700' : 'bg-red-700')}
        >
          {isOpen ? `🟢 ${labels.liveStatus}: ${labels.currentlyOpen}` : `🔴 ${labels.liveStatus}: ${labels.currentlyClosed}`}
        </button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button type="button" onClick={() => void save()} disabled={saving} className="block h-10 rounded-lg bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50">
          {saving ? labels.saving : labels.save}
        </button>
      </div>
    </section>
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
