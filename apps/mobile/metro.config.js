const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Watch the whole monorepo so changes in packages/* trigger a reload.
config.watchFolders = [workspaceRoot]

// Resolve from the app first, then the workspace root (bun hoists to the root).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// Without this a hoisted duplicate of react can produce two React instances.
config.resolver.disableHierarchicalLookup = true

module.exports = config
