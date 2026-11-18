const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createConfigStore } = require('../electron/services/configStore.cjs');
const updateService = require('../electron/services/updateService.cjs');
const product = require('../assets/product.json');
const packageJson = require('../package.json');

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'weipin-config-check-'));
  try {
    const store = createConfigStore({ getPath: () => root });
    const fresh = store.load();
    assert.equal(fresh.text_model_provider, 'custom');
    assert.equal(fresh.image_model.provider, 'custom');
    assert.equal(fresh.api_key, '');
    assert.equal(fresh.base_url, '');
    assert.ok(fresh.analytics_client_id);

    store.save({
      text_model_provider: 'custom', api_key: 'test-only-key',
      base_url: 'https://example.invalid/v1', model_name: 'test-model',
    });
    store.save({ text_model_provider: 'deepseek', api_key: 'test-only-deepseek', model_name: 'deepseek-chat' });
    store.save({ developer_mode: true });
    const saved = store.load();
    assert.equal(saved.text_model_provider, 'deepseek');
    assert.equal(saved.api_key, 'test-only-deepseek');
    assert.equal(saved.text_model_profiles.custom.api_key, 'test-only-key');
    assert.equal(saved.analytics_client_id, fresh.analytics_client_id);
    store.save({ text_model_provider: 'custom' });
    assert.equal(store.load().api_key, 'test-only-key');
    store.save({ image_model: {
      provider: 'custom', api_key: 'test-only-image',
      base_url: 'https://images.example.invalid/v1', model_name: 'test-image',
    } });
    const withImage = store.load();

    // 导入官方配置时不能把作者账户 Key 错发给第三方。
    fs.writeFileSync(store.getConfigFilePath(), JSON.stringify({
      ...withImage, text_model_provider: 'official', api_key: 'test-only-official',
      base_url: 'https://v3.yibiao.pro/qhp-ai/anonymous/openai/v1', model_name: 'TEXT_GENERATION',
      image_model: { provider: 'official' },
    }), 'utf-8');
    const migrated = store.load();
    assert.equal(migrated.text_model_provider, 'custom');
    assert.equal(migrated.api_key, 'test-only-key');
    assert.equal(migrated.base_url, 'https://example.invalid/v1');
    assert.equal(migrated.image_model.provider, 'custom');
    assert.equal(migrated.image_model.api_key, 'test-only-image');
    assert.equal(migrated.image_model.base_url, 'https://images.example.invalid/v1');

    // 更新入口不得读取更新渠道、发起请求或触发安装，即使 app.isPackaged 为 true。
    const noNetwork = new Proxy({}, { get() { throw new Error('不应访问更新依赖'); } });
    updateService.setupAutoUpdate(noNetwork);
    for (const method of ['checkAndDownloadUpdate', 'triggerUpdateDownload']) {
      const result = await updateService[method]({ app: { isPackaged: true }, configStore: noNetwork });
      assert.equal(result.enabled, false);
      assert.equal(result.updateAvailable, false);
    }
    assert.equal(await updateService.getUpdateDownloadUrl(noNetwork), '');
    assert.equal((await updateService.getLatestVersion(noNetwork)).version, '');
    assert.equal((await updateService.quitAndInstall(noNetwork)).success, false);
    assert.equal(updateService.isUpdateCacheInUse(), false);
    assert.equal(product.appId, packageJson.build.appId);
    assert.equal(product.name, packageJson.build.productName);
    assert.notEqual(product.dataDirectory, 'yibiao-client');
    assert.equal(packageJson.build.publish, null);
    console.log('通过：全新自配配置、服务商切换与档案保留、官方凭证隔离、埋点身份保留、人工更新全部入口。');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
