/**
 * platformConfig.ts
 * Server-side helper to read platform_config values from Supabase,
 * falling back to environment variables. This allows admins to update
 * API keys from the admin panel without redeploying.
 */

import { createClient } from '@supabase/supabase-js';

let _admin: any = null;
function getAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _admin;
}

// In-memory config cache — refreshed every 60 seconds
let _configCache: Record<string, string> | null = null;
let _configCachedAt = 0;
const CONFIG_CACHE_TTL = 60_000; // 60 s

export async function getConfigCache(): Promise<Record<string, string>> {
  if (_configCache && Date.now() - _configCachedAt < CONFIG_CACHE_TTL) {
    return _configCache;
  }
  try {
    const { data } = await getAdmin().from('platform_config').select('key, value');
    const cache: Record<string, string> = {};
    for (const row of data || []) {
      if (typeof row.value === 'string') cache[row.key] = row.value;
      else if (row.value !== null && row.value !== undefined) cache[row.key] = String(row.value);
    }
    _configCache = cache;
    _configCachedAt = Date.now();
    return cache;
  } catch {
    return _configCache || {};
  }
}

/** Invalidate cache so next read gets fresh data from Supabase */
export function invalidatePlatformConfigCache() {
  _configCache = null;
  _configCachedAt = 0;
}

/**
 * Read a config value: checks Supabase platform_config first,
 * then falls back to the given environment variable.
 */
export async function getPlatformConfig(
  configKey: string,
  envFallback: string
): Promise<string> {
  const cache = await getConfigCache();
  return cache[configKey] || process.env[envFallback] || '';
}
