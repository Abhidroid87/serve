import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';
import { DEMO_CATEGORIES, DEMO_PROVIDER_AVAILABILITY, DEMO_PROVIDER_SERVICES, DEMO_PROVIDERS, DEMO_SERVICES } from './demo-data';
import type {
  ServiceCategory, Service, Provider, ProviderAvailability,
  Booking, PricingBreakdown, TimeSlot, InstantRequest, Transaction, Review,
} from './types';

// ============ COLLECTIONS ============
const CATEGORIES = 'service_categories';
const SERVICES = 'services';
const PROVIDERS = 'providers';
const PROVIDER_SERVICES = 'provider_services';
const PROVIDER_AVAILABILITY = 'provider_availability';
const BOOKINGS = 'bookings';
const TRANSACTIONS = 'transactions';
const INSTANT_REQUESTS = 'instant_requests';
const REVIEWS = 'reviews';

const DEMO_SERVICE_IMAGES: Record<string, string> = {
  plumbing: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=960&q=80',
  electrical: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=960&q=80',
  carpentry: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=960&q=80',
  cleaning: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=960&q=80',
  hvac: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=960&q=80',
  painting: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=960&q=80',
};

function getDemoServices(): Service[] {
  return DEMO_SERVICES.map((service) => ({
    ...service,
    image_url: service.image_url || DEMO_SERVICE_IMAGES[service.category_id] || null,
    is_sample: true,
    category: DEMO_CATEGORIES.find((category) => category.id === service.category_id),
  }));
}

export interface MarketplaceCatalog {
  categories: ServiceCategory[];
  services: Service[];
  source: 'firestore' | 'sample';
  notice: string | null;
}

export async function getMarketplaceCatalog(): Promise<MarketplaceCatalog> {
  const demoCatalog = (notice: string): MarketplaceCatalog => ({
    categories: DEMO_CATEGORIES,
    services: getDemoServices(),
    source: 'sample',
    notice,
  });

  if (!isFirebaseConfigured()) {
    return demoCatalog('Firebase is not configured. Showing sample trades and indicative prices; bookings are disabled for these examples.');
  }

  try {
    const [categorySnap, serviceSnap] = await Promise.all([
      getDocs(collection(db, CATEGORIES)),
      getDocs(collection(db, SERVICES)),
    ]);
    const categories = categorySnap.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() } as ServiceCategory));
    const services = serviceSnap.docs
      .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() } as Service))
      .filter((service) => service.is_active !== false)
      .map((service) => ({
        ...service,
        category: categories.find((category) => category.id === service.category_id),
      }));

    if (services.length > 0) {
      return { categories: categories.length ? categories : DEMO_CATEGORIES, services, source: 'firestore', notice: null };
    }
    return demoCatalog('Your Firebase catalog has no services yet. Showing sample trades and indicative prices; bookings are disabled for these examples.');
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unavailable';
    return demoCatalog(`Firebase could not load the service catalog (${code}). Showing sample trades and indicative prices; bookings are disabled for these examples.`);
  }
}

// ============ READS ============

export async function getCategories(): Promise<ServiceCategory[]> {
  try {
    const snap = await getDocs(collection(db, CATEGORIES));
    const categories = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceCategory));
    return categories.length > 0 ? categories : DEMO_CATEGORIES;
  } catch (error) {
    return DEMO_CATEGORIES;
  }
}

export async function getAllServices(): Promise<Service[]> {
  try {
    const snap = await getDocs(collection(db, SERVICES));
    const services = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Service));
    if (services.length === 0) {
      return getDemoServices();
    }
    const cats = await getCategories();
    return services.map((s) => ({
      ...s,
      category: cats.find((c) => c.id === s.category_id),
    }));
  } catch (error) {
    return getDemoServices();
  }
}

