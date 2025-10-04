import React from 'react';
import { View } from 'react-native';
import Mwanga from '@/components/stories/MwangaStory';
import { Stack } from 'expo-router';

export default function MwangaStory() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          animation: 'slide_from_right'
        }} 
      />
      <Mwanga/>
    </View>
  );
}