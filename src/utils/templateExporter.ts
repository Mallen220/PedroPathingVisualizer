import type { Line, Point, SequenceItem, Shape, Settings } from "../types";
import pkg from "../../package.json";

// We define a flexible Context interface
interface Context {
  data: any;
  parent?: Context;
}

export interface TemplateData {
  startPoint: Point;
  lines: Line[];
  sequence: SequenceItem[];
  shapes: Shape[];
  settings: Settings | undefined;
  pkg: typeof pkg;
  date: Date;
  packageName?: string;
  className?: string;
}

export class TemplateEngine {
  private template: string;
  private data: any;

  constructor(template: string, data: any) {
    this.template = template;
    this.data = data;
  }

  public async render(): Promise<string> {
    try {
      return this.processBlock(this.template, { data: this.data });
    } catch (e: any) {
      throw new Error(`Template rendering error: ${e.message}`);
    }
  }

  private processBlock(content: string, context: Context): string {
    let result = "";
    let currentIndex = 0;

    while (currentIndex < content.length) {
      const nextVar = content.indexOf("{{", currentIndex);
      const nextBlock = content.indexOf("{%", currentIndex);

      let type: "var" | "block" | null = null;
      let nextIndex = -1;

      if (nextVar !== -1 && (nextBlock === -1 || nextVar < nextBlock)) {
        type = "var";
        nextIndex = nextVar;
      } else if (nextBlock !== -1) {
        type = "block";
        nextIndex = nextBlock;
      }

      if (type === null) {
        result += content.substring(currentIndex);
        break;
      }

      result += content.substring(currentIndex, nextIndex);
      currentIndex = nextIndex;

      if (type === "var") {
        const endVar = content.indexOf("}}", currentIndex);
        if (endVar === -1) {
           result += "{{";
           currentIndex += 2;
           continue;
        }

        const varExpression = content.substring(currentIndex + 2, endVar).trim();
        result += this.resolveVariable(varExpression, context);
        currentIndex = endVar + 2;

      } else {
        const endBlockTag = content.indexOf("%}", currentIndex);
        if (endBlockTag === -1) {
           result += "{%";
           currentIndex += 2;
           continue;
        }

        const tagContent = content.substring(currentIndex + 2, endBlockTag).trim();
        const tagFullLength = (endBlockTag + 2) - currentIndex;

        const tagParts = tagContent.split(/\s+/);
        const tagName = tagParts[0];

        if (tagName === "if") {
             const condition = tagContent.substring(2).trim();
             const blockEndIndex = this.findMatchingCloseTag(content, currentIndex + tagFullLength, "if", "endif");

             if (blockEndIndex === -1) {
                 result += `<<Error: Unclosed if block starting at ${currentIndex}>>`;
                 currentIndex += tagFullLength;
                 continue;
             }

             const innerContent = content.substring(currentIndex + tagFullLength, blockEndIndex);
             result += this.processIf(condition, innerContent, context);

             const closeTagEnd = content.indexOf("%}", blockEndIndex);
             currentIndex = closeTagEnd + 2;

        } else if (tagName === "for") {
             const expression = tagContent.substring(3).trim();
             const blockEndIndex = this.findMatchingCloseTag(content, currentIndex + tagFullLength, "for", "endfor");

             if (blockEndIndex === -1) {
                 result += `<<Error: Unclosed for block starting at ${currentIndex}>>`;
                 currentIndex += tagFullLength;
                 continue;
             }

             const innerContent = content.substring(currentIndex + tagFullLength, blockEndIndex);
             result += this.processFor(expression, innerContent, context);

             const closeTagEnd = content.indexOf("%}", blockEndIndex);
             currentIndex = closeTagEnd + 2;

        } else {
            result += `<<Error: Unexpected tag '${tagName}'>>`;
            currentIndex += tagFullLength;
        }
      }
    }
    return result;
  }

  private findMatchingCloseTag(content: string, startIndex: number, openTag: string, closeTag: string): number {
      let depth = 0;
      let index = startIndex;

      while (index < content.length) {
          const tagStart = content.indexOf("{%", index);
          if (tagStart === -1) return -1;

          const tagEnd = content.indexOf("%}", tagStart);
          if (tagEnd === -1) return -1;

          const tagContent = content.substring(tagStart + 2, tagEnd).trim();
          const tagName = tagContent.split(/\s+/)[0];

          if (tagName === openTag) {
              depth++;
          } else if (tagName === closeTag) {
              if (depth === 0) return tagStart;
              depth--;
          }

          index = tagEnd + 2;
      }
      return -1;
  }

