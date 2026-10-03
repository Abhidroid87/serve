import { notFound } from 'next/navigation';
import { CustomerPlaceDetail } from '@/components/customer-place-detail';
import { CUSTOMER_PLACES } from '@/lib/customer-places';

export function generateStaticParams() {
  return CUSTOMER_PLACES.map(({ id }) => ({ id }));
}

export default function PlacePage({ params }: { params: { id: string } }) {
  const place = CUSTOMER_PLACES.find((entry) => entry.id === params.id);
  if (!place) notFound();

  return <CustomerPlaceDetail place={place} />;
}
