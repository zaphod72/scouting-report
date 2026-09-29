import assert from 'node:assert/strict';
import { summarize } from './public/stats.js';

assert.deepEqual(summarize(['a', 'b'], {}), { count: 0, avg: null });
assert.deepEqual(summarize(['a', 'b'], { a: 0 }), { count: 1, avg: null }); // N/A counts as scored, no average
assert.deepEqual(summarize(['a', 'b', 'c'], { a: 4, b: 3, c: 0 }), { count: 3, avg: 3.5 }); // N/A not averaged
assert.deepEqual(summarize(['a'], { z: 4 }), { count: 0, avg: null }); // other categories ignored
console.log('ok');
