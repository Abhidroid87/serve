import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QuerySnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured, isFirebaseStorageConfigured, storage } from '@/lib/firebase';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type {
  Booking,
  MerchantCatalogItem,
  MarketplaceBusinessType,
  MarketplaceOrder,
  MarketplaceOrderItem,
  MarketplaceOrderStatus,
  MarketplacePaymentMethod,
  MarketplaceReview,
  SavedAddress,
  SupportTicket,
  SupportTicketCategory,
} from '@/lib/types';

const ORDERS = 'orders';
const TICKETS = 'tickets';
const REVIEWS = 'reviews';
const MERCHANT_CATALOG = 'merchant_catalog';

function requireCustomer() {
  if (!isFirebaseConfigured()) throw new Error('Firebase is not configured. Orders and support requests cannot be saved.');
  if (!auth.currentUser) throw new Error('Sign in before continuing.');
  return auth.currentUser;
}

export function subscribeAdminOrders(
  onChange: (orders: MarketplaceOrder[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.');
  return onSnapshot(
    query(collection(db, ORDERS), orderBy('createdAt', 'desc')),
    (snapshot) => onChange(mapSnapshot<MarketplaceOrder>(snapshot)),
    onError,
  );
}

function mapSnapshot<T extends { id: string }>(snapshot: QuerySnapshot<DocumentData>): T[] {
  return snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id } as T));
}

