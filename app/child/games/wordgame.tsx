import React from 'react';
import { View } from 'react-native';
import WordGameComponent from '@/components/games/WordGameComponent';
import { Stack } from 'expo-router';

export default function WordGame() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          animation: 'slide_from_right'
        }} 
      />
      <WordGameComponent/>
    </View>
  );
}