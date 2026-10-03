export type PricingType = 'flat' | 'hourly' | 'unit';
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type TransactionStatus = 'held' | 'released' | 'refunded';
export type InstantRequestStatus = 'broadcasting' | 'accepted' | 'expired' | 'cancelled';

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
  display_order: number;
  image_url: string | null;
  created_at: string;
}

export interface Service {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  pricing_type: PricingType;
  base_price: number;
  unit_label: string | null;
  estimated_duration_mins: number;
  icon: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  category?: ServiceCategory;
  completed_jobs?: CompletedJobExample[];
  is_sample?: boolean;
}

export interface CompletedJobExample {
  before_image_url: string;
  after_image_url: string;
  description: string;
  repair_time_minutes: number;
}

export interface Provider {
  id: string;
  name: string;
  business_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  email: string | null;
  bio: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  locality: string | null;
  city: string | null;
  service_radius_km: number;
  is_verified: boolean;
  is_checked_in: boolean;
  rating: number;
  total_reviews: number;
  total_jobs: number;
  created_at: string;
  auth_uid?: string;
  is_rejected?: boolean;
  businessType?: ProviderBusinessType;
  fulfillmentType?: 'doorstep_dispatch';
  isInstantDispatchEligible?: boolean;
  fulfillment?: ProviderFulfillment;
  opening_time?: string;
  closing_time?: string;
  is_open?: boolean;
}

export type ProviderBusinessType = 'service_provider' | 'retail_store' | 'activity_dining' | 'experience_provider';

export interface ProviderFulfillment {
  categories?: string[];
  walkInAllowed?: boolean;
  appointmentRequired?: boolean;
  localHomeDelivery?: boolean;
  deliveryRadiusKm?: number | null;
  estimatedDeliveryTime?: string;
  storePickup?: boolean;
}

export interface ProviderService {
  id: string;
  provider_id: string;
  service_id: string;
  custom_price: number | null;
  provider?: Provider;
  service?: Service;
}

export interface ProviderAvailability {
  id: string;
  provider_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_simultaneous_jobs: number;
  created_at: string;
}

export interface PricingBreakdown {
  base_price: number;
  pricing_type: PricingType;
  unit_label?: string;
  quantity?: number;
  line_items: { label: string; amount: number }[];
  subtotal: number;
  platform_fee: number;
  total: number;
}

export interface Booking {
  id: string;
  provider_id: string;
  customer_uid?: string;
  service_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  customer_latitude: number | null;
  customer_longitude: number | null;
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  status: BookingStatus;
  total_price: number;
  pricing_breakdown: PricingBreakdown;
  otp_code: string | null;
  provider_latitude: number | null;
  provider_longitude: number | null;
  created_at: string;
  completed_at: string | null;
  provider?: Provider;
  service?: Service;
}

export interface Transaction {
  id: string;
  booking_id: string;
  amount: number;
  status: TransactionStatus;
  payment_method: string;
  created_at: string;
  released_at: string | null;
}

export interface InstantRequest {
  id: string;
  customer_uid?: string;
  service_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  customer_latitude: number;
  customer_longitude: number;
  status: InstantRequestStatus;
  provider_id: string | null;
  accepted_at: string | null;
  created_at: string;
  service?: Service;
  provider?: Provider;
}

export interface Review {
  id: string;
  booking_id: string;
  provider_id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

import type { Timestamp } from 'firebase/firestore';

export type MarketplaceBusinessType = 'retail' | 'dining' | 'salon_spa' | 'fitness_activity' | 'home_service';
export type MarketplaceOrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type MarketplacePaymentMethod = 'COD' | 'eSewa' | 'Khalti' | 'Escrow';

export interface MarketplaceOrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  unit?: string;
}

export interface MarketplaceOrder {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  merchantId: string;
  merchantName: string;
  businessType: MarketplaceBusinessType;
  status: MarketplaceOrderStatus;
  totalAmount: number;
  paymentMethod: MarketplacePaymentMethod;
  createdAt: Timestamp | string;
  items?: MarketplaceOrderItem[];
  fulfillment?: 'delivery' | 'pickup';
  bookingDate?: string;
  timeSlot?: string;
  serviceSelected?: string;
  stylist?: string;
  serviceType?: string;
  escrowStatus?: 'held' | 'released' | 'refunded';
  completionOtp?: string;
  technicianId?: string;
}

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved';
export type SupportTicketCategory = 'Billing' | 'Delivery' | 'Service Quality' | 'Merchant Dispute' | 'General Inquiry' | 'Missing item' | 'Delay' | 'Cancel request' | 'Overcharged' | 'Quality issue';

export interface TicketChatMessage {
  sender: 'user' | 'admin';
  message: string;
  time: Timestamp | string;
}

export interface SupportTicket {
  id: string;
  ticketId: string;
  orderId: string | null;
  userId: string;
  userPhone: string;
  subject: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  createdAt: Timestamp | string;
  chatLogs: TicketChatMessage[];
}

export interface MarketplaceReview {
  id: string;
  reviewId: string;
  merchantId: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  orderId: string;
  createdAt: Timestamp | string;
  merchantReply?: string;
}

export interface SavedAddress {
  id: string;
  label: 'Home' | 'Office' | 'Other';
  address: string;
  city: 'Kathmandu' | 'Lalitpur' | 'Pokhara';
  landmark: string;
  phone: string;
}

export interface MerchantCatalogItem {
  id: string;
  merchantId: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  inStock: boolean;
  updatedAt: Timestamp | string;
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
  available: boolean;
  max_jobs: number;
  current_bookings: number;
}
