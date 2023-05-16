import type { Options } from "./types";

import unplugin from ".";

export default function (options: Options) {
  return {
    name: "unplugin-vue-tsx-auto-props",
    hooks: {
      "astro:config:setup": async (astro: any) => {
        astro.config.vite.plugins ||= [];
        astro.config.vite.plugins.push(unplugin.vite(options));
      },
    },
  };
}
