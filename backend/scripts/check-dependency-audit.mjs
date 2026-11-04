import { readFileSync } from 'node:fs';

const reportPath = process.argv[2] ?? 'dependency-audit.log';
const report = readFileSync(reportPath, 'utf8');
const baseline = JSON.parse(
  readFileSync(new URL('../security/dependency-audit-baseline.json', import.meta.url), 'utf8'),
);

if (!/(?:\d+\s+vulnerabilities found|no known vulnerabilities found)/i.test(report)) {
  console.error('Dependency audit did not produce a recognizable report summary.');
  process.exit(2);
}

const summaryMatch = report.match(/(\d+)\s+vulnerabilities found/i);
const reportedVulnerabilityCount = summaryMatch ? Number(summaryMatch[1]) : 0;
const baselineVulnerabilityCount = Number(baseline.reportedVulnerabilities ?? 0);

const reported = new Set(
  [...report.matchAll(/GHSA-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}/gi)].map(([id]) =>
    id.toUpperCase(),
  ),
);
const known = new Set(baseline.advisories);
const newAdvisories = [...reported].filter((id) => !known.has(id)).sort();
const resolved = [...known].filter((id) => !reported.has(id)).sort();

console.log(
  `Audit baseline: ${known.size} known GHSA advisories; current report: ${reported.size} unique GHSA advisories.`,
);
console.log(`Advisories no longer reported: ${resolved.length}.`);

if (newAdvisories.length > 0) {
  console.error('New advisories detected:');
  for (const id of newAdvisories) console.error(`- ${id}`);
  process.exit(1);
}

// GHSA identifiers are not present for every registry advisory. Compare the
// total finding count as a second guard so a newly reported CVE-only advisory
// cannot silently pass merely because it has no GHSA identifier.
if (
  baselineVulnerabilityCount > 0 &&
  reportedVulnerabilityCount > baselineVulnerabilityCount
) {
  console.error(
    `Dependency findings increased from ${baselineVulnerabilityCount} to ${reportedVulnerabilityCount}; review advisories without a known GHSA identifier.`,
  );
  process.exit(1);
}

console.log(
  `No new GHSA identifiers or increase in reported findings (${reportedVulnerabilityCount}/${baselineVulnerabilityCount}).`,
);
