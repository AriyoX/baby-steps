import React from 'react';
import { View } from 'react-native';
import KasubiTombs from '@/components/stories/KasubiTombsStory';
import { Stack } from 'expo-router';

export default function KasubiTombsStory() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          animation: 'slide_from_right'
        }} 
      />
      <KasubiTombs/>
    </View>
  );
}