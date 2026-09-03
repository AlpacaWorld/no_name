const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://liar-game-front.vercel.app',
];

export function getAllowedOrigins() {
  const configuredOrigins = (process.env.CLIENT_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins])];
}
