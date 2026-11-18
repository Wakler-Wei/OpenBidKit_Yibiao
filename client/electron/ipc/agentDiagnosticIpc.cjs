const { ipcMain } = require('electron');

function registerAgentDiagnosticIpc({ agentDiagnosticService }) {
  ipcMain.handle('agent-diagnostics:list', () => agentDiagnosticService.list());
  ipcMain.handle('agent-diagnostics:export', (_event, name) => agentDiagnosticService.exportReport(name));
}

module.exports = { registerAgentDiagnosticIpc };
