export type CustomerBusinessType = 'dining' | 'retail' | 'salon_spa' | 'fitness_activity' | 'home_service';

export interface CustomerPlace {
  id: string;
  name: string;
  category: string;
  type: CustomerBusinessType;
  area: string;
  rating: string;
  reviews: string;
  image: string;
  description: string;
}

const placeDetails: Omit<CustomerPlace, 'id'>[] = [
  {
    name: 'Himalayan Java Coffee',
    category: 'Cafe & Bakery',
    type: 'dining',
    area: 'Thamel, Kathmandu',
    rating: '4.8',
    reviews: '120+',
    image: 'photo-1501339847302-ac426a4a7cbb',
    description: 'Thoughtfully brewed coffee, fresh bakes, and a welcoming neighborhood table.',
  },
  {
    name: 'Everest Fresh Market',
    category: 'Organic grocery',
    type: 'retail',
    area: 'Pulchowk, Lalitpur',
    rating: '4.7',
    reviews: '86',
    image: 'photo-1542838132-92c53300491e',
    description: 'Seasonal produce and daily essentials, sourced from local growers.',
  },
  {
    name: 'Lumina Spa & Salon',
    category: 'Salon & wellness',
    type: 'salon_spa',
    area: 'Jhamsikhel, Lalitpur',
    rating: '4.9',
    reviews: '64',
    image: 'photo-1560066984-138dadb4c035',
    description: 'A calm space for restorative treatments and considered beauty services.',
  },
  {
    name: 'The Courtyard Kitchen',
    category: 'Nepali dining',
    type: 'dining',
    area: 'New Road, Kathmandu',
    rating: '4.6',
    reviews: '210+',
    image: 'photo-1414235077428-338989a2e8c0',
    description: 'Seasonal Nepali ingredients, slow-cooked favorites, and a courtyard setting.',
  },
  {
    name: 'Siddhartha Rooftop Cafe',
    category: 'Rooftop & bar',
    type: 'dining',
    area: 'Lazimpat, Kathmandu',
    rating: '4.7',
    reviews: '98',
    image: 'photo-1514933651103-005eec06c04b',
    description: 'Golden-hour views, small plates, and locally roasted coffee.',
  },
  {
    name: 'Momo Junction',
    category: 'Fast food & momo',
    type: 'dining',
    area: 'Baneshwor, Kathmandu',
    rating: '4.5',
    reviews: '154',
    image: 'photo-1563245372-f21724e3856d',
    description: 'Hand-folded momos and comforting street-food classics, made fresh.',
  },
  {
    name: 'Patan Hair Studio',
    category: 'Hair & beauty',
    type: 'salon_spa',
    area: 'Patan, Lalitpur',
    rating: '4.6',
    reviews: '73',
    image: 'photo-1521590832167-7bcb0faa49f5',
    description: 'Personalized cuts, color, and grooming from a friendly local team.',
  },
  {
    name: 'Level Up Gaming Lounge',
    category: 'Gaming lounge',
    type: 'fitness_activity',
    area: 'Thamel, Kathmandu',
    rating: '4.8',
    reviews: '110',
    image: 'photo-1542751371-adc38448a05e',
    description: 'Drop in, play together, and book a seat for your next game night.',
  },
  {
    name: 'Move Studio Yoga',
    category: 'Fitness & yoga',
    type: 'fitness_activity',
    area: 'Jhamsikhel, Lalitpur',
    rating: '4.9',
    reviews: '58',
    image: 'photo-1544367567-0f2fcb009e0b',
    description: 'Small-group movement, mindful yoga, and classes for every level.',
  },
  {
    name: 'Patan Weekend Workshop',
    category: 'Creative workshops',
    type: 'fitness_activity',
    area: 'Patan, Lalitpur',
    rating: '4.7',
    reviews: '42',
    image: 'photo-1455390582262-044cbe6a277',
    description: 'Learn something new with hands-on workshops led by local makers.',
  },
  {
    name: 'Kirana Corner',
    category: 'Grocery & kirana',
    type: 'retail',
    area: 'Baneshwor, Kathmandu',
    rating: '4.6',
    reviews: '91',
    image: 'photo-1604719312566-8912e9c8a213',
    description: 'Everyday pantry staples, fresh produce, and neighborhood delivery.',
  },
  {
    name: 'Kora Boutique',
    category: 'Fashion & clothing',
    type: 'retail',
    area: 'Patan, Lalitpur',
    rating: '4.8',
    reviews: '66',
    image: 'photo-1441986300917-64674bd600d8',
    description: 'Thoughtful clothing and accessories from independent Nepali makers.',
  },
  {
    name: 'Gadget House Nepal',
    category: 'Electronics & gadgets',
    type: 'retail',
    area: 'New Road, Kathmandu',
    rating: '4.5',
    reviews: '130+',
    image: 'photo-1498049794561-7780e7231661',
    description: 'Everyday tech, helpful advice, and local warranty support.',
  },
  {
    name: 'Urban Fix Home Appliances',
    category: 'Home repairs',
    type: 'home_service',
    area: 'Jhamsikhel, Lalitpur',
    rating: '4.9',
    reviews: '102',
    image: 'photo-1581578731548-c64695cc6952',
    description: 'Trusted technicians, clear upfront quotes, and convenient service slots.',
  },
  {
    name: 'CoolCare AC & Fridge Repair',
    category: 'Home repairs',
    type: 'home_service',
    area: 'Baneshwor, Kathmandu',
    rating: '4.8',
    reviews: '88',
    image: 'photo-1621905251918-48416bd8575a',
    description: 'Fast diagnostics and reliable repairs for cooling and home appliances.',
  },
];

export function customerPlaceId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export const CUSTOMER_PLACES: CustomerPlace[] = placeDetails.map((place) => ({
  ...place,
  id: customerPlaceId(place.name),
}));
