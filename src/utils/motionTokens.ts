import type { Transition } from 'motion/react';

export const KLARENCY_EASE = [0.16, 1, 0.3, 1] as const;

export const KLARENCY_DURATIONS = {
  micro: 0.16,
  fast: 0.24,
  base: 0.38,
  slow: 0.55,
} as const;

export const KLARENCY_STAGGER = {
  hero: 0.06,
  grid: 0.05,
} as const;

export const KLARENCY_DISTANCES = {
  subtleY: 12,
  sectionY: 20,
  routeY: 8,
} as const;

export const KLARENCY_TRANSITION: Transition = {
  duration: KLARENCY_DURATIONS.base,
  ease: KLARENCY_EASE,
};

export const KLARENCY_SPRING: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 32,
  mass: 0.8,
};

/**
 * Computes normalized scroll progress [0, 1] safely without NaN.
 */
export function computeScrollProgress(
  scrollY: number,
  scrollHeight: number,
  viewportHeight: number,
): number {
  const scrollable = scrollHeight - viewportHeight;
  if (scrollable <= 0) return 0;
  const raw = scrollY / scrollable;
  return Math.min(1, Math.max(0, Number(raw.toFixed(4))));
}

/**
 * Resolves the active navigation section ID given vertical offsets and current scrollY.
 */
export function resolveActiveSection(
  sections: Array<{ id: string; top: number }>,
  scrollY: number,
  offsetPx = 140,
): string {
  if (sections.length === 0) return 'home';
  const sorted = [...sections].sort((a, b) => a.top - b.top);
  let active = sorted[0].id;
  const threshold = scrollY + offsetPx;
  for (const sec of sorted) {
    if (sec.top <= threshold) {
      active = sec.id;
    }
  }
  return active;
}

/**
 * Normalizes desktop pointer coordinates into clamped percentage [0, 100] for subtle spotlight lighting.
 */
export function normalizePointerSpotlight(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): { xPct: number; yPct: number } {
  if (rect.width <= 0 || rect.height <= 0) return { xPct: 50, yPct: 35 };
  const x = ((clientX - rect.left) / rect.width) * 100;
  const y = ((clientY - rect.top) / rect.height) * 100;
  return {
    xPct: Math.min(100, Math.max(0, Math.round(x * 10) / 10)),
    yPct: Math.min(100, Math.max(0, Math.round(y * 10) / 10)),
  };
}

/**
 * Returns adjacent item index for case-study modal navigation, wrapping cleanly.
 */
export function getAdjacentIndex(currentIndex: number, total: number, delta: -1 | 1): number {
  if (total <= 0) return -1;
  return (currentIndex + delta + total) % total;
}
