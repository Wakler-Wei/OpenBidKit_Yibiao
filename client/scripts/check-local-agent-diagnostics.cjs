const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { gunzipSync } = require('node:zlib');
const { app } = require('electron');

// 真实 Electron utilityProcess 采集；网络接收器只用于确认内部模式没有预检/上传。
async function main() {
  await app.whenReady();
  const root = await fs.mkdtemp(path.join(os.tmpdir(), '微品-本地失败诊断-'));
  let requests = 0;
  const server = http.createServer((_request, response) => {
    requests += 1;
    response.end(JSON.stringify({ code: 0, accepted: true }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  process.env.YIBIAO_AGENT_ERROR_ENDPOINT = `http://127.0.0.1:${server.address().port}/agent-errors`;
  const { createAgentErrorReporter } = require('../electron/services/agent/agentErrorReporter.cjs');
  const { createAgentDiagnosticService } = require('../electron/services/agentDiagnosticService.cjs');
  const { getAgentErrorReportsDir } = require('../electron/utils/paths.cjs');
  const workspaceDir = path.join(root, '失败任务工作区');
  const fakeApp = { getVersion: () => '0.1.0', isPackaged: false, getPath: () => root };
  const key = 'sk-fake-fixture-never-a-real-credential';
  const reporter = createAgentErrorReporter({
    app: fakeApp,
    configStore: { load: () => ({ api_key: key, model_name: '测试模型', image_model: { api_key: 'image-fixture-secret' } }) },
    licenseService: { getLicenseEnvelope: () => null },
  });
  let canceled = true;
  const exportPath = path.join(root, '导出给管理员.json.gz');
  const service = createAgentDiagnosticService({
    app: fakeApp,
    dialog: { showSaveDialog: async () => ({ canceled, filePath: exportPath }) },
  });
  try {
    assert.deepEqual(await service.list(), []);
    await fs.mkdir(workspaceDir);
    await fs.writeFile(path.join(workspaceDir, '任务材料.md'), `业务正文保留，密钥 ${key} image-fixture-secret\nAuthorization: Bearer unknown-fixture-token\nhttps://test.invalid/?token=query-fixture`, 'utf-8');
    await fs.writeFile(path.join(workspaceDir, '二进制.bin'), Buffer.concat([Buffer.from([0]), Buffer.from(key)]));
    const error = new Error(`模拟上游失败 ${key}`);
    error.code = 'AI_HTTP_ERROR';
    error.agentWorkspaceDir = workspaceDir;
    error.agentDiagnostics = { authorization: 'some-fixture', detail: `Bearer header-fixture` };
    await reporter.reportFailure({ payload: { title: '测试任务', prompt: `用户任务 ${key}` }, error, userTaskContext: { stage: '测试阶段' } });
    const reports = await service.list();
    assert.equal(reports.length, 1);
    const reopenedService = createAgentDiagnosticService({ app: fakeApp, dialog: {} });
    assert.deepEqual(await reopenedService.list(), reports, '重建服务后仍能读取本机诊断包');
    const bytes = await fs.readFile(path.join(getAgentErrorReportsDir(fakeApp), reports[0].name));
    const text = gunzipSync(bytes).toString('utf-8');
    for (const secret of [key, 'image-fixture-secret', 'unknown-fixture-token', 'query-fixture', 'header-fixture']) assert.ok(!text.includes(secret));
    const report = JSON.parse(text);
    assert.equal(report.config.api_key, '[REDACTED]');
    assert.equal(report.client.license_payload, null);
    assert.equal(report.task.title, '测试任务');
    assert.match(report.workspace.files.find((file) => file.path === '任务材料.md').content, /业务正文保留/);
    const binary = report.workspace.files.find((file) => file.path === '二进制.bin');
    assert.ok(!Buffer.from(binary.content, 'base64').includes(Buffer.from(key)));
    assert.equal(requests, 0);
    const interruption = Object.assign(new Error('用户暂停'), { code: 'CONTENT_GENERATION_PAUSED' });
    await reporter.reportFailure({ error: interruption });
    await reporter.reportFailure({ error: Object.assign(new Error('用户取消'), { code: 'TASK_CANCELLED' }) });
    assert.equal((await service.list()).length, 1);
    const { runReport } = require('../electron/services/agent/agentErrorReportProcess.cjs');
    await assert.rejects(runReport({
      config: {}, app: {}, client: {}, error: {}, occurredAt: new Date().toISOString(),
      localReportDir: getAgentErrorReportsDir(fakeApp), maxCompressedBytes: 1,
    }), /超过大小限制/);
    assert.equal((await service.list()).length, 1, '超限不留下可导出的残缺包');
    assert.deepEqual(await service.exportReport(reports[0].name), { canceled: true });
    await assert.rejects(fs.access(exportPath));
    canceled = false;
    assert.equal((await service.exportReport(reports[0].name)).path, exportPath);
    assert.deepEqual(await fs.readFile(exportPath), bytes);
    await fs.writeFile(path.join(getAgentErrorReportsDir(fakeApp), 'unfinished.json.gz.tmp'), 'partial', 'utf-8');
    assert.equal((await service.list()).length, 1);
    reporter.close();
    await reporter.reportFailure({ error });
    assert.equal((await service.list()).length, 1);
    console.log('PASS: 真实 utilityProcess、中文路径、无许可证/无埋点ID的本地留存、凭据脱敏、业务现场保留、零上传、暂停不采集、导出/取消、忽略未完成文件');
  } finally {
    reporter.close();
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(root, { recursive: true, force: true });
  }
}

main().then(() => app.exit(0), (error) => { console.error(error); app.exit(1); });