export async function getServicesByCategory(categoryId?: string, searchQuery?: string): Promise<Service[]> {
  let q;
  if (categoryId) {
    q = query(collection(db, SERVICES), where('category_id', '==', categoryId));
  } else {
    q = collection(db, SERVICES);
  }
  const snap = await getDocs(q);
  let services = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Service));
  const cats = await getCategories();
  services = services.map((s) => ({ ...s, category: cats.find((c) => c.id === s.category_id) }));
  if (searchQuery) {
    const ql = searchQuery.toLowerCase();
    services = services.filter(
      (s) => s.name.toLowerCase().includes(ql) || (s.description || '').toLowerCase().includes(ql),
    );
  }
  return services;
}

export async function getServiceById(id: string): Promise<Service | null> {
  const d = await getDoc(doc(db, SERVICES, id));
  if (!d.exists()) return null;
  return { id: d.id, ...d.data() } as Service;
}

export async function getProvidersForService(
  serviceId: string,
  userLat?: number,
  userLng?: number,
  radiusKm: number = 5,
): Promise<Provider[]> {
  if (!isFirebaseConfigured()) {
    return DEMO_PROVIDER_SERVICES
      .filter((relation) => relation.service_id === serviceId)
      .map((relation) => DEMO_PROVIDERS.find((provider) => provider.id === relation.provider_id))
      .filter((provider): provider is Provider => Boolean(provider));
  }

  try {
    const snap = await getDocs(query(collection(db, PROVIDER_SERVICES), where('service_id', '==', serviceId)));
    const providerIds = snap.docs.map((d) => (d.data() as { provider_id: string }).provider_id);
    if (providerIds.length === 0) {
      const demoProviders = DEMO_PROVIDER_SERVICES
        .filter((ps) => ps.service_id === serviceId)
        .map((ps) => DEMO_PROVIDERS.find((p) => p.id === ps.provider_id))
        .filter((p): p is Provider => Boolean(p));
      return demoProviders;
    }
    const providers: Provider[] = [];
    for (const pid of providerIds) {
      const pd = await getDoc(doc(db, PROVIDERS, pid));
      if (pd.exists()) providers.push({ id: pd.id, ...pd.data() } as Provider);
    }
    if (providers.length === 0) {
      const demoProviders = DEMO_PROVIDER_SERVICES
        .filter((ps) => ps.service_id === serviceId)
        .map((ps) => DEMO_PROVIDERS.find((p) => p.id === ps.provider_id))
        .filter((p): p is Provider => Boolean(p));
      return demoProviders;
    }
    if (userLat !== undefined && userLng !== undefined) {
      return providers.filter((p) => {
        if (p.latitude === null || p.longitude === null) return true;
        const dist = haversineDistance(userLat, userLng, p.latitude, p.longitude);
        return dist <= Math.max(radiusKm, p.service_radius_km);
      });
    }
    return providers;
  } catch (error) {
    const demoProviders = DEMO_PROVIDER_SERVICES
      .filter((ps) => ps.service_id === serviceId)
      .map((ps) => DEMO_PROVIDERS.find((p) => p.id === ps.provider_id))
      .filter((p): p is Provider => Boolean(p));
    return demoProviders;
  }
}

export async function getProviderById(id: string): Promise<Provider | null> {
  const d = await getDoc(doc(db, PROVIDERS, id));
  if (!d.exists()) return null;
  return { id: d.id, ...d.data() } as Provider;
}

export interface ProviderProfileInput {
  name: string;
  business_name: string;
  phone: string;
  address: string;
  city: string;
}

