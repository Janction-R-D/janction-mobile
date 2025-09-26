import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  StatusBar,
  useColorScheme,
} from 'react-native';

import {Colors} from 'react-native/Libraries/NewAppScreen';
import {MetaMaskProvider} from '@metamask/sdk-react-native';
import MetaMaskLogin from './src/components/MetaMaskLogin';

// Import polyfills
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

function App(): JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <MetaMaskProvider
      debug={false}
      sdkOptions={{
        dappMetadata: {
          name: 'Janction Mobile',
          url: 'https://janction.com',
        },
        infuraAPIKey: 'YOUR_INFURA_API_KEY', // 请替换为您的 Infura API Key
      }}>
      <SafeAreaView style={[styles.container, backgroundStyle]}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={backgroundStyle.backgroundColor}
        />
        <MetaMaskLogin />
      </SafeAreaView>
    </MetaMaskProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;