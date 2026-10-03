'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Zap, Wrench, Star, ArrowRight, CheckCircle2, Lock, MapPin, ChevronLeft, ChevronRight, ShoppingBag, Utensils, Sparkles, BadgeCheck, UserRound, Store, Scissors } from 'lucide-react';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LocationBar, type UserLocation } from '@/components/location-bar';
import { ServiceCard } from '@/components/service-card';
import { BookingsList } from '@/components/bookings-list';
import { Footer } from '@/components/Footer';
import { SearchModal, type SearchSuggestion } from '@/components/search-modal';
import { useAuth } from '@/lib/auth-context';
import type { Service, ServiceCategory, Provider } from '@/lib/types';
import { getMarketplaceCatalog, getProvidersForService } from '@/lib/data';
import { cn } from '@/lib/utils';
import { customerPlaceId } from '@/lib/customer-places';

type DiscoveryTab = 'For You' | 'Dining' | 'Stores' | 'Activities' | 'Repairs';

const categorySlugs: Record<Exclude<DiscoveryTab, 'For You'>, string> = {
  Dining: 'dining',
  Stores: 'stores',
  Activities: 'activities',
  Repairs: 'services',
};

const categoriesBySlug: Record<string, DiscoveryTab> = Object.fromEntries(
  Object.entries(categorySlugs).map(([category, slug]) => [slug, category]),
) as Record<string, DiscoveryTab>;

const discoveryTabs: { label: DiscoveryTab; icon: LucideIcon }[] = [
  { label: 'For You', icon: Zap },
  { label: 'Dining', icon: Utensils },
  { label: 'Stores', icon: ShoppingBag },
  { label: 'Activities', icon: Sparkles },
  { label: 'Repairs', icon: Wrench },
];

const featuredPlaces = [
  { name: 'Himalayan Java Coffee', type: 'Dining' as DiscoveryTab, label: 'Featured cafe', area: 'Thamel, Kathmandu', offer: 'A little coffee, a lot of calm', image: 'photo-1445116572660-236099ec97a0' },
  { name: 'Siddhartha Rooftop Cafe', type: 'Dining' as DiscoveryTab, label: 'Sunset tasting menu', area: 'Lazimpat, Kathmandu', offer: 'Golden hour, local flavors', image: 'photo-1514933651103-005eec06c04b' },
  { name: 'Urban Fix Home Appliances', type: 'Repairs' as DiscoveryTab, label: 'Verified service', area: 'Jhamsikhel, Lalitpur', offer: 'Dispatch in under 45 min', image: 'photo-1581578731548-c64695cc6952' },
  { name: 'CoolCare AC & Fridge Repair', type: 'Repairs' as DiscoveryTab, label: 'Instant dispatch', area: 'Baneshwor, Kathmandu', offer: 'Upfront pricing, trusted pros', image: 'photo-1621905251918-48416bd8575a' },
  { name: 'Lumina Spa & Salon', type: 'Activities' as DiscoveryTab, label: 'Trending this week', area: 'Jhamsikhel, Lalitpur', offer: '20% off your first visit', image: 'photo-1560066984-138dadb4c035' },
  { name: 'Level Up Gaming Lounge', type: 'Activities' as DiscoveryTab, label: 'Play together', area: 'Thamel, Kathmandu', offer: 'Weeknight gaming passes', image: 'photo-1542751371-adc38448a05e' },
  { name: 'Everest Fresh Organic Market', type: 'Stores' as DiscoveryTab, label: 'Local favorite', area: 'Pulchowk, Lalitpur', offer: 'Fresh picks, close by', image: 'photo-1542838132-92c53300491e' },
  { name: 'Kora Boutique', type: 'Stores' as DiscoveryTab, label: 'Made in Nepal', area: 'Patan, Lalitpur', offer: 'Meet local makers', image: 'photo-1441986300917-64674bd600d8' },
];