export async function createProviderProfile(
  uid: string,
  email: string,
  profile: ProviderProfileInput,
  serviceIds: string[],
): Promise<Provider> {
  if (serviceIds.length === 0) throw new Error('Choose at least one service to offer.');
  const provider: Omit<Provider, 'id'> = {
    ...profile,
    latitude: null,
    longitude: null,
    email,
    auth_uid: uid,
    avatar_url: null,
    bio: null,
    locality: profile.city,
    service_radius_km: 5,
    is_verified: false,
    is_checked_in: false,
    rating: 0,
    total_reviews: 0,
    total_jobs: 0,
    created_at: new Date().toISOString(),
  };
  const batch = writeBatch(db);
  batch.set(doc(db, PROVIDERS, uid), provider);
  for (const serviceId of serviceIds) {
    batch.set(doc(db, PROVIDER_SERVICES, `${uid}_${serviceId}`), {
      provider_id: uid,
      service_id: serviceId,
      custom_price: null,
    });
  }
  await batch.commit();
  return { id: uid, ...provider };
}

export async function getProviderAvailability(providerId: string): Promise<ProviderAvailability[]> {
  try {
    const snap = await getDocs(query(collection(db, PROVIDER_AVAILABILITY), where('provider_id', '==', providerId)));
    const availability = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProviderAvailability));
    return availability.length > 0 ? availability : DEMO_PROVIDER_AVAILABILITY.filter((slot) => slot.provider_id === providerId);
  } catch (error) {
    return DEMO_PROVIDER_AVAILABILITY.filter((slot) => slot.provider_id === providerId);
  }
}

export async function getProviderServices(providerId: string): Promise<Service[]> {
  try {
    const snap = await getDocs(query(collection(db, PROVIDER_SERVICES), where('provider_id', '==', providerId)));
    const serviceIds = snap.docs.map((d) => (d.data() as { service_id: string }).service_id);
    const services: Service[] = [];
    const demoServices = getDemoServices();
    for (const sid of serviceIds) {
      const sd = await getDoc(doc(db, SERVICES, sid));
      if (sd.exists()) services.push({ id: sd.id, ...sd.data() } as Service);
      else {
        const demo = demoServices.find((service) => service.id === sid);
        if (demo) services.push(demo);
      }
    }
    if (services.length > 0) return services;
    const demoServiceIds = DEMO_PROVIDER_SERVICES.filter((ps) => ps.provider_id === providerId).map((ps) => ps.service_id);
    return demoServices.filter((service) => demoServiceIds.includes(service.id));
  } catch (error) {
    const demoServiceIds = DEMO_PROVIDER_SERVICES.filter((ps) => ps.provider_id === providerId).map((ps) => ps.service_id);
    return getDemoServices().filter((service) => demoServiceIds.includes(service.id));
  }
}

export async function saveProviderServices(providerId: string, serviceIds: string[]): Promise<void> {
  const current = await getDocs(query(collection(db, PROVIDER_SERVICES), where('provider_id', '==', providerId)));
  const batch = writeBatch(db);
  for (const relation of current.docs) batch.delete(relation.ref);
  for (const serviceId of serviceIds) {
    batch.set(doc(db, PROVIDER_SERVICES, `${providerId}_${serviceId}`), {
      provider_id: providerId,
      service_id: serviceId,
      custom_price: null,
    });
  }
  await batch.commit();
}

