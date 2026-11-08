// Deterministic route-planner regression tests. Run: node tests/planner.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const appRoot = path.resolve(__dirname, '../public/mission-control');
const dataPath = path.join(appRoot, 'data/ares-data.js');
const dataSource = fs.readFileSync(dataPath, 'utf8')
  .replace('window.ARES_DATA', 'globalThis.ARES_DATA');
vm.runInThisContext(dataSource, { filename: dataPath });
require(path.join(appRoot, 'js/model.js'));
const A = globalThis.ARES;
const sceneSource = fs.readFileSync(path.join(appRoot, 'js/scene.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(appRoot, 'index.html'), 'utf8');
const missionCss = fs.readFileSync(path.join(appRoot, 'css/styles.css'), 'utf8');
const surfaceExplorerSource = fs.readFileSync(path.join(__dirname, '../src/SurfaceExplorer.tsx'), 'utf8');
const grid = A.coarse;
const tests = [];
function test(name, fn) {
  try { fn(); tests.push({ name, ok: true }); }
  catch (error) { tests.push({ name, ok: false, error }); }
}
function reset() {
  grid.ok.fill(0);
  grid.slope.fill(0);
  grid.maxSlope.fill(0);
  grid.elev.fill(0);
}
function open(i, j, maxSlope = 0, averageSlope = maxSlope, elevation = 0) {
  const k = j * grid.CW + i;
  grid.ok[k] = 1;
  grid.maxSlope[k] = maxSlope;
  grid.slope[k] = averageSlope;
  grid.elev[k] = elevation;
}

// Integration checks against the embedded Jezero raster dataset before synthetic-grid tests mutate it.
test('mission workspace bundles local Three.js and the embedded study region', () => {
  assert(indexSource.includes('vendor/three.min.js'));
  assert(indexSource.includes('data/ares-data.js'));
  assert.strictEqual(A.GW, 1483);
  assert.strictEqual(A.GH, 541);
  assert.strictEqual(A.M.x0, 4577464);
  assert.strictEqual(A.M.x1, 4592296);
  assert.strictEqual(A.M.y0, 1092275);
  assert.strictEqual(A.M.y1, 1097680);
});

test('2D and 3D views expose a clear reciprocal view switch', () => {
  assert(indexSource.includes('aria-label="View mode"'));
  assert(indexSource.includes('aria-current="page">3D Terrain</span>'));
  assert(indexSource.includes('href="/?view=map" target="_top">2D Explorer</a>'));
  assert(surfaceExplorerSource.includes('aria-current="page">2D EXPLORER</span>'));
  assert(surfaceExplorerSource.includes('href="/?view=mission">3D TERRAIN</a>'));
});

test('mission interface uses the aurora palette instead of the former orange accent', () => {
  assert(missionCss.includes('--dust:#73e2cf;--signal:#b8a5ff'));
  assert(missionCss.includes('linear-gradient(110deg,#8debd9,#b6a6ff)'));
  assert(!missionCss.includes('#f0a56b'));
  assert(!missionCss.includes('#d98753'));
});

test('slope bins preserve the documented scientific thresholds', () => {
  assert.deepStrictEqual(A.SLOPE_BINS.map(bin => [bin.min, bin.max]), [
    [0, 5], [5, 15], [15, 25], [25, Infinity],
  ]);
});

test('slope overlays use a perceptually ordered viridis palette', () => {
  assert(sceneSource.includes("slope: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725']"));
  assert(sceneSource.includes("A.HAZ = ['#737b83', '#3b528b', '#21918c', '#5ec962', '#fde725']"));
  assert(fs.readFileSync(path.join(appRoot, 'js/ui.js'), 'utf8').includes('NoData</div>'));
  assert(sceneSource.includes("rough: ['#17122b', '#4b3b91', '#336f9f', '#27a98a', '#b6e880']"));
  assert(fs.readFileSync(path.join(appRoot, 'js/ui.js'), 'utf8').includes("['Shortest', 0, '#73e2cf'], ['Gentlest', 5, '#b8a5ff']"));
});

test('embedded terrain produces valid landing-to-target routes under the 25 degree limit', () => {
  const landing = A.targets.find(target => target.id === 'landing');
  const low = A.targets.find(target => target.id === 'low');
  const start = A.fineToCoarse(landing.i, landing.j);
  const goal = A.fineToCoarse(low.i, low.j);
  const path = A.plan(start[0], start[1], goal[0], goal[1], 0, 25);
  assert(path && path.length > 1);
  assert(A.validatePath(path, 25));
  const metrics = A.metrics(path);
  assert(Number.isFinite(metrics.dist) && metrics.dist > 0);
  assert(metrics.maxUnderlying <= 25);
});

test('embedded steep target is rejected when its maximum underlying slope exceeds the limit', () => {
  const landing = A.targets.find(target => target.id === 'landing');
  const steep = A.targets.find(target => target.id === 'steep');
  const start = A.fineToCoarse(landing.i, landing.j);
  const goal = A.fineToCoarse(steep.i, steep.j);
  assert.strictEqual(A.plan(start[0], start[1], goal[0], goal[1], 0, 25), null);
});

// Basic data and coordinate invariants.
test('raster validity rejects out-of-range typed-array indices', () => {
  assert.strictEqual(A.valid(-1), false);
  assert.strictEqual(A.valid(A.N), false);
  const firstValid = A.L.dem.findIndex(value => value !== 65535);
  assert(firstValid >= 0);
  assert.strictEqual(A.valid(firstValid), true);
});
test('pixel-centre projected and world coordinate conversions round-trip', () => {
  const i = 500, j = 200;
  const projected = A.cellToProj(i, j);
  const cell = A.projToCell(projected[0], projected[1]);
  assert(Math.abs(cell[0] - i) < 1e-9);
  assert(Math.abs(cell[1] - j) < 1e-9);
  const world = A.cellToWorld(i, j);
  const cellAgain = A.worldToCell(world.x, world.z);
  assert(Math.abs(cellAgain[0] - i) < 1e-9);
  assert(Math.abs(cellAgain[1] - j) < 1e-9);
});

test('terrain height interpolation and vertical ray picking agree', () => {
  let found = null;
  for (let j = 0; j < A.GH - 1 && !found; j++) for (let i = 0; i < A.GW - 1; i++) {
    const k = j * A.GW + i;
    if ([k, k + 1, k + A.GW, k + A.GW + 1].every(A.valid)) { found = [i, j]; break; }
  }
  assert(found, 'expected at least one complete terrain quad');
  const [i, j] = found;
  const x = (i + 0.5 - (A.GW - 1) / 2) * A.DX / A.U;
  const z = (j + 0.5 - (A.GH - 1) / 2) * A.DZ / A.U;
  const surface = A.heightAt(x, z);
  assert(Number.isFinite(surface));
  const hit = A.pick({ origin: { x, y: surface + 10, z }, direction: { x: 0, y: -1, z: 0 } });
  assert(hit);
  assert(Math.abs(hit.y - surface) < 1e-5);
});

test('open terrain returns a valid route', () => {
  reset();
  open(10, 10); open(11, 10); open(10, 11); open(11, 11);
  const path = A.plan(10, 10, 11, 11, 0, 25);
  assert(path);
  assert.deepStrictEqual(path[0], [10, 10]);
  assert.deepStrictEqual(path[path.length - 1], [11, 11]);
  assert.strictEqual(A.validatePath(path, 25), true);
});

test('blocked destination returns no route', () => {
  reset(); open(10, 10);
  assert.strictEqual(A.plan(10, 10, 11, 10, 0, 25), null);
});

test('diagonal movement cannot cut an obstacle corner', () => {
  reset(); open(10, 10); open(11, 11); open(11, 10);
  assert.strictEqual(A.validatePath([[10, 10], [11, 11]], 25), false);
  const path = A.plan(10, 10, 11, 11, 0, 25);
  assert(path);
  assert.strictEqual(path.length, 3); // Must route through the only open orthogonal neighbour.
});

test('diagonal movement cannot cut a steep-cell corner', () => {
  reset(); open(10, 10); open(11, 11); open(11, 10); open(10, 11, 30, 10);
  assert.strictEqual(A.validatePath([[10, 10], [11, 11]], 25), false);
  const path = A.plan(10, 10, 11, 11, 0, 25);
  assert(path);
  assert.strictEqual(path.length, 3);
  assert(!path.some(([i, j]) => i === 10 && j === 11));
});

test('route cannot use a cell above the configured slope limit', () => {
  reset(); open(10, 10); open(11, 10, 26, 12);
  assert.strictEqual(A.plan(10, 10, 11, 10, 0, 25), null);
});

test('NoData/invalid coarse cell is never traversable', () => {
  reset(); open(10, 10); open(12, 10);
  // (11,10) intentionally remains invalid, as it would when a fine source cell is NoData.
  assert.strictEqual(A.plan(10, 10, 12, 10, 0, 25), null);
});

test('invalid start and destination coordinates are rejected', () => {
  reset(); open(10, 10);
  assert.strictEqual(A.plan(-1, 10, 10, 10, 0, 25), null);
  assert.strictEqual(A.plan(10, 10, grid.CW, 10, 0, 25), null);
  assert.strictEqual(A.plan(10.5, 10, 10, 10, 0, 25), null);
});

test('planner takes a longer valid path around a steep shortcut', () => {
  reset();
  for (let j = 10; j <= 12; j++) for (let i = 10; i <= 12; i++) open(i, j, 0, 0, (i + j) * 0.5);
  open(11, 11, 35, 8); // Average is gentle, but the underlying maximum is over the limit.
  const path = A.plan(10, 11, 12, 11, 0, 25);
  assert(path);
  assert(path.length > 3, 'expected a detour around the blocked centre');
  assert(!path.some(([i, j]) => i === 11 && j === 11));
  assert(A.validatePath(path, 25));
});

test('route metrics are finite and report underlying maximum slope separately', () => {
  reset(); open(10, 10, 12, 4, 100); open(11, 10, 18, 7, 102);
  const path = A.plan(10, 10, 11, 10, 0, 25);
  assert(path);
  const metrics = A.metrics(path);
  for (const key of ['dist', 'up', 'down', 'max', 'maxUnderlying', 'maxAverage', 'mean', 'steepDist']) {
    assert(Number.isFinite(metrics[key]), key + ' should be finite');
  }
  assert.strictEqual(metrics.maxUnderlying, 18);
  assert.strictEqual(metrics.maxAverage, 7);
  assert(metrics.dist > 0);
  assert(metrics.prof.every(row => row.every(Number.isFinite)));
});

test('metrics reject an invalid route instead of reporting it', () => {
  reset(); open(10, 10); open(11, 11);
  assert.throws(() => A.metrics([[10, 10], [11, 11]]), /invalid route/i);
});

const failed = tests.filter(t => !t.ok);
for (const result of tests) {
  if (result.ok) console.log('PASS', result.name);
  else console.error('FAIL', result.name, '\n ', result.error && result.error.stack || result.error);
}
console.log(`\n${tests.length - failed.length}/${tests.length} tests passed`);
if (failed.length) process.exitCode = 1;
