import React from 'react';
import { View } from 'react-native';
import FigTree from '@/components/stories/FigTreeStory';
import { Stack } from 'expo-router';

export default function FigTreeStory() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          animation: 'slide_from_right'
        }} 
      />
      <FigTree/>
    </View>
  );
}