export function subscribeMerchantCatalog(
  merchantId: string,
  onChange: (items: MerchantCatalogItem[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured() || auth.currentUser?.uid !== merchantId) {
    throw new Error('Sign in to the matching merchant account to manage the catalog.');
  }
  return onSnapshot(
    query(collection(db, MERCHANT_CATALOG), where('merchantId', '==', merchantId), orderBy('updatedAt', 'desc')),
    (snapshot) => onChange(mapSnapshot<MerchantCatalogItem>(snapshot)),
    onError,
  );
}

export function subscribePublicMerchantCatalog(
  merchantName: string,
  onChange: (items: MerchantCatalogItem[]) => void,
  onError: (error: Error) => void,
): () => void {
  if (!isFirebaseConfigured()) return () => {};
  let cancelled = false;
  let unsubscribe: Unsubscribe | undefined;
  getDocs(query(collection(db, 'providers'), where('business_name', '==', merchantName)))
    .then((snapshot) => {
      const merchant = snapshot.docs.find((entry) => entry.data().is_verified === true);
      if (cancelled) return;
      if (!merchant) {
        onChange([]);
        return;
      }
      unsubscribe = onSnapshot(
        query(collection(db, MERCHANT_CATALOG), where('merchantId', '==', merchant.id), orderBy('updatedAt', 'desc')),
        (items) => onChange(mapSnapshot<MerchantCatalogItem>(items)),
        onError,
      );
    })
    .catch((cause: unknown) => {
      if (!cancelled) onError(cause instanceof Error ? cause : new Error('Could not load the merchant catalog.'));
    });
  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

export async function saveMerchantCatalogItem(input: {
  id?: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  inStock: boolean;
}): Promise<void> {
  const user = requireCustomer();
  if (!input.title.trim() || !Number.isFinite(input.price) || input.price < 0) {
    throw new Error('Enter a product name and a valid non-negative price.');
  }
  const { id, ...fields } = input;
  const item = {
    ...fields,
    title: fields.title.trim(),
    description: fields.description.trim(),
    merchantId: user.uid,
    updatedAt: serverTimestamp(),
  };
  if (id) await updateDoc(doc(db, MERCHANT_CATALOG, id), item);
  else await addDoc(collection(db, MERCHANT_CATALOG), item);
}

export async function deleteMerchantCatalogItem(itemId: string): Promise<void> {
  requireCustomer();
  await deleteDoc(doc(db, MERCHANT_CATALOG, itemId));
}

export async function uploadMerchantCatalogImage(file: File): Promise<string> {
  const user = requireCustomer();
  if (!isFirebaseStorageConfigured()) throw new Error('Firebase Storage is not configured for this deployment.');
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    throw new Error('Choose a JPG, PNG, WebP, or GIF image smaller than 5 MB.');
  }
  const objectRef = ref(storage, `merchant-catalog/${user.uid}/${crypto.randomUUID()}`);
  await uploadBytes(objectRef, file, { contentType: file.type });
  return getDownloadURL(objectRef);
}

export async function deleteMerchantCatalogImage(imageUrl: string): Promise<void> {
  requireCustomer();
  if (!imageUrl) return;
  await deleteObject(ref(storage, imageUrl));
}

export interface CreateMarketplaceOrderInput {
  merchantId: string;
  merchantName: string;
  businessType: MarketplaceBusinessType;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  totalAmount: number;
  paymentMethod: MarketplacePaymentMethod;
  items?: MarketplaceOrderItem[];
  fulfillment?: 'delivery' | 'pickup';
  bookingDate?: string;
  timeSlot?: string;
  serviceSelected?: string;
  stylist?: string;
  serviceType?: string;
  escrowStatus?: 'held' | 'released' | 'refunded';
}

export async function createMarketplaceOrder(input: CreateMarketplaceOrderInput): Promise<MarketplaceOrder> {
  const user = requireCustomer();
  if (!input.merchantId || !input.merchantName || !input.customerName.trim() || !input.customerPhone.trim()) {
    throw new Error('Merchant and customer details are required.');
  }
  if (!Number.isFinite(input.totalAmount) || input.totalAmount < 0) {
    throw new Error('The order total is invalid.');
  }

  const reference = doc(collection(db, ORDERS));
  const orderId = `ORD-${reference.id.slice(-8).toUpperCase()}`;
  const order = {
    ...input,
    customerId: user.uid,
    status: 'pending' as const,
    orderId,
    createdAt: serverTimestamp(),
  };
  await setDoc(reference, order);
  return {
    ...order,
    id: reference.id,
    orderId,
    createdAt: new Date().toISOString(),
  };
}

export async function findVerifiedMerchantId(merchantName: string): Promise<string> {
  if (!isFirebaseConfigured()) throw new Error('Firebase is not configured. Orders cannot be saved.');
  const matches = await getDocs(query(collection(db, 'providers'), where('business_name', '==', merchantName)));
  const verifiedMerchant = matches.docs.find((merchant) => merchant.data().is_verified === true);
  if (!verifiedMerchant) {
    throw new Error(`${merchantName} is not connected to a verified Kehi merchant account yet. No order was placed.`);
  }
  return verifiedMerchant.id;
}

export function subscribeCustomerOrders(
  userId: string,
  onChange: (orders: MarketplaceOrder[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured() || auth.currentUser?.uid !== userId) {
    throw new Error('Sign in to the matching account to view orders.');
  }
  return onSnapshot(
    query(collection(db, ORDERS), where('customerId', '==', userId), orderBy('createdAt', 'desc')),
    (snapshot) => onChange(mapSnapshot<MarketplaceOrder>(snapshot)),
    onError,
  );
}

export function subscribeCustomerRepairBookings(
  userId: string,
  onChange: (orders: MarketplaceOrder[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured() || auth.currentUser?.uid !== userId) {
    throw new Error('Sign in to the matching account to view bookings.');
  }
  return onSnapshot(
    query(collection(db, 'bookings'), where('customer_uid', '==', userId), orderBy('created_at', 'desc')),
    (snapshot) => onChange(snapshot.docs.map((entry) => {
      const booking = { id: entry.id, ...entry.data() } as Booking;
      return {
        id: booking.id,
        orderId: `JOB-${booking.id.slice(-8).toUpperCase()}`,
        customerId: booking.customer_uid || userId,
        customerName: booking.customer_name,
        customerPhone: booking.customer_phone,
        merchantId: booking.provider_id,
        merchantName: booking.provider?.business_name || booking.provider?.name || 'Home service provider',
        businessType: 'home_service',
        status: booking.status,
        totalAmount: booking.total_price,
        paymentMethod: 'Escrow',
        createdAt: booking.created_at,
        serviceSelected: booking.service?.name || booking.service_id,
        serviceType: booking.service?.name || booking.service_id,
        bookingDate: booking.scheduled_date,
        timeSlot: booking.scheduled_start_time,
        escrowStatus: booking.status === 'completed' ? 'released' : 'held',
      } as MarketplaceOrder;
    })),
    onError,
  );
}

export function subscribeMerchantOrders(
  merchantId: string,
  onChange: (orders: MarketplaceOrder[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured() || auth.currentUser?.uid !== merchantId) {
    throw new Error('Sign in to the matching merchant account to view orders.');
  }
  return onSnapshot(
    query(collection(db, ORDERS), where('merchantId', '==', merchantId), orderBy('createdAt', 'desc')),
    (snapshot) => onChange(mapSnapshot<MarketplaceOrder>(snapshot)),
    onError,
  );
}

export async function updateMarketplaceOrderStatus(orderId: string, status: MarketplaceOrderStatus): Promise<void> {
  requireCustomer();
  await updateDoc(doc(db, ORDERS, orderId), { status, updatedAt: serverTimestamp() });
}

export async function createSupportTicket(input: {
  orderId?: string;
  subject: string;
  category: SupportTicketCategory;
  userPhone: string;
  message: string;
}): Promise<SupportTicket> {
  const user = requireCustomer();
  if (!input.subject.trim() || !input.message.trim() || !input.userPhone.trim()) {
    throw new Error('Subject, description, and phone number are required.');
  }
  const message = input.message.trim();
  const ticket = {
    ticketId: '',
    orderId: input.orderId || null,
    userId: user.uid,
    userPhone: input.userPhone.trim(),
    subject: input.subject.trim(),
    category: input.category,
    status: 'open' as const,
    createdAt: serverTimestamp(),
    chatLogs: [{ sender: 'user' as const, message, time: new Date().toISOString() }],
  };
  const reference = doc(collection(db, TICKETS));
  const ticketId = `TCK-${reference.id.slice(-6).toUpperCase()}`;
  await setDoc(reference, { ...ticket, ticketId });
  return {
    ...ticket,
    id: reference.id,
    ticketId,
    createdAt: new Date().toISOString(),
    chatLogs: [{ sender: 'user', message, time: new Date().toISOString() }],
  };
}

export function subscribeCustomerTickets(
  userId: string,
  onChange: (tickets: SupportTicket[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured() || auth.currentUser?.uid !== userId) {
    throw new Error('Sign in to the matching account to view support tickets.');
  }
  return onSnapshot(
    query(collection(db, TICKETS), where('userId', '==', userId), orderBy('createdAt', 'desc')),
    (snapshot) => onChange(mapSnapshot<SupportTicket>(snapshot)),
    onError,
  );
}

export function subscribeAdminTickets(
  onChange: (tickets: SupportTicket[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured()) throw new Error('Firebase is not configured.');
  return onSnapshot(
    query(collection(db, TICKETS), orderBy('createdAt', 'desc')),
    (snapshot) => onChange(mapSnapshot<SupportTicket>(snapshot)),
    onError,
  );
}

export async function updateSupportTicket(ticketId: string, status: SupportTicket['status'], reply?: string): Promise<void> {
  requireCustomer();
  const update: {
    status: SupportTicket['status'];
    updatedAt: ReturnType<typeof serverTimestamp>;
    chatLogs?: ReturnType<typeof arrayUnion>;
  } = { status, updatedAt: serverTimestamp() };
  if (reply?.trim()) {
    update.chatLogs = arrayUnion({
      sender: 'admin',
      message: reply.trim(),
      time: new Date().toISOString(),
    });
  }
  await updateDoc(doc(db, TICKETS, ticketId), update);
}

export async function createMarketplaceReview(input: {
  merchantId: string;
  customerName: string;
  rating: number;
  comment: string;
  orderId: string;
}): Promise<void> {
  const user = requireCustomer();
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new Error('Choose a rating from 1 to 5 stars.');
  }
  const review = {
    reviewId: '',
    merchantId: input.merchantId,
    customerId: user.uid,
    customerName: input.customerName.trim() || user.displayName || 'Customer',
    rating: input.rating,
    comment: input.comment.trim(),
    orderId: input.orderId,
    createdAt: serverTimestamp(),
  };
  const reference = doc(collection(db, REVIEWS));
  await setDoc(reference, { ...review, reviewId: `REV-${reference.id.slice(-8).toUpperCase()}` });
}

export async function replyToMarketplaceReview(reviewId: string, reply: string): Promise<void> {
  requireCustomer();
  if (!reply.trim() || reply.trim().length > 2000) throw new Error('Reply must contain 1–2,000 characters.');
  await updateDoc(doc(db, REVIEWS, reviewId), { merchantReply: reply.trim() });
}

export function subscribeMerchantReviews(
  merchantId: string,
  onChange: (reviews: MarketplaceReview[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured() || auth.currentUser?.uid !== merchantId) {
    throw new Error('Sign in to the matching merchant account to view reviews.');
  }
  return onSnapshot(
    query(collection(db, REVIEWS), where('merchantId', '==', merchantId), orderBy('createdAt', 'desc')),
    (snapshot) => onChange(mapSnapshot<MarketplaceReview>(snapshot)),
    onError,
  );
}

export async function saveAddress(address: Omit<SavedAddress, 'id'>): Promise<void> {
  const user = requireCustomer();
  await addDoc(collection(db, 'users', user.uid, 'addresses'), address);
}

export function subscribeAddresses(
  userId: string,
  onChange: (addresses: SavedAddress[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured() || auth.currentUser?.uid !== userId) {
    throw new Error('Sign in to the matching account to view saved addresses.');
  }
  return onSnapshot(
    query(collection(db, 'users', userId, 'addresses'), orderBy('label')),
    (snapshot) => onChange(mapSnapshot<SavedAddress>(snapshot)),
    onError,
  );
}

export async function deleteAddress(addressId: string): Promise<void> {
  const user = requireCustomer();
  await deleteDoc(doc(db, 'users', user.uid, 'addresses', addressId));
}
