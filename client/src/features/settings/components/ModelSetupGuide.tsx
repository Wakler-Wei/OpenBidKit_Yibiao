interface ModelSetupGuideProps {
  image?: boolean;
}

export default function ModelSetupGuide({ image = false }: ModelSetupGuideProps) {
  return (
    <aside className="model-setup-guide" aria-label="模型接入说明">
      <span className="model-guide-label">个人 Key 接入</span>
      <h2>准备好这三项即可开始</h2>
      <ol>
        <li>服务商提供的接口地址</li>
        <li>你自己的 API Key</li>
        <li>已开通的模型名称</li>
      </ol>
      <hr />
      <h3>{image ? '生图按需配置' : '连接后再开始生成'}</h3>
      <p>{image ? '生图与文本接口可使用不同服务商。ComfyUI 可连接本地或局域网服务。' : '填写后获取模型列表或手动输入模型名，测试连接，再点击底部“保存”。'}</p>
      <p>配置保存在本机独立目录。模型调用的费用与额度由所选服务商管理。</p>
    </aside>
  );
}
