import Image from "next/image";
import { ArticleBlock, type ArticleBlockData } from "./components/ArticleBlock";
import { RecentArticlesSlider } from "./components/RecentArticlesSlider";

const services = [
  {
    title: "Research",
    body: "ASCIR produces in-depth research on economic, political, cultural, and cross-cutting dimensions of China-Africa relations. Our publications are designed to support evidence-led public and policy understanding.",
  },
  {
    title: "Advocacy",
    body: "Through events, digital platforms, and public engagement, ASCIR promotes informed and nuanced conversation on Africa-China relations across policy, academic, and public audiences.",
  },
  {
    title: "Consultancy",
    body: "ASCIR offers research-led advisory support to governments, NGOs, businesses, and international organisations working on strategy, policy, and impact related to Africa-China engagements.",
  },
  {
    title: "Peer Review Platform",
    body: "Our peer review platform supports rigorous evaluation, scholarly exchange, and collaboration for research and proposals focused on Africa-China relations.",
  },
];

const newsItems = [
  "Latest articles, policy briefs, and white papers on China-Africa relations.",
  "Events, webinars, and public-facing conversations from ASCIR.",
  "Research updates and institutional news from Accra and across our network.",
];

const featuredArticle: ArticleBlockData = {
  category: "Latest publication",
  title: "China-Africa relations in focus",
  summary:
    "A featured slot for ASCIR's newest publication, policy brief, or research output.",
  slug: "china-africa-relations-in-focus",
  publishedAt: "2026-02-24",
  ctaLabel: "Read publication",
};

