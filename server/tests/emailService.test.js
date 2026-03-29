process.env.EMAIL_USER = 'mailer@example.com';
process.env.EMAIL_PASS = 'app-password';

const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const Module = require('module');

const originalRequire = Module.prototype.require;
let capturedMailOptions = null;

Module.prototype.require = function (id) {
    if (id === 'nodemailer') {
        return {
            createTransport: () => ({
                sendMail: async (options) => {
                    capturedMailOptions = options;
                    return {
                        messageId: '<test-message-id@example.com>'
                    };
                }
            })
        };
    }

    return originalRequire.apply(this, arguments);
};

delete require.cache[require.resolve('../services/emailService')];
const {
    sendBookingCreated,
    sendBanNotification
} = require('../services/emailService');

describe('Email Service Templates', async () => {
    beforeEach(() => {
        capturedMailOptions = null;
    });

    after(() => {
        Module.prototype.require = originalRequire;
    });

    it('sendBookingCreated should escape dynamic booking fields and return delivery success', async () => {
        const deliveryResult = await sendBookingCreated({
            topic: '<script>alert("x")</script>',
            room: {
                name: '<b>44-703</b>'
            },
            user: {
                name: 'Alice & Bob',
                email: 'student@example.com'
            },
            startTime: new Date('2026-04-01T09:00:00+07:00'),
            endTime: new Date('2026-04-01T12:00:00+07:00')
        });

        assert.strictEqual(deliveryResult.success, true);
        assert.ok(capturedMailOptions);
        assert.ok(capturedMailOptions.html.includes('Alice &amp; Bob'));
        assert.ok(capturedMailOptions.html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'));
        assert.ok(capturedMailOptions.html.includes('&lt;b&gt;44-703&lt;/b&gt;'));
        assert.ok(!capturedMailOptions.html.includes('<script>alert("x")</script>'));
    });

    it('sendBanNotification should escape the ban reason in email html', async () => {
        await sendBanNotification(
            {
                name: 'Student User',
                email: 'student@example.com'
            },
            '<img src=x onerror=alert(1)>'
        );

        assert.ok(capturedMailOptions);
        assert.ok(capturedMailOptions.html.includes('&lt;img src=x onerror=alert(1)&gt;'));
        assert.ok(!capturedMailOptions.html.includes('<img src=x onerror=alert(1)>'));
    });
});
