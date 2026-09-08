import fontkit from '@pdf-lib/fontkit';
import {
  clip,
  endPath,
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  rotateDegrees,
  scale as pdfScale,
  translate,
  type PDFImage,
  type PDFPage,
  type PDFFont,
} from 'pdf-lib';

import {
  BOOK_PAGE_HEIGHT,
  BOOK_PAGE_WIDTH,
  type ButtonElement,
  type ImageElement,
  type LineElement,
  type PageNumberElement,
  type PortfolioAsset,
  type PortfolioElement,
  type PortfolioPage,
  type PortfolioProject,
  type ShapeElement,
  type TextElement,
  type TextTransform,
} from '@/lib/portfolio-project';

type ExportableElement = PortfolioElement & {
  opacity?: number;
  rotation?: number;
};

type ExportColor = {
  r: number;
  g: number;
  b: number;
  opacity: number;
};

type StaticFontFamily = 'sans' | 'mono';
type StaticFontStyle = 'normal' | 'italic';

type StaticFontSource = {
  key: string;
  family: StaticFontFamily;
  svgFamily: string;
  filename: string;
  weight: number;
  style: StaticFontStyle;
};

type ResolvedFont = {
  source: StaticFontSource;
  font: PDFFont;
};

type LaidOutTextLine = {
  text: string;
  width: number;
  xScale: number;
};

type PdfFontResolver = {
  resolve: (
    fontFamily: string,
    fontWeight: number,
    fontStyle?: string,
  ) => Promise<ResolvedFont>;
};

type SvgContext = {
  fonts: PdfFontResolver;
  clipDefs: string[];
  usedFonts: Map<string, StaticFontSource>;
  nextClipId: () => string;
};

const FONT_BASE_PATH = '/fonts/geist/';
const POINTS_PER_PIXEL = 1;
const DEFAULT_LINE = 'rgb(8 8 8 / 18%)';
const DEFAULT_STUDIO = '#d7d8d3';
const DEFAULT_INK = '#080808';

const STATIC_FONTS: StaticFontSource[] = [
  fontSource('sans', 'normal', 100, 'Geist-Thin.ttf'),
  fontSource('sans', 'normal', 200, 'Geist-UltraLight.ttf'),
  fontSource('sans', 'normal', 300, 'Geist-Light.ttf'),
  fontSource('sans', 'normal', 400, 'Geist-Regular.ttf'),
  fontSource('sans', 'normal', 500, 'Geist-Medium.ttf'),
  fontSource('sans', 'normal', 600, 'Geist-SemiBold.ttf'),
  fontSource('sans', 'normal', 700, 'Geist-Bold.ttf'),
  fontSource('sans', 'normal', 800, 'Geist-Black.ttf'),
  fontSource('sans', 'normal', 900, 'Geist-UltraBlack.ttf'),
  fontSource('sans', 'italic', 100, 'Geist-ThinItalic.ttf'),
  fontSource('sans', 'italic', 200, 'Geist-ExtraLightItalic.ttf'),
  fontSource('sans', 'italic', 300, 'Geist-LightItalic.ttf'),
  fontSource('sans', 'italic', 400, 'Geist-Italic.ttf'),
  fontSource('sans', 'italic', 500, 'Geist-MediumItalic.ttf'),
  fontSource('sans', 'italic', 600, 'Geist-SemiBoldItalic.ttf'),
  fontSource('sans', 'italic', 700, 'Geist-BoldItalic.ttf'),
  fontSource('sans', 'italic', 800, 'Geist-ExtraBoldItalic.ttf'),
  fontSource('sans', 'italic', 900, 'Geist-BlackItalic.ttf'),
  fontSource('mono', 'normal', 100, 'GeistMono-Thin.ttf'),
  fontSource('mono', 'normal', 200, 'GeistMono-UltraLight.ttf'),
  fontSource('mono', 'normal', 300, 'GeistMono-Light.ttf'),
  fontSource('mono', 'normal', 400, 'GeistMono-Regular.ttf'),
  fontSource('mono', 'normal', 500, 'GeistMono-Medium.ttf'),
  fontSource('mono', 'normal', 600, 'GeistMono-SemiBold.ttf'),
  fontSource('mono', 'normal', 700, 'GeistMono-Bold.ttf'),
  fontSource('mono', 'normal', 800, 'GeistMono-Black.ttf'),
  fontSource('mono', 'normal', 900, 'GeistMono-UltraBlack.ttf'),
  fontSource('mono', 'italic', 100, 'GeistMono-ThinItalic.ttf'),
  fontSource('mono', 'italic', 200, 'GeistMono-ExtraLightItalic.ttf'),
  fontSource('mono', 'italic', 300, 'GeistMono-LightItalic.ttf'),
  fontSource('mono', 'italic', 400, 'GeistMono-Italic.ttf'),
  fontSource('mono', 'italic', 500, 'GeistMono-MediumItalic.ttf'),
  fontSource('mono', 'italic', 600, 'GeistMono-SemiBoldItalic.ttf'),
  fontSource('mono', 'italic', 700, 'GeistMono-BoldItalic.ttf'),
  fontSource('mono', 'italic', 800, 'GeistMono-ExtraBoldItalic.ttf'),
  fontSource('mono', 'italic', 900, 'GeistMono-BlackItalic.ttf'),
];

const fontByteCache = new Map<string, Promise<Uint8Array>>();

function fontSource(
  family: StaticFontFamily,
  style: StaticFontStyle,
  weight: number,
  filename: string,
): StaticFontSource {
  return {
    key: `${family}-${style}-${weight}`,
    family,
    svgFamily: family === 'mono' ? 'Geist Mono Export' : 'Geist Export',
    filename,
    weight,
    style,
  };
}

