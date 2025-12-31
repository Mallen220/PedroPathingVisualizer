/**
 * Simple Template Engine for Pedro Pathing Visualizer
 * Supports:
 * - {{ variable }} placeholders (with dot notation, array access, and math)
 * - {% for item in collection %} loops (with loop.index, loop.first, loop.last)
 * - {% if condition %} blocks (truthy check, or equality/inequality)
 * - {% else %} blocks
 * - Comments aren't explicitly stripped but can be part of the text
 */

type Context = any;

interface Token {
  type: "text" | "expression" | "block_start" | "block_end" | "else";
  content: string;
  line: number;
}

export interface RenderResult {
  result: string;
  error?: {
    message: string;
    line: number;
  };
  warnings?: string[]; // Added warnings support
}

export function renderTemplate(
  template: string,
  context: Context,
): RenderResult {
  try {
    const tokens = tokenize(template);
    const result = parseAndRender(tokens, context);
    return { result };
  } catch (e: any) {
    return {
      result: `// Error rendering template: ${e.message}`,
      error: {
        message: e.message,
        line: e.line || 0,
      },
    };
  }
}

export function validateTemplate(template: string, context: Context): string[] {
  const errors: string[] = [];
  try {
    const tokens = tokenize(template);
    let stack = 0;
    for (const token of tokens) {
      if (token.type === "block_start") {
        if (
          token.content.startsWith("for ") ||
          token.content.startsWith("if ")
        ) {
          stack++;
        }
      } else if (token.type === "block_end") {
        if (token.content === "endfor" || token.content === "endif") {
          stack--;
        }
      }
    }
    if (stack !== 0) {
      errors.push("Mismatched block tags (for/if/endfor/endif)");
    }

    try {
      parseAndRender(tokens, context);
    } catch (e: any) {
      errors.push(e.message);
    }
  } catch (e: any) {
    errors.push(e.message);
  }
  return errors;
}

