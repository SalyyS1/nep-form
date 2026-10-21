import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestShirtSize } from '../../shared/size-guide.mjs';

const sizes = ['S', 'M', 'L', 'XL'];
test('shirt suggestions use both dimensions and preserve chart boundary behavior', () => {
  for (const [height, weight, size] of [[150, 42, 'S'], [160, 52, 'S'], [160.1, 52, 'M'], [168, 58, 'M'], [170, 62, 'M'], [171, 62, 'L'], [175, 70, 'L'], [178, 72, 'L'], [179, 72, 'XL'], [185, 85, 'XL'], [155, 75, 'XL']]) {
    assert.equal(suggestShirtSize(height, weight, sizes).size, size);
  }
  assert.equal(suggestShirtSize(155, 75, sizes).kind, 'check');
  assert.equal(suggestShirtSize(180, 45, sizes).kind, 'check');
});
test('out-of-range and unavailable sizes never silently fall back to a smaller shirt', () => {
  for (const [height, weight] of [[149, 50], [186, 60], [170, 41], [170, 86]]) assert.equal(suggestShirtSize(height, weight, sizes).kind, 'outside');
  for (const [height, weight] of [[NaN, 60], [Infinity, 60], [0, 60], [170, -1], [170, 300]]) assert.equal(suggestShirtSize(height, weight, sizes).kind, 'invalid');
  const result = suggestShirtSize(180, 75, ['S', 'M', 'L']);
  assert.equal(result.kind, 'unavailable'); assert.equal(result.size, null);
});
