/* eslint-disable */
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const OUTPUT = path.join(__dirname, "..", "public", "tenant.json");

const toDirectUrl = (url) => {
  if (!url) return url;
  const m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (!m) return url;
  return `https://drive.usercontent.google.com/download?id=${m[1]}&export=download`;
};

// Drive share URLs returning HTML viewer pages cannot be used as <img src>.
// Convert them to the lh3 form that serves the raw image bytes with CORS.
const toEmbeddableImageUrl = (url) => {
  if (!url) return url;
  const m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (!m) return url;
  return `https://lh3.googleusercontent.com/d/${m[1]}`;
};

const rewriteAssetUrls = (data) => {
  if (!data || typeof data !== "object" || !data.assets) return data;
  const keys = ["logoUrl", "logoDarkUrl", "authBackgroundUrl", "faviconUrl"];
  for (const key of keys) {
    if (typeof data.assets[key] === "string") {
      data.assets[key] = toEmbeddableImageUrl(data.assets[key]);
    }
  }
  return data;
};

const writeFallback = (reason) => {
  console.warn(`[fetch-tenant] ${reason} — writing empty manifest`);
  fs.writeFileSync(OUTPUT, JSON.stringify({ assets: {} }, null, 2));
};

(async () => {
  const raw = process.env.REACT_APP_MANIFEST_URL;
  if (!raw) {
    writeFallback("REACT_APP_MANIFEST_URL is not set");
    return;
  }

  // Additive: if value is a local absolute path (and not an http(s) URL), read it from disk.
  // The HTTP/Drive path below stays untouched for production.
  const isHttp = /^https?:\/\//i.test(raw);
  if (!isHttp && path.isAbsolute(raw)) {
    console.log(`[fetch-tenant] Reading local file ${raw}`);
    try {
      const text = fs.readFileSync(raw, "utf8");
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        writeFallback(`Local file was not JSON (first 80 chars: ${text.slice(0, 80)})`);
        return;
      }
      fs.writeFileSync(OUTPUT, JSON.stringify(rewriteAssetUrls(data), null, 2));
      console.log(`[fetch-tenant] Wrote ${OUTPUT}`);
    } catch (err) {
      writeFallback(err.message || String(err));
    }
    return;
  }

  const url = toDirectUrl(raw);
  console.log(`[fetch-tenant] Fetching ${url}`);

  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      writeFallback(`HTTP ${res.status}`);
      return;
    }
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      writeFallback(`Response was not JSON (first 80 chars: ${text.slice(0, 80)})`);
      return;
    }
    fs.writeFileSync(OUTPUT, JSON.stringify(rewriteAssetUrls(data), null, 2));
    console.log(`[fetch-tenant] Wrote ${OUTPUT}`);
  } catch (err) {
    writeFallback(err.message || String(err));
  }
})();
