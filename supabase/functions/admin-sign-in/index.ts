// Supabase Edge Function: admin-sign-in
// Enforces a 3-attempt / 3-minute lockout before verifying an admin password.
// The service role is used only for the private attempt-tracking table/functions.

import { createClient } from 'npm:@supabase/supabase-js@^2.49.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const MAX_ATTEMPTS = 3
const LOCK_MINUTES = 3

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface AttemptState {
  failedAttempts: number
  lockedUntil: string | null
  isLocked: boolean
  remaining: number
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

function normalizeState(raw: unknown): AttemptState {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const failedAttempts = Number(value.failedAttempts ?? 0)
  return {
    failedAttempts,
    lockedUntil: typeof value.lockedUntil === 'string' ? value.lockedUntil : null,
    isLocked: Boolean(value.isLocked),
    remaining: Number(value.remaining ?? Math.max(0, MAX_ATTEMPTS - failedAttempts)),
  }
}

function formatRemaining(lockedUntil: string | null): string {
  if (!lockedUntil) return `${LOCK_MINUTES} minutes`
  const ms = new Date(lockedUntil).getTime() - Date.now()
  if (!Number.isFinite(ms) || ms <= 0) return `${LOCK_MINUTES} minutes`
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function friendlyAuthError(message: string): string {
  const value = message.toLowerCase()
  if (value.includes('invalid login') || value.includes('invalid credentials')) {
    return 'Invalid email or password.'
  }
  if (value.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.'
  }
  if (value.includes('rate limit')) {
    return `Too many attempts. Please wait ${LOCK_MINUTES} minutes and try again.`
  }
  return 'Unable to sign in. Please try again.'
}

function attemptSuffix(state: AttemptState): string {
  if (state.isLocked) {
    return ` Account locked for ${formatRemaining(state.lockedUntil)}.`
  }
  if (state.remaining > 0) {
    return ` ${state.remaining} attempt${state.remaining === 1 ? '' : 's'} remaining.`
  }
  return ''
}

function attemptPayload(state: AttemptState) {
  return {
    remaining: state.remaining,
    lockedUntil: state.lockedUntil,
    isLocked: state.isLocked,
    failedAttempts: state.failedAttempts,
  }
}

async function getAttemptState(email: string): Promise<AttemptState | null> {
  const { data, error } = await adminClient.rpc('admin_login_attempt_state', { p_email: email })
  if (error) {
    console.error('[admin-sign-in] attempt state error:', error.message)
    return null
  }
  return normalizeState(data)
}

async function recordFailure(email: string): Promise<AttemptState | null> {
  const { data, error } = await adminClient.rpc('record_admin_login_failure', { p_email: email })
  if (error) {
    console.error('[admin-sign-in] record failure error:', error.message)
    return null
  }
  return normalizeState(data)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }
  if (req.method !== 'POST') {
    return json({ message: 'Method not allowed.' }, 405)
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return json({ message: 'Invalid request body.' }, 400)
  }

  const rawEmail = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!rawEmail || !password) {
    return json({ message: 'Email and password are required.' }, 400)
  }

  const email = rawEmail.toLowerCase()

  const currentState = await getAttemptState(email)
  if (currentState?.isLocked) {
    return json(
      {
        message: `Too many attempts. Try again in ${formatRemaining(currentState.lockedUntil)}.`,
        ...attemptPayload(currentState),
      },
      429,
    )
  }

  const { data, error } = await authClient.auth.signInWithPassword({ email, password })

  if (error || !data.user || !data.session) {
    const nextState = (await recordFailure(email)) ?? currentState ?? normalizeState(null)
    const message = `${friendlyAuthError(error?.message ?? 'Invalid credentials.')}${attemptSuffix(nextState)}`
    return json({ message, ...attemptPayload(nextState) }, 401)
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileError) {
    console.error('[admin-sign-in] profile error:', profileError.message)
    await authClient.auth.signOut()
    return json({ message: 'Unable to verify account permissions.' }, 500)
  }

  if (profile?.role !== 'admin') {
    // A valid password for a non-admin account still counts as a failed admin sign-in.
    const nextState = (await recordFailure(email)) ?? currentState ?? normalizeState(null)
    await authClient.auth.signOut()
    return json(
      {
        message: `This account does not have administrator access.${attemptSuffix(nextState)}`,
        ...attemptPayload(nextState),
      },
      403,
    )
  }

  const { error: clearError } = await adminClient.rpc('clear_admin_login_attempts', { p_email: email })
  if (clearError) {
    // Do not block a valid sign-in if cleanup fails; log it for diagnosis.
    console.error('[admin-sign-in] clear attempts error:', clearError.message)
  }

  return json({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: {
      id: data.user.id,
      email: data.user.email ?? email,
    },
  })
})
