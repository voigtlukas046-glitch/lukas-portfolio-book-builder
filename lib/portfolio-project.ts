import {
  bookPages,
  contentsItems,
  type BookPage,
} from '@/lib/portfolio-book-data';

export const PORTFOLIO_SCHEMA_VERSION = 1;
export const BOOK_PAGE_WIDTH = 730;
export const BOOK_PAGE_HEIGHT = 540;

export type PageRole = 'cover' | 'page' | 'back-cover';
export type TextRole = 'heading' | 'paragraph' | 'caption' | 'label';
export type TextAlign = 'left' | 'center' | 'right';
export type TextTransform = 'none' | 'uppercase' | 'lowercase';
export type ImageFit = 'contain' | 'cover' | 'original';
export type PortfolioElementType =
  | 'text'
  | 'image'
  | 'shape'
  | 'line'
  | 'button'
  | 'page-number';

export type PortfolioTheme = {
  ink: string;
  mutedInk: string;
  softInk: string;
  paper: string;
  paperDeep: string;
  white: string;
  studio: string;
  line: string;
  fontSans: string;
  fontMono: string;
};

export type PortfolioAsset = {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  createdAt: string;
  width?: number;
  height?: number;
};

type PortfolioElementBase = {
  id: string;
  type: PortfolioElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  locked: boolean;
  hidden: boolean;
};

export type TextElement = PortfolioElementBase & {
  type: 'text';
  role: TextRole;
  content: string;
  style: {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    fontStyle: 'normal' | 'italic';
    color: string;
    textAlign: TextAlign;
    lineHeight: number;
    letterSpacing: number;
    paragraphSpacing: number;
    textTransform: TextTransform;
  };
};

export type ImageElement = PortfolioElementBase & {
  type: 'image';
  assetId?: string;
  label: string;
  caption?: string;
  alt: string;
  fit: ImageFit;
  cropX: number;
  cropY: number;
  cropScale: number;
  borderRadius: number;
};

export type ShapeElement = PortfolioElementBase & {
  type: 'shape';
  fill: string;
  stroke: string;
  strokeWidth: number;
  borderRadius: number;
};

export type LineElement = PortfolioElementBase & {
  type: 'line';
  stroke: string;
  strokeWidth: number;
};

export type ButtonElement = PortfolioElementBase & {
  type: 'button';
  label: string;
  href?: string;
  action?: 'advance';
  style: {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    color: string;
    background: string;
    borderColor: string;
    textTransform: TextTransform;
  };
};

export type PageNumberElement = PortfolioElementBase & {
  type: 'page-number';
  format: 'current' | 'current-total';
  style: TextElement['style'];
};

export type PortfolioElement =
  | TextElement
  | ImageElement
  | ShapeElement
  | LineElement
  | ButtonElement
  | PageNumberElement;

export type PortfolioPage = {
  id: string;
  name: string;
  role: PageRole;
  background: string;
  contentsLabel?: string;
  elements: PortfolioElement[];
};

export type PortfolioProject = {
  schemaVersion: typeof PORTFOLIO_SCHEMA_VERSION;
  id: string;
  updatedAt: string;
  settings: {
    title: string;
    owner: string;
    subtitle: string;
    year: string;
  };
  theme: PortfolioTheme;
  assets: PortfolioAsset[];
  pages: PortfolioPage[];
};

const theme: PortfolioTheme = {
  ink: '#080808',
  mutedInk: '#363634',
  softInk: '#5d5e5a',
  paper: '#f2eee3',
  paperDeep: '#e9e2d3',
  white: '#fffdf7',
  studio: '#d7d8d3',
  line: 'rgb(8 8 8 / 18%)',
  fontSans: 'var(--font-geist-sans), Arial, Helvetica, sans-serif',
  fontMono: 'var(--font-geist-mono), monospace',
};

const textStyle = (
  overrides: Partial<TextElement['style']> = {},
): TextElement['style'] => ({
  fontFamily: theme.fontSans,
  fontSize: 15,
  fontWeight: 700,
  fontStyle: 'normal',
  color: theme.ink,
  textAlign: 'left',
  lineHeight: 1.25,
  letterSpacing: 0,
  paragraphSpacing: 0,
  textTransform: 'none',
  ...overrides,
});

