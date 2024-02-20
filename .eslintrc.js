module.exports = {
    extends: ['alloy', 'alloy/vue', 'alloy/typescript'],
    parser: 'vue-eslint-parser',
    parserOptions: {
        parser: {
            js: '@babel/eslint-parser',
            jsx: '@babel/eslint-parser',

            ts: '@typescript-eslint/parser',
            tsx: '@typescript-eslint/parser',

            // Leave the template parser unspecified, so that it could be determined by `<script lang="...">`
        },
    },
    env: {
        // Your environments (which contains several predefined global variables)
        //
        browser: true,
        // node: true,
        // mocha: true,
        // jest: true,
        // jquery: true
    },
    globals: {
        // Your global variables (setting to false means it's not allowed to be reassigned)
        //
        MediaType: 'readonly',
        MediaUrl: 'readonly',
        MediaUrlCallback: 'readonly',
        MediaLabel: 'readonly',
        MediaLabelCallback: 'readonly',
        MediaTypeValue: 'readonly',
        MediaTypeCallback: 'readonly',
        MediaData: 'readonly',
        MediaDataScalar: 'readonly',
        MediaDataCallback: 'readonly',
        MediaListItem: 'readonly',
        LoadedMediaListItem: 'readonly',
        CollectImagesOptions: 'readonly',
        UploadLink: 'readonly',
        chrome: 'readonly',
    },
    rules: {
        // Customize your rules
        //
        // Please keep this rule off because it requiresTypeChecking
        // https://github.com/vuejs/vue-eslint-parser/issues/104
        // https://github.com/typescript-eslint/typescript-eslint/pull/5318
        '@typescript-eslint/prefer-optional-chain': 'off',

        'indent': ['error', 4],
        'vue/html-indent': ['error', 4],
        'vue/script-indent': ['error', 4],
        'comma-dangle': ['error', 'always-multiline'],
        "no-return-assign": "off",
        'radix': 'off',
        "vue/require-component-is": "off",
        '@typescript-eslint/consistent-type-assertions': 'off',
        'no-param-reassign': 'off',
        'max-params': "off",
        'no-inner-declarations': 'off',
        'guard-for-in': 'off',
        'complexity': 'off',
    },
};
