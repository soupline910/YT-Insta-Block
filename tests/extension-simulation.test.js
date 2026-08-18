import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const extensionRoot = new URL("../", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("manifest.json", extensionRoot), "utf8"));
const rules = JSON.parse(readFileSync(new URL("rules.json", extensionRoot), "utf8"));
const targetDomains = [
  "youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "instagram.com",
  "ig.me",
  "instagr.am"
];
const targetUrls = [
  "https://youtube.com/",
  "https://www.youtube.com/watch?v=example",
  "http://m.youtube.com/",
  "https://youtu.be/example",
  "https://youtube-nocookie.com/embed/example",
  "https://www.youtube-nocookie.com/embed/example",
  "https://instagram.com/",
  "https://www.instagram.com/p/example/",
  "https://ig.me/m/example",
  "https://www.ig.me/m/example",
  "http://instagr.am/p/example/",
  "https://www.instagr.am/p/example/"
];
const dnrResourceTypes = [
  "main_frame",
  "sub_frame",
  "stylesheet",
  "script",
  "image",
  "font",
  "object",
  "xmlhttprequest",
  "ping",
  "csp_report",
  "media",
  "websocket",
  "webtransport",
  "webbundle",
  "other"
];
const defaultResourceTypes = dnrResourceTypes.filter((resourceType) => resourceType !== "main_frame");
const blockedResourceTypes = defaultResourceTypes;

