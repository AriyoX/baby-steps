import React from 'react';
import { View } from 'react-native';
import Ssezibwa from '@/components/stories/SsezibwaStory';
import { Stack } from 'expo-router';

export default function SsezibwaStory() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          animation: 'slide_from_right'
        }} 
      />
      <Ssezibwa/>
    </View>
  );
}