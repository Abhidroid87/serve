'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, BadgeCheck, MapPin, Phone, Search, ShieldCheck, Star, Users, Wrench, Zap } from 'lucide-react';
import { BookingModal } from '@/components/booking-modal';
import { InstantWorkModal } from '@/components/instant-work-modal';
import { LocationBar, type UserLocation } from '@/components/location-bar';
import type { Provider, Service, ServiceCategory } from '@/lib/types';
import { getMarketplaceCatalog, getProvidersForService } from '@/lib/data';
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
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [entries, setEntries] = useState<ProviderDirectoryEntry[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [bookingService, setBookingService] = useState<Service | null>(null);
  const [instantService, setInstantService] = useState<Service | null>(null);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [search, setSearch] = useState('');
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
    const matchingServices = services.filter((service) => service.category_id === categoryId);
    getDirectoryEntries(matchingServices, location)
      .then((nextEntries) => { if (active) setEntries(nextEntries); })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Could not load providers for this category.');
        setEntries([]);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [categoryId, services, location]);

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
    return haystack.includes(search.toLowerCase());
  }), [entries, search]);

  const chooseCategory = (nextCategoryId: string) => {
    setCategoryId(nextCategoryId);
    const matchingServices = services.filter((service) => service.category_id === nextCategoryId);
    setSelectedServiceId(matchingServices[0]?.id || '');
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
            onLocationChange={setLocation}
            searchQuery={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search providers or service areas..."
          />
        </div>

        <div className="grid gap-7 py-7 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Specialty</h2>
              <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
                {categories.map((category) => (
                  <button key={category.id} onClick={() => chooseCategory(category.id)} className={cn('h-9 shrink-0 border px-3 text-left text-sm transition-colors lg:w-full', categoryId === category.id ? 'border-foreground bg-foreground text-background' : 'border-border hover:bg-secondary')}>
                    {category.name}
                  </button>
                ))}
              </div>
            </section>
            <section className="hidden lg:block">
              <h2 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Services</h2>
              <div className="space-y-1">
                {categoryServices.map((service) => (
                  <button key={service.id} onClick={() => setSelectedServiceId(service.id)} className={cn('w-full px-2 py-2 text-left text-sm transition-colors', selectedServiceId === service.id ? 'bg-secondary font-medium text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                    {service.name}
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <section className="min-w-0">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div>
                  <h2 className="font-semibold">{selectedService?.name || selectedCategory?.name || 'Available providers'}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{selectedCategory?.description || 'Providers offering this specialty'}</p>
                </div>
                {selectedService && !selectedService.is_sample && location && filteredEntries.some((entry) => entry.provider.is_verified && entry.provider.is_checked_in) && <button onClick={() => setInstantService(selectedService)} className="flex h-9 shrink-0 items-center justify-center gap-2 border border-emerald-600/30 px-3 text-xs font-medium text-emerald-800 hover:bg-emerald-50"><Zap className="h-3.5 w-3.5" /> Request now</button>}
              </div>
              <label className="flex h-10 items-center gap-2 border border-border px-3 sm:w-72">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or area" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
              </label>
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
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{provider.bio || 'Local service professional'}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />{provider.rating.toFixed(1)} ({provider.total_reviews} reviews)</span>
                        {(provider.locality || provider.city) && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[provider.locality, provider.city].filter(Boolean).join(', ')}</span>}
                        <span>{provider.total_jobs} jobs completed</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">{offeredServices.map((service) => <span key={service.id} className="border border-border px-2 py-1 text-[10px] text-muted-foreground">{service.name}</span>)}</div>
                    </div>
                    <div className="flex items-center gap-2 sm:flex-col sm:items-stretch">
                      {provider.phone ? <a href={`tel:${provider.phone}`} className="flex h-9 items-center justify-center gap-2 rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90"><Phone className="h-3.5 w-3.5" /> Contact</a> : <span className="flex h-9 items-center gap-1.5 px-2 text-xs text-muted-foreground"><BadgeCheck className="h-3.5 w-3.5" /> Profile</span>}
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
    </main>
  );
}