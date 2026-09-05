import React from 'react';

/** First tab stop on every page. Hidden until focused, then unmissable. */
export const SkipToContent: React.FC = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[10001] focus:inline-flex focus:h-10 focus:items-center focus:rounded-md focus:bg-gold focus:px-4 focus:text-[0.875rem] focus:font-semibold focus:text-ink"
  >
    Skip to content
  </a>
);
