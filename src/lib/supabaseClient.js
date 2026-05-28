import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isLocalCheckoutMode = import.meta.env.VITE_CHECKOUT_LOCAL_MODE === 'true'
export const isLowEgressMode = import.meta.env.VITE_CHECKOUT_SUPABASE_LOW_EGRESS === 'true'

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey) && !isLocalCheckoutMode

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null