export async function getBookingsByProvider(providerId: string, serviceIds?: string[]): Promise<Booking[]> {
  const snap = await getDocs(query(collection(db, BOOKINGS), where('provider_id', '==', providerId)));
  const bookings: Booking[] = [];
  for (const b of snap.docs) {
    const booking = { id: b.id, ...b.data() } as Booking;
    if (serviceIds && !serviceIds.includes(booking.service_id)) continue;
    const [pd, sd] = await Promise.all([getDoc(doc(db, PROVIDERS, booking.provider_id)), getDoc(doc(db, SERVICES, booking.service_id))]);
    if (pd.exists()) booking.provider = { id: pd.id, ...pd.data() } as Provider;
    if (sd.exists()) booking.service = { id: sd.id, ...sd.data() } as Service;
    bookings.push(booking);
  }
  return bookings.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

export async function getBookingsByStatus(status: string): Promise<Booking[]> {
  const snap = await getDocs(query(collection(db, BOOKINGS), where('status', '==', status)));
  const bookings: Booking[] = [];
  for (const b of snap.docs) {
    const booking = { id: b.id, ...b.data() } as Booking;
    const [pd, sd] = await Promise.all([getDoc(doc(db, PROVIDERS, booking.provider_id)), getDoc(doc(db, SERVICES, booking.service_id))]);
    if (pd.exists()) booking.provider = { id: pd.id, ...pd.data() } as Provider;
    if (sd.exists()) booking.service = { id: sd.id, ...sd.data() } as Service;
    bookings.push(booking);
  }
  return bookings.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

export async function getBookingById(id: string): Promise<Booking | null> {
  const d = await getDoc(doc(db, BOOKINGS, id));
  if (!d.exists()) return null;
  const booking = { id: d.id, ...d.data() } as Booking;
  const [pd, sd] = await Promise.all([getDoc(doc(db, PROVIDERS, booking.provider_id)), getDoc(doc(db, SERVICES, booking.service_id))]);
  if (pd.exists()) booking.provider = { id: pd.id, ...pd.data() } as Provider;
  if (sd.exists()) booking.service = { id: sd.id, ...sd.data() } as Service;
  return booking;
}

export async function getTransactionByBooking(bookingId: string): Promise<Transaction | null> {
  const snap = await getDocs(query(collection(db, TRANSACTIONS), where('booking_id', '==', bookingId)));
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Transaction;
}

export async function getReviewsForProvider(providerId: string): Promise<Review[]> {
  const snap = await getDocs(query(collection(db, REVIEWS), where('provider_id', '==', providerId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Review));
}

export async function getCheckedInProviders(
  serviceId: string,
  userLat: number,
  userLng: number,
  radiusKm: number = 3,
): Promise<Provider[]> {
  const providers = await getProvidersForService(serviceId);
  return providers
    .filter((p) => p.is_checked_in && p.is_verified)
    .filter((p) => p.latitude !== null && p.longitude !== null && haversineDistance(userLat, userLng, p.latitude, p.longitude) <= radiusKm);
}

export async function getInstantRequestById(id: string): Promise<InstantRequest | null> {
  const d = await getDoc(doc(db, INSTANT_REQUESTS, id));
  if (!d.exists()) return null;
  const req = { id: d.id, ...d.data() } as InstantRequest;
  const sd = await getDoc(doc(db, SERVICES, req.service_id));
  if (sd.exists()) req.service = { id: sd.id, ...sd.data() } as Service;
  if (req.provider_id) {
    const pd = await getDoc(doc(db, PROVIDERS, req.provider_id));
    if (pd.exists()) req.provider = { id: pd.id, ...pd.data() } as Provider;
  }
  return req;
}

export async function getActiveInstantRequests(): Promise<InstantRequest[]> {
  const snap = await getDocs(query(collection(db, INSTANT_REQUESTS), where('status', '==', 'broadcasting')));
  const requests: InstantRequest[] = [];
  for (const d of snap.docs) {
    const req = { id: d.id, ...d.data() } as InstantRequest;
    const sd = await getDoc(doc(db, SERVICES, req.service_id));
    if (sd.exists()) req.service = { id: sd.id, ...sd.data() } as Service;
    requests.push(req);
  }
  return requests.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

export async function getInstantRequestsForProvider(providerId: string): Promise<InstantRequest[]> {
  const psSnap = await getDocs(query(collection(db, PROVIDER_SERVICES), where('provider_id', '==', providerId)));
  const serviceIds = psSnap.docs.map((d) => (d.data() as { service_id: string }).service_id);
  if (serviceIds.length === 0) return [];
  const irSnap = await getDocs(query(collection(db, INSTANT_REQUESTS), where('status', '==', 'broadcasting')));
  const requests: InstantRequest[] = [];
  for (const d of irSnap.docs) {
    const req = { id: d.id, ...d.data() } as InstantRequest;
    if (!serviceIds.includes(req.service_id)) continue;
    const sd = await getDoc(doc(db, SERVICES, req.service_id));
    if (sd.exists()) req.service = { id: sd.id, ...sd.data() } as Service;
    requests.push(req);
  }
  return requests.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

export async function getAllProviders(): Promise<Provider[]> {
  try {
    const snap = await getDocs(collection(db, PROVIDERS));
    const providers = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Provider));
    if (providers.length === 0) return DEMO_PROVIDERS;
    return providers.sort((a, b) => b.rating - a.rating);
  } catch (error) {
    return DEMO_PROVIDERS;
  }
}

export interface ModerationEnquiry {
  id: string;
  source: 'query' | 'booking' | 'instant';
  customerName: string;
  customerPhone: string;
  serviceName: string;
  address: string;
  status: string;
  createdAt: string;
  bookingId?: string;
  assignedProviderId?: string | null;
  serviceId?: string;
}

export interface AdminModerationData {
  providers: Provider[];
  services: Service[];
  bookings: Booking[];
  requests: InstantRequest[];
  enquiries: ModerationEnquiry[];
  providerServiceLinks: { provider_id: string; service_id: string }[];
}

export async function getAdminModerationData(): Promise<AdminModerationData> {
  const [providerSnap, serviceSnap, bookingSnap, requestSnap, querySnap, linkSnap] = await Promise.all([
    getDocs(collection(db, PROVIDERS)),
    getDocs(collection(db, SERVICES)),
    getDocs(collection(db, BOOKINGS)),
    getDocs(collection(db, INSTANT_REQUESTS)),
    getDocs(collection(db, 'queries')),
    getDocs(collection(db, PROVIDER_SERVICES)),
  ]);
  const providers = providerSnap.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() } as Provider));
  const services = serviceSnap.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() } as Service));
  const providersById = new Map(providers.map((provider) => [provider.id, provider]));
  const servicesById = new Map(services.map((service) => [service.id, service]));
  const bookings = bookingSnap.docs.map((snapshot) => {
    const booking = { id: snapshot.id, ...snapshot.data() } as Booking;
    booking.provider = providersById.get(booking.provider_id);
    booking.service = servicesById.get(booking.service_id);
    return booking;
  });
  const requests = requestSnap.docs.map((snapshot) => {
    const request = { id: snapshot.id, ...snapshot.data() } as InstantRequest;
    request.provider = request.provider_id ? providersById.get(request.provider_id) : undefined;
    request.service = servicesById.get(request.service_id);
    return request;
  });
  const queryEnquiries: ModerationEnquiry[] = querySnap.docs.map((snapshot) => {
    const row = snapshot.data();
    const serviceId = String(row.service_id || '');
    return {
      id: snapshot.id,
      source: 'query',
      customerName: String(row.customer_name || row.name || row.full_name || 'Customer'),
      customerPhone: String(row.customer_phone || row.phone || ''),
      serviceName: servicesById.get(serviceId)?.name || String(row.service_name || row.category || 'Service enquiry'),
      address: String(row.customer_address || row.address || ''),
      status: String(row.status || 'new'),
      createdAt: String(row.created_at || ''),
      serviceId,
    };
  });
  const bookingEnquiries: ModerationEnquiry[] = bookings.map((booking) => ({
    id: `booking-${booking.id}`,
    source: 'booking',
    customerName: booking.customer_name,
    customerPhone: booking.customer_phone,
    serviceName: booking.service?.name || 'Service',
    address: booking.customer_address || '',
    status: booking.status,
    createdAt: booking.created_at,
    bookingId: booking.id,
    assignedProviderId: booking.provider_id,
    serviceId: booking.service_id,
  }));
  const requestEnquiries: ModerationEnquiry[] = requests.map((request) => ({
    id: `instant-${request.id}`,
    source: 'instant',
    customerName: request.customer_name,
    customerPhone: request.customer_phone,
    serviceName: request.service?.name || 'Instant service',
    address: request.customer_address || '',
    status: request.status,
    createdAt: request.created_at,
    assignedProviderId: request.provider_id,
    serviceId: request.service_id,
  }));
  const providerServiceLinks = linkSnap.docs.map((snapshot) => ({
    provider_id: String(snapshot.data().provider_id || ''),
    service_id: String(snapshot.data().service_id || ''),
  }));
  const enquiries = [...queryEnquiries, ...bookingEnquiries, ...requestEnquiries]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return { providers, services, bookings, requests, enquiries, providerServiceLinks };
}

