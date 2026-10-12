import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Frozen generated migration bundle; its authored runner remains linted.
  { ignores: ['node_modules/**', '**/dist/**', 'coverage/**', 'packages/data/migrations/postgres/040_unified_serving.adoption.cjs'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
);