const text = (
  pageId: string,
  id: string,
  role: TextRole,
  content = '',
  x = 48,
  y = 48,
  width = 300,
  height = 48,
  style: Partial<TextElement['style']> = {},
  zIndex = 10,
): TextElement => ({
  id: `${pageId}-${id}`,
  type: 'text',
  role,
  content,
  x,
  y,
  width,
  height,
  zIndex,
  locked: false,
  hidden: false,
  style: textStyle(style),
});

const image = (
  pageId: string,
  id: string,
  label = 'PLACEHOLDER IMAGE',
  caption = '',
  x = 48,
  y = 126,
  width = 260,
  height = 220,
  zIndex = 8,
): ImageElement => ({
  id: `${pageId}-${id}`,
  type: 'image',
  label,
  caption,
  alt: caption || label,
  fit: 'cover',
  cropX: 50,
  cropY: 50,
  cropScale: 1,
  borderRadius: 0,
  x,
  y,
  width,
  height,
  zIndex,
  locked: false,
  hidden: false,
});

const line = (
  pageId: string,
  id: string,
  x: number,
  y: number,
  width: number,
  stroke = theme.ink,
  strokeWidth = 1,
  zIndex = 6,
): LineElement => ({
  id: `${pageId}-${id}`,
  type: 'line',
  x,
  y,
  width,
  height: Math.max(6, strokeWidth),
  zIndex,
  locked: false,
  hidden: false,
  stroke,
  strokeWidth,
});

const shape = (
  pageId: string,
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fill = 'transparent',
  stroke = theme.line,
  strokeWidth = 1,
  zIndex = 4,
): ShapeElement => ({
  id: `${pageId}-${id}`,
  type: 'shape',
  x,
  y,
  width,
  height,
  zIndex,
  locked: false,
  hidden: false,
  fill,
  stroke,
  strokeWidth,
  borderRadius: 0,
});

const button = (
  pageId: string,
  id: string,
  label: string,
  x: number,
  y: number,
  width: number,
  height: number,
  zIndex = 14,
): ButtonElement => ({
  id: `${pageId}-${id}`,
  type: 'button',
  label,
  action: 'advance',
  x,
  y,
  width,
  height,
  zIndex,
  locked: false,
  hidden: false,
  style: {
    fontFamily: theme.fontSans,
    fontSize: 13,
    fontWeight: 800,
    color: theme.white,
    background: 'transparent',
    borderColor: 'rgb(255 253 247 / 46%)',
    textTransform: 'uppercase',
  },
});

function detailElements(
  pageId: string,
  details: string[] = [],
  x: number,
  y: number,
) {
  return details.map((item, index) =>
    text(
      pageId,
      `detail-${index + 1}`,
      'label',
      item,
      x,
      y + index * 36,
      220,
      24,
      {
        color: theme.mutedInk,
        fontSize: 12,
        fontWeight: 800,
        textTransform: 'uppercase',
      },
      12 + index,
    ),
  );
}

function pageRole(page: BookPage): PageRole {
  if (page.type === 'cover') return 'cover';
  if (page.type === 'back-cover') return 'back-cover';
  return 'page';
}