export async function updateProviderModeration(providerId: string, approved: boolean): Promise<void> {
  await updateDoc(doc(db, PROVIDERS, providerId), {
    is_verified: approved,
    is_rejected: !approved,
    moderated_at: new Date().toISOString(),
  });
}

export async function assignBookingProvider(bookingId: string, providerId: string): Promise<void> {
  const bookingSnap = await getDoc(doc(db, BOOKINGS, bookingId));
  if (!bookingSnap.exists()) throw new Error('Booking no longer exists.');
  const [providerSnap, relationSnap] = await Promise.all([
    getDoc(doc(db, PROVIDERS, providerId)),
    getDocs(query(
      collection(db, PROVIDER_SERVICES),
      where('provider_id', '==', providerId),
      where('service_id', '==', bookingSnap.data().service_id),
    )),
  ]);
  if (!providerSnap.exists() || providerSnap.data().is_verified !== true) throw new Error('Choose an approved provider.');
  if (relationSnap.empty) throw new Error('This provider is not qualified for the requested service.');
  await updateDoc(bookingSnap.ref, { provider_id: providerId, assigned_at: new Date().toISOString() });
}

// ============ REAL-TIME LISTENERS ============

export function onInstantRequestSnapshot(
  requestId: string,
  callback: (req: InstantRequest | null) => void,
): () => void {
  return onSnapshot(doc(db, INSTANT_REQUESTS, requestId), (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback({ id: snap.id, ...snap.data() } as InstantRequest);
  });
}

