// app.json remains the base configuration. OAuth client IDs are public app IDs,
// never client secrets. The URL scheme is applied to new native builds.
module.exports = ({ config }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const iosUrlScheme = iosClientId?.endsWith('.apps.googleusercontent.com')
    ? `com.googleusercontent.apps.${iosClientId.slice(0, -'.apps.googleusercontent.com'.length)}`
    : undefined;
  return {
    ...config,
    plugins: [...(config.plugins ?? []), ...(iosUrlScheme
      ? [['@react-native-google-signin/google-signin', { iosUrlScheme }]]
      : [])],
  };
};
