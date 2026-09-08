#!/usr/bin/env node
// `tsc` only emits .ts/.tsx -> .js; it never copies the *.module.css files
// sitting alongside each component. Without this, dist/index.js's compiled
// `import styles from "./Foo.module.css"` has nothing to resolve against —
// invisible to Storybook and Vitest (both run directly against src/), but
// breaks the first real consumer of the built package (a bundler like
// Next.js's webpack, resolving @gsk/ui via its package.json "main").
import { cp, mkdir, readdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const srcDir = fileURLToPath(new URL("../src", import.meta.url));
const distDir = fileURLToPath(new URL("../dist", import.meta.url));

async function copyModuleCss(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await copyModuleCss(fullPath);
    } else if (entry.name.endsWith(".module.css")) {
      const destPath = join(distDir, relative(srcDir, fullPath));
      await mkdir(dirname(destPath), { recursive: true });
      await cp(fullPath, destPath);
    }
  }
}

await copyModuleCss(srcDir);
