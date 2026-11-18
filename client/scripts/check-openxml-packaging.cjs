const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const checkBeforePack = require('./check-openxml-before-pack.cjs');

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), '微品助手打包检查-'));
  try {
    for (const [platform, arch, name] of [
      ['win32', 1, 'win32-x64/openxmlhelper.exe'],
      ['darwin', 1, 'darwin-x64/openxmlhelper'],
      ['darwin', 3, 'darwin-arm64/openxmlhelper'],
    ]) {
      const context = { electronPlatformName: platform, arch, packager: { projectDir: root } };
      assert.throws(() => checkBeforePack(context), /打包中止：缺少 Word\/模板助手/);
      const executable = path.join(root, 'vendor/openxml-tools', name);
      fs.mkdirSync(path.dirname(executable), { recursive: true });
      fs.writeFileSync(executable, 'test-fixture', 'utf-8');
      assert.doesNotThrow(() => checkBeforePack(context));
    }
    console.log('通过：Windows x64 / macOS x64、arm64 缺少模板助手时中止打包，组件齐备时继续。');
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
