// Single source of truth for which HSK levels the site knows about, so
// adding a level is a one-line change here instead of a hunt through every
// place a level-number union was previously inlined.
export type HskLevel = 1 | 2 | 3 | 4 | 5 | 6;

export const ALL_HSK_LEVELS: readonly HskLevel[] = [1, 2, 3, 4, 5, 6];

export function isHskLevel(n: number): n is HskLevel {
  return (ALL_HSK_LEVELS as readonly number[]).includes(n);
}
