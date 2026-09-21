import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { extractErrorMessage, getOrpcValidationIssues } from './api-errors';

describe('getOrpcValidationIssues', () => {
    it('reads nested data.issues', () => {
        const issues = getOrpcValidationIssues({
            data: {
                issues: [
                    { path: ['phone'], message: 'Invalid phone' },
                    { path: 'email', message: 'Invalid email' },
                ],
            },
        });
        assert.deepEqual(issues, [
            { path: 'phone', message: 'Invalid phone' },
            { path: 'email', message: 'Invalid email' },
        ]);
    });

    it('maps CONFLICT field payloads', () => {
        const issues = getOrpcValidationIssues({
            code: 'CONFLICT',
            data: { field: 'email', message: 'Already registered' },
        });
        assert.deepEqual(issues, [{ path: 'email', message: 'Already registered' }]);
    });
});

describe('extractErrorMessage', () => {
    it('prefers Error.message', () => {
        assert.equal(extractErrorMessage(new Error('Nope')), 'Nope');
    });

    it('joins issue messages', () => {
        assert.equal(
            extractErrorMessage({
                data: { issues: [{ path: ['name'], message: 'Required' }] },
            }),
            'name: Required'
        );
    });
});