const localPlaces = [
  { name: 'Himalayan Java Coffee', category: 'Cafe & Bakery', subcategory: 'Cafes & Bakeries', type: 'Dining' as DiscoveryTab, area: 'Thamel', rating: '4.8', reviews: '120+', distance: '1.2 km', offer: 'Free pastry with two coffees', priceTier: 2, outdoorSeating: true, image: 'photo-1501339847302-ac426a4a7cbb' },
  { name: 'Everest Fresh Market', category: 'Organic grocery', subcategory: 'Organic Markets', type: 'Stores' as DiscoveryTab, area: 'Pulchowk', rating: '4.7', reviews: '86', distance: '1.8 km', offer: 'Verified local shop', priceTier: 1, outdoorSeating: false, image: 'photo-1542838132-92c53300491e' },
  { name: 'Lumina Spa & Salon', category: 'Salon & wellness', subcategory: 'Spas & Wellness', type: 'Activities' as DiscoveryTab, area: 'Jhamsikhel', rating: '4.9', reviews: '64', distance: '2.1 km', offer: 'Save 20% on your first visit', priceTier: 3, outdoorSeating: false, image: 'photo-1560066984-138dadb4c035' },
  { name: 'The Courtyard Kitchen', category: 'Nepali dining', subcategory: 'Traditional Nepali', type: 'Dining' as DiscoveryTab, area: 'New Road', rating: '4.6', reviews: '210+', distance: '2.4 km', offer: 'Seasonal lunch menu', priceTier: 2, outdoorSeating: true, image: 'photo-1414235077428-338989a2e8c0' },
  { name: 'Siddhartha Rooftop Cafe', category: 'Rooftop & bar', subcategory: 'Rooftop & Bars', type: 'Dining' as DiscoveryTab, area: 'Lazimpat', rating: '4.7', reviews: '98', distance: '2.7 km', offer: 'Sunset tasting menu', priceTier: 3, outdoorSeating: true, image: 'photo-1514933651103-005eec06c04b' },
  { name: 'Momo Junction', category: 'Fast food & momo', subcategory: 'Fast Food & Momo', type: 'Dining' as DiscoveryTab, area: 'Baneshwor', rating: '4.5', reviews: '154', distance: '1.5 km', offer: 'Local favorite, made fresh', priceTier: 1, outdoorSeating: false, image: 'photo-1563245372-f21724e3856d' },
  { name: 'Patan Hair Studio', category: 'Hair & beauty', subcategory: 'Hair & Beauty', type: 'Activities' as DiscoveryTab, area: 'Patan', rating: '4.6', reviews: '73', distance: '1.1 km', offer: 'Complimentary consultation', priceTier: 2, outdoorSeating: false, image: 'photo-1521590832167-7bcb0faa49f5' },
  { name: 'Level Up Gaming Lounge', category: 'Gaming lounge', subcategory: 'Gaming Lounges', type: 'Activities' as DiscoveryTab, area: 'Thamel', rating: '4.8', reviews: '110', distance: '2.0 km', offer: 'Weeknight gaming passes', priceTier: 2, outdoorSeating: false, image: 'photo-1542751371-adc38448a05e' },
  { name: 'Move Studio Yoga', category: 'Fitness & yoga', subcategory: 'Fitness & Yoga', type: 'Activities' as DiscoveryTab, area: 'Jhamsikhel', rating: '4.9', reviews: '58', distance: '1.7 km', offer: 'First class on us', priceTier: 2, outdoorSeating: false, image: 'photo-1544367567-0f2fcb009e0b' },
  { name: 'Patan Weekend Workshop', category: 'Creative workshops', subcategory: 'Workshops', type: 'Activities' as DiscoveryTab, area: 'Patan', rating: '4.7', reviews: '42', distance: '2.3 km', offer: 'Small groups, local hosts', priceTier: 2, outdoorSeating: false, image: 'photo-1455390582262-044cbe6a277' },
  { name: 'Kirana Corner', category: 'Grocery & kirana', subcategory: 'Grocery & Kirana', type: 'Stores' as DiscoveryTab, area: 'Baneshwor', rating: '4.6', reviews: '91', distance: '0.9 km', offer: 'Everyday essentials nearby', priceTier: 1, outdoorSeating: false, image: 'photo-1604719312566-8912e9c8a213' },
  { name: 'Kora Boutique', category: 'Fashion & clothing', subcategory: 'Fashion & Clothing', type: 'Stores' as DiscoveryTab, area: 'Patan', rating: '4.8', reviews: '66', distance: '1.4 km', offer: 'Meet local makers', priceTier: 3, outdoorSeating: false, image: 'photo-1441986300917-64674bd600d8' },
  { name: 'Gadget House Nepal', category: 'Electronics & gadgets', subcategory: 'Electronics & Gadgets', type: 'Stores' as DiscoveryTab, area: 'New Road', rating: '4.5', reviews: '130+', distance: '2.2 km', offer: 'Local warranty support', priceTier: 2, outdoorSeating: false, image: 'photo-1498049794561-7780e7231661' },
];