function migrateBookPage(page: BookPage): PortfolioPage {
  const base: PortfolioPage = {
    id: page.id,
    name: page.contentsLabel ?? page.title,
    role: pageRole(page),
    background:
      page.type === 'cover' || page.type === 'back-cover'
        ? theme.ink
        : theme.paper,
    contentsLabel: page.contentsLabel,
    elements: [],
  };

  switch (page.type) {
    case 'cover':
      base.elements = [
        text(
          page.id,
          'studio-mark',
          'label',
          'Studio Voigt.',
          42,
          34,
          180,
          24,
          {
            color: theme.white,
            fontSize: 13,
            fontWeight: 800,
          },
        ),
        text(page.id, 'year', 'label', page.year, 42, 154, 120, 24, {
          color: theme.white,
          fontSize: 14,
          fontWeight: 500,
          textTransform: 'uppercase',
        }),
        text(page.id, 'title', 'heading', page.title, 42, 188, 620, 72, {
          color: theme.white,
          fontSize: 62,
          fontWeight: 850,
          lineHeight: 0.96,
          textTransform: 'uppercase',
        }),
        text(page.id, 'subtitle', 'heading', page.subtitle, 42, 264, 500, 42, {
          color: theme.white,
          fontSize: 25,
          fontWeight: 500,
          lineHeight: 1.05,
          textTransform: 'uppercase',
        }),
        line(page.id, 'cover-rule', 42, 424, 646, 'rgb(255 253 247 / 72%)'),
        button(
          page.id,
          'open-button',
          page.description ?? 'Click or drag to open',
          42,
          450,
          178,
          40,
        ),
      ];
      return base;

    case 'inside-cover':
      base.elements = [
        text(page.id, 'eyebrow', 'label', page.eyebrow, 48, 46, 240, 24, {
          color: theme.softInk,
          fontSize: 12,
          fontWeight: 800,
          textTransform: 'uppercase',
        }),
        text(page.id, 'title', 'heading', page.title, 48, 222, 380, 48, {
          fontSize: 36,
          fontWeight: 850,
          textTransform: 'uppercase',
        }),
        text(
          page.id,
          'description',
          'paragraph',
          page.description,
          48,
          278,
          420,
          76,
          {
            color: theme.mutedInk,
            fontSize: 15,
            fontWeight: 500,
            lineHeight: 1.44,
          },
        ),
        text(
          page.id,
          'note-label',
          'label',
          'Prototype note',
          48,
          420,
          180,
          22,
          {
            fontSize: 12,
            fontWeight: 850,
            textTransform: 'uppercase',
          },
        ),
        text(
          page.id,
          'note',
          'caption',
          'Structure, navigation, animation, and responsive behavior only.',
          48,
          448,
          330,
          48,
          {
            color: theme.mutedInk,
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.36,
          },
        ),
      ];
      return base;

    case 'contents':
      base.elements = [
        text(page.id, 'eyebrow', 'label', 'INDEX', 48, 46, 120, 22, {
          color: theme.softInk,
          fontSize: 12,
          fontWeight: 800,
          textTransform: 'uppercase',
        }),
        text(page.id, 'title', 'heading', page.title, 48, 78, 340, 48, {
          fontSize: 38,
          fontWeight: 850,
          textTransform: 'uppercase',
        }),
        text(
          page.id,
          'description',
          'paragraph',
          page.description,
          48,
          130,
          440,
          48,
          {
            color: theme.mutedInk,
            fontSize: 14,
            fontWeight: 500,
            lineHeight: 1.36,
          },
        ),
        ...contentsItems.flatMap((item, index) => {
          const rowY = 210 + index * 42;
          return [
            line(
              page.id,
              `row-line-${index + 1}`,
              48,
              rowY - 10,
              635,
              theme.line,
              1,
              5,
            ),
            text(
              page.id,
              `row-label-${index + 1}`,
              'label',
              item.label,
              48,
              rowY,
              380,
              26,
              {
                fontSize: 16,
                fontWeight: 850,
                textTransform: 'uppercase',
              },
            ),
            text(
              page.id,
              `row-note-${index + 1}`,
              'caption',
              item.note,
              48,
              rowY + 22,
              360,
              20,
              {
                color: theme.softInk,
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
              },
            ),
            text(
              page.id,
              `row-page-${index + 1}`,
              'label',
              String(item.pageIndex + 1).padStart(2, '0'),
              640,
              rowY + 8,
              44,
              22,
              {
                fontSize: 12,
                fontWeight: 850,
                textAlign: 'right',
              },
            ),
          ];
        }),
      ];
      return base;

    case 'profile':
      base.elements = [
        text(page.id, 'eyebrow', 'label', page.eyebrow, 48, 50, 160, 22, {
          color: theme.softInk,
          fontSize: 12,
          fontWeight: 800,
          textTransform: 'uppercase',
        }),
        text(page.id, 'title', 'heading', page.title, 48, 84, 430, 48, {
          fontSize: 38,
          fontWeight: 850,
          textTransform: 'uppercase',
        }),
        text(
          page.id,
          'description',
          'paragraph',
          page.description,
          48,
          192,
          398,
          130,
          {
            color: theme.mutedInk,
            fontSize: 22,
            fontWeight: 500,
            lineHeight: 1.3,
          },
        ),
        ...detailElements(page.id, page.details, 490, 214),
      ];
      return base;

    case 'chapter':
      base.elements = [
        text(page.id, 'eyebrow', 'label', page.eyebrow, 48, 50, 180, 22, {
          color: theme.softInk,
          fontSize: 12,
          fontWeight: 800,
          textTransform: 'uppercase',
        }),
        text(page.id, 'title', 'heading', page.title, 48, 210, 480, 138, {
          fontSize: 66,
          fontWeight: 850,
          lineHeight: 0.96,
          textTransform: 'uppercase',
        }),
        text(page.id, 'subtitle', 'caption', page.subtitle, 48, 356, 260, 24, {
          color: theme.mutedInk,
          fontSize: 16,
          fontWeight: 600,
          textTransform: 'uppercase',
        }),
        text(page.id, 'year', 'label', page.year, 626, 436, 62, 24, {
          fontSize: 14,
          fontWeight: 850,
          textAlign: 'right',
        }),
      ];
      return base;

    case 'image-text':
      base.elements = [
        text(page.id, 'eyebrow', 'label', page.eyebrow, 48, 60, 160, 22, {
          color: theme.softInk,
          fontSize: 12,
          fontWeight: 800,
          textTransform: 'uppercase',
        }),
        text(page.id, 'title', 'heading', page.title, 48, 94, 350, 48, {
          fontSize: 34,
          fontWeight: 850,
          textTransform: 'uppercase',
        }),
        text(
          page.id,
          'description',
          'paragraph',
          page.description,
          48,
          158,
          385,
          98,
          {
            color: theme.mutedInk,
            fontSize: 15,
            fontWeight: 500,
            lineHeight: 1.44,
          },
        ),
        ...detailElements(page.id, page.details, 48, 342),
        image(
          page.id,
          'primary-image',
          page.images?.[0]?.label,
          page.images?.[0]?.caption,
          484,
          76,
          198,
          340,
        ),
      ];
      return base;

    case 'process-grid':
      base.elements = [
        text(page.id, 'eyebrow', 'label', page.eyebrow, 48, 42, 160, 22, {
          color: theme.softInk,
          fontSize: 12,
          fontWeight: 800,
          textTransform: 'uppercase',
        }),
        text(page.id, 'title', 'heading', page.title, 48, 72, 590, 44, {
          fontSize: 34,
          fontWeight: 850,
          textTransform: 'uppercase',
        }),
        text(
          page.id,
          'description',
          'paragraph',
          page.description,
          48,
          124,
          540,
          52,
          {
            color: theme.mutedInk,
            fontSize: 14,
            fontWeight: 500,
            lineHeight: 1.36,
          },
        ),
        ...(page.images ?? []).map((entry, index) =>
          image(
            page.id,
            `process-image-${index + 1}`,
            entry.label,
            entry.caption,
            index % 2 === 0 ? 48 : 370,
            206 + Math.floor(index / 2) * 118,
            288,
            94,
            8 + index,
          ),
        ),
      ];
      return base;

    case 'outcome':
      base.elements = [
        text(page.id, 'eyebrow', 'label', page.eyebrow, 48, 42, 160, 22, {
          color: theme.softInk,
          fontSize: 12,
          fontWeight: 800,
          textTransform: 'uppercase',
        }),
        text(page.id, 'title', 'heading', page.title, 48, 72, 500, 44, {
          fontSize: 34,
          fontWeight: 850,
          textTransform: 'uppercase',
        }),
        image(
          page.id,
          'outcome-image',
          page.images?.[0]?.label,
          page.images?.[0]?.caption,
          48,
          134,
          635,
          198,
        ),
        text(
          page.id,
          'description',
          'paragraph',
          page.description,
          48,
          360,
          390,
          72,
          {
            color: theme.mutedInk,
            fontSize: 14,
            fontWeight: 500,
            lineHeight: 1.4,
          },
        ),
        ...detailElements(page.id, page.details, 482, 360),
      ];
      return base;

    case 'experiments':
      base.elements = [
        text(page.id, 'eyebrow', 'label', page.eyebrow, 48, 42, 220, 22, {
          color: theme.softInk,
          fontSize: 12,
          fontWeight: 800,
          textTransform: 'uppercase',
        }),
        text(page.id, 'title', 'heading', page.title, 48, 72, 570, 44, {
          fontSize: 34,
          fontWeight: 850,
          textTransform: 'uppercase',
        }),
        text(
          page.id,
          'description',
          'paragraph',
          page.description,
          48,
          126,
          560,
          54,
          {
            color: theme.mutedInk,
            fontSize: 14,
            fontWeight: 500,
            lineHeight: 1.36,
          },
        ),
        ...(page.images ?? []).map((entry, index) =>
          image(
            page.id,
            `experiment-image-${index + 1}`,
            entry.label,
            entry.caption,
            index === 0 ? 48 : 372,
            226,
            286,
            174,
            8 + index,
          ),
        ),
      ];
      return base;

    case 'about':
      base.elements = [
        text(page.id, 'eyebrow', 'label', page.eyebrow, 48, 52, 160, 22, {
          color: theme.softInk,
          fontSize: 12,
          fontWeight: 800,
          textTransform: 'uppercase',
        }),
        text(page.id, 'title', 'heading', page.title, 48, 86, 500, 44, {
          fontSize: 36,
          fontWeight: 850,
          textTransform: 'uppercase',
        }),
        text(
          page.id,
          'description',
          'paragraph',
          page.description,
          48,
          150,
          560,
          72,
          {
            color: theme.mutedInk,
            fontSize: 15,
            fontWeight: 500,
            lineHeight: 1.44,
          },
        ),
        ...(page.details ?? []).map((item, index) =>
          text(
            page.id,
            `skill-${index + 1}`,
            'label',
            item,
            index % 2 === 0 ? 48 : 372,
            318 + Math.floor(index / 2) * 66,
            260,
            28,
            {
              color: theme.mutedInk,
              fontSize: 14,
              fontWeight: 800,
              textTransform: 'uppercase',
            },
            12 + index,
          ),
        ),
      ];
      return base;

    case 'contact':
      base.elements = [
        text(page.id, 'eyebrow', 'label', page.eyebrow, 48, 52, 160, 22, {
          color: theme.softInk,
          fontSize: 12,
          fontWeight: 800,
          textTransform: 'uppercase',
        }),
        text(page.id, 'title', 'heading', page.title, 48, 212, 430, 52, {
          fontSize: 38,
          fontWeight: 850,
          textTransform: 'uppercase',
        }),
        text(
          page.id,
          'description',
          'paragraph',
          page.description,
          48,
          276,
          430,
          76,
          {
            color: theme.mutedInk,
            fontSize: 15,
            fontWeight: 500,
            lineHeight: 1.44,
          },
        ),
        ...detailElements(page.id, page.details, 48, 404),
      ];
      return base;

    case 'back-cover':
      base.elements = [
        text(
          page.id,
          'studio-mark',
          'label',
          'Studio Voigt.',
          42,
          34,
          180,
          24,
          {
            color: theme.white,
            fontSize: 13,
            fontWeight: 800,
          },
        ),
        text(page.id, 'year', 'label', page.year, 42, 154, 120, 24, {
          color: theme.white,
          fontSize: 14,
          fontWeight: 500,
        }),
        text(page.id, 'title', 'heading', page.title, 42, 188, 600, 62, {
          color: theme.white,
          fontSize: 52,
          fontWeight: 850,
          lineHeight: 0.96,
          textTransform: 'uppercase',
        }),
        text(page.id, 'subtitle', 'heading', page.subtitle, 42, 258, 500, 36, {
          color: theme.white,
          fontSize: 24,
          fontWeight: 500,
          textTransform: 'uppercase',
        }),
        text(
          page.id,
          'description',
          'caption',
          page.description,
          42,
          438,
          300,
          28,
          {
            color: theme.white,
            fontSize: 13,
            fontWeight: 500,
          },
        ),
      ];
      return base;

    default:
      return base;
  }
}

