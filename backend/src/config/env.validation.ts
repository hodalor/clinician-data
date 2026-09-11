const REQUIRED_ENV_VARS = [
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

export function validateEnv(config: Record<string, unknown>) {
  for (const key of REQUIRED_ENV_VARS) {
    const value = config[key];

    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  const port = Number.parseInt(String(config.PORT ?? '3000'), 10);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error('PORT must be a positive integer');
  }

  return {
    ...config,
    PORT: port,
  };
}
