import { formatScore, riskLabel, riskLevelFor } from '../../lib/score.js';
import { countLabel } from '../../lib/text.js';

export function greetingFor(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** "demo@veritas.app" -> "Demo". Falls back to a friendly word when unknown. */
export function nameFromEmail(email) {
  const local = String(email || '').split('@')[0].trim();
  if (!local) return 'there';
  return local.charAt(0).toUpperCase() + local.slice(1);
}

/** One-line summary of the current 30-day period for the page subtitle. */
export function periodSummary(diet) {
  if (!diet || !diet.totalAnalyses) return 'No analyses in the last 30 days yet.';
  const level = riskLabel(riskLevelFor(diet.averageScore)).toLowerCase();
  const count = countLabel(diet.totalAnalyses, 'analysis', 'analyses');
  return `${count} in the last 30 days · average ${formatScore(diet.averageScore)}, ${level}`;
}
