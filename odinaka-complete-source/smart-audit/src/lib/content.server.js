import "server-only";
import fs from "fs";
import path from "path";

function readPublicJson(relPath) {
  const filePath = path.join(process.cwd(), "public", relPath);
  let raw = fs.readFileSync(filePath, "utf8");

  // Remove UTF-8 BOM if present
  raw = raw.replace(/^\uFEFF/, "");

  // If any junk exists before the first "{", strip it
  const firstBrace = raw.indexOf("{");
  if (firstBrace > 0) raw = raw.slice(firstBrace);

  // Also strip null chars (common in corrupted writes)
  raw = raw.replace(/\u0000/g, "");

  try {
    return JSON.parse(raw);
  } catch (err) {
    // Throw useful debug info so you can see what is inside the file
    const preview = raw.slice(0, 200).replace(/\r?\n/g, "\\n");
    throw new Error(
      `Invalid JSON in public/${relPath}. Preview: "${preview}"\nOriginal error: ${err.message}`,
    );
  }
}

export function getStore() {
  return readPublicJson("content/store.json");
}

export function getPromos() {
  return readPublicJson("content/promos.json");
}

export function getSeo() {
  return readPublicJson("content/seo.json");
}

export function getProducts() {
  return getStore().products || [];
}

export function getCategories() {
  return getStore().categories || [];
}

export function getProductById(id) {
  return getProducts().find((p) => p.id === id) || null;
}
