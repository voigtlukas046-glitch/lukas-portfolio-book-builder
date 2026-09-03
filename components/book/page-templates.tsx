import {
  contentsItems,
  pageTotal,
  type BookPage,
} from '@/lib/portfolio-book-data';
import { cn } from '@/lib/utils';

type PageTemplateProps = {
  page: BookPage;
  onNavigate: (pageIndex: number) => void;
  onAdvance?: () => void;
};

function PageFrame({
  page,
  children,
  className,
}: {
  page: BookPage;
  children: React.ReactNode;
  className?: string;
}) {
  const isCover = page.type === 'cover' || page.type === 'back-cover';

  return (
    <article
      aria-label={`${page.title}, page ${page.pageNumber} of ${pageTotal}`}
      className={cn('book-page', isCover && 'book-page-cover', className)}
    >
      <div className="page-face">
        <div className="page-content">{children}</div>
        <footer className="book-page-footer" aria-hidden="true">
          <span>{page.eyebrow ?? page.subtitle ?? page.title}</span>
          <span>
            {String(page.pageNumber).padStart(2, '0')} / {pageTotal}
          </span>
        </footer>
      </div>
    </article>
  );
}

function PlaceholderImage({
  label = 'PLACEHOLDER IMAGE',
  caption,
  variant = 'landscape',
  className,
}: {
  label?: string;
  caption?: string;
  variant?: 'hero' | 'landscape' | 'portrait' | 'square' | 'thumbnail';
  className?: string;
}) {
  return (
    <figure
      className={cn('placeholder-image', className)}
      data-variant={variant}
    >
      <div className="placeholder-cross" aria-hidden="true" />
      <figcaption>
        <strong>{label}</strong>
        {caption ? <span>{caption}</span> : null}
      </figcaption>
    </figure>
  );
}

function DetailList({ items }: { items?: string[] }) {
  if (!items?.length) return null;

  return (
    <ul className="detail-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function BookPageView({
  page,
  onNavigate,
  onAdvance,
}: PageTemplateProps) {
  switch (page.type) {
    case 'cover':
      return (
        <PageFrame page={page} className="cover-template">
          <div className="studio-mark" aria-label="Studio Voigt logo">
            Studio Voigt.
          </div>
          <div className="cover-stack">
            <p>{page.year}</p>
            <h1>{page.title}</h1>
            <h2>{page.subtitle}</h2>
          </div>
          <div className="cover-rule" aria-hidden="true" />
          <button
            type="button"
            className="cover-open-button"
            onClick={onAdvance}
            aria-label="Open the portfolio book"
          >
            {page.description}
          </button>
        </PageFrame>
      );

    case 'inside-cover':
      return (
        <PageFrame page={page} className="inside-cover-template">
          <p className="page-eyebrow">{page.eyebrow}</p>
          <div className="quiet-statement">
            <h2>{page.title}</h2>
            <p>{page.description}</p>
          </div>
          <div className="production-note">
            <span>Prototype note</span>
            <p>
              Structure, navigation, animation, and responsive behavior only.
            </p>
          </div>
        </PageFrame>
      );

    case 'contents':
      return (
        <PageFrame page={page} className="contents-template">
          <header className="page-heading">
            <p className="page-eyebrow">INDEX</p>
            <h2>{page.title}</h2>
            <p>{page.description}</p>
          </header>
          <nav aria-label="Book contents" className="book-contents-list">
            {contentsItems.map((item) => (
              <button
                type="button"
                key={item.label}
                onClick={() => onNavigate(item.pageIndex)}
                aria-label={`Go to ${item.label}`}
              >
                <span>{item.label}</span>
                <small>{item.note}</small>
                <b>{String(item.pageIndex + 1).padStart(2, '0')}</b>
              </button>
            ))}
          </nav>
        </PageFrame>
      );

    case 'profile':
      return (
        <PageFrame page={page} className="profile-template">
          <header className="page-heading">
            <p className="page-eyebrow">{page.eyebrow}</p>
            <h2>{page.title}</h2>
          </header>
          <div className="profile-grid">
            <p className="large-copy">{page.description}</p>
            <DetailList items={page.details} />
          </div>
        </PageFrame>
      );

    case 'chapter':
      return (
        <PageFrame page={page} className="chapter-template">
          <p className="page-eyebrow">{page.eyebrow}</p>
          <div>
            <h2>
              <span>PROJECT</span>
              <span>TITLE</span>
            </h2>
            <p>{page.subtitle}</p>
          </div>
          <span>{page.year}</span>
        </PageFrame>
      );

    case 'image-text':
      return (
        <PageFrame page={page} className="image-text-template">
          <section className="project-copy">
            <p className="page-eyebrow">{page.eyebrow}</p>
            <h2>{page.title}</h2>
            <p>{page.description}</p>
            <DetailList items={page.details} />
          </section>
          <PlaceholderImage
            label={page.images?.[0]?.label}
            caption={page.images?.[0]?.caption}
            variant={page.images?.[0]?.variant}
            className="project-image-slot"
          />
        </PageFrame>
      );

    case 'process-grid':
      return (
        <PageFrame page={page} className="process-template">
          <header className="page-heading">
            <p className="page-eyebrow">{page.eyebrow}</p>
            <h2>{page.title}</h2>
            <p>{page.description}</p>
          </header>
          <div className="process-grid">
            {page.images?.map((image) => (
              <PlaceholderImage
                key={image.caption}
                label={image.label}
                caption={image.caption}
                variant={image.variant}
              />
            ))}
          </div>
        </PageFrame>
      );

    case 'outcome':
      return (
        <PageFrame page={page} className="outcome-template">
          <header className="page-heading">
            <p className="page-eyebrow">{page.eyebrow}</p>
            <h2>{page.title}</h2>
          </header>
          <PlaceholderImage
            label={page.images?.[0]?.label}
            caption={page.images?.[0]?.caption}
            variant={page.images?.[0]?.variant}
            className="wide-placeholder"
          />
          <div className="outcome-copy">
            <p>{page.description}</p>
            <DetailList items={page.details} />
          </div>
        </PageFrame>
      );

    case 'experiments':
      return (
        <PageFrame page={page} className="experiments-template">
          <header className="page-heading">
            <p className="page-eyebrow">{page.eyebrow}</p>
            <h2>{page.title}</h2>
            <p>{page.description}</p>
          </header>
          <div className="experiment-grid">
            {page.images?.map((image) => (
              <PlaceholderImage
                key={image.caption}
                label={image.label}
                caption={image.caption}
                variant={image.variant}
              />
            ))}
          </div>
        </PageFrame>
      );

    case 'about':
      return (
        <PageFrame page={page} className="about-template">
          <header className="page-heading">
            <p className="page-eyebrow">{page.eyebrow}</p>
            <h2>{page.title}</h2>
            <p>{page.description}</p>
          </header>
          <DetailList items={page.details} />
        </PageFrame>
      );

    case 'contact':
      return (
        <PageFrame page={page} className="contact-template">
          <p className="page-eyebrow">{page.eyebrow}</p>
          <div>
            <h2>{page.title}</h2>
            <p>{page.description}</p>
          </div>
          <DetailList items={page.details} />
        </PageFrame>
      );

    case 'back-cover':
      return (
        <PageFrame page={page} className="back-cover-template">
          <div className="studio-mark" aria-label="Studio Voigt logo">
            Studio Voigt.
          </div>
          <div className="cover-stack">
            <p>{page.year}</p>
            <h2>{page.title}</h2>
            <h3>{page.subtitle}</h3>
          </div>
          <p>{page.description}</p>
        </PageFrame>
      );

    default:
      return null;
  }
}
