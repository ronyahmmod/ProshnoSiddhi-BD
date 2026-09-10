import { useState, useEffect } from 'react';

export interface NetworkSpeedInfo {
  isFastConnection: boolean;
  speedTier: 'ultra' | 'fast' | 'moderate' | 'slow';
  effectiveType: string;
  downlinkMbps?: number;
  rttMs?: number;
}

export function useNetworkSpeed(): NetworkSpeedInfo {
  const [speedInfo, setSpeedInfo] = useState<NetworkSpeedInfo>(() => {
    // Default optimistic state
    return {
      isFastConnection: true,
      speedTier: 'fast',
      effectiveType: '4g',
      downlinkMbps: 10,
      rttMs: 50
    };
  });

  useEffect(() => {
    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    const evaluateSpeed = () => {
      if (connection) {
        const effectiveType = connection.effectiveType || '4g';
        const downlink = connection.downlink || 10;
        const rtt = connection.rtt || 50;
        const saveData = connection.saveData || false;

        let isFast = true;
        let tier: 'ultra' | 'fast' | 'moderate' | 'slow' = 'fast';

        if (saveData) {
          isFast = false;
          tier = 'slow';
        } else if (effectiveType === '4g' && downlink >= 5 && rtt <= 100) {
          isFast = true;
          tier = 'ultra';
        } else if (effectiveType === '4g' && downlink >= 1.5) {
          isFast = true;
          tier = 'fast';
        } else if (effectiveType === '3g' || (downlink >= 0.5 && downlink < 1.5)) {
          isFast = false;
          tier = 'moderate';
        } else {
          isFast = false;
          tier = 'slow';
        }

        setSpeedInfo({
          isFastConnection: isFast,
          speedTier: tier,
          effectiveType,
          downlinkMbps: downlink,
          rttMs: rtt
        });
      } else {
        // Fallback: measure ping time to health endpoint
        const start = performance.now();
        fetch('/api/health')
          .then(() => {
            const duration = performance.now() - start;
            const isFast = duration < 250;
            setSpeedInfo({
              isFastConnection: isFast,
              speedTier: duration < 100 ? 'ultra' : isFast ? 'fast' : 'moderate',
              effectiveType: isFast ? '4g' : '3g',
              rttMs: Math.round(duration)
            });
          })
          .catch(() => {
            setSpeedInfo({
              isFastConnection: true,
              speedTier: 'fast',
              effectiveType: '4g'
            });
          });
      }
    };

    evaluateSpeed();

    if (connection) {
      connection.addEventListener('change', evaluateSpeed);
      return () => {
        connection.removeEventListener('change', evaluateSpeed);
      };
    }
  }, []);

  return speedInfo;
}
