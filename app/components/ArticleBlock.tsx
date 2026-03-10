import Image from "next/image";

export type ArticleBlockData = {
  title: string;
  summary: string;
  category?: string;
  label?: string;
  slug?: string;
  href?: string;
  publishedAt?: string;
  image?: {
    src: string;
    alt: string;
  };
  ctaLabel?: string;
  date?: string;
  cta?: string;
};

type NormalizedArticle = {
  label: string;
  href: string;
  publishedAt?: string;
  ctaLabel: string;
  image?: {
    src: string;
    alt: string;
  };
  title: string;
  summary: string;
};

function resolveHref(article: ArticleBlockData): string {
  if (article.href) {
    return article.href;
  }

  if (article.slug) {
    return `/news/${article.slug}`;
  }

  return "#news";
}

function normalizeArticle(article: ArticleBlockData): NormalizedArticle {
  return {
    label: article.category ?? article.label ?? "Article",
    href: resolveHref(article),
    publishedAt: article.publishedAt ?? article.date,
    ctaLabel: article.ctaLabel ?? article.cta ?? "Read the latest article",
    image: article.image,
    title: article.title,
    summary: article.summary,
  };
}

type HeadingLevel = 2 | 3;

type ArticleBlockProps = {
  article: ArticleBlockData;
  className?: string;
  headingLevel?: HeadingLevel;
};

function formatPublishedDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

export function ArticleBlock({
  article,
  className = "",
  headingLevel = 2,
}: ArticleBlockProps) {
  const normalized = normalizeArticle(article);

  return (
    <article className={`article-block ${className}`.trim()} aria-label={normalized.label}>
      {normalized.image ? (
        <div className="article-block-media">
          <Image
            src={normalized.image.src}
            alt={normalized.image.alt}
            fill
            sizes="(max-width: 800px) 100vw, 25vw"
          />
        </div>
      ) : (
        <div className="article-block-art" aria-hidden="true" />
      )}
      <div className="article-block-copy">
        <p className="eyebrow">
          {normalized.label}
          {normalized.publishedAt ? (
            <time className="article-date" dateTime={normalized.publishedAt}>
              {" "}
              {formatPublishedDate(normalized.publishedAt)}
            </time>
          ) : null}
        </p>
        {headingLevel === 2 ? (
          <h2>{normalized.title}</h2>
        ) : (
          <h3>{normalized.title}</h3>
        )}
        <p>{normalized.summary}</p>
        <a href={normalized.href}>{normalized.ctaLabel}</a>
      </div>
    </article>
  );
}
