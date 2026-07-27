import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const outputRoot = path.join(projectRoot, "dist", "build", "mp-weixin");
const pagesConfigPath = path.join(projectRoot, "src", "pages.json");
const defaultPackageLimit = 1_800 * 1024;
const defaultTotalLimit = 18 * 1024 * 1024;
const errors = [];

function readLimit(primaryName, fallback, legacyName) {
  const selectedName =
    process.env[primaryName] !== undefined
      ? primaryName
      : legacyName !== undefined && process.env[legacyName] !== undefined
        ? legacyName
        : undefined;
  if (selectedName === undefined) {
    return fallback;
  }

  const value = Number(process.env[selectedName]);
  if (!Number.isSafeInteger(value) || value <= 0) {
    errors.push(
      `${selectedName} must be a positive integer number of bytes (${String(
        process.env[selectedName],
      )}).`,
    );
    return fallback;
  }
  return value;
}

const mainPackageLimit = readLimit(
  "KOI_MP_MAIN_PACKAGE_LIMIT_BYTES",
  defaultPackageLimit,
  "KOI_MP_PACKAGE_LIMIT_BYTES",
);
const subpackageLimit = readLimit(
  "KOI_MP_SUBPACKAGE_LIMIT_BYTES",
  defaultPackageLimit,
);
const totalLimit = readLimit("KOI_MP_TOTAL_LIMIT_BYTES", defaultTotalLimit);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

let pagesConfig;
try {
  pagesConfig = JSON.parse(await readFile(pagesConfigPath, "utf8"));
} catch (cause) {
  errors.push(`src/pages.json: cannot read valid JSON (${cause}).`);
}

const subpackageRoots = [];
if (pagesConfig !== undefined) {
  if (
    pagesConfig.subPackages !== undefined &&
    !Array.isArray(pagesConfig.subPackages)
  ) {
    errors.push("src/pages.json: subPackages must be an array.");
  } else if (Array.isArray(pagesConfig.subPackages)) {
    for (const [index, subpackage] of pagesConfig.subPackages.entries()) {
      const root = subpackage?.root;
      if (typeof root !== "string" || root.length === 0) {
        errors.push(
          `src/pages.json: subPackages[${String(index)}].root must be a non-empty string.`,
        );
      } else if (!subpackageRoots.includes(root)) {
        subpackageRoots.push(root);
      }
    }
  }
}
subpackageRoots.sort((left, right) => right.length - left.length);

const files = await walk(outputRoot);
const measured = await Promise.all(
  files.map(async (filePath) => ({
    bytes: (await stat(filePath)).size,
    file: path.relative(outputRoot, filePath).split(path.sep).join("/"),
  })),
);
const total = measured.reduce((sum, item) => sum + item.bytes, 0);
const subpackageMeasurements = new Map(
  subpackageRoots.map((root) => [root, { bytes: 0, files: [] }]),
);
const mainPackageMeasurement = { bytes: 0, files: [] };

for (const item of measured) {
  const owner = subpackageRoots.find(
    (root) => item.file === root || item.file.startsWith(`${root}/`),
  );
  const measurement =
    owner === undefined
      ? mainPackageMeasurement
      : subpackageMeasurements.get(owner);
  measurement.bytes += item.bytes;
  measurement.files.push(item);
}

const largest = [...measured]
  .sort((left, right) => right.bytes - left.bytes)
  .slice(0, 5);

for (const item of measured) {
  if (
    /\.(?:map|md|ts|tsx|vue)$/u.test(item.file) ||
    /(?:^|\/)(?:h5|web|docs?)(?:\/|$)/u.test(item.file)
  ) {
    errors.push(
      `Unexpected authoring/H5 file in mp-weixin output: ${item.file}`,
    );
  }
}

console.log(
  `mp-weixin main package: ${(mainPackageMeasurement.bytes / 1024).toFixed(
    1,
  )} KiB / ${(mainPackageLimit / 1024).toFixed(1)} KiB budget.`,
);
for (const root of subpackageRoots) {
  const measurement = subpackageMeasurements.get(root);
  console.log(
    `mp-weixin subpackage "${root}": ${(measurement.bytes / 1024).toFixed(
      1,
    )} KiB / ${(subpackageLimit / 1024).toFixed(1)} KiB budget.`,
  );
}
console.log(
  `mp-weixin total: ${(total / 1024).toFixed(1)} KiB / ${(
    totalLimit / 1024
  ).toFixed(1)} KiB budget.`,
);
for (const item of largest) {
  console.log(`  ${(item.bytes / 1024).toFixed(1)} KiB  ${item.file}`);
}

if (mainPackageMeasurement.bytes > mainPackageLimit) {
  errors.push(
    "Main package budget exceeded; move feature-owned code or assets into a subpackage.",
  );
}
for (const [root, measurement] of subpackageMeasurements) {
  if (measurement.bytes > subpackageLimit) {
    errors.push(
      `Subpackage budget exceeded (${root}); reduce its runtime code or assets.`,
    );
  }
}
if (total > totalLimit) {
  errors.push(
    "Total Mini Program budget exceeded; remove unused output or split product scope.",
  );
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR ${error}`);
  }
  process.exitCode = 1;
}
