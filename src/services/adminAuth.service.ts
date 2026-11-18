import { supabaseAnonKey, supabaseUrl } from '@/lib/supabase'

export interface AdminSignInSession {
  accessToken: string
  refreshToken: string
  userId: string
  email: string
}

export interface AdminLoginAttemptInfo {
  remaining?: number
  lockedUntil?: string | null
  isLocked?: boolean
  failedAttempts?: number
}

export class AdminLoginError extends Error {
  readonly remaining?: number
  readonly lockedUntil: string | null
  readonly isLocked: boolean
  readonly failedAttempts?: number

  constructor(message: string, info: AdminLoginAttemptInfo = {}) {
    super(message)
    this.name = 'AdminLoginError'
    this.remaining = info.remaining
    this.lockedUntil = info.lockedUntil ?? null
    this.isLocked = Boolean(info.isLocked)
    this.failedAttempts = info.failedAttempts
  }
}

interface AdminSignInResponse {
  accessToken?: unknown
  refreshToken?: unknown
  user?: { id?: unknown; email?: unknown }
}

function readAttemptInfo(payload: Record<string, unknown>): AdminLoginAttemptInfo {
  return {
    remaining: typeof payload.remaining === 'number' ? payload.remaining : undefined,
    lockedUntil: typeof payload.lockedUntil === 'string' ? payload.lockedUntil : null,
    isLocked: Boolean(payload.isLocked),
    failedAttempts:
      typeof payload.failedAttempts === 'number' ? payload.failedAttempts : undefined,
  }
}

export async function signInAdmin(email: string, password: string): Promise<AdminSignInSession> {
  let response: Response

  try {
    response = await fetch(`${supabaseUrl}/functions/v1/admin-sign-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ email, password }),
    })
  } catch {
    throw new AdminLoginError('Unable to connect. Please check your connection and try again.')
  }

  let payload: Record<string, unknown> = {}
  try {
    const parsed: unknown = await response.json()
    if (parsed && typeof parsed === 'object') payload = parsed as Record<string, unknown>
  } catch {
    // A non-JSON response still gets a generic error below.
  }

  if (!response.ok) {
    const message =
      typeof payload.message === 'string' && payload.message.trim()
        ? payload.message
        : 'Unable to sign in. Please try again.'
    throw new AdminLoginError(message, readAttemptInfo(payload))
  }

  const data = payload as AdminSignInResponse
  const user = data.user
  if (
    typeof data.accessToken !== 'string' ||
    typeof data.refreshToken !== 'string' ||
    !user ||
    typeof user.id !== 'string'
  ) {
    throw new AdminLoginError('Unable to sign in. Please try again.')
  }

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    userId: user.id,
    email: typeof user.email === 'string' ? user.email : email,
  }
}
