// 静态设计演示：不请求外网，不读写真实客户端配置，不持久化输入。
const root = document.querySelector('[data-form]');
const formMarkup = `
  <div class="field"><label for="provider">服务提供商</label><select id="provider"><option value="custom">自定义兼容服务</option><option value="deepseek">DeepSeek</option><option value="volcengine">火山方舟</option></select><p>使用你已开通的模型服务。</p></div>
  <div class="field"><label for="base-url">服务地址 Base URL</label><input id="base-url" type="url" placeholder="https://api.your-provider.example/v1" autocomplete="off"><p>按服务商说明填写完整接口地址。</p></div>
  <div class="field"><label for="api-key">API Key</label><div class="input-row"><input id="api-key" type="password" placeholder="填写你自己的 API Key" autocomplete="off" aria-describedby="key-hint"><button type="button" data-reveal aria-pressed="false">显示</button></div><p id="key-hint">本页为设计演示，请勿填写真实密钥。</p></div>
  <div class="field"><label for="model">模型名称</label><div class="input-row"><input id="model" placeholder="输入服务商支持的模型 ID" autocomplete="off"><button type="button" data-model>演示获取</button></div><p>模型 ID 由服务商提供；连接前请确认已开通权限。</p></div>
  <details><summary>高级参数</summary><div class="param-grid"><div class="field"><label for="concurrency">并发上限</label><input id="concurrency" type="number" min="1" value="10"></div><div class="field"><label for="request-mode">请求方式</label><select id="request-mode"><option>流式请求</option><option>普通请求</option></select></div></div></details>
  <div class="action-row"><span class="status" data-status>尚未保存 · 演示</span><div class="actions"><button type="button" data-test>演示测试</button><button class="primary" type="button" data-save>演示保存</button></div></div>`;
if (root) root.innerHTML = formMarkup;
let toastTimer;
function tell(message) {
  const toast = document.querySelector('[role="status"]');
  toast.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.textContent = ''; }, 4500);
}
document.querySelectorAll('[data-reveal]').forEach(button => button.addEventListener('click', () => {
  const input = document.querySelector('#api-key');
  const showing = input.type === 'password';
  input.type = showing ? 'text' : 'password';
  button.textContent = showing ? '隐藏' : '显示';
  button.setAttribute('aria-pressed', String(showing));
}));
document.querySelectorAll('[data-model]').forEach(button => button.addEventListener('click', () => {
  document.querySelector('#model').value = 'example-model';
  tell('已填入演示模型 ID；未访问模型服务。');
}));
document.querySelectorAll('[data-test]').forEach(button => button.addEventListener('click', () => tell('演示：正式版本将在此显示连接结果，本页未发起请求。')));
document.querySelectorAll('[data-save]').forEach(button => button.addEventListener('click', () => {
  document.querySelector('[data-status]').textContent = '已演示保存 · 刷新即清空';
  tell('保存交互演示完成；未写入磁盘或浏览器存储。');
}));
document.querySelector('#provider')?.addEventListener('change', event => {
  const urls = { custom: '', deepseek: 'https://api.deepseek.com', volcengine: 'https://ark.cn-beijing.volces.com/api/v3' };
  document.querySelector('#base-url').value = urls[event.target.value];
});
const tabButtons = document.querySelectorAll('[data-tab]');
tabButtons.forEach(button => button.addEventListener('click', () => {
  tabButtons.forEach(tab => { tab.classList.remove('active'); tab.setAttribute('aria-pressed', 'false'); });
  button.classList.add('active');
  button.setAttribute('aria-pressed', 'true');
  const textPanel = document.querySelector('[data-text-panel]');
  const alternative = document.querySelector('[data-alt-panel]');
  const textSelected = button.dataset.tab === '文本模型';
  textPanel.hidden = !textSelected;
  alternative.hidden = textSelected;
  alternative.querySelector('h2').textContent = button.dataset.tab;
}));
document.querySelectorAll('[data-nav]').forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  tell(`${link.textContent.trim()}：本初稿只演示模型配置，正式版沿用现有业务功能。`);
}));
let currentStep = 0;
const stepButtons = document.querySelectorAll('[data-step]');
function showStep(step) {
  currentStep = step;
  stepButtons.forEach((button, index) => { button.classList.toggle('active', index === step); if (index === step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current'); });
  document.querySelectorAll('.step-view').forEach((view, index) => { view.hidden = index !== step; });
  const prev = document.querySelector('[data-prev]');
  if (prev) prev.hidden = step === 0;
  const next = document.querySelector('[data-next]');
  if (next) next.textContent = step === 2 ? '演示保存' : '下一步';
}
stepButtons.forEach((button, index) => button.addEventListener('click', () => showStep(index)));
document.querySelector('[data-prev]')?.addEventListener('click', () => showStep(Math.max(0, currentStep - 1)));
document.querySelector('[data-next]')?.addEventListener('click', () => {
  if (currentStep < 2) showStep(currentStep + 1);
  else { document.querySelector('[data-status]').textContent = '已演示保存 · 刷新即清空'; tell('配置交互演示完成；未保存或发送真实凭证。'); }
});
