import { readFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(
  await readFile(path.join(projectRoot, "package.json"), "utf8"),
);
const renovateConfig = JSON.parse(
  await readFile(path.join(projectRoot, "renovate.json"), "utf8"),
);
const lock = JSON.parse(
  await readFile(path.join(projectRoot, "package-lock.json"), "utf8"),
);
const dependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};
const errors = [];
const cohortEntries = Object.entries(dependencies).filter(
  ([name]) => name.startsWith("@dcloudio/") && name !== "@dcloudio/types",
);
const required = [
  "@dcloudio/uni-app",
  "@dcloudio/uni-components",
  "@dcloudio/uni-h5",
  "@dcloudio/uni-mp-weixin",
  "@dcloudio/uni-cli-shared",
  "@dcloudio/uni-stacktracey",
  "@dcloudio/vite-plugin-uni",
];
const peers = {
  "@dcloudio/types": "3.4.31",
  "@vue/compiler-sfc": "3.4.21",
  "@vue/runtime-core": "3.4.21",
  pinia: "2.1.7",
  rollup: "4.14.3",
  vite: "5.2.8",
  vue: "3.4.21",
};
const cohort = dependencies["@dcloudio/uni-app"];
for (const name of required) {
  if (!Object.hasOwn(dependencies, name)) {
    errors.push(`Missing required DCloud package ${name}.`);
  }
}
for (const [name, version] of cohortEntries) {
  if (
    typeof version !== "string" ||
    !/^\d+\.\d+\.\d+-[0-9]+$/u.test(version) ||
    version !== cohort
  ) {
    errors.push(`${name} must use exact cohort ${cohort} (found ${version}).`);
  }
}
for (const [name, expected] of Object.entries(peers)) {
  if (dependencies[name] !== expected) {
    errors.push(`${name} must use the verified peer version ${expected}.`);
  }
}
for (const [name, version] of [...cohortEntries, ...Object.entries(peers)]) {
  const section = Object.hasOwn(packageJson.dependencies ?? {}, name)
    ? "dependencies"
    : "devDependencies";
  if (
    lock.packages?.[""]?.[section]?.[name] !== version ||
    lock.packages?.[`node_modules/${name}`]?.version !== version
  ) {
    errors.push(
      `${name} lock entries must match the declared version ${version}.`,
    );
  }
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
    `PASS DCloud cohort ${cohort} (${String(cohortEntries.length)} packages).`,
  );
}
