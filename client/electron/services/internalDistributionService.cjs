const { getLicenseFilePath } = require('../utils/paths.cjs');

// 人工分发的内部产品没有激活、订阅或授权到期机制。
// 此状态描述发行方式，不表示通过原作者认证或操作系统代码签名。
function createInternalDistributionService({ app }) {
  function getStatus() {
    return {
      status: 'internal_distribution',
      plan: 'internal',
      expiresAt: '',
      licenseExpiresAt: '',
      licenseStatus: 'internal_distribution',
      activationMode: 'internal_distribution',
      sourceTrusted: false,
      sourceTrustedText: 'false',
      untrustedReason: 'internal_manual_distribution',
      machineFingerprintHash: '',
      fingerprintVersion: '',
      buildTrusted: false,
      buildChanged: false,
      buildId: '',
      keyId: '',
      lastCheckedAt: new Date().toISOString(),
      config: {
        freeLicenseDays: 0,
        expirePopupEnabled: false,
        expirePopupDismissible: true,
      },
    };
  }

  async function activationNotRequired() {
    return {
      success: false,
      message: '公司内部版通过内部管理员分发，无需激活授权。',
      status: getStatus(),
    };
  }

  return {
    getLicenseFilePath: () => getLicenseFilePath(app),
    // 不将原作者的许可证或构建证明用于内部产品、统计认证或诊断上传。
    getBuildAttestation: () => null,
    getLicenseEnvelope: () => null,
    getStatus: async () => getStatus(),
    refresh: async () => getStatus(),
    refreshOnStartup: async () => getStatus(),
    getCurrentStatus: getStatus,
    importOfflineFile: activationNotRequired,
    activateOfflineCode: activationNotRequired,
  };
}

module.exports = { createInternalDistributionService };
