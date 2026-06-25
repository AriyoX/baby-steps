import React from 'react';
import { View } from 'react-native';
import CardGameComponent from '@/components/games/CardsMatchingComponent';
import { Stack } from 'expo-router';

export default function CardGame() {
  return (
    <View style={{ flex: 1 }} testID="card-matching-game-screen">
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
