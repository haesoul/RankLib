const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

const getUniqueIdentifier = () => {
  if (IS_DEV) {
    return 'com.anonymous.ranklib.development';
  }
  if (IS_PREVIEW) {
    return 'com.anonymous.ranklib.dev';
  }
  return 'com.anonymous.ranklib';
};

const getAppName = () => {
  if (IS_PREVIEW) {
    return 'Haesoul';
  }
  return 'RankLib';
};

function getIcon() {
  if (IS_PREVIEW) return "./assets/Haesoul/icon.png"
  return "./assets/images/icon.png"
}
function getAdaptiveIcon() {
  if (IS_PREVIEW) return "./assets/Haesoul/adaptive-icon.png"
  return "./assets/images/adaptive-icon.png"
}
function getFavIcon() {
  if (IS_PREVIEW) return "./assets/Haesoul/favicon.png"
  return "./assets/images/favicon.png"
}
function getSplashIcon() {
  if (IS_PREVIEW) return "./assets/Haesoul/splash-icon.png"
  return "./assets/images/splash-icon.png"
}
export default {
  expo: {
    name: getAppName(),
    slug: "my-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: getIcon(),
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: getUniqueIdentifier(),
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: getAdaptiveIcon(),
        backgroundColor: "#000000"
      },
      edgeToEdgeEnabled: true,
      package: getUniqueIdentifier(),
      softwareKeyboardLayoutMode: "pan"
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: getFavIcon()
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": getSplashIcon(),
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#000000",
          "darkStatusBarContent": true, 
          "statusBarStyle": "light-content"
        }
      ],
      "expo-video",
      "expo-localization",
      "expo-secure-store"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {},
      eas: {
        projectId: "27fb07ed-72aa-4e50-8bfe-8cdfa8c148f8"
      }
    },
    cli: {
      appVersionSource: "remote"
    },
    androidStatusBar: {
      translucent: false,
      backgroundColor: "#000000",
      barStyle: "light-content"
    }
  }
};