  private resolveVariable(path: string, context: Context): string {
    try {
        if (path.match(/[\+\-\*\/]/)) {
            return String(this.evaluateExpression(path, context));
        }

        let val = this.resolvePath(path, context);
        if (val !== undefined) return String(val);

        return `<<Error: ${path}>>`;
    } catch (e) {
        return `<<Error: ${path}>>`;
    }
  }

  private evaluateExpression(expr: string, context: Context): any {
      const tokens = this.tokenizeExpression(expr);

      if (tokens.length === 0) return undefined;
      if (tokens.length === 1) return this.resolveToken(tokens[0], context);

      // Handle operators with precedence
      // 1. Handle * and / first
      let intermediateTokens: (string|number)[] = [];

      // Resolve all non-operator tokens first for simplicity
      const resolvedTokens = tokens.map(t => {
          if (["+", "-", "*", "/", "==", "!=", ">", "<", ">=", "<="].includes(t)) return t;
          return this.resolveToken(t, context);
      });

      // Pass 1: * and /
      for (let i = 0; i < resolvedTokens.length; i++) {
          const token = resolvedTokens[i];
          if (token === "*" || token === "/") {
              const left = intermediateTokens.pop();
              const right = resolvedTokens[i+1];
              i++; // skip next operand

              if (token === "*") {
                  intermediateTokens.push(Number(left) * Number(right));
              } else {
                  intermediateTokens.push(Number(left) / Number(right));
              }
          } else {
              intermediateTokens.push(token);
          }
      }

      // Pass 2: + and -
      let result = intermediateTokens[0];
      for (let i = 1; i < intermediateTokens.length; i += 2) {
          const op = intermediateTokens[i];
          const right = intermediateTokens[i+1];

          if (op === "+") {
              if (typeof result === 'string' || typeof right === 'string') {
                  result = String(result) + String(right);
              } else {
                  result = Number(result) + Number(right);
              }
          } else if (op === "-") {
              result = Number(result) - Number(right);
          } else if (op === "==") result = result == right;
          else if (op === "!=") result = result != right;
          else if (op === ">") result = Number(result) > Number(right);
          else if (op === "<") result = Number(result) < Number(right);
          else if (op === ">=") result = Number(result) >= Number(right);
          else if (op === "<=") result = Number(result) <= Number(right);
      }

      return result;
  }

  private tokenizeExpression(expr: string): string[] {
      const tokens: string[] = [];
      let currentToken = "";
      let inQuote: string | null = null;

      for (let i = 0; i < expr.length; i++) {
          const char = expr[i];

          if (inQuote) {
              currentToken += char;
              if (char === inQuote) {
                  inQuote = null;
                  tokens.push(currentToken);
                  currentToken = "";
              }
          } else {
              if (char === '"' || char === "'") {
                  if (currentToken.trim()) tokens.push(currentToken.trim());
                  currentToken = char;
                  inQuote = char;
              } else if (["+", "-", "*", "/", "(", ")", ">", "<", "=", "!"].includes(char)) {
                  if (currentToken.trim()) tokens.push(currentToken.trim());
                  currentToken = "";

                  const nextChar = expr[i+1];
                  if (char === '=' && nextChar === '=') { tokens.push("=="); i++; }
                  else if (char === '!' && nextChar === '=') { tokens.push("!="); i++; }
                  else if (char === '>' && nextChar === '=') { tokens.push(">="); i++; }
                  else if (char === '<' && nextChar === '=') { tokens.push("<="); i++; }
                  else tokens.push(char);

              } else if (/\s/.test(char)) {
                  if (currentToken.trim()) tokens.push(currentToken.trim());
                  currentToken = "";
              } else {
                  currentToken += char;
              }
          }
      }
      if (currentToken.trim()) tokens.push(currentToken.trim());

      return tokens;
  }

  private resolveToken(token: any, context: Context): any {
      if (typeof token !== 'string') return token; // already resolved/number
      if (token.startsWith('"') || token.startsWith("'")) {
          return token.slice(1, -1);
      }
      if (!isNaN(Number(token))) return Number(token);
      if (token === "true") return true;
      if (token === "false") return false;
      if (token === "null") return null;

      const val = this.resolvePath(token, context);
      return val;
  }

  private resolvePath(path: string, context: Context): any {
    const tokens = path.replace(/\]/g, "").split(/[\.\[]/);

    let currentCtx: Context | undefined = context;
    let val: any = undefined;

    const rootToken = tokens[0];

    while (currentCtx) {
        if (currentCtx.data && rootToken in currentCtx.data) {
            val = currentCtx.data[rootToken];
            break;
        }
        currentCtx = currentCtx.parent;
    }

    if (val === undefined) return undefined;

    for (let i = 1; i < tokens.length; i++) {
        if (val === null || val === undefined) return undefined;
        const key = tokens[i];

        if (key in val) {
            val = val[key];
        } else {
             return this.evaluateComplexPath(path, context);
        }
    }
    return val;
  }

