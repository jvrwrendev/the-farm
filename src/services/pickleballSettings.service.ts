import { supabase } from '@/lib/supabase'

export interface PickleballSettings {
  exclusiveEnabled: boolean
  exclusiveRate24h: number
}

interface PickleballSettingsRow {
  id: number
  exclusive_enabled: boolean
  exclusive_rate_24h: number | string
  updated_at: string
}

function mapRow(row: PickleballSettingsRow): PickleballSettings {
  return {
    exclusiveEnabled: Boolean(row.exclusive_enabled),
    exclusiveRate24h: Number(row.exclusive_rate_24h ?? 0),
  }
}

export async function getPickleballSettings(): Promise<PickleballSettings> {
  const { data, error } = await supabase
    .from('pickleball_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return { exclusiveEnabled: false, exclusiveRate24h: 0 }
  return mapRow(data as PickleballSettingsRow)
}

export async function updatePickleballSettings(
  input: PickleballSettings,
): Promise<PickleballSettings> {
  const { data, error } = await supabase
    .from('pickleball_settings')
    .update({
      exclusive_enabled: Boolean(input.exclusiveEnabled),
      exclusive_rate_24h: Number(input.exclusiveRate24h ?? 0),
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapRow(data as PickleballSettingsRow)
}
