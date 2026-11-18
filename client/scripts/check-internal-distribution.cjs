const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const { execFileSync, spawnSync } = require('node:child_process');

// 不访问现有 userData，也不请求作者授权服务；覆盖打包和开发两种启动分支。
async function checkRuntime() {
  const load = Module._load;
  let forbiddenCalls = 0;
  const forbidden = () => { forbiddenCalls += 1; throw new Error('内部发行不应调用作者授权或文件导入'); };
  Module._load = function (id, parent, isMain) {
    if (id === 'electron') return { dialog: { showOpenDialog: forbidden } };
    if (id === 'undici') return { fetch: forbidden };
    return load.call(this, id, parent, isMain);
  };
  let createLicenseService;
  try {
    ({ createLicenseService } = require('../electron/services/licenseService.cjs'));
  } finally {
    Module._load = load;
  }
  for (const isPackaged of [true, false]) {
    const service = createLicenseService({
      app: { isPackaged, getPath: forbidden },
      configStore: { load: forbidden },
    });
    for (const method of ['getStatus', 'refresh', 'refreshOnStartup', 'getCurrentStatus']) {
      const status = await service[method]();
      assert.equal(status.activationMode, 'internal_distribution');
      assert.equal(status.licenseStatus, 'internal_distribution');
      assert.equal(status.config.expirePopupEnabled, false);
      assert.equal(status.licenseExpiresAt, '');
      assert.equal(status.buildTrusted, false);
      assert.equal(status.sourceTrusted, false);
      assert.equal(status.sourceTrustedText, 'false');
      assert.equal(status.untrustedReason, 'internal_manual_distribution');
    }
    assert.equal(service.getLicenseEnvelope(), null);
    assert.equal(service.getBuildAttestation(), null);
    assert.equal((await service.importOfflineFile()).success, false);
    assert.equal((await service.activateOfflineCode('unused')).success, false);
  }
  assert.equal(forbiddenCalls, 0);
}

function checkBuildMetadata() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'weipin-distribution-'));
  try {
    for (const dir of ['scripts', 'assets']) fs.mkdirSync(path.join(root, dir));
    const script = path.join(root, 'scripts', 'generate-build-attestation.cjs');
    fs.copyFileSync(path.join(__dirname, 'generate-build-attestation.cjs'), script);
    fs.copyFileSync(path.join(__dirname, '..', 'assets', 'product.json'), path.join(root, 'assets', 'product.json'));
    fs.copyFileSync(path.join(__dirname, '..', 'package.json'), path.join(root, 'package.json'));
    const env = {
      ...process.env, GITHUB_ACTIONS: 'true', GITHUB_SHA: 'fixture-sha',
      YIBIAO_LICENSE_PRIVATE_KEY_JWK: 'unused-invalid-value',
      YIBIAO_LICENSE_PUBLIC_KEY_JWK: 'unused-invalid-value',
    };
    execFileSync(process.execPath, [script], { env, stdio: 'pipe' });
    const metadata = JSON.parse(fs.readFileSync(path.join(root, 'electron', 'resources', 'build-attestation.json'), 'utf-8'));
    assert.equal(metadata.distribution, 'internal-manual');
    assert.equal(metadata.signature, '');
    assert.equal(metadata.algorithm, 'none');
    assert.equal(metadata.keyId, '');
    assert.equal(metadata.gitCommitSha, 'fixture-sha');
    assert.equal(fs.existsSync(path.join(root, 'electron', 'resources', 'license-public-key.json')), false);

    // 非内部发行仍须遵守正式 CI 的签名要求，不能顺带放宽旧流程。
    fs.writeFileSync(path.join(root, 'assets', 'product.json'), JSON.stringify({ distribution: 'official' }), 'utf-8');
    const result = spawnSync(process.execPath, [script], {
      env: { ...env, YIBIAO_LICENSE_PRIVATE_KEY_JWK: '' }, encoding: 'utf-8',
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /PRIVATE_KEY_JWK is required/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

checkRuntime().then(() => {
  checkBuildMetadata();
  console.log('通过：打包/开发内部发行一致、无授权网络/文件访问、无需激活、不伪造认证、内部构建不依赖作者密钥、非内部 CI 仍要求签名。');
}).catch((error) => { console.error(error); process.exitCode = 1; });
