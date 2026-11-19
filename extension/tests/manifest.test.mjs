// manifest.json: MV3 shape from CONTRACTS 7 and every file it (or the injector) references exists.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { CONTENT_FILES } from '../popup/services/extract.js';

const ROOT = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', ROOT), 'utf8'));

function assertFileExists(path) {
  assert.ok(existsSync(new URL(path, ROOT)), `missing extension file: ${path}`);
}

// PNG stores width and height as big-endian uint32s at bytes 16 and 20 (IHDR chunk).
function pngSize(path) {
  const bytes = readFileSync(new URL(path, ROOT));
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

test('manifest is MV3 with only activeTab + scripting + storage (no host permissions)', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, 'Veritas');
  assert.equal(manifest.version, '0.1.0');
  assert.ok(manifest.description.length > 0 && manifest.description.length <= 132);
  assert.deepEqual(manifest.permissions, ['activeTab', 'scripting', 'storage']);
  for (const key of ['host_permissions', 'optional_host_permissions', 'background', 'content_scripts', 'content_security_policy']) {
    assert.equal(manifest[key], undefined, `${key} should not be declared`);
  }
});

test('every icon exists and has the declared pixel size', () => {
  const iconSets = [manifest.icons, manifest.action.default_icon];
  for (const icons of iconSets) {
    for (const [size, path] of Object.entries(icons)) {
      assertFileExists(path);
      assert.deepEqual(pngSize(path), [Number(size), Number(size)], path);
    }
  }
});

test('injected lib + content scripts exist', () => {
  CONTENT_FILES.forEach(assertFileExists);
});

test('the popup page exists', () => {
  assert.equal(manifest.action.default_popup, 'popup/popup.html');
  assertFileExists(manifest.action.default_popup);
});
