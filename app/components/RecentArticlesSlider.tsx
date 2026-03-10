"use client";

import { useEffect, useMemo, useState, type KeyboardEventHandler, type TouchEventHandler } from "react";
import { ArticleBlock, type ArticleBlockData } from "./ArticleBlock";

type RecentArticlesSliderProps = {
  articles: ArticleBlockData[];
};

const MOBILE_BREAKPOINT = 700;
const TABLET_BREAKPOINT = 1024;

function getVisibleCount(width: number): number {
  if (width < MOBILE_BREAKPOINT) {
    return 1;
  }

  if (width < TABLET_BREAKPOINT) {
    return 2;
  }

  return 4;
}

export function RecentArticlesSlider({
  articles,
}: RecentArticlesSliderProps) {
  const [visibleCount, setVisibleCount] = useState(4);
  const [index, setIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const maxIndex = useMemo(
    () => Math.max(0, articles.length - visibleCount),
    [articles.length, visibleCount],
  );
  const effectiveIndex = Math.min(index, maxIndex);

  const visibleStart = effectiveIndex + 1;
  const visibleEnd = Math.min(effectiveIndex + visibleCount, articles.length);

  const previous = () => setIndex((current) => Math.max(0, current - 1));
  const next = () => setIndex((current) => Math.min(maxIndex, current + 1));

  useEffect(() => {
    const syncVisibleCount = () => {
      setVisibleCount(getVisibleCount(window.innerWidth));
    };

    syncVisibleCount();
    window.addEventListener("resize", syncVisibleCount);

    return () => {
      window.removeEventListener("resize", syncVisibleCount);
    };
  }, []);

  const slideSize = 100 / visibleCount;

  const onTrackKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      previous();
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
    }
  };

  const onTouchStart: TouchEventHandler<HTMLDivElement> = (event) => {
    setTouchStart(event.touches[0]?.clientX ?? null);
  };

  const onTouchEnd: TouchEventHandler<HTMLDivElement> = (event) => {
    if (touchStart === null) {
      return;
    }

    const touchEnd = event.changedTouches[0]?.clientX ?? touchStart;
    const deltaX = touchStart - touchEnd;
    const threshold = 42;

    if (deltaX > threshold) {
      next();
    } else if (deltaX < -threshold) {
      previous();
    }

    setTouchStart(null);
  };

  return (
    <section className="recent-section" id="recent" aria-label="Recent articles">
      <div className="section-heading recent-header">
        <div>
          <p className="eyebrow">Recent articles</p>
          <h2>Latest 10 articles, blogs, and news updates.</h2>
        </div>

        <div className="slider-controls">
          <button
            type="button"
            onClick={previous}
            disabled={effectiveIndex === 0}
            aria-label="Show previous articles"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={next}
            disabled={effectiveIndex === maxIndex}
            aria-label="Show next articles"
          >
            Next
          </button>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        Showing articles {visibleStart} to {visibleEnd} of {articles.length}
      </p>

      <div
        className="slider-window"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="slider-track"
          role="region"
          aria-label="Recent articles slider"
          tabIndex={0}
          onKeyDown={onTrackKeyDown}
          style={{ transform: `translateX(-${effectiveIndex * slideSize}%)` }}
        >
          {articles.map((article) => (
            <div
              className="slider-slide"
              key={`${article.slug ?? article.title}`}
              style={{ flexBasis: `${slideSize}%`, minWidth: `${slideSize}%` }}
              aria-hidden={false}
            >
              <ArticleBlock
                article={article}
                className="article-block-compact"
                headingLevel={3}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
