import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SnypeStatApp } from './src/SnypeStatApp';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SnypeStatApp />
    </SafeAreaProvider>
  );
}
