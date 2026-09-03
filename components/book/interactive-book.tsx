'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, List, RotateCcw, X } from 'lucide-react';

import { PortfolioBookPage } from '@/components/book/editable-book-page';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  initialPortfolioProject,
  type PortfolioProject,
} from '@/lib/portfolio-project';
import { cn } from '@/lib/utils';

type FlipCorner = 'top' | 'bottom';
type FlipState = 'user_fold' | 'fold_corner' | 'flipping' | 'read';
type FlipOrientation = 'portrait' | 'landscape';
type PageFlipEvent<T> = { data: T };

type PageFlipInstance = {
  on(
    event: 'init',
    callback: (
      event: PageFlipEvent<{ page: number; mode: FlipOrientation }>,
    ) => void,
  ): PageFlipInstance;
  on(
    event: 'flip',
    callback: (event: PageFlipEvent<number>) => void,
  ): PageFlipInstance;
  on(
    event: 'changeState',
    callback: (event: PageFlipEvent<FlipState>) => void,
  ): PageFlipInstance;
  on(
    event: 'changeOrientation',
    callback: (event: PageFlipEvent<FlipOrientation>) => void,
  ): PageFlipInstance;
  loadFromHTML(items: HTMLElement[]): void;
  flipNext(corner?: FlipCorner): void;
  flipPrev(corner?: FlipCorner): void;
  turnToPage(pageIndex: number): void;
  getCurrentPageIndex(): number;
  update(): void;
  destroy(): void;
};

const FLIP_DURATION = 560;

function formatPageNumber(pageIndex: number) {
  return String(pageIndex + 1).padStart(2, '0');
}

function createPageStatus(
  pageIndex: number,
  orientation: FlipOrientation,
  pageTotal: number,
) {
  if (
    orientation === 'landscape' &&
    pageIndex > 0 &&
    pageIndex < pageTotal - 1
  ) {
    const secondPage = Math.min(pageIndex + 1, pageTotal - 1);
    return `${formatPageNumber(pageIndex)}-${formatPageNumber(secondPage)} / ${pageTotal}`;
  }

  return `${formatPageNumber(pageIndex)} / ${pageTotal}`;
}