export function createPortfolioId(prefix: string) {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

  return `${prefix}-${random}`;
}

export function createTextElement(role: TextRole, zIndex: number): TextElement {
  const isHeading = role === 'heading';
  const isCaption = role === 'caption';

  return {
    id: createPortfolioId(role),
    type: 'text',
    role,
    content: isHeading
      ? 'New Heading'
      : isCaption
        ? 'Caption text'
        : 'New paragraph text',
    x: 70,
    y: isHeading ? 90 : 160,
    width: isHeading ? 420 : 380,
    height: isHeading ? 58 : 92,
    zIndex,
    locked: false,
    hidden: false,
    style: textStyle({
      color:
        role === 'caption'
          ? theme.softInk
          : isHeading
            ? theme.ink
            : theme.mutedInk,
      fontSize: isHeading ? 34 : isCaption ? 12 : 15,
      fontWeight: isHeading ? 850 : isCaption ? 800 : 500,
      lineHeight: isHeading ? 1.02 : 1.36,
      textTransform: isHeading
        ? 'uppercase'
        : role === 'caption'
          ? 'uppercase'
          : 'none',
    }),
  };
}

export function createImageElement(zIndex: number): ImageElement {
  return {
    id: createPortfolioId('image'),
    type: 'image',
    label: 'PLACEHOLDER IMAGE',
    caption: 'Image caption',
    alt: 'Portfolio image',
    fit: 'cover',
    cropX: 50,
    cropY: 50,
    cropScale: 1,
    borderRadius: 0,
    x: 420,
    y: 112,
    width: 228,
    height: 230,
    zIndex,
    locked: false,
    hidden: false,
  };
}

