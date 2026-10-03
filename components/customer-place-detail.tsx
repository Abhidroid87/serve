'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { createMarketplaceOrder, findVerifiedMerchantId, subscribePublicMerchantCatalog } from '@/lib/marketplace-data';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  Star,
  Users,
  X,
} from 'lucide-react';
import type { CustomerPlace } from '@/lib/customer-places';

interface CustomerPlaceDetailProps {
  place: CustomerPlace;
}

interface CatalogItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  image: string;
  dietary?: 'Veg' | 'Non-veg';
  spicy?: boolean;
  unitOptions?: string[];
  wasPrice?: number;
  outOfStock?: boolean;
}

interface CartLine {
  item: CatalogItem;
  quantity: number;
  unit: string;
}

interface BookingChoice {
  title: string;
  description: string;
  price: number;
}

const menuItems: CatalogItem[] = [
  { id: 'latte', name: 'Himalayan honey latte', description: 'Double espresso, local honey, and silky steamed milk.', category: 'Featured Items', price: 340, image: 'photo-1461023058943-07fcbe16d735', dietary: 'Veg' },
  { id: 'avocado-toast', name: 'Avocado sourdough toast', description: 'Smashed avocado, garden herbs, and toasted sourdough.', category: 'Featured Items', price: 480, image: 'photo-1525351484163-7529414344d8', dietary: 'Veg' },
  { id: 'chicken-bowl', name: 'Herb grilled chicken bowl', description: 'Grilled chicken with herbs, served with dipping sauce.', category: 'Most Popular Items', price: 620, image: 'photo-1546069901-ba9599a7e63c', dietary: 'Non-veg' },
  { id: 'momo', name: 'Steamed chicken momo', description: 'Hand-folded dumplings with tomato sesame achar.', category: 'Most Popular Items', price: 390, image: 'photo-1563245372-f21724e3856d', dietary: 'Non-veg', spicy: true },
  { id: 'matcha', name: 'Iced matcha', description: 'Ceremonial matcha shaken with your choice of milk.', category: 'Beverages', price: 360, image: 'photo-1515823064-d6e0c04616a7', dietary: 'Veg' },
  { id: 'lemonade', name: 'Fresh mint lemonade', description: 'Freshly squeezed lemon, mint, and a little sparkle.', category: 'Beverages', price: 240, image: 'photo-1513558161293-cdaf765edfd7', dietary: 'Veg' },
];

const groceryItems: CatalogItem[] = [
  { id: 'apples', name: 'Washington apples', description: 'Crisp, sweet apples · Himalayan Harvest', category: 'Fresh Veggies', price: 180, wasPrice: 220, image: 'photo-1560806887-1e4cd0b6cbd6', unitOptions: ['1 kg', '500 g', '1 piece'] },
  { id: 'onions', name: 'Farm fresh onions', description: 'Locally grown red onions · Fresh Fields', category: 'Fresh Veggies', price: 95, image: 'photo-1508747703725-719777637510', unitOptions: ['1 kg', '500 g'], outOfStock: true },
  { id: 'milk', name: 'Whole milk', description: 'Fresh dairy milk · Kathmandu Dairy', category: 'Dairy & Bread', price: 110, image: 'photo-1563636619-e9143da7973b', unitOptions: ['1 litre', '500 ml'] },
  { id: 'bread', name: 'Multigrain loaf', description: 'Freshly baked with local grains · Daily Bake', category: 'Dairy & Bread', price: 160, wasPrice: 190, image: 'photo-1509440159596-0249088772ff', unitOptions: ['1 pack'] },
  { id: 'chips', name: 'Himalayan sea salt chips', description: 'A crunchy, locally made snack.', category: 'Snacks', price: 90, image: 'photo-1566478989037-eec170784d0b', unitOptions: ['1 pack', '3 pack'] },
  { id: 'soap', name: 'Lemongrass dish soap', description: 'Plant-based household essential.', category: 'Household', price: 210, image: 'photo-1600857544200-b2f666a9a2ec', unitOptions: ['500 ml', '1 litre'] },
];

const salonChoices: BookingChoice[] = [
  { title: 'Signature hair spa', description: 'Nourishing wash, scalp massage, and finish · 60 min', price: 1800 },
  { title: 'Beard styling', description: 'Precision trim and hot towel finish · 35 min', price: 900 },
  { title: 'Deep tissue massage', description: 'A restorative full-body treatment · 75 min', price: 2800 },
  { title: 'Bridal makeup', description: 'Consultation and event-ready makeup · 120 min', price: 6500 },
];

