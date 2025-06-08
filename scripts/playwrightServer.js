/* eslint-env node */
/**
 * Simple static file server for Playwright tests.
 *
 * @pseudocode
 * 1. Determine root directory and port.
 * 2. Create HTTP server to serve files.
 * 3. Resolve requested paths relative to root.
 * 4. Stream the file with correct Content-Type.
 * 5. Return 404 if file not found.
 */
import http from "http";
import { createReadStream, existsSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const port = process.env.PORT || 5000;

const mimeTypes = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function getContentType(filePath) {
  return mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

const server = http.createServer((req, res) => {
  let filePath = path.join(rootDir, req.url === "/" ? "index.html" : req.url);
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }
  if (existsSync(filePath)) {
    res.setHeader("Content-Type", getContentType(filePath));
    createReadStream(filePath).pipe(res);
  } else {
    res.statusCode = 404;
    res.end("Not Found");
  }
});

server.listen(port, () => {
  console.log(`Static server running at http://localhost:${port}`);
});
