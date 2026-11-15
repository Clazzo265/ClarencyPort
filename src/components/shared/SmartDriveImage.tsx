import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { buildDrivePublicUrlCandidates, extractDriveFileIdFromUrl } from '../../utils/mediaLogic';
import { sanitizeExternalUrl } from '../../utils/validation';

interface SmartDriveImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallback?: ReactNode;
  onAllFailed?: () => void;
}

export function SmartDriveImage({
  src,
  alt,
  className,
  fallback = null,
  onAllFailed,
}: SmartDriveImageProps) {
  const candidates = useMemo(() => {
    const clean = sanitizeExternalUrl(src);
    if (!clean) return [];
    const driveId = extractDriveFileIdFromUrl(clean);
    if (!driveId) return [clean];
    const { candidates: driveCandidates } = buildDrivePublicUrlCandidates(driveId, 'image/jpeg');
    const seen = new Set<string>([clean, ...driveCandidates]);
    return Array.from(seen);
  }, [src]);

  const [attemptIndex, setAttemptIndex] = useState(0);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    setAttemptIndex(0);
    setExhausted(false);
  }, [src]);

  if (candidates.length === 0 || exhausted) {
    return <>{fallback}</>;
  }

  const activeSrc = candidates[Math.min(attemptIndex, candidates.length - 1)];

  return (
    <img
      src={activeSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      className={className}
      onError={() => {
        if (attemptIndex + 1 < candidates.length) {
          setAttemptIndex((idx) => idx + 1);
        } else {
          setExhausted(true);
          onAllFailed?.();
        }
      }}
    />
  );
}
