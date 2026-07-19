import "./env";
import { db, documents, eq, like, sources } from "@continuum/db";
import { applyLinkPattern, partitionByExisting } from "./crawl-shared";
import { createBudget, fetchFirecrawlIndexSource, type ScrapeFn } from "./firecrawl";
import { parseFeed } from "./rss";

let failures = 0;

function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`ok    ${message}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${message}`);
  }
}

const RSS_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Test Feed</title>
  <item>
    <title><![CDATA[NPL portfolio sale announced — Đorđević advises]]></title>
    <link>/news/1234/npl-portfolio-sale</link>
    <pubDate>Fri, 17 Jul 2026 09:00:00 +0200</pubDate>
  </item>
  <item>
    <title>Second story with no date</title>
    <link>https://press.example.com/news/5678</link>
  </item>
  <item>
    <title>No link item is skipped</title>
  </item>
</channel></rss>`;

const ATOM_FIXTURE = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Test</title>
  <entry>
    <title><![CDATA[Fund close reaches €120m]]></title>
    <link rel="alternate" href="https://atom.example.com/articles/fund-close"/>
    <published>2026-07-01T10:00:00Z</published>
  </entry>
  <entry>
    <title>Relative atom entry</title>
    <link href="/articles/relative-entry"/>
  </entry>
</feed>`;

async function cleanup() {
  await db.delete(documents).where(like(documents.url, "https://cli-test.invalid/%"));
  const rows = await db
    .select({ id: sources.id })
    .from(sources)
    .where(like(sources.name, "CLI Test%"));
  for (const row of rows) {
    await db.delete(documents).where(eq(documents.sourceId, row.id));
    await db.delete(sources).where(eq(sources.id, row.id));
  }
  return rows.length;
}

async function main() {
  console.log("— parseFeed (RSS 2.0 + Atom fixtures) —");
  const rssItems = parseFeed(RSS_FIXTURE, "https://press.example.com/feed");
  check(
    rssItems.length === 2,
    `RSS: 2 items parsed, linkless item skipped (got ${rssItems.length})`,
  );
  check(
    rssItems[0]?.title === "NPL portfolio sale announced — Đorđević advises",
    "RSS: CDATA title extracted",
  );
  check(
    rssItems[0]?.url === "https://press.example.com/news/1234/npl-portfolio-sale",
    `RSS: relative link resolved against feed url (${rssItems[0]?.url})`,
  );
  check(rssItems[0]?.publishedAt !== undefined, "RSS: pubDate captured when present");
  check(rssItems[1]?.publishedAt === undefined, "RSS: missing date tolerated");

  const atomItems = parseFeed(ATOM_FIXTURE, "https://atom.example.com/feed.xml");
  check(atomItems.length === 2, `Atom: 2 entries parsed (got ${atomItems.length})`);
  check(atomItems[0]?.title === "Fund close reaches €120m", "Atom: CDATA title extracted");
  check(
    atomItems[0]?.url === "https://atom.example.com/articles/fund-close",
    "Atom: rel=alternate href used",
  );
  check(
    atomItems[1]?.url === "https://atom.example.com/articles/relative-entry",
    "Atom: relative href resolved",
  );
  check(atomItems[0]?.publishedAt === "2026-07-01T10:00:00Z", "Atom: published captured");

  console.log("\n— link filtering + url dedup —");
  await cleanup();
  const links = [
    "https://cli-test.invalid/news/1",
    "https://cli-test.invalid/news/2",
    "https://cli-test.invalid/about",
  ];
  const filtered = applyLinkPattern(links, "/news/\\d+");
  check(
    filtered.length === 2 && !filtered.includes("https://cli-test.invalid/about"),
    "linkIncludePattern filters non-article links",
  );
  check(applyLinkPattern(links, undefined).length === 3, "missing pattern keeps all links");

  await db.insert(documents).values({
    url: "https://cli-test.invalid/news/1",
    title: "cli-test existing",
    docType: "article",
    fetchedAt: new Date(),
  });
  const { fresh, existing } = await partitionByExisting(filtered);
  check(
    existing.length === 1 && existing[0] === "https://cli-test.invalid/news/1",
    "dedup marks stored url as existing",
  );
  check(
    fresh.length === 1 && fresh[0] === "https://cli-test.invalid/news/2",
    "dedup keeps unseen url as fresh",
  );

  console.log("\n— firecrawl budget guard —");
  const budget = createBudget(3);
  budget();
  budget();
  budget();
  let tripped = false;
  try {
    budget();
  } catch (err) {
    tripped = err instanceof Error && err.message.includes("budget exceeded");
  }
  check(tripped, "budget guard trips on call (max + 1)");

  const insertedSource = await db
    .insert(sources)
    .values({
      name: "CLI Test Firecrawl Index",
      url: "https://cli-test.invalid/index",
      sourceType: "press",
      fetchMethod: "firecrawl_index",
      schedule: "daily",
      active: false,
      config: { maxItemsPerRun: 2, linkIncludePattern: "/news/\\d+", articleFetch: "firecrawl" },
    })
    .returning();
  const testSource = insertedSource[0];
  if (!testSource) {
    throw new Error("failed to insert test source");
  }

  let scrapeCalls = 0;
  const mockScrape: ScrapeFn = async (url: string) => {
    scrapeCalls += 1;
    if (url.endsWith("/index")) {
      return {
        markdown: [
          "[a](https://cli-test.invalid/news/10)",
          "[b](https://cli-test.invalid/news/11)",
          "[c](https://cli-test.invalid/news/12)",
          "[d](https://cli-test.invalid/news/13)",
          "[skip](https://cli-test.invalid/about-us)",
        ].join("\n"),
        title: "Index",
      };
    }
    return { markdown: `# Article at ${url}\n\nBody text.`, title: `Article ${url.slice(-2)}` };
  };

  const stats = await fetchFirecrawlIndexSource(testSource, mockScrape);
  check(
    stats.itemsInFeed === 4,
    `index yields 4 pattern-matching links (got ${stats.itemsInFeed})`,
  );
  check(
    stats.newArticles === 2,
    `maxItemsPerRun caps new articles at 2 (got ${stats.newArticles})`,
  );
  check(scrapeCalls === 3, `scrape called exactly 1 + maxItemsPerRun times (got ${scrapeCalls})`);
  check(stats.errors.length === 0, "no item errors in mock run");

  const stored = await db
    .select({ url: documents.url, language: documents.language })
    .from(documents)
    .where(eq(documents.sourceId, testSource.id));
  check(stored.length === 2, `2 documents stored for the run (got ${stored.length})`);

  await cleanup();
  const leftovers = await db
    .select({ id: documents.id })
    .from(documents)
    .where(like(documents.url, "https://cli-test.invalid/%"));
  check(leftovers.length === 0, "cleanup removed all cli-test documents");

  if (failures > 0) {
    console.error(`\nverify-crawl: ${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nverify-crawl: PASS — crawler unit checks green");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
