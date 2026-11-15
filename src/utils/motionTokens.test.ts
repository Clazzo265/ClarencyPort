import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeScrollProgress,
  getAdjacentIndex,
  normalizePointerSpotlight,
  resolveActiveSection,
} from './motionTokens';

test('computeScrollProgress clamps cleanly between 0 and 1 and handles zero scrollable height', () => {
  assert.equal(computeScrollProgress(0, 900, 900), 0);
  assert.equal(computeScrollProgress(500, 2900, 900), 0.25);
  assert.equal(computeScrollProgress(5000, 2900, 900), 1);
  assert.equal(computeScrollProgress(-100, 2900, 900), 0);
});

test('resolveActiveSection selects the deepest section above scroll threshold', () => {
  const sections = [
    { id: 'home', top: 0 },
    { id: 'about', top: 720 },
    { id: 'skills', top: 1300 },
    { id: 'projects', top: 2100 },
  ];
  assert.equal(resolveActiveSection(sections, 0), 'home');
  assert.equal(resolveActiveSection(sections, 650), 'about');
  assert.equal(resolveActiveSection(sections, 2000), 'projects');
});

test('normalizePointerSpotlight clamps coordinates cleanly within container bounds', () => {
  const rect = { left: 100, top: 50, width: 1000, height: 500 };
  assert.deepEqual(normalizePointerSpotlight(600, 300, rect), { xPct: 50, yPct: 50 });
  assert.deepEqual(normalizePointerSpotlight(0, -20, rect), { xPct: 0, yPct: 0 });
  assert.deepEqual(normalizePointerSpotlight(1500, 800, rect), { xPct: 100, yPct: 100 });
});

test('getAdjacentIndex wraps cleanly across project list boundaries', () => {
  assert.equal(getAdjacentIndex(0, 3, -1), 2);
  assert.equal(getAdjacentIndex(2, 3, 1), 0);
  assert.equal(getAdjacentIndex(1, 3, 1), 2);
  assert.equal(getAdjacentIndex(0, 0, 1), -1);
});
