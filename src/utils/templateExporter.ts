import type { Line, Point, SequenceItem } from "../types";
import pkg from "../../package.json";

export interface TemplateData {
  startPoint: Point;
  lines: Line[];
  sequence: SequenceItem[];
  pkg: typeof pkg;
  date: Date;
  packageName?: string;
}

interface LoopContext {
  collection: any[];
  itemName: string;
  indexName?: string;
  parent?: Context;
}

interface Context {
  data: any;
  parent?: Context;
}

export class TemplateEngine {
  private template: string;
  private data: TemplateData;

  constructor(template: string, data: TemplateData) {
    this.template = template;
    this.data = data;
  }

  public async render(): Promise<string> {
    try {
      // Direct rendering, no post-processing/formatting
      return this.processBlock(this.template, { data: this.data });
    } catch (e: any) {
      throw new Error(`Template rendering error: ${e.message}`);
    }
  }

  private processBlock(content: string, context: Context): string {
    let result = "";
    let currentIndex = 0;

    while (currentIndex < content.length) {
      const openTagMatch = this.findNextTag(content, currentIndex);

      if (!openTagMatch) {
        // No more tags, just replace variables in the rest
        result += this.replaceVariables(
          content.substring(currentIndex),
          context,
        );
        break;
      }

      // Add text before the tag
      result += this.replaceVariables(
        content.substring(currentIndex, openTagMatch.index),
        context,
      );
      currentIndex = openTagMatch.index;

      const tagType = openTagMatch.type; // 'if' or 'each'
      const tagContent = openTagMatch.content;
      const tagLength = openTagMatch.length;

      // Find closing tag, accounting for nesting
      const blockEnd = this.findMatchingCloseTag(
        content,
        currentIndex + tagLength,
        tagType,
      );

      if (blockEnd === -1) {
        throw new Error(
          `Unclosed #${tagType} tag starting at index ${currentIndex}`,
        );
      }

      const innerContent = content.substring(
        currentIndex + tagLength,
        blockEnd,
      );

      if (tagType === "each") {
        result += this.processEach(tagContent, innerContent, context);
      } else if (tagType === "if") {
        result += this.processIf(tagContent, innerContent, context);
      }

      currentIndex = blockEnd + tagType.length + 1; // +1 for the '/'
    }

    return result;
  }

  private findNextTag(
    content: string,
    startIndex: number,
  ): { type: string; content: string; index: number; length: number } | null {
    const eachIdx = content.indexOf("#each", startIndex);
    const ifIdx = content.indexOf("#if", startIndex);

    if (eachIdx === -1 && ifIdx === -1) return null;

    if (eachIdx !== -1 && (ifIdx === -1 || eachIdx < ifIdx)) {
      // #each is first
      const lineEnd = content.indexOf("\n", eachIdx);
      const tagText = content.substring(
        eachIdx,
        lineEnd === -1 ? content.length : lineEnd,
      );
      const params = tagText.substring(5).trim();

      return {
        type: "each",
        content: params,
        index: eachIdx,
        length: tagText.length, // Consumes the tag but NOT the newline. Wait, logic says processBlock appends text BEFORE tag.
        // If we want to preserve formatting, we should probably strip the tag but keep the structure?
        // But user put the tag on a line.
        // If we just remove the tag text, we might leave a blank line?
        // Usually template engines strip the line if it only contains a tag.
        // But strict "Preserve all user formatting" might imply outputting blank lines if the user put them?
        // Let's assume tags are removed, but surrounding whitespace is kept, unless we actively strip the newline after a block tag?
        // For simplicity and correctness with "exactly as written", we only remove the tag text itself.
        // IF the user wrote:
        // #each ...
        // code
        // /each
        // result will have blank lines where #each and /each were if we include the newline in the 'text before'.
        // My implementation: `content.substring(currentIndex, openTagMatch.index)` includes up to start of #each.
        // `tagLength` is length of `#each ...`.
        // So `currentIndex` jumps over `#each ...`.
        // The newline at the end of the line (if `lineEnd` found) is NOT included in `tagLength` because `lineEnd` index is where `\n` starts.
        // So the newline remains in the input for the *next* iteration or block.
        // It will be part of `innerContent` for the block, or text after.
        // Example:
        // #each
        //  code
        // /each
        // `innerContent` starts with `\n code \n`.
        // So the output will correspond to structure.
        // The `#each` line itself:
        // If I write `text` + `processEach`, `text` ends before `#each`.
        // `processEach` returns body repeated.
        // If body starts with `\n`, we get `\n`.
        // So we get `text` + `\n code`...
        // The line with `#each` effectively disappears? No, the newline *after* `#each` is preserved as start of body.
        // So:
        // Line 1 (#each) -> removed
        // Line 2 (code) -> kept
        // This seems correct for a template engine.
      };
    } else {
      // #if is first
      const lineEnd = content.indexOf("\n", ifIdx);
      const tagText = content.substring(
        ifIdx,
        lineEnd === -1 ? content.length : lineEnd,
      );
      const params = tagText.substring(3).trim();

      return {
        type: "if",
        content: params,
        index: ifIdx,
        length: tagText.length,
      };
    }
  }

