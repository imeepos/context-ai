import { describe, it, expect } from 'vitest';
import { render } from '../src/core/renderer';
import { Context, Text, Data, Tool, Group, Example } from '../src/components';

describe('Renderer', () => {
  it('should render basic Context', async () => {
    const element = Context({
      name: 'Test Context',
      description: 'A test context',
      children: Text({ children: 'Hello world' })
    });

    const result = await render(element);

    expect(result.name).toBe('Test Context');
    expect(result.description).toBe('A test context');
    expect(result.prompt).toContain('Hello world');
  });

  it('should render Text component', async () => {
    const element = Context({
      name: 'Test',
      children: [
        Text({ children: 'First line' }),
        Text({ children: 'Second line' })
      ]
    });

    const result = await render(element);
    expect(result.prompt).toContain('First line');
    expect(result.prompt).toContain('Second line');
  });

  it('should render Data component', async () => {
    const element = Context({
      name: 'Data Context',
      children: Data({
        source: [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }],
        format: 'list',
        title: 'Users'
      })
    });

    const result = await render(element);
    expect(result.dataViews).toHaveLength(1);
    expect(result.dataViews[0].format).toBe('list');
    expect(result.prompt).toContain('Alice');
  });

  it('should render Tool component', async () => {
    const element = Context({
      name: 'Tool Context',
      children: Tool({
        name: 'search',
        description: 'Search for information',
        params: { type: 'object', properties: { query: { type: 'string' } } },
        execute: async () => 'result'
      })
    });

    const result = await render(element);
    expect(result.tools).toHaveLength(1);
    expect(result.tools[0].name).toBe('search');
  });

  it('should render Group with children', async () => {
    const element = Context({
      name: 'Group Context',
      children: Group({
        title: 'Section One',
        children: Text({ children: 'Content here' })
      })
    });

    const result = await render(element);
    expect(result.prompt).toContain('## Section One');
    expect(result.prompt).toContain('Content here');
  });

  it('should render Example component', async () => {
    const element = Context({
      name: 'Example Context',
      children: Example({
        input: 'What is 2+2?',
        output: '4',
        description: 'Basic math'
      })
    });

    const result = await render(element);
    expect(result.prompt).toContain('What is 2+2?');
    expect(result.prompt).toContain('4');
  });

  it('should handle nested components', async () => {
    const element = Context({
      name: 'Nested',
      children: Group({
        title: 'Outer',
        children: Group({
          title: 'Inner',
          children: Text({ children: 'Deep content' })
        })
      })
    });

    const result = await render(element);
    expect(result.prompt).toContain('Outer');
    expect(result.prompt).toContain('Inner');
    expect(result.prompt).toContain('Deep content');
  });

  it('should render multiple Text children', async () => {
    const element = Context({
      name: 'Multi Text',
      children: [
        Text({ children: 'Line 1' }),
        Text({ children: 'Line 2' }),
        Text({ children: 'Line 3' })
      ]
    });

    const result = await render(element);
    expect(result.prompt).toContain('Line 1');
    expect(result.prompt).toContain('Line 2');
    expect(result.prompt).toContain('Line 3');
  });

  it('should handle multiple tools', async () => {
    const element = Context({
      name: 'Tools Context',
      children: [
        Tool({
          name: 'tool1',
          description: 'First tool',
          execute: async () => {}
        }),
        Tool({
          name: 'tool2',
          description: 'Second tool',
          execute: async () => {}
        })
      ]
    });

    const result = await render(element);
    expect(result.tools).toHaveLength(2);
    expect(result.tools[0].name).toBe('tool1');
    expect(result.tools[1].name).toBe('tool2');
  });
});
