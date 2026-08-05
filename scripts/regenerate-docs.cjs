// spk/scripts/regenerate-docs.cjs
const fs = require('fs');
const path = require('path');

const MARKER_RE = /<!--\s+SPK-([A-Z-]+):start\s+-->([\s\S]*?)<!--\s+SPK-\1:end\s+-->/g;
const MARKER_TOKEN_RE = /<!--\s+(SPK-[A-Z-]+):(start|end)\s+-->/g;
const EXPECTED_MARKERS = Object.freeze({
  'README.md': ['SPK-COUNTS', 'SPK-AGENTS', 'SPK-COMMANDS'],
  'README-EN.md': ['SPK-COUNTS', 'SPK-AGENTS', 'SPK-COMMANDS'],
  'INSTALL_FOR_AGENTS.md': ['SPK-COMMANDS'],
  'RESOLVER.md': ['SPK-COMMANDS'],
});

function parseMarkers(text) {
  const blocks = [];
  let m;
  while ((m = MARKER_RE.exec(text)) !== null) {
    blocks.push({
      name: `SPK-${m[1]}`,
      start: m.index,
      end: m.index + m[0].length,
      inner: m[2]
    });
  }
  MARKER_RE.lastIndex = 0;
  return blocks;
}

function commandTarget(command) {
  return command.orchestrator || command.agent ||
    (command.direct === true ? 'direct main-thread workflow' : '(invalid target)');
}

