import Link from 'next/link';
import { Facebook, Instagram, MessageCircle, QrCode, Twitter, Youtube } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const socialIcons: { label: string; icon: LucideIcon }[] = [
  { label: 'WhatsApp', icon: MessageCircle },
  { label: 'Facebook', icon: Facebook },
  { label: 'Instagram', icon: Instagram },
  { label: 'X', icon: Twitter },
  { label: 'YouTube', icon: Youtube },
];

const footerGroups = [
  {
    title: 'Help',
    links: [
      { label: 'Contact Us', href: '/provider/' },
      { label: 'Corporate Announcements', href: '/#discover' },
      { label: 'Partner Support', href: '/provider/' },
      { label: 'FAQs', href: '/#discover' },
    ],
  },
  {
    title: 'Quick Links',
    links: [
      { label: 'List your store', href: '/provider/' },
      { label: 'Become a service partner', href: '/provider/' },
      { label: 'Promote your offers', href: '/provider/' },
      { label: 'Admin Login', href: '/admin/login/' },
    ],
  },
  {
    title: 'Useful Links',
    links: [
      { label: 'About Kehi', href: '/#discover' },
      { label: 'Coverage Areas', href: '/#discover' },
      { label: 'Community Guidelines', href: '/#discover' },
      { label: 'Escrow Protection', href: '/#discover' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto w-full bg-[#141416] text-neutral-400">
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-12 sm:px-6 lg:px-8">
        <div className="mb-10 grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-5">
          <div>
            <Link href="/" className="inline-block text-2xl font-bold text-white">Kehi</Link>
            <p className="mt-1 text-[10px] font-semibold tracking-[0.16em] text-neutral-500">LOCAL SERVICES &amp; DISCOVERY</p>
            <div className="mt-5 flex items-center gap-4" aria-label="Social media">
              {socialIcons.map(({ label, icon: Icon }) => (
                <span key={label} title={label} aria-label={label} className="text-white transition-colors hover:text-emerald-400">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              ))}
            </div>
          </div>

          {footerGroups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-white">{group.title}</h2>
              <ul className="space-y-2.5 text-sm">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="transition-colors hover:text-white">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-white">Download App</h2>
            <div className="w-fit rounded-2xl border border-neutral-700 bg-neutral-800/80 p-3">
              <div className="flex h-28 w-28 items-center justify-center rounded-xl bg-white p-2 text-center text-xs text-black">
                <QrCode className="h-full w-full" strokeWidth={1.5} aria-label="App QR code placeholder" />
              </div>
            </div>
            <p className="mt-3 max-w-40 text-xs leading-relaxed text-neutral-500">Scan to download on iOS &amp; Android</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-neutral-800 pt-6 text-xs text-neutral-500 md:flex-row">
          <p>© 2026 Kehi. All rights reserved.</p>
          <nav aria-label="Legal links" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/#discover" className="transition-colors hover:text-white">Terms &amp; Conditions</Link>
            <Link href="/#discover" className="transition-colors hover:text-white">Privacy Policy</Link>
            <Link href="/#discover" className="transition-colors hover:text-white">Cookie Policy</Link>
          </nav>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-neutral-500">By accessing this page, you confirm that you have read, understood, and agreed to our Terms of Service, Privacy Policy, and Content Guidelines.</p>
      </div>
    </footer>
  );
}