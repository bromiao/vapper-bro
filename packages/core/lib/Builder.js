const EventEmitter = require('events')
const webpack = require('webpack')
const MemoryFS = require('memory-fs')
const FS = require('fs')
const pify = require('pify')
const path = require('path')

/**
 * Build resources for production or development environments.
 */
class Builder extends EventEmitter {
  /**
   * @param {object} api - PluginApi
   */
  constructor (api) {
    super()

    this.api = api

    const { options, logger } = api

    this.mode = options.mode || 'production'
    this.isProd = this.mode === 'production'

    logger.debug(`Run Builder in ${this.mode} mode.`)

    // Get webpack config
    const configer = this.loadConfiger()
    this.serverWebpackConfig = configer.getServerConfig()
    this.clientWebpackConfig = configer.getClientConfig()

    // bundle
    this.serverBundle = null
    this.clientManifest = null

    // middleware
    this.devMiddleware = null
    this.hotMiddleware = null
  }

  /**
   * Running the build
   */
  run () {
    this._resolve = null
    return new Promise(resolve => {
      this._resolve = resolve
      this.runServerCompiler()
      this.runClientCompiler()
    })
  }

  runServerCompiler () {
    this.serverCompiler = webpack(this.serverWebpackConfig)

    if (this.isProd) {
      this.serverCompiler.run()
    } else {
      this.serverCompiler.outputFileSystem = new MemoryFS()
      this.serverCompiler.watch({}, () => {})
    }

    this.serverCompiler.hooks.done.tap('@homo-builder-vue-cli', () => {
      this.compiledHandler('server')
    })
  }

  async runClientCompiler () {
    this.clientCompiler = webpack(this.clientWebpackConfig)

    if (this.isProd) {
      this.clientCompiler.run()
    } else {
      this.devMiddleware = pify(
        require('webpack-dev-middleware')(this.clientCompiler, {
          publicPath: this.clientWebpackConfig.output.publicPath,
          logLevel: 'silent',
          noInfo: true
        }),
        { exclude: ['getFilenameFromUrl'] }
      )
      this.hotMiddleware = pify(
        require('webpack-hot-middleware')(this.clientCompiler, {
          log: false
        })
      )
    }

    this.clientCompiler.hooks.done.tap('@homo-builder-vue-cli', () => {
      this.compiledHandler('client')
    })
  }

  compiledHandler (type) {
    if (!type) return

    const {
      logger,
      options: { serverBundleFileName, clientManifestFileName }
    } = this.api
    const isServer = type === 'server'
    const fs = isServer
      ? this.isProd
        ? FS
        : this.serverCompiler.outputFileSystem
      : this.isProd
        ? FS
        : this.devMiddleware.fileSystem
    const fileName = isServer ? serverBundleFileName : clientManifestFileName

    const JSONContent = JSON.parse(
      fs.readFileSync(
        path.resolve(this.clientWebpackConfig.output.path, fileName),
        'utf-8'
      )
    )

    isServer
      ? this.serverBundle = JSONContent
      : this.clientManifest = JSONContent

    if (this.serverBundle && this.clientManifest) {
      logger.debug('Server bundle and client manifest generated successfully')
      const result = {
        serverBundle: this.serverBundle,
        clientManifest: this.clientManifest
      }

      this._resolve(result)
      this.emit('change', result)
    }
  }

  loadConfiger () {
    const builderRE = /^(@homo\/|homo-|@[\w-]+\/homo-)configer-/
    const builders = this.api.loadDependencies(builderRE)

    let Configer

    if (!builders.length) {
      this.api.logger.debug(`You have not installed any Configer, ` +
        'will use the default configer: `@homo/configer-vue-cli`'
      )
      Configer = require('@homo/configer-vue-cli')
    } else {
      this.api.logger.debug(`Find builder: \`${builders[0]}\``)
      // Only care about the first found builder
      Configer = require(builders[0])
    }

    return new Configer(this.api)
  }
}

module.exports = Builder
