import { supabase } from '@/lib/supabase'

export interface PickleballSettings {
  exclusiveEnabled: boolean
  exclusiveRate24h: number
  openTime: string
  closeTime: string
  courtsCount: number
  maxPlayersPerCourt: number
  startingHourlyRate: number
}

interface PickleballSettingsRow {
  id: number
  exclusive_enabled: boolean
  exclusive_rate_24h: number | string
  open_time?: string | null
  close_time?: string | null
  courts_count?: number | string | null
  max_players_per_court?: number | string | null
  starting_hourly_rate?: number | string | null
  updated_at: string
}

const DEFAULTS: PickleballSettings = {
  exclusiveEnabled: false,
  exclusiveRate24h: 0,
  openTime: '07:00',
  closeTime: '21:00',
  courtsCount: 3,
  maxPlayersPerCourt: 4,
  startingHourlyRate: 200,
}

function mapRow(row: PickleballSettingsRow): PickleballSettings {
  return {
    exclusiveEnabled: Boolean(row.exclusive_enabled),
    exclusiveRate24h: Number(row.exclusive_rate_24h ?? 0),
    openTime: row.open_time || DEFAULTS.openTime,
    closeTime: row.close_time || DEFAULTS.closeTime,
    courtsCount: Math.max(0, Number(row.courts_count ?? DEFAULTS.courtsCount)),
    maxPlayersPerCourt: Math.max(1, Number(row.max_players_per_court ?? DEFAULTS.maxPlayersPerCourt)),
    startingHourlyRate: Math.max(0, Number(row.starting_hourly_rate ?? DEFAULTS.startingHourlyRate)),
  }
}

export async function getPickleballSettings(): Promise<PickleballSettings> {
  const { data, error } = await supabase
    .from('pickleball_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return { ...DEFAULTS }
  return mapRow(data as PickleballSettingsRow)
}

export async function updatePickleballSettings(
  input: PickleballSettings,
): Promise<PickleballSettings> {
  const payload = {
    exclusive_enabled: Boolean(input.exclusiveEnabled),
    exclusive_rate_24h: Number(input.exclusiveRate24h ?? 0),
    open_time: input.openTime || DEFAULTS.openTime,
    close_time: input.closeTime || DEFAULTS.closeTime,
    courts_count: Math.max(0, Math.round(Number(input.courtsCount ?? DEFAULTS.courtsCount))),
    max_players_per_court: Math.max(1, Math.round(Number(input.maxPlayersPerCourt ?? DEFAULTS.maxPlayersPerCourt))),
    starting_hourly_rate: Math.max(0, Number(input.startingHourlyRate ?? DEFAULTS.startingHourlyRate)),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('pickleball_settings')
    .update(payload)
    .eq('id', 1)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapRow(data as PickleballSettingsRow)
}