function pageY(y: number, height = 0) {
  return BOOK_PAGE_HEIGHT - y - height;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function stripTrailingZeroes(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttribute(value: string) {
  return escapeXml(value).replace(/'/g, '&apos;');
}

function staticAssetUrl(path: string) {
  if (/^(?:https?:|data:|blob:)/i.test(path)) return path;

  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : typeof location !== 'undefined' && location.origin
        ? location.origin
        : 'http://localhost:3000';

  return new URL(path, origin).toString();
}

function fontUrl(source: StaticFontSource) {
  return staticAssetUrl(`${FONT_BASE_PATH}${source.filename}`);
}

function validateTtfBytes(bytes: Uint8Array, filename: string) {
  const signature = Array.from(bytes.slice(0, 4))
    .map((value) => String.fromCharCode(value))
    .join('');
  const hasTrueTypeSignature =
    (bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0) ||
    signature === 'true';

  if (!hasTrueTypeSignature) {
    throw new Error(`The bundled font "${filename}" is not a valid TTF file.`);
  }
}

async function fetchFontBytes(source: StaticFontSource) {
  const cached = fontByteCache.get(source.key);
  if (cached) return cached;

  const pending = fetch(fontUrl(source))
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(
          `The bundled font "${source.filename}" could not load.`,
        );
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      validateTtfBytes(bytes, source.filename);
      return bytes;
    })
    .catch((error) => {
      fontByteCache.delete(source.key);
      throw error;
    });

  fontByteCache.set(source.key, pending);
  return pending;
}

function staticFontFamily(fontFamily: string): StaticFontFamily {
  return fontFamily.toLowerCase().includes('mono') ? 'mono' : 'sans';
}

function staticFontStyle(fontStyle?: string): StaticFontStyle {
  return fontStyle === 'italic' ? 'italic' : 'normal';
}

function nearestStaticFontSource(
  fontFamily: string,
  fontWeight: number,
  fontStyle?: string,
) {
  const family = staticFontFamily(fontFamily);
  const style = staticFontStyle(fontStyle);
  const targetWeight = clamp(Math.round(fontWeight), 100, 900);
  const candidates = STATIC_FONTS.filter(
    (source) => source.family === family && source.style === style,
  );

  return candidates.reduce((closest, source) => {
    const closestDistance = Math.abs(closest.weight - targetWeight);
    const sourceDistance = Math.abs(source.weight - targetWeight);

    if (sourceDistance < closestDistance) return source;
    if (sourceDistance === closestDistance && source.weight < closest.weight) {
      return source;
    }

    return closest;
  }, candidates[0]);
}

function createPdfFontResolver(pdfDocument: PDFDocument): PdfFontResolver {
  const cache = new Map<string, Promise<ResolvedFont>>();

  pdfDocument.registerFontkit(fontkit);

  return {
    resolve(fontFamily, fontWeight, fontStyle) {
      const source = nearestStaticFontSource(fontFamily, fontWeight, fontStyle);
      const cached = cache.get(source.key);
      if (cached) return cached;

      const pending = fetchFontBytes(source).then(async (bytes) => ({
        source,
        font: await pdfDocument.embedFont(bytes, { subset: false }),
      }));

      cache.set(source.key, pending);
      return pending;
    },
  };
}

function parseAlpha(value: string | undefined) {
  if (!value) return 1;

  const trimmed = value.trim();
  const alpha = trimmed.endsWith('%')
    ? Number.parseFloat(trimmed) / 100
    : Number.parseFloat(trimmed);

  return Number.isFinite(alpha) ? clamp(alpha, 0, 1) : 1;
}

function parseRgbChannel(value: string | undefined) {
  if (!value) return 0;

  const trimmed = value.trim();
  const channel = trimmed.endsWith('%')
    ? (Number.parseFloat(trimmed) / 100) * 255
    : Number.parseFloat(trimmed);

  return Number.isFinite(channel) ? clamp(channel / 255, 0, 1) : 0;
}

function parseCssColor(value: string | undefined, fallback = DEFAULT_INK) {
  const colorValue = (value || fallback).trim();

  if (colorValue === 'transparent') {
    return { r: 0, g: 0, b: 0, opacity: 0 };
  }

  if (colorValue.startsWith('#')) {
    const hex = colorValue.slice(1);
    const normalized =
      hex.length === 3 || hex.length === 4
        ? hex
            .split('')
            .map((character) => character + character)
            .join('')
        : hex.padEnd(8, 'f').slice(0, 8);

    return {
      r: Number.parseInt(normalized.slice(0, 2), 16) / 255,
      g: Number.parseInt(normalized.slice(2, 4), 16) / 255,
      b: Number.parseInt(normalized.slice(4, 6), 16) / 255,
      opacity:
        normalized.length >= 8
          ? Number.parseInt(normalized.slice(6, 8), 16) / 255
          : 1,
    };
  }

  const rgbMatch = colorValue.match(/^rgba?\((.*)\)$/i);
  if (rgbMatch) {
    const body = rgbMatch[1].trim();
    const [channelPart, slashAlpha] = body
      .split('/')
      .map((part) => part.trim());
    const commaChannels = channelPart.includes(',')
      ? channelPart.split(',').map((part) => part.trim())
      : null;
    const channels = commaChannels ?? channelPart.split(/\s+/);
    const alpha = slashAlpha ?? commaChannels?.[3];

    if (channels.length >= 3) {
      return {
        r: parseRgbChannel(channels[0]),
        g: parseRgbChannel(channels[1]),
        b: parseRgbChannel(channels[2]),
        opacity: parseAlpha(alpha),
      };
    }
  }

  return parseCssColor(fallback, DEFAULT_INK);
}

function colorToRgb(color: ExportColor) {
  return rgb(color.r, color.g, color.b);
}

function colorToHex(color: ExportColor) {
  const channel = (value: number) =>
    Math.round(clamp(value, 0, 1) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`;
}

function combineOpacity(...opacities: number[]) {
  return opacities.reduce((combined, opacity) => combined * opacity, 1);
}

function elementOpacity(element: ExportableElement) {
  return typeof element.opacity === 'number' ? clamp(element.opacity, 0, 1) : 1;
}

function elementRotation(element: ExportableElement) {
  return typeof element.rotation === 'number' &&
    Number.isFinite(element.rotation)
    ? element.rotation
    : 0;
}

function applyTransform(text: string, transform: TextTransform) {
  if (transform === 'uppercase') return text.toUpperCase();
  if (transform === 'lowercase') return text.toLowerCase();
  return text;
}

function measuredTextWidth(
  font: PDFFont,
  text: string,
  size: number,
  spacing: number,
) {
  return (
    font.widthOfTextAtSize(text, size) + Math.max(0, text.length - 1) * spacing
  );
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  letterSpacing: number,
) {
  const lines: string[] = [];
  const paragraphs = text.split(/\r?\n/);

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }

    let line = '';
    const words = paragraph.trim().split(/\s+/);

    for (const word of words) {
      const nextLine = line ? `${line} ${word}` : word;

      if (measuredTextWidth(font, nextLine, size, letterSpacing) <= maxWidth) {
        line = nextLine;
        continue;
      }

      if (line) lines.push(line);

      if (measuredTextWidth(font, word, size, letterSpacing) <= maxWidth) {
        line = word;
        continue;
      }

      let chunk = '';
      for (const character of word) {
        const nextChunk = `${chunk}${character}`;
        if (
          measuredTextWidth(font, nextChunk, size, letterSpacing) <= maxWidth
        ) {
          chunk = nextChunk;
        } else {
          if (chunk) lines.push(chunk);
          chunk = character;
        }
      }
      line = chunk;
    }

    if (line) lines.push(line);
  }

  return lines;
}

function textLineCapacity(
  boxHeight: number,
  fontSize: number,
  lineHeight: number,
) {
  if (boxHeight < fontSize) return 0;
  return Math.max(1, Math.floor((boxHeight - fontSize) / lineHeight) + 1);
}

function layoutTextLines(
  text: string,
  element: TextElement | PageNumberElement,
  font: PDFFont,
  fontSize: number,
  letterSpacing: number,
): LaidOutTextLine[] {
  const wrappedLines = wrapText(
    text,
    font,
    fontSize,
    element.width,
    letterSpacing,
  );
  const lineHeight = fontSize * element.style.lineHeight;
  const lineCapacity = textLineCapacity(element.height, fontSize, lineHeight);
  const singleLineWidth = measuredTextWidth(
    font,
    text,
    fontSize,
    letterSpacing,
  );
  const isSingleLineHeading =
    element.type === 'text' &&
    element.role === 'heading' &&
    !text.includes('\n') &&
    lineCapacity === 1;
  const canFitHeading =
    isSingleLineHeading &&
    wrappedLines.length > lineCapacity &&
    singleLineWidth > element.width &&
    singleLineWidth <= element.width * 1.18;

  if (canFitHeading) {
    return [
      {
        text,
        width: singleLineWidth,
        xScale: element.width / singleLineWidth,
      },
    ];
  }

  return wrappedLines.map((line) => ({
    text: line,
    width: measuredTextWidth(font, line, fontSize, letterSpacing),
    xScale: 1,
  }));
}

async function withPdfElementTransform(
  pdfPage: PDFPage,
  element: ExportableElement,
  draw: () => Promise<void> | void,
) {
  const rotation = elementRotation(element);
  if (!rotation) {
    await draw();
    return;
  }

  const centerX = element.x + element.width / 2;
  const centerY = BOOK_PAGE_HEIGHT - element.y - element.height / 2;

  pdfPage.pushOperators(
    pushGraphicsState(),
    translate(centerX, centerY),
    rotateDegrees(-rotation),
    translate(-centerX, -centerY),
  );
  await draw();
  pdfPage.pushOperators(popGraphicsState());
}

function drawWithRectClip(
  pdfPage: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  draw: () => void,
) {
  pdfPage.pushOperators(
    pushGraphicsState(),
    rectangle(x, y, width, height),
    clip(),
    endPath(),
  );
  draw();
  pdfPage.pushOperators(popGraphicsState());
}

function roundedRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(Math.max(0, radius), width / 2, height / 2);
  if (r === 0) {
    return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${
      y + height
    } Z`;
  }

  return [
    `M ${x + r} ${y}`,
    `L ${x + width - r} ${y}`,
    `Q ${x + width} ${y} ${x + width} ${y + r}`,
    `L ${x + width} ${y + height - r}`,
    `Q ${x + width} ${y + height} ${x + width - r} ${y + height}`,
    `L ${x + r} ${y + height}`,
    `Q ${x} ${y + height} ${x} ${y + height - r}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    'Z',
  ].join(' ');
}

function drawVectorRect(
  pdfPage: PDFPage,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
    radius?: number;
    fill?: ExportColor;
    stroke?: ExportColor;
    strokeWidth?: number;
    opacity?: number;
  },
) {
  const fillOpacity = combineOpacity(
    options.opacity ?? 1,
    options.fill?.opacity ?? 0,
  );
  const strokeOpacity = combineOpacity(
    options.opacity ?? 1,
    options.stroke?.opacity ?? 0,
  );
  const borderWidth = options.strokeWidth ?? 0;
  const sharedOptions = {
    color:
      options.fill && fillOpacity > 0 ? colorToRgb(options.fill) : undefined,
    opacity: fillOpacity,
    borderColor:
      options.stroke && strokeOpacity > 0
        ? colorToRgb(options.stroke)
        : undefined,
    borderOpacity: strokeOpacity,
    borderWidth,
  };

  if (options.radius && options.radius > 0) {
    pdfPage.drawSvgPath(
      roundedRectPath(
        options.x,
        options.y,
        options.width,
        options.height,
        options.radius,
      ),
      sharedOptions,
    );
    return;
  }

  pdfPage.drawRectangle({
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    ...sharedOptions,
  });
}

function drawPdfTextLine(
  pdfPage: PDFPage,
  text: string,
  options: {
    x: number;
    y: number;
    font: PDFFont;
    size: number;
    color: ExportColor;
    opacity: number;
    letterSpacing: number;
    xScale: number;
  },
) {
  if (!text) return;

  const draw = () => {
    if (Math.abs(options.letterSpacing) < 0.01) {
      pdfPage.drawText(text, {
        x: options.x,
        y: options.y,
        size: options.size,
        font: options.font,
        color: colorToRgb(options.color),
        opacity: options.opacity,
      });
      return;
    }

    let cursor = options.x;
    for (const character of Array.from(text)) {
      pdfPage.drawText(character, {
        x: cursor,
        y: options.y,
        size: options.size,
        font: options.font,
        color: colorToRgb(options.color),
        opacity: options.opacity,
      });
      cursor +=
        options.font.widthOfTextAtSize(character, options.size) +
        options.letterSpacing;
    }
  };

  if (Math.abs(options.xScale - 1) < 0.001) {
    draw();
    return;
  }

  pdfPage.pushOperators(
    pushGraphicsState(),
    translate(options.x, options.y),
    pdfScale(options.xScale, 1),
    translate(-options.x, -options.y),
  );
  draw();
  pdfPage.pushOperators(popGraphicsState());
}

async function drawTextBox(
  pdfPage: PDFPage,
  element: TextElement | PageNumberElement,
  content: string,
  fonts: PdfFontResolver,
  inheritedOpacity: number,
) {
  const text = applyTransform(content, element.style.textTransform);
  const fontSize = element.style.fontSize * POINTS_PER_PIXEL;
  const letterSpacing = element.style.letterSpacing * POINTS_PER_PIXEL;
  const lineHeight = fontSize * element.style.lineHeight;
  const color = parseCssColor(element.style.color);
  const { font } = await fonts.resolve(
    element.style.fontFamily,
    element.style.fontWeight,
    element.style.fontStyle,
  );
  const boxY = pageY(element.y, element.height);
  const lines = layoutTextLines(text, element, font, fontSize, letterSpacing);
  let baseline = pageY(element.y) - fontSize;

  drawWithRectClip(
    pdfPage,
    element.x,
    boxY,
    element.width,
    element.height,
    () => {
      for (const line of lines) {
        if (baseline < boxY) break;

        const lineWidth = line.width * line.xScale;
        let x = element.x;
        if (element.style.textAlign === 'center') {
          x += (element.width - lineWidth) / 2;
        }
        if (element.style.textAlign === 'right') x += element.width - lineWidth;

        drawPdfTextLine(pdfPage, line.text, {
          x,
          y: baseline,
          size: fontSize,
          font,
          color,
          opacity: combineOpacity(inheritedOpacity, color.opacity),
          letterSpacing,
          xScale: line.xScale,
        });

        baseline -= lineHeight;
      }
    },
  );
}

function dataUrlToBytes(dataUrl: string) {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) return null;

  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return { mimeType: match[1].toLowerCase(), bytes };
}

async function rasterizeImageToPng(dataUrl: string) {
  const image = new Image();
  image.decoding = 'async';
  image.src = dataUrl;
  await image.decode();

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The PDF image could not be prepared.');

  context.drawImage(image, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error('The PDF image could not be encoded.'));
    }, 'image/png');
  });

  return new Uint8Array(await blob.arrayBuffer());
}

async function embedImage(pdfDocument: PDFDocument, asset: PortfolioAsset) {
  const source = dataUrlToBytes(asset.dataUrl);
  if (!source) throw new Error(`Image "${asset.name}" is not a data URL.`);

  if (source.mimeType.includes('png'))
    return pdfDocument.embedPng(source.bytes);
  if (source.mimeType.includes('jpeg') || source.mimeType.includes('jpg')) {
    return pdfDocument.embedJpg(source.bytes);
  }

  return pdfDocument.embedPng(await rasterizeImageToPng(asset.dataUrl));
}

function imageDrawMetrics(
  element: ImageElement,
  imageWidth: number,
  imageHeight: number,
) {
  const coverScale = Math.max(
    element.width / imageWidth,
    element.height / imageHeight,
  );
  const containScale = Math.min(
    element.width / imageWidth,
    element.height / imageHeight,
  );
  const baseScale =
    element.fit === 'cover'
      ? coverScale
      : element.fit === 'contain'
        ? containScale
        : 1;
  const scale = Math.max(0.01, baseScale * element.cropScale);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  const x = element.x + (element.width - width) * (element.cropX / 100);
  const y = element.y + (element.height - height) * (element.cropY / 100);

  return { x, y, width, height };
}

function drawImageAsset(
  pdfPage: PDFPage,
  image: PDFImage,
  element: ImageElement,
  opacity: number,
) {
  const frameX = element.x;
  const frameY = pageY(element.y, element.height);
  const metrics = imageDrawMetrics(element, image.width, image.height);

  drawWithRectClip(
    pdfPage,
    frameX,
    frameY,
    element.width,
    element.height,
    () => {
      pdfPage.drawImage(image, {
        x: metrics.x,
        y: pageY(metrics.y, metrics.height),
        width: metrics.width,
        height: metrics.height,
        opacity,
      });
    },
  );
}

async function drawPlaceholder(
  pdfPage: PDFPage,
  element: ImageElement,
  fonts: PdfFontResolver,
  inheritedOpacity: number,
) {
  const x = element.x;
  const y = pageY(element.y, element.height);
  const stroke = parseCssColor(DEFAULT_INK);
  const fill = parseCssColor(DEFAULT_STUDIO);
  const textColor = parseCssColor('#363634');
  const { font } = await fonts.resolve('Geist', 700);
  const labelSize = Math.max(8, BOOK_PAGE_WIDTH * 0.019);
  const captionSize = Math.max(7, BOOK_PAGE_WIDTH * 0.0155);
  const lineOpacity = combineOpacity(inheritedOpacity, 0.16);

  drawVectorRect(pdfPage, {
    x,
    y,
    width: element.width,
    height: element.height,
    radius: element.borderRadius,
    fill,
    stroke,
    strokeWidth: 1,
    opacity: inheritedOpacity,
  });
  drawWithRectClip(pdfPage, x, y, element.width, element.height, () => {
    pdfPage.drawLine({
      start: { x: x - element.width * 0.1, y: y + element.height * 0.38 },
      end: { x: x + element.width * 1.1, y: y + element.height * 0.68 },
      thickness: 1,
      color: colorToRgb(stroke),
      opacity: lineOpacity,
    });
    pdfPage.drawLine({
      start: { x: x - element.width * 0.1, y: y + element.height * 0.68 },
      end: { x: x + element.width * 1.1, y: y + element.height * 0.38 },
      thickness: 1,
      color: colorToRgb(stroke),
      opacity: lineOpacity,
    });

    const label = element.label.toUpperCase();
    const caption = element.caption?.toUpperCase();
    const padding = BOOK_PAGE_WIDTH * 0.016;
    const labelY = y + padding + (caption ? captionSize + 5 : 0);

    drawPdfTextLine(pdfPage, label, {
      x: x + padding,
      y: labelY,
      size: labelSize,
      font,
      color: textColor,
      opacity: combineOpacity(inheritedOpacity, textColor.opacity),
      letterSpacing: 0,
      xScale: 1,
    });

    if (caption) {
      drawPdfTextLine(pdfPage, caption, {
        x: x + padding,
        y: y + padding,
        size: captionSize,
        font,
        color: textColor,
        opacity: combineOpacity(inheritedOpacity, textColor.opacity),
        letterSpacing: 0,
        xScale: 1,
      });
    }
  });
}

async function drawImageCaption(
  pdfPage: PDFPage,
  element: ImageElement,
  fonts: PdfFontResolver,
  inheritedOpacity: number,
) {
  if (!element.caption) return;

  const fontSize = BOOK_PAGE_WIDTH * 0.0165;
  const paddingX = BOOK_PAGE_WIDTH * 0.016;
  const paddingY = BOOK_PAGE_WIDTH * 0.0115;
  const height = fontSize * 1.2 + paddingY * 2;
  const fill = parseCssColor('#f2eee3');
  const color = parseCssColor('#363634');
  const { font } = await fonts.resolve('Geist', 700);
  const y = pageY(element.y + element.height, 0);

  drawVectorRect(pdfPage, {
    x: element.x,
    y,
    width: element.width,
    height,
    fill,
    opacity: combineOpacity(inheritedOpacity, 0.86),
  });
  drawPdfTextLine(pdfPage, element.caption.toUpperCase(), {
    x: element.x + paddingX,
    y: y + paddingY,
    size: fontSize,
    font,
    color,
    opacity: combineOpacity(inheritedOpacity, color.opacity),
    letterSpacing: 0,
    xScale: 1,
  });
}

async function drawImageElement(
  pdfPage: PDFPage,
  pdfDocument: PDFDocument,
  element: ImageElement,
  project: PortfolioProject,
  fonts: PdfFontResolver,
  inheritedOpacity: number,
) {
  const asset = project.assets.find((entry) => entry.id === element.assetId);
  const frameY = pageY(element.y, element.height);
  const line = parseCssColor(DEFAULT_LINE);

  if (asset) {
    const image = await embedImage(pdfDocument, asset);
    drawImageAsset(pdfPage, image, element, inheritedOpacity);
    drawVectorRect(pdfPage, {
      x: element.x,
      y: frameY,
      width: element.width,
      height: element.height,
      radius: element.borderRadius,
      stroke: line,
      strokeWidth: 1,
      opacity: inheritedOpacity,
    });
    await drawImageCaption(pdfPage, element, fonts, inheritedOpacity);
    return;
  }

  await drawPlaceholder(pdfPage, element, fonts, inheritedOpacity);
}

function drawShapeElement(
  pdfPage: PDFPage,
  element: ShapeElement,
  inheritedOpacity: number,
) {
  drawVectorRect(pdfPage, {
    x: element.x,
    y: pageY(element.y, element.height),
    width: element.width,
    height: element.height,
    radius: element.borderRadius,
    fill: parseCssColor(element.fill, 'transparent'),
    stroke: parseCssColor(element.stroke),
    strokeWidth: element.strokeWidth,
    opacity: inheritedOpacity,
  });
}

function drawLineElement(
  pdfPage: PDFPage,
  element: LineElement,
  inheritedOpacity: number,
) {
  const stroke = parseCssColor(element.stroke);
  const y = pageY(element.y) - element.height / 2;

  pdfPage.drawLine({
    start: { x: element.x, y },
    end: { x: element.x + element.width, y },
    thickness: element.strokeWidth,
    color: colorToRgb(stroke),
    opacity: combineOpacity(inheritedOpacity, stroke.opacity),
  });
}

async function drawButtonElement(
  pdfPage: PDFPage,
  element: ButtonElement,
  fonts: PdfFontResolver,
  inheritedOpacity: number,
) {
  const fill = parseCssColor(element.style.background, 'transparent');
  const stroke = parseCssColor(element.style.borderColor);
  const color = parseCssColor(element.style.color);
  const { font } = await fonts.resolve(
    element.style.fontFamily,
    element.style.fontWeight,
  );
  const fontSize = element.style.fontSize;
  const label = applyTransform(element.label, element.style.textTransform);
  const labelWidth = measuredTextWidth(font, label, fontSize, 0);
  const x = element.x + (element.width - labelWidth) / 2;
  const y = pageY(element.y, element.height) + (element.height - fontSize) / 2;

  drawVectorRect(pdfPage, {
    x: element.x,
    y: pageY(element.y, element.height),
    width: element.width,
    height: element.height,
    radius: 4,
    fill,
    stroke,
    strokeWidth: 1,
    opacity: inheritedOpacity,
  });
  drawWithRectClip(
    pdfPage,
    element.x,
    pageY(element.y, element.height),
    element.width,
    element.height,
    () => {
      drawPdfTextLine(pdfPage, label, {
        x,
        y,
        size: fontSize,
        font,
        color,
        opacity: combineOpacity(inheritedOpacity, color.opacity),
        letterSpacing: 0,
        xScale: 1,
      });
    },
  );
}

async function drawElement(
  pdfPage: PDFPage,
  pdfDocument: PDFDocument,
  element: PortfolioElement,
  project: PortfolioProject,
  pageIndex: number,
  fonts: PdfFontResolver,
) {
  const exportable = element as ExportableElement;
  const opacity = elementOpacity(exportable);
  if (element.hidden || opacity <= 0) return;

  await withPdfElementTransform(pdfPage, exportable, async () => {
    if (element.type === 'text') {
      await drawTextBox(pdfPage, element, element.content, fonts, opacity);
      return;
    }

    if (element.type === 'page-number') {
      const content =
        element.format === 'current-total'
          ? `${pageIndex + 1} / ${project.pages.length}`
          : `${pageIndex + 1}`;
      await drawTextBox(pdfPage, element, content, fonts, opacity);
      return;
    }

    if (element.type === 'image') {
      await drawImageElement(
        pdfPage,
        pdfDocument,
        element,
        project,
        fonts,
        opacity,
      );
      return;
    }

    if (element.type === 'shape') {
      drawShapeElement(pdfPage, element, opacity);
      return;
    }

    if (element.type === 'line') {
      drawLineElement(pdfPage, element, opacity);
      return;
    }

    await drawButtonElement(pdfPage, element, fonts, opacity);
  });
}

function svgAttributes(
  attributes: Record<string, string | number | undefined>,
) {
  return Object.entries(attributes)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}="${escapeAttribute(String(value))}"`)
    .join(' ');
}

function svgRectClip(
  context: SvgContext,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 0,
) {
  const id = context.nextClipId();
  context.clipDefs.push(
    `<clipPath id="${id}"><rect ${svgAttributes({
      x,
      y,
      width,
      height,
      rx: radius > 0 ? radius : undefined,
      ry: radius > 0 ? radius : undefined,
    })}/></clipPath>`,
  );
  return id;
}

function withSvgElementTransform(element: ExportableElement, content: string) {
  const rotation = elementRotation(element);
  const opacity = elementOpacity(element);
  const centerX = element.x + element.width / 2;
  const centerY = element.y + element.height / 2;
  const attributes = svgAttributes({
    opacity: opacity < 1 ? stripTrailingZeroes(opacity) : undefined,
    transform: rotation
      ? `rotate(${stripTrailingZeroes(rotation)} ${stripTrailingZeroes(
          centerX,
        )} ${stripTrailingZeroes(centerY)})`
      : undefined,
  });

  return attributes ? `<g ${attributes}>${content}</g>` : content;
}

function svgPaintAttributes(
  fill?: ExportColor,
  stroke?: ExportColor,
  strokeWidth = 0,
) {
  return svgAttributes({
    fill: fill && fill.opacity > 0 ? colorToHex(fill) : 'none',
    'fill-opacity':
      fill && fill.opacity > 0 && fill.opacity < 1
        ? stripTrailingZeroes(fill.opacity)
        : undefined,
    stroke: stroke && stroke.opacity > 0 ? colorToHex(stroke) : undefined,
    'stroke-opacity':
      stroke && stroke.opacity > 0 && stroke.opacity < 1
        ? stripTrailingZeroes(stroke.opacity)
        : undefined,
    'stroke-width': stroke && stroke.opacity > 0 ? strokeWidth : undefined,
  });
}

async function svgTextBox(
  element: TextElement | PageNumberElement,
  content: string,
  context: SvgContext,
) {
  const text = applyTransform(content, element.style.textTransform);
  const fontSize = element.style.fontSize;
  const letterSpacing = element.style.letterSpacing;
  const lineHeight = fontSize * element.style.lineHeight;
  const color = parseCssColor(element.style.color);
  const { font, source } = await context.fonts.resolve(
    element.style.fontFamily,
    element.style.fontWeight,
    element.style.fontStyle,
  );
  const clipId = svgRectClip(
    context,
    element.x,
    element.y,
    element.width,
    element.height,
  );
  const lines = layoutTextLines(text, element, font, fontSize, letterSpacing);
  const textAnchor =
    element.style.textAlign === 'center'
      ? 'middle'
      : element.style.textAlign === 'right'
        ? 'end'
        : 'start';
  let baseline = element.y + fontSize;
  const textNodes: string[] = [];

  context.usedFonts.set(source.key, source);

  for (const line of lines) {
    if (baseline > element.y + element.height) break;

    let lineX = element.x;
    if (element.style.textAlign === 'center') {
      lineX += element.width / 2;
    }
    if (element.style.textAlign === 'right') {
      lineX += element.width;
    }
    const transform =
      Math.abs(line.xScale - 1) < 0.001
        ? undefined
        : `translate(${stripTrailingZeroes(lineX)} ${stripTrailingZeroes(
            baseline,
          )}) scale(${stripTrailingZeroes(line.xScale)} 1) translate(${stripTrailingZeroes(
            -lineX,
          )} ${stripTrailingZeroes(-baseline)})`;

    textNodes.push(
      `<text ${svgAttributes({
        x: stripTrailingZeroes(lineX),
        y: stripTrailingZeroes(baseline),
        'font-family': source.svgFamily,
        'font-size': stripTrailingZeroes(fontSize),
        'font-style': source.style,
        'font-weight': source.weight,
        'letter-spacing': letterSpacing
          ? stripTrailingZeroes(letterSpacing)
          : undefined,
        'text-anchor': textAnchor,
        fill: colorToHex(color),
        'fill-opacity':
          color.opacity < 1 ? stripTrailingZeroes(color.opacity) : undefined,
        transform,
      })}>${escapeXml(line.text)}</text>`,
    );

    baseline += lineHeight;
  }

  return `<g clip-path="url(#${clipId})">${textNodes.join('')}</g>`;
}

function svgImageElement(element: ImageElement, project: PortfolioProject) {
  const asset = project.assets.find((entry) => entry.id === element.assetId);
  const line = parseCssColor(DEFAULT_LINE);

  if (!asset) return null;

  const imageWidth =
    asset.width && asset.width > 0 ? asset.width : element.width;
  const imageHeight =
    asset.height && asset.height > 0 ? asset.height : element.height;
  const metrics = imageDrawMetrics(element, imageWidth, imageHeight);

  return {
    asset,
    metrics,
    border: `<rect ${svgAttributes({
      x: stripTrailingZeroes(element.x),
      y: stripTrailingZeroes(element.y),
      width: stripTrailingZeroes(element.width),
      height: stripTrailingZeroes(element.height),
      rx: element.borderRadius
        ? stripTrailingZeroes(element.borderRadius)
        : undefined,
      ry: element.borderRadius
        ? stripTrailingZeroes(element.borderRadius)
        : undefined,
    })} ${svgPaintAttributes(undefined, line, 1)}/>`,
  };
}

async function svgPlaceholder(element: ImageElement, context: SvgContext) {
  const fill = parseCssColor(DEFAULT_STUDIO);
  const stroke = parseCssColor(DEFAULT_INK);
  const textColor = parseCssColor('#363634');
  const label = element.label.toUpperCase();
  const caption = element.caption?.toUpperCase();
  const padding = BOOK_PAGE_WIDTH * 0.016;
  const labelSize = Math.max(8, BOOK_PAGE_WIDTH * 0.019);
  const captionSize = Math.max(7, BOOK_PAGE_WIDTH * 0.0155);
  const labelY =
    element.y + element.height - padding - (caption ? captionSize + 5 : 0);
  const captionY = element.y + element.height - padding;
  const clipId = svgRectClip(
    context,
    element.x,
    element.y,
    element.width,
    element.height,
    element.borderRadius,
  );
  const { source } = await context.fonts.resolve('Geist', 700);

  context.usedFonts.set(source.key, source);

  return [
    `<rect ${svgAttributes({
      x: stripTrailingZeroes(element.x),
      y: stripTrailingZeroes(element.y),
      width: stripTrailingZeroes(element.width),
      height: stripTrailingZeroes(element.height),
      rx: element.borderRadius
        ? stripTrailingZeroes(element.borderRadius)
        : undefined,
      ry: element.borderRadius
        ? stripTrailingZeroes(element.borderRadius)
        : undefined,
    })} ${svgPaintAttributes(fill, stroke, 1)}/>`,
    `<g clip-path="url(#${clipId})">`,
    `<line ${svgAttributes({
      x1: stripTrailingZeroes(element.x - element.width * 0.1),
      y1: stripTrailingZeroes(element.y + element.height * 0.62),
      x2: stripTrailingZeroes(element.x + element.width * 1.1),
      y2: stripTrailingZeroes(element.y + element.height * 0.32),
      stroke: colorToHex(stroke),
      'stroke-opacity': '0.16',
      'stroke-width': 1,
    })}/>`,
    `<line ${svgAttributes({
      x1: stripTrailingZeroes(element.x - element.width * 0.1),
      y1: stripTrailingZeroes(element.y + element.height * 0.32),
      x2: stripTrailingZeroes(element.x + element.width * 1.1),
      y2: stripTrailingZeroes(element.y + element.height * 0.62),
      stroke: colorToHex(stroke),
      'stroke-opacity': '0.16',
      'stroke-width': 1,
    })}/>`,
    `<text ${svgAttributes({
      x: stripTrailingZeroes(element.x + padding),
      y: stripTrailingZeroes(labelY),
      'font-family': source.svgFamily,
      'font-size': stripTrailingZeroes(labelSize),
      'font-style': source.style,
      'font-weight': source.weight,
      fill: colorToHex(textColor),
    })}>${escapeXml(label)}</text>`,
    caption
      ? `<text ${svgAttributes({
          x: stripTrailingZeroes(element.x + padding),
          y: stripTrailingZeroes(captionY),
          'font-family': source.svgFamily,
          'font-size': stripTrailingZeroes(captionSize),
          'font-style': source.style,
          'font-weight': source.weight,
          fill: colorToHex(textColor),
        })}>${escapeXml(caption)}</text>`
      : '',
    '</g>',
  ].join('');
}

async function svgImage(
  element: ImageElement,
  project: PortfolioProject,
  context: SvgContext,
) {
  const image = svgImageElement(element, project);
  if (!image) return svgPlaceholder(element, context);

  const clipId = svgRectClip(
    context,
    element.x,
    element.y,
    element.width,
    element.height,
    element.borderRadius,
  );
  const nodes = [
    `<image ${svgAttributes({
      href: image.asset.dataUrl,
      x: stripTrailingZeroes(image.metrics.x),
      y: stripTrailingZeroes(image.metrics.y),
      width: stripTrailingZeroes(image.metrics.width),
      height: stripTrailingZeroes(image.metrics.height),
      preserveAspectRatio: 'none',
      'clip-path': `url(#${clipId})`,
    })}/>`,
    image.border,
  ];

  if (element.caption) {
    const { source } = await context.fonts.resolve('Geist', 700);
    const fontSize = BOOK_PAGE_WIDTH * 0.0165;
    const paddingX = BOOK_PAGE_WIDTH * 0.016;
    const paddingY = BOOK_PAGE_WIDTH * 0.0115;
    const height = fontSize * 1.2 + paddingY * 2;
    const fill = parseCssColor('#f2eee3');
    const color = parseCssColor('#363634');

    context.usedFonts.set(source.key, source);
    nodes.push(
      `<rect ${svgAttributes({
        x: stripTrailingZeroes(element.x),
        y: stripTrailingZeroes(element.y + element.height - height),
        width: stripTrailingZeroes(element.width),
        height: stripTrailingZeroes(height),
        fill: colorToHex(fill),
        'fill-opacity': '0.86',
      })}/>`,
      `<text ${svgAttributes({
        x: stripTrailingZeroes(element.x + paddingX),
        y: stripTrailingZeroes(element.y + element.height - paddingY),
        'font-family': source.svgFamily,
        'font-size': stripTrailingZeroes(fontSize),
        'font-style': source.style,
        'font-weight': source.weight,
        fill: colorToHex(color),
      })}>${escapeXml(element.caption.toUpperCase())}</text>`,
    );
  }

  return nodes.join('');
}

function svgShape(element: ShapeElement) {
  return `<rect ${svgAttributes({
    x: stripTrailingZeroes(element.x),
    y: stripTrailingZeroes(element.y),
    width: stripTrailingZeroes(element.width),
    height: stripTrailingZeroes(element.height),
    rx: element.borderRadius
      ? stripTrailingZeroes(element.borderRadius)
      : undefined,
    ry: element.borderRadius
      ? stripTrailingZeroes(element.borderRadius)
      : undefined,
  })} ${svgPaintAttributes(
    parseCssColor(element.fill, 'transparent'),
    parseCssColor(element.stroke),
    element.strokeWidth,
  )}/>`;
}

function svgLine(element: LineElement) {
  const stroke = parseCssColor(element.stroke);
  const y = element.y + element.height / 2;

  return `<line ${svgAttributes({
    x1: stripTrailingZeroes(element.x),
    y1: stripTrailingZeroes(y),
    x2: stripTrailingZeroes(element.x + element.width),
    y2: stripTrailingZeroes(y),
    stroke: colorToHex(stroke),
    'stroke-opacity':
      stroke.opacity < 1 ? stripTrailingZeroes(stroke.opacity) : undefined,
    'stroke-width': stripTrailingZeroes(element.strokeWidth),
  })}/>`;
}

async function svgButton(element: ButtonElement, context: SvgContext) {
  const fill = parseCssColor(element.style.background, 'transparent');
  const stroke = parseCssColor(element.style.borderColor);
  const color = parseCssColor(element.style.color);
  const label = applyTransform(element.label, element.style.textTransform);
  const { font, source } = await context.fonts.resolve(
    element.style.fontFamily,
    element.style.fontWeight,
  );
  const labelWidth = measuredTextWidth(font, label, element.style.fontSize, 0);
  const x = element.x + (element.width - labelWidth) / 2;
  const y = element.y + (element.height + element.style.fontSize) / 2;
  const clipId = svgRectClip(
    context,
    element.x,
    element.y,
    element.width,
    element.height,
    4,
  );

  context.usedFonts.set(source.key, source);

  return [
    `<rect ${svgAttributes({
      x: stripTrailingZeroes(element.x),
      y: stripTrailingZeroes(element.y),
      width: stripTrailingZeroes(element.width),
      height: stripTrailingZeroes(element.height),
      rx: 4,
      ry: 4,
    })} ${svgPaintAttributes(fill, stroke, 1)}/>`,
    `<g clip-path="url(#${clipId})"><text ${svgAttributes({
      x: stripTrailingZeroes(x),
      y: stripTrailingZeroes(y),
      'font-family': source.svgFamily,
      'font-size': stripTrailingZeroes(element.style.fontSize),
      'font-style': source.style,
      'font-weight': source.weight,
      fill: colorToHex(color),
      'fill-opacity':
        color.opacity < 1 ? stripTrailingZeroes(color.opacity) : undefined,
    })}>${escapeXml(label)}</text></g>`,
  ].join('');
}

async function svgElement(
  element: PortfolioElement,
  project: PortfolioProject,
  pageIndex: number,
  context: SvgContext,
) {
  const exportable = element as ExportableElement;
  if (element.hidden || elementOpacity(exportable) <= 0) return '';

  let content = '';
  if (element.type === 'text') {
    content = await svgTextBox(element, element.content, context);
  } else if (element.type === 'page-number') {
    content = await svgTextBox(
      element,
      element.format === 'current-total'
        ? `${pageIndex + 1} / ${project.pages.length}`
        : `${pageIndex + 1}`,
      context,
    );
  } else if (element.type === 'image') {
    content = await svgImage(element, project, context);
  } else if (element.type === 'shape') {
    content = svgShape(element);
  } else if (element.type === 'line') {
    content = svgLine(element);
  } else {
    content = await svgButton(element, context);
  }

  return withSvgElementTransform(exportable, content);
}

function arrayBufferToBase64(bytes: Uint8Array) {
  if (typeof btoa === 'function') {
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.slice(offset, offset + chunkSize));
    }
    return btoa(binary);
  }

  const maybeBuffer = (
    globalThis as typeof globalThis & {
      Buffer?: {
        from: (bytes: Uint8Array) => { toString: (value: string) => string };
      };
    }
  ).Buffer;
  if (maybeBuffer) return maybeBuffer.from(bytes).toString('base64');

  throw new Error('Base64 encoding is not available in this browser.');
}

async function svgFontCss(sources: StaticFontSource[]) {
  const rules = await Promise.all(
    sources.map(async (source) => {
      const base64 = arrayBufferToBase64(await fetchFontBytes(source));

      return [
        '@font-face {',
        `font-family: "${source.svgFamily}";`,
        `src: url("data:font/ttf;base64,${base64}") format("truetype");`,
        `font-weight: ${source.weight};`,
        `font-style: ${source.style};`,
        'font-display: swap;',
        '}',
      ].join(' ');
    }),
  );

  return `<style>${rules.join('\n')}</style>`;
}

function portfolioPageExportBaseName(page: PortfolioPage, pageIndex: number) {
  const label =
    page.role === 'cover'
      ? 'cover'
      : page.role === 'back-cover'
        ? 'back-cover'
        : page.contentsLabel || page.name || `page-${pageIndex + 1}`;
  const slug = label
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${String(pageIndex + 1).padStart(2, '0')}-${slug || 'page'}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export function portfolioPagePdfFilename(
  page: PortfolioPage,
  pageIndex: number,
) {
  return `${portfolioPageExportBaseName(page, pageIndex)}.pdf`;
}

export function portfolioPageSvgFilename(
  page: PortfolioPage,
  pageIndex: number,
) {
  return `${portfolioPageExportBaseName(page, pageIndex)}.svg`;
}

export async function createPortfolioPagePdfBytes(
  project: PortfolioProject,
  page: PortfolioPage,
  pageIndex: number,
) {
  const pdfDocument = await PDFDocument.create();
  const pdfPage = pdfDocument.addPage([BOOK_PAGE_WIDTH, BOOK_PAGE_HEIGHT]);
  const fonts = createPdfFontResolver(pdfDocument);
  const background = parseCssColor(page.background, project.theme.paper);

  pdfDocument.setTitle(`${project.settings.title} - ${page.name}`);
  pdfDocument.setAuthor(project.settings.owner || project.settings.title);
  pdfDocument.setSubject('Portfolio book page vector export');
  pdfDocument.setCreator('Studio Voigt Portfolio Book Builder');
  pdfDocument.setProducer('Studio Voigt Portfolio Book Builder');

  pdfPage.drawRectangle({
    x: 0,
    y: 0,
    width: BOOK_PAGE_WIDTH,
    height: BOOK_PAGE_HEIGHT,
    color: colorToRgb(background),
    opacity: background.opacity,
  });

  const elements = [...page.elements].sort((a, b) => a.zIndex - b.zIndex);
  for (const element of elements) {
    await drawElement(pdfPage, pdfDocument, element, project, pageIndex, fonts);
  }

  return pdfDocument.save({ useObjectStreams: false });
}

export async function createPortfolioPageSvgString(
  project: PortfolioProject,
  page: PortfolioPage,
  pageIndex: number,
) {
  const metricDocument = await PDFDocument.create();
  const fonts = createPdfFontResolver(metricDocument);
  const background = parseCssColor(page.background, project.theme.paper);
  const context: SvgContext = {
    fonts,
    clipDefs: [],
    usedFonts: new Map(),
    nextClipId: (() => {
      let clipIndex = 0;
      return () => `page-${pageIndex + 1}-clip-${(clipIndex += 1)}`;
    })(),
  };
  const elements = [...page.elements].sort((a, b) => a.zIndex - b.zIndex);
  const elementMarkup = (
    await Promise.all(
      elements.map((element) =>
        svgElement(element, project, pageIndex, context),
      ),
    )
  ).join('');
  const fontCss = await svgFontCss(Array.from(context.usedFonts.values()));
  const defs = [fontCss, ...context.clipDefs].join('');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BOOK_PAGE_WIDTH}" height="${BOOK_PAGE_HEIGHT}" viewBox="0 0 ${BOOK_PAGE_WIDTH} ${BOOK_PAGE_HEIGHT}">`,
    `<title>${escapeXml(`${project.settings.title} - ${page.name}`)}</title>`,
    `<defs>${defs}</defs>`,
    `<rect x="0" y="0" width="${BOOK_PAGE_WIDTH}" height="${BOOK_PAGE_HEIGHT}" fill="${colorToHex(
      background,
    )}"${
      background.opacity < 1
        ? ` fill-opacity="${stripTrailingZeroes(background.opacity)}"`
        : ''
    }/>`,
    elementMarkup,
    '</svg>',
  ].join('');
}

export async function downloadPortfolioPagePdf(
  project: PortfolioProject,
  page: PortfolioPage,
  pageIndex: number,
) {
  const pdfBytes = await createPortfolioPagePdfBytes(project, page, pageIndex);
  const pdfBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength,
  ) as ArrayBuffer;
  const blob = new Blob([pdfBuffer], {
    type: 'application/pdf',
  });

  downloadBlob(blob, portfolioPagePdfFilename(page, pageIndex));
}

export async function downloadPortfolioPageSvg(
  project: PortfolioProject,
  page: PortfolioPage,
  pageIndex: number,
) {
  const svg = await createPortfolioPageSvgString(project, page, pageIndex);
  const blob = new Blob([svg], {
    type: 'image/svg+xml;charset=utf-8',
  });

  downloadBlob(blob, portfolioPageSvgFilename(page, pageIndex));
}
