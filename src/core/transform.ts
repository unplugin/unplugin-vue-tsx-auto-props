import MagicString from "magic-string";

import {
	findDefineComponentCall,
	haveDefineComponentImport,
	parse,
} from "./utils";

const generateDefineProps = (name: string, props: string[]) =>
	`\nObject.defineProperty(${name}, "props", {
  value: ${JSON.stringify(props)},
});`;

export function transform(code: string) {
	const parsed = parse(code);
	if (!haveDefineComponentImport(parsed)) {
		return;
	}
	const magicString = new MagicString(code);
	const defineComponentCalls = findDefineComponentCall(parsed);
	for (const [name, props, start] of defineComponentCalls) {
		magicString.appendRight(start + 1, generateDefineProps(name, props));
	}

	return { code: magicString.toString(), map: magicString.generateMap() };
}