const fitnessPasses: BookingChoice[] = [
  { title: 'Day Pass', description: 'Full access to the studio for one day.', price: 800 },
  { title: 'Monthly Pro', description: 'Unlimited access + one personal trainer consult.', price: 4500 },
  { title: 'Quarterly VIP', description: 'Full access, locker, sauna, and guest passes.', price: 11500 },
  { title: 'Annual VIP', description: 'A full year of access, locker, sauna, and guest passes.', price: 39000 },
];

const classes: BookingChoice[] = [
  { title: 'Morning flow · 7:00 AM', description: 'Yoga with Anisha · 8 spots left', price: 650 },
  { title: 'Lunch break HIIT · 12:30 PM', description: 'HIIT with Kiran · 5 spots left', price: 700 },
  { title: 'Evening slow flow · 5:30 PM', description: 'Yoga with Anisha · 6 spots left', price: 650 },
];

const repairChoices: BookingChoice[] = [
  { title: 'Appliance diagnostic visit', description: 'On-site inspection and upfront repair quote.', price: 350 },
  { title: 'AC servicing', description: 'Cleaning, performance check, and maintenance.', price: 1200 },
  { title: 'Refrigerator repair', description: 'Technician visit with a clear estimate before work.', price: 500 },
];

const diningCategories = ['Featured Items', 'Most Popular Items', 'Beverages'];
const groceryCategories = ['All', 'Fresh Veggies', 'Dairy & Bread', 'Snacks', 'Household'];
const timeSlots = ['10:00 AM', '11:30 AM', '02:00 PM', '04:30 PM', '06:00 PM'];
const staff = ['Any available stylist', 'Maya · Senior stylist', 'Aarav · Wellness therapist'];
const currency = (amount: number) => `NPR ${amount.toLocaleString('en-IN')}`;
const imageUrl = (image: string, width = 900) =>
  image.startsWith('https://') ? image : `https://images.unsplash.com/${image}?auto=format&fit=crop&w=${width}&q=85`;

function todayAtMidnight() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function prettyDate(value: string) {
  if (!value) return 'Choose a date';
  return new Date(`${value}T12:00:00`).toLocaleDateString('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function PlaceHeader({ place }: { place: CustomerPlace }) {
  const hero = imageUrl(place.image, 1800);
  return (
    <>
      <div className="relative h-56 overflow-hidden rounded-[1.75rem] bg-neutral-200 sm:h-80 lg:h-[25rem]">
        <Image src={hero} alt={place.name} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/10" />
        <Link href="/" aria-label="Back to marketplace" className="absolute left-4 top-4 flex h-10 items-center gap-2 rounded-full bg-white/95 px-3.5 text-sm font-semibold shadow-sm transition hover:bg-white">
          <ArrowLeft className="h-4 w-4" /> Marketplace
        </Link>
        <div className="absolute inset-x-5 bottom-5 text-white sm:inset-x-8 sm:bottom-8">
          <span className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold backdrop-blur">{place.category}</span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">{place.name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">{place.description}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-neutral-200 py-5 text-sm">
        <span className="flex items-center gap-1.5 font-semibold"><Star className="h-4 w-4 fill-amber-400 text-amber-500" />{place.rating}<span className="font-normal text-neutral-500">({place.reviews} reviews)</span></span>
        <span className="flex items-center gap-1.5 text-neutral-600"><MapPin className="h-4 w-4" />{place.area}<span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs">1.2 km</span></span>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Open until 10:00 PM</span>
        <span className="ml-auto hidden items-center gap-1.5 text-xs text-neutral-500 sm:flex"><BadgeCheck className="h-4 w-4 text-emerald-700" />Locally loved</span>
      </div>
    </>
  );
}

function DatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [month, setMonth] = useState(() => {
    const initial = new Date();
    initial.setDate(1);
    return initial;
  });
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const todayValue = toDateValue(todayAtMidnight());

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month" className="grid h-8 w-8 place-items-center rounded-full hover:bg-neutral-100"><ChevronLeft className="h-4 w-4" /></button>
        <p className="text-sm font-semibold">{month.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</p>
        <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month" className="grid h-8 w-8 place-items-center rounded-full hover:bg-neutral-100"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-neutral-400">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <span key={day} className="py-1">{day}</span>)}
        {Array.from({ length: firstDay }, (_, index) => <span key={`blank-${index}`} />)}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const date = new Date(month.getFullYear(), month.getMonth(), day);
          const dateValue = toDateValue(date);
          const disabled = dateValue < todayValue || date.getDay() === 0;
          return (
            <button
              type="button"
              key={dateValue}
              disabled={disabled}
              aria-pressed={value === dateValue}
              onClick={() => onChange(dateValue)}
              className={`mx-auto grid h-9 w-9 place-items-center rounded-full text-sm transition ${value === dateValue ? 'bg-neutral-900 font-semibold text-white' : disabled ? 'cursor-not-allowed text-neutral-300' : 'hover:bg-emerald-50'}`}
            >
              {day}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-neutral-400">Sundays are unavailable</p>
    </div>
  );
}

