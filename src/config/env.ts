function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const ENV = {
  USL_URL: required('EXPO_PUBLIC_USL_URL'),
  CLIENT_ID: required('EXPO_PUBLIC_CLIENT_ID'),
  API_BASE_URL: required('EXPO_PUBLIC_API_BASE_URL'),
  SERVICE_NAME: required('EXPO_PUBLIC_SERVICE_NAME'),
};