export function createShapeElement(zIndex: number): ShapeElement {
  return shape(
    createPortfolioId('shape'),
    'box',
    90,
    110,
    220,
    140,
    'transparent',
    theme.line,
    1,
    zIndex,
  );
}

export function createLineElement(zIndex: number): LineElement {
  return {
    id: createPortfolioId('line'),
    type: 'line',
    x: 80,
    y: 320,
    width: 420,
    height: 8,
    zIndex,
    locked: false,
    hidden: false,
    stroke: theme.ink,
    strokeWidth: 1,
  };
}

export function createButtonElement(zIndex: number): ButtonElement {
  return {
    id: createPortfolioId('button'),
    type: 'button',
    label: 'View work',
    href: '#',
    x: 80,
    y: 360,
    width: 150,
    height: 40,
    zIndex,
    locked: false,
    hidden: false,
    style: {
      fontFamily: theme.fontSans,
      fontSize: 13,
      fontWeight: 800,
      color: theme.ink,
      background: 'transparent',
      borderColor: theme.line,
      textTransform: 'uppercase',
    },
  };
}

export function createPageNumberElement(zIndex: number): PageNumberElement {
  return {
    id: createPortfolioId('page-number'),
    type: 'page-number',
    format: 'current-total',
    x: 600,
    y: 462,
    width: 88,
    height: 24,
    zIndex,
    locked: false,
    hidden: false,
    style: textStyle({
      color: theme.softInk,
      fontSize: 12,
      fontWeight: 850,
      textAlign: 'right',
    }),
  };
}