function QuantityControl({ quantity, onChange, dark = false }: { quantity: number; onChange: (quantity: number) => void; dark?: boolean }) {
  return quantity > 0 ? (
    <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }} className={`flex h-9 items-center gap-3 rounded-full px-2 ${dark ? 'bg-white text-neutral-900' : 'bg-emerald-800 text-white'}`}>
      <button type="button" aria-label="Decrease quantity" onClick={() => onChange(quantity - 1)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-black/10"><Minus className="h-3.5 w-3.5" /></button>
      <motion.span key={quantity} initial={{ y: -4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="min-w-3 text-center text-sm font-bold">{quantity}</motion.span>
      <button type="button" aria-label="Increase quantity" onClick={() => onChange(quantity + 1)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-black/10"><Plus className="h-3.5 w-3.5" /></button>
    </motion.div>
  ) : (
    <button type="button" onClick={() => onChange(1)} className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition ${dark ? 'bg-white text-neutral-900 hover:bg-neutral-100' : 'bg-emerald-800 text-white hover:bg-emerald-900'}`}>
      <Plus className="h-4 w-4" /> Add
    </button>
  );
}

export function CustomerPlaceDetail({ place }: CustomerPlaceDetailProps) {
  const { user, setShowAuthModal } = useAuth();
  const [liveCatalog, setLiveCatalog] = useState<CatalogItem[] | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [unitSelections, setUnitSelections] = useState<Record<string, string>>({});
  const [category, setCategory] = useState('All');
  const [diningMode, setDiningMode] = useState<'order' | 'table'>('order');
  const [guestCount, setGuestCount] = useState('2');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedStaff, setSelectedStaff] = useState(staff[0]);
  const [isClassReservation, setIsClassReservation] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<BookingChoice | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>('delivery');
  const [checkoutError, setCheckoutError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [orderReference, setOrderReference] = useState('');
  const [notified, setNotified] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setLiveCatalog(null);
    return subscribePublicMerchantCatalog(
      place.name,
      (items) => setLiveCatalog(items.map((item) => ({
        id: item.id,
        name: item.title,
        description: item.description,
        category: 'Merchant catalog',
        price: item.price,
        image: item.imageUrl,
        outOfStock: !item.inStock,
      }))),
      (error) => setCatalogError(error.message),
    );
  }, [place.name]);

  const isTableReservation = place.type === 'dining' && diningMode === 'table';
  const isBooking = place.type === 'salon_spa' || place.type === 'home_service' || isTableReservation || isClassReservation;
  const items = liveCatalog?.length ? liveCatalog : place.type === 'retail' ? groceryItems : menuItems;
  const categories = liveCatalog?.length
    ? ['All', 'Merchant catalog']
    : place.type === 'retail' ? groceryCategories : diningCategories;
  const visibleItems = items.filter((item) => category === 'All' || item.category === category);
  const cartLines = Object.values(cart);
  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cartLines.reduce((sum, line) => sum + line.item.price * line.quantity, 0);
  const selectedPrice = selectedChoice?.price ?? 0;
  const isDining = place.type === 'dining';
  const calendarLink = useMemo(() => {
    if (!selectedDate || !selectedTime) return '';
    const parsedTime = selectedTime.match(/(\d+):(\d+)\s(AM|PM)/);
    if (!parsedTime) return '';
    let hour = Number(parsedTime[1]) % 12;
    if (parsedTime[3] === 'PM') hour += 12;
    const start = new Date(`${selectedDate}T00:00:00`);
    start.setHours(hour, Number(parsedTime[2]), 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${selectedChoice?.title || 'Visit'} · ${place.name}`)}&dates=${stamp(start)}/${stamp(end)}&location=${encodeURIComponent(place.area)}`;
  }, [place.area, place.name, selectedChoice?.title, selectedDate, selectedTime]);

  const updateQuantity = (item: CatalogItem, quantity: number) => {
    setCart((current) => {
      const next = { ...current };
      if (quantity <= 0) {
        delete next[item.id];
      } else {
        const defaultUnit = item.unitOptions?.[0] || 'item';
        next[item.id] = { item, quantity, unit: unitSelections[item.id] || current[item.id]?.unit || defaultUnit };
      }
      return next;
    });
  };

  const startCheckout = () => {
    setCheckoutError('');
    setCheckoutOpen(true);
  };

  const confirmPurchase = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      setCheckoutError('Enter your name and phone number to continue.');
      return;
    }
    if (!user) {
      setCheckoutError('Sign in to save this order to your account.');
      setShowAuthModal(true);
      return;
    }

    setIsSubmitting(true);
    setCheckoutError('');
    try {
      const merchantId = await findVerifiedMerchantId(place.name);
      const orderDetails = {
        merchantId,
        merchantName: place.name,
        businessType: place.type,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        totalAmount: actionTotal,
        paymentMethod: place.type === 'home_service' ? 'Escrow' as const : 'COD' as const,
        ...(fulfillment === 'delivery' && customerAddress.trim() ? { customerAddress: customerAddress.trim() } : {}),
        ...(cartCount > 0 ? {
          items: cartLines.map(({ item, quantity, unit }) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            qty: quantity,
            unit,
          })),
          fulfillment,
        } : {}),
        ...(selectedChoice ? { serviceSelected: selectedChoice.title } : {}),
        ...(place.type === 'home_service' && selectedChoice ? {
          serviceType: selectedChoice.title,
          escrowStatus: 'held' as const,
        } : {}),
        ...(selectedDate ? { bookingDate: selectedDate } : {}),
        ...(selectedTime ? { timeSlot: selectedTime } : {}),
        ...(place.type === 'salon_spa' ? { stylist: selectedStaff } : {}),
      };
      const order = await createMarketplaceOrder({
        ...orderDetails,
      });
      setOrderReference(order.orderId);
      setConfirmed(true);
      setCheckoutOpen(false);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Could not save this order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectionReady = isTableReservation
    ? Boolean(selectedDate && selectedTime)
    : isBooking
      ? Boolean(selectedChoice && selectedDate && selectedTime)
    : Boolean(selectedChoice || cartCount > 0);
  const actionTotal = isTableReservation ? 0 : cartCount > 0 ? cartTotal : selectedPrice;
  const actionCount = isTableReservation ? `Table for ${guestCount} guests` : cartCount > 0 ? `${cartCount} ${cartCount === 1 ? 'item' : 'items'}` : selectedChoice?.title || 'Selection';
  const actionLabel = isBooking ? 'Confirm & continue' : cartCount > 0 ? 'View cart & pay' : 'Get this pass';

  return (
    <main className="min-h-screen bg-[#fafaf8] pb-32 text-neutral-900">
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <PlaceHeader place={place} />

        {confirmed ? (
          <OrderConfirmation
            place={place}
            reference={orderReference}
            isBooking={isBooking}
            date={selectedDate}
            time={selectedTime}
            calendarLink={calendarLink}
            total={actionTotal}
          />
        ) : (
          <>
            {isDining && (
              <div className="mt-7 flex w-fit rounded-full border border-neutral-200 bg-white p-1">
                <button type="button" onClick={() => { setDiningMode('order'); setSelectedChoice(null); setSelectedDate(''); setSelectedTime(''); }} aria-pressed={diningMode === 'order'} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${diningMode === 'order' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}>Delivery / takeaway</button>
                <button type="button" onClick={() => { setDiningMode('table'); setCart({}); setSelectedChoice({ title: 'Table reservation', description: `Table for ${guestCount} guests`, price: 0 }); }} aria-pressed={diningMode === 'table'} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${diningMode === 'table' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}>Book a table</button>
              </div>
            )}

            {isDining && diningMode === 'table' ? (
              <section className="mt-8 grid gap-6 rounded-3xl border border-neutral-200 bg-white p-5 sm:p-8 lg:grid-cols-[1fr_1fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">A table for your occasion</p>
                  <h2 className="mt-2 text-2xl font-bold">Book a table</h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">Choose a date, time, and party size. We’ll hold your request for the restaurant to confirm.</p>
                  <label className="mt-6 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4" />Guests</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {['1', '2', '4', '6+'].map((count) => <button key={count} type="button" onClick={() => { setGuestCount(count); setSelectedChoice({ title: 'Table reservation', description: `Table for ${count} guests`, price: 0 }); }} aria-pressed={guestCount === count} className={`rounded-full border px-4 py-2 text-sm font-medium ${guestCount === count ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 hover:border-neutral-500'}`}>{count}</button>)}
                  </div>
                  <div className="mt-6">
                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4" />Available times</p>
                    <TimeChoices selected={selectedTime} onSelect={setSelectedTime} />
                  </div>
                </div>
                <div><p className="mb-2 flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4" />Choose a date</p><DatePicker value={selectedDate} onChange={setSelectedDate} /></div>
              </section>
            ) : place.type === 'retail' || (isDining && diningMode === 'order') ? (
              <section className="mt-9">
                {catalogError && <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Live merchant catalog could not be loaded: {catalogError}. Showing sample items instead.</p>}
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                  <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">{place.type === 'retail' ? 'Shop local' : 'Made fresh for you'}</p><h2 className="mt-1 text-2xl font-bold sm:text-3xl">{place.type === 'retail' ? 'Everyday favorites' : 'Explore the menu'}</h2></div>
                  <p className="text-sm text-neutral-500">{place.type === 'retail' ? 'Local delivery · Usually in 30–45 min' : 'Prepared fresh · Pickup in about 20 min'}</p>
                </div>
                {place.type === 'dining' && <div className="mt-5 rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-950"><strong>Savory & satisfying:</strong> enjoy 15% off selected favorites with your next order.</div>}
                <div className="scrollbar-hide mt-5 flex gap-2 overflow-x-auto pb-2">
                  {categories.map((entry) => <button key={entry} type="button" onClick={() => setCategory(entry)} aria-pressed={category === entry} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${category === entry ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white hover:border-neutral-500'}`}>{entry}</button>)}
                </div>
                <div className={place.type === 'dining' ? 'mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'mt-4 grid gap-3 lg:grid-cols-2'}>
                  {visibleItems.map((item) => {
                    const quantity = cart[item.id]?.quantity || 0;
                    const unit = unitSelections[item.id] || item.unitOptions?.[0] || 'item';
                    return (
                      <article key={item.id} className={`overflow-hidden rounded-2xl border bg-white transition-shadow hover:shadow-md ${item.outOfStock ? 'border-neutral-200 opacity-70' : 'border-neutral-200'}`}>
                        <div className={place.type === 'dining' ? 'relative aspect-[4/3] overflow-hidden bg-neutral-100' : 'flex gap-3 p-3 sm:items-center sm:gap-4'}>
                          {place.type === 'dining' && <Image src={imageUrl(item.image, 720)} alt={item.name} fill sizes="(max-width: 640px) 100vw, 25vw" className="object-cover" />}
                          {place.type === 'retail' && <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-100 sm:h-28 sm:w-28"><Image src={imageUrl(item.image, 320)} alt={item.name} fill sizes="112px" className="object-cover" /></div>}
                          <div className={place.type === 'dining' ? 'p-4' : 'min-w-0 flex-1'}>
                            <div className="flex items-start justify-between gap-2">
                              <div><p className="text-[11px] font-medium text-neutral-400">{place.type === 'retail' ? item.description.split('·')[1]?.trim() || 'Local favorite' : item.category}</p><h3 className="mt-1 font-semibold leading-snug">{item.name}</h3></div>
                              <span className="flex shrink-0 flex-wrap justify-end gap-1">{item.dietary && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800">{item.dietary}</span>}{item.spicy && <span className="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-semibold text-orange-800">Spicy</span>}</span>
                              {item.outOfStock && <span className="shrink-0 rounded-full bg-red-50 px-2 py-1 text-[9px] font-bold text-red-700">OUT OF STOCK</span>}
                            </div>
                            <p className="mt-1.5 text-xs leading-5 text-neutral-500">{place.type === 'retail' ? item.description.split('·')[0].trim() : item.description}</p>
                            {item.unitOptions && <select aria-label={`Choose size for ${item.name}`} value={unit} onChange={(event) => {
                              const nextUnit = event.target.value;
                              setUnitSelections((current) => ({ ...current, [item.id]: nextUnit }));
                              if (cart[item.id]) setCart((current) => ({ ...current, [item.id]: { ...current[item.id], unit: nextUnit } }));
                            }} className="mt-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium">{item.unitOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>}
                            <div className="mt-3 flex items-center justify-between gap-2">
                              <div className="flex items-baseline gap-2"><span className="font-bold">{currency(item.price)}</span>{item.wasPrice && <del className="text-xs text-neutral-400">{currency(item.wasPrice)}</del>}</div>
                              {item.outOfStock
                                ? <button type="button" onClick={() => setNotified((current) => ({ ...current, [item.id]: true }))} disabled={notified[item.id]} className="rounded-full border border-neutral-300 px-3 py-2 text-xs font-semibold disabled:border-emerald-200 disabled:bg-emerald-50 disabled:text-emerald-800">{notified[item.id] ? 'Demo reminder set' : 'Notify me'}</button>
                                : <QuantityControl quantity={quantity} onChange={(next) => updateQuantity(item, next)} />}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : place.type === 'salon_spa' ? (
              <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.85fr)]">
                <div className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">Your visit, your way</p>
                  <h2 className="mt-2 text-2xl font-bold">Choose a service</h2>
                  <div className="mt-4 grid gap-2">
                    {salonChoices.map((choice) => <ChoiceCard key={choice.title} choice={choice} selected={selectedChoice?.title === choice.title} onSelect={() => setSelectedChoice(choice)} />)}
                  </div>
                  <label className="mt-6 block text-sm font-semibold" htmlFor="stylist">Choose your stylist</label>
                  <select id="stylist" value={selectedStaff} onChange={(event) => setSelectedStaff(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm">{staff.map((member) => <option key={member}>{member}</option>)}</select>
                  <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-900"><ShieldCheck className="mr-1 inline h-4 w-4" />A small deposit secures your appointment. Remaining balance is paid at the salon.</p>
                </div>
                <div className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-7">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4" />Pick a date</h3>
                  <DatePicker value={selectedDate} onChange={setSelectedDate} />
                  <h3 className="mb-3 mt-6 flex items-center gap-2 font-semibold"><Clock className="h-4 w-4" />Available time slots</h3>
                  <TimeChoices selected={selectedTime} onSelect={setSelectedTime} />
                </div>
              </section>
            ) : place.type === 'fitness_activity' ? (
              <section className="mt-9">
                <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">Find your rhythm</p><h2 className="mt-1 text-2xl font-bold sm:text-3xl">Passes & memberships</h2></div>
                <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {fitnessPasses.map((choice, index) => <article key={choice.title} className={`rounded-3xl border bg-white p-5 sm:p-6 ${selectedChoice?.title === choice.title ? 'border-emerald-800 ring-2 ring-emerald-800/10' : 'border-neutral-200'}`}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">{['Drop in', 'Most popular', 'Best value', 'Annual membership'][index]}</p>
                    <h3 className="mt-2 text-xl font-bold">{choice.title}</h3>
                    <p className="mt-2 min-h-10 text-sm leading-5 text-neutral-500">{choice.description}</p>
                    <p className="mt-5 text-2xl font-bold">{currency(choice.price)}<span className="text-xs font-normal text-neutral-400">{[' / day', ' / month', ' / quarter', ' / year'][index]}</span></p>
                    <ul className="mt-5 space-y-2 text-sm text-neutral-600">{['Access to all facilities', 'Flexible class schedule', 'Friendly expert coaches'].slice(0, index + 2).map((feature) => <li key={feature} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-700" />{feature}</li>)}</ul>
                    <button type="button" onClick={() => { setIsClassReservation(false); setSelectedChoice(choice); }} aria-pressed={selectedChoice?.title === choice.title} className={`mt-6 h-11 w-full rounded-full text-sm font-semibold transition ${selectedChoice?.title === choice.title ? 'bg-emerald-800 text-white' : 'border border-neutral-200 hover:border-neutral-900'}`}>{selectedChoice?.title === choice.title ? 'Selected' : 'Get this pass'}</button>
                  </article>)}
                </div>
                <div className="mt-9 rounded-3xl border border-neutral-200 bg-white p-5 sm:p-7">
                  <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">Move together</p><h3 className="mt-1 text-xl font-bold">This week’s classes</h3></div><span className="text-xs text-neutral-500">Reserve a spot</span></div>
                  <div className="mt-4 divide-y divide-neutral-100">{classes.map((choice) => <div key={choice.title} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{choice.title}</p><p className="mt-1 text-sm text-neutral-500">{choice.description}</p></div><button type="button" onClick={() => { setIsClassReservation(true); setSelectedChoice(choice); setSelectedDate(toDateValue(new Date(Date.now() + 86400000))); setSelectedTime(choice.title.split('·')[1].trim()); }} className="rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold hover:border-neutral-900">Reserve spot · {currency(choice.price)}</button></div>)}</div>
                </div>
              </section>
            ) : (
              <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
                <div className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">Trusted local technicians</p>
                  <h2 className="mt-2 text-2xl font-bold">Get an upfront quote</h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">Choose a service and a convenient visit slot. The diagnostic fee is shown now; approve any repair quote before work begins.</p>
                  <div className="mt-5 space-y-2">{repairChoices.map((choice) => <ChoiceCard key={choice.title} choice={choice} selected={selectedChoice?.title === choice.title} onSelect={() => setSelectedChoice(choice)} />)}</div>
                  <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-900"><ShieldCheck className="h-4 w-4 shrink-0" />Escrow protected · Pay only after you approve the quote</p>
                </div>
                <div className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-7">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4" />Choose a visit date</h3>
                  <DatePicker value={selectedDate} onChange={setSelectedDate} />
                  <h3 className="mb-3 mt-6 flex items-center gap-2 font-semibold"><Clock className="h-4 w-4" />Available arrival windows</h3>
                  <TimeChoices selected={selectedTime} onSelect={setSelectedTime} />
                  <p className="mt-5 text-xs text-neutral-500">A four-digit completion code will be shared after your booking is confirmed.</p>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {!confirmed && selectionReady && (
        <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', damping: 24, stiffness: 260 }} className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[calc(100%-2rem)] max-w-2xl items-center justify-between gap-4 rounded-2xl bg-neutral-900 p-3.5 text-white shadow-2xl sm:bottom-6 sm:p-4">
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{actionCount}</p><p className="mt-0.5 text-xs text-white/65">Total · {currency(actionTotal)}</p></div>
          <button type="button" onClick={startCheckout} className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-neutral-900 transition hover:bg-neutral-100">{actionLabel}<ArrowRight className="h-4 w-4" /></button>
        </motion.div>
      )}

      <AnimatePresence>
        {checkoutOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
            <button type="button" aria-label="Close checkout" onClick={() => setCheckoutOpen(false)} className="absolute inset-0 bg-black/45 backdrop-blur-sm" />
            <motion.section initial={{ y: 45, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 35, opacity: 0 }} transition={{ type: 'spring', damping: 26, stiffness: 280 }} role="dialog" aria-modal="true" aria-labelledby="checkout-heading" className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-neutral-200 bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">{isBooking ? 'Almost there' : 'Secure checkout'}</p><h2 id="checkout-heading" className="mt-1 text-2xl font-bold">{isBooking ? 'Confirm your selection' : cartCount ? 'Review your cart' : 'Get your pass'}</h2></div><button type="button" onClick={() => setCheckoutOpen(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-neutral-100"><X className="h-4 w-4" /></button></div>
              {cartCount > 0 && <div className="mt-5 divide-y divide-neutral-100 rounded-2xl border border-neutral-200 px-4">{cartLines.map((line) => <div key={line.item.id} className="flex items-center justify-between gap-3 py-3 text-sm"><div><p className="font-semibold">{line.item.name}</p><p className="text-xs text-neutral-500">{line.quantity} × {line.unit}</p></div><span className="font-semibold">{currency(line.item.price * line.quantity)}</span></div>)}</div>}
              {selectedChoice && <div className="mt-5 flex items-start justify-between gap-3 rounded-2xl border border-neutral-200 p-4"><div><p className="font-semibold">{selectedChoice.title}</p><p className="mt-1 text-xs text-neutral-500">{selectedChoice.description}</p>{selectedDate && <p className="mt-2 text-xs font-medium text-emerald-800">{prettyDate(selectedDate)} · {selectedTime}{selectedStaff && place.type === 'salon_spa' ? ` · ${selectedStaff}` : ''}</p>}</div><p className="shrink-0 font-semibold">{currency(selectedChoice.price)}</p></div>}
              {cartCount > 0 && <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-neutral-600">Fulfillment<select value={fulfillment} onChange={(event) => setFulfillment(event.target.value as 'delivery' | 'pickup')} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm"><option value="delivery">Delivery</option><option value="pickup">Pickup</option></select></label>{fulfillment === 'delivery' && <label className="text-xs font-semibold text-neutral-600">Delivery address<input value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm" placeholder="Tole / street, city" /></label>}</div>}
              <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-neutral-600">Your name<input autoComplete="name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" placeholder="Full name" /></label><label className="text-xs font-semibold text-neutral-600">Phone number<input autoComplete="tel" type="tel" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" placeholder="+977" /></label></div>
              {checkoutError && <p role="alert" className="mt-3 text-sm text-red-700">{checkoutError}</p>}
              <div className="mt-5 flex items-center justify-between border-t border-neutral-200 pt-4"><span className="text-sm font-medium text-neutral-500">Total due</span><span className="text-xl font-bold">{currency(actionTotal)}</span></div>
              <button type="button" onClick={() => void confirmPurchase()} disabled={isSubmitting} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60"><CheckCircle2 className="h-4 w-4" />{isSubmitting ? 'Saving request…' : isBooking ? 'Confirm booking' : 'Place order'}<span>·</span>{currency(actionTotal)}</button>
              <p className="mt-3 text-center text-[11px] leading-5 text-neutral-400">Demo checkout · No payment is collected and this confirmation is not sent to the merchant.</p>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function ChoiceCard({ choice, selected, onSelect }: { choice: BookingChoice; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} className={`flex w-full items-start justify-between gap-3 rounded-2xl border p-4 text-left transition ${selected ? 'border-emerald-800 bg-emerald-50/60 ring-1 ring-emerald-800/10' : 'border-neutral-200 hover:border-neutral-400'}`}>
      <span><span className="block text-sm font-semibold">{choice.title}</span><span className="mt-1 block text-xs leading-5 text-neutral-500">{choice.description}</span></span>
      <span className="shrink-0 text-sm font-bold">{currency(choice.price)}</span>
    </button>
  );
}

function TimeChoices({ selected, onSelect }: { selected: string; onSelect: (time: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {timeSlots.map((time) => <button key={time} type="button" onClick={() => onSelect(time)} aria-pressed={selected === time} className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${selected === time ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 hover:border-neutral-500'}`}>{time}</button>)}
    </div>
  );
}

function OrderConfirmation({
  place,
  reference,
  isBooking,
  date,
  time,
  calendarLink,
  total,
}: {
  place: CustomerPlace;
  reference: string;
  isBooking: boolean;
  date: string;
  time: string;
  calendarLink: string;
  total: number;
}) {
  const milestones = isBooking
    ? ['Booking requested', 'Provider confirmation', 'Appointment ready']
    : ['Order placed', place.type === 'retail' ? 'Store packing' : 'Kitchen preparing', 'Ready for pickup / delivery', 'Completed'];
  return (
    <section className="mx-auto mt-9 max-w-3xl">
      <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6 text-center sm:p-9">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 12 }} className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-800 text-white"><CheckCircle2 className="h-7 w-7" /></motion.div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Request submitted</p>
        <h2 className="mt-2 text-3xl font-bold">{isBooking ? 'Booking preview' : 'Order preview'}</h2>
        <p className="mt-2 text-sm text-neutral-600">{isBooking ? `${prettyDate(date)} at ${time}` : place.type === 'retail' ? 'Estimated delivery: 30–45 minutes.' : 'Estimated pickup: about 20–30 minutes.'}</p>
        <p className="mt-2 text-xs text-neutral-500">Your request was saved to Kehi. Payment is not collected in this demo.</p>
        <div className="mt-5 inline-flex rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700">Reference <span className="ml-2 font-mono text-emerald-800">{reference}</span></div>
      </div>

      <div className="mt-5 rounded-3xl border border-neutral-200 bg-white p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Status tracker</p><h3 className="mt-1 text-lg font-bold">{isBooking ? 'Booking progress' : 'Order progress'}</h3></div><span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />Request saved</span></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {milestones.map((milestone, index) => <motion.div key={milestone} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.12 }} className="flex items-center gap-3 sm:block">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${index === 0 ? 'bg-emerald-800 text-white' : 'bg-neutral-100 text-neutral-400'}`}>{index === 0 ? <Check className="h-4 w-4" /> : <span className="text-xs font-bold">{index + 1}</span>}</span>
            <span className="text-sm font-medium text-neutral-700 sm:mt-2 sm:block">{milestone}</span>
          </motion.div>)}
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-4 text-sm"><span className="text-neutral-500">Total</span><span className="font-bold">{currency(total)}</span></div>
      </div>

      {isBooking && place.type !== 'dining' && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-neutral-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Your provider</p><div className="mt-4 flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-800">{place.type === 'salon_spa' ? 'M' : 'T'}</div><div><p className="font-semibold">{place.type === 'salon_spa' ? 'Maya · Senior stylist' : 'Local service specialist'}</p><p className="mt-1 flex items-center gap-1 text-xs text-neutral-500"><Star className="h-3 w-3 fill-amber-400 text-amber-500" />4.9 · Verified provider</p></div></div><a href={`https://wa.me/?text=${encodeURIComponent(`Hi ${place.name}, I have a question about ${reference}.`)}`} target="_blank" rel="noreferrer" className="mt-4 flex h-10 items-center justify-center rounded-xl border border-neutral-200 text-sm font-semibold hover:bg-neutral-50">Message provider on WhatsApp</a></div>
          <div className="rounded-3xl border border-neutral-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Appointment details</p><p className="mt-3 font-semibold">{prettyDate(date)}</p><p className="mt-1 text-sm text-neutral-500">{time} · {place.area}</p><div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><ShieldCheck className="h-4 w-4 shrink-0" />Demo completion code <strong className="font-mono">4821</strong></div>{calendarLink && <a href={calendarLink} target="_blank" rel="noreferrer" className="mt-3 flex h-10 items-center justify-center gap-2 rounded-xl bg-neutral-900 text-sm font-semibold text-white hover:bg-neutral-800"><CalendarDays className="h-4 w-4" />Add to Google Calendar</a>}</div>
        </div>
      )}
      {isBooking && place.type === 'dining' && (
        <div className="mt-5 rounded-3xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Table reservation</p>
          <p className="mt-3 font-semibold">{prettyDate(date)} · {time}</p>
          <p className="mt-1 text-sm text-neutral-500">Your reservation request has been sent to {place.name}.</p>
        </div>
      )}
      {!isBooking && <a href={`https://wa.me/?text=${encodeURIComponent(`Hi ${place.name}, I have a question about ${reference}.`)}`} target="_blank" rel="noreferrer" className="mt-5 flex h-12 items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white text-sm font-semibold hover:bg-neutral-50">Have a question? Message {place.name} on WhatsApp<ArrowRight className="h-4 w-4" /></a>}
      <Link href="/" className="mx-auto mt-6 flex w-fit items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900"><ArrowLeft className="h-4 w-4" />Back to the marketplace</Link>
    </section>
  );
}
