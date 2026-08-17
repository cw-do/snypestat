import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SnypeStatApp } from './src/SnypeStatApp';

export default function App() {
  useEffect(() => {
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
  }, []);
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SnypeStatApp />
    </SafeAreaProvider>
  );
}
