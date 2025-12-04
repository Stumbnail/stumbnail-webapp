# Implementation Plan

- [x] 1. Optimize image delivery in dashboard page





  - [x] 1.1 Update template images with proper sizes attribute


    - Change `sizes` from current value to `(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 192px`
    - This matches actual display dimensions and reduces image payload
    - _Requirements: 1.1, 1.4, 4.3_
  - [x] 1.2 Add priority prop to first template image for LCP optimization

    - Add `priority` prop to the first template in the map
    - This ensures the LCP image loads immediately without lazy loading
    - _Requirements: 1.3_
  - [x] 1.3 Ensure lazy loading is applied to non-priority images

    - Verify remaining images use default lazy loading behavior
    - Next.js Image applies lazy loading by default when priority is not set
    - _Requirements: 1.2_

- [x] 2. Optimize CSS for render performance





  - [x] 2.1 Add will-change property to animated elements


    - Add `will-change: transform` to `.sidebar` for mobile slide animation
    - Add `will-change: transform` to `.overlay` for fade animation
    - _Requirements: 3.2_
  - [x] 2.2 Add CSS containment to isolated sections


    - Add `contain: layout style paint` to `.templateCard` for paint isolation
    - Add `contain: layout` to `.templatesGrid` for layout isolation
    - _Requirements: 2.1, 6.3_
  - [x] 2.3 Ensure image containers have explicit aspect-ratio


    - Verify `.templateImage` has `aspect-ratio: 16 / 10` (already present)
    - This prevents layout shifts during image loading
    - _Requirements: 6.1_

- [x] 3. Optimize JavaScript performance in dashboard





  - [x] 3.1 Implement debounced resize handler


    - Replace direct resize event handler with debounced version (150ms delay)
    - Use passive event listener option for better scroll performance
    - _Requirements: 3.3, 5.3_
  - [ ]* 3.2 Write property test for resize debouncing
    - **Property 1: Resize handler debouncing**
    - **Validates: Requirements 3.3**
  - [x] 3.3 Memoize static data arrays


    - Move `navItems` and `templates` arrays outside component or use useMemo
    - Prevents recreation on every render
    - _Requirements: 5.2_
  - [ ]* 3.4 Write property test for memoization
    - **Property 2: Component memoization prevents unnecessary re-renders**
    - **Validates: Requirements 5.2**

  - [x] 3.5 Conditionally render blur elements

    - Only render blur elements when not on mobile (they're hidden via CSS anyway)
    - Reduces DOM nodes and paint operations on mobile
    - _Requirements: 4.1_
  - [x] 3.6 Optimize overlay rendering


    - Ensure overlay only renders when `sidebarOpen` is true on mobile
    - Already implemented correctly, verify no changes needed
    - _Requirements: 4.2_

- [x] 4. Optimize GridMotion component





  - [x] 4.1 Add will-change to animated rows


    - Add `will-change: transform` to `.row` class in GridMotion.module.css
    - _Requirements: 3.2_
  - [x] 4.2 Use passive event listener for mousemove


    - Update `window.addEventListener('mousemove', ...)` to include `{ passive: true }`
    - _Requirements: 5.3_
  - [x] 4.3 Batch DOM operations to prevent forced reflows


    - Ensure all DOM reads happen before GSAP animations (writes)
    - Current implementation already batches via mouseXRef, verify no changes needed
    - _Requirements: 3.1_

- [x] 5. Configure Next.js for modern browsers





  - [x] 5.1 Create next.config.js with modern browser targets


    - Add browserslist configuration targeting modern browsers
    - This reduces legacy JavaScript polyfills (~10 KiB savings)
    - _Requirements: 5.1_

- [ ] 6. Checkpoint - Verify all optimizations
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 7. Write unit tests for image optimization
  - [ ]* 7.1 Test that first template image has priority prop
    - Verify the first Image component in templates has `priority={true}`
    - _Requirements: 1.3_
  - [ ]* 7.2 Test that images have correct sizes attribute
    - Verify Image components have responsive sizes attribute
    - _Requirements: 1.1_
