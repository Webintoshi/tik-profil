import path from "node:path";
import dotenv from "dotenv";
import { getCollectionREST } from "../src/lib/documentStore";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const posts = await getCollectionREST("blog_posts");
  const normalized = posts
    .map((p: any) => ({
      id: p?.id,
      slug: p?.slug,
      title: p?.title,
      published: p?.published,
      date: p?.date,
    }))
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  console.log("blog_posts");
  console.log("---------");
  console.log("count:", normalized.length);
  console.log("");
  for (const p of normalized.slice(0, 30)) {
    console.log(`- ${p.slug || p.id} published=${p.published} date=${p.date} title=${p.title}`);
  }
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});

