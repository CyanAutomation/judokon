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
import { createReadStream, existsSync, statSync, readFileSync } from "fs";
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

const SENTRY_IMPORT_MAP_SIGNATURE = "\"@sentry/browser\": \"/tests/fixtures/sentry-browser-stub.js\"";

function shouldInjectImportMap(filePath) {
  return filePath.endsWith(".html");
}

function injectSentryImportMap(html) {
  if (!html || html.includes(SENTRY_IMPORT_MAP_SIGNATURE)) {
    return html;
  }

  const importMap = `\n    <script type="importmap">\n      {\n        \"imports\": {\n          \"@sentry/browser\": \"/tests/fixtures/sentry-browser-stub.js\"\n        }\n      }\n    </script>\n`;
  const headCloseIndex = html.toLowerCase().indexOf("</head>");
  if (headCloseIndex === -1) {
    return `${html}${importMap}`;
  }
  return `${html.slice(0, headCloseIndex)}${importMap}${html.slice(headCloseIndex)}`;
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
    const contentType = getContentType(filePath);
    if (shouldInjectImportMap(filePath)) {
      try {
        let html = readFileSync(filePath, "utf8");
        html = injectSentryImportMap(html);
        res.setHeader("Content-Type", contentType);
        res.end(html);
        return;
      } catch (err) {
        console.error("Error reading HTML file %s:", filePath, err);
        res.statusCode = 500;
        res.end("Internal Server Error");
        return;
      }
    }

    res.setHeader("Content-Type", contentType);
    const stream = createReadStream(filePath);
    stream.on("error", (err) => {
      console.error("Error reading file %s:", filePath, err);
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
