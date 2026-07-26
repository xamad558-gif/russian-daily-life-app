#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) return null;
  return fs.readFileSync(fp, 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

const index = read('index.html');
const manifestText = read('manifest.webmanifest');
const sw = read('service-worker.js');

if (!index) errors.push('Missing index.html');
if (!manifestText) errors.push('Missing manifest.webmanifest');
if (!sw) warnings.push('Missing service-worker.js');

if (index) {
  if (!index.includes('rel="manifest"') && !index.includes("rel='manifest'")) {
    warnings.push('index.html does not appear to link manifest.webmanifest.');
  }
  if (!index.includes('serviceWorker') && !index.includes('navigator.serviceWorker')) {
    warnings.push('index.html does not appear to register a service worker.');
  }
  if (index.includes('Russian Daily Life — v5')) {
    warnings.push('index.html title still says v5. Update the release title.');
  }
  if (!index.includes('apple-touch-icon')) {
    warnings.push('index.html has no apple-touch-icon link for iOS home-screen installation.');
  }
}

if (manifestText) {
  try {
    const manifest = JSON.parse(manifestText);
    for (const field of ['name', 'short_name', 'start_url', 'display']) {
      if (!manifest[field]) warnings.push(`manifest.webmanifest missing ${field}.`);
    }
    if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
      warnings.push('manifest.webmanifest has no icons.');
    } else {
      for (const icon of manifest.icons) {
        if (icon.src && !exists(icon.src)) warnings.push(`Manifest icon missing: ${icon.src}`);
      }
    }
  } catch (err) {
    errors.push(`manifest.webmanifest is invalid JSON: ${err.message}`);
  }
}

if (sw) {
  if (!sw.includes('caches.open')) warnings.push('service-worker.js does not appear to open a cache.');
  if (!sw.includes('fetch')) warnings.push('service-worker.js does not appear to handle fetch events.');
  const appShellMatch = sw.match(/const APP_SHELL = \[(.*?)\];/s);
  if (appShellMatch) {
    const appShellPaths = [...appShellMatch[1].matchAll(/["']([^"']+)["']/g)].map(match => match[1]);
    for (const appShellPath of appShellPaths) {
      if (!exists(appShellPath)) errors.push(`Service worker app-shell path missing: ${appShellPath}`);
    }
  } else {
    warnings.push('service-worker.js APP_SHELL list could not be inspected.');
  }
}

const report = {
  status: errors.length ? 'FAIL' : warnings.length ? 'WARNING' : 'PASS',
  errorCount: errors.length,
  warningCount: warnings.length,
  errors,
  warnings
};

console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exit(1);
