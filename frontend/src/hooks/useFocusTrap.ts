import { useEffect, useRef } from 'react';

export const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    const focusableElementsString =
      'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]';
    
    let focusableElements = Array.from(
      container.querySelectorAll<HTMLElement>(focusableElementsString)
    ).filter(
      (el) =>
        !el.hasAttribute('disabled') &&
        !el.getAttribute('aria-hidden') &&
        el.tabIndex !== -1
    );

    if (focusableElements.length === 0) {
      // Fallback if no focusable elements
      container.setAttribute('tabindex', '-1');
      focusableElements = [container];
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Store previously focused element to restore it later
    const previousFocusedElement = document.activeElement as HTMLElement;

    // Focus the first element initially
    firstElement.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      if (previousFocusedElement && typeof previousFocusedElement.focus === 'function') {
        previousFocusedElement.focus();
      }
    };
  }, [isActive]);

  return containerRef;
};
