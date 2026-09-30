# Project Skills and Architecture Map

## Stack

- Next.js 13 App Router, React 18, TypeScript, and Tailwind CSS.
- Firebase Authentication is wrapped by `lib/auth-context.tsx`.
- Firestore setup is isolated in `lib/firebase.ts`; reads and mutations are in `lib/data.ts`.
- UI uses Framer Motion, Lucide icons, and the local shadcn/Radix components under `components/ui/`.
- `npm run dev` starts development, `npm run typecheck` checks TypeScript, and `npm run build` builds the site.

## Routes and Components

- `app/page.tsx` is the customer marketplace and service discovery page.
- `app/provider/page.tsx` is the provider operations dashboard.
- `app/layout.tsx` mounts `AuthProvider` and the shared `AuthModal`.
- `components/service-card.tsx` renders marketplace listings and optional completed-job examples.
- `components/location-bar.tsx` owns manual locality selection and explicit browser geolocation.
- `components/booking-modal.tsx` runs scheduled booking; `components/instant-work-modal.tsx` handles dispatch.
- `components/bookings-list.tsx` displays customer booking history.

## Data Flow

- `lib/types.ts` defines Firestore document shapes.
- `lib/data.ts` owns reads/writes for `service_categories`, `services`, `providers`, `provider_services`, `provider_availability`, `bookings`, `transactions`, `instant_requests`, and `reviews`.
- A provider's capabilities are represented by `provider_services` rows linking provider IDs to service IDs.
- Provider booking queries should constrain `provider_id` and filter to that provider's linked service IDs.
- Service completed-work galleries are optional `completed_jobs` data on service documents; only render provided real image URLs.

## Current Constraints

- Location is opt-in. Do not request browser geolocation on initial page load.
- Currency displays use Indian Rupees via `formatPrice` in `lib/data.ts`.
- Provider profiles are keyed by Firebase Auth UID. Firestore Rules must enforce that link; client-side routing is not access control.
- Historical before/after content is not seeded by the app. Do not fabricate examples.
- The Firebase project config belongs to this workspace only. Never fetch or copy Firebase configuration, credentials, or database records from an upstream repository.

## Change Workflow

1. Check `git status` and create a feature branch before edits.
2. Read the owning component/data function and its callers before changing behavior.
3. Keep Firestore schema additions optional unless a migration is explicitly planned.
4. Run `npm run typecheck`, then `NEXT_PUBLIC_BASE_PATH=/serve npm run build` for deploy-target validation.
5. Review `git diff --check` and verify ignored environment files remain untracked.