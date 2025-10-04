import React from 'react';
import { View } from 'react-native';
import Millet from '@/components/stories/MilletStory';
import { Stack } from 'expo-router';

export default function MilletStory() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          animation: 'slide_from_right'
        }} 
      />
      <Millet/>
    </View>
  );
}