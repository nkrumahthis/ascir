import type { Metadata } from "next";
import Link from "next/link";

type NewsArticlePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function generateMetadata({ params }: NewsArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const title = humanizeSlug(slug);

  return {
    title: `${title} | ASCIR`,
    description: `ASCIR publication: ${title}.`,
  };
}

export default async function NewsArticlePage({ params }: NewsArticlePageProps) {
  const { slug } = await params;
  const title = humanizeSlug(slug);

  return (
    <main
      style={{
        width: "min(900px, calc(100% - 2rem))",
        margin: "0 auto",
        padding: "3.5rem 0 4rem",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#0f4e3e",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontSize: "0.82rem",
        }}
      >
        ASCIR Publication
      </p>
      <h1
        style={{
          margin: "0.65rem 0 1.15rem",
          fontFamily: "Fraunces, Georgia, serif",
          lineHeight: 1.06,
        }}
      >
        {title}
      </h1>
      <p style={{ margin: 0, color: "#3f474b", lineHeight: 1.7 }}>
        This article route is ready for CMS-backed content. During migration,
        publication cards may still link to in-page sections where full article
        pages are not yet published.
      </p>
      <p style={{ marginTop: "1.25rem" }}>
        <Link href="/" style={{ color: "#0f4e3e", fontWeight: 700 }}>
          Return to homepage
        </Link>
      </p>
    </main>
  );
}
