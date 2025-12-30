
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { loadProjectData, linesStore, sequenceStore, ensureSequenceConsistency } from '../../src/lib/projectStore';
import * as fs from 'fs';
import * as path from 'path';

describe('Real File Import Verification', () => {
  beforeEach(() => {
    // Reset stores implicitly by loading new data
  });

  it('should correctly load Testingimportsandstuff.pp', () => {
    const filePath = '/tmp/file_attachments/Testingimportsandstuff.pp';
    if (!fs.existsSync(filePath)) {
      console.warn('Skipping test: File not found at ' + filePath);
      return;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    loadProjectData(data);

    const lines = get(linesStore);
    const sequence = get(sequenceStore);

    // Basic validation
    expect(lines.length).toBeGreaterThan(0);
    expect(sequence.length).toBeGreaterThan(0);

    // Verify consistency
    const lineIds = new Set(lines.map(l => l.id));
    const invalidSequenceItems = sequence.filter(s => s.kind === 'path' && !lineIds.has((s as any).lineId));

    expect(invalidSequenceItems).toHaveLength(0);

    // Check specific data points from the file content if known
    // (Based on cat output from previous turn)
    // "line-lle5h4v618", "line-sega5vlc2c", "line-94cs421y8wt"
    expect(lineIds.has('line-lle5h4v618')).toBe(true);
    expect(lineIds.has('line-sega5vlc2c')).toBe(true);
    expect(lineIds.has('line-94cs421y8wt')).toBe(true);
  });

  it('should correctly load ANewernewfile.pp', () => {
    const filePath = '/tmp/file_attachments/ANewernewfile.pp';
    if (!fs.existsSync(filePath)) {
      console.warn('Skipping test: File not found at ' + filePath);
      return;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    loadProjectData(data);

    const lines = get(linesStore);
    const sequence = get(sequenceStore);

    expect(lines.length).toBeGreaterThan(0);
    expect(sequence.length).toBeGreaterThan(0);

    const lineIds = new Set(lines.map(l => l.id));
    const invalidSequenceItems = sequence.filter(s => s.kind === 'path' && !lineIds.has((s as any).lineId));

    expect(invalidSequenceItems).toHaveLength(0);

    // "line-1xgawzbuyx5j" should be present
    expect(lineIds.has('line-1xgawzbuyx5j')).toBe(true);
  });
});
