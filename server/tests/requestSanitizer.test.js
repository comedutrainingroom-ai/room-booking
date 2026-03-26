const { describe, it } = require('node:test');
const assert = require('node:assert');

const { sanitizeObject, requestSanitizer } = require('../middleware/requestSanitizer');

describe('requestSanitizer middleware', async () => {
    it('sanitizeObject should remove keys that start with $ recursively', () => {
        const payload = {
            name: 'safe',
            $where: 'evil()',
            nested: {
                ok: true,
                $gt: ''
            },
            items: [
                { label: 'good', $ne: null }
            ]
        };

        sanitizeObject(payload);

        assert.deepStrictEqual(payload, {
            name: 'safe',
            nested: {
                ok: true
            },
            items: [
                { label: 'good' }
            ]
        });
    });

    it('requestSanitizer should sanitize body, params, and query before continuing', () => {
        const req = {
            body: { safe: true, $where: 'evil' },
            params: { id: '123', $gt: '' },
            query: { status: 'approved', $or: [] }
        };
        let nextCalled = false;

        requestSanitizer(req, {}, () => {
            nextCalled = true;
        });

        assert.strictEqual(nextCalled, true);
        assert.deepStrictEqual(req.body, { safe: true });
        assert.deepStrictEqual(req.params, { id: '123' });
        assert.deepStrictEqual(req.query, { status: 'approved' });
    });
});
