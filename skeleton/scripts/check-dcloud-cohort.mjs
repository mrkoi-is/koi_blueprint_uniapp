import { readFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(
  await readFile(path.join(projectRoot, "package.json"), "utf8"),
);
const renovateConfig = JSON.parse(
  await readFile(path.join(projectRoot, "renovate.json"), "utf8"),
);
const dependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};
const errors = [];
const cohortEntries = Object.entries(dependencies).filter(
  ([name]) => name.startsWith("@dcloudio/") && name !== "@dcloudio/types",
);
const versions = new Set(cohortEntries.map(([, version]) => version));

for (const [name, version] of cohortEntries) {
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+-/u.test(version)) {
    errors.push(
      `${name} must use an exact DCloud cohort version (${version}).`,
    );
  }
}
if (versions.size !== 1) {
  errors.push(
    `DCloud packages must share one cohort, found: ${[...versions].join(", ")}.`,
  );
}
if (dependencies["@dcloudio/types"] !== "3.4.31") {
  errors.push(
    "@dcloudio/types must match the stable cohort peer version 3.4.31.",
  );
}
if (dependencies.vite !== "5.2.8") {
  errors.push("Vite must match @dcloudio/vite-plugin-uni peer version 5.2.8.");
}
if (dependencies.vue !== "3.4.21") {
  errors.push("Vue must stay aligned with the DCloud compiler at 3.4.21.");
}
if (dependencies.pinia !== "2.1.7") {
  errors.push("Pinia must stay on the DCloud-compatible 2.1.7 baseline.");
}

const compatibilityRule = renovateConfig.packageRules?.find(
  (rule) => rule.groupSlug === "uni-app-compatibility-cohort",
);
const requiredGroupedPackages = [
  "/^@dcloudio\\//",
  "@vue/compiler-sfc",
  "@vue/runtime-core",
  "pinia",
  "rollup",
  "vite",
  "vue",
];
if (
  compatibilityRule === undefined ||
  compatibilityRule.matchManagers?.includes("npm") !== true ||
  requiredGroupedPackages.some(
    (name) => compatibilityRule.matchPackageNames?.includes(name) !== true,
  ) ||
  compatibilityRule.separateMajorMinor !== false ||
  compatibilityRule.separateMinorPatch !== false
) {
  errors.push(
    "renovate.json must group the DCloud compiler and verified peers into one review.",
  );
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `PASS DCloud cohort ${[...versions][0]} (${String(
      cohortEntries.length,
    )} packages).`,
  );
}
