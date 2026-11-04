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

const reportedCount = Number(
  report.match(/(\d+)\s+vulnerabilities found/i)?.[1] ?? 0,
);
const blocks = report.split(/(?=┌)/).filter((block) => block.includes('│ Package'));

const readField = (block, label) =>
  block.match(new RegExp(`│\\s*${label}\\s*│\\s*([^│\\n]+)`))?.[1]?.trim() ?? '';

const findings = blocks.map((block) => {
  const severity =
    block.match(/│\s*(critical|high|moderate|low)\s*│/i)?.[1]?.toLowerCase() ?? '';
  const title =
    block.match(/│\s*(?:critical|high|moderate|low)\s*│\s*([^│\n]+)/i)?.[1]?.trim() ?? '';
  const id =
    block.match(/https:\/\/github\.com\/advisories\/([A-Z0-9-]+)/i)?.[1]?.toUpperCase() ?? '';

  return {
    id,
    package: readField(block, 'Package'),
    severity,
    title,
    vulnerableVersions: readField(block, 'Vulnerable versions'),
    patchedVersions: readField(block, 'Patched versions'),
  };
});

if (reportedCount > 0 && findings.length === 0) {
  console.error('Dependency findings were reported, but no advisory details could be parsed.');
  process.exit(2);
}

if (
  findings.some(
    (finding) =>
      !finding.package ||
      !finding.severity ||
      !finding.vulnerableVersions ||
      !finding.patchedVersions,
  )
) {
  console.error('At least one dependency advisory is missing package, severity or version metadata.');
  process.exit(2);
}

const fingerprint = (finding) =>
  [
    finding.id || `NO-ID:${finding.title}`,
    finding.package,
    finding.severity,
    finding.vulnerableVersions,
    finding.patchedVersions,
  ].join('::');

const known = new Set((baseline.findings ?? []).map(fingerprint));
if (known.size === 0 && reportedCount > 0) {
  console.error('The reviewed baseline has no advisory fingerprints; refusing to bypass the audit.');
  process.exit(2);
}

const current = new Set(findings.map(fingerprint));
const newFindings = [...current].filter((item) => !known.has(item)).sort();
const resolvedFindings = [...known].filter((item) => !current.has(item)).sort();

console.log(
  `Audit baseline: ${known.size} reviewed advisory fingerprints; current report: ${current.size}.`,
);
console.log(`Findings no longer reported: ${resolvedFindings.length}.`);

if (newFindings.length > 0) {
  console.error('New or changed dependency findings detected (identifier, package, severity or version range):');
  for (const item of newFindings) console.error(`- ${item}`);
  process.exit(1);
}

if (reportedCount > Number(baseline.reportedVulnerabilities ?? 0)) {
  console.error(
    `Dependency findings increased from ${baseline.reportedVulnerabilities} to ${reportedCount}.`,
  );
  process.exit(1);
}

console.log(
  `No new or changed advisory fingerprints; reported findings: ${reportedCount}/${baseline.reportedVulnerabilities}.`,
);
