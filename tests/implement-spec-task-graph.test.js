const { analyzeTaskGraph } = require('../locales/en/skills/engineering/implement-spec/scripts/task-graph.cjs');

function ticket(id, dependencies = [], extra = {}) {
  return { id, dependencies, status: 'pending', acceptanceReady: true, ...extra };
}

describe('implement-spec task frontier', () => {
  test('only independent tickets with acceptance access are ready', () => {
    expect(analyzeTaskGraph([
      ticket('A'), ticket('B'), ticket('C', ['A', 'B']),
      ticket('manual', [], { acceptanceReady: false }),
    ])).toEqual({
      ready: ['A', 'B'], active: [], integrated: [],
      waiting: [
        { id: 'C', blockers: ['A', 'B'], acceptanceReady: true, status: 'pending' },
        { id: 'manual', blockers: [], acceptanceReady: false, status: 'pending' },
      ],
    });
  });

  test.each(['running', 'verified'])('a %s worker does not unlock dependent tickets', status => {
    expect(analyzeTaskGraph([ticket('A', [], { status }), ticket('B', ['A'])])).toEqual({
      ready: [], integrated: [], active: ['A'],
      waiting: [{ id: 'B', blockers: ['A'], acceptanceReady: true, status: 'pending' }],
    });
  });

  test('a recorded integration unlocks dependents while manual prerequisites still block', () => {
    expect(analyzeTaskGraph([
      ticket('A', [], { status: 'integrated', checksPassed: true, integrationSha: 'a'.repeat(40) }),
      ticket('B', ['A']), ticket('C', ['A'], { acceptanceReady: false }),
    ])).toEqual({
      ready: ['B'], integrated: ['A'], active: [],
      waiting: [{ id: 'C', blockers: [], acceptanceReady: false, status: 'pending' }],
    });
  });

  test('blocked tickets are never dispatched despite satisfied dependencies', () => {
    expect(analyzeTaskGraph([ticket('A', [], { status: 'blocked' })])).toEqual({
      ready: [], active: [], integrated: [],
      waiting: [{ id: 'A', blockers: [], acceptanceReady: true, status: 'blocked' }],
    });
  });

  test.each([
    [null, /JSON array/],
    [[], /at least one ticket/],
    [[ticket('A'), ticket('A')], /duplicate ticket id: A/],
    [[ticket('A', ['missing'])], /unknown dependency missing/],
    [[ticket('A', ['B']), ticket('B', ['A'])], /dependency cycle/],
    [[ticket('A', ['A'])], /dependency cycle/],
    [[ticket('A', ['B', 'B']), ticket('B')], /unique string ids/],
    [[ticket('A', [], { status: 'integrated' })], /passed checks and an integration SHA/],
    [[ticket('A', [], { status: 'integrated', checksPassed: true, integrationSha: 'a'.repeat(41) })], /integration SHA/],
    [[ticket('A', ['B'], { status: 'integrated', checksPassed: true, integrationSha: 'a'.repeat(40) }), ticket('B')], /unresolved blockers/],
    [[ticket('A', [], { acceptanceReady: undefined })], /boolean acceptanceReady/],
    [[ticket(' A ')], /unambiguous string id/],
  ])('rejects invalid scheduling input %#', (tickets, expected) => {
    expect(() => analyzeTaskGraph(tickets)).toThrow(expected);
  });
});
