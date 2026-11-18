import { useCallback, useEffect, useRef, useState } from 'react';
import type { SettingsPageRequest } from '../features/settings/types';
import type { SectionId } from '../shared/types/navigation';
import { useToast } from '../shared/ui';

// 内部版启动时只检查员工自行配置的文本接口，不查询作者账户或余额。
export function useTextModelSetupRedirect(requestSectionChange: (section: SectionId) => Promise<boolean>) {
  const [settingsRequest, setSettingsRequest] = useState<SettingsPageRequest | null>(null);
  const { showToast } = useToast();
  const redirectRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    redirectRef.current = () => {
      showToast('文本模型尚未配置，请填写服务商地址、API Key 和模型名称', 'info');
      setSettingsRequest({ tab: 'text-model', openRecharge: false });
      void requestSectionChange('settings').then((allowed) => {
        if (!allowed) setSettingsRequest(null);
      });
    };
  });

  useEffect(() => {
    let disposed = false;
    void window.yibiao.config.load()
      .then((config) => {
        if (!disposed && (!config.api_key || !config.model_name || !config.base_url)) {
          redirectRef.current();
        }
      })
      .catch((error) => console.warn('读取文本模型配置失败', error));
    return () => { disposed = true; };
  }, []);

  const clearSettingsRequest = useCallback(() => setSettingsRequest(null), []);
  return { settingsRequest, clearSettingsRequest };
}
