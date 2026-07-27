import { readFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const examplePath = path.join(projectRoot, ".env.example");
const typeDeclarationPath = path.join(projectRoot, "src", "env.d.ts");
const requiredKeys = [
  "VITE_API_BASE_URL_LOCAL",
  "VITE_API_BASE_URL_STAGING",
  "VITE_API_BASE_URL_PRODUCTION",
  "VITE_REQUEST_TIMEOUT_MS",
];
const errors = [];

function parseExample(content) {
  const values = new Map();

  for (const [index, rawLine] of content.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");
    if (separator <= 0) {
      errors.push(`.env.example:${String(index + 1)} is not KEY=value.`);
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!/^VITE_[A-Z0-9_]+$/u.test(key)) {
      errors.push(
        `.env.example:${String(index + 1)} must use a VITE_* public key.`,
      );
    }
    if (values.has(key)) {
      errors.push(`.env.example contains duplicate key ${key}.`);
    }
    if (value.length === 0) {
      errors.push(`.env.example key ${key} requires a sample value.`);
    }
    values.set(key, value);
  }

  return values;
}

function validateUrl(key, value, allowLocalHttp) {
  try {
    const url = new URL(value);
    const localHost =
      url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (
      url.protocol !== "https:" &&
      !(allowLocalHttp && url.protocol === "http:" && localHost)
    ) {
      errors.push(
        `${key} must use HTTPS${allowLocalHttp ? " or local HTTP" : ""}.`,
      );
    }
    if (
      url.username.length > 0 ||
      url.password.length > 0 ||
      url.search.length > 0 ||
      url.hash.length > 0
    ) {
      errors.push(`${key} must be a credential-free base URL.`);
    }
  } catch {
    errors.push(`${key} must be an absolute URL.`);
  }
}

const values = parseExample(await readFile(examplePath, "utf8"));
const typeDeclaration = await readFile(typeDeclarationPath, "utf8");
const typedKeys = new Set(
  [...typeDeclaration.matchAll(/\breadonly\s+(VITE_[A-Z0-9_]+)\??:/gu)]
    .map((match) => match[1])
    .filter((key) => key !== undefined),
);

for (const key of requiredKeys) {
  if (!values.has(key)) {
    errors.push(`.env.example is missing ${key}.`);
  }
  if (!typedKeys.has(key)) {
    errors.push(`src/env.d.ts is missing ${key}.`);
  }
}

for (const key of values.keys()) {
  if (!typedKeys.has(key)) {
    errors.push(`.env.example key ${key} is not declared in src/env.d.ts.`);
  }
}
for (const key of typedKeys) {
  if (!values.has(key)) {
    errors.push(`src/env.d.ts key ${key} is not documented in .env.example.`);
  }
}

for (const [key, allowLocalHttp] of [
  ["VITE_API_BASE_URL_LOCAL", true],
  ["VITE_API_BASE_URL_STAGING", false],
  ["VITE_API_BASE_URL_PRODUCTION", false],
]) {
  const value = values.get(key);
  if (value !== undefined) {
    validateUrl(key, value, allowLocalHttp);
  }
}

const timeout = Number(values.get("VITE_REQUEST_TIMEOUT_MS"));
if (!Number.isInteger(timeout) || timeout < 100 || timeout > 60_000) {
  errors.push(
    "VITE_REQUEST_TIMEOUT_MS must be an integer from 100 through 60000.",
  );
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`PASS public env contract (${String(values.size)} variables).`);
}
