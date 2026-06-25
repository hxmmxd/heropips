/**
 * Helper to clean and format broker server/account names for institutional display.
 * Removes redundant trailing login IDs and cleans up corporate suffixes.
 */
export function cleanBrokerName(fullName: string): string {
  if (!fullName) return '';
  if (fullName === 'none' || fullName === 'No Broker') return 'No Broker';
  
  // Normalize colons and underscores to hyphens
  let normalized = fullName.replace(/[:_]/g, '-');
  
  // Split into parts
  let parts = normalized.split('-');
  
  // Remove the last part if it is numeric (the login/account ID)
  if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1].trim())) {
    parts.pop();
  }
  
  // Rejoin and clean corporate noise
  let cleaned = parts
    .map(p => p.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\bSoftware\b/gi, '')
    .replace(/\bCorp\b/gi, '')
    .replace(/\bCorporation\b/gi, '')
    .replace(/\bLtd\b/gi, '')
    .replace(/\bLimited\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s*\.$/, '') // Remove trailing dots left from "Corp."
    .trim();
    
  return cleaned || fullName;
}
