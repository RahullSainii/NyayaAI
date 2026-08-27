import React from 'react';

export const SkipToContent: React.FC = () => {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-surface focus:text-gold focus:border focus:border-gold-line focus:rounded-md focus:outline-none focus:ring-2 focus:ring-gold"
    >
      Skip to content
    </a>
  );
};
