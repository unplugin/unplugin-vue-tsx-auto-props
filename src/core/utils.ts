import type { ParseResult } from "@babel/parser";
import { parse as babelParse } from "@babel/parser";
import type { CallExpression, File, TSPropertySignature } from "@babel/types";
import * as t from "@babel/types";
import _traverse from "@babel/traverse";

const traverse =
  typeof (_traverse as any).default === "undefined"
    ? _traverse
    : ((_traverse as any).default as typeof _traverse);

type Parsed = ParseResult<t.File>;

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
): t.TSPropertySignature[] | null {
  let result: t.TSPropertySignature[] | null = null;
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
function findPropTypeMemberKeys(parsed: Parsed, node: t.CallExpression) {
  if (node.typeParameters) {
    const [param] = node.typeParameters.params;
    if (t.isTSTypeLiteral(param)) {
      return param.members.map((member: any) => member.key?.name);
    }
    if (!t.isTSTypeReference(param) || !("name" in param.typeName)) {
      return [];
    }
    const { name: typeName } = param.typeName;
    const typeDefinitionMembers = findTypeDefinitionMembersByName(
      parsed,
      typeName,
    );

    return (
      typeDefinitionMembers?.map((member) => (member.key as any)?.name) ?? []
    );
  }

  const [arg] = node.arguments;

  if (t.isArrowFunctionExpression(arg) || t.isFunctionExpression(arg)) {
    const propsParam = arg.params[0];
    if (
      propsParam.typeAnnotation &&
      "typeAnnotation" in propsParam.typeAnnotation
    ) {
      if ("typeName" in propsParam.typeAnnotation.typeAnnotation) {
        const { name: typeName } = (
          propsParam.typeAnnotation.typeAnnotation as any
        ).typeName;
        const typeDefinitionMembers = findTypeDefinitionMembersByName(
          parsed,
          typeName,
        );

        return (
          typeDefinitionMembers?.map((member: any) => member.key?.name) ?? []
        );
      } else if (t.isTSTypeLiteral(propsParam.typeAnnotation.typeAnnotation)) {
        return propsParam.typeAnnotation.typeAnnotation.members.map(
          (member: any) => member.key?.name,
        );
      }
    }
  }

  return [];
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