function splitCommands(manifest, contract) {
  if (!contract || !Array.isArray(contract.skills)) {
    return { canonical: manifest.commands, aliases: [] };
  }
  const byId = new Map(contract.skills.map(skill => [skill.id, skill]));
  const canonical = [];
  const aliases = [];
  for (const command of manifest.commands) {
    const id = command.name.replace(/^\//, '');
    const skill = byId.get(id);
    if (skill?.tier === 'compat') aliases.push({ command, skill });
    else canonical.push(command);
  }
  return { canonical, aliases };
}

function renderBlock(name, manifest, contract = null, relativePath = '') {
  const thai = relativePath === 'README.md';
  const { canonical, aliases } = splitCommands(manifest, contract);
  switch (name) {
    case 'SPK-COUNTS': {
      const orch = manifest.agents.orchestrators.length;
      const spec = manifest.agents.specialists.length;
      const total = orch + spec;
      if (aliases.length > 0) {
        const roster = thai
          ? `**${canonical.length} skills หลัก** + **${aliases.length} ชื่อเดิม**`
          : `**${canonical.length} canonical skills** + **${aliases.length} compatibility aliases**`;
        return `**${total} subagents** (${orch} orchestrators + ${spec} specialists) · ${roster}`;
      }
      return `**${total} subagents** (${orch} orchestrators + ${spec} specialists) · **${canonical.length} skills**`;
    }
    case 'SPK-AGENTS': {
      const rows = [
        '| Name | Role | Model | Color | Phase |',
        '|---|---|---|---|---|',
        ...manifest.agents.orchestrators.map(a =>
          `| \`${a.name}\` | orchestrator | ${a.model} | ${a.color} | ${a.phase} |`),
        ...manifest.agents.specialists.map(a =>
          `| \`${a.name}\` | specialist | ${a.model} | ${a.color} | ${a.phase} |`)
      ];
      return rows.join('\n');
    }
    case 'SPK-COMMANDS': {
      if (aliases.length === 0) {
        return [
          '| Skill | Dispatches to subagent |',
          '|---|---|',
          ...canonical.map(command => {
            const slug = command.name.replace(/^\//, '');
            return `| \`/spk:${slug}\` | ${commandTarget(command)} |`;
          }),
        ].join('\n');
      }
      const rows = [
        thai ? '### ชื่อหลัก' : '### Canonical skills',
        '',
        thai ? '| Skill | ทำงานผ่าน |' : '| Skill | Dispatches to |',
        '|---|---|',
        ...canonical.map(command => {
          const slug = command.name.replace(/^\//, '');
          return `| \`/spk:${slug}\` | ${commandTarget(command)} |`;
        }),
        '',
        thai ? '### ชื่อเดิมที่ยังใช้ได้' : '### Compatibility aliases',
        '',
        thai ? '| ชื่อเดิม | ใช้ชื่อหลักนี้ |' : '| Legacy name | Canonical name |',
        '|---|---|',
        ...aliases.map(({ command, skill }) => {
          const slug = command.name.replace(/^\//, '');
          return `| \`/spk:${slug}\` | \`/spk:${skill.aliasFor}\` |`;
        }),
      ];
      return rows.join('\n');
    }
    default:
      return null;
  }
}

function regenerateContent(text, manifest, contract = null, relativePath = '') {
  const lineEnding = text.includes('\r\n') ? '\r\n' : '\n';
  return text.replace(MARKER_RE, (match, blockName) => {
    const fullName = `SPK-${blockName}`;
    const rendered = renderBlock(fullName, manifest, contract, relativePath);
    if (rendered === null) return match;
    return [
      `<!-- ${fullName}:start -->`,
      rendered.replace(/\r?\n/g, lineEnding),
      `<!-- ${fullName}:end -->`,
    ].join(lineEnding);
  });
}

function collectMarkerContractErrors(relativePath, text) {
  const errors = [];
  const expected = EXPECTED_MARKERS[relativePath] || [];
  const parsed = parseMarkers(text).map(block => block.name);
  const counts = new Map();
  for (const marker of parsed) counts.set(marker, (counts.get(marker) || 0) + 1);

  for (const marker of expected) {
    const count = counts.get(marker) || 0;
    if (count === 0) errors.push(`${relativePath}: missing ${marker} generated block`);
    else if (count > 1) errors.push(`${relativePath}: duplicate ${marker} generated block`);
  }
  for (const marker of counts.keys()) {
    if (!expected.includes(marker)) errors.push(`${relativePath}: unexpected ${marker} generated block`);
  }

  const tokenCounts = new Map();
  let match;
  while ((match = MARKER_TOKEN_RE.exec(text)) !== null) {
    const key = `${match[1]}:${match[2]}`;
    tokenCounts.set(key, (tokenCounts.get(key) || 0) + 1);
  }
  MARKER_TOKEN_RE.lastIndex = 0;
  for (const marker of expected) {
    const starts = tokenCounts.get(`${marker}:start`) || 0;
    const ends = tokenCounts.get(`${marker}:end`) || 0;
    if (starts !== 1 || ends !== 1) {
      errors.push(`${relativePath}: ${marker} must have exactly one start and one end marker`);
    }
  }
  return [...new Set(errors)];
}

function listTargetFiles(rootDir) {
  const targets = [];
  const candidates = [
    'README.md',
    'README-EN.md',
    'CHANGELOG.md',
    'INSTALL_FOR_AGENTS.md',
    'RESOLVER.md'
  ];
  for (const rel of candidates) {
    const abs = path.join(rootDir, rel);
    if (fs.existsSync(abs)) targets.push(abs);
  }
  const docsDir = path.join(rootDir, 'docs');
  if (fs.existsSync(docsDir)) {
    for (const f of fs.readdirSync(docsDir)) {
      if (f.endsWith('.md')) targets.push(path.join(docsDir, f));
    }
  }
  return targets;
}

function main() {
  const args = process.argv.slice(2);
  const checkMode = args.includes('--check');
  const rootDir = path.join(__dirname, '..');
  const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf-8'));
  const contract = JSON.parse(fs.readFileSync(path.join(rootDir, 'contracts/workflows.json'), 'utf-8'));
  const files = listTargetFiles(rootDir);

  let anyChanged = false;
  const markerErrors = [];
  for (const file of files) {
    const relative = path.relative(rootDir, file).replace(/\\/g, '/');
    const original = fs.readFileSync(file, 'utf-8');
    if (Object.prototype.hasOwnProperty.call(EXPECTED_MARKERS, relative)) {
      markerErrors.push(...collectMarkerContractErrors(relative, original));
    }
    const regenerated = regenerateContent(original, manifest, contract, relative);
    if (original !== regenerated) {
      anyChanged = true;
      if (checkMode) {
        console.error(`DRIFT: ${path.relative(rootDir, file)} is out of sync with manifest.json`);
      } else {
        fs.writeFileSync(file, regenerated);
        console.log(`Regenerated: ${path.relative(rootDir, file)}`);
      }
    }
  }

  if (markerErrors.length) {
    console.error('Generated documentation marker contract FAILED:');
    markerErrors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }
  if (checkMode && anyChanged) {
    console.error('\nRun `npm run regen` to update, then commit.');
    process.exit(1);
  }
  if (!anyChanged) console.log('All docs in sync with manifest.json');
}

if (require.main === module) main();

module.exports = {
  EXPECTED_MARKERS,
  collectMarkerContractErrors,
  parseMarkers,
  regenerateContent,
  renderBlock,
  splitCommands,
  listTargetFiles,
};