function matchesDomain(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function getRuleResourceTypes(rule) {
  return rule.condition.resourceTypes ?? defaultResourceTypes;
}

function evaluateRequest(url, resourceType, candidateRules = rules) {
  const request = new URL(url);
  const matchingRules = candidateRules
    .filter((rule) => {
      const domainsMatch = rule.condition.requestDomains.some((domain) =>
        matchesDomain(request.hostname, domain)
      );
      const resourceTypesMatch = getRuleResourceTypes(rule).includes(resourceType);
      return domainsMatch && resourceTypesMatch;
    })
    .sort((first, second) => (second.priority ?? 1) - (first.priority ?? 1));

  return matchingRules[0]?.action.type ?? null;
}

function matchesHostPattern(url, pattern) {
  const request = new URL(url);

  if (pattern === "<all_urls>") {
    return request.protocol === "http:" || request.protocol === "https:";
  }

  const [schemePattern, hostAndPath] = pattern.split("://");
  const pathStart = hostAndPath.indexOf("/");
  const hostPattern = hostAndPath.slice(0, pathStart);
  const schemeMatches = schemePattern === "*" || `${schemePattern}:` === request.protocol;
  const hostMatches = hostPattern.startsWith("*.")
    ? matchesDomain(request.hostname, hostPattern.slice(2))
    : request.hostname === hostPattern;

  return schemeMatches && hostMatches;
}

// A declarativeNetRequest redirect to an extension page only completes when the
// page is web accessible to the origin that initiated the navigation. That
// initiator is the site holding the link, not the blocked host, so a `matches`
// list naming only the blocked hosts fails for every inbound link.
function canFollowRedirectFrom(initiatorUrl) {
  const declaration = manifest.web_accessible_resources.find((resource) =>
    resource.resources.includes("blocked.html")
  );

  if (!declaration) {
    return false;
  }

  // Browser-initiated navigations (address bar, bookmarks) have no initiator
  // origin to match against, so only listed-at-all matters for them.
  if (initiatorUrl === null) {
    return true;
  }

  return declaration.matches.some((pattern) => matchesHostPattern(initiatorUrl, pattern));
}

test("does not apply omitted resourceTypes to main-frame requests", () => {
  const blockRule = rules.find((rule) => rule.action.type === "block");

  assert.ok(blockRule);
  assert.equal(blockRule.condition.resourceTypes, undefined);
  assert.equal(evaluateRequest(targetUrls[0], "main_frame", [blockRule]), null);
});

test("simulates target navigation and subresource blocking", () => {
  for (const url of targetUrls) {
    assert.equal(evaluateRequest(url, "main_frame"), "redirect", `redirect expected for ${url}`);

    for (const resourceType of blockedResourceTypes) {
      assert.equal(
        evaluateRequest(url, resourceType),
        "block",
        `${resourceType} should be blocked for ${url}`
      );
    }
  }
});

test("does not overblock deceptive or explicitly excluded domains", () => {
  const nonTargetUrls = [
    "https://example.com/",
    "https://youtube.com.evil.example/",
    "https://notyoutube.com/",
    "https://threads.net/",
    "https://facebook.com/",
    "https://googlevideo.com/",
    "https://fbcdn.net/"
  ];

  for (const url of nonTargetUrls) {
    assert.equal(evaluateRequest(url, "main_frame"), null, `main frame should pass for ${url}`);
    assert.equal(evaluateRequest(url, "script"), null, `script should pass for ${url}`);
  }
});

test("host permissions cover the request URL of every target", () => {
  for (const url of targetUrls) {
    assert.equal(
      manifest.host_permissions.some((pattern) => matchesHostPattern(url, pattern)),
      true,
      `host permission is missing for ${url}`
    );
  }

  assert.deepEqual(
    [...new Set(rules.flatMap((rule) => rule.condition.requestDomains))].sort(),
    [...targetDomains].sort()
  );
});

test("the blocked page is reachable no matter which site linked to the target", () => {
  const inboundInitiators = [
    null,
    "https://www.google.com/search?q=youtube",
    "https://search.naver.com/search.naver?query=instagram",
    "https://discord.com/channels/@me",
    "https://mail.google.com/",
    "https://youtube.com/"
  ];

  for (const initiator of inboundInitiators) {
    assert.equal(
      canFollowRedirectFrom(initiator),
      true,
      `redirect to blocked.html must be followable from ${initiator ?? "the address bar"}`
    );
  }
});

test("blocked page dependencies are local and resolvable", () => {
  const blockedPageUrl = new URL("blocked.html", extensionRoot);
  const blockedPage = readFileSync(blockedPageUrl, "utf8");
  const blockedScript = readFileSync(new URL("blocked.js", extensionRoot), "utf8");
  const runtimeAssetNames = ["blocked.html", "blocked.css", "blocked.js", "countdown.js"];

  for (const assetName of runtimeAssetNames) {
    assert.equal(existsSync(new URL(assetName, extensionRoot)), true, `${assetName} must exist`);
    const asset = readFileSync(new URL(assetName, extensionRoot), "utf8");
    assert.doesNotMatch(asset, /https?:\/\//i, `${assetName} must not use remote URLs`);
    assert.doesNotMatch(asset, /\b(fetch|XMLHttpRequest)\b/, `${assetName} must not use network APIs`);
  }

  for (const match of blockedPage.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const referencedResource = match[1];
    assert.doesNotMatch(referencedResource, /^(?:[a-z]+:)?\/\//i);
    assert.equal(
      existsSync(new URL(referencedResource, blockedPageUrl)),
      true,
      `${referencedResource} must resolve from blocked.html`
    );
  }

  for (const match of blockedScript.matchAll(/from\s+["'](.+?)["']/g)) {
    assert.equal(
      existsSync(new URL(match[1], new URL("blocked.js", extensionRoot))),
      true,
      `${match[1]} must resolve from blocked.js`
    );
  }
});

test("blocked page renders the countdown into its DOM", async () => {
  const originalDate = globalThis.Date;
  const originalDocument = globalThis.document;
  const originalSetInterval = globalThis.setInterval;
  const fixedNow = originalDate.parse("2027-11-17T14:59:59.000Z");
  const elements = {
    "#countdown-label": { textContent: "" },
    "#countdown-time": { textContent: "" },
    "#countdown-message": { textContent: "" }
  };
  let intervalDelay;

  class FixedDate extends originalDate {
    static now() {
      return fixedNow;
    }
  }

  globalThis.Date = FixedDate;
  globalThis.document = {
    querySelector(selector) {
      return elements[selector];
    }
  };
  globalThis.setInterval = (_callback, delay) => {
    intervalDelay = delay;
    return 1;
  };

  try {
    await import(new URL(`../blocked.js?test=${fixedNow}`, import.meta.url));
  } finally {
    globalThis.Date = originalDate;
    globalThis.document = originalDocument;
    globalThis.setInterval = originalSetInterval;
  }

  assert.equal(elements["#countdown-label"].textContent, "D-1");
  assert.equal(elements["#countdown-time"].textContent, "0일 00시간 00분 01초");
  assert.equal(elements["#countdown-message"].textContent, "수능까지");
  assert.equal(intervalDelay, 1000);
});
