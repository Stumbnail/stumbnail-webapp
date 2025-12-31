'use client';

import { useRef, useEffect, useCallback, useMemo } from 'react';
import styles from './HighlightedPromptEditor.module.css';

interface HighlightedPromptEditorProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    className?: string;
    theme: 'light' | 'dark';
    autoFocus?: boolean;
    rows?: number;
}

// Softer pastel color palette for variables (visible in both light and dark mode)
const VARIABLE_COLORS = [
    { light: '#3b82f6', dark: '#93c5fd' }, // Soft Blue
    { light: '#8b5cf6', dark: '#c4b5fd' }, // Soft Purple
    { light: '#10b981', dark: '#6ee7b7' }, // Soft Green
    { light: '#f59e0b', dark: '#fcd34d' }, // Soft Amber
    { light: '#06b6d4', dark: '#67e8f9' }, // Soft Cyan
    { light: '#ec4899', dark: '#f9a8d4' }, // Soft Pink
    { light: '#6366f1', dark: '#a5b4fc' }, // Soft Indigo
    { light: '#14b8a6', dark: '#5eead4' }, // Soft Teal
];

/**
 * Parse text and return highlighted HTML
 * Highlights variable definitions and their usages with unique colors per variable
 * 
 * Format supported:
 * - name = [value with possible line breaks]  (brackets contain full value, can span lines)
 * - name = value until end of line  (without brackets, value is until newline)
 */
function highlightVariables(text: string, theme: 'light' | 'dark'): string {
    if (!text) return '';

    // Map to store variable -> color index
    const variableColors = new Map<string, number>();
    let colorIndex = 0;

    // First pass: Find all variable definitions and assign colors
    // Use regex that works across the whole text
    const defRegex = /^(\w+)\s*=/gm;
    let match;
    while ((match = defRegex.exec(text)) !== null) {
        const varName = match[1].toLowerCase();
        if (!variableColors.has(varName)) {
            variableColors.set(varName, colorIndex % VARIABLE_COLORS.length);
            colorIndex++;
        }
    }

    // If no variables found, just escape HTML and return
    if (variableColors.size === 0) {
        return escapeHtml(text);
    }

    // Second pass: Process the text and highlight
    // We'll use a state machine approach to handle multi-line brackets
    let result = '';
    let i = 0;

    while (i < text.length) {
        // Check for newline
        if (text[i] === '\n') {
            result += '<br>';
            i++;
            continue;
        }

        // Check if we're at the start of a line (beginning or after newline)
        const isLineStart = i === 0 || text[i - 1] === '\n';

        if (isLineStart) {
            // Try to match a variable definition at line start
            const remainingText = text.slice(i);

            // Try bracketed value first: varName = [value with possible newlines]
            const bracketDefMatch = remainingText.match(/^(\w+)(\s*)(=)(\s*)(\[[\s\S]*?\])/);
            if (bracketDefMatch) {
                const [fullMatch, varName, space1, equals, space2, bracketValue] = bracketDefMatch;
                const varColorIdx = variableColors.get(varName.toLowerCase()) ?? 0;
                const color = theme === 'dark' ? VARIABLE_COLORS[varColorIdx].dark : VARIABLE_COLORS[varColorIdx].light;

                result += `<span style="color:${color}">${escapeHtmlNoBreak(varName)}</span>`;
                result += escapeHtmlNoBreak(space1);
                result += `<span style="color:#888">${escapeHtmlNoBreak(equals)}</span>`;
                result += escapeHtmlNoBreak(space2);
                // Handle newlines inside bracket value
                result += `<span style="color:${color}">${escapeHtmlWithBreaks(bracketValue)}</span>`;

                i += fullMatch.length;
                continue;
            }

            // Try plain value: varName = value until end of line
            const plainDefMatch = remainingText.match(/^(\w+)(\s*)(=)(\s*)([^\n]*)/);
            if (plainDefMatch) {
                const [fullMatch, varName, space1, equals, space2, lineValue] = plainDefMatch;
                const varColorIdx = variableColors.get(varName.toLowerCase()) ?? 0;
                const color = theme === 'dark' ? VARIABLE_COLORS[varColorIdx].dark : VARIABLE_COLORS[varColorIdx].light;

                result += `<span style="color:${color}">${escapeHtmlNoBreak(varName)}</span>`;
                result += escapeHtmlNoBreak(space1);
                result += `<span style="color:#888">${escapeHtmlNoBreak(equals)}</span>`;
                result += escapeHtmlNoBreak(space2);
                result += `<span style="color:${color}">${escapeHtmlNoBreak(lineValue)}</span>`;

                i += fullMatch.length;
                continue;
            }
        }

        // Check for word that might be a variable usage
        const remainingText = text.slice(i);
        const wordMatch = remainingText.match(/^(\w+)/);
        if (wordMatch) {
            const word = wordMatch[1];
            const varColorIdx = variableColors.get(word.toLowerCase());

            if (varColorIdx !== undefined) {
                // This word is a defined variable - highlight it
                const color = theme === 'dark' ? VARIABLE_COLORS[varColorIdx].dark : VARIABLE_COLORS[varColorIdx].light;
                result += `<span style="color:${color}">${escapeHtmlNoBreak(word)}</span>`;
            } else {
                result += escapeHtmlNoBreak(word);
            }
            i += word.length;
            continue;
        }

        // Regular character
        result += escapeHtmlNoBreak(text[i]);
        i++;
    }

    return result;
}

/**
 * Escape HTML and convert newlines to <br>
 */
function escapeHtmlWithBreaks(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\n/g, '<br>');
}

/**
 * Escape HTML without converting newlines (handled separately)
 */
function escapeHtmlNoBreak(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Escape HTML special characters (with newline conversion)
 * Used for fallback when no variables are found
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\n/g, '<br>');
    // Note: Spaces are NOT converted to &nbsp; to maintain character alignment
}

export default function HighlightedPromptEditor({
    value,
    onChange,
    onKeyDown,
    placeholder,
    className,
    theme,
    autoFocus,
    rows = 1,
}: HighlightedPromptEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    // Sync scroll positions
    const handleScroll = useCallback(() => {
        if (textareaRef.current && overlayRef.current) {
            overlayRef.current.scrollTop = textareaRef.current.scrollTop;
            overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    }, []);

    // Generate highlighted HTML
    const highlightedHtml = useMemo(() => {
        return highlightVariables(value, theme);
    }, [value, theme]);

    // Auto-focus if requested
    useEffect(() => {
        if (autoFocus && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [autoFocus]);

    return (
        <div className={`${styles.container} ${className || ''}`}>
            {/* Highlighted overlay */}
            <div
                ref={overlayRef}
                className={`${styles.overlay} ${theme === 'dark' ? styles.overlayDark : ''}`}
                dangerouslySetInnerHTML={{ __html: highlightedHtml || `<span class="${styles.placeholder}">${placeholder || ''}</span>` }}
                aria-hidden="true"
            />

            {/* Actual textarea (transparent text, visible caret) */}
            <textarea
                ref={textareaRef}
                value={value}
                onChange={onChange}
                onKeyDown={onKeyDown}
                onScroll={handleScroll}
                placeholder=""
                className={`${styles.textarea} ${theme === 'dark' ? styles.textareaDark : ''}`}
                rows={rows}
                autoFocus={autoFocus}
                spellCheck={false}
            />
        </div>
    );
}
