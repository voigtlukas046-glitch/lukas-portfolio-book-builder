'use client';

import type { CSSProperties, PointerEvent } from 'react';

import {
  BOOK_PAGE_HEIGHT,
  BOOK_PAGE_WIDTH,
  type ImageFit,
  type PortfolioAsset,
  type PortfolioElement,
  type PortfolioPage,
  type PageNumberElement,
  type TextElement,
} from '@/lib/portfolio-project';
import { cn } from '@/lib/utils';

type EditorHandle = 'nw' | 'ne' | 'sw' | 'se' | 'e' | 's';

type PortfolioBookPageProps = {
  page: PortfolioPage;
  pageIndex: number;
  pageTotal: number;
  assets?: PortfolioAsset[];
  mode?: 'preview' | 'editor' | 'thumbnail';
  selectedElementId?: string | null;
  showGrid?: boolean;
  showSafeArea?: boolean;
  onAdvance?: () => void;
  onSelectElement?: (elementId: string) => void;
  onElementPointerDown?: (
    event: PointerEvent<HTMLElement>,
    element: PortfolioElement,
  ) => void;
  onResizePointerDown?: (
    event: PointerEvent<HTMLElement>,
    element: PortfolioElement,
    handle: EditorHandle,
  ) => void;
};

const formatter = new Intl.NumberFormat('en-US', {
  minimumIntegerDigits: 2,
  useGrouping: false,
});

function formatPageNumber(pageIndex: number) {
  return formatter.format(pageIndex + 1);
}

function widthUnit(value: number) {
  return `${(value / BOOK_PAGE_WIDTH) * 100}cqw`;
}

function heightPercent(value: number) {
  return `${(value / BOOK_PAGE_HEIGHT) * 100}%`;
}

function widthPercent(value: number) {
  return `${(value / BOOK_PAGE_WIDTH) * 100}%`;
}

function textElementStyle(
  element: PageNumberElement | TextElement,
): CSSProperties {
  return {
    color: element.style.color,
    fontFamily: element.style.fontFamily,
    fontSize: widthUnit(element.style.fontSize),
    fontStyle: element.style.fontStyle,
    fontWeight: element.style.fontWeight,
    letterSpacing: widthUnit(element.style.letterSpacing),
    lineHeight: element.style.lineHeight,
    textAlign: element.style.textAlign,
    textTransform: element.style.textTransform,
  };
}

function imageBackgroundSize(fit: ImageFit): CSSProperties['backgroundSize'] {
  return fit === 'original' ? 'auto' : fit;
}

