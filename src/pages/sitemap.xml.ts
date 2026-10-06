import type { APIRoute } from "astro";
import data from "../data/resume.json";

export const GET: APIRoute = ({ site }) =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${new URL("/", site)}</loc>
    <lastmod>${data.updated}</lastmod>
  </url>
</urlset>
`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
