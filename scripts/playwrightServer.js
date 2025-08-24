/* eslint-env node */
/**
 * Simple static file server for Playwright tests.
 *
 * @pseudocode
 * 1. Determine root directory and port.
 * 2. Create HTTP server to serve files.
 * 3. Resolve requested paths relative to root.
 * 4. Stream the file with correct Content-Type.
 * 5. Handle file streaming errors gracefully.
 * 6. Return 404 if file not found.
 */
import http from "http";
import { createReadStream, existsSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 5000);
const host = process.env.HOST || "127.0.0.1";

const mimeTypes = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function getContentType(filePath) {
  return mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const requestPath = decodeURIComponent(pathname).replace(/^\/+/, "");
  let filePath = path.resolve(rootDir, requestPath === "" ? "index.html" : requestPath);
  if (path.relative(rootDir, filePath).startsWith("..")) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }
  if (existsSync(filePath)) {
    res.setHeader("Content-Type", getContentType(filePath));
    const stream = createReadStream(filePath);
    stream.on("error", (err) => {
      console.error(`Error reading file ${filePath}:`, err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    });
    stream.pipe(res);
  } else {
    res.statusCode = 404;
    res.end("Not Found");
  }
});

server.listen(port, host, () => {
  console.log(`Static server running at http://${host}:${port}`);
});
