import { describe, expect, it } from "vitest";
import type { Dump } from "@/etl/push";
import type { DumpItem, RecordDefinition } from "@/etl/registry";
import {
  missingAlt,
  oldSiteLinks,
  unresolvedRefs,
  type CheckContext,
} from "@/etl/report-checks";

function dump(type: RecordDefinition["type"], items: DumpItem[]): Dump {
  return {
    definition: { type, endpoint: `/api/ingest/${type}`, transform: () => [] },
    items,
  };
}

// Shaped like the plan's example post.
const post: DumpItem = {
  ref: "wp:post:3741",
  legacyUrl: "https://ascir.org/2025/04/30/lessons-for-africa/",
  authorRefs: ["wp:page:2379", "wp:page:9999"],
  featuredImageRef: "wp:media:3743",
  body: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "See our earlier piece",
            marks: [
              { type: "link", attrs: { href: "https://www.ascir.org/old/" } },
            ],
          },
        ],
      },
      { type: "image", attrs: { mediaRef: "wp:media:1" } },
    ],
  },
};

const context = (pushed: Dump[], known: string[] = []): CheckContext => ({
  pushed,
  knownRefs: new Set(known),
});

describe("unresolvedRefs", () => {
  it("lists every *Ref and *Refs value no dump defines", () => {
    const found = unresolvedRefs.run(
      context([dump("posts", [post])], ["wp:page:2379", "wp:media:3743"]),
    );
    expect(found).toEqual([
      { ref: "wp:post:3741", detail: "authorRefs → wp:page:9999" },
      {
        ref: "wp:post:3741",
        detail: "body.content[1].attrs.mediaRef → wp:media:1",
      },
    ]);
  });

  it("finds nothing when every ref resolves", () => {
    const known = [
      "wp:page:2379",
      "wp:page:9999",
      "wp:media:3743",
      "wp:media:1",
    ];
    expect(unresolvedRefs.run(context([dump("posts", [post])], known))).toEqual(
      [],
    );
  });
});

describe("oldSiteLinks", () => {
  it("lists ascir.org links in the content, but not the legacy URL", () => {
    expect(oldSiteLinks.run(context([dump("posts", [post])]))).toEqual([
      {
        ref: "wp:post:3741",
        detail:
          "body.content[0].content[0].marks[0].attrs.href: https://www.ascir.org/old/",
      },
    ]);
  });

  it("ignores other sites", () => {
    const item = {
      ref: "wp:post:1",
      excerpt: "From https://ascir.org.uk/x and https://notascir.org/y",
    };
    expect(oldSiteLinks.run(context([dump("posts", [item])]))).toEqual([]);
  });
});

describe("missingAlt", () => {
  it("lists images with no or blank alt text, not other files", () => {
    const media = dump("media", [
      { ref: "wp:media:1", type: "image/jpeg", alt: "Delegates in Accra" },
      { ref: "wp:media:2", type: "image/png", alt: "  " },
      { ref: "wp:media:3", type: "image/png" },
      { ref: "wp:media:4", type: "application/pdf" },
    ]);
    expect(missingAlt.run(context([media]))).toEqual([
      { ref: "wp:media:2", detail: "no alt text" },
      { ref: "wp:media:3", detail: "no alt text" },
    ]);
  });

  it("only looks at media", () => {
    const people = dump("people", [{ ref: "wp:page:2379", type: "image" }]);
    expect(missingAlt.run(context([people]))).toEqual([]);
  });
});
