import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import {
  KLARENCY_DISTANCES,
  KLARENCY_DURATIONS,
  KLARENCY_EASE,
  KLARENCY_STAGGER,
} from '../../utils/motionTokens';

/**
 * Signature KLARENCY animated element: a restrained, slowly drifting
 * liquid-glass light plane using GPU-composited transform/opacity only.
 */
export function SignatureAtmosphere() {
  const shouldReduce = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <motion.div
        initial={shouldReduce ? false : { opacity: 0.45, scale: 0.96 }}
        animate={
          shouldReduce
            ? { opacity: 0.55 }
            : {
                opacity: [0.45, 0.7, 0.45],
                x: [-24, 24, -24],
                y: [-16, 16, -16],
                scale: [0.98, 1.04, 0.98],
              }
        }
        transition={
          shouldReduce
            ? { duration: 0 }
            : {
                duration: 22,
                repeat: Infinity,
                ease: 'easeInOut',
              }
        }
        className="absolute -left-1/4 -top-1/4 h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.16)_0%,rgba(34,211,238,0.06)_45%,transparent_72%)] blur-2xl will-change-transform"
      />

      <motion.div
        initial={shouldReduce ? false : { opacity: 0.35 }}
        animate={
          shouldReduce
            ? { opacity: 0.4 }
            : {
                opacity: [0.3, 0.5, 0.3],
                x: [20, -20, 20],
                y: [12, -12, 12],
              }
        }
        transition={
          shouldReduce
            ? { duration: 0 }
            : {
                duration: 26,
                repeat: Infinity,
                ease: 'easeInOut',
              }
        }
        className="absolute -bottom-1/4 -right-1/4 h-[540px] w-[540px] rounded-full bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.12)_0%,rgba(37,99,235,0.05)_50%,transparent_74%)] blur-2xl will-change-transform"
      />
    </div>
  );
}

interface SectionRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function SectionReveal({ children, className = '', delay = 0 }: SectionRevealProps) {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: KLARENCY_DISTANCES.sectionY }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{
        duration: KLARENCY_DURATIONS.base,
        delay,
        ease: KLARENCY_EASE,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  index: number;
  className?: string;
}

export function StaggerItem({ children, index, className = '' }: StaggerItemProps) {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: KLARENCY_DISTANCES.subtleY }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{
        duration: KLARENCY_DURATIONS.fast,
        delay: Math.min(index, 6) * KLARENCY_STAGGER.grid,
        ease: KLARENCY_EASE,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function RouteTransition({ children, className = '' }: { children: ReactNode; className?: string }) {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: KLARENCY_DISTANCES.routeY }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -KLARENCY_DISTANCES.routeY }}
      transition={{ duration: KLARENCY_DURATIONS.fast, ease: KLARENCY_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
