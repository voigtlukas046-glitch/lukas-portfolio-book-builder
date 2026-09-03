'use client';

import { useEffect, useState } from 'react';

import { InteractiveBook } from '@/components/book/interactive-book';
import {
  initialPortfolioProject,
  type PortfolioProject,
} from '@/lib/portfolio-project';
import { loadStoredPortfolioProject } from '@/lib/portfolio-storage';

export function PortfolioPreview() {
  const [project, setProject] = useState<PortfolioProject>(
    initialPortfolioProject,
  );

  useEffect(() => {
    let disposed = false;

    async function loadProject() {
      const storedProject = await loadStoredPortfolioProject();

      if (!disposed && storedProject) {
        setProject(storedProject);
      }
    }

    void loadProject();

    return () => {
      disposed = true;
    };
  }, []);

  return <InteractiveBook project={project} />;
}
