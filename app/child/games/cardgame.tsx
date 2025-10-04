import React from 'react';
import { View } from 'react-native';
import CardGameComponent from '@/components/games/CardsMatchingComponent';
import { Stack } from 'expo-router';

export default function CardGame() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          animation: 'slide_from_right'
        }} 
      />
      <CardGameComponent/>
    </View>
  );
}