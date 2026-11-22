import { createClient } from '@supabase/supabase-js';

// Default keys from env or localStorage
export function getSupabaseConfig() {
  const url = localStorage.getItem('duo_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '';
  const key = localStorage.getItem('duo_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return { url, key };
}

export function saveSupabaseConfig(url, key) {
  if (url) localStorage.setItem('duo_supabase_url', url.trim());
  else localStorage.removeItem('duo_supabase_url');

  if (key) localStorage.setItem('duo_supabase_key', key.trim());
  else localStorage.removeItem('duo_supabase_key');

  supabaseInstance = null;
  return getSupabase();
}

let supabaseInstance = null;

export function getSupabase() {
  const { url, key } = getSupabaseConfig();
  if (url && key) {
    if (!supabaseInstance || supabaseInstance.supabaseUrl !== url) {
      try {
        supabaseInstance = createClient(url, key, {
          realtime: {
            params: {
              eventsPerSecond: 10,
            },
          },
        });
      } catch (err) {
        console.error('Supabase init error:', err);
        supabaseInstance = null;
      }
    }
    return supabaseInstance;
  }
  return null;
}

