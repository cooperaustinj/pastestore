import { fixupPluginRules } from '@eslint/compat'
import pluginJs from '@eslint/js'
import pluginReact from 'eslint-plugin-react'
import pluginReactHooks from 'eslint-plugin-react-hooks'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default [
    { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    pluginReact.configs.flat.recommended,
    {
        plugins: {
            'react-hooks': fixupPluginRules(pluginReactHooks),
            'simple-import-sort': simpleImportSort,
        },
        languageOptions: { globals: globals.browser },
        rules: {
            indent: 'off',
            'linebreak-style': ['error', 'unix'],
            quotes: [
                'error',
                'single',
                {
                    allowTemplateLiterals: true,
                    avoidEscape: true,
                },
            ],
            semi: ['error', 'never'],
            'react/react-in-jsx-scope': 'off',
            'react/no-unescaped-entities': 'off',
            'react-hooks/exhaustive-deps': 'error',
            '@typescript-eslint/no-unused-vars': 'warn',
            'simple-import-sort/imports': 'error',
            'simple-import-sort/exports': 'error',
        },
    },
]
