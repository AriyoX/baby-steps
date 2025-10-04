import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

const SkipButton = () => {
  const router = useRouter();   
    return (
        <TouchableOpacity style={styles.skipButton} onPress={() => router.push("/add-child" as any)}>
            <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
    )}

export default SkipButton;

const styles = StyleSheet.create({
    skipButton: {
        backgroundColor: '#f1f1f1',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        position: 'absolute',
        top: 20,
        right: 20,
        marginTop: 0,
        paddingHorizontal: 20,
      },
      skipButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#007bff',
      },
})