const browseCategories = [
  { title: 'Local stores & markets', type: 'Stores' as DiscoveryTab, icon: Store, tags: 'Grocery · Boutiques · Electronics · Bakeries', image: 'photo-1441986300917-64674bd600d8' },
  { title: 'Dining & cafes', type: 'Dining' as DiscoveryTab, icon: Utensils, tags: 'Rooftops · Local bites · Dining · Coffee', image: 'photo-1554118811-1e0d58224f24' },
  { title: 'Activities & wellness', type: 'Activities' as DiscoveryTab, icon: Scissors, tags: 'Salons · Gyms · Workshops · Gaming', image: 'photo-1540555700478-4be289fbecef' },
  { title: 'Home repairs', type: 'Repairs' as DiscoveryTab, icon: Wrench, tags: 'Electrician · Plumbing · AC · Appliances', image: 'photo-1621905251918-48416bd8575a' },
];

const categorySubcategories: Partial<Record<DiscoveryTab, { title: string; image: string }[]>> = {
  Dining: [
    { title: 'Cafes & Bakeries', image: 'photo-1554118811-1e0d58224f24' },
    { title: 'Rooftop & Bars', image: 'photo-1514933651103-005eec06c04b' },
    { title: 'Traditional Nepali', image: 'photo-1414235077428-338989a2e8c0' },
    { title: 'Fast Food & Momo', image: 'photo-1563245372-f21724e3856d' },
  ],
  Activities: [
    { title: 'Spas & Wellness', image: 'photo-1560066984-138dadb4c035' },
    { title: 'Hair & Beauty', image: 'photo-1521590832167-7bcb0faa49f5' },
    { title: 'Gaming Lounges', image: 'photo-1542751371-adc38448a05e' },
    { title: 'Fitness & Yoga', image: 'photo-1544367567-0f2fcb009e0b' },
    { title: 'Workshops', image: 'photo-1455390582262-044cbe6a277' },
  ],
  Stores: [
    { title: 'Grocery & Kirana', image: 'photo-1604719312566-8912e9c8a213' },
    { title: 'Fashion & Clothing', image: 'photo-1441986300917-64674bd600d8' },
    { title: 'Organic Markets', image: 'photo-1542838132-92c53300491e' },
    { title: 'Electronics & Gadgets', image: 'photo-1498049794561-7780e7231661' },
  ],
  Repairs: [
    { title: 'AC & Fridge Repair', image: 'photo-1621905251918-48416bd8575a' },
    { title: 'Plumbing', image: 'photo-1607472586893-edb57bdc0e39' },
    { title: 'Electrical Wiring', image: 'photo-1621905251918-48416bd8575a' },
    { title: 'Deep Cleaning', image: 'photo-1581578731548-c64695cc6952' },
  ],
};

const serviceSubcategoryIds: Record<string, string> = {
  'AC & Fridge Repair': 'appliance-repair',
  Plumbing: 'plumbing',
  'Electrical Wiring': 'electrical',
  'Deep Cleaning': 'cleaning',
};

