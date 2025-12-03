# Code Standards

## CSS & Styling

- **No duplicate CSS files for themes** - Use modifier classes (`.light`, `.dark`) in a single CSS module instead of separate files per theme. Keeps styles DRY and maintainable.

- **No inline styles in JSX** - Move all styles to CSS modules. Inline styles bypass the module system and make theming inconsistent.

## TypeScript

- **No `any` type** - Always define proper interfaces or types. For Firebase errors, use a typed interface like `interface FirebaseError extends Error { code?: string; }`.

## Accessibility

- **Meaningful alt text** - Never use empty `alt=""` for images that convey information. Use descriptive text like `alt="User avatar"`.

- **Aria labels on icon buttons** - Buttons with only icons or emojis need `aria-label` describing the action.

- **Decorative SVGs** - Add `aria-hidden="true"` to icons that are purely decorative (like the Google logo next to button text).

## Next.js

- **Use `next/font`** - Prefer `next/font/google` over `<link>` tags for Google Fonts. Better performance, no layout shift.

- **Server-side redirects** - For simple redirects, use `redirect()` from `next/navigation` in server components instead of `useEffect` + `router.push()`.

## React

- **useEffect dependencies** - When using empty `[]` deps intentionally, ensure the effect truly should only run once. If props like `items` should trigger re-runs, include them.
