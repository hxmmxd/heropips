/**
 * Generate a DiceBear avatar URL for a user.
 * Uses the "adventurer-neutral" style — gender-neutral illustrated cartoon faces.
 * Deterministic: same seed always returns the same avatar.
 *
 * Priority chain:
 *  1. Custom uploaded avatar (avatar_url from profile/auth)
 *  2. DiceBear adventurer-neutral (generated from user ID or name)
 */
export function getUserAvatar(user: {
  avatar_url?: string | null;
  id?: string;
  full_name?: string;
  email?: string;
}): string {
  if (user.avatar_url) return user.avatar_url;
  const seed = user.id || user.full_name || user.email || 'default';
  return `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${encodeURIComponent(seed)}&radius=50&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

/**
 * Get avatar URL for a display name string.
 */
export function getMemojiForName(name: string): string {
  return `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${encodeURIComponent(name || 'user')}&radius=50&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}