function photoUrl(photo: string, width = 900) {
  return `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=${width}&q=85`;
}

function FeaturedCarousel({ activeCategory, onSelect }: { activeCategory: DiscoveryTab; onSelect: (tab: DiscoveryTab) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const slides = activeCategory === 'For You' ? featuredPlaces : featuredPlaces.filter((place) => place.type === activeCategory);

  useEffect(() => {
    setActiveIndex(0);
  }, [activeCategory]);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => setActiveIndex((index) => (index + 1) % slides.length), 4500);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const move = (direction: number) => setActiveIndex((index) => (index + direction + slides.length) % slides.length);
  const currentIndex = activeIndex % slides.length;

  return (
    <section aria-label="Featured around Kathmandu" className="mx-auto w-full max-w-7xl overflow-hidden px-4 pb-6 pt-4 sm:px-6 md:pb-8">
      <div className="mb-4 flex items-end justify-between px-4 sm:px-8">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-emerald-700">A little closer to home</p>
          <h2 className="text-2xl font-bold sm:text-3xl">Good things, around you</h2>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <button aria-label="Previous featured place" onClick={() => move(-1)} disabled={slides.length < 2} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-white transition hover:bg-neutral-100 disabled:opacity-40"><ChevronLeft className="h-5 w-5" /></button>
          <button aria-label="Next featured place" onClick={() => move(1)} disabled={slides.length < 2} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-white transition hover:bg-neutral-100 disabled:opacity-40"><ChevronRight className="h-5 w-5" /></button>
        </div>
      </div>
      <div className="relative mx-auto flex h-[320px] w-full items-center justify-center overflow-hidden [perspective:1200px] sm:h-[380px] md:h-[420px]">
        {slides.map((place, index) => {
          const rawOffset = index - currentIndex;
          const offset = rawOffset > slides.length / 2 ? rawOffset - slides.length : rawOffset < -slides.length / 2 ? rawOffset + slides.length : rawOffset;
          const visible = Math.abs(offset) <= 1;
          return (
            <div key={place.name} className="absolute inset-0 flex items-center justify-center">
              <motion.button
                type="button"
                aria-label={`${place.name}, ${place.label}`}
                onClick={() => offset === 0 ? onSelect(place.type) : setActiveIndex(index)}
                animate={{ x: `${offset * 84}%`, rotateY: offset * -15, scale: offset === 0 ? 1 : 0.88, opacity: visible ? (offset === 0 ? 1 : 0.65) : 0, zIndex: offset === 0 ? 2 : 1 }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                style={{ backgroundImage: `linear-gradient(180deg, transparent 35%, rgba(12,18,16,.86) 100%), url("${photoUrl(place.image, 1000)}")`, transformStyle: 'preserve-3d' }}
                className={cn('relative w-[210px] shrink-0 overflow-hidden rounded-[1.25rem] border border-white/30 bg-cover bg-center text-left text-white shadow-xl aspect-[3/4] sm:w-[250px] md:w-[300px]', !visible && 'pointer-events-none')}
              >
              <span className="absolute left-4 top-4 rounded-full border border-white/30 bg-black/35 px-3 py-1.5 text-[11px] font-semibold capitalize backdrop-blur">{place.label}</span>
              <span className="absolute bottom-5 left-5 right-5">
                <span className="mb-2 flex items-center gap-1 text-xs text-white/80"><MapPin className="h-3.5 w-3.5" />{place.area}</span>
                <span className="block text-xl font-bold leading-tight">{place.name}</span>
                <span className="mt-2 flex items-center justify-between text-sm font-medium"><span>{place.offer}</span><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-neutral-900"><ArrowRight className="h-4 w-4" /></span></span>
              </span>
              </motion.button>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-center gap-2" aria-label={`Slide ${currentIndex + 1} of ${slides.length}`}>
        {slides.map((place, index) => <button key={place.name} aria-label={`Show featured place ${index + 1}`} onClick={() => setActiveIndex(index)} className={cn('h-1.5 rounded-full transition-all', index === currentIndex ? 'w-8 bg-emerald-700' : 'w-2 bg-neutral-300')} />)}
      </div>
    </section>
  );
}

function DiscoveryCategoryGrid({
  activeCategory,
  selectedSubcategory,
  onCategorySelect,
  onSubcategorySelect,
}: {
  activeCategory: DiscoveryTab;
  selectedSubcategory: string | null;
  onCategorySelect: (tab: DiscoveryTab) => void;
  onSubcategorySelect: (subcategory: string) => void;
}) {
  const tiles = activeCategory === 'For You'
    ? browseCategories.map(({ title, type, tags, image }) => ({ title, category: type, subtitle: tags, image }))
    : (categorySubcategories[activeCategory] || []).map(({ title, image }) => ({ title, category: activeCategory, subtitle: `Explore ${title}`, image }));

  return (
    <section className="pb-8 pt-4">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div><p className="mb-1 text-xs font-semibold uppercase tracking-widest text-emerald-700">{activeCategory === 'For You' ? 'Find your kind of local' : 'Explore this category'}</p><h2 className="text-2xl font-bold">{activeCategory === 'For You' ? 'Explore your neighborhood' : `Explore ${activeCategory === 'Activities' ? 'Activities & Salon' : activeCategory === 'Repairs' ? 'Repairs & Services' : activeCategory}`}</h2></div>
        {activeCategory === 'For You' && <span className="hidden text-sm text-muted-foreground sm:block">The best of Kathmandu, all in one place</span>}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(({ title, category, subtitle, image }) => (
          <motion.button key={title} type="button" aria-pressed={activeCategory !== 'For You' && selectedSubcategory === title} whileHover={{ y: -4 }} onClick={() => activeCategory === 'For You' ? onCategorySelect(category) : onSubcategorySelect(title)} className={cn('group relative h-52 overflow-hidden rounded-xl border text-left text-white', activeCategory !== 'For You' && selectedSubcategory === title ? 'border-emerald-700 ring-2 ring-emerald-700' : 'border-border')}>
            <Image src={photoUrl(image, 700)} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
            <span className="absolute inset-x-4 bottom-4">
              <span className="block text-lg font-semibold">{title}</span>
              <span className="mt-1 block text-xs text-white/80">{subtitle}</span>
            </span>
          </motion.button>
        ))}
      </div>
    </section>
  );
}

function LocalListingCard({ place }: { place: (typeof localPlaces)[number] }) {
  return (
    <Link href={`/place/${customerPlaceId(place.name)}/`} className="block">
    <motion.article whileHover={{ y: -4 }} className="overflow-hidden rounded-xl border border-neutral-200/80 bg-white transition-shadow hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
        <Image src={photoUrl(place.image, 720)} alt={place.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover transition-transform duration-500 hover:scale-105" />
        <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold shadow-sm"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{place.rating} <span className="font-normal text-neutral-500">({place.reviews})</span></span>
        <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium">{place.distance}</span>
      </div>
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between gap-2"><span className="text-xs text-neutral-500">{place.category}</span><span className="flex items-center gap-1 text-xs text-neutral-500"><MapPin className="h-3 w-3" />{place.area}</span></div>
        <h3 className="truncate font-semibold">{place.name}</h3>
        <p className="mt-2 flex min-h-5 items-center gap-1.5 text-xs font-medium text-emerald-800"><BadgeCheck className="h-3.5 w-3.5 shrink-0" />{place.offer}</p>
        <span className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 text-sm font-semibold transition hover:border-neutral-900 hover:bg-neutral-900 hover:text-white">Explore <ArrowRight className="h-4 w-4" /></span>
      </div>
    </motion.article>
    </Link>
  );
}

function getIcon(name: string): LucideIcon {
  const Icon = (Icons as unknown as Record<string, LucideIcon>)[name];
  return Icon || Icons.Wrench;
}

export default function Home() {
  const { user, setShowAuthModal } = useAuth();
  const [location, setLocation] = useState<UserLocation | null>({ locality: 'Kathmandu' });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [catalogNotice, setCatalogNotice] = useState<string | null>(null);
  const [providerNotice, setProviderNotice] = useState<string | null>(null);
  const [providerCache, setProviderCache] = useState<Record<string, Provider[]>>({});
  const [activeTab, setActiveTab] = useState('discover');
  const [discoveryTab, setDiscoveryTab] = useState<DiscoveryTab>('For You');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [priceTier, setPriceTier] = useState(0);
  const [ratingOnly, setRatingOnly] = useState(false);
  const [outdoorOnly, setOutdoorOnly] = useState(false);

  useEffect(() => {
    const syncCategoryFromUrl = () => {
      const slug = new URLSearchParams(window.location.search).get('category') || '';
      setDiscoveryTab(categoriesBySlug[slug] || 'For You');
    };
    syncCategoryFromUrl();
    window.addEventListener('popstate', syncCategoryFromUrl);
    return () => window.removeEventListener('popstate', syncCategoryFromUrl);
  }, []);

  useEffect(() => {
    const openSearchOnSlash = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName || '');
      if (event.key === '/' && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', openSearchOnSlash);
    return () => window.removeEventListener('keydown', openSearchOnSlash);
  }, []);

  useEffect(() => {
    let active = true;
    getMarketplaceCatalog().then((catalog) => {
      if (!active) return;
      setCategories(catalog.categories);
      setServices(catalog.services);
      setCatalogNotice(catalog.notice);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (services.length === 0) return;
    const loadProviders = async () => {
      const cache: Record<string, Provider[]> = {};
      try {
        for (const s of services) {
          const providers = await getProvidersForService(s.id, location?.lat, location?.lng, 10);
          cache[s.id] = location && location.lat === undefined
            ? providers.filter((provider) => [provider.city, provider.locality, provider.address]
              .some((area) => area?.toLowerCase().includes(location.locality.toLowerCase())))
            : providers;
        }
        setProviderCache(cache);
        setProviderNotice(null);
      } catch (error) {
        const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unavailable';
        setProviderNotice(`Firebase could not load provider availability (${code}). Services are still shown, but provider counts may be unavailable.`);
      }
    };
    loadProviders();
  }, [services, location]);

  const selectDiscoveryTab = (tab: DiscoveryTab) => {
    setDiscoveryTab(tab);
    setSelectedSubcategory(null);
    setSelectedCategory(null);
    setPriceTier(0);
    setRatingOnly(false);
    setOutdoorOnly(false);
    setActiveTab('discover');

    const params = new URLSearchParams(window.location.search);
    if (tab === 'For You') params.delete('category');
    else params.set('category', categorySlugs[tab]);
    const query = params.toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.pushState({ category: tab }, '', url);
    }
  };

  const filteredServices = services.filter((s) => {
    if (selectedCategory && s.category_id !== selectedCategory) return false;
    if (discoveryTab !== 'For You' && discoveryTab !== 'Repairs') return false;
    if (discoveryTab === 'Repairs' && selectedSubcategory && serviceSubcategoryIds[selectedSubcategory] && s.category_id !== serviceSubcategoryIds[selectedSubcategory]) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q) || (s.category?.name || '').toLowerCase().includes(q);
    }
    return true;
  });

  const filteredPlaces = localPlaces.filter((place) => {
    if (discoveryTab !== 'For You' && place.type !== discoveryTab) return false;
    if (selectedSubcategory && place.subcategory !== selectedSubcategory) return false;
    if (searchQuery && !`${place.name} ${place.category} ${place.area}`.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (discoveryTab === 'Dining' && priceTier > 0 && place.priceTier !== priceTier) return false;
    if (discoveryTab === 'Dining' && ratingOnly && Number(place.rating) < 4.5) return false;
    if (discoveryTab === 'Dining' && outdoorOnly && !place.outdoorSeating) return false;
    return true;
  });

  const searchSuggestions: SearchSuggestion[] = [
    ...localPlaces.map((place) => ({
      name: place.name,
      subtitle: `${place.type === 'Activities' ? 'Activities & Salon' : place.type === 'Repairs' ? 'Repairs & Services' : place.type} · ${place.area}`,
      category: place.type as SearchSuggestion['category'],
      image: photoUrl(place.image, 160),
    })),
    ...services.map((service) => ({
      name: service.name,
      subtitle: `Instant ${service.category?.name || 'home service'} · 30m dispatch`,
      category: 'Repairs' as const,
      image: service.image_url || photoUrl('photo-1581578731548-c64695cc6952', 160),
    })),
  ];

  const selectSuggestion = (suggestion: SearchSuggestion) => {
    selectDiscoveryTab(suggestion.category);
    setSearchQuery(suggestion.name);
    setIsSearchOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-white/95 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800 text-white">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-none tracking-tight">Kehi</h1>
                <p className="mt-1 text-[10px] font-medium text-emerald-800">Local Gateway</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={() => window.open(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/provider/`, '_blank')} className="hidden items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900 sm:flex">
                List your shop <ArrowRight className="h-4 w-4" />
              </button>
              {user && <span className="hidden text-xs text-muted-foreground sm:block">{user.email}</span>}
              <button
                onClick={() => user ? setActiveTab('bookings') : setShowAuthModal(true)}
                aria-label={user ? 'Open my bookings' : 'Sign in'}
                className="grid h-10 w-10 place-items-center rounded-full border border-border transition-colors hover:bg-secondary"
              >
                <UserRound className="h-4 w-4" />
              </button>
            </div>
          </div>
          <LocationBar
            location={location}
            onLocationChange={setLocation}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearchOpen={() => setIsSearchOpen(true)}
            searchPlaceholder="Search stores, cafes, salons, or AC repair..."
          />
          <nav aria-label="Explore categories" className="scrollbar-hide -mb-1 mt-3 flex gap-2 overflow-x-auto pb-1">
            {discoveryTabs.map(({ label, icon: Icon }) => <button key={label} onClick={() => selectDiscoveryTab(label)} aria-pressed={discoveryTab === label} className={cn('flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors sm:text-sm', discoveryTab === label ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-neutral-200 bg-white text-neutral-700 hover:border-emerald-800/40')}><Icon className="h-4 w-4" />{label === 'Repairs' ? 'Repairs & Services' : label === 'Activities' ? 'Activities & Salon' : label}</button>)}
            <button onClick={() => setActiveTab('bookings')} className={cn('ml-auto flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold sm:px-3.5 sm:text-sm', activeTab === 'bookings' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-700')}><CheckCircle2 className="h-4 w-4" />My bookings</button>
          </nav>
        </div>
      </header>

      <div className="w-full">
        {activeTab === 'discover' && <>
          <FeaturedCarousel activeCategory={discoveryTab} onSelect={selectDiscoveryTab} />
          <DiscoveryCategoryGrid
            activeCategory={discoveryTab}
            selectedSubcategory={selectedSubcategory}
            onCategorySelect={selectDiscoveryTab}
            onSubcategorySelect={setSelectedSubcategory}
          />
        </>}
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 overflow-x-hidden px-4 pb-12">
        {activeTab === 'discover' && (
          <div className="space-y-6">
            {catalogNotice && (
              <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                {catalogNotice}
              </div>
            )}
            {providerNotice && (
              <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                {providerNotice}
              </div>
            )}
            {discoveryTab === 'Repairs' && <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border',
                  !selectedCategory ? 'bg-foreground text-background border-foreground' : 'bg-card border-border hover:border-foreground/30',
                )}
              >
                All Services
              </button>
              {categories.map((cat) => {
                const Icon = getIcon(cat.icon);
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border',
                      selectedCategory === cat.id ? 'bg-foreground text-background border-foreground' : 'bg-card border-border hover:border-foreground/30',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {cat.name}
                  </button>
                );
              })}
            </div>}

            {discoveryTab === 'Dining' && <div className="flex flex-wrap items-center gap-2" aria-label="Dining filters">
              <span className="mr-1 text-xs font-semibold text-neutral-500">Price</span>
              {[{ label: 'Any price', value: 0 }, { label: 'Under NPR 1,000', value: 1 }, { label: 'NPR 1,000–2,000', value: 2 }, { label: 'NPR 2,000+', value: 3 }].map((option) => <button key={option.value} type="button" aria-pressed={priceTier === option.value} onClick={() => setPriceTier(option.value)} className={cn('rounded-full border px-3 py-1.5 text-xs font-medium transition-colors', priceTier === option.value ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-neutral-200 bg-white hover:bg-neutral-50')}>{option.label}</button>)}
              <button type="button" aria-pressed={ratingOnly} onClick={() => setRatingOnly((value) => !value)} className={cn('rounded-full border px-3 py-1.5 text-xs font-medium transition-colors', ratingOnly ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-neutral-200 bg-white hover:bg-neutral-50')}>★ 4.5+</button>
              <button type="button" aria-pressed={outdoorOnly} onClick={() => setOutdoorOnly((value) => !value)} className={cn('rounded-full border px-3 py-1.5 text-xs font-medium transition-colors', outdoorOnly ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-neutral-200 bg-white hover:bg-neutral-50')}>Outdoor seating</button>
            </div>}

            {discoveryTab === 'Repairs' && <div className="flex flex-wrap gap-2 text-xs font-medium text-emerald-900">
              <span className="rounded-full bg-emerald-50 px-3 py-1.5">Upfront pricing</span>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5">Instant dispatch</span>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5">Escrow protected</span>
            </div>}

            {discoveryTab !== 'Repairs' && (
              <section className="scroll-mt-36 py-5" id="discover">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div><p className="mb-1 text-xs font-semibold uppercase tracking-widest text-emerald-700">{discoveryTab === 'For You' ? 'Picked for your neighborhood' : `Discover ${discoveryTab === 'Activities' ? 'Activities & Salon' : discoveryTab}`}</p><h2 className="text-2xl font-bold">{discoveryTab === 'For You' ? 'Popular Nearby in Kathmandu' : `Popular ${discoveryTab === 'Activities' ? 'Activities & Salon' : discoveryTab} Nearby`}</h2></div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">{filteredPlaces.length + filteredServices.length} places</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {filteredPlaces.map((place) => <LocalListingCard key={place.name} place={place} />)}
                  {filteredPlaces.length === 0 && <p className="col-span-full py-10 text-center text-sm text-neutral-500">No places match these filters. Try another subcategory or search.</p>}
                </div>
              </section>
            )}

            {discoveryTab === 'Repairs' || discoveryTab === 'For You' ? <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">
                  {selectedCategory ? categories.find((c) => c.id === selectedCategory)?.name : discoveryTab === 'Repairs' ? 'Home repairs & services' : 'Trusted services nearby'}
                </h3>
                <span className="text-sm text-muted-foreground">{filteredServices.length} services</span>
              </div>
              {filteredServices.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Wrench className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No services match your search.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredServices.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      providers={providerCache[service.id] || []}
                      userLat={location?.lat}
                      userLng={location?.lng}
                    />
                  ))}
                </div>
              )}
            </div>
            : null}
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">My Bookings</h3>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" /> Escrow protected
              </span>
            </div>
            <BookingsList refreshTrigger={0} />
          </div>
        )}
      </main>

      <Footer />
      <SearchModal
        open={isSearchOpen}
        query={searchQuery}
        location={location?.locality || 'Kathmandu'}
        suggestions={searchSuggestions}
        onQueryChange={setSearchQuery}
        onClose={() => setIsSearchOpen(false)}
        onSelect={selectSuggestion}
      />

    </div>
  );
}
