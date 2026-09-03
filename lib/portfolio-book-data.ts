export type BookPageType =
  | 'cover'
  | 'inside-cover'
  | 'contents'
  | 'profile'
  | 'chapter'
  | 'image-text'
  | 'process-grid'
  | 'outcome'
  | 'experiments'
  | 'about'
  | 'contact'
  | 'back-cover';

export type PlaceholderImage = {
  label: string;
  caption?: string;
  variant?: 'hero' | 'landscape' | 'portrait' | 'square' | 'thumbnail';
};

export type BookPage = {
  id: string;
  type: BookPageType;
  pageNumber: number;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  sectionTitle?: string;
  year?: string;
  description?: string;
  details?: string[];
  images?: PlaceholderImage[];
  contentsLabel?: string;
};

export type ContentsItem = {
  label: string;
  pageIndex: number;
  note: string;
};

export const bookPages: BookPage[] = [
  {
    id: 'front-cover',
    type: 'cover',
    pageNumber: 1,
    title: 'LUKAS VOIGT',
    subtitle: 'SELECTED WORK',
    year: '2026',
    description: 'Click or drag to open',
  },
  {
    id: 'inside-cover',
    type: 'inside-cover',
    pageNumber: 2,
    eyebrow: 'FRAMEWORK PROTOTYPE',
    title: 'Inside Cover',
    description:
      'This page intentionally holds placeholder copy while the book structure, pacing, and interaction model are tested.',
  },
  {
    id: 'contents',
    type: 'contents',
    pageNumber: 3,
    title: 'Contents',
    description:
      'Index destinations for the first editable portfolio-book framework.',
  },
  {
    id: 'profile',
    type: 'profile',
    pageNumber: 4,
    eyebrow: 'PROFILE',
    title: 'Short Profile',
    description:
      'PLACEHOLDER TEXT for a concise introduction. This area will later describe the designer, practice focus, and editorial position.',
    details: [
      'DISCIPLINE PLACEHOLDER',
      'LOCATION PLACEHOLDER',
      'AVAILABILITY PLACEHOLDER',
    ],
    contentsLabel: 'Profile',
  },
  {
    id: 'project-01-opener',
    type: 'chapter',
    pageNumber: 5,
    eyebrow: 'PROJECT 01',
    title: 'PROJECT TITLE',
    subtitle: 'Chapter opener',
    year: '2026',
    contentsLabel: 'Project 01',
  },
  {
    id: 'project-01-overview',
    type: 'image-text',
    pageNumber: 6,
    eyebrow: 'PROJECT 01',
    title: 'Project Overview',
    description:
      'PLACEHOLDER TEXT describing the brief, design intent, constraints, and intended replacement content.',
    details: ['ROLE PLACEHOLDER', 'FORMAT PLACEHOLDER', 'YEAR PLACEHOLDER'],
    images: [
      {
        label: 'PLACEHOLDER IMAGE',
        caption: 'Primary project image slot',
        variant: 'hero',
      },
    ],
  },
  {
    id: 'project-01-process',
    type: 'process-grid',
    pageNumber: 7,
    eyebrow: 'PROJECT 01',
    title: 'Process And Development',
    description:
      'PLACEHOLDER TEXT for sketches, tests, typography, systems, and process notes.',
    images: [
      { label: 'PLACEHOLDER IMAGE', caption: 'Research', variant: 'square' },
      {
        label: 'PLACEHOLDER IMAGE',
        caption: 'Typographic test',
        variant: 'square',
      },
      {
        label: 'PLACEHOLDER IMAGE',
        caption: 'Layout iteration',
        variant: 'square',
      },
      {
        label: 'PLACEHOLDER IMAGE',
        caption: 'Production detail',
        variant: 'square',
      },
    ],
  },
  {
    id: 'project-01-outcome',
    type: 'outcome',
    pageNumber: 8,
    eyebrow: 'PROJECT 01',
    title: 'Final Outcome',
    description:
      'PLACEHOLDER TEXT for outcome notes. No fictional client results or awards are included in this prototype.',
    details: ['FINAL ASSET SLOT', 'CAPTION SLOT', 'REPLACEMENT COPY SLOT'],
    images: [
      {
        label: 'PLACEHOLDER IMAGE',
        caption: 'Outcome image slot',
        variant: 'landscape',
      },
    ],
  },
  {
    id: 'project-02-opener',
    type: 'chapter',
    pageNumber: 9,
    eyebrow: 'PROJECT 02',
    title: 'PROJECT TITLE',
    subtitle: 'Chapter opener',
    year: '2026',
    contentsLabel: 'Project 02',
  },
  {
    id: 'project-02-overview',
    type: 'image-text',
    pageNumber: 10,
    eyebrow: 'PROJECT 02',
    title: 'Project Overview',
    description:
      'PLACEHOLDER TEXT introducing a second project structure with the same replaceable content model.',
    details: ['ROLE PLACEHOLDER', 'FORMAT PLACEHOLDER', 'YEAR PLACEHOLDER'],
    images: [
      {
        label: 'PLACEHOLDER IMAGE',
        caption: 'Hero image slot',
        variant: 'hero',
      },
    ],
  },
  {
    id: 'project-02-process',
    type: 'process-grid',
    pageNumber: 11,
    eyebrow: 'PROJECT 02',
    title: 'Process And Development',
    description:
      'PLACEHOLDER TEXT for research, draft states, comparison images, and documentation.',
    images: [
      {
        label: 'PLACEHOLDER IMAGE',
        caption: 'Reference frame',
        variant: 'square',
      },
      {
        label: 'PLACEHOLDER IMAGE',
        caption: 'System draft',
        variant: 'square',
      },
      { label: 'PLACEHOLDER IMAGE', caption: 'Layout test', variant: 'square' },
      { label: 'PLACEHOLDER IMAGE', caption: 'Refinement', variant: 'square' },
    ],
  },
  {
    id: 'project-02-outcome',
    type: 'outcome',
    pageNumber: 12,
    eyebrow: 'PROJECT 02',
    title: 'Final Outcome',
    description:
      'PLACEHOLDER TEXT for final presentation logic and supporting captions.',
    details: ['FINAL ASSET SLOT', 'CAPTION SLOT', 'REPLACEMENT COPY SLOT'],
    images: [
      {
        label: 'PLACEHOLDER IMAGE',
        caption: 'Outcome image slot',
        variant: 'landscape',
      },
    ],
  },
  {
    id: 'selected-experiments',
    type: 'experiments',
    pageNumber: 13,
    eyebrow: 'SELECTED EXPERIMENTS',
    title: 'Studies And Fragments',
    description:
      'PLACEHOLDER TEXT for smaller visual tests, posters, type studies, or self-initiated work.',
    images: [
      {
        label: 'PLACEHOLDER IMAGE',
        caption: 'Experiment A',
        variant: 'square',
      },
      {
        label: 'PLACEHOLDER IMAGE',
        caption: 'Experiment B',
        variant: 'square',
      },
    ],
    contentsLabel: 'Selected experiments',
  },
  {
    id: 'about-skills',
    type: 'about',
    pageNumber: 14,
    eyebrow: 'ABOUT',
    title: 'About And Skills',
    description:
      'PLACEHOLDER TEXT for a short biography, design approach, and practical capabilities.',
    details: [
      'IDENTITY SYSTEMS',
      'EDITORIAL DESIGN',
      'ART DIRECTION',
      'PRODUCTION',
    ],
    contentsLabel: 'About',
  },
  {
    id: 'contact',
    type: 'contact',
    pageNumber: 15,
    eyebrow: 'CONTACT',
    title: 'Contact',
    description:
      'PLACEHOLDER TEXT for future contact details. No form, account system, or social feed is included.',
    details: [
      'EMAIL PLACEHOLDER',
      'PORTFOLIO LINK PLACEHOLDER',
      'LOCATION PLACEHOLDER',
    ],
    contentsLabel: 'Contact',
  },
  {
    id: 'back-cover',
    type: 'back-cover',
    pageNumber: 16,
    title: 'LUKAS VOIGT',
    subtitle: 'SELECTED WORK',
    year: '2026',
    description: 'Back cover placeholder',
  },
];

export const contentsItems: ContentsItem[] = [
  { label: 'Profile', pageIndex: 3, note: 'Short introduction' },
  { label: 'Project 01', pageIndex: 4, note: 'Placeholder chapter' },
  { label: 'Project 02', pageIndex: 8, note: 'Placeholder chapter' },
  {
    label: 'Selected experiments',
    pageIndex: 12,
    note: 'Studies and fragments',
  },
  { label: 'About', pageIndex: 13, note: 'Skills and profile' },
  { label: 'Contact', pageIndex: 14, note: 'Temporary contact page' },
];

export const pageTotal = bookPages.length;
