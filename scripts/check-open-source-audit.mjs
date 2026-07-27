import { access, readFile } from "node:fs/promises";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const snapshotPath = path.join(
  repositoryRoot,
  "docs",
  "research",
  "uniapp-top10-2026-07-27.json",
);
const reportPath = path.join(
  repositoryRoot,
  "docs",
  "open-source-top10-audit.md",
);
const scoreKeys = [
  "skeleton",
  "architecture",
  "crossTarget",
  "quality",
  "maintenance",
  "reuse",
];
const errors = [];

async function exists(relativePath) {
  try {
    await access(path.join(repositoryRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

function nonEmptyStrings(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string" && item.trim().length > 0)
  );
}

let audit;
let report;
try {
  audit = JSON.parse(await readFile(snapshotPath, "utf8"));
  report = await readFile(reportPath, "utf8");
} catch (error) {
  console.error(
    `ERROR invalid audit snapshot: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exit(1);
}

if (audit.schemaVersion !== 1) {
  errors.push("Audit schemaVersion must be 1.");
}
if (!/^\d{4}-\d{2}-\d{2}$/u.test(audit.auditDate)) {
  errors.push("Audit date must use YYYY-MM-DD.");
} else if (!report.includes(audit.auditDate)) {
  errors.push("Reader audit does not show the canonical audit date.");
}
if (
  !Array.isArray(audit.scoreDimensions) ||
  audit.scoreDimensions.map((dimension) => dimension.id).join(",") !==
    scoreKeys.join(",")
) {
  errors.push("Audit score dimensions must use the canonical six-key order.");
}
if (!Array.isArray(audit.repositories) || audit.repositories.length !== 10) {
  errors.push("Audit snapshot must contain exactly 10 ranked repositories.");
}

const slugs = new Set();
for (const [index, repository] of (audit.repositories ?? []).entries()) {
  const label = `repository #${String(index + 1)}`;
  if (repository.rank !== index + 1) {
    errors.push(`${label} has a non-sequential rank.`);
  }
  if (
    typeof repository.slug !== "string" ||
    !/^[^/\s]+\/[^/\s]+$/u.test(repository.slug) ||
    slugs.has(repository.slug)
  ) {
    errors.push(`${label} has an invalid or duplicate slug.`);
  } else {
    slugs.add(repository.slug);
  }
  if (
    repository.repository !== `https://github.com/${String(repository.slug)}`
  ) {
    errors.push(`${label} repository URL does not match its slug.`);
  }
  if (!/^[a-f0-9]{40}$/u.test(repository.commit)) {
    errors.push(`${label} requires a full 40-character commit SHA.`);
  }
  if (
    !/^\d{4}-\d{2}-\d{2}$/u.test(repository.pushedAt) ||
    typeof repository.ref !== "string" ||
    repository.ref.length === 0 ||
    typeof repository.license !== "string" ||
    repository.license.length === 0 ||
    !Number.isInteger(repository.stars) ||
    !Number.isInteger(repository.forks)
  ) {
    errors.push(`${label} has incomplete snapshot metadata.`);
  }

  let total = 0;
  for (const key of scoreKeys) {
    const score = repository.scores?.[key];
    if (!Number.isInteger(score) || score < 0 || score > 5) {
      errors.push(`${label} has an invalid ${key} score.`);
    } else {
      total += score;
    }
  }
  if (repository.total !== total) {
    errors.push(`${label} total does not match its six scores.`);
  }
  if (
    !nonEmptyStrings(repository.strengthsZh) ||
    !nonEmptyStrings(repository.limitationsZh)
  ) {
    errors.push(`${label} requires strengths and limitations.`);
  }
  if (!Array.isArray(repository.evidence) || repository.evidence.length < 2) {
    errors.push(`${label} requires at least two source-level evidence links.`);
  } else {
    const pinnedPrefix = `https://github.com/${String(
      repository.slug,
    )}/blob/${String(repository.commit)}/`;
    for (const evidence of repository.evidence) {
      if (
        typeof evidence?.url !== "string" ||
        !evidence.url.startsWith(pinnedPrefix) ||
        typeof evidence.findingZh !== "string" ||
        evidence.findingZh.trim().length === 0
      ) {
        errors.push(`${label} has unpinned or incomplete source evidence.`);
      }
    }
  }

  const pinnedTreeUrl = `https://github.com/${String(
    repository.slug,
  )}/tree/${String(repository.commit)}`;
  const scoreSummary = `${scoreKeys
    .map((key) => repository.scores?.[key])
    .join("/")} = **${String(repository.total)}**`;
  if (!report.includes(pinnedTreeUrl) || !report.includes(scoreSummary)) {
    errors.push(`${label} is out of sync with the reader audit table.`);
  }
}

if (!Array.isArray(audit.decisions) || audit.decisions.length === 0) {
  errors.push("Audit snapshot requires decision mappings.");
} else {
  const decisionIds = new Set();
  for (const decision of audit.decisions) {
    if (
      typeof decision.id !== "string" ||
      decisionIds.has(decision.id) ||
      !/^AUD-\d{3}$/u.test(decision.id)
    ) {
      errors.push("Audit decision ids must be unique AUD-NNN values.");
    } else {
      decisionIds.add(decision.id);
    }
    if (
      !["adopt", "adapt", "retain", "reject-default"].includes(decision.status)
    ) {
      errors.push(`${String(decision.id)} has an invalid status.`);
    }
    if (
      !nonEmptyStrings(decision.sources) ||
      !nonEmptyStrings(decision.implementation)
    ) {
      errors.push(`${String(decision.id)} has incomplete source/path mapping.`);
      continue;
    }

    const officialSource = decision.sources.some(
      (source) =>
        source.startsWith("https://github.com/dcloudio/") ||
        source.startsWith("https://uniapp.dcloud.net.cn/"),
    );
    if (
      ["adopt", "adapt"].includes(decision.status) &&
      !officialSource &&
      decision.sources.length < 2
    ) {
      errors.push(
        `${String(
          decision.id,
        )} needs an official source or two reviewed repositories.`,
      );
    }
    for (const implementationPath of decision.implementation) {
      if (!(await exists(implementationPath))) {
        errors.push(
          `${String(decision.id)} maps to missing path ${implementationPath}.`,
        );
      }
    }
  }
}

if (!Array.isArray(audit.excluded) || audit.excluded.length < 5) {
  errors.push("Audit snapshot must record at least five explicit exclusions.");
} else {
  for (const exclusion of audit.excluded) {
    if (
      typeof exclusion.slug !== "string" ||
      typeof exclusion.reasonZh !== "string" ||
      !report.includes(exclusion.slug)
    ) {
      errors.push("Reader audit is missing an explicit exclusion.");
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `PASS open-source audit (${String(
      audit.repositories.length,
    )} ranked repositories, ${String(audit.decisions.length)} decisions).`,
  );
}
