/**
 * Shared utility functions for the web app
 */

// Species emoji mapping - covers all species from @petport/shared constants
export const SPECIES_EMOJI: Record<string, string> = {
  DOG: '🐕',
  CAT: '🐈',
  BIRD: '🐦',
  RABBIT: '🐰',
  REPTILE: '🦎',
  OTHER: '🐾',
};

/**
 * Get emoji for a pet species
 * @param species - The species string (DOG, CAT, etc.)
 * @returns Emoji string, defaults to 🐾 for unknown species
 */
export function getSpeciesEmoji(species: string): string {
  return SPECIES_EMOJI[species] ?? '🐾';
}

/**
 * Format date for display
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format date with time
 * @param dateString - ISO date string
 * @returns Formatted date and time string
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Invalid date';
  }
}

/**
 * Calculate days until a date
 * @param dateString - ISO date string
 * @returns Number of days (negative if past)
 */
export function daysUntil(dateString: string | null | undefined): number | null {
  if (!dateString) return null;
  try {
    const target = new Date(dateString);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text with ellipsis if needed
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}