export function createBlankPage(pageNumber: number): PortfolioPage {
  return {
    id: createPortfolioId('page'),
    name: `Blank Page ${pageNumber}`,
    role: 'page',
    background: theme.paper,
    elements: [
      text(
        createPortfolioId('blank'),
        'heading',
        'heading',
        'Untitled Page',
        48,
        70,
        420,
        54,
        {
          fontSize: 34,
          fontWeight: 850,
          textTransform: 'uppercase',
        },
      ),
    ],
  };
}

export function createProjectOverviewPage(pageNumber: number): PortfolioPage {
  const pageId = createPortfolioId('project-page');

  return {
    id: pageId,
    name: `Project Overview ${pageNumber}`,
    role: 'page',
    background: theme.paper,
    contentsLabel: `Project ${pageNumber}`,
    elements: [
      text(pageId, 'eyebrow', 'label', 'PROJECT', 48, 60, 160, 22, {
        color: theme.softInk,
        fontSize: 12,
        fontWeight: 800,
        textTransform: 'uppercase',
      }),
      text(pageId, 'title', 'heading', 'Project Overview', 48, 94, 350, 48, {
        fontSize: 34,
        fontWeight: 850,
        textTransform: 'uppercase',
      }),
      text(
        pageId,
        'description',
        'paragraph',
        'Describe the brief, design intent, constraints, and final direction.',
        48,
        158,
        385,
        98,
        {
          color: theme.mutedInk,
          fontSize: 15,
          fontWeight: 500,
          lineHeight: 1.44,
        },
      ),
      ...detailElements(pageId, ['ROLE', 'FORMAT', 'YEAR'], 48, 342),
      image(
        pageId,
        'primary-image',
        'PLACEHOLDER IMAGE',
        'Primary image slot',
        484,
        76,
        198,
        340,
      ),
    ],
  };
}

