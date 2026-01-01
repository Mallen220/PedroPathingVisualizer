/*
 * Copyright 2026 Matthew Allen
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
import fs from 'fs';
import path from 'path';

const OWNER = 'Matthew Allen';
const CURRENT_YEAR = new Date().getFullYear();

const LICENSE_TEXT = `Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.`;

const EXTENSIONS = {
  '.js': 'BLOCK',
  '.ts': 'BLOCK',
  '.scss': 'BLOCK',
  '.svelte': 'HTML',
  '.html': 'HTML',
  '.sh': 'HASH',
};

const COMMENT_STYLES = {
  BLOCK: { start: '/*', end: '*/', prefix: ' * ' },
  HTML: { start: '<!--', end: '-->', prefix: '  ' },
  HASH: { start: '#', end: '', prefix: '# ' },
};

// Adjust HTML style to look good
COMMENT_STYLES.HTML.prefix = '';

function getHeader(yearRange, styleType) {
  // const style = COMMENT_STYLES[styleType]; // Unused variable
  const lines = [
    `Copyright ${yearRange} ${OWNER}`,
    '',
    ...LICENSE_TEXT.split('\n')
  ];

  if (styleType === 'BLOCK') {
    return `/*\n${lines.map(l => (l ? ' * ' + l : ' *')).join('\n')}\n */\n`;
  } else if (styleType === 'HTML') {
    return `<!--\n${lines.map(l => (l ? '  ' + l : '  ')).join('\n')}\n-->\n`;
  } else if (styleType === 'HASH') {
    return `${lines.map(l => (l ? '# ' + l : '#')).join('\n')}\n`;
  }
}

function traverse(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build' || file === 'release' || file === '.jules' || file === '.vscode') continue;
      traverse(filePath);
    } else {
      const ext = path.extname(file);
      if (EXTENSIONS[ext]) {
        processFile(filePath, EXTENSIONS[ext]);
      }
    }
  }
}

function processFile(filePath, styleType) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Regex to detect existing copyright header
  const copyrightRegex = /Copyright (\d{4})(?:-(\d{4}))? (.*?)\n/i;

  const match = content.match(copyrightRegex);

  let startYear = CURRENT_YEAR;
  let endYear = CURRENT_YEAR;

  if (match) {
    startYear = parseInt(match[1]);
    if (match[2]) {
      endYear = parseInt(match[2]);
    }
    if (endYear < CURRENT_YEAR) {
      endYear = CURRENT_YEAR;
    }
  }

  const yearRange = startYear === endYear ? `${startYear}` : `${startYear}-${endYear}`;
  const newHeader = getHeader(yearRange, styleType);

  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  let shebang = '';
  let bodyLines = lines;

  if (lines.length > 0 && lines[0].startsWith('#!')) {
    shebang = lines[0] + '\n';
    bodyLines = lines.slice(1);
  }

  let body = bodyLines.join('\n');

  // Remove existing header from body
  if (styleType === 'BLOCK') {
    const regex = /^\s*\/\*[\s\S]*?Copyright[\s\S]*?Matthew Allen[\s\S]*?\*\/\s*/;
    body = body.replace(regex, '');
  } else if (styleType === 'HTML') {
    const regex = /^\s*<!--[\s\S]*?Copyright[\s\S]*?Matthew Allen[\s\S]*?-->\s*/;
    body = body.replace(regex, '');
  } else if (styleType === 'HASH') {
    const hashBlockRegex = /^(\s*#[^\n]*\n)+/;
    const m = body.match(hashBlockRegex);
    if (m && m[0].includes('Copyright') && m[0].includes('Matthew Allen')) {
      body = body.substring(m[0].length);
    }
  }

  // Trim leading newlines from body to avoid gaps
  body = body.replace(/^\n+/, '');

  const finalContent = shebang + newHeader + body;

  if (finalContent !== fs.readFileSync(filePath, 'utf8')) {
     fs.writeFileSync(filePath, finalContent);
     console.log(`Updated ${filePath}`);
  }
}

traverse('.');