function IconControl({
  label,
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button> & {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="icon-control">
      <Button
        {...props}
        aria-label={label}
        title={label}
        className={cn('book-nav-button', className)}
      >
        {children}
      </Button>
      <span className="nav-tooltip" role="tooltip">
        {label}
      </span>
    </span>
  );
}

export function InteractiveBook({
  project = initialPortfolioProject,
}: {
  project?: PortfolioProject;
}) {
  const bookRootRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<HTMLElement[]>([]);
  const pageFlipRef = useRef<PageFlipInstance | null>(null);
  const contentsButtonRef = useRef<HTMLButtonElement>(null);
  const wasContentsOpenRef = useRef(false);
  const currentPageRef = useRef(0);
  const flipStateRef = useRef<FlipState>('read');
  const turnLockRef = useRef(false);
  const turnLockTimeoutRef = useRef<number | null>(null);
  const touchStartRef = useRef<{
    x: number;
    y: number;
    pageIndex: number;
    time: number;
  } | null>(null);
  const mouseStartRef = useRef<{
    x: number;
    y: number;
    pageIndex: number;
    time: number;
  } | null>(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [flipState, setFlipState] = useState<FlipState>('read');
  const [orientation, setOrientation] = useState<FlipOrientation>('landscape');
  const [turnLocked, setTurnLocked] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [contentsOpen, setContentsOpen] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(
    null,
  );

  const pages = project.pages;
  const pageTotal = pages.length;
  const contentsItems = useMemo(
    () =>
      pages
        .map((page, index) => ({
          label: page.contentsLabel ?? page.name,
          pageIndex: index,
          note: page.name,
        }))
        .filter(
          (item, index) =>
            pages[index]?.role === 'page' &&
            item.label.trim().length > 0 &&
            index > 0 &&
            index < pageTotal - 1,
        ),
    [pageTotal, pages],
  );

  const isAnimating =
    turnLocked || flipState === 'flipping' || flipState === 'user_fold';
  const boundedCurrentPage = Math.max(0, Math.min(currentPage, pageTotal - 1));
  const canGoPrevious = boundedCurrentPage > 0 && !isAnimating;
  const canGoNext = boundedCurrentPage < pageTotal - 1 && !isAnimating;

  const pageStatus = useMemo(
    () => createPageStatus(boundedCurrentPage, orientation, pageTotal),
    [boundedCurrentPage, orientation, pageTotal],
  );

  const releaseTurnLock = useCallback(() => {
    turnLockRef.current = false;
    setTurnLocked(false);

    if (turnLockTimeoutRef.current !== null) {
      window.clearTimeout(turnLockTimeoutRef.current);
      turnLockTimeoutRef.current = null;
    }
  }, []);

  const beginTurnLock = useCallback(() => {
    if (turnLockRef.current || flipStateRef.current !== 'read') return false;

    turnLockRef.current = true;
    setTurnLocked(true);

    if (turnLockTimeoutRef.current !== null) {
      window.clearTimeout(turnLockTimeoutRef.current);
    }

    turnLockTimeoutRef.current = window.setTimeout(
      releaseTurnLock,
      FLIP_DURATION + 220,
    );

    return true;
  }, [releaseTurnLock]);

  const goToPage = useCallback(
    (pageIndex: number) => {
      const boundedIndex = Math.max(0, Math.min(pageIndex, pageTotal - 1));
      const pageFlip = pageFlipRef.current;

      if (!pageFlip || isAnimating) return;
      pageFlip.turnToPage(boundedIndex);
      setCurrentPage(pageFlip.getCurrentPageIndex());
    },
    [isAnimating, pageTotal],
  );

  const goNext = useCallback(() => {
    const pageFlip = pageFlipRef.current;

    if (!pageFlip || !canGoNext || !beginTurnLock()) return;
    pageFlip.flipNext('bottom');
  }, [beginTurnLock, canGoNext]);

  const goPrevious = useCallback(() => {
    const pageFlip = pageFlipRef.current;

    if (!pageFlip || !canGoPrevious || !beginTurnLock()) return;
    pageFlip.flipPrev('bottom');
  }, [beginTurnLock, canGoPrevious]);

  const returnToCover = useCallback(() => {
    goToPage(0);
  }, [goToPage]);

  const goToFinalPage = useCallback(() => {
    goToPage(pageTotal - 1);
  }, [goToPage, pageTotal]);

  const requestDirectionalFlip = useCallback(
    (direction: 'next' | 'previous') => {
      const pageFlip = pageFlipRef.current;
      const pageIndex =
        pageFlip?.getCurrentPageIndex() ?? currentPageRef.current;

      if (direction === 'next' && pageIndex < pageTotal - 1) {
        if (!pageFlip || !beginTurnLock()) return;
        pageFlip.flipNext('bottom');
      }

      if (direction === 'previous' && pageIndex > 0) {
        if (!pageFlip || !beginTurnLock()) return;
        pageFlip.flipPrev('bottom');
      }
    },
    [beginTurnLock, pageTotal],
  );

  const handleTouchStartCapture = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (event.touches.length !== 1) return;

      const touch = event.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        pageIndex:
          pageFlipRef.current?.getCurrentPageIndex() ?? currentPageRef.current,
        time: Date.now(),
      };
    },
    [],
  );

  const handleTouchEndCapture = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      const start = touchStartRef.current;
      const touch = event.changedTouches[0];

      touchStartRef.current = null;
      if (!start || !touch) return;

      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;
      const isHorizontalSwipe =
        Math.abs(deltaX) >= 44 &&
        Math.abs(deltaX) > Math.abs(deltaY) * 1.25 &&
        Date.now() - start.time < 700;

      if (!isHorizontalSwipe) return;

      window.setTimeout(() => {
        const currentIndex =
          pageFlipRef.current?.getCurrentPageIndex() ?? currentPageRef.current;

        if (
          currentIndex !== start.pageIndex ||
          flipStateRef.current !== 'read'
        ) {
          return;
        }

        requestDirectionalFlip(deltaX < 0 ? 'next' : 'previous');
      }, 90);
    },
    [requestDirectionalFlip],
  );

  const handleMouseDownCapture = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;

      const target = event.target as HTMLElement | null;
      if (target?.closest('button, a, input, textarea, select')) return;

      mouseStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        pageIndex:
          pageFlipRef.current?.getCurrentPageIndex() ?? currentPageRef.current,
        time: Date.now(),
      };
    },
    [],
  );

  const handleMouseUpCapture = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const start = mouseStartRef.current;
      mouseStartRef.current = null;

      if (!start) return;

      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;
      const isPageDrag =
        Math.abs(deltaX) >= 58 &&
        Math.abs(deltaX) > Math.abs(deltaY) * 1.15 &&
        Date.now() - start.time < 1100;

      if (!isPageDrag) return;

      window.setTimeout(() => {
        const currentIndex =
          pageFlipRef.current?.getCurrentPageIndex() ?? currentPageRef.current;

        if (
          currentIndex !== start.pageIndex ||
          flipStateRef.current !== 'read'
        ) {
          return;
        }

        requestDirectionalFlip(deltaX < 0 ? 'next' : 'previous');
      }, 90);
    },
    [requestDirectionalFlip],
  );

  useEffect(() => {
    let disposed = false;
    let pageFlip: PageFlipInstance | null = null;

    async function initializeBook() {
      try {
        const { PageFlip } = await import('page-flip');
        const root = bookRootRef.current;
        const pages = pageRefs.current.slice(0, pageTotal).filter(Boolean);

        if (!root || disposed || pages.length !== pageTotal) return;

        const prefersReducedMotion = window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ).matches;

        pageFlip = new PageFlip(root, {
          width: 730,
          height: 540,
          size: 'stretch',
          minWidth: 320,
          maxWidth: 730,
          minHeight: 237,
          maxHeight: 540,
          drawShadow: true,
          flippingTime: prefersReducedMotion ? 120 : FLIP_DURATION,
          usePortrait: true,
          startPage: 0,
          startZIndex: 4,
          autoSize: true,
          maxShadowOpacity: prefersReducedMotion ? 0.14 : 0.24,
          showCover: true,
          mobileScrollSupport: true,
          swipeDistance: 32,
          clickEventForward: true,
          useMouseEvents: true,
          showPageCorners: false,
          disableFlipByClick: false,
        });

        pageFlipRef.current = pageFlip;

        pageFlip
          .on('init', (event) => {
            setIsReady(true);
            setCurrentPage(event.data.page);
            setOrientation(event.data.mode);
          })
          .on('flip', (event) => {
            setCurrentPage(event.data);
          })
          .on('changeState', (event) => {
            setFlipState(event.data);
            flipStateRef.current = event.data;

            if (event.data === 'read') {
              window.setTimeout(releaseTurnLock, 40);
            }
          })
          .on('changeOrientation', (event) => {
            setOrientation(event.data);
          });

        pageFlip.loadFromHTML(pages);
      } catch (error) {
        setInitializationError(
          error instanceof Error
            ? error.message
            : 'The page flip system did not load.',
        );
      }
    }

    void initializeBook();

    return () => {
      disposed = true;
      pageFlipRef.current = null;

      if (turnLockTimeoutRef.current !== null) {
        window.clearTimeout(turnLockTimeoutRef.current);
      }

      try {
        pageFlip?.destroy();
      } catch {
        // The library may already have removed its generated wrapper during hot reload.
      }
    };
  }, [pageTotal, pages, releaseTurnLock]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTextEntry =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;

      if (isTextEntry) return;

      if (contentsOpen) {
        if (event.key === 'Escape') {
          event.preventDefault();
          setContentsOpen(false);
        }

        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrevious();
      }

      if (event.key === 'Home') {
        event.preventDefault();
        returnToCover();
      }

      if (event.key === 'End') {
        event.preventDefault();
        goToFinalPage();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contentsOpen, goNext, goPrevious, goToFinalPage, returnToCover]);

  useEffect(() => {
    if (wasContentsOpenRef.current && !contentsOpen) {
      contentsButtonRef.current?.focus();
    }

    wasContentsOpenRef.current = contentsOpen;
  }, [contentsOpen]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    flipStateRef.current = flipState;
  }, [flipState]);

  useEffect(() => {
    const pageFlip = pageFlipRef.current;
    if (!pageFlip) return;

    const resizeObserver = new ResizeObserver(() => pageFlip.update());
    const root = bookRootRef.current;

    if (root) resizeObserver.observe(root);
    return () => resizeObserver.disconnect();
  }, [isReady]);

  return (
    <div
      className="portfolio-stage"
      data-book-state={
        boundedCurrentPage === 0
          ? 'front-cover'
          : boundedCurrentPage >= pageTotal - 1
            ? 'back-cover'
            : 'open'
      }
    >
      <header
        className="stage-header"
        aria-label={`${project.settings.title} portfolio book`}
      >
        <div>
          <p>Studio Voigt.</p>
          <span>
            {orientation === 'portrait'
              ? 'Single-page portfolio framework'
              : 'Facing-pages portfolio framework'}
          </span>
        </div>
        <Button
          ref={contentsButtonRef}
          type="button"
          variant="outline"
          size="sm"
          className="contents-trigger"
          onClick={() => setContentsOpen(true)}
          aria-label="Open contents index"
        >
          <List aria-hidden="true" />
          <span>Contents</span>
        </Button>
      </header>

      <section
        className="book-workspace"
        aria-label="Interactive portfolio book"
      >
        <div
          className={cn(
            'book-shadow-stage',
            isReady && 'is-ready',
            initializationError && 'has-error',
          )}
        >
          {!isReady && !initializationError ? (
            <output className="book-loading" aria-live="polite">
              Initialising book
            </output>
          ) : null}

          {initializationError ? (
            <output className="book-fallback">
              <h2>Readable fallback</h2>
              <p>
                The animated page-turn layer could not initialise. The
                placeholder pages remain available below for structure review.
              </p>
              <small>{initializationError}</small>
            </output>
          ) : null}

          <div
            ref={bookRootRef}
            className="portfolio-book"
            aria-label={`${project.settings.title} selected work portfolio book`}
            onMouseDownCapture={handleMouseDownCapture}
            onMouseUpCapture={handleMouseUpCapture}
            onTouchStartCapture={handleTouchStartCapture}
            onTouchEndCapture={handleTouchEndCapture}
          >
            {pages.map((page, index) => (
              <div
                key={page.id}
                ref={(node) => {
                  if (node) pageRefs.current[index] = node;
                }}
                className="book-source-page"
                data-density={
                  page.role === 'cover' || page.role === 'back-cover'
                    ? 'hard'
                    : 'soft'
                }
                data-page-id={page.id}
              >
                <PortfolioBookPage
                  page={page}
                  pageIndex={index}
                  pageTotal={pageTotal}
                  assets={project.assets}
                  onAdvance={goNext}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <nav className="book-nav" aria-label="Book navigation">
        <IconControl
          label="Previous page"
          type="button"
          variant="outline"
          size="icon-lg"
          disabled={!canGoPrevious}
          onClick={goPrevious}
        >
          <ChevronLeft aria-hidden="true" />
        </IconControl>

        <output
          className="page-status"
          aria-live="polite"
          aria-label="Current page"
        >
          {pageStatus}
        </output>

        <IconControl
          label="Next page"
          type="button"
          variant="outline"
          size="icon-lg"
          disabled={!canGoNext}
          onClick={goNext}
        >
          <ChevronRight aria-hidden="true" />
        </IconControl>

        <IconControl
          label="Return to cover"
          type="button"
          variant="outline"
          size="icon-lg"
          disabled={boundedCurrentPage === 0 || isAnimating}
          onClick={returnToCover}
        >
          <RotateCcw aria-hidden="true" />
        </IconControl>
      </nav>

      <Sheet open={contentsOpen} onOpenChange={setContentsOpen}>
        <SheetContent
          side="right"
          className="contents-sheet"
          showCloseButton={false}
          aria-label="Contents index"
        >
          <SheetHeader className="contents-sheet-header">
            <div>
              <SheetTitle>Contents</SheetTitle>
              <SheetDescription>
                Jump to a section in the placeholder portfolio book.
              </SheetDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="sheet-close-button"
              onClick={() => setContentsOpen(false)}
              aria-label="Close contents index"
            >
              <X aria-hidden="true" />
            </Button>
          </SheetHeader>

          <div className="contents-sheet-list">
            {contentsItems.map((item) => (
              <button
                type="button"
                key={item.label}
                onClick={() => {
                  goToPage(item.pageIndex);
                  setContentsOpen(false);
                }}
                className={cn(
                  'contents-sheet-item',
                  boundedCurrentPage === item.pageIndex && 'is-current',
                )}
              >
                <span>{item.label}</span>
                <small>{item.note}</small>
                <b>{String(item.pageIndex + 1).padStart(2, '0')}</b>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
