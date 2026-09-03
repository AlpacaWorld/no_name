const LOCAL_ORIGIN = 'http://localhost:3000';

export function getAllowedOrigins() {
  const configuredOrigins = (process.env.CLIENT_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configuredOrigins.length > 0
    ? [...new Set(configuredOrigins)]
    : [LOCAL_ORIGIN];
}