export function onActiveInstantRequests(
  callback: (requests: InstantRequest[]) => void,
): () => void {
  const q = query(collection(db, INSTANT_REQUESTS), where('status', '==', 'broadcasting'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as InstantRequest)));
  });
}

export function onProviderBookings(
  providerId: string,
  callback: (bookings: Booking[]) => void,
): () => void {
  const q = query(collection(db, BOOKINGS), where('provider_id', '==', providerId));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking)));
  });
}

// ============ MUTATIONS ============

export async function createBooking(params: {
  provider_id: string;
  service_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  customer_latitude?: number;
  customer_longitude?: number;
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  total_price: number;
  pricing_breakdown: PricingBreakdown;
}): Promise<Booking> {
  const customerUid = auth.currentUser?.uid;
  if (!customerUid) throw new Error('Sign in before creating a booking.');
  const otp = generateOTP();
  const ref = await addDoc(collection(db, BOOKINGS), {
    ...params,
    customer_uid: customerUid,
    status: 'confirmed',
    otp_code: otp,
    created_at: new Date().toISOString(),
    completed_at: null,
    provider_latitude: null,
    provider_longitude: null,
  });
  await addDoc(collection(db, TRANSACTIONS), {
    booking_id: ref.id,
    customer_uid: customerUid,
    amount: params.total_price,
    status: 'held',
    payment_method: 'card',
    created_at: new Date().toISOString(),
    released_at: null,
  });
  const d = await getDoc(ref);
  return { id: d.id, ...d.data() } as Booking;
}

