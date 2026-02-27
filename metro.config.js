// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Block react-native-maps from being bundled on web by mapping it to a no-op stub
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web' && moduleName === 'react-native-maps') {
        return {
            type: 'sourceFile',
            filePath: require.resolve('./stubs/react-native-maps-stub.js'),
        };
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