export function createInitialPortfolioProject(): PortfolioProject {
  return {
    schemaVersion: PORTFOLIO_SCHEMA_VERSION,
    id: 'lukas-voigt-portfolio-book',
    updatedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    settings: {
      title: 'Lukas Voigt',
      owner: 'Lukas Voigt',
      subtitle: 'Selected Work',
      year: '2026',
    },
    theme,
    assets: [],
    pages: bookPages.map(migrateBookPage),
  };
}

const fallbackProject = createInitialPortfolioProject();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function numberValue(
  value: unknown,
  fallback: number,
  min = -10000,
  max = 10000,
) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}

function normalizeStyle(value: unknown): TextElement['style'] {
  const record = isRecord(value) ? value : {};

  return textStyle({
    fontFamily: stringValue(record.fontFamily, theme.fontSans),
    fontSize: numberValue(record.fontSize, 15, 6, 180),
    fontWeight: numberValue(record.fontWeight, 700, 100, 1000),
    fontStyle: record.fontStyle === 'italic' ? 'italic' : 'normal',
    color: stringValue(record.color, theme.ink),
    textAlign:
      record.textAlign === 'center' || record.textAlign === 'right'
        ? record.textAlign
        : 'left',
    lineHeight: numberValue(record.lineHeight, 1.25, 0.7, 3),
    letterSpacing: numberValue(record.letterSpacing, 0, -10, 40),
    paragraphSpacing: numberValue(record.paragraphSpacing, 0, 0, 80),
    textTransform:
      record.textTransform === 'uppercase' ||
      record.textTransform === 'lowercase'
        ? record.textTransform
        : 'none',
  });
}

function normalizeElement(
  value: unknown,
  fallbackIndex: number,
): PortfolioElement | null {
  if (!isRecord(value)) return null;

  const type = value.type;
  const base = {
    id: stringValue(value.id, createPortfolioId('element')),
    x: numberValue(value.x, 60, -BOOK_PAGE_WIDTH, BOOK_PAGE_WIDTH * 2),
    y: numberValue(value.y, 60, -BOOK_PAGE_HEIGHT, BOOK_PAGE_HEIGHT * 2),
    width: numberValue(value.width, 180, 4, BOOK_PAGE_WIDTH * 2),
    height: numberValue(value.height, 80, 4, BOOK_PAGE_HEIGHT * 2),
    zIndex: numberValue(value.zIndex, fallbackIndex + 1, 0, 999),
    locked: booleanValue(value.locked, false),
    hidden: booleanValue(value.hidden, false),
  };

  if (type === 'text') {
    return {
      ...base,
      type,
      role:
        value.role === 'heading' ||
        value.role === 'caption' ||
        value.role === 'label' ||
        value.role === 'paragraph'
          ? value.role
          : 'paragraph',
      content: stringValue(value.content, ''),
      style: normalizeStyle(value.style),
    };
  }

  if (type === 'image') {
    return {
      ...base,
      type,
      assetId: typeof value.assetId === 'string' ? value.assetId : undefined,
      label: stringValue(value.label, 'PLACEHOLDER IMAGE'),
      caption: typeof value.caption === 'string' ? value.caption : undefined,
      alt: stringValue(value.alt, ''),
      fit:
        value.fit === 'contain' ||
        value.fit === 'original' ||
        value.fit === 'cover'
          ? value.fit
          : 'cover',
      cropX: numberValue(value.cropX, 50, 0, 100),
      cropY: numberValue(value.cropY, 50, 0, 100),
      cropScale: numberValue(value.cropScale, 1, 0.1, 5),
      borderRadius: numberValue(value.borderRadius, 0, 0, 80),
    };
  }

  if (type === 'shape') {
    return {
      ...base,
      type,
      fill: stringValue(value.fill, 'transparent'),
      stroke: stringValue(value.stroke, theme.line),
      strokeWidth: numberValue(value.strokeWidth, 1, 0, 20),
      borderRadius: numberValue(value.borderRadius, 0, 0, 80),
    };
  }

  if (type === 'line') {
    return {
      ...base,
      type,
      stroke: stringValue(value.stroke, theme.ink),
      strokeWidth: numberValue(value.strokeWidth, 1, 1, 20),
    };
  }

  if (type === 'button') {
    const styleValue = isRecord(value.style) ? value.style : {};

    return {
      ...base,
      type,
      label: stringValue(value.label, 'Button'),
      href: typeof value.href === 'string' ? value.href : undefined,
      action: value.action === 'advance' ? 'advance' : undefined,
      style: {
        fontFamily: stringValue(styleValue.fontFamily, theme.fontSans),
        fontSize: numberValue(styleValue.fontSize, 13, 8, 80),
        fontWeight: numberValue(styleValue.fontWeight, 800, 100, 1000),
        color: stringValue(styleValue.color, theme.ink),
        background: stringValue(styleValue.background, 'transparent'),
        borderColor: stringValue(styleValue.borderColor, theme.line),
        textTransform:
          styleValue.textTransform === 'lowercase' ||
          styleValue.textTransform === 'none'
            ? styleValue.textTransform
            : 'uppercase',
      },
    };
  }

  if (type === 'page-number') {
    return {
      ...base,
      type,
      format: value.format === 'current' ? 'current' : 'current-total',
      style: normalizeStyle(value.style),
    };
  }

  return null;
}

