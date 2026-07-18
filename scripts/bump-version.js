const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT, 'package.json');
const CHANGELOG_PATH = path.join(ROOT, 'CHANGELOG.md');
const GITHUB_OUTPUT = process.env.GITHUB_OUTPUT;
const MANUAL_BUMP = process.env.INPUT_BUMP;

function getLatestTag() {
  try {
    return execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function getCommitsSinceTag(tag) {
  const range = tag ? `${tag}..HEAD` : '--root';
  const log = execSync(`git log ${range} --oneline --no-decorate`, { encoding: 'utf8' }).trim();
  return log ? log.split('\n').map(line => {
    const match = line.match(/^(\S+)\s(.*)/);
    return match ? { hash: match[1], message: match[2] } : { hash: '', message: line };
  }) : [];
}

function parseBumpType(commits) {
  if (MANUAL_BUMP) return MANUAL_BUMP;

  let bump = 'patch';
  for (const c of commits) {
    if (c.message.includes('BREAKING CHANGE') || /!:/.test(c.message)) {
      bump = 'major';
      break;
    }
    if (/^feat(\(.+\))?!?:\s/.test(c.message)) bump = 'minor';
    if (/^fix(\(.+\))?!?:\s/.test(c.message) && bump !== 'minor') bump = 'patch';
  }
  return bump;
}

function bumpVersion(current, type) {
  const parts = current.split('.').map(Number);
  if (type === 'major') return `${parts[0] + 1}.0.0`;
  if (type === 'minor') return `${parts[0]}.${parts[1] + 1}.0`;
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}

function categorizeCommits(commits) {
  const groups = { breaking: [], feat: [], fix: [], other: [] };
  for (const c of commits) {
    if (c.message.includes('BREAKING CHANGE') || /!:/.test(c.message)) {
      groups.breaking.push(c);
    } else if (/^feat(\(.+\))?!?:\s/.test(c.message)) {
      groups.feat.push(c);
    } else if (/^fix(\(.+\))?!?:\s/.test(c.message)) {
      groups.fix.push(c);
    } else {
      groups.other.push(c);
    }
  }
  return groups;
}

function generateChangelogSection(version, commits) {
  const now = new Date().toISOString().split('T')[0];
  const groups = categorizeCommits(commits);
  const lines = [`## [${version}] - ${now}`, ''];
  if (groups.breaking.length) {
    lines.push('### ⚠️ Breaking Changes');
    for (const c of groups.breaking) lines.push(`- ${c.message} (${c.hash})`);
    lines.push('');
  }
  if (groups.feat.length) {
    lines.push('### Features');
    for (const c of groups.feat) lines.push(`- ${c.message} (${c.hash})`);
    lines.push('');
  }
  if (groups.fix.length) {
    lines.push('### Bug Fixes');
    for (const c of groups.fix) lines.push(`- ${c.message} (${c.hash})`);
    lines.push('');
  }
  if (groups.other.length) {
    lines.push('### Other');
    for (const c of groups.other) lines.push(`- ${c.message} (${c.hash})`);
    lines.push('');
  }
  return lines.join('\n');
}

function setOutput(key, value) {
  if (GITHUB_OUTPUT) {
    fs.appendFileSync(GITHUB_OUTPUT, `${key}=${value}\n`);
  }
  console.log(`${key}=${value}`);
}

const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
const currentVersion = pkg.version;
const tag = getLatestTag();
const commits = getCommitsSinceTag(tag);
const bumpType = parseBumpType(commits);
const newVersion = bumpVersion(currentVersion, bumpType);
const changelog = generateChangelogSection(newVersion, commits);

pkg.version = newVersion;
fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');

let existingChangelog = '';
try {
  existingChangelog = fs.readFileSync(CHANGELOG_PATH, 'utf8');
} catch {}
fs.writeFileSync(CHANGELOG_PATH, changelog + '\n\n' + existingChangelog);

setOutput('new_version', newVersion);
setOutput('bump_type', bumpType);
setOutput('changelog', changelog.replace(/\n/g, '\\n'));
