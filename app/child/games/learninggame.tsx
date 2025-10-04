import React from 'react';
import { View } from 'react-native';
import LearningGame from '@/components/games/LearningGameComponent';
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
      <LearningGame/>
    </View>
  );
}