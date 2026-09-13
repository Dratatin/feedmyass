import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescriptConfig from 'eslint-config-next/typescript';

/**
 * eslint-config-next 16 expose directement des configurations plates:
 * FlatCompat n'est plus nécessaire (et échoue sur ces configs).
 */
const config = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'supabase/**',
      '*.min.js',
    ],
  },
  ...coreWebVitals,
  ...typescriptConfig,
];

export default config;
