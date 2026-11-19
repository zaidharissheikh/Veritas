// Small copy helpers shared by every page.

/** "1 analysis" / "3 analyses"; the plural defaults to singular + "s". */
export function countLabel(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
