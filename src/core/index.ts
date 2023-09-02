import { createUnplugin } from "unplugin";

import { transform } from "./transform";
import type { Options } from "./types";

export default createUnplugin<Options | undefined>((_options) => ({
	name: "unplugin-vue-tsx-auto-props",
	enforce: "pre",
	transform(code, id) {
		if (!id.endsWith(".tsx")) {
			return;
		}

		return transform(code);
	},
}));