  private findMatchingCloseTag(
    content: string,
    startIndex: number,
    type: string,
  ): number {
    let depth = 0;
    let index = startIndex;

    while (index < content.length) {
      const nextOpen = content.indexOf("#" + type, index);
      const nextClose = content.indexOf("/" + type, index);

      if (nextClose === -1) return -1;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        index = nextOpen + type.length + 1;
      } else {
        if (depth === 0) {
          return nextClose;
        }
        depth--;
        index = nextClose + type.length + 1;
      }
    }
    return -1;
  }

  private replaceVariables(text: string, context: Context): string {
    return text.replace(/\$\{([^}]+)\}/g, (_, path) => {
      const val = this.resolvePath(path.trim(), context);
      return val !== undefined && val !== null ? String(val) : "";
    });
  }

  private resolvePath(path: string, context: Context): any {
    let currentCtx: Context | undefined = context;
    while (currentCtx) {
      const val = this.getValue(currentCtx.data, path);
      if (val !== undefined) return val;
      currentCtx = currentCtx.parent;
    }
    throw new Error(`Variable '${path}' not found in data context.`);
  }

  private getValue(obj: any, path: string): any {
    if (path === "this") return obj;
    const parts = path.split(".");
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }

  private processEach(
    expression: string,
    body: string,
    context: Context,
  ): string {
    const match = expression.match(/^(.*?)\s+as\s+(\w+)(?:\s*,\s*(\w+))?$/);
    if (!match) {
      throw new Error(
        `Invalid #each syntax: '${expression}'. Expected 'collection as item' or 'collection as item, index'`,
      );
    }

    const collectionPath = match[1];
    const itemName = match[2];
    const indexName = match[3];

    let collection: any;
    try {
      collection = this.resolvePath(collectionPath, context);
    } catch (e) {
      throw e;
    }

    if (!Array.isArray(collection)) {
      throw new Error(`Variable '${collectionPath}' is not an array.`);
    }

    let result = "";
    collection.forEach((item, index) => {
      const itemData: any = { [itemName]: item };
      if (indexName) {
        itemData[indexName] = index;
      }

      result += this.processBlock(body, {
        data: itemData,
        parent: context,
      });
    });

    return result;
  }

  private processIf(
    expression: string,
    body: string,
    context: Context,
  ): string {
    const condition = this.evaluateCondition(expression, context);
    const splitIndex = this.findElseIndex(body);

    if (condition) {
      const trueBlock =
        splitIndex !== -1 ? body.substring(0, splitIndex) : body;
      return this.processBlock(trueBlock, context);
    } else {
      if (splitIndex !== -1) {
        const falseBlock = body.substring(splitIndex + 5); // 5 is length of #else
        return this.processBlock(falseBlock, context);
      }
      return "";
    }
  }

  private findElseIndex(content: string): number {
    let depth = 0;
    let index = 0;
    while (index < content.length) {
      if (content.substring(index).startsWith("#if")) {
        depth++;
        index += 3;
      } else if (content.substring(index).startsWith("/if")) {
        depth--;
        index += 3;
      } else if (content.substring(index).startsWith("#else")) {
        if (depth === 0) return index;
        index += 5;
      } else {
        index++;
      }
    }
    return -1;
  }

  private evaluateCondition(expression: string, context: Context): boolean {
    expression = expression.trim();

    if (expression.startsWith("!")) {
      return !this.evaluateCondition(expression.substring(1), context);
    }

    const operators = ["==", "!=", ">=", "<=", ">", "<"];

    for (const op of operators) {
      if (expression.includes(op)) {
        const [left, right] = expression.split(op).map((s) => s.trim());
        const leftVal = this.resolveValOrLiteral(left, context);
        const rightVal = this.resolveValOrLiteral(right, context);

        switch (op) {
          case "==":
            return leftVal == rightVal;
          case "!=":
            return leftVal != rightVal;
          case ">":
            return Number(leftVal) > Number(rightVal);
          case "<":
            return Number(leftVal) < Number(rightVal);
          case ">=":
            return Number(leftVal) >= Number(rightVal);
          case "<=":
            return Number(leftVal) <= Number(rightVal);
        }
      }
    }

    const val = this.resolveValOrLiteral(expression, context);
    return !!val;
  }

  private resolveValOrLiteral(token: string, context: Context): any {
    if (token === "true") return true;
    if (token === "false") return false;
    if (token === "null") return null;
    if (token.startsWith("'") && token.endsWith("'")) return token.slice(1, -1);
    if (token.startsWith('"') && token.endsWith('"')) return token.slice(1, -1);
    if (!isNaN(Number(token))) return Number(token);

    return this.resolvePath(token, context);
  }
}
