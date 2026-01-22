import path from "node:path";
import dotenv from "dotenv";
import { getCollectionREST, deleteDocumentREST } from "../src/lib/documentStore";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
    const posts = await getCollectionREST("blog_posts");
    console.log("blog_posts found:", posts.length);

    let deleted = 0;
    let failed = 0;

    for (const p of posts as any[]) {
        const id = typeof p?.id === "string" ? p.id : String(p?.id ?? "");
        if (!id) continue;
        try {
            await deleteDocumentREST("blog_posts", id);
            deleted++;
        } catch (err) {
            failed++;
            console.error("Failed to delete blog_posts/" + id, err);
        }
    }

    console.log("Deleted:", deleted);
    console.log("Failed:", failed);
}

main().catch((err) => {
    console.error("Purge failed:", err);
    process.exit(1);
});

