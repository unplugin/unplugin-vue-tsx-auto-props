import { addVitePlugin, addWebpackPlugin, defineNuxtModule } from "@nuxt/kit";
import type { ModuleDefinition } from "@nuxt/schema";

import { name, version } from "../package.json";

import VitePlugin from "./vite";
import WebpackPlugin from "./webpack";
import type { Options } from "./core/types";

export default defineNuxtModule<Options>({
  meta: {
    name,
    version,
    configKey: "pkg-name",
    compatibility: {
      bridge: true,
    },
  },
  defaults: {},
  setup(options) {
    addVitePlugin(VitePlugin(options));
    addWebpackPlugin(WebpackPlugin(options));
  },
}) as ModuleDefinition<Options>;
