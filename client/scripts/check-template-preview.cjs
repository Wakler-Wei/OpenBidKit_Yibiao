const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const AdmZip = require('adm-zip');
const { app: electronApp } = require('electron');
const { createSqliteDatabase } = require('../electron/services/sqliteDatabase.cjs');
const { createTemplateStore } = require('../electron/services/templateStore.cjs');
const { createTechnicalPlanStore } = require('../electron/services/technicalPlanStore.cjs');
const { createTechnicalPlanExport } = require('../electron/services/technicalPlanExport.cjs');
const { createOpenXmlHelperService } = require('../electron/services/openXmlHelperService.cjs');

// 单张装饰图的隐藏窗口关闭后，检查还要继续生成其余样张。
electronApp.on('window-all-closed', () => {});

// 用 Electron 主进程执行（装饰页眉需要隐藏渲染窗口）；独立中文工作区，不访问客户数据或模型。
async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), '微品模板回归-'));
  const clientRoot = path.resolve(__dirname, '..');
  const previousHelper = process.env.YIBIAO_OPENXML_HELPER_DIR;
  process.env.YIBIAO_OPENXML_HELPER_DIR = path.join(clientRoot, 'vendor/openxml-tools', `${process.platform}-${process.arch}`);
  const app = { isPackaged: true, getPath: () => root, getAppPath: () => clientRoot, once() {} };
  const database = createSqliteDatabase(app);
  const templates = createTemplateStore(database);
  const agentService = { loadPersistentTask: () => null };
  const store = createTechnicalPlanStore({ app, db: database.db, agentService });
  const helper = createOpenXmlHelperService({ app, configStore: { load: () => ({ developer_mode: true }) } });
  try {
    templates.syncSystemTemplates();
    const html = fs.readFileSync(path.join(clientRoot, 'electron/resources/content-generation/正文模板.html'), 'utf-8');
    const systemTemplates = templates.listTemplates();
    assert.equal(systemTemplates.length, 3);
    for (const template of systemTemplates) {
      const result = await helper.renderRestrictedHtmlDocx(html, template.config);
      const document = new AdmZip(Buffer.from(result.bytes)).readAsText('word/document.xml');
      assert.match(document, /项目实施总体方案/);
      assert.ok(result.roles.length > 0);
      if (template.config.page.orientation === 'landscape') assert.match(document, /w:orient="landscape"/);
      console.log(`通过真实 Word 样张：${template.template_name} (${result.bytes.length} bytes)`);
    }
    const copy = templates.duplicateTemplate(systemTemplates[0].template_id);
    const updated = templates.updateTemplate(copy.template_id, {
      ...copy.config, template_name: '回归模板', page: { ...copy.config.page, orientation: 'landscape' },
    });
    store.saveGenerationConfig({ exportTemplateId: updated.template_id });
    assert.equal(store.loadGenerationConfig().exportTemplateId, updated.template_id);
    const selected = templates.getTemplate(store.loadGenerationConfig().exportTemplateId);
    const result = await helper.renderRestrictedHtmlDocx(html, selected.config);
    assert.match(new AdmZip(Buffer.from(result.bytes)).readAsText('word/document.xml'), /w:orient="landscape"/);
    // 导出快照读取已选模板；这里只补入样例目录，不建立或改动真实项目正文。
    const exporter = createTechnicalPlanExport({
      app, templateStore: templates, agentService,
      technicalPlanStore: { loadTechnicalPlan: () => ({
        ...store.loadGenerationConfig(),
        outlineData: { project_name: '模板回归', outline: [{ id: 'test-node', title: '测试章节' }] },
      }) },
    });
    assert.deepEqual(exporter.prepare().export_format, selected.config);
    database.close();
    const reopened = createSqliteDatabase(app);
    try {
      const restored = createTechnicalPlanStore({ app, db: reopened.db, agentService });
      assert.equal(restored.loadGenerationConfig().exportTemplateId, selected.template_id);
      assert.equal(createTemplateStore(reopened).getTemplate(selected.template_id).config.page.orientation, 'landscape');
    } finally { reopened.close(); }
    console.log('通过：复制/编辑/保存、项目选用、Word 方向生效、导出快照和重启恢复；未调用模型。');
  } finally {
    await helper.close();
    database.close();
    if (previousHelper === undefined) delete process.env.YIBIAO_OPENXML_HELPER_DIR;
    else process.env.YIBIAO_OPENXML_HELPER_DIR = previousHelper;
    fs.rmSync(root, { recursive: true, force: true });
  }
}

electronApp.whenReady().then(main).then(
  () => electronApp.exit(0),
  (error) => { console.error(error); electronApp.exit(1); },
);
