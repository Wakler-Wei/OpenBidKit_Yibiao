const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

// 使用独立中文目录、可推进时钟和禁止联网的支付服务检查，不触碰真实用户配置。
async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), '微品支持检查-'));
  const stateFile = path.join(root, 'donation_state.json');
  const pendingOrders = [{ merchantOrderNo: 'test-existing-order', expiresAt: 1 }];
  const initialRuntime = 5 * 60 * 60_000 - 1;
  fs.writeFileSync(stateFile, JSON.stringify({
    accumulatedRuntimeMs: initialRuntime, wordExportClicks: 4,
    processedRuntimeBucket: 0, processedExportBucket: 0,
    donationMarker: 'preserve-existing-marker', pendingOrders,
  }), 'utf-8');
  let now = 0;
  let networkCalls = 0;
  let promptCalls = 0;
  let paidCalls = 0;
  const intervals = new Set();
  const timeouts = new Set();
  const servicePath = path.resolve(__dirname, '../electron/services/donationService.cjs');
  const realRequire = createRequire(servicePath);
  const serviceModule = { exports: {} };
  vm.runInNewContext(fs.readFileSync(servicePath, 'utf-8'), {
    module: serviceModule, Buffer, console, process, AbortSignal,
    require(name) {
      if (name === 'electron') return { safeStorage: { isEncryptionAvailable: () => false } };
      if (name === 'node:perf_hooks') return { performance: { now: () => now } };
      if (name === '../utils/paths.cjs') return { getDonationStateFilePath: () => stateFile };
      return realRequire(name);
    },
    fetch: async () => { networkCalls += 1; throw new Error('不允许请求支付服务'); },
    setInterval: (fn) => { intervals.add(fn); return fn; },
    clearInterval: (fn) => intervals.delete(fn),
    setTimeout: (fn) => { timeouts.add(fn); return fn; },
    clearTimeout: (fn) => timeouts.delete(fn),
  }, { filename: servicePath });
  const createService = () => serviceModule.exports.createDonationService({
    app: {}, onPrompt: () => { promptCalls += 1; }, onPaid: () => { paidCalls += 1; },
  });
  let service;
  try {
    service = createService();
    assert.equal(timeouts.size, 0, '内部版不调度旧订单恢复');
    now += 60_000;
    for (const tick of intervals) tick();
    assert.equal(service.recordWordExport(), null, '跨过五次导出档位也不产生打赏提示');
    service.showPrompt({ reason: 'runtime' });
    for (const call of [
      () => service.getConfig(),
      () => service.createTip({ amount: '1' }),
      () => service.getOrderStatus('test-existing-order'),
      () => service.finalizeOrderStatus('test-existing-order'),
    ]) {
      await assert.rejects(call, /已停用打赏与支付服务/);
    }

    // 真实导出 IPC：成功与失败各累计一次，进度、返回值与异常正常传递。
    const handlers = new Map();
    const ipcPath = path.resolve(__dirname, '../electron/ipc/exportIpc.cjs');
    const ipcModule = { exports: {} };
    vm.runInNewContext(fs.readFileSync(ipcPath, 'utf-8'), {
      module: ipcModule,
      require: () => ({ ipcMain: { handle: (name, fn) => handlers.set(name, fn) }, shell: {} }),
    }, { filename: ipcPath });
    ipcModule.exports.registerExportIpc({
      donationService: service,
      exportService: { async exportWord(payload, progress) {
        progress({ phase: 'start', progress: 0 });
        if (payload.fail) throw new Error('test-export-error');
        return { success: true };
      } },
    });
    const progress = [];
    const event = { sender: { send: (channel, data) => progress.push({ channel, ...data }) } };
    const exportWord = handlers.get('export:word');
    assert.equal((await exportWord(event, { requestId: 'ok' })).success, true);
    await assert.rejects(() => exportWord(event, { requestId: 'failed', fail: true }), /test-export-error/);
    assert.ok(progress.some((item) => item.requestId === 'failed' && item.phase === 'error'));
    service.close();
    const saved = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    assert.equal(saved.wordExportClicks, 7);
    assert.equal(saved.accumulatedRuntimeMs, initialRuntime + 60_000);
    assert.deepEqual(saved.pendingOrders, pendingOrders, '保留历史订单数据，不再恢复或查询');
    assert.equal(saved.donationMarker, 'preserve-existing-marker');
    assert.equal(intervals.size, 0);
    service = createService();
    now += 300_000;
    for (const tick of intervals) tick();
    assert.equal(JSON.parse(fs.readFileSync(stateFile, 'utf-8')).accumulatedRuntimeMs, saved.accumulatedRuntimeMs + 300_000);
    service.close();
    assert.equal(networkCalls, 0);
    assert.equal(promptCalls, 0);
    assert.equal(paidCalls, 0);
    console.log('内部版支持检查通过：无支付请求/订单恢复/打赏提示，累计数据、重启恢复和导出 IPC 保留。');
  } finally {
    service?.close();
    await fs.promises.rm(root, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
