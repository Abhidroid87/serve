'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowRight, BadgeCheck, Clock, MapPin, ShieldCheck, Star, Users } from 'lucide-react';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Service, Provider } from '@/lib/types';
import { formatPrice, haversineDistance } from '@/lib/data';
import { cn } from '@/lib/utils';

interface ServiceCardProps {
  service: Service;
  providers: Provider[];
  userLat?: number;
  userLng?: number;
}

function getIcon(name: string): LucideIcon {
  const Icon = (Icons as unknown as Record<string, LucideIcon>)[name];
  return Icon || Icons.Wrench;
}

export function ServiceCard({ service, providers, userLat, userLng }: ServiceCardProps) {
  const router = useRouter();
  const Icon = getIcon(service.icon);
  const availableProviders = providers.filter((p) => p.is_checked_in && p.is_verified);
  const locatedProviders = providers.filter((provider) => provider.latitude !== null && provider.longitude !== null);
  const nearestDist = userLat !== undefined && userLng !== undefined && locatedProviders.length > 0
    ? Math.min(...locatedProviders.map((p) => haversineDistance(userLat, userLng, p.latitude as number, p.longitude as number)))
    : null;
  const verifiedCount = providers.filter((provider) => provider.is_verified).length;
  const openDirectory = () => router.push(`/providers/?service=${encodeURIComponent(service.id)}`);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      role="link"
      tabIndex={0}
      aria-label={`View providers for ${service.name}`}
      onClick={openDirectory}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openDirectory();
        }
      }}
      className="group relative cursor-pointer bg-card border border-border rounded-xl overflow-hidden hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 transition-colors flex flex-col"
    >
      {service.image_url && (
        <div className="relative h-40 overflow-hidden bg-muted">
          <Image
            src={service.image_url}
            alt={service.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          {service.is_sample && (
            <span className="absolute left-3 top-3 border border-white/30 bg-black/65 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-normal text-white backdrop-blur-sm">
              Indicative price
            </span>
          )}
          {availableProviders.length > 0 && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-white text-xs font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              {availableProviders.length} available now
            </div>
          )}
        </div>
      )}

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-secondary text-foreground/70 group-hover:bg-foreground group-hover:text-background transition-colors">
            <Icon className="h-4.5 w-4.5" />
          </div>
          {verifiedCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              {verifiedCount} verified
            </span>
          )}
        </div>

        <h3 className="font-semibold text-base leading-tight mb-1">{service.name}</h3>
        {service.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{service.description}</p>
        )}

        {service.completed_jobs?.filter((job) => job.before_image_url && job.after_image_url).map((job, index, jobs) => (
          <section key={`${job.before_image_url}-${job.after_image_url}`} className="mb-4 overflow-hidden rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-[10px] font-semibold tracking-normal text-muted-foreground">
                JOB {index + 1} OF {jobs.length}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                <Clock className="h-3 w-3" />
                Repair time: {job.repair_time_minutes} min
              </span>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 p-2">
              <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
                <Image src={job.before_image_url} alt={`${service.name} before repair`} fill sizes="160px" className="object-cover" />
                <span className="absolute left-2 top-2 rounded-sm bg-black/80 px-1.5 py-1 text-[9px] font-bold text-white">BEFORE</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
                <Image src={job.after_image_url} alt={`${service.name} after repair`} fill sizes="160px" className="object-cover" />
                <span className="absolute left-2 top-2 rounded-sm bg-blue-600 px-1.5 py-1 text-[9px] font-bold text-white">AFTER</span>
              </div>
            </div>
            <div className="flex items-start justify-between gap-2 px-3 pb-3">
              <p className="text-xs text-muted-foreground">{job.description || service.description}</p>
              <span className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> 90-day guarantee
              </span>
            </div>
          </section>
        ))}

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {service.estimated_duration_mins < 60
              ? `${service.estimated_duration_mins} min`
              : `${Math.floor(service.estimated_duration_mins / 60)}h${service.estimated_duration_mins % 60 > 0 ? ` ${service.estimated_duration_mins % 60}m` : ''}`}
          </span>
          {nearestDist !== null && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {nearestDist < 1 ? `${Math.round(nearestDist * 1000)}m` : `${nearestDist.toFixed(1)}km`}
            </span>
          )}
          {providers.length > 0 && (
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-foreground/60 text-foreground/60" />
              {(providers.reduce((s, p) => s + p.rating, 0) / providers.length).toFixed(1)}
            </span>
          )}
        </div>

        <div className="mt-auto">
          <div className="mb-3 flex items-center justify-between gap-3 border-y border-border py-3">
            <div>
              <span className="block text-[10px] font-medium uppercase tracking-normal text-muted-foreground">Starting price</span>
              <span className="text-lg font-bold tracking-tight">{formatPrice(service.base_price)}</span>
              {service.pricing_type !== 'flat' && <span className="ml-1 text-sm text-muted-foreground">/{service.unit_label}</span>}
            </div>
            <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground"><BadgeCheck className="h-3.5 w-3.5" /> Upfront pricing</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {providers.length} {providers.length === 1 ? 'provider' : 'providers'}
              {nearestDist !== null && ` · ${nearestDist < 1 ? `${Math.round(nearestDist * 1000)}m` : `${nearestDist.toFixed(1)}km`} away`}
            </span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openDirectory();
              }}
              className="flex h-9 shrink-0 items-center gap-2 rounded-lg bg-foreground px-3 text-xs font-semibold text-background transition-colors hover:bg-foreground/90"
            >
              View Nearby Providers <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