const recentArticles: ArticleBlockData[] = [
  {
    category: "Article",
    title: "China's industrial policy signals and Africa's response",
    summary:
      "How current Chinese policy language should inform African industrial planning priorities.",
    slug: "industrial-policy-signals-africa-response",
    publishedAt: "2026-03-04",
    image: {
      src: "/ascir/just-energy.png",
      alt: "Wind turbines in motion against a pale sky",
    },
  },
  {
    category: "Blog",
    title: "Training, mobility, and lived realities of engagement",
    summary:
      "A short analysis of education exchange, skills mobility, and institutional influence.",
    slug: "training-mobility-lived-realities",
    publishedAt: "2026-03-01",
    image: {
      src: "/ascir/homecoming.jpg",
      alt: "Group of professionals in discussion during a workshop",
    },
  },
  {
    category: "News",
    title: "ASCIR convenes an Accra discussion on public narratives",
    summary:
      "Highlights from a public conversation on media framing and strategic communication.",
    slug: "accra-discussion-public-narratives",
    publishedAt: "2026-02-26",
    image: {
      src: "/ascir/opinion.png",
      alt: "Public engagement icon with a speech bubble and megaphone",
    },
  },
  {
    category: "Policy Brief",
    title: "Debt, leverage, and the politics of negotiation",
    summary:
      "A concise brief on state bargaining power in current infrastructure negotiations.",
    slug: "debt-leverage-politics-of-negotiation",
    publishedAt: "2026-02-21",
    image: {
      src: "/ascir/cossa.png",
      alt: "Containers stacked at a commercial shipping port",
    },
  },
  {
    category: "Article",
    title: "Critical minerals and the next phase of competition",
    summary:
      "Resource politics, industrial transition, and why mineral strategy now matters.",
    slug: "critical-minerals-next-phase",
    publishedAt: "2026-02-17",
  },
  {
    category: "Blog",
    title: "Ports, corridors, and regional power",
    summary:
      "Why infrastructure visibility and logistics geography continue to shape diplomacy.",
    slug: "ports-corridors-regional-power",
    publishedAt: "2026-02-12",
  },
  {
    category: "News",
    title: "ASCIR expands collaboration across universities",
    summary:
      "An institutional update on joint research links spanning Africa, Europe, and Asia.",
    slug: "expands-collaboration-across-universities",
    publishedAt: "2026-02-09",
  },
  {
    category: "White Paper",
    title: "South-South cooperation beyond rhetoric",
    summary:
      "What practical institutional cooperation can look like in policy and research practice.",
    slug: "south-south-cooperation-beyond-rhetoric",
    publishedAt: "2026-02-02",
  },
  {
    category: "Research Note",
    title: "Health, migration, and security as cross-cutting issues",
    summary:
      "A synthesis on themes connecting multiple dimensions of Africa-China engagement.",
    slug: "health-migration-security-cross-cutting",
    publishedAt: "2026-01-30",
  },
  {
    category: "Article",
    title: "Why public understanding still lags behind policy reality",
    summary:
      "A note on public misconceptions and the need for grounded interpretation.",
    href: "#news",
    publishedAt: "2026-01-24",
    ctaLabel: "Read summary",
  },
];

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Afro-Sino Centre of International Relations",
  alternateName: "ASCIR",
  url: "https://ascir.org",
  email: "info@ascir.org",
  telephone: "+233541253777",
  address: {
    "@type": "PostalAddress",
    streetAddress: "P O Box CT 6400 Cantonments",
    addressLocality: "Accra",
    addressCountry: "GH",
  },
};

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <main className="ascir-home" id="main-content">
        <header className="site-nav" id="top">
          <a className="site-logo" href="#top" aria-label="ASCIR home">
            <Image src="/ascir/logo.png" alt="ASCIR logo" width={220} height={115} priority />
          </a>

          <nav aria-label="Primary navigation">
            <ul>
              <li>
                <a href="#recent">Articles</a>
              </li>
              <li>
                <a href="#news">News</a>
              </li>
              <li>
                <a href="#team">Team</a>
              </li>
              <li>
                <a
                  className="nav-cta"
                  href="mailto:info@ascir.org?subject=Article%20Submission%20to%20ASCIR"
                >
                  Submit article
                </a>
              </li>
            </ul>
          </nav>
        </header>

        <section className="hero" aria-labelledby="hero-heading">
          <div className="hero-copy">
            <p className="eyebrow">Afro-Sino Centre of International Relations</p>
            <h1 id="hero-heading">
              Independent China-Africa policy research and analysis from Accra, Ghana.
            </h1>
            <p>
              ASCIR is an African think tank and research hub advancing serious scholarship,
              public engagement, and cross-regional partnerships around Africa-China relations
              and wider South-South cooperation.
            </p>

            <div className="hero-actions" aria-label="Hero actions">
              <a className="button button-primary" href="#recent">
                Latest publications
              </a>
              <a className="button button-secondary" href="#contact">
                Contact ASCIR
              </a>
            </div>
          </div>

          <ArticleBlock article={featuredArticle} className="hero-publication" />
        </section>

        <RecentArticlesSlider articles={recentArticles} />

        <section className="news-section" id="news" aria-labelledby="news-heading">
          <div className="section-heading">
            <p className="eyebrow">News</p>
            <h2 id="news-heading">Research, events, and institutional updates.</h2>
            <p className="section-intro">
              Follow ASCIR&apos;s latest analysis, convenings, and organisational updates across
              Africa-China scholarship.
            </p>
          </div>

          <div className="news-grid">
            {newsItems.map((item) => (
              <article className="news-card" key={item}>
                <span className="news-marker" aria-hidden="true" />
                <p>{item}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="text-section" id="mandate" aria-labelledby="mandate-heading">
          <p className="eyebrow">The Mandate</p>
          <h2 id="mandate-heading">Evidence-led research for policy and public understanding.</h2>
          <p>
            ASCIR serves as a research hub grounded in African perspectives, producing analysis
            that improves understanding of Africa-China engagement while building durable
            partnerships across institutions, scholars, and practitioners.
          </p>
        </section>

        <section className="services-section" id="services" aria-labelledby="services-heading">
          <div className="section-heading">
            <p className="eyebrow">What we do</p>
            <h2 id="services-heading">How ASCIR delivers institutional value.</h2>
            <p className="section-intro">
              Our work spans research production, public conversation, and strategic advisory
              support for decision-makers.
            </p>
          </div>

          <div className="services-grid">
            {services.map((service) => (
              <article className="service-card" key={service.title}>
                <h3>{service.title}</h3>
                <p>{service.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="team-row" id="team" aria-labelledby="team-heading">
          <div>
            <p className="eyebrow">Team</p>
            <h2 id="team-heading">Meet the scholars and practitioners behind ASCIR.</h2>
          </div>
          <a href="#contact">View team and network</a>
        </section>

        <footer className="site-footer" id="contact">
          <div className="footer-col footer-brand">
            <a className="footer-logo" href="#top" aria-label="ASCIR home">
              <Image src="/ascir/logo.png" alt="ASCIR logo" width={176} height={92} />
            </a>
            <div className="footer-legal" aria-label="Legal links">
              <a href="#top">Terms and Conditions</a>
              <a href="#top">Privacy Policy</a>
              <a href="#top">Editorial Policy</a>
            </div>
          </div>

          <div className="footer-col footer-contact">
            <p className="eyebrow">Contact</p>
            <a href="mailto:info@ascir.org">info@ascir.org</a>
            <a href="tel:+233541253777">+233 54 125 3777</a>
            <a href="tel:+233596662327">+233 59 666 2327</a>
            <p>P O Box CT 6400 Cantonments, Accra Ghana</p>
            <div className="footer-socials" aria-label="Social links">
              <a href="#" aria-label="ASCIR on X">
                X
              </a>
              <a href="#" aria-label="ASCIR on LinkedIn">
                LinkedIn
              </a>
              <a href="#" aria-label="ASCIR on YouTube">
                YouTube
              </a>
            </div>
          </div>

          <div className="footer-col footer-map">
            <p className="eyebrow">Map</p>
            <iframe
              title="ASCIR location map"
              src="https://www.openstreetmap.org/export/embed.html?bbox=-0.2263%2C5.5430%2C-0.1463%2C5.6030&amp;layer=mapnik"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </footer>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
    </>
  );
}
