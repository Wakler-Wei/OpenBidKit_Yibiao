const fs = require('node:fs');
const path = require('node:path');

// electron-builder 对缺失的 extraResources 只警告，助手缺失却会让模板预览和 Word 导出不可用。
module.exports = function checkOpenXmlBeforePack(context) {
  const platform = context.electronPlatformName;
  const arch = context.arch === 1 ? 'x64' : context.arch === 3 ? 'arm64' : String(context.arch);
  const executable = platform === 'win32' ? 'openxmlhelper.exe' : 'openxmlhelper';
  const helperPath = path.join(context.packager.projectDir, 'vendor', 'openxml-tools', `${platform}-${arch}`, executable);
  if (!fs.existsSync(helperPath)) {
    throw new Error(`打包中止：缺少 Word/模板助手 ${helperPath}。请先运行 npm run prepare-openxml-helper -- --platform ${platform} --arch ${arch}`);
  }
};
