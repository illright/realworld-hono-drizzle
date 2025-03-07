import { defineConfig } from "tsup";

export default defineConfig([
	{
		entryPoints: ["src/index.ts"],
		dts: true,
		sourcemap: true,
		format: ["esm"],
	},
	{
		entryPoints: ["src/index.ts"],
		dts: true,
		sourcemap: true,
		define: {
			"import.meta.dirname": "__dirname",
		},
	},
	{
		entryPoints: ["src/cli.ts"],
		sourcemap: true,
		define: {
			"import.meta.dirname": "__dirname",
		},
	},
]);
