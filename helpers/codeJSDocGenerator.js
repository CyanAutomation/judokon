// jsdoc-generator.js

const fs = require("fs");
const glob = require("glob");
const babelParser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generator = require("@babel/generator").default;

// Config
const SOURCE_GLOB = "**/*.js";
const IGNORE_FOLDERS = ["node_modules", "dist"];

/**
 * Check if a node (function) already has a JSDoc comment
 */
function hasJSDoc(node) {
  return (
    node.leadingComments &&
    node.leadingComments.some(
      (comment) => comment.type === "CommentBlock" && comment.value.startsWith("*")
    )
  );
}

/**
 * Guess param type from heuristics (based on name or default value)
 */
function guessParamType(param) {
  if (param.typeAnnotation) {
    return babelParser.generate(param.typeAnnotation).code; // for TypeScript
  }
  const name = param.name?.toLowerCase() || "";

  if (param.default) {
    switch (param.default.type) {
      case "StringLiteral":
        return "string";
      case "NumericLiteral":
        return "number";
      case "BooleanLiteral":
        return "boolean";
      case "ArrayExpression":
        return "Array";
      default:
        return "any";
    }
  }

  if (name.startsWith("is") || name.startsWith("has") || name.startsWith("can")) {
    return "boolean";
  }
  if (
    name.includes("count") ||
    name.includes("age") ||
    name.includes("size") ||
    name.includes("length")
  ) {
    return "number";
  }
  if (name.includes("name") || name.includes("title") || name.includes("label")) {
    return "string";
  }

  return "any";
}

/**
 * Guess return type based on function body
 */
function guessReturnType(body) {
  let type = "any"; // default
  traverse(
    body,
    {
      ReturnStatement(path) {
        const argument = path.node.argument;
        if (!argument) {
          type = "void"; // empty return
          path.stop();
          return;
        }
        switch (argument.type) {
          case "NumericLiteral":
            type = "number";
            path.stop();
            break;
          case "StringLiteral":
            type = "string";
            path.stop();
            break;
          case "BooleanLiteral":
            type = "boolean";
            path.stop();
            break;
          case "ArrayExpression":
            type = "Array";
            path.stop();
            break;
          default:
            type = "any";
        }
      }
    },
    body.scope,
    body.parentPath
  );

  return type;
}

/**
 * Generate a JSDoc block with inferred types
 */
function generateJSDocTemplate(params = [], functionBody) {
  let lines = ["/**", " * Description."];

  params.forEach((param) => {
    const inferredType = guessParamType(param);
    lines.push(` * @param {${inferredType}} ${param.name}`);
  });

  const returnType = guessReturnType(functionBody);
  if (returnType !== "void") {
    lines.push(` * @returns {${returnType}}`);
  }

  lines.push(" */");
  return lines.join("\n");
}

/**
 * Process a single JS file
 */
function processFile(filePath) {
  try {
    const code = fs.readFileSync(filePath, "utf8");
    const ast = babelParser.parse(code, {
      sourceType: "module",
      plugins: ["jsx", "classProperties"]
    });

    let hasModifications = false;

    traverse(ast, {
      FunctionDeclaration(path) {
        if (!hasJSDoc(path.node)) {
          const jsdoc = generateJSDocTemplate(path.node.params, path.get("body"));
          path.addComment("leading", jsdoc, true);
          hasModifications = true;
        }
      },
      ClassMethod(path) {
        if (!hasJSDoc(path.node)) {
          const jsdoc = generateJSDocTemplate(path.node.params, path.get("body"));
          path.addComment("leading", jsdoc, true);
          hasModifications = true;
        }
      },
      VariableDeclarator(path) {
        if (path.node.init && path.node.init.type === "ArrowFunctionExpression") {
          if (!hasJSDoc(path.node)) {
            const jsdoc = generateJSDocTemplate(path.node.init.params, path.get("init.body"));
            path.addComment("leading", jsdoc, true);
            hasModifications = true;
          }
        }
      }
    });

    if (hasModifications) {
      const output = generator(ast, {}, code);
      fs.writeFileSync(filePath, output.code, "utf8");
      console.log(`Updated JSDoc in: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return false;
  }
}

/**
 * Main function
 */
function main() {
  const files = glob.sync(SOURCE_GLOB, {
    ignore: IGNORE_FOLDERS.map((folder) => `${folder}/**`)
  });

  let updatedFilesCount = 0;
  files.forEach((file) => {
    if (processFile(file)) {
      updatedFilesCount++;
    }
  });

  console.log(`✅ JSDoc generation complete. Updated ${updatedFilesCount} files.`);
  if (updatedFilesCount === 0) {
    console.log("No changes detected.");
    process.exit(0); // Exit without error
  } else {
    fs.writeFileSync("summary.log", `Updated ${updatedFilesCount} files.`);
  }
}

// Run
main();
