import React from 'react';
import { View } from 'react-native';
import Walumbe from '@/components/stories/WalumbeStory';
import { Stack } from 'expo-router';

export default function WalumbeStory() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          animation: 'slide_from_right'
        }} 
      />
      <Walumbe/>
    </View>
  );
}