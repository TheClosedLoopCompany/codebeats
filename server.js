// Tiny static file server for local development: `node server.js` (or `npm start`). No dependencies.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = import.meta.dirname, port = process.env.PORT || 8787;
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  try {
    const body = await readFile(join(root, path.endsWith("/") ? path + "index.html" : path));
    res.writeHead(200, { "content-type": (types[extname(path)] || "text/html") + "; charset=utf-8", "cache-control": "no-store" }).end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(port, () => console.log(`codebeats on http://localhost:${port}`));
