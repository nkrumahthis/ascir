// Finds server actions and route handlers that never call can().
// Used by auth/find-unguarded.test.ts so the suite fails when one slips in.
// Route handlers wrapped in a GUARD_WRAPPERS call count as guarded.

import ts from "typescript";

export type Unguarded = { file: string; name: string };

const HTTP_METHODS = new Set([
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
]);

// Wrappers that authenticate the request themselves (no user, so no can()).
const GUARD_WRAPPERS = new Set(["withIngest"]);

function isGuardWrapperCall(node: ts.Node | undefined) {
  return (
    !!node &&
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    GUARD_WRAPPERS.has(node.expression.text)
  );
}

type FunctionNode =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction;

function isFunctionNode(node: ts.Node | undefined): node is FunctionNode {
  return (
    !!node &&
    (ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node))
  );
}

function hasUseServer(statements: readonly ts.Statement[]) {
  for (const statement of statements) {
    if (
      !ts.isExpressionStatement(statement) ||
      !ts.isStringLiteral(statement.expression)
    ) {
      return false;
    }
    if (statement.expression.text === "use server") return true;
  }
  return false;
}

function callsCan(fn: FunctionNode) {
  let found = false;
  const visit = (node: ts.Node) => {
    if (found) return;
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "can"
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  if (fn.body) visit(fn.body);
  return found;
}

function isExported(node: ts.Node) {
  return (
    ts.canHaveModifiers(node) &&
    !!ts
      .getModifiers(node)
      ?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
  );
}

// Top-level functions by local name, plus the names the module exports.
function collectTopLevel(source: ts.SourceFile) {
  const locals = new Map<string, FunctionNode>();
  const exported = new Map<string, string>(); // exported name -> local name
  const wrapped = new Set<string>(); // locals built by a guard wrapper

  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      locals.set(statement.name.text, statement);
      if (isExported(statement)) {
        const isDefault = ts
          .getModifiers(statement)
          ?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
        exported.set(isDefault ? "default" : statement.name.text, statement.name.text);
      }
    } else if (ts.isFunctionDeclaration(statement) && isExported(statement)) {
      locals.set("default", statement);
      exported.set("default", "default");
    } else if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && isFunctionNode(decl.initializer)) {
          locals.set(decl.name.text, decl.initializer);
          if (isExported(statement)) exported.set(decl.name.text, decl.name.text);
        } else if (ts.isIdentifier(decl.name)) {
          // Anything else (e.g. a factory call) is unguarded unless it's a
          // guard wrapper, since we can't see inside it.
          if (isGuardWrapperCall(decl.initializer)) wrapped.add(decl.name.text);
          if (isExported(statement)) exported.set(decl.name.text, decl.name.text);
        }
      }
    } else if (
      ts.isExportDeclaration(statement) &&
      !statement.moduleSpecifier &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const spec of statement.exportClause.elements) {
        exported.set(spec.name.text, (spec.propertyName ?? spec.name).text);
      }
    } else if (
      ts.isExportAssignment(statement) &&
      isFunctionNode(statement.expression)
    ) {
      locals.set("default", statement.expression);
      exported.set("default", "default");
    }
  }
  return { locals, exported, wrapped };
}

export function findUnguarded(file: string, code: string): Unguarded[] {
  const source = ts.createSourceFile(
    file,
    code,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const found: Unguarded[] = [];
  const report = (name: string, fn: FunctionNode | undefined) => {
    if (!fn || !callsCan(fn)) found.push({ file, name });
  };

  const { locals, exported, wrapped } = collectTopLevel(source);
  const isRoute = /(^|[\/])route\.(ts|tsx|js)$/.test(file);

  // A "use server" file: every export is a server action.
  if (hasUseServer(source.statements)) {
    for (const [name, local] of exported) report(name, locals.get(local));
  }

  // A route handler: every exported HTTP method.
  if (isRoute) {
    for (const [name, local] of exported) {
      if (HTTP_METHODS.has(name) && !wrapped.has(local)) {
        report(name, locals.get(local));
      }
    }
  }

  // Inline server actions: functions whose body starts with "use server".
  const visit = (node: ts.Node) => {
    if (
      isFunctionNode(node) &&
      node.body &&
      ts.isBlock(node.body) &&
      hasUseServer(node.body.statements)
    ) {
      const name =
        (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) &&
        node.name
          ? node.name.text
          : ts.isVariableDeclaration(node.parent) &&
              ts.isIdentifier(node.parent.name)
            ? node.parent.name.text
            : `<inline action at line ${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}>`;
      report(name, node);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  return found;
}
