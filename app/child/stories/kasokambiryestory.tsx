import React from 'react';
import { View } from 'react-native';
import Kaso from '@/components/stories/KasokambiryeStory';
import { Stack } from 'expo-router';

export default function KasoStory() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          animation: 'slide_from_right'
        }} 
      />
      <Kaso/>
    </View>
  );
}