function normalizeAsset(value: unknown): PortfolioAsset | null {
  if (!isRecord(value)) return null;

  const dataUrl = stringValue(value.dataUrl, '');
  if (!dataUrl.startsWith('data:')) return null;

  return {
    id: stringValue(value.id, createPortfolioId('asset')),
    name: stringValue(value.name, 'Uploaded image'),
    mimeType: stringValue(value.mimeType, 'application/octet-stream'),
    dataUrl,
    createdAt: stringValue(value.createdAt, new Date().toISOString()),
    width: typeof value.width === 'number' ? value.width : undefined,
    height: typeof value.height === 'number' ? value.height : undefined,
  };
}

export function normalizePortfolioProject(
  value: unknown,
): PortfolioProject | null {
  if (!isRecord(value)) return null;

  const pagesValue = Array.isArray(value.pages) ? value.pages : [];
  const pages = pagesValue
    .map((pageValue, index): PortfolioPage | null => {
      if (!isRecord(pageValue)) return null;

      const elements = Array.isArray(pageValue.elements)
        ? pageValue.elements
            .map((element, elementIndex) =>
              normalizeElement(element, elementIndex),
            )
            .filter((element): element is PortfolioElement => element !== null)
        : [];

      return {
        id: stringValue(pageValue.id, createPortfolioId('page')),
        name: stringValue(pageValue.name, `Page ${index + 1}`),
        role:
          pageValue.role === 'cover' || pageValue.role === 'back-cover'
            ? pageValue.role
            : 'page',
        background: stringValue(pageValue.background, theme.paper),
        contentsLabel:
          typeof pageValue.contentsLabel === 'string'
            ? pageValue.contentsLabel
            : undefined,
        elements,
      };
    })
    .filter((page): page is PortfolioPage => page !== null);

  if (pages.length === 0) return null;

  const settings = isRecord(value.settings) ? value.settings : {};
  const themeValue = isRecord(value.theme) ? value.theme : {};
  const assets = Array.isArray(value.assets)
    ? value.assets
        .map(normalizeAsset)
        .filter((asset): asset is PortfolioAsset => asset !== null)
    : [];

  return {
    schemaVersion: PORTFOLIO_SCHEMA_VERSION,
    id: stringValue(value.id, fallbackProject.id),
    updatedAt: stringValue(value.updatedAt, new Date().toISOString()),
    settings: {
      title: stringValue(settings.title, fallbackProject.settings.title),
      owner: stringValue(settings.owner, fallbackProject.settings.owner),
      subtitle: stringValue(
        settings.subtitle,
        fallbackProject.settings.subtitle,
      ),
      year: stringValue(settings.year, fallbackProject.settings.year),
    },
    theme: {
      ink: stringValue(themeValue.ink, theme.ink),
      mutedInk: stringValue(themeValue.mutedInk, theme.mutedInk),
      softInk: stringValue(themeValue.softInk, theme.softInk),
      paper: stringValue(themeValue.paper, theme.paper),
      paperDeep: stringValue(themeValue.paperDeep, theme.paperDeep),
      white: stringValue(themeValue.white, theme.white),
      studio: stringValue(themeValue.studio, theme.studio),
      line: stringValue(themeValue.line, theme.line),
      fontSans: stringValue(themeValue.fontSans, theme.fontSans),
      fontMono: stringValue(themeValue.fontMono, theme.fontMono),
    },
    assets,
    pages,
  };
}

export const initialPortfolioProject = fallbackProject;
