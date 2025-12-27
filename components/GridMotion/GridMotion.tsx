'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './GridMotion.module.css';

interface GridMotionProps {
  items?: (string | React.ReactNode)[];
  gradientColor?: string;
}

const GridMotion = ({ items = [], gradientColor = 'black' }: GridMotionProps) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mouseXRef = useRef(typeof window !== 'undefined' ? window.innerWidth / 2 : 0);
  const gsapRef = useRef<typeof import('gsap') | null>(null);

  const totalItems = 28;
  const defaultItems = Array.from({ length: totalItems }, (_, index) => `Item ${index + 1}`);

  // Use state for shuffled items to avoid hydration mismatch
  const [combinedItems, setCombinedItems] = useState<(string | React.ReactNode)[]>(() => {
    // Initial state - just use items in order for SSR
    const itemsToUse = items.length > 0 ? [...items] : defaultItems;
    const result = [];
    while (result.length < totalItems) {
      result.push(...itemsToUse);
    }
    return result.slice(0, totalItems);
  });

  // Shuffle on client mount only
  useEffect(() => {
    const localDefaultItems = Array.from({ length: totalItems }, (_, index) => `Item ${index + 1}`);
    const itemsToShuffle = items.length > 0 ? [...items] : localDefaultItems;
    const result = [];

    // Create multiple shuffled copies to fill 28 items with better distribution
    const timesToRepeat = Math.ceil(totalItems / itemsToShuffle.length);

    for (let repeat = 0; repeat < timesToRepeat; repeat++) {
      const shuffled = [...itemsToShuffle];

      // Fisher-Yates shuffle each copy
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      result.push(...shuffled);
    }

    setCombinedItems(result.slice(0, totalItems));
  }, [items, totalItems]); // Include items in deps - will only re-shuffle if items prop changes

  // Lazy load GSAP and start animation
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const initAnimation = async () => {
      // Dynamically import GSAP to reduce initial bundle
      const gsapModule = await import('gsap');
      gsapRef.current = gsapModule;
      const { gsap } = gsapModule;

      let lastUpdateTime = 0;
      const updateInterval = 100; // Only update every 100ms

      const handleMouseMove = (e: MouseEvent) => {
        mouseXRef.current = e.clientX;
      };

      const updateMotion = () => {
        const now = Date.now();
        if (now - lastUpdateTime < updateInterval) {
          return; // Skip this frame
        }
        lastUpdateTime = now;

        const maxMoveAmount = 25; // Very minimal movement
        const baseDuration = 3.0; // Slow transitions
        const inertiaFactors = [1.5, 1.2, 1.0, 0.8]; // Lag

        rowRefs.current.forEach((row, index) => {
          if (row) {
            const direction = index % 2 === 0 ? 1 : -1;
            const moveAmount = ((mouseXRef.current / window.innerWidth) * maxMoveAmount - maxMoveAmount / 2) * direction;

            gsap.to(row, {
              x: moveAmount,
              duration: baseDuration + inertiaFactors[index % inertiaFactors.length],
              ease: 'power4.out',
              overwrite: 'auto'
            });
          }
        });
      };

      const removeAnimationLoop = gsap.ticker.add(updateMotion);

      window.addEventListener('mousemove', handleMouseMove, { passive: true });

      cleanup = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        removeAnimationLoop();
      };
    };

    // Defer GSAP loading slightly to not block initial render
    const timeoutId = setTimeout(initAnimation, 100);

    return () => {
      clearTimeout(timeoutId);
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <div className={styles.noscroll} ref={gridRef}>
      <section
        className={styles.intro}
        style={{
          background: `radial-gradient(circle, ${gradientColor} 0%, transparent 100%)`
        }}
      >
        <div className={styles.gridMotionContainer}>
          {[...Array(4)].map((_, rowIndex) => (
            <div key={rowIndex} className={styles.row} ref={el => { rowRefs.current[rowIndex] = el; }}>
              {[...Array(7)].map((_, itemIndex) => {
                const content = combinedItems[rowIndex * 7 + itemIndex];
                return (
                  <div key={itemIndex} className={styles.rowItem}>
                    <div className={styles.rowItemInner}>
                      {typeof content === 'string' && (content.startsWith('http') || content.startsWith('/')) ? (
                        <div
                          className={styles.rowItemImg}
                          style={{
                            backgroundImage: `url(${content})`
                          }}
                        />
                      ) : (
                        <div className={styles.rowItemContent}>{content}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default GridMotion;