  private evaluateComplexPath(fullPath: string, context: Context): any {
      let cursor = 0;

      const parseIdentifier = () => {
          const start = cursor;
          while (cursor < fullPath.length && /[a-zA-Z0-9_$]/.test(fullPath[cursor])) {
              cursor++;
          }
          return fullPath.substring(start, cursor);
      };

      const rootName = parseIdentifier();
      if (!rootName) return undefined;

      let val: any = undefined;
       let currentCtx: Context | undefined = context;
        while (currentCtx) {
            if (currentCtx.data && rootName in currentCtx.data) {
                val = currentCtx.data[rootName];
                break;
            }
            currentCtx = currentCtx.parent;
        }
       if (val === undefined) return undefined;

       while (cursor < fullPath.length) {
           const char = fullPath[cursor];
           if (char === '.') {
               cursor++;
               const prop = parseIdentifier();
               if (val === undefined || val === null) return undefined;
               val = val[prop];
           } else if (char === '[') {
               cursor++;
               let bracketDepth = 1;
               let startInner = cursor;
               while (cursor < fullPath.length && bracketDepth > 0) {
                   if (fullPath[cursor] === '[') bracketDepth++;
                   else if (fullPath[cursor] === ']') bracketDepth--;
                   if (bracketDepth > 0) cursor++;
               }

               if (bracketDepth !== 0) return undefined;

               const innerExpr = fullPath.substring(startInner, cursor);
               cursor++;

               const indexVal = this.evaluateExpression(innerExpr, context);
               if (val === undefined || val === null) return undefined;
               val = val[indexVal];
           } else {
               break;
           }
       }
       return val;
  }

  private processFor(expression: string, body: string, context: Context): string {
    const match = expression.match(/^(.*?)\s+in\s+(.*?)$/);
    if (!match) return `<<Error: Invalid for loop syntax '${expression}'>>`;

    const itemName = match[1].trim();
    const collectionPath = match[2].trim();

    let collection: any;
    try {
        collection = this.evaluateExpression(collectionPath, context);
    } catch (e) {
        return `<<Error: Collection '${collectionPath}' not found>>`;
    }

    if (!Array.isArray(collection)) {
        if (collection === undefined) return `<<Error: Collection '${collectionPath}' not found>>`;
        return `<<Error: '${collectionPath}' is not an array (got ${typeof collection})>>`;
    }

    let result = "";
    collection.forEach((item, index) => {
      const loopCtx = {
          index: index,
          index1: index + 1,
          first: index === 0,
          last: index === collection.length - 1,
          length: collection.length
      };

      const itemData: any = {
          [itemName]: item,
          loop: loopCtx
      };

      result += this.processBlock(body, {
        data: itemData,
        parent: context
      });
    });

    return result;
  }

  private processIf(condition: string, body: string, context: Context): string {
    const elseIndex = this.findElseIndex(body);

    const shouldRender = this.evaluateCondition(condition, context);

    if (shouldRender) {
        const trueBlock = elseIndex !== -1 ? body.substring(0, elseIndex) : body;
        return this.processBlock(trueBlock, context);
    } else {
        if (elseIndex !== -1) {
            const elseTagEnd = body.indexOf("%}", elseIndex);
            const falseBlock = body.substring(elseTagEnd + 2);
            return this.processBlock(falseBlock, context);
        }
        return "";
    }
  }

  private findElseIndex(content: string): number {
      let depth = 0;
      let index = 0;
      while (index < content.length) {
          const nextTag = content.indexOf("{%", index);
          if (nextTag === -1) break;

          const tagEnd = content.indexOf("%}", nextTag);
          if (tagEnd === -1) break;

          const tagContent = content.substring(nextTag + 2, tagEnd).trim();
          const tagName = tagContent.split(/\s+/)[0];

          if (tagName === "if" || tagName === "for") {
              depth++;
          } else if (tagName === "endif" || tagName === "endfor") {
              depth--;
          } else if (tagName === "else" || tagName === "elif") {
              if (depth === 0) return nextTag;
          }

          index = tagEnd + 2;
      }
      return -1;
  }

  private evaluateCondition(expression: string, context: Context): boolean {
    return !!this.evaluateExpression(expression, context);
  }

  private resolveValOrLiteral(token: string, context: Context): any {
    return this.resolveToken(token, context);
  }
}
