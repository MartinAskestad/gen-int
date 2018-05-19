import minimist from "minimist";
import { get } from "request-promise-native";
import {
  EmitHint,
  NewLineKind,
  ScriptKind,
  ScriptTarget,
  SyntaxKind,
  createArrayTypeNode,
  createIdentifier,
  createInterfaceDeclaration,
  createKeywordTypeNode,
  createPrinter,
  createPropertySignature,
  createSourceFile,
  createToken,
  createTypeReferenceNode
} from "typescript";
import fs = require("fs");

const exportToken = createToken(SyntaxKind.ExportKeyword);

export function saveInterfaces(interfaces) {
  const resultfile = createSourceFile(
    "temp.ts",
    "// Martin was here",
    ScriptTarget.Latest,
    false,
    ScriptKind.TS
  );
  const printer = createPrinter({
    newLine: NewLineKind.LineFeed
  });

  const ts = interfaces
    .map(intf => {
      printer.printNode(EmitHint.Unspecified, intf, resultfile);
      return printer.printNode(EmitHint.Unspecified, intf, resultfile);
    })
    .join("\n");
  const res = fs.writeFileSync("models.ts", ts);
}

export function getDataType(property) {
  if (typeof property["$ref"] !== "undefined") {
    const typename = (<string>property["$ref"]).replace("#/definitions/", "");
    return createTypeReferenceNode(typename, undefined);
  }
  switch (property.type) {
    case "integer":
      return createKeywordTypeNode(SyntaxKind.NumberKeyword);
    case "string":
      return createKeywordTypeNode(SyntaxKind.StringKeyword);
    case "boolean":
      return createKeywordTypeNode(SyntaxKind.BooleanKeyword);
    case "array":
      return createArrayTypeNode(getDataType(property.items));
    default:
      return createTypeReferenceNode(property.type, undefined);
  }
}
export function createPropertySignatures(definition) {
  return Object.keys(definition.properties).map(propertyKey => {
    const dataType = getDataType(definition.properties[propertyKey]);
    const questionMark =
      !Object.keys(definition).includes("required") ||
      !definition.required.includes(propertyKey)
        ? createToken(SyntaxKind.QuestionToken)
        : undefined;

    return createPropertySignature(
      undefined,
      propertyKey,
      questionMark,
      dataType,
      undefined
    );
  });
}

export function createInterfaceFromDefinition(name: string, definition: any) {
  const identifier = createIdentifier(name);
  const properties = createPropertySignatures(definition);
  const intf = createInterfaceDeclaration(
    undefined,
    [exportToken],
    identifier,
    undefined,
    undefined,
    properties
  );
  return intf;
}

export function parseDefinitions({ definitions }) {
  const interfaces = Object.keys(definitions).map(key => {
    return createInterfaceFromDefinition(key, definitions[key]);
  });

  saveInterfaces(interfaces);
}

(async function() {
  // const url = `http://petstore.swagger.io/v2/swagger.json`;
  const url = minimist(process.argv.slice(2))._[0];
  const result = await get(url, { json: true });
  const swaggerJson = await result;
  parseDefinitions(swaggerJson);
})();
