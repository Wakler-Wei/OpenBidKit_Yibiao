import { useEffect, useState } from 'react';
import { AppDialog, InlineSpinner, useToast } from '../../../shared/ui';

type DiagnosticReport = { name: string; createdAt: string; bytes: number };

export default function AgentDiagnosticsPanel() {
  const [open, setOpen] = useState(false);
  const [reports, setReports] = useState<DiagnosticReport[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [exporting, setExporting] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!open) return;
    let disposed = false;
    setStatus('loading');
    void window.yibiao.agentDiagnostics.list().then((items) => {
      if (disposed) return;
      setReports(items);
      setStatus('ready');
    }).catch((error) => {
      if (disposed) return;
      setStatus('error');
      showToast(error instanceof Error ? error.message : '读取诊断包失败', 'error');
    });
    return () => { disposed = true; };
  }, [open, attempt, showToast]);

  async function exportReport(name: string) {
    setExporting(name);
    try {
      const result = await window.yibiao.agentDiagnostics.exportReport(name);
      if (!result.canceled) showToast('诊断包已导出，请按公司要求交给内部管理员', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '导出诊断包失败，请刷新列表后重试', 'error');
    } finally {
      setExporting(null);
    }
  }

  return (
    <>
      <div className="settings-row">
        <div className="settings-row-copy">
          <strong>失败诊断包</strong>
          <span>Agent 最终失败后在本机脱敏保存，不自动上传；可手动导出给内部管理员排障。</span>
        </div>
        <div className="settings-action-cell">
          <button type="button" className="inline-action" onClick={() => setOpen(true)}>查看与导出</button>
        </div>
      </div>
      <AppDialog
        open={open}
        onOpenChange={setOpen}
        title="本机失败诊断包"
        description="诊断包会遮盖已配置的密钥和常见认证信息，但仍可能包含任务提示词、业务正文、工作区文件、本地路径和系统信息。请确认后仅交给内部管理员。"
        preventClose={exporting !== null}
        actions={(
          <>
            <button type="button" className="secondary-action" disabled={status === 'loading' || exporting !== null} onClick={() => setAttempt((value) => value + 1)}>刷新列表</button>
            <button type="button" className="secondary-action" disabled={exporting !== null} onClick={() => setOpen(false)}>关闭</button>
          </>
        )}
      >
        <div className="agent-report-list" aria-busy={status === 'loading'}>
          {status === 'loading' && <p><InlineSpinner /> 正在读取诊断包…</p>}
          {status === 'error' && <p>读取失败，请刷新列表重试。</p>}
          {status === 'ready' && reports.length === 0 && <p>暂无诊断包。此功能启用后的 Agent 最终失败会生成诊断包；取消和暂停不会生成，采集完成后可刷新查看。</p>}
          {status === 'ready' && reports.map((report) => (
            <div className="settings-row" key={report.name}>
              <div className="settings-row-copy">
                <strong>{new Date(report.createdAt).toLocaleString('zh-CN')}</strong>
                <span>{report.bytes < 1024 * 1024 ? `${(report.bytes / 1024).toFixed(1)} KB` : `${(report.bytes / 1024 / 1024).toFixed(2)} MB`} · {report.name}</span>
              </div>
              <button type="button" className="inline-action" disabled={exporting !== null} onClick={() => void exportReport(report.name)}>
                {exporting === report.name ? '正在导出…' : '导出'}
              </button>
            </div>
          ))}
        </div>
        <p className="agent-report-note">导出为 .json.gz，解压后可查看 JSON。诊断包持续保留在本机；可在“存储空间 → 临时、缓存、日志”中清理，需要排障时请先导出。</p>
      </AppDialog>
    </>
  );
}
