const product = require('../../assets/product.json');

// 内部安装包只人工分发。所有旧 IPC 入口保持兼容，均不联网、不下载或安装。
function disabledResult() {
  return { enabled: false, updateAvailable: false, message: product.manualUpdateMessage };
}

function setupAutoUpdate() {}

async function checkAndDownloadUpdate() {
  return disabledResult();
}

async function triggerUpdateDownload() {
  return disabledResult();
}

function isUpdateCacheInUse() {
  return false;
}

async function quitAndInstall() {
  return { success: false, message: product.manualUpdateMessage };
}

async function getLatestVersion() {
  return {
    version: '', name: product.name, body: product.manualUpdateMessage,
    published_at: '', html_url: '', download_url: '',
  };
}

async function getUpdateDownloadUrl() {
  return '';
}

module.exports = {
  setupAutoUpdate, checkAndDownloadUpdate, triggerUpdateDownload,
  isUpdateCacheInUse, quitAndInstall, getLatestVersion, getUpdateDownloadUrl,
};
