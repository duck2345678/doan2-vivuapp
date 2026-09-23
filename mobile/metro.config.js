const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];

// Single alias: @ -> src
const srcPath = path.resolve(__dirname, "src");

// Save the original resolveRequest
const { resolveRequest } = config.resolver;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle @/ pattern -> src/
  if (moduleName.startsWith("@/")) {
    const newModuleName = moduleName.replace("@/", "");
    return context.resolveRequest(
      context,
      path.join(srcPath, newModuleName),
      platform
    );
  }

  // Default behavior
  if (resolveRequest) {
    return resolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