function tokenize(template: string): Token[] {
  const tokens: Token[] = [];
  const regex = /{{(.*?)}}|{%(.*?)%}/gs;
  let lastIndex = 0;
  let match;
  let lineNumber = 1;

  const countNewlines = (str: string) => (str.match(/\n/g) || []).length;

  while ((match = regex.exec(template)) !== null) {
    if (match.index > lastIndex) {
      const textContent = template.substring(lastIndex, match.index);
      tokens.push({
        type: "text",
        content: textContent,
        line: lineNumber,
      });
      lineNumber += countNewlines(textContent);
    }

    const currentLine = lineNumber;
    if (match[1] !== undefined) {
      const content = match[1].trim();
      tokens.push({
        type: "expression",
        content: content,
        line: currentLine,
      });
      lineNumber += countNewlines(match[0]);
    } else if (match[2] !== undefined) {
      const content = match[2].trim();
      let type: Token["type"];

      if (content.startsWith("for ") || content.startsWith("if ")) {
        type = "block_start";
      } else if (content === "endfor" || content === "endif") {
        type = "block_end";
      } else if (content === "else") {
        type = "else";
      } else {
        const err: any = new Error(`Unknown block tag: ${content}`);
        err.line = currentLine;
        throw err;
      }

      tokens.push({
        type: type,
        content: content,
        line: currentLine,
      });
      lineNumber += countNewlines(match[0]);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < template.length) {
    const textContent = template.substring(lastIndex);
    tokens.push({
      type: "text",
      content: textContent,
      line: lineNumber,
    });
  }

  return tokens;
}

function parseAndRender(tokens: Token[], context: Context): string {
  let output = "";
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    try {
      if (token.type === "text") {
        output += token.content;
        i++;
      } else if (token.type === "expression") {
        const val = evaluateExpression(token.content, context);
        // Explicitly handle undefined -> error string marker
        if (val === undefined) {
          output += `<<UNDEFINED: ${token.content}>>`;
        } else {
          output += val;
        }
        i++;
      } else if (token.type === "block_start") {
        const blockContent = token.content;
        if (blockContent.startsWith("for ")) {
          const match = blockContent.match(/^for\s+(\w+)\s+in\s+(.+)$/);
          if (!match)
            throw new Error(`Invalid for loop syntax: ${blockContent}`);
          const itemName = match[1];
          const collectionPath = match[2];

          // Find endfor
          let stack = 1;
          let j = i + 1;
          let loopTokens: Token[] = [];
          while (j < tokens.length) {
            if (
              tokens[j].type === "block_start" &&
              tokens[j].content.startsWith("for ")
            ) {
              stack++;
            } else if (
              tokens[j].type === "block_end" &&
              tokens[j].content === "endfor"
            ) {
              stack--;
              if (stack === 0) break;
            }
            loopTokens.push(tokens[j]);
            j++;
          }

          if (stack !== 0) throw new Error("Missing endfor");

          const collection = getValue(collectionPath, context);
          if (Array.isArray(collection)) {
            collection.forEach((item, index) => {
              const loopContext = {
                ...context,
                [itemName]: item,
                loop: {
                  index: index,
                  index1: index + 1,
                  first: index === 0,
                  last: index === collection.length - 1,
                  length: collection.length,
                },
              };
              output += parseAndRender(loopTokens, loopContext);
            });
          } else {
            // Collection undefined or not array
            if (collection === undefined) {
              output += `<<UNDEFINED COLLECTION: ${collectionPath}>>`;
            }
          }

          i = j + 1;
        } else if (blockContent.startsWith("if ")) {
          const condition = blockContent.substring(3).trim();

          let stack = 1;
          let j = i + 1;
          let trueBlock: Token[] = [];
          let falseBlock: Token[] = [];
          let inElse = false;

          while (j < tokens.length) {
            if (
              tokens[j].type === "block_start" &&
              tokens[j].content.startsWith("if ")
            ) {
              stack++;
              if (inElse) falseBlock.push(tokens[j]);
              else trueBlock.push(tokens[j]);
            } else if (
              tokens[j].type === "block_end" &&
              tokens[j].content === "endif"
            ) {
              stack--;
              if (stack === 0) break;
              if (inElse) falseBlock.push(tokens[j]);
              else trueBlock.push(tokens[j]);
            } else if (tokens[j].type === "else" && stack === 1) {
              inElse = true;
            } else {
              if (inElse) falseBlock.push(tokens[j]);
              else trueBlock.push(tokens[j]);
            }
            j++;
          }

          if (stack !== 0) throw new Error("Missing endif");

          if (evaluateCondition(condition, context)) {
            output += parseAndRender(trueBlock, context);
          } else if (falseBlock.length > 0) {
            output += parseAndRender(falseBlock, context);
          }

          i = j + 1;
        } else {
          throw new Error(`Unknown block: ${blockContent}`);
        }
      } else if (token.type === "block_end" || token.type === "else") {
        i++;
      } else {
        i++;
      }
    } catch (e: any) {
      if (!e.line) e.line = token.line;
      throw e;
    }
  }

  return output;
}

