'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Chrome, Fingerprint, KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { auth } from '@/lib/firebase';
import { hasAdminAccess } from '@/lib/data';

export default function AdminLoginPage() {
  const { user, loading: authLoading, signIn, signInWithGoogle, signOut } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checkingRole, setCheckingRole] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;
    setCheckingRole(true);
    hasAdminAccess(user.uid).then((isAdmin) => {
      if (active && isAdmin) router.replace('/admin/');
      else if (active) setError('This account does not have administrator access.');
    }).catch(() => {
      if (active) setError('Could not verify administrator access. Check your connection and retry.');
    }).finally(() => {
      if (active) setCheckingRole(false);
    });
    return () => { active = false; };
  }, [authLoading, user, router]);

  const verifyCurrentUser = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError('Sign-in completed, but the user session is not ready yet. Please retry.');
      return;
    }
    const allowed = await hasAdminAccess(currentUser.uid);
    if (!allowed) {
      await signOut();
      throw new Error('Access denied. This account is not an administrator.');
    }
    router.replace('/admin/');
  };

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const result = await signIn(email.trim(), password);
    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    try {
      await verifyCurrentUser();
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'Could not verify administrator access.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setError('');
    const result = await signInWithGoogle();
    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    try {
      await verifyCurrentUser();
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'Could not verify administrator access.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080d12] px-4 py-10 text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(99, 229, 200, .13) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 229, 200, .13) 1px, transparent 1px)', backgroundSize: '52px 52px', maskImage: 'linear-gradient(to bottom, black, transparent 85%)' }} />
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="relative w-full max-w-md border border-white/10 bg-[#0b1218]/95 p-6 shadow-2xl sm:p-8">
        <div className="mb-7 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xs text-slate-500 transition-colors hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Marketplace</Link>
          {user && <button type="button" onClick={() => void signOut()} className="text-xs text-slate-500 hover:text-white">Sign out</button>}
        </div>
        <div className="mb-7">
          <span className="inline-flex items-center gap-2 border border-emerald-300/20 bg-emerald-300/[0.07] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-emerald-200"><ShieldCheck className="h-3.5 w-3.5" />Restricted access</span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Administrator sign-in</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Use an account with an admin claim or an administrator role in your user profile.</p>
        </div>

        <AnimatePresence initial={false}>
          {error && <motion.p key={error} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="mb-4 border border-rose-300/20 bg-rose-300/[0.07] px-3 py-2.5 text-xs leading-5 text-rose-200">{error}</motion.p>}
        </AnimatePresence>

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <label className="block text-xs text-slate-400">Admin email
            <span className="relative mt-1.5 block"><Fingerprint className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" /><input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className="h-11 w-full border border-white/10 bg-[#080d12] pl-10 pr-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-700 focus:border-emerald-300/40" /></span>
          </label>
          <label className="block text-xs text-slate-400">Password
            <span className="relative mt-1.5 block"><KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" /><input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className="h-11 w-full border border-white/10 bg-[#080d12] pl-10 pr-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-700 focus:border-emerald-300/40" /></span>
          </label>
          <button type="submit" disabled={submitting || checkingRole || authLoading} className="flex h-11 w-full items-center justify-center gap-2 bg-emerald-300 px-4 text-sm font-semibold text-[#07100e] transition-colors hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-50">{submitting || checkingRole ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}Sign in as administrator</button>
        </form>

        <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-slate-600"><span className="h-px flex-1 bg-white/10" />or<span className="h-px flex-1 bg-white/10" /></div>
        <button type="button" onClick={handleGoogleSignIn} disabled={submitting || checkingRole || authLoading} className="flex h-11 w-full items-center justify-center gap-2 border border-white/10 text-sm text-slate-200 transition-colors hover:border-white/20 hover:bg-white/[0.03] disabled:opacity-50"><Chrome className="h-4 w-4" />Continue with Google</button>
        <p className="mt-5 text-center text-[11px] leading-5 text-slate-600">Google sign-in must be enabled in Firebase Authentication. Role checks remain enforced by Firestore rules.</p>
      </motion.section>
    </main>
  );
}