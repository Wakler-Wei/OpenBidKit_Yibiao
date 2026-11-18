const fs = require('node:fs/promises');
const path = require('node:path');
const { getAgentErrorReportsDir } = require('../utils/paths.cjs');

function createAgentDiagnosticService({ app, dialog }) {
  const reportsDir = getAgentErrorReportsDir(app);

  async function list() {
    const entries = await fs.readdir(reportsDir, { withFileTypes: true }).catch((error) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    const reports = await Promise.all(entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json.gz')).map(async (entry) => {
      try {
        const stat = await fs.stat(path.join(reportsDir, entry.name));
        return { name: entry.name, createdAt: stat.mtime.toISOString(), bytes: stat.size };
      } catch (error) {
        if (error.code === 'ENOENT') return null; // 存储空间清理可能与查看列表同时进行。
        throw error;
      }
    }));
    return reports.filter(Boolean).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async function exportReport(name) {
    const sourcePath = path.join(reportsDir, name);
    await fs.access(sourcePath);
    const result = await dialog.showSaveDialog({
      title: '导出失败诊断包（可能包含业务正文）',
      defaultPath: path.join(app.getPath('documents'), `微品致远-失败诊断-${name}`),
      filters: [{ name: '脱敏诊断包（JSON / Gzip）', extensions: ['gz'] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    await fs.copyFile(sourcePath, result.filePath);
    return { canceled: false, path: result.filePath };
  }

  return { list, exportReport };
}

module.exports = { createAgentDiagnosticService };
