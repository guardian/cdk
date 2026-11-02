import guardian from '@guardian/eslint-config';

export default [
	...guardian.configs.recommended,
	{
		files: ['**/*.test.ts'],
		rules: {
			// node:test's `suite` and `test` return promises that the runner handles
			'@typescript-eslint/no-floating-promises': 'off',
		},
	},
];