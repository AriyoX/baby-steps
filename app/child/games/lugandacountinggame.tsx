import React from 'react';
import { View } from 'react-native';
import LugandaCountingGame from '@/components/games/CountingGameComponent';
import { Stack } from 'expo-router';

export default function WordGame() {
  return (
    <View style={{ flex: 1 }} testID="counting-game-screen">
      <Stack.Screen 
        options={{ 
          headerShown: false,
          animation: 'slide_from_right'
        }} 
      />
      <LugandaCountingGame/>
    </View>
  );
}
