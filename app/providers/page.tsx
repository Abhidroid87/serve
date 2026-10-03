'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, BadgeCheck, Check, MapPin, MessageSquareText, Phone, ShieldCheck, Star, Users, Wrench, X, Zap } from 'lucide-react';
import { BookingModal } from '@/components/booking-modal';
import { InstantWorkModal } from '@/components/instant-work-modal';
import { LocationBar, type UserLocation } from '@/components/location-bar';
import { useAuth } from '@/lib/auth-context';
import type { Provider, Service, ServiceCategory } from '@/lib/types';
import { createProviderEnquiry, getMarketplaceCatalog, getProvidersForService, watchProviderProfile } from '@/lib/data';
import { cn } from '@/lib/utils';

interface ProviderDirectoryEntry {
  provider: Provider;
  services: Service[];
}

async function getDirectoryEntries(services: Service[], location: UserLocation | null): Promise<ProviderDirectoryEntry[]> {
  const results = await Promise.all(services.map(async (service) => ({
    service,
    providers: await getProvidersForService(service.id, location?.lat, location?.lng, 10),
  })));
  const entriesByProvider = new Map<string, ProviderDirectoryEntry>();
  for (const result of results) {
    for (const provider of result.providers) {
      const entry = entriesByProvider.get(provider.id) || { provider, services: [] };
      entry.services.push(result.service);
      entriesByProvider.set(provider.id, entry);
    }
  }
  return Array.from(entriesByProvider.values()).sort((left, right) => {
    if (left.provider.is_verified !== right.provider.is_verified) return left.provider.is_verified ? -1 : 1;
    return right.provider.rating - left.provider.rating;
  });
}