export async function updateBookingStatus(
  bookingId: string,
  status: Booking['status'],
  extra?: Record<string, unknown>,
): Promise<Booking | null> {
  const updateData: Record<string, string> = { status };
  if (extra) Object.assign(updateData, extra as Record<string, string>);
  if (status === 'completed') updateData.completed_at = new Date().toISOString();
  await updateDoc(doc(db, BOOKINGS, bookingId), updateData);
  const d = await getDoc(doc(db, BOOKINGS, bookingId));
  if (!d.exists()) return null;
  return { id: d.id, ...d.data() } as Booking;
}

export async function verifyOTPAndComplete(bookingId: string, otp: string): Promise<{ success: boolean; message: string }> {
  const booking = await getBookingById(bookingId);
  if (!booking) return { success: false, message: 'Booking not found' };
  if (booking.status === 'completed') return { success: false, message: 'Booking already completed' };
  if (booking.otp_code !== otp) return { success: false, message: 'Invalid OTP code' };
  await updateBookingStatus(bookingId, 'completed');
  const txSnap = await getDocs(query(collection(db, TRANSACTIONS), where('booking_id', '==', bookingId)));
  for (const t of txSnap.docs) {
    await updateDoc(t.ref, { status: 'released', released_at: new Date().toISOString() });
  }
  return { success: true, message: 'Job completed! Payment released to provider.' };
}

export async function createInstantRequest(params: {
  service_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  customer_latitude: number;
  customer_longitude: number;
}): Promise<InstantRequest> {
  const customerUid = auth.currentUser?.uid;
  if (!customerUid) throw new Error('Sign in before creating an instant request.');
  const ref = await addDoc(collection(db, INSTANT_REQUESTS), {
    ...params,
    customer_uid: customerUid,
    status: 'broadcasting',
    provider_id: null,
    accepted_at: null,
    created_at: new Date().toISOString(),
  });
  const d = await getDoc(ref);
  return { id: d.id, ...d.data() } as InstantRequest;
}

export async function acceptInstantRequest(
  requestId: string,
  providerId: string,
): Promise<InstantRequest | null> {
  const d = await getDoc(doc(db, INSTANT_REQUESTS, requestId));
  if (!d.exists()) return null;
  const current = d.data() as InstantRequest;
  if (current.status !== 'broadcasting') return null;
  await updateDoc(d.ref, {
    status: 'accepted',
    provider_id: providerId,
    accepted_at: new Date().toISOString(),
  });
  const updated = await getDoc(d.ref);
  const req = { id: updated.id, ...updated.data() } as InstantRequest;
  const sd = await getDoc(doc(db, SERVICES, req.service_id));
  if (sd.exists()) req.service = { id: sd.id, ...sd.data() } as Service;
  const pd = await getDoc(doc(db, PROVIDERS, providerId));
  if (pd.exists()) req.provider = { id: pd.id, ...pd.data() } as Provider;
  return req;
}

export async function cancelInstantRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, INSTANT_REQUESTS, requestId), { status: 'cancelled' });
}

export async function updateProviderLocation(
  providerId: string,
  lat: number,
  lng: number,
): Promise<void> {
  await updateDoc(doc(db, PROVIDERS, providerId), { provider_latitude: lat, provider_longitude: lng });
}

export async function updateProviderCheckIn(
  providerId: string,
  checkedIn: boolean,
): Promise<void> {
  await updateDoc(doc(db, PROVIDERS, providerId), { is_checked_in: checkedIn });
}

export async function saveProviderAvailability(
  providerId: string,
  slots: { day_of_week: number; start_time: string; end_time: string; max_simultaneous_jobs: number }[],
): Promise<void> {
  const snap = await getDocs(query(collection(db, PROVIDER_AVAILABILITY), where('provider_id', '==', providerId)));
  for (const d of snap.docs) await deleteDoc(d.ref);
  for (const slot of slots) {
    await addDoc(collection(db, PROVIDER_AVAILABILITY), { ...slot, provider_id: providerId, created_at: new Date().toISOString() });
  }
}

