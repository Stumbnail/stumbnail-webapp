'use client';

import React, { useRef, useCallback, ReactNode } from 'react';
import styles from './AnimatedBorder.module.css';

interface AnimatedBorderProps {
    children: ReactNode;
    /** Animation duration in seconds (default: 0.3) */
    duration?: number;
    /** Border color - overrides CSS color when provided */
    borderColor?: string;
    /** Border width in pixels (default: 1.5) */
    borderWidth?: number;
    /** Border radius of the child element in pixels (default: 8) */
    radius?: number;
    /** Gap between element and border in pixels (default: 4) */
    gap?: number;
    /** If true, wrapper takes full width of parent (default: false) */
    fullWidth?: boolean;
    /** Optional className for the wrapper */
    className?: string;
    /** Optional inline styles for the wrapper */
    style?: React.CSSProperties;
}

type Edge = 'top' | 'right' | 'bottom' | 'left';

/**
 * AnimatedBorder - A high-performance bi-directional animated border component.
 * 
 * Wraps any element and adds a hover-triggered border animation that:
 * - Starts from the exact cursor entry point
 * - Grows bi-directionally (clockwise + counter-clockwise) until paths meet
 * - Follows rounded corners with concentric arcs
 * - Reverses on mouse leave back to the entry point
 */