export default function ProvidersPage() {
  const { user, setShowAuthModal } = useAuth();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [entries, setEntries] = useState<ProviderDirectoryEntry[]>([]);
  const providerIds = useMemo(() => entries.map(({ provider }) => provider.id).join(','), [entries]);
  const [categoryId, setCategoryId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [bookingService, setBookingService] = useState<Service | null>(null);
  const [instantService, setInstantService] = useState<Service | null>(null);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [minimumRating, setMinimumRating] = useState('0');
  const [openNow, setOpenNow] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [revealedNumbers, setRevealedNumbers] = useState<Record<string, boolean>>({});
  const [enquiryTarget, setEnquiryTarget] = useState<{ provider: Provider; service: Service } | null>(null);
  const [enquiryName, setEnquiryName] = useState('');
  const [enquiryPhone, setEnquiryPhone] = useState('');
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [enquiryError, setEnquiryError] = useState('');
  const [enquirySent, setEnquirySent] = useState(false);
  const [sendingEnquiry, setSendingEnquiry] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const loadDirectory = async () => {
      try {
        const catalog = await getMarketplaceCatalog();
        const requestedId = new URLSearchParams(window.location.search).get('service') || '';
        const requestedService = catalog.services.find((service) => service.id === requestedId);
        const requestedCategory = requestedService?.category_id || catalog.categories.find((category) => category.id === requestedId)?.id || '';
        const initialCategory = requestedCategory || catalog.categories[0]?.id || '';
        const matchingServices = catalog.services.filter((service) => service.category_id === initialCategory);
        if (!active) return;
        setCategories(catalog.categories);
        setServices(catalog.services);
        setCategoryId(initialCategory);
        setSelectedServiceId(requestedService?.id || matchingServices[0]?.id || '');
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Provider directory is unavailable.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadDirectory();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!categoryId || services.length === 0) return;
    let active = true;
    setLoading(true);
    setError('');
    const matchingServices = services.filter((service) => service.category_id === categoryId && (!selectedServiceId || service.id === selectedServiceId));
    getDirectoryEntries(matchingServices, location)
      .then((nextEntries) => { if (active) setEntries(nextEntries); })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Could not load providers for this category.');
        setEntries([]);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [categoryId, selectedServiceId, services, location]);

  useEffect(() => {
    if (!providerIds) return;
    const unsubscribe = providerIds.split(',').map((providerId) => watchProviderProfile(providerId, (updatedProvider) => {
      if (!updatedProvider) return;
      setEntries((current) => current.map((entry) => entry.provider.id === updatedProvider.id
        ? {
            ...entry,
            provider: {
              ...entry.provider,
              is_open: updatedProvider.is_open,
              opening_time: updatedProvider.opening_time,
              closing_time: updatedProvider.closing_time,
              is_checked_in: updatedProvider.is_checked_in,
            },
          }
        : entry));
    }));
    return () => unsubscribe.forEach((stop) => stop());
  }, [providerIds]);

  const selectedCategory = categories.find((category) => category.id === categoryId);
  const categoryServices = services.filter((service) => service.category_id === categoryId);
  const selectedService = services.find((service) => service.id === selectedServiceId);
  const filteredEntries = useMemo(() => entries.filter(({ provider, services: matchedServices }) => {
    const haystack = [
      provider.name,
      provider.business_name || '',
      provider.city || '',
      provider.locality || '',
      ...matchedServices.map((service) => service.name),
    ].join(' ').toLowerCase();
    const cityText = `${provider.city || ''} ${provider.locality || ''} ${provider.address || ''}`.toLowerCase();
    return haystack.includes(search.toLowerCase())
      && (!cityFilter || cityText.includes(cityFilter.trim().toLowerCase()))
      && provider.rating >= Number(minimumRating)
      && (!openNow || (
        provider.businessType && provider.businessType !== 'service_provider'
          ? provider.is_open === true
          : provider.is_checked_in
      ))
      && (!verifiedOnly || provider.is_verified)
      && (!selectedServiceId || matchedServices.some((service) => service.id === selectedServiceId));
  }), [entries, search, cityFilter, minimumRating, openNow, verifiedOnly, selectedServiceId]);

  const chooseCategory = (nextCategoryId: string) => {
    setCategoryId(nextCategoryId);
    const matchingServices = services.filter((service) => service.category_id === nextCategoryId);
    setSelectedServiceId(matchingServices[0]?.id || '');
  };

  const handleLocationChange = (nextLocation: UserLocation) => {
    setLocation(nextLocation);
    setCityFilter(nextLocation.lat === undefined ? nextLocation.locality : '');
  };

  const sendEnquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!enquiryTarget) return;
    if (!user) {
      setEnquiryError('Sign in to send this enquiry. Your details will stay in this form.');
      setShowAuthModal(true);
      return;
    }
    setSendingEnquiry(true);
    setEnquiryError('');
    try {
      await createProviderEnquiry({
        provider_id: enquiryTarget.provider.id,
        service_id: enquiryTarget.service.id,
        customer_name: enquiryName.trim(),
        customer_phone: enquiryPhone.trim(),
        message: enquiryMessage.trim(),
      });
      setEnquirySent(true);
    } catch (sendError) {
      setEnquiryError(sendError instanceof Error ? sendError.message : 'Could not send your enquiry.');
    } finally {
      setSendingEnquiry(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Marketplace</Link>
          <span className="text-xs text-muted-foreground">Kehi provider directory</span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <section className="border-b border-border pb-7">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Local professionals</p>
          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-bold">{selectedCategory?.name || 'Provider directory'}</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Browse qualified providers and compare availability, ratings, and service specialties.</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" />{filteredEntries.length} providers</div>
          </div>
        </section>

        <div className="py-5">
          <LocationBar
            location={location}
            onLocationChange={handleLocationChange}
            searchQuery={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search providers or service areas..."
          />
        </div>

        <div className="grid gap-7 py-7 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="h-fit space-y-6 border border-border p-4 lg:sticky lg:top-5">
            <section>
              <label htmlFor="provider-category" className="mb-2 block text-xs font-semibold uppercase text-muted-foreground">Specialty</label>
              <select id="provider-category" value={categoryId} onChange={(event) => chooseCategory(event.target.value)} className="h-10 w-full border border-border bg-background px-3 text-sm">
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </section>
            <section>
              <label htmlFor="provider-service" className="mb-2 block text-xs font-semibold uppercase text-muted-foreground">Service</label>
              <select id="provider-service" value={selectedServiceId} onChange={(event) => setSelectedServiceId(event.target.value)} className="h-10 w-full border border-border bg-background px-3 text-sm">
                <option value="">All {selectedCategory?.name || 'services'}</option>
                {categoryServices.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
              </select>
            </section>
            <section>
              <label htmlFor="provider-city" className="mb-2 block text-xs font-semibold uppercase text-muted-foreground">City</label>
              <input id="provider-city" list="provider-cities" value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} placeholder="Any city" className="h-10 w-full border border-border bg-background px-3 text-sm outline-none focus:border-foreground/40" />
              <datalist id="provider-cities">{Array.from(new Set(entries.flatMap(({ provider }) => [provider.city, provider.locality]).filter((city): city is string => Boolean(city)))).map((city) => <option key={city} value={city} />)}</datalist>
            </section>
            <fieldset>
              <legend className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Minimum rating</legend>
              <div className="space-y-2">
                {[['0', 'Any'], ['3', '3+'], ['4', '4+'], ['4.5', '4.5+']].map(([value, label]) => <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"><input type="radio" name="minimum-rating" value={value} checked={minimumRating === value} onChange={(event) => setMinimumRating(event.target.value)} className="accent-foreground" />{label}{value !== '0' && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />}</label>)}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Availability</legend>
              <div className="space-y-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={openNow} onChange={(event) => setOpenNow(event.target.checked)} className="accent-foreground" />Open right now</label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} className="accent-foreground" />Verified businesses only</label>
              </div>
            </fieldset>
          </aside>

          <section className="min-w-0">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div>
                  <h2 className="font-semibold">{selectedService?.name || selectedCategory?.name || 'Available providers'}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{selectedCategory?.description || 'Providers offering this specialty'}</p>
                </div>
                {selectedService && !selectedService.is_sample && location?.lat !== undefined && location.lng !== undefined && filteredEntries.some((entry) => entry.provider.is_verified && entry.provider.is_checked_in) && <button onClick={() => setInstantService(selectedService)} className="flex h-9 shrink-0 items-center justify-center gap-2 border border-emerald-600/30 px-3 text-xs font-medium text-emerald-800 hover:bg-emerald-50"><Zap className="h-3.5 w-3.5" /> Request now</button>}
              </div>
            </div>

            {selectedService?.is_sample && <p className="mb-4 border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-950">Showing sample providers and indicative prices. Live booking is unavailable for sample services.</p>}
            {error && <p role="alert" className="mb-4 border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}
            {loading ? (
              <div className="grid gap-3">{[0, 1, 2].map((item) => <div key={item} className="h-32 animate-pulse border border-border bg-secondary/40" />)}</div>
            ) : filteredEntries.length === 0 ? (
              <div className="flex min-h-56 flex-col items-center justify-center border border-dashed border-border px-5 text-center">
                <Wrench className="h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 font-medium">No matching providers yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Try another specialty or search term.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEntries.map(({ provider, services: offeredServices }, index) => (
                  <motion.article key={provider.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.04, 0.24) }} className="grid gap-4 border border-border bg-card p-4 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:items-center sm:p-5">
                    <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-secondary text-xl font-semibold text-muted-foreground">
                      {provider.avatar_url ? <Image src={provider.avatar_url} alt="" fill sizes="64px" className="object-cover" /> : (provider.business_name || provider.name).charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{provider.business_name || provider.name}</h3>
                        {provider.is_verified && <span className="flex items-center gap-1 text-[11px] text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" /> Verified</span>}
                        {provider.is_checked_in && provider.is_verified && <span className="h-2 w-2 rounded-full bg-emerald-500" title="Available now" />}
                        {provider.businessType && provider.businessType !== 'service_provider' && (
                          <span className={provider.is_open ? 'text-xs font-medium text-emerald-700' : 'text-xs font-medium text-red-700'}>
                            {provider.is_open ? '🟢 Currently Open' : '🔴 Currently Closed'}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{provider.bio || 'Local service professional'}</p>
                      {provider.businessType && provider.businessType !== 'service_provider' && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {provider.opening_time || '09:00'} – {provider.closing_time || '20:00'}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />{provider.rating.toFixed(1)} ({provider.total_reviews} reviews)</span>
                        {(provider.locality || provider.city) && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[provider.locality, provider.city].filter(Boolean).join(', ')}</span>}
                        <span>{provider.total_jobs} jobs completed</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">{offeredServices.map((service) => <span key={service.id} className="border border-border px-2 py-1 text-[10px] text-muted-foreground">{service.name}</span>)}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
                      {provider.phone && (revealedNumbers[provider.id]
                        ? <a href={`tel:${provider.phone}`} className="flex h-9 items-center justify-center gap-2 rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90"><Phone className="h-3.5 w-3.5" />{provider.phone}</a>
                        : <button type="button" onClick={() => setRevealedNumbers((previous) => ({ ...previous, [provider.id]: true }))} className="flex h-9 items-center justify-center gap-2 border border-border px-3 text-xs font-medium hover:bg-secondary"><Phone className="h-3.5 w-3.5" />Show number</button>)}
                      {offeredServices.length > 0 && <button type="button" onClick={() => {
                        const service = offeredServices.find((item) => item.id === selectedServiceId) || offeredServices[0];
                        setEnquiryTarget({ provider, service });
                        setEnquiryName(user?.displayName || '');
                        setEnquiryPhone('');
                        setEnquiryMessage('');
                        setEnquiryError('');
                        setEnquirySent(false);
                      }} className="flex h-9 items-center justify-center gap-2 border border-foreground/30 px-3 text-xs font-medium hover:bg-secondary"><MessageSquareText className="h-3.5 w-3.5" />Send enquiry</button>}
                      {provider.is_verified && offeredServices.length > 0 && !offeredServices.every((service) => service.is_sample) && <button onClick={() => setBookingService(offeredServices.find((service) => service.id === selectedServiceId && !service.is_sample) || offeredServices.find((service) => !service.is_sample) || null)} className="h-9 border border-border px-3 text-xs font-medium transition-colors hover:bg-secondary">Schedule service</button>}
                      {provider.is_verified && provider.is_checked_in && <span className="text-center text-[10px] text-emerald-700">Available now</span>}
                    </div>
                  </motion.article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
      <BookingModal
        service={bookingService}
        userLocation={null}
        onClose={() => setBookingService(null)}
        onBookingConfirmed={() => setBookingService(null)}
      />
      <InstantWorkModal
        service={instantService}
        userLocation={location}
        onClose={() => setInstantService(null)}
        onAccepted={() => setInstantService(null)}
      />
      {enquiryTarget && <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEnquiryTarget(null); }}>
        <motion.form initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} onSubmit={sendEnquiry} className="w-full max-w-md border border-border bg-card p-5 shadow-2xl sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase text-muted-foreground">Provider enquiry</p><h2 className="mt-1 text-lg font-semibold">{enquiryTarget.provider.business_name || enquiryTarget.provider.name}</h2><p className="mt-1 text-sm text-muted-foreground">{enquiryTarget.service.name}</p></div><button type="button" aria-label="Close enquiry" onClick={() => setEnquiryTarget(null)} className="p-2 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button></div>
          {enquirySent ? <div className="mt-5 flex items-center gap-2 border border-emerald-700/20 bg-emerald-50 p-3 text-sm text-emerald-900"><Check className="h-4 w-4" />Enquiry sent. The provider can contact you using your details.</div> : <>
            <label className="mt-5 block text-sm">Your name<input required value={enquiryName} onChange={(event) => setEnquiryName(event.target.value)} className="mt-1.5 h-10 w-full border border-border bg-background px-3" /></label>
            <label className="mt-3 block text-sm">Phone number<input required type="tel" value={enquiryPhone} onChange={(event) => setEnquiryPhone(event.target.value)} className="mt-1.5 h-10 w-full border border-border bg-background px-3" /></label>
            <label className="mt-3 block text-sm">How can they help?<textarea required value={enquiryMessage} onChange={(event) => setEnquiryMessage(event.target.value)} rows={3} className="mt-1.5 w-full resize-y border border-border bg-background p-3" /></label>
            {enquiryError && <p role="alert" className="mt-3 text-sm text-destructive">{enquiryError}</p>}
            <button disabled={sendingEnquiry} className="mt-4 flex h-10 w-full items-center justify-center gap-2 bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"><MessageSquareText className="h-4 w-4" />{sendingEnquiry ? 'Sending…' : user ? 'Send enquiry' : 'Sign in and send enquiry'}</button>
          </>}
        </motion.form>
      </div>}
    </main>
  );
}