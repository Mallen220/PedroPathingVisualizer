import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Allow overriding year for testing/rollover simulation via env var
const CURRENT_YEAR =
  process.env.FORCE_YEAR || new Date().getFullYear().toString();
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

const APACHE_LICENSE_TEXT = `Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.`;

const APACHE_HEADER_TEMPLATE = `
 * Copyright ${CURRENT_YEAR} ${COPYRIGHT_OWNER}
 *
 * ${APACHE_LICENSE_TEXT}
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

function processFile(filePath) {
  const ext = path.extname(filePath);
  if (!EXTENSIONS_TO_CHECK.includes(ext)) return;

  let content = fs.readFileSync(filePath, "utf8");
  let updated = false;

  // 1. Fix incorrect headers (specifically JS-style in Svelte)
  if (ext === ".svelte") {
    const jsHeaderRegex =
      /\/\*[\s\S]*?Licensed under the Apache License[\s\S]*?\*\//;
    if (jsHeaderRegex.test(content)) {
      content = content.replace(jsHeaderRegex, "").trimStart();
      console.log(`Removed incorrect header from: ${filePath}`);
      updated = true;
    }
  }

  // 2. Check for existing "Copyright [Year] Matthew Allen"
  // Regex to match "Copyright YYYY Matthew Allen" or "Copyright YYYY-YYYY Matthew Allen"
  // We want to capture the year part to see if it needs update.
  const copyrightRegex = new RegExp(
    `Copyright\\s+([0-9]{4})(?:-[0-9]{4})?\\s+${COPYRIGHT_OWNER}`,
  );
  const match = content.match(copyrightRegex);

  if (match) {
    const existingYear = match[1];
    // Header exists. Check if year matches current.
    if (existingYear !== CURRENT_YEAR) {
      // Update year.
      // We can either update it to "CURRENT_YEAR" or range "EXISTING-CURRENT".
      // For this task, we assume strictly updating to current year is the goal based on "2025->2026" prompt.
      // Replace the entire match with new Copyright line
      const newCopyrightLine = `Copyright ${CURRENT_YEAR} ${COPYRIGHT_OWNER}`;

      // Be careful replacing. content.replace(regex) replaces the first occurrence.
      // The match string is "Copyright 2025 Matthew Allen".
      // We want to replace it with "Copyright 2026 Matthew Allen".

      content = content.replace(match[0], newCopyrightLine);
      console.log(
        `Updated year (${existingYear} -> ${CURRENT_YEAR}) in: ${filePath}`,
      );
      updated = true;
    }

    // Also verify strict style for Svelte if we found a match but it wasn't caught by the jsHeaderRegex?
    // The match doesn't tell us if it's inside <!-- --> or /* */.
    // But `jsHeaderRegex` above should have caught the bad block comment.
    // So if we are here, and it's svelte, it's likely in an HTML comment or text.
    // If logic above works, we are good.

    if (updated) {
      fs.writeFileSync(filePath, content, "utf8");
    }
    return;
  }

  // 3. No copyright found (or at least not matching our owner). Add new header.
  // (Unless it has "Licensed under..." but different owner? We skip those to be safe or just prepend?)
  // We'll stick to: if no "Copyright ... Matthew Allen", we add our header.
  // But wait, what if it has the license but no copyright line? Or different format?
  // Let's check for the License text to avoid double licensing if the copyright format is weird.
  if (content.includes("Licensed under the Apache License")) {
    // License text exists but our specific Copyright regex didn't match.
    // Maybe it's "Copyright [yyyy] ..."?
    if (content.includes("Copyright [yyyy] [name of copyright owner]")) {
      content = content.replace(
        "Copyright [yyyy] [name of copyright owner]",
        `Copyright ${CURRENT_YEAR} ${COPYRIGHT_OWNER}`,
      );
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`Updated placeholder in: ${filePath}`);
      return;
    }

    // If we are here, it has license but we couldn't parse/find our copyright.
    // Leave it alone to avoid mess.
    return;
  }

  // Add header
  const header = getHeaderForFile(ext);

  if (ext === ".sh") {
    if (content.startsWith("#!")) {
      const lines = content.split("\n");
      const shebang = lines[0];
      const rest = lines.slice(1).join("\n");
      content = `${shebang}\n\n${header}\n${rest}`;
    } else {
      content = `${header}\n\n${content}`;
    }
  } else {
    content = `${header}\n\n${content}`;
  }

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`Added header to: ${filePath}`);
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

console.log(`Adding/Updating copyright headers (Year: ${CURRENT_YEAR})...`);
traverseDir(rootDir);
console.log("Done.");