export async function createReview(params: {
  booking_id: string;
  provider_id: string;
  customer_name: string;
  rating: number;
  comment?: string;
}): Promise<Review | null> {
  const ref = await addDoc(collection(db, REVIEWS), {
    ...params,
    created_at: new Date().toISOString(),
  });
  const d = await getDoc(ref);
  return { id: d.id, ...d.data() } as Review;
}

// ============ UTILITIES ============

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function generateTimeSlots(
  availability: ProviderAvailability[],
  bookings: Booking[],
  date: Date,
): TimeSlot[] {
  const dayOfWeek = date.getDay();
  const daySlots = availability.filter((a) => a.day_of_week === dayOfWeek);
  if (daySlots.length === 0) return [];
  const slots: TimeSlot[] = [];
  const dateStr = date.toISOString().split('T')[0];
  const dayBookings = bookings.filter((b) => b.scheduled_date === dateStr && b.status !== 'cancelled');
  for (const avail of daySlots) {
    const [startH, startM] = avail.start_time.split(':').map(Number);
    const [endH, endM] = avail.end_time.split(':').map(Number);
    let currentMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    const slotDuration = 60;
    while (currentMin + slotDuration <= endMin) {
      const slotStart = `${String(Math.floor(currentMin / 60)).padStart(2, '0')}:${String(currentMin % 60).padStart(2, '0')}`;
      const slotEnd = `${String(Math.floor((currentMin + slotDuration) / 60)).padStart(2, '0')}:${String((currentMin + slotDuration) % 60).padStart(2, '0')}`;
      const overlapping = dayBookings.filter((b) => {
        const bStart = b.scheduled_start_time.split(':').slice(0, 2).join(':');
        const bEnd = b.scheduled_end_time.split(':').slice(0, 2).join(':');
        return bStart < slotEnd && bEnd > slotStart;
      });
      slots.push({
        start_time: slotStart,
        end_time: slotEnd,
        available: overlapping.length < avail.max_simultaneous_jobs,
        max_jobs: avail.max_simultaneous_jobs,
        current_bookings: overlapping.length,
      });
      currentMin += slotDuration;
    }
  }
  return slots.sort((a, b) => a.start_time.localeCompare(b.start_time));
}

export function calculatePricing(service: Service, quantity: number = 1): PricingBreakdown {
  const base = service.base_price;
  let lineItemLabel = service.name;
  let subtotal = base;
  if (service.pricing_type === 'flat') {
    lineItemLabel = service.name;
    subtotal = base;
  } else if (service.pricing_type === 'hourly') {
    lineItemLabel = `${service.name} (${quantity} ${service.unit_label || 'hour'}${quantity > 1 ? 's' : ''} @ ${formatPrice(base)}/${service.unit_label || 'hour'})`;
    subtotal = base * quantity;
  } else if (service.pricing_type === 'unit') {
    lineItemLabel = `${service.name} (${quantity} ${service.unit_label || 'unit'}${quantity > 1 ? 's' : ''} @ ${formatPrice(base)}/${service.unit_label || 'unit'})`;
    subtotal = base * quantity;
  }
  const platformFee = Math.round(subtotal * 0.1 * 100) / 100;
  const total = Math.round((subtotal + platformFee) * 100) / 100;
  return {
    base_price: base,
    pricing_type: service.pricing_type,
    unit_label: service.unit_label || undefined,
    quantity,
    line_items: [{ label: lineItemLabel, amount: subtotal }],
    subtotal,
    platform_fee: platformFee,
    total,
  };
}

export function formatPrice(price: number): string {
  return `₹${price.toFixed(2)}`;
}

export function formatPricingType(service: Service): string {
  switch (service.pricing_type) {
    case 'flat': return formatPrice(service.base_price);
    case 'hourly': return `${formatPrice(service.base_price)}/${service.unit_label || 'hr'}`;
    case 'unit': return `${formatPrice(service.base_price)}/${service.unit_label || 'unit'}`;
  }
}

export function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek] || '';
}

export function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}
