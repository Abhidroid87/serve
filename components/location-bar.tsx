'use client';

import { MapPin, Search, Crosshair } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface UserLocation {
  lat?: number;
  lng?: number;
  locality: string;
}

interface LocationBarProps {
  location: UserLocation | null;
  onLocationChange: (location: UserLocation) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchOpen?: () => void;
  searchPlaceholder?: string;
}

export function detectLocation(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Location detection is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({
        lat: coords.latitude,
        lng: coords.longitude,
        locality: 'Current location',
      }),
      (error) => reject(new Error(error.code === error.PERMISSION_DENIED
        ? 'Location permission was denied. Enter a city instead.'
        : 'Could not detect your location. Enter a city instead.')),
      { timeout: 10000, maximumAge: 60000 },
    );
  });
}

export function LocationBar({ location, onLocationChange, searchQuery, onSearchChange, onSearchOpen, searchPlaceholder = 'Search services...' }: LocationBarProps) {
  const [detecting, setDetecting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [manualCity, setManualCity] = useState('');
  const [locationError, setLocationError] = useState('');

  const handleDetect = async () => {
    setDetecting(true);
    setLocationError('');
    try {
      onLocationChange(await detectLocation());
      setShowDropdown(false);
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : 'Could not detect your location.');
    } finally {
      setDetecting(false);
    }
  };

  const applyManualCity = () => {
    const city = manualCity.trim();
    if (!city) return;
    onLocationChange({ locality: city });
    setLocationError('');
    setShowDropdown(false);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          readOnly
          onClick={onSearchOpen}
          onFocus={onSearchOpen}
          aria-label="Open marketplace search"
          role="button"
          className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-foreground/30 transition-all"
        />
      </div>
      <div className="relative">
        <button
          onClick={() => {
            setShowDropdown(!showDropdown);
            setManualCity(location?.lat === undefined ? location?.locality || '' : '');
            setLocationError('');
          }}
          aria-expanded={showDropdown}
          className="flex items-center gap-2 h-11 px-4 rounded-lg border border-border bg-background text-sm font-medium hover:bg-secondary transition-colors w-full sm:w-auto"
        >
          <MapPin className="h-4 w-4" />
          <span className="truncate">{location ? `${location.locality === 'Kathmandu' ? 'Kathmandu, Nepal' : location.locality}` : 'Select area'}</span>
        </button>
        {showDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
            <div className="absolute right-0 mt-2 w-72 rounded-lg border border-border bg-card shadow-lg z-50 p-3">
              <button
                onClick={handleDetect}
                disabled={detecting}
                className="flex h-10 items-center gap-2 w-full px-3 text-sm font-medium hover:bg-secondary"
              >
                <Crosshair className={cn('h-4 w-4', detecting && 'animate-spin')} />
                {detecting ? 'Detecting...' : 'Use my location'}
              </button>
              <div className="mt-2 border-t border-border pt-3">
                <p className="mb-2 px-3 text-xs font-medium text-muted-foreground">Popular around Kathmandu</p>
                <div className="flex flex-wrap gap-1.5 px-2">
                  {['Kathmandu', 'Jhamsikhel', 'Thamel', 'New Road', 'Pulchowk', 'Baneshwor'].map((area) => (
                    <button key={area} onClick={() => { onLocationChange({ locality: area }); setShowDropdown(false); }} className="rounded-full border border-border px-2.5 py-1.5 text-xs transition hover:border-foreground/40 hover:bg-secondary">{area}</button>
                  ))}
                </div>
              </div>
              <form onSubmit={(event) => { event.preventDefault(); applyManualCity(); }} className="mt-2 border-t border-border pt-3">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="manual-city">Search or enter a city</label>
                <div className="flex gap-2">
                  <input id="manual-city" value={manualCity} onChange={(event) => setManualCity(event.target.value)} placeholder="City or service area" className="h-10 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground/40" />
                  <button type="submit" disabled={!manualCity.trim()} className="h-10 rounded-md bg-foreground px-3 text-xs font-medium text-background disabled:opacity-40">Apply</button>
                </div>
              </form>
              {locationError && <p role="alert" className="mt-2 text-xs text-destructive">{locationError}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
