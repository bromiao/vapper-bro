const path = require('path')
const fs = require('fs-extra')

module.exports = function (api) {
  const enhanceObj = {
    clientModuleName: 'defaultEnhanceClientApp'
  }

  /*const clientPath = path.isAbsolute(api.options.clientEntry)
    ? api.options.clientEntry
    : api.resolveCWD(api.options.clientEntry)

  if (fs.pathExistsSync(clientPath)) {
    enhanceObj.client = clientPath
  }

  const serverPath = path.isAbsolute(api.options.serverEntry)
    ? api.options.serverEntry
    : api.resolveCWD(api.options.serverEntry)
  if (fs.pathExistsSync(serverPath)) {
    enhanceObj.server = serverPath
  }*/

  enhanceObj.client = 'E:\\webProject\\kb-m-v1.0\\src\\client-entry.js'
  enhanceObj.server = 'E:\\webProject\\kb-m-v1.0\\src\\server-entry.js'

  api.addEnhanceFile(enhanceObj)
}
