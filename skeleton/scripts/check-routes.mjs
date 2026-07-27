import { access, readFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(projectRoot, "src");
const pagesConfigPath = path.join(sourceRoot, "pages.json");
const manifestPath = path.join(sourceRoot, "manifest.json");
const errors = [];

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function parseJson(content, filePath) {
  try {
    return JSON.parse(content);
  } catch (cause) {
    errors.push(
      `${path.relative(projectRoot, filePath)}: invalid JSON (${cause}).`,
    );
    return undefined;
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSafeRelativePath(value, label) {
  if (typeof value !== "string") {
    errors.push(`${label}: expected a string path.`);
    return false;
  }
  if (value.length === 0) {
    errors.push(`${label}: path cannot be empty.`);
    return false;
  }
  if (value.includes("\\")) {
    errors.push(`${label}: backslashes are forbidden (${value}).`);
    return false;
  }
  if (path.posix.isAbsolute(value) || /^[A-Za-z]:\//u.test(value)) {
    errors.push(`${label}: absolute paths are forbidden (${value}).`);
    return false;
  }
  if (
    [...value].some((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
    })
  ) {
    errors.push(`${label}: control characters are forbidden.`);
    return false;
  }

  const unsafeSegment = value
    .split("/")
    .find((segment) => segment === "" || segment === "." || segment === "..");
  if (unsafeSegment !== undefined) {
    errors.push(
      `${label}: empty, "." and ".." path segments are forbidden (${value}).`,
    );
    return false;
  }
  return true;
}

const pagesConfig = parseJson(
  await readFile(pagesConfigPath, "utf8"),
  pagesConfigPath,
);
const manifest = parseJson(await readFile(manifestPath, "utf8"), manifestPath);
const routes = new Set();
const mainRoutes = new Set();
const subpackageRoutes = new Set();
const subpackageRoots = new Set();
const subpackageReferences = new Map();

function registerRoute(route, routeKind) {
  if (routes.has(route)) {
    errors.push(
      `src/pages.json: duplicate page route is forbidden (${route}).`,
    );
    return;
  }
  routes.add(route);
  routeKind.add(route);
}

function registerSubpackageReference(reference, subpackageIndex) {
  const owner = subpackageReferences.get(reference);
  if (owner === undefined) {
    subpackageReferences.set(reference, subpackageIndex);
  } else if (owner !== subpackageIndex) {
    errors.push(
      `src/pages.json: duplicate subPackage reference is forbidden (${reference}).`,
    );
  }
}

if (pagesConfig !== undefined) {
  if (!Array.isArray(pagesConfig.pages) || pagesConfig.pages.length === 0) {
    errors.push("src/pages.json: pages must be a non-empty array.");
  } else {
    for (const [index, page] of pagesConfig.pages.entries()) {
      const pagePath = page?.path;
      if (
        isSafeRelativePath(
          pagePath,
          `src/pages.json: pages[${String(index)}].path`,
        )
      ) {
        registerRoute(pagePath, mainRoutes);
      }
    }
  }

  if (
    pagesConfig.subPackages !== undefined &&
    !Array.isArray(pagesConfig.subPackages)
  ) {
    errors.push("src/pages.json: subPackages must be an array.");
  } else if (Array.isArray(pagesConfig.subPackages)) {
    for (const [
      subpackageIndex,
      subpackage,
    ] of pagesConfig.subPackages.entries()) {
      const subpackageLabel = `src/pages.json: subPackages[${String(
        subpackageIndex,
      )}]`;
      if (!isRecord(subpackage) || !Array.isArray(subpackage.pages)) {
        errors.push(`${subpackageLabel}: requires root and pages.`);
        continue;
      }

      const root = subpackage.root;
      const hasSafeRoot = isSafeRelativePath(root, `${subpackageLabel}.root`);
      if (hasSafeRoot) {
        if (subpackageRoots.has(root)) {
          errors.push(
            `src/pages.json: duplicate subPackage root is forbidden (${root}).`,
          );
        } else {
          subpackageRoots.add(root);
        }
        registerSubpackageReference(root, subpackageIndex);
      }

      if (
        subpackage.name !== undefined &&
        isSafeRelativePath(subpackage.name, `${subpackageLabel}.name`)
      ) {
        registerSubpackageReference(subpackage.name, subpackageIndex);
      }

      if (subpackage.pages.length === 0) {
        errors.push(`${subpackageLabel}.pages: must be a non-empty array.`);
      }
      for (const [pageIndex, page] of subpackage.pages.entries()) {
        const pagePath = page?.path;
        if (
          hasSafeRoot &&
          isSafeRelativePath(
            pagePath,
            `${subpackageLabel}.pages[${String(pageIndex)}].path`,
          )
        ) {
          registerRoute(`${root}/${pagePath}`, subpackageRoutes);
        }
      }
    }
  }

  const roots = [...subpackageRoots];
  for (const [index, root] of roots.entries()) {
    for (const otherRoot of roots.slice(index + 1)) {
      if (
        root.startsWith(`${otherRoot}/`) ||
        otherRoot.startsWith(`${root}/`)
      ) {
        errors.push(
          `src/pages.json: nested subPackage roots are forbidden (${root}, ${otherRoot}).`,
        );
      }
    }
    for (const route of mainRoutes) {
      if (
        route === root ||
        route.startsWith(`${root}/`) ||
        root.startsWith(`${route}/`)
      ) {
        errors.push(
          `src/pages.json: main-package route overlaps subPackage root (${route}, ${root}).`,
        );
      }
    }
  }

  const tabItems = pagesConfig.tabBar?.list;
  if (Array.isArray(tabItems)) {
    const tabRoutes = new Set();
    for (const [index, item] of tabItems.entries()) {
      const pagePath = item?.pagePath;
      if (
        isSafeRelativePath(
          pagePath,
          `src/pages.json: tabBar.list[${String(index)}].pagePath`,
        )
      ) {
        if (!mainRoutes.has(pagePath)) {
          errors.push(
            `src/pages.json: TabBar route must be a registered main-package page (${pagePath}).`,
          );
        }
        if (tabRoutes.has(pagePath)) {
          errors.push(
            `src/pages.json: duplicate TabBar route is forbidden (${pagePath}).`,
          );
        } else {
          tabRoutes.add(pagePath);
        }
      }
      for (const iconKey of ["iconPath", "selectedIconPath"]) {
        const iconPath = item?.[iconKey];
        if (
          isSafeRelativePath(
            iconPath,
            `src/pages.json: tabBar.list[${String(index)}].${iconKey}`,
          ) &&
          !(await exists(path.join(sourceRoot, iconPath)))
        ) {
          errors.push(
            `src/pages.json: missing TabBar ${iconKey} (${String(iconPath)}).`,
          );
        }
      }
    }
  }

  if (pagesConfig.preloadRule !== undefined) {
    if (!isRecord(pagesConfig.preloadRule)) {
      errors.push("src/pages.json: preloadRule must be an object.");
    } else {
      for (const [pagePath, rule] of Object.entries(pagesConfig.preloadRule)) {
        const ruleLabel = `src/pages.json: preloadRule[${JSON.stringify(
          pagePath,
        )}]`;
        if (
          isSafeRelativePath(pagePath, `${ruleLabel} page`) &&
          !routes.has(pagePath)
        ) {
          errors.push(
            `${ruleLabel}: references an unregistered page (${pagePath}).`,
          );
        }
        if (!isRecord(rule) || !Array.isArray(rule.packages)) {
          errors.push(`${ruleLabel}: packages must be an array.`);
          continue;
        }
        if (rule.packages.length === 0) {
          errors.push(`${ruleLabel}: packages must not be empty.`);
        }

        const referencedPackages = new Set();
        for (const [
          packageIndex,
          packageReference,
        ] of rule.packages.entries()) {
          const packageLabel = `${ruleLabel}.packages[${String(packageIndex)}]`;
          if (
            packageReference !== "__APP__" &&
            !isSafeRelativePath(packageReference, packageLabel)
          ) {
            continue;
          }
          if (
            packageReference !== "__APP__" &&
            !subpackageReferences.has(packageReference)
          ) {
            errors.push(
              `${packageLabel}: references an unknown subPackage (${packageReference}).`,
            );
          }
          if (referencedPackages.has(packageReference)) {
            errors.push(
              `${packageLabel}: duplicate preload package reference (${packageReference}).`,
            );
          } else {
            referencedPackages.add(packageReference);
          }
        }
      }
    }
  }
}

for (const route of routes) {
  if (!(await exists(path.join(sourceRoot, `${route}.vue`)))) {
    errors.push(`Missing route component: src/${route}.vue`);
  }
}

if (manifest !== undefined) {
  if (manifest.vueVersion !== "3") {
    errors.push('src/manifest.json: vueVersion must be "3".');
  }
  if (manifest["mp-weixin"]?.lazyCodeLoading !== "requiredComponents") {
    errors.push(
      'src/manifest.json: mp-weixin.lazyCodeLoading must be "requiredComponents".',
    );
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`PASS uni-app route contracts (${String(routes.size)} pages).`);
}
