import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`],
      ),
    )
  ).flat();
}
const files = (await walk("out")).filter(
  (f) => !f.endsWith(".map") && !f.endsWith("/sw.js"),
);
const hash = createHash("sha256");
for (const file of files) hash.update(await readFile(file));
const version = hash.digest("hex").slice(0, 16),
  urls = files.map((f) => f.slice(3));
urls.push("/");
const code = `// Generated from the entire static export. No network dependency during play.
const CACHE='lang-trang-${version}';
const ASSETS=${JSON.stringify(urls)};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('lang-trang-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]));});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 event.respondWith(caches.open(CACHE).then(async cache=>{
  if(event.request.mode==='navigate')return (await cache.match('/'))||fetch(event.request);
  return (await cache.match(event.request))||fetch(event.request);
 }));
});
`;
await writeFile("out/sw.js", code);
console.log(`Offline shell: ${files.length} files precached · ${version}`);