function ElementLayer({
  element,
  pageIndex,
  pageTotal,
  assets,
  mode,
  selected,
  onAdvance,
  onSelectElement,
  onElementPointerDown,
  onResizePointerDown,
}: {
  element: PortfolioElement;
  pageIndex: number;
  pageTotal: number;
  assets: PortfolioAsset[];
  mode: 'preview' | 'editor' | 'thumbnail';
  selected: boolean;
  onAdvance?: () => void;
  onSelectElement?: (elementId: string) => void;
  onElementPointerDown?: (
    event: PointerEvent<HTMLElement>,
    element: PortfolioElement,
  ) => void;
  onResizePointerDown?: (
    event: PointerEvent<HTMLElement>,
    element: PortfolioElement,
    handle: EditorHandle,
  ) => void;
}) {
  if (element.hidden && mode !== 'editor') return null;

  const commonStyle: CSSProperties = {
    left: widthPercent(element.x),
    top: heightPercent(element.y),
    width: widthPercent(element.width),
    height: heightPercent(element.height),
    zIndex: element.zIndex,
  };

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (mode !== 'editor') return;

    event.stopPropagation();
    onSelectElement?.(element.id);
    if (!element.locked) onElementPointerDown?.(event, element);
  };

  const wrapperClassName = cn(
    'book-element',
    `book-element-${element.type}`,
    mode === 'editor' && 'is-editable',
    selected && 'is-selected',
    element.locked && 'is-locked',
    element.hidden && 'is-hidden',
  );

  const resizeHandles =
    mode === 'editor' && selected && !element.locked
      ? (['nw', 'ne', 'sw', 'se', 'e', 's'] as const).map((handle) => (
          <span
            aria-hidden="true"
            className={`resize-handle resize-handle-${handle}`}
            key={handle}
            onPointerDown={(event) => {
              event.stopPropagation();
              onResizePointerDown?.(event, element, handle);
            }}
          />
        ))
      : null;

  if (element.type === 'text') {
    return (
      <div
        className={wrapperClassName}
        style={commonStyle}
        onPointerDown={handlePointerDown}
      >
        <div
          className="book-element-text-content"
          style={textElementStyle(element)}
        >
          {element.content}
        </div>
        {resizeHandles}
      </div>
    );
  }

  if (element.type === 'image') {
    const asset = assets.find((entry) => entry.id === element.assetId);

    return (
      <figure
        className={wrapperClassName}
        style={{
          ...commonStyle,
          borderRadius: widthUnit(element.borderRadius),
        }}
        aria-label={asset ? element.alt : undefined}
        onPointerDown={handlePointerDown}
      >
        {asset ? (
          <div
            className="book-element-image-asset"
            style={{
              backgroundImage: `url("${asset.dataUrl}")`,
              backgroundPosition: `${element.cropX}% ${element.cropY}%`,
              backgroundSize: imageBackgroundSize(element.fit),
              transform: `scale(${element.cropScale})`,
            }}
          />
        ) : (
          <div className="book-element-image-placeholder">
            <span aria-hidden="true" />
            <strong>{element.label}</strong>
            {element.caption ? <small>{element.caption}</small> : null}
          </div>
        )}
        {element.caption && asset ? (
          <figcaption>{element.caption}</figcaption>
        ) : null}
        {resizeHandles}
      </figure>
    );
  }

  if (element.type === 'shape') {
    return (
      <div
        className={wrapperClassName}
        style={{
          ...commonStyle,
          background: element.fill,
          border: `${element.strokeWidth}px solid ${element.stroke}`,
          borderRadius: widthUnit(element.borderRadius),
        }}
        onPointerDown={handlePointerDown}
      >
        {resizeHandles}
      </div>
    );
  }

  if (element.type === 'line') {
    return (
      <div
        className={wrapperClassName}
        style={commonStyle}
        onPointerDown={handlePointerDown}
      >
        <span
          style={{
            borderTop: `${widthUnit(element.strokeWidth)} solid ${element.stroke}`,
          }}
        />
        {resizeHandles}
      </div>
    );
  }

  if (element.type === 'button') {
    const buttonStyle: CSSProperties = {
      ...commonStyle,
      background: element.style.background,
      borderColor: element.style.borderColor,
      color: element.style.color,
      fontFamily: element.style.fontFamily,
      fontSize: widthUnit(element.style.fontSize),
      fontWeight: element.style.fontWeight,
      textTransform: element.style.textTransform,
    };

    if (mode !== 'preview') {
      return (
        <div
          className={wrapperClassName}
          style={buttonStyle}
          onPointerDown={handlePointerDown}
        >
          {element.label}
          {resizeHandles}
        </div>
      );
    }

    return (
      <button
        type="button"
        className={wrapperClassName}
        style={buttonStyle}
        onClick={(event) => {
          if (mode === 'preview' && element.action === 'advance') {
            event.stopPropagation();
            onAdvance?.();
          }

          if (mode === 'preview' && element.href) {
            event.stopPropagation();
            window.open(element.href, '_blank', 'noopener,noreferrer');
          }
        }}
        onPointerDown={handlePointerDown}
      >
        {element.label}
        {resizeHandles}
      </button>
    );
  }

  const displayValue =
    element.format === 'current'
      ? formatPageNumber(pageIndex)
      : `${formatPageNumber(pageIndex)} / ${formatter.format(pageTotal)}`;

  return (
    <div
      className={wrapperClassName}
      style={commonStyle}
      onPointerDown={handlePointerDown}
    >
      <div
        className="book-element-text-content"
        style={textElementStyle(element)}
      >
        {displayValue}
      </div>
      {resizeHandles}
    </div>
  );
}

export function PortfolioBookPage({
  page,
  pageIndex,
  pageTotal,
  assets = [],
  mode = 'preview',
  selectedElementId,
  showGrid = false,
  showSafeArea = mode === 'editor',
  onAdvance,
  onSelectElement,
  onElementPointerDown,
  onResizePointerDown,
}: PortfolioBookPageProps) {
  const sortedElements = [...page.elements].sort((a, b) => a.zIndex - b.zIndex);
  const isCover = page.role === 'cover' || page.role === 'back-cover';

  return (
    <article
      aria-label={`${page.name}, page ${formatPageNumber(pageIndex)} of ${formatter.format(pageTotal)}`}
      className={cn(
        'book-page',
        'editable-book-page',
        isCover && 'book-page-cover',
        mode === 'editor' && 'is-editor-page',
        mode === 'thumbnail' && 'is-thumbnail-page',
      )}
      data-page-role={page.role}
      style={{ background: page.background }}
      onPointerDown={() => {
        if (mode === 'editor') onSelectElement?.('');
      }}
    >
      <div
        className="page-face editable-page-face"
        style={{ background: page.background }}
      >
        <div
          className="portfolio-page-canvas"
          data-grid={showGrid ? 'visible' : 'hidden'}
          data-safe-area={showSafeArea ? 'visible' : 'hidden'}
          style={
            {
              '--book-page-width': `${BOOK_PAGE_WIDTH}px`,
              '--book-page-height': `${BOOK_PAGE_HEIGHT}px`,
            } as CSSProperties
          }
        >
          {sortedElements.map((element) => (
            <ElementLayer
              key={element.id}
              element={element}
              pageIndex={pageIndex}
              pageTotal={pageTotal}
              assets={assets}
              mode={mode}
              selected={element.id === selectedElementId}
              onAdvance={onAdvance}
              onSelectElement={onSelectElement}
              onElementPointerDown={onElementPointerDown}
              onResizePointerDown={onResizePointerDown}
            />
          ))}
        </div>
        <footer className="book-page-footer" aria-hidden="true">
          <span>{page.contentsLabel ?? page.name}</span>
          <span>
            {formatPageNumber(pageIndex)} / {formatter.format(pageTotal)}
          </span>
        </footer>
      </div>
    </article>
  );
}
