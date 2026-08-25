import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders Jorge Castro's portfolio and new Oracle credential", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Jorge Castro \| Business Intelligence y Automatización<\/title>/i);
  assert.match(html, /Datos que explican\./);
  assert.match(html, /Oracle Dev Gym/);
  assert.match(html, /Databases for Developers: Foundations/);
  assert.match(html, /Calificación 98%/);
  assert.match(html, /\/certificates\/Oracle-Dev-Gym-Databases-Foundations\.pdf/);
  assert.match(html, /\/CV-Jorge-Castro\.pdf/);
});

test("keeps the bilingual credential, styling, static page, and downloadable files in sync", async () => {
  const [page, css, staticPage] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Calificación 98%/);
  assert.match(page, /Grade 98%/);
  assert.match(page, /Ver certificado/);
  assert.match(page, /View certificate/);
  assert.match(css, /\.cert-grid>div\.cert-featured/);
  assert.match(staticPage, /Oracle Dev Gym · Databases for Developers: Foundations/);
  assert.match(staticPage, /Calificación 98%/);
  assert.match(staticPage, /Grade 98%/);
  assert.match(staticPage, /certificates\/Oracle-Dev-Gym-Databases-Foundations\.pdf/);
  assert.match(staticPage, /CV-Jorge-Castro\.pdf/);

  await Promise.all([
    access(new URL("../public/CV-Jorge-Castro.pdf", import.meta.url)),
    access(
      new URL(
        "../public/certificates/Oracle-Dev-Gym-Databases-Foundations.pdf",
        import.meta.url,
      ),
    ),
  ]);
});