export default function AnimatedBorder({
    children,
    duration = 0.3,
    borderColor,
    borderWidth = 1.5,
    radius = 8,
    gap = 4,
    fullWidth = false,
    className = '',
    style,
}: AnimatedBorderProps) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const pathCWRef = useRef<SVGPathElement>(null);
    const pathCCWRef = useRef<SVGPathElement>(null);

    // Generate SVG path for the border with rounded corners
    const generatePaths = useCallback((
        startX: number,
        startY: number,
        w: number,
        h: number,
        r: number,
        edge: Edge
    ): { dcw: string; dccw: string } => {
        let dcw = '';
        let dccw = '';

        switch (edge) {
            case 'top':
                // CW: Right-Top -> Right-Bottom -> Left-Bottom -> Left-Top -> Start
                dcw = `M ${startX},0 L ${w - r},0 A ${r},${r} 0 0 1 ${w},${r} L ${w},${h - r} A ${r},${r} 0 0 1 ${w - r},${h} L ${r},${h} A ${r},${r} 0 0 1 0,${h - r} L 0,${r} A ${r},${r} 0 0 1 ${r},0 L ${startX},0`;
                // CCW: Left-Top -> Left-Bottom -> Right-Bottom -> Right-Top -> Start
                dccw = `M ${startX},0 L ${r},0 A ${r},${r} 0 0 0 0,${r} L 0,${h - r} A ${r},${r} 0 0 0 ${r},${h} L ${w - r},${h} A ${r},${r} 0 0 0 ${w},${h - r} L ${w},${r} A ${r},${r} 0 0 0 ${w - r},0 L ${startX},0`;
                break;

            case 'right':
                // CW: Bottom-Right -> Bottom-Left -> Top-Left -> Top-Right -> Start
                dcw = `M ${w},${startY} L ${w},${h - r} A ${r},${r} 0 0 1 ${w - r},${h} L ${r},${h} A ${r},${r} 0 0 1 0,${h - r} L 0,${r} A ${r},${r} 0 0 1 ${r},0 L ${w - r},0 A ${r},${r} 0 0 1 ${w},${r} L ${w},${startY}`;
                // CCW: Top-Right -> Top-Left -> Bottom-Left -> Bottom-Right -> Start
                dccw = `M ${w},${startY} L ${w},${r} A ${r},${r} 0 0 0 ${w - r},0 L ${r},0 A ${r},${r} 0 0 0 0,${r} L 0,${h - r} A ${r},${r} 0 0 0 ${r},${h} L ${w - r},${h} A ${r},${r} 0 0 0 ${w},${h - r} L ${w},${startY}`;
                break;

            case 'bottom':
                // CW: Left-Bottom -> Left-Top -> Right-Top -> Right-Bottom -> Start
                dcw = `M ${startX},${h} L ${r},${h} A ${r},${r} 0 0 1 0,${h - r} L 0,${r} A ${r},${r} 0 0 1 ${r},0 L ${w - r},0 A ${r},${r} 0 0 1 ${w},${r} L ${w},${h - r} A ${r},${r} 0 0 1 ${w - r},${h} L ${startX},${h}`;
                // CCW: Right-Bottom -> Right-Top -> Left-Top -> Left-Bottom -> Start
                dccw = `M ${startX},${h} L ${w - r},${h} A ${r},${r} 0 0 0 ${w},${h - r} L ${w},${r} A ${r},${r} 0 0 0 ${w - r},0 L ${r},0 A ${r},${r} 0 0 0 0,${r} L 0,${h - r} A ${r},${r} 0 0 0 ${r},${h} L ${startX},${h}`;
                break;

            case 'left':
                // CW: Top-Left -> Top-Right -> Bottom-Right -> Bottom-Left -> Start
                dcw = `M 0,${startY} L 0,${r} A ${r},${r} 0 0 1 ${r},0 L ${w - r},0 A ${r},${r} 0 0 1 ${w},${r} L ${w},${h - r} A ${r},${r} 0 0 1 ${w - r},${h} L ${r},${h} A ${r},${r} 0 0 1 0,${h - r} L 0,${startY}`;
                // CCW: Bottom-Left -> Bottom-Right -> Top-Right -> Top-Left -> Start
                dccw = `M 0,${startY} L 0,${h - r} A ${r},${r} 0 0 0 ${r},${h} L ${w - r},${h} A ${r},${r} 0 0 0 ${w},${h - r} L ${w},${r} A ${r},${r} 0 0 0 ${w - r},0 L ${r},0 A ${r},${r} 0 0 0 0,${r} L 0,${startY}`;
                break;
        }

        return { dcw, dccw };
    }, []);

    // Determine which edge the mouse entered from
    const getEntryEdge = (relX: number, relY: number, width: number, height: number): Edge => {
        const distTop = Math.abs(relY);
        const distBottom = Math.abs(relY - height);
        const distLeft = Math.abs(relX);
        const distRight = Math.abs(relX - width);
        const min = Math.min(distTop, distBottom, distLeft, distRight);

        if (min === distTop) return 'top';
        if (min === distRight) return 'right';
        if (min === distBottom) return 'bottom';
        return 'left';
    };

    const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const wrapper = wrapperRef.current;
        const pathCW = pathCWRef.current;
        const pathCCW = pathCCWRef.current;

        if (!wrapper || !pathCW || !pathCCW) return;

        const rect = wrapper.getBoundingClientRect();

        // Mouse position relative to the element
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;

        // SVG dimensions (element size + gap on each side)
        const w = rect.width + (gap * 2);
        const h = rect.height + (gap * 2);

        // Start point relative to SVG (offset by gap)
        const startX = relX + gap;
        const startY = relY + gap;

        // Concentric radius (child radius + gap)
        const cornerRadius = radius + gap;

        // Determine entry edge
        const edge = getEntryEdge(relX, relY, rect.width, rect.height);

        // Generate paths
        const { dcw, dccw } = generatePaths(startX, startY, w, h, cornerRadius, edge);

        // Set path data
        pathCW.setAttribute('d', dcw);
        pathCCW.setAttribute('d', dccw);

        // Animation timing
        const animDuration = `${duration}s`;
        const animEasing = 'cubic-bezier(0.25, 1, 0.5, 1)';

        // Initialize stroke-dasharray and dashoffset
        [pathCW, pathCCW].forEach(p => {
            const len = p.getTotalLength();
            p.style.transition = 'none';
            p.style.strokeDasharray = `${len} ${len}`;
            p.style.strokeDashoffset = `${len}`;
            p.classList.add(styles.activeBorder);
            // Force reflow
            p.getBoundingClientRect();
        });

        // Animate to halfway (paths meet in the middle)
        const lenCW = pathCW.getTotalLength();
        const lenCCW = pathCCW.getTotalLength();

        pathCW.style.transition = `stroke-dashoffset ${animDuration} ${animEasing}`;
        pathCW.style.strokeDashoffset = `${lenCW / 2}`;

        pathCCW.style.transition = `stroke-dashoffset ${animDuration} ${animEasing}`;
        pathCCW.style.strokeDashoffset = `${lenCCW / 2}`;
    }, [gap, radius, duration, generatePaths]);

    const handleMouseLeave = useCallback(() => {
        const pathCW = pathCWRef.current;
        const pathCCW = pathCCWRef.current;

        if (!pathCW || !pathCCW) return;

        const animDuration = `${duration}s`;
        const animEasing = 'cubic-bezier(0.25, 1, 0.5, 1)';

        // Reverse animation back to initial state
        [pathCW, pathCCW].forEach(p => {
            const len = p.getTotalLength();
            p.style.transition = `stroke-dashoffset ${animDuration} ${animEasing}`;
            p.style.strokeDashoffset = `${len}`;
        });
    }, [duration]);

    return (
        <div
            ref={wrapperRef}
            className={`${styles.animatedBorderWrapper} ${fullWidth ? styles.fullWidth : ''} ${className}`}
            style={style}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
            <svg
                className={styles.borderSvg}
                xmlns="http://www.w3.org/2000/svg"
                style={{
                    top: `-${gap}px`,
                    left: `-${gap}px`,
                    width: `calc(100% + ${gap * 2}px)`,
                    height: `calc(100% + ${gap * 2}px)`,
                }}
            >
                <path
                    ref={pathCWRef}
                    className={styles.borderPath}
                    style={{ strokeWidth: borderWidth, ...(borderColor && { stroke: borderColor }) }}
                    d=""
                />
                <path
                    ref={pathCCWRef}
                    className={styles.borderPath}
                    style={{ strokeWidth: borderWidth, ...(borderColor && { stroke: borderColor }) }}
                    d=""
                />
            </svg>
        </div>
    );
}
