#!/usr/bin/env node
'use strict';

const fs = require('fs');

const STATES = new Set(['pending', 'running', 'verified', 'integrated', 'blocked']);

function analyzeTaskGraph(tickets) {
  if (!Array.isArray(tickets)) throw new Error('tickets must be a JSON array');
  if (tickets.length === 0) throw new Error('the task graph must contain at least one ticket');
  const byId = new Map();
  for (const ticket of tickets) {
    if (!ticket || typeof ticket !== 'object' || Array.isArray(ticket)
      || typeof ticket.id !== 'string' || !ticket.id.trim() || ticket.id !== ticket.id.trim()) {
      throw new Error('every ticket must have a nonempty, unambiguous string id');
    }
    if (byId.has(ticket.id)) throw new Error(`duplicate ticket id: ${ticket.id}`);
    if (!Array.isArray(ticket.dependencies)
      || ticket.dependencies.some(id => typeof id !== 'string' || !id.trim())
      || new Set(ticket.dependencies).size !== ticket.dependencies.length) {
      throw new Error(`${ticket.id}: dependencies must contain unique string ids`);
    }
    if (!STATES.has(ticket.status) || typeof ticket.acceptanceReady !== 'boolean') {
      throw new Error(`${ticket.id}: status and boolean acceptanceReady are required`);
    }
    if (ticket.status === 'integrated' && (!ticket.acceptanceReady
      || ticket.checksPassed !== true || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(ticket.integrationSha || ''))) {
      throw new Error(`${ticket.id}: integrated status requires ready acceptance, passed checks and an integration SHA`);
    }
    byId.set(ticket.id, ticket);
  }
  for (const ticket of tickets) {
    for (const dependency of ticket.dependencies) {
      if (!byId.has(dependency)) throw new Error(`${ticket.id}: unknown dependency ${dependency}`);
    }
  }

  const visited = new Set();
  const visiting = new Set();
  function visit(id, trail) {
    if (visiting.has(id)) throw new Error(`dependency cycle: ${[...trail, id].join(' -> ')}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id).dependencies) visit(dependency, [...trail, id]);
    visiting.delete(id);
    visited.add(id);
  }
  for (const ticket of tickets) visit(ticket.id, []);

  const result = { ready: [], waiting: [], active: [], integrated: [] };
  for (const ticket of tickets) {
    const blockers = ticket.dependencies.filter(id => byId.get(id).status !== 'integrated');
    if (ticket.status === 'integrated') {
      if (blockers.length) throw new Error(`${ticket.id}: integrated ticket has unresolved blockers`);
      result.integrated.push(ticket.id);
    } else if (['running', 'verified'].includes(ticket.status)) {
      result.active.push(ticket.id);
    } else if (ticket.status === 'pending' && ticket.acceptanceReady && blockers.length === 0) {
      result.ready.push(ticket.id);
    } else {
      result.waiting.push({ id: ticket.id, blockers, acceptanceReady: ticket.acceptanceReady, status: ticket.status });
    }
  }
  return result;
}

if (require.main === module) {
  try {
    if (process.argv.length !== 3) throw new Error('usage: task-graph.cjs <tickets.json>');
    const tickets = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
    process.stdout.write(`${JSON.stringify(analyzeTaskGraph(tickets), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { analyzeTaskGraph };
