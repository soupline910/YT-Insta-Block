import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const extensionRoot = new URL('../', import.meta.url);
const manifestUrl = new URL('manifest.json', extensionRoot);
const rulesUrl = new URL('rules.json', extensionRoot);
const blockedPageUrl = new URL('blocked.html', extensionRoot);
const requiredDomains = [
  'youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'instagram.com',
  'ig.me',
  'instagr.am'
];

let manifest;
let rules;

test('manifest and rule assets exist and contain valid JSON', () => {
  assert.equal(existsSync(manifestUrl), true, 'manifest.json must exist');
  assert.equal(existsSync(rulesUrl), true, 'rules.json must exist');

  if (!existsSync(manifestUrl) || !existsSync(rulesUrl)) {
    return;
  }

  manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'));
  rules = JSON.parse(readFileSync(rulesUrl, 'utf8'));
  assert.equal(Array.isArray(rules), true, 'rules.json must contain an array');
});

test('declares a Manifest V3 DNR extension with all target hosts', () => {
  assert.ok(manifest, 'manifest must be loaded');
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.permissions.includes('declarativeNetRequest'), true);
  assert.equal(
    manifest.declarative_net_request.rule_resources.some(
      (resource) => resource.path === 'rules.json' && resource.enabled === true
    ),
    true
  );

  for (const domain of requiredDomains) {
    assert.equal(
      manifest.host_permissions.some((pattern) => pattern.includes(domain)),
      true,
      `host permission for ${domain} is required`
    );
  }
});

test('exposes the blocked page to every navigation initiator', () => {
  assert.ok(manifest, 'manifest must be loaded');
  const resourceDeclaration = manifest.web_accessible_resources.find(
    (resource) => resource.resources.includes('blocked.html')
  );

  assert.ok(resourceDeclaration, 'blocked.html must be web accessible');
  assert.deepEqual(
    resourceDeclaration.resources,
    ['blocked.html'],
    'only the redirect target needs to be web accessible; blocked.css, blocked.js and countdown.js load same-origin from the extension page'
  );
  assert.equal(
    resourceDeclaration.matches.includes('<all_urls>'),
    true,
    'matches is checked against the navigation initiator, not the blocked host, so any site that links to a blocked domain must be able to follow the redirect'
  );
});

test('runs in incognito with a mode that can show the blocked page', () => {
  assert.ok(manifest, 'manifest must be loaded');

  // Blocking a navigation means redirecting it to blocked.html, which loads an
  // extension page into the tab's main frame. Chrome's default "spanning" mode
  // cannot do that in an incognito tab, so the redirect fails there even after
  // the user allows the extension in incognito. Only "split" gives incognito
  // windows their own process, which can render the page.
  assert.equal(
    manifest.incognito,
    'split',
    'spanning and not_allowed both leave incognito/InPrivate windows unblocked'
  );
});

test('redirects main frames and blocks every other target request', () => {
  assert.ok(Array.isArray(rules), 'rules must be loaded');
  const ruleIds = rules.map((rule) => rule.id);
  assert.equal(new Set(ruleIds).size, ruleIds.length, 'rule IDs must be unique');
  assert.equal(rules.every((rule) => rule.action.type !== 'allow'), true);

  const redirectRule = rules.find(
    (rule) => rule.action.type === 'redirect' && rule.condition.resourceTypes?.includes('main_frame')
  );
  const blockRule = rules.find((rule) => rule.action.type === 'block');

  assert.ok(redirectRule, 'a main-frame redirect rule is required');
  assert.ok(blockRule, 'a broad block rule is required');
  assert.equal(redirectRule.action.redirect.extensionPath, '/blocked.html');
  assert.equal(redirectRule.priority > blockRule.priority, true);
  assert.deepEqual([...redirectRule.condition.requestDomains].sort(), [...requiredDomains].sort());
  assert.deepEqual([...blockRule.condition.requestDomains].sort(), [...requiredDomains].sort());
  assert.equal(Object.hasOwn(blockRule.condition, 'resourceTypes'), false);
});

test('blocked page is local and does not load remote code', () => {
  assert.equal(existsSync(blockedPageUrl), true, 'blocked.html must exist');

  if (!existsSync(blockedPageUrl)) {
    return;
  }

  const blockedPage = readFileSync(blockedPageUrl, 'utf8');
  assert.match(blockedPage, /blocked\.css/);
  assert.match(blockedPage, /blocked\.js/);
  assert.doesNotMatch(blockedPage, /https?:\/\//i);
});
