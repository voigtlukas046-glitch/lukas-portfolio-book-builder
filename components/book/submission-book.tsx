import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  List,
  RotateCcw,
} from 'lucide-react';
import type { PageFlip } from 'page-flip';
import './submission-book.css';

type Book = {
  title: string;
  width: number;
  height: number;
  pdf: string;
  pages: { src: string; label: string }[];
};

export function SubmissionBook() {
  const stage = useRef<HTMLDivElement>(null);
  const engine = useRef<PageFlip | null>(null);
  const currentRef = useRef(0);
  const [viewport, setViewport] = useState(0);
  const [book, setBook] = useState<Book | null>(null);
  const [current, setCurrent] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [indexOpen, setIndexOpen] = useState(false);
  const [turning, setTurning] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Lukas Voigt | Selected Work 2026';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    const resize = () =>
      setViewport(window.innerWidth * 10000 + window.innerHeight);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/portfolio-2026/book.json', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('The booklet could not be loaded.');
        return response.json() as Promise<Book>;
      })
      .then(setBook)
      .catch((reason: Error) => {
        if (reason.name !== 'AbortError') setError(reason.message);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!book || !stage.current) return;
    const host = stage.current;
    let disposed = false;
    let flip: PageFlip | undefined;
    // The page-turn library owns this DOM subtree and removes it on destroy.
    const root = document.createElement('div');
    root.className = 'submission-flip';
    host.append(root);
    void import('page-flip')
      .then(({ PageFlip: Flip }) => {
        if (disposed) return;
        const nodes = book.pages.map((page, index) => {
          const node = document.createElement('div');
          node.className = 'submission-page';
          node.setAttribute('aria-label', `Page ${index + 1}: ${page.label}`);
          const image = document.createElement('img');
          image.src = page.src;
          image.alt = page.label;
          image.draggable = false;
          image.width = 2200;
          image.height = Math.round((2200 * book.height) / book.width);
          node.append(image);
          root.append(node);
          return node;
        });
        const narrow = window.innerWidth < 900;
        const width = Math.floor(
          Math.min(
            narrow ? host.clientWidth : host.clientWidth / 2,
            (host.clientHeight * book.width) / book.height,
          ),
        );
        flip = new Flip(root, {
          width,
          height: Math.round((width * book.height) / book.width),
          size: 'fixed',
          startPage: currentRef.current,
          showCover: true,
          showPageCorners: false,
          usePortrait: true,
          autoSize: true,
          flippingTime: window.matchMedia('(prefers-reduced-motion: reduce)')
            .matches
            ? 1
            : 550,
          maxShadowOpacity: 0.22,
          mobileScrollSupport: false,
        });
        flip.on('init', ({ data }) => {
          host.dataset.orientation = data.mode;
          setReady(true);
        });
        flip.on('changeOrientation', ({ data }) => {
          host.dataset.orientation = data;
        });
        flip.on('flip', ({ data }) => {
          currentRef.current = data;
          setCurrent(data);
        });
        flip.on('changeState', ({ data }) => setTurning(data !== 'read'));
        flip.loadFromHTML(nodes);
        engine.current = flip;
      })
      .catch(() =>
        setError('The page turner could not be loaded. Please reload.'),
      );
    return () => {
      disposed = true;
      engine.current = null;
      flip?.destroy();
      root.remove();
    };
  }, [book, viewport]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLSelectElement || turning) return;
      if (event.key === 'ArrowRight') engine.current?.flipNext();
      if (event.key === 'ArrowLeft') engine.current?.flipPrev();
      if (event.key === 'Home') engine.current?.turnToPage(0);
      if (event.key === 'Escape') setIndexOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turning]);

  return (
    <main className="submission-reader">
      <header className="submission-header">
        <span>
          STUDIO VOIGT.{' '}
          <span className="submission-subtitle">SELECTED WORK / 2026</span>
        </span>
        <div>
          <button
            type="button"
            aria-label="Page index"
            title="Page index"
            aria-expanded={indexOpen}
            onClick={() => setIndexOpen(!indexOpen)}
          >
            <List size={20} />
          </button>
          <a
            href={book?.pdf ?? '/portfolio-2026/lukas-voigt-portfolio-2026.pdf'}
            download
            title="Download original PDF"
          >
            <Download size={18} />
            <span>PDF</span>
          </a>
        </div>
      </header>
      <div
        className="submission-stage"
        data-cover={
          current === 0
            ? 'front'
            : current === (book?.pages.length ?? 24) - 1
              ? 'back'
              : 'open'
        }
        ref={stage}
        aria-label="Lukas Voigt portfolio booklet"
      />
      {!ready && (
        <p className="submission-loading" role="status">
          {error || 'Loading portfolio...'}
        </p>
      )}
      <nav className="submission-navigation" aria-label="Book navigation">
        <button
          type="button"
          title="Return to cover"
          aria-label="Return to cover"
          disabled={!ready || current === 0 || turning}
          onClick={() => engine.current?.turnToPage(0)}
        >
          <RotateCcw size={18} />
        </button>
        <button
          type="button"
          title="Previous page"
          aria-label="Previous page"
          disabled={!ready || current === 0 || turning}
          onClick={() => engine.current?.flipPrev()}
        >
          <ChevronLeft size={22} />
        </button>
        <output aria-label="Current page">
          {String(current + 1).padStart(2, '0')} / {book?.pages.length ?? 24}
        </output>
        <button
          type="button"
          title="Next page"
          aria-label="Next page"
          disabled={
            !ready || current >= (book?.pages.length ?? 24) - 1 || turning
          }
          onClick={() => engine.current?.flipNext()}
        >
          <ChevronRight size={22} />
        </button>
      </nav>
      {indexOpen && (
        <aside className="submission-index" aria-label="Page index">
          {book?.pages.map((page, index) => (
            <button
              type="button"
              key={page.src}
              onClick={() => {
                engine.current?.turnToPage(index);
                setIndexOpen(false);
              }}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              {page.label}
            </button>
          ))}
        </aside>
      )}
    </main>
  );
}
