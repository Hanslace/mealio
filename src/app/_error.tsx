import { Text, View, StyleSheet } from 'react-native';

export default function GlobalError({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{error.message}</Text>
      <Text onPress={retry} style={styles.retry}>Retry</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '600' },
  message: { marginTop: 8 },
  retry: { marginTop: 16, color: 'blue' },
});
