import React from 'react';
import { View } from 'react-native';
import BugandaPuzzleGame from '@/components/games/PuzzleGameComponent';
import { Stack } from 'expo-router';

export default function PuzzleGame() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          animation: 'slide_from_right'
        }} 
      />
      <BugandaPuzzleGame/>
    </View>
  );
}