import type { ParseResult } from "@babel/parser";
import { parse as babelParse } from "@babel/parser";
import type { CallExpression, File, TSPropertySignature } from "@babel/types";
import * as t from "@babel/types";
import traverse from "@babel/traverse";

type Parsed = ParseResult<File>;

export const parse = (code: string) =>
  babelParse(code, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });

/** Determine if the code has a `defineComponent` import from `vue` */
export function haveDefineComponentImport(parsed: Parsed) {
  let haveDefineComponentValueImport = false;
  traverse(parsed, {
    ImportDeclaration({ node }) {
      if (node.source.value === "vue") {
        for (const specifier of node.specifiers) {
          if (
            t.isImportSpecifier(specifier) &&
            "name" in specifier.imported &&
            specifier.imported.name === "defineComponent"
          ) {
            haveDefineComponentValueImport = true;
          }
        }
      }
    },
  });

  return haveDefineComponentValueImport;
}

/** Get the property signatures from type definition node */
function findTypeDefinitionMembersByName(
  parsed: Parsed,
  name: string,
): TSPropertySignature[] | null {
  let result: TSPropertySignature[] | null = null;
  traverse(parsed, {
    TSInterfaceDeclaration({ node }) {
      if (node.id.name === name) {
        result = node.body.body as any;
      }
    },
    TSTypeAliasDeclaration({ node }) {
      if (node.id.name === name) {
        result = (node.typeAnnotation as any).members;
      }
    },
  });

  return result;
}

/** Get member keys from a CallExpression, extracts its typeDefinition */
function findPropTypeMemberKeys(parsed: Parsed, node: CallExpression) {
  let memberKeys: string[] = [];
  const [arg] = node.arguments;

  if (t.isArrowFunctionExpression(arg) || t.isFunctionExpression(arg)) {
    const propsParam = arg.params[0];
    if (
      propsParam.typeAnnotation &&
      "typeAnnotation" in propsParam.typeAnnotation
    ) {
      const { name: typeName } = (
        propsParam.typeAnnotation.typeAnnotation as any
      ).typeName;
      const typeDefinitionMembers = findTypeDefinitionMembersByName(
        parsed,
        typeName,
      );
      memberKeys =
        typeDefinitionMembers?.map((member) => (member.key as any)?.name) ?? [];
    }
  }

  return memberKeys;
}

/** [component name, props, end range] */
type FindDefineComponentCallReturn = [string, string[], number][];
export function findDefineComponentCall(
  parsed: Parsed,
): FindDefineComponentCallReturn {
  const result: FindDefineComponentCallReturn = [];
  traverse(parsed, {
    VariableDeclarator(path) {
      const { node } = path;
      const { init } = node;
      if (
        t.isCallExpression(init) &&
        t.isIdentifier(init?.callee) &&
        t.isIdentifier(node.id) &&
        init.callee.name === "defineComponent"
      ) {
        const memberKeys = findPropTypeMemberKeys(parsed, init);
        if (memberKeys.length > 0) {
          result.push([node.id.name, memberKeys, node.end!]);
        }
      }
    },
  });

  return result;
}
