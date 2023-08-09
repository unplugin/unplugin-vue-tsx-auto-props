import type { ParseResult } from "@babel/parser";
import { parse as babelParse } from "@babel/parser";
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

const getKeyName = (node: any) => node.key.name;

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

function resolveTypeDefinitionByTypeAnnotation(
  parsed: Parsed,
  typeAnnotation: t.TSTypeAnnotation | t.TSTypeReference | t.TSTypeLiteral,
): string[] {
  if ("typeName" in typeAnnotation && "name" in typeAnnotation.typeName) {
    const { name: typeName } = typeAnnotation.typeName;
    const typeDefinitionMembers = findTypeDefinitionMembersByName(
      parsed,
      typeName,
    );

    return typeDefinitionMembers?.map(getKeyName) ?? [];
  } else if (t.isTSTypeLiteral(typeAnnotation)) {
    return typeAnnotation.members.map(getKeyName);
  }

  return [];
}

const isAllowedTypeAnnotation = (
  typeAnnotation: any,
): typeAnnotation is t.TSTypeLiteral | t.TSTypeReference =>
  t.isTSTypeLiteral(typeAnnotation) ||
  (t.isTSTypeReference(typeAnnotation) &&
    "typeName" in typeAnnotation &&
    "name" in typeAnnotation.typeName);

/** Get member keys from a CallExpression, extracts its typeDefinition */
function findPropTypeMemberKeys(parsed: Parsed, node: t.CallExpression) {
  if (node.typeParameters) {
    const [param] = node.typeParameters.params;
    if (t.isTSTypeLiteral(param)) {
      return param.members.map(getKeyName);
    }
    if (!t.isTSTypeReference(param) || !("name" in param.typeName)) {
      return [];
    }
    const { name: typeName } = param.typeName;
    const typeDefinitionMembers = findTypeDefinitionMembersByName(
      parsed,
      typeName,
    );

    return typeDefinitionMembers?.map(getKeyName) ?? [];
  }

  const [arg] = node.arguments;

  if (t.isObjectExpression(arg)) {
    const properties = arg.properties.filter(
      (p) => t.isObjectProperty(p) || t.isObjectMethod(p),
    );
    const propsPropetry = properties.find(
      (p) => t.isObjectProperty(p) && "name" in p.key && p.key.name === "props",
    );
    // It already has a props property, so we don't need to add it
    if (propsPropetry) {
      return [];
    }
    const setupProperty = properties.find(
      (p) =>
        (t.isObjectMethod(p) || t.isObjectProperty(p)) &&
        "name" in p.key &&
        p.key.name === "setup",
    );

    if (
      !setupProperty ||
      !(t.isObjectMethod(setupProperty) || t.isObjectProperty(setupProperty))
    ) {
      return [];
    }
    const setup = (
      t.isObjectMethod(setupProperty) ? setupProperty : setupProperty.value
    ) as t.ObjectMethod | t.ArrowFunctionExpression;

    const [propsParam] = setup.params;

    const typeAnnotation =
      "typeAnnotation" in propsParam &&
      propsParam.typeAnnotation &&
      "typeAnnotation" in propsParam.typeAnnotation &&
      propsParam.typeAnnotation?.typeAnnotation;

    if (!typeAnnotation || !isAllowedTypeAnnotation(typeAnnotation)) {
      return [];
    }

    return resolveTypeDefinitionByTypeAnnotation(parsed, typeAnnotation);
  }

  if (t.isArrowFunctionExpression(arg) || t.isFunctionExpression(arg)) {
    const propsParam = arg.params[0];
    if (
      propsParam?.typeAnnotation &&
      "typeAnnotation" in propsParam.typeAnnotation &&
      isAllowedTypeAnnotation(propsParam.typeAnnotation.typeAnnotation)
    ) {
      return resolveTypeDefinitionByTypeAnnotation(
        parsed,
        propsParam.typeAnnotation.typeAnnotation,
      );
    }
  }

  return [];
}

export function findDefineComponentCall(
  parsed: Parsed,
): [componentName: string, props: string[], end: number][] {
  const result: FindDefineComponentCallReturn = [];
  traverse(parsed, {
    VariableDeclarator({ node: { id, init, end } }) {
      if (
        t.isCallExpression(init) &&
        t.isIdentifier(init?.callee) &&
        t.isIdentifier(id) &&
        init.callee.name === "defineComponent"
      ) {
        const memberKeys = findPropTypeMemberKeys(parsed, init);
        if (memberKeys.length > 0) {
          result.push([id.name, memberKeys, end!]);
        }
      }
    },
  });

  return result;
}
