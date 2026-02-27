import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const DEVICE_ID_KEY = 'device_id';

export async function ensureDeviceIdentity() {
  const existingId = await SecureStore.getItemAsync(DEVICE_ID_KEY);

  if (existingId) {
    return;
  }

  const deviceId = Crypto.randomUUID();

  // Write both before returning (pair integrity)
  await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });


}
export async function getDeviceId(): Promise<string> {
  const id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (!id) {
    throw new Error('Device identity not initialized');
  }
  return id;
}



