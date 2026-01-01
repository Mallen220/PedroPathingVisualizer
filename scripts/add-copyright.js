/*
 * Copyright 2025 Matthew Allen
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const COPYRIGHT_YEAR = "2025";
const COPYRIGHT_OWNER = "Matthew Allen";

const EXTENSIONS_TO_CHECK = [
  ".ts",
  ".js",
  ".svelte",
  ".java",
  ".scss",
  ".css",
  ".html",
  ".sh",
];

// Folders to ignore
const IGNORED_FOLDERS = [
  "node_modules",
  "dist",
  "build",
  "release",
  ".git",
  ".vscode",
  ".jules",
  ".Jules",
  "public", // Often contains static assets where headers are not appropriate
];

// Specific files to ignore
const IGNORED_FILES = [
  "package-lock.json",
  "package.json",
  "LICENSE",
  "NOTICE",
  "README.md",
  "CHANGELOG.md",
  "INSTALL.md",
  ".gitignore",
  ".prettierrc",
  "tsconfig.json",
  "tsconfig.node.json",
  "vite.config.ts.timestamp", // Vite internal
];

const BLOCK_COMMENT_START = "/*";
const BLOCK_COMMENT_END = "*/";

const APACHE_HEADER_TEMPLATE = `
 * Copyright ${COPYRIGHT_YEAR} ${COPYRIGHT_OWNER}
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 `;

// HTML style
const HTML_HEADER = `<!--${APACHE_HEADER_TEMPLATE}-->`;

// JS/TS/CSS/SCSS/Java style
const STANDARD_HEADER = `${BLOCK_COMMENT_START}${APACHE_HEADER_TEMPLATE}${BLOCK_COMMENT_END}`;

// Shell style (using hash)
const SHELL_HEADER_LINES = APACHE_HEADER_TEMPLATE.split("\n")
  .map((line) => {
    // Remove " * " and replace with "# "
    const trimmed = line.replace(/^\s*\*\s?/, "");
    return trimmed ? `# ${trimmed}` : "#";
  })
  .join("\n")
  .trim();
const SHELL_HEADER = `#\n${SHELL_HEADER_LINES}\n#`;

function getHeaderForFile(ext) {
  if (ext === ".html" || ext === ".svelte") return HTML_HEADER;
  if (ext === ".sh") return SHELL_HEADER;
  return STANDARD_HEADER;
}

function hasCorrectHeader(content, ext) {
  // Check if it has the specific 2025 copyright header
  // AND if it is the correct type for the file (e.g., svelte uses HTML comment)
  if (!content.includes(`Copyright ${COPYRIGHT_YEAR} ${COPYRIGHT_OWNER}`)) {
    return false;
  }

  if (ext === ".svelte") {
    // Must use HTML comments
    return (
      content.includes("<!--") &&
      content.includes("Licensed under the Apache License")
    );
  }

  return true;
}

function processFile(filePath) {
  const ext = path.extname(filePath);
  if (!EXTENSIONS_TO_CHECK.includes(ext)) return;

  let content = fs.readFileSync(filePath, "utf8");

  // Fix for previous run on svelte files: remove JS style header if present
  if (ext === ".svelte") {
    // Look for the JS style header that was incorrectly added
    // The previous run added STANDARD_HEADER at the top, or possibly after <script> depending on where it landed?
    // Actually, I was prepending it.
    // Prettier might have moved it.
    // The mangled one looks like: /* * Copyright 2025 ... */

    // We can try to regex remove it.
    // It starts with /* and ends with */ and contains "Licensed under the Apache License"
    // We need to be careful not to remove other comments.
    // But this header is huge.

    // Simple approach: if it has "Licensed under the Apache License" inside /* */, remove it.
    const jsHeaderRegex =
      /\/\*[\s\S]*?Licensed under the Apache License[\s\S]*?\*\//;

    if (jsHeaderRegex.test(content)) {
      content = content.replace(jsHeaderRegex, "").trimStart();
      console.log(`Removed incorrect header from: ${filePath}`);
      // Fall through to add correct header
    }

    // Also check if we already have the HTML header but it's not at the top?
    // If hasCorrectHeader is true, we assume it's good.
  }

  if (hasCorrectHeader(content, ext)) {
    return;
  }

  const header = getHeaderForFile(ext);
  let newContent = content;

  if (ext === ".sh") {
    // Handle shebang
    if (content.startsWith("#!")) {
      const lines = content.split("\n");
      // Keep shebang
      const shebang = lines[0];
      const rest = lines.slice(1).join("\n");
      newContent = `${shebang}\n\n${header}\n${rest}`;
    } else {
      newContent = `${header}\n\n${content}`;
    }
  } else {
    // Standard prepend
    // For svelte, ensure it's at the very top
    newContent = `${header}\n\n${content}`;
  }

  fs.writeFileSync(filePath, newContent, "utf8");
  console.log(`Added/Updated header to: ${filePath}`);
}

function traverseDir(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!IGNORED_FOLDERS.includes(file)) {
        traverseDir(fullPath);
      }
    } else {
      if (!IGNORED_FILES.includes(file)) {
        processFile(fullPath);
      }
    }
  }
}

console.log("Adding/Updating copyright headers...");
traverseDir(rootDir);
console.log("Done.");