function getValue(path: string, context: Context): any {
  let current = context;
  let remaining = path;

  while (remaining.length > 0) {
    if (current === undefined || current === null) return undefined;

    if (remaining.startsWith(".")) {
      remaining = remaining.substring(1);
      continue;
    }

    const bracketIdx = remaining.indexOf("[");
    const dotIdx = remaining.indexOf(".");

    let nextDelim = -1;
    if (bracketIdx !== -1 && dotIdx !== -1)
      nextDelim = Math.min(bracketIdx, dotIdx);
    else if (bracketIdx !== -1) nextDelim = bracketIdx;
    else if (dotIdx !== -1) nextDelim = dotIdx;

    if (nextDelim === -1) {
      const prop = remaining;
      current = current[prop];
      remaining = "";
    } else {
      if (nextDelim === 0 && remaining.startsWith("[")) {
        let openCount = 1;
        let closeIdx = -1;
        for (let k = 1; k < remaining.length; k++) {
          if (remaining[k] === "[") openCount++;
          if (remaining[k] === "]") openCount--;
          if (openCount === 0) {
            closeIdx = k;
            break;
          }
        }

        if (closeIdx === -1) throw new Error("Unclosed bracket in path");

        const expr = remaining.substring(1, closeIdx);
        const indexVal = evaluateExpression(expr, context);
        const index = !isNaN(Number(indexVal)) ? Number(indexVal) : indexVal;

        current = current[index];
        remaining = remaining.substring(closeIdx + 1);
      } else {
        const prop = remaining.substring(0, nextDelim);
        current = current[prop];
        remaining = remaining.substring(nextDelim);
      }
    }
  }

  return current;
}

function evaluateExpression(expr: string, context: Context): any {
  expr = expr.trim();
  if (!isNaN(Number(expr))) return Number(expr);
  if (expr.startsWith('"') && expr.endsWith('"')) return expr.slice(1, -1);

  // Simple recursive descent parser for basic math (handles associativity)
  // Supports +, -, *, /
  // Priority: *, / then +, -
  // Left-associative

  // First split by + and - (lowest precedence)
  // We need to find the *last* operator at this level to ensure left-associativity when recursing?
  // Actually, for "a - b - c", we want (a - b) - c.
  // This means the top level split should happen at the LAST occurrence of - or +.
  // "a - b - c" -> Left: "a - b", Right: "c" -> (a-b) - c. Correct.

  // Helper to find split index for lowest precedence operators
  function findSplitIndex(str: string, ops: string[]): number {
    let bracketDepth = 0;
    // Iterate backwards to find right-most operator for left-associativity
    for (let i = str.length - 1; i >= 0; i--) {
      if (str[i] === "]") bracketDepth++;
      else if (str[i] === "[") bracketDepth--;
      else if (bracketDepth === 0 && ops.includes(str[i])) {
        return i;
      }
    }
    return -1;
  }

  // Level 1: +, -
  let splitIdx = findSplitIndex(expr, ["+", "-"]);
  if (splitIdx !== -1) {
    const left = expr.substring(0, splitIdx).trim();
    const right = expr.substring(splitIdx + 1).trim();
    const op = expr[splitIdx];

    const lVal: any = evaluateExpression(left, context);
    const rVal: any = evaluateExpression(right, context);

    if (lVal === undefined || rVal === undefined) return undefined;

    if (op === "+") return lVal + rVal;
    if (op === "-") return lVal - rVal;
  }

  // Level 2: *, /
  splitIdx = findSplitIndex(expr, ["*", "/"]);
  if (splitIdx !== -1) {
    const left = expr.substring(0, splitIdx).trim();
    const right = expr.substring(splitIdx + 1).trim();
    const op = expr[splitIdx];

    const lVal: any = evaluateExpression(left, context);
    const rVal: any = evaluateExpression(right, context);

    if (lVal === undefined || rVal === undefined) return undefined;

    if (op === "*") return lVal * rVal;
    if (op === "/") return lVal / rVal;
  }

  // Fallback: variable path
  return getValue(expr, context);
}

function evaluateCondition(condition: string, context: Context): boolean {
  if (condition.includes("==")) {
    const [left, right] = condition.split("==").map((s) => s.trim());
    const leftVal = evaluateExpression(left, context);
    const rightVal = evaluateExpression(right, context);
    return leftVal == rightVal;
  }
  if (condition.includes("!=")) {
    const [left, right] = condition.split("!=").map((s) => s.trim());
    const leftVal = evaluateExpression(left, context);
    const rightVal = evaluateExpression(right, context);
    return leftVal != rightVal;
  }
  return !!evaluateExpression(condition, context);
}
