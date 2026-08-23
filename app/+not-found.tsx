import { View, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { useChild } from '@/context/ChildContext';
import { CHILD_HOME_ROUTE } from '@/constants/ChildNavigation';

export default function NotFoundScreen() {
  const { activeChild } = useChild();
  const fallbackHref = activeChild ? CHILD_HOME_ROUTE : '/parent';

  return (
    <>
      <Stack.Screen options={{ title: 'Oops! Not Found' }} />
      <View style={styles.container}>
        <Link href={fallbackHref as any} style={styles.button}>
          Go back to Home screen!
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    justifyContent: 'center',
    alignItems: 'center',
  },

  button: {
    fontSize: 20,
    textDecorationLine: 'underline',
    color: '#fff',
  },
});
