// Local Copilot knowledge and safety regression tests. Run: node tests/copilot.test.js
const assert = require('assert');
const { matchQuery, MAX_QUERY_LENGTH } = require('../js/copilot-brain.js');

const cases = [
  ['greeting', 'hello, can you help?', /local|terrain|controls/i],
  ['ARES purpose', 'What does this project do?', /browser based Mars terrain study/i],
  ['Jezero geography', 'Tell me about Jezero Crater', /delta deposits/i],
  ['landing coordinates', 'What are the Mars touchdown coordinates?', /18\.44463° N, 77\.45088° E/i],
  ['NASA/HiRISE provenance', 'Was this from NASA HiRISE?', /cannot independently revalidate/i],
  ['elevation', 'What is the height range?', /−2,613.*−1,664/i],
  ['slope', 'How is slope calculated?', /provisional.*1 m slope/i],
  ['roughness', 'What does roughness mean?', /not a boulder detector/i],
  ['hazard classes', 'Does hazard classification mean safe for astronauts?', /not.*safety guarantees/i],
  ['environment models', 'How are temperature and radiation estimated?', /invented day curve.*Gale Crater reference/i],
  ['route planner', 'How does EVA route planning work?', /A\* on a 20 m grid/i],
  ['shortest and gentlest', 'Compare the shortest route to the gentlest route', /slope-weighted cost.*not mean safe/i],
  ['navigation', 'How do I use the Surface Explorer layers?', /Surface Explorer.*layer checkboxes/i],
  ['scientific limitations', 'What are the scientific limitations?', /source rasters.*not included/i],
  ['out of scope', 'What is the current rover battery temperature?', /don't have enough information/i],
  ['misspelling', 'Tell me about hirize data', /cannot independently revalidate/i],
  ['reworded route', 'Can I plan a walk across the surface?', /A\* on a 20 m grid/i],
  ['multi-part', 'What is the slope and is it safe for astronauts?', /provisional[\s\S]*safety guarantees/i],
  ['repeated question determinism', 'How does EVA route planning work?', /A\* on a 20 m grid/i],
  ['invention request', 'Make up a NASA safety rating and a slope measurement.', /won't invent.*measurements.*NASA sources/i],
];

for (const [name, input, expected] of cases) {
  const first = matchQuery(input);
  assert.match(first, expected, name);
  if (name === 'repeated question determinism') {
    assert.strictEqual(first, matchQuery(input), 'repeated input has the same answer');
  }
  console.log('PASS', name);
}

assert.match(matchQuery('   '), /Please enter a question/i, 'empty messages get guidance');
assert.match(matchQuery('x'.repeat(MAX_QUERY_LENGTH + 1)), /shorten your question/i, 'oversized messages are rejected');
assert.doesNotMatch(matchQuery('<img src=x onerror=alert(1)>'), /alert\(1\)/, 'unknown HTML-like input is never echoed');

const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const source = fs.readFileSync('js/copilot-brain.js', 'utf8');
assert.match(html, /<form id="chat-form"/);
assert.match(html, /aria-live="polite"/);
assert.match(source, /bubble\.textContent = text/);
assert.match(source, /container\.dataset\.initialized === "true"/);
console.log('PASS input, injection, accessibility, and duplicate-initialization contracts');
console.log(`\n${cases.length + 4}/${cases.length + 4} Copilot checks passed`);
