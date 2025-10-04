import React from 'react';
import { View } from 'react-native';
import Kintu from '@/components/stories/KintuStory';
import { Stack } from 'expo-router';

export default function KintuStory() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          animation: 'slide_from_right'
        }} 
      />
      <Kintu/>
    </View>
  );
}