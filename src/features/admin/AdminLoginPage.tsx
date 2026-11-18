import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { BRAND_LOGO_ALT, BRAND_LOGO_URL, BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand'
import heroImage from '@/assets/images/hero.jpg'

type Mode = 'login' | 'forgot' | 'recovery'

interface LocationState {
  from?: { pathname?: string }
  denied?: boolean
}

export default function AdminLoginPage() {
  const { user, isAdmin, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mode, setMode] = useState<Mode>('login')

  // login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [denied, setDenied] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // forgot
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSubmitting, setForgotSubmitting] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  // recovery
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [recoverySubmitting, setRecoverySubmitting] = useState(false)
  const [recoveryError, setRecoveryError] = useState('')

  useEffect(() => {
    const state = (location.state ?? null) as LocationState | null
    if (state?.denied) setDenied(true)

    const hash = window.location.hash
    if (hash.includes('type=recovery')) {
      setMode('recovery')
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('recovery')
    })
    return () => sub.subscription.unsubscribe()
  }, [location.state])

  if (user && isAdmin && mode !== 'recovery') {
    return <Navigate to="/admin/dashboard" replace />
  }

  const from = (location.state as LocationState | null)?.from?.pathname

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setDenied(false)
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate(from && from.startsWith('/admin') ? from : '/admin/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleForgot = async (event: FormEvent) => {
    event.preventDefault()
    setForgotError('')
    const value = forgotEmail.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setForgotError('Enter a valid email address.')
      return
    }
    setForgotSubmitting(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(value, {
        redirectTo: `${window.location.origin}/admin/login`,
      })
      if (resetError) throw resetError
      setForgotSent(true)
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : 'Unable to send reset link.')
    } finally {
      setForgotSubmitting(false)
    }
  }

  const handleRecovery = async (event: FormEvent) => {
    event.preventDefault()
    setRecoveryError('')
    if (newPassword.length < 8) {
      setRecoveryError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setRecoveryError('Passwords do not match.')
      return
    }
    setRecoverySubmitting(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError
      window.history.replaceState(null, '', window.location.pathname)
      toast.success('Password updated. You are now signed in.')
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setRecoveryError(err instanceof Error ? err.message : 'Unable to update password.')
    } finally {
      setRecoverySubmitting(false)
    }
  }

  const renderLogin = () => (
    <>
      <CardHeader className="space-y-1.5 p-0">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-primary/15 bg-primary/5">
          <ShieldCheck className="h-5 w-5 text-primary" strokeWidth={1.75} />
        </div>
        <CardTitle className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Welcome back
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed text-muted-foreground">
          Sign in to your admin account to manage the resort.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pt-7">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@example.com"
                className="h-11 pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email)
                  setForgotError('')
                  setForgotSent(false)
                  setMode('forgot')
                }}
                className="text-xs font-medium text-primary hover:underline underline-offset-4"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                className="h-11 pl-9 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {(denied || error) && (
            <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {denied ? 'Your account is signed in but does not have administrator access.' : error}
            </p>
          )}

          <Button type="submit" className="h-11 w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
      </CardContent>
    </>
  )

  const renderForgot = () => (
    <>
      <CardHeader className="space-y-1.5 p-0">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-primary/15 bg-primary/5">
          <KeyRound className="h-5 w-5 text-primary" strokeWidth={1.75} />
        </div>
        <CardTitle className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Reset password
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed text-muted-foreground">
          Enter your admin email and we&apos;ll send you a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pt-7">
        {forgotSent ? (
          <div className="space-y-5">
            <div className="rounded-md border border-border bg-muted/30 px-3 py-3 text-sm text-foreground">
              A reset link has been sent to <span className="font-medium">{forgotEmail}</span>.
            </div>
            <Button type="button" variant="outline" className="h-11 w-full" onClick={() => setMode('login')}>
              Back to sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={handleForgot} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@example.com"
                  className="h-11 pl-9"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {forgotError && (
              <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {forgotError}
              </p>
            )}

            <div className="space-y-2">
              <Button type="submit" className="h-11 w-full" disabled={forgotSubmitting}>
                {forgotSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                  </>
                ) : (
                  'Send reset link'
                )}
              </Button>
              <Button type="button" variant="ghost" className="h-11 w-full" onClick={() => setMode('login')}>
                Back to sign in
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </>
  )

  const renderRecovery = () => (
    <>
      <CardHeader className="space-y-1.5 p-0">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-primary/15 bg-primary/5">
          <Lock className="h-5 w-5 text-primary" strokeWidth={1.75} />
        </div>
        <CardTitle className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Set new password
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed text-muted-foreground">
          Choose a new password for your admin account.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pt-7">
        <form onSubmit={handleRecovery} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="h-11 pl-9 pr-10"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirm-password"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repeat new password"
                className="h-11 pl-9"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {recoveryError && (
            <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {recoveryError}
            </p>
          )}

          <Button type="submit" className="h-11 w-full" disabled={recoverySubmitting}>
            {recoverySubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Updating...
              </>
            ) : (
              'Update password'
            )}
          </Button>
        </form>
      </CardContent>
    </>
  )

  return (
    <div className="grid min-h-screen lg:grid-cols-[70%_30%]">
      {/* Left: brand panel */}
      <aside className="relative hidden overflow-hidden bg-foreground lg:block">
        <img
          src={heroImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/55 to-black/40" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white xl:p-14">
          <Link to="/" className="inline-flex w-fit items-center gap-3 rounded-lg border border-white/15 bg-black/20 px-3 py-2 backdrop-blur-sm transition-colors hover:bg-black/30">
            <img
              src={BRAND_LOGO_URL}
              alt={BRAND_LOGO_ALT}
              className="h-9 w-9 rounded-md object-cover ring-1 ring-white/25"
            />
            <span className="font-display text-lg font-semibold tracking-tight">{BRAND_NAME}</span>
          </Link>

          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">
              Admin Portal
            </p>
            <h1 className="font-display mt-4 text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
              Manage your resort with confidence.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/70">
              {BRAND_TAGLINE}
            </p>
          </div>

          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
          </p>
        </div>
      </aside>

      {/* Right: form panel */}
      <div className="flex items-center justify-center bg-secondary/30 px-6 py-12 lg:px-10">
        <div className="w-full max-w-sm">
          {/* Mobile brand header */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img
              src={BRAND_LOGO_URL}
              alt={BRAND_LOGO_ALT}
              className="h-10 w-10 rounded-md object-cover"
            />
            <div>
              <p className="font-display text-lg font-semibold tracking-tight text-foreground">{BRAND_NAME}</p>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Admin Portal</p>
            </div>
          </div>

          <Card className="rounded-xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
            {mode === 'login' && renderLogin()}
            {mode === 'forgot' && renderForgot()}
            {mode === 'recovery' && renderRecovery()}
          </Card>

          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to website
          </Link>
        </div>
      </div>
    </div>
  )
}
