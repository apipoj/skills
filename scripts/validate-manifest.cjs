// spk/scripts/validate-manifest.cjs
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const schema = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'schemas', 'manifest.schema.json'), 'utf-8')
);

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

function collectManifestSemanticErrors(manifest) {
  const errors = [];
  const orchestrators = manifest?.agents?.orchestrators || [];
  const specialists = manifest?.agents?.specialists || [];
  const commands = manifest?.commands || [];

  const seenAgents = new Map();
  for (const [roster, agents] of [
    ['orchestrators', orchestrators],
    ['specialists', specialists],
  ]) {
    for (const agent of agents) {
      if (seenAgents.has(agent.name)) {
        errors.push(
          `duplicate agent name "${agent.name}" in ${seenAgents.get(agent.name)} and ${roster}`
        );
      } else {
        seenAgents.set(agent.name, roster);
      }
    }
  }

  const seenCommands = new Set();
  for (const command of commands) {
    if (seenCommands.has(command.name)) {
      errors.push(`duplicate command name "${command.name}"`);
    }
    seenCommands.add(command.name);
  }

  const orchestratorNames = new Set(orchestrators.map(agent => agent.name));
  const specialistNames = new Set(specialists.map(agent => agent.name));
  for (const command of commands) {
    if (command.orchestrator && !orchestratorNames.has(command.orchestrator)) {
      errors.push(`command ${command.name} references unknown orchestrator "${command.orchestrator}"`);
    }
    if (command.agent && !specialistNames.has(command.agent)) {
      errors.push(`command ${command.name} references unknown agent "${command.agent}"`);
    }
  }

  return errors;
}

function validateManifest(manifest) {
  const schemaValid = validate(manifest);
  const errors = schemaValid
    ? []
    : validate.errors.map(error => `${error.instancePath} ${error.message}`);
  if (schemaValid) errors.push(...collectManifestSemanticErrors(manifest));
  return {
    valid: errors.length === 0,
    errors,
  };
}

function main() {
  const manifestPath = path.join(__dirname, '..', 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('manifest.json not found');
    process.exit(1);
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (err) {
    console.error('manifest.json is not valid JSON:');
    console.error('  -', err.message);
    process.exit(1);
  }
  const result = validateManifest(manifest);
  if (!result.valid) {
    console.error('manifest.json is invalid:');
    result.errors.forEach(e => console.error('  -', e));
    process.exit(1);
  }
  console.log('manifest.json is valid');
}

if (require.main === module) main();

module.exports = { collectManifestSemanticErrors, validateManifest };
