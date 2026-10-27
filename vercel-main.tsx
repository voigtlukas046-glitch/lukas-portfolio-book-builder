import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { PortfolioBuilder } from '@/components/editor/portfolio-builder';
import { SubmissionBook } from '@/components/book/submission-book';
import '@/app/globals.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Portfolio builder root element was not found.');
}

createRoot(root).render(
  <StrictMode>
    {window.location.pathname.startsWith('/portfolio-2026') ? (
      <SubmissionBook />
    ) : (
      <PortfolioBuilder />
    )}
  </StrictMode>,
);
