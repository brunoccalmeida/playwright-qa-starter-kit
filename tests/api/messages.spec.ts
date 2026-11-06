import { expectFound, expectJson, expectStatus } from '../../src/api/expect-json.ts';
import {
  messageErrorsSchema,
  messageListSchema,
  messageSchema,
} from '../../src/api/message-api.ts';
import { successSchema } from '../../src/api/schemas.ts';
import { newMessage } from '../../src/data/factories.ts';
import { expect, KNOWN_ISSUES, test } from '../fixtures.ts';

test.describe('POST /api/message', () => {
  test('accepts a valid message', async ({ messageApi }) => {
    const body = await expectJson(await messageApi.create(newMessage()), 200, successSchema);

    expect(body.success).toBe(true);
  });

  test('rejects invalid fields with 400 and a plain list of errors', async ({ messageApi }) => {
    const message = { ...newMessage(), email: 'not-an-email', phone: '123', subject: 'Hi' };

    const errors = await expectJson(await messageApi.create(message), 400, messageErrorsSchema);

    expect(errors).toEqual(
      expect.arrayContaining([
        'must be a well-formed email address',
        'Phone must be between 11 and 21 characters.',
        'Subject must be between 5 and 100 characters.',
      ]),
    );
  });
});

test.describe('GET /api/message', () => {
  test('lists the new message for an admin', async ({ messageApi, adminToken }) => {
    const message = newMessage();
    await expectJson(await messageApi.create(message), 200, successSchema);

    const { messages } = await expectJson(
      await messageApi.list(adminToken),
      200,
      messageListSchema,
    );

    expect(messages).toContainEqual(
      expect.objectContaining({ name: message.name, subject: message.subject, read: false }),
    );
  });

  test.fail(
    'requires authentication',
    {
      annotation: {
        type: 'issue',
        description: `${KNOWN_ISSUES}#ki-2-guest-messages-listed-without-authentication`,
      },
    },
    async ({ messageApi }) => {
      const response = await messageApi.list();

      // The fixed response is unknown: assert only the status (not even JSON)
      await expectStatus(response, 401);
    },
  );
});

test.describe('GET /api/message/{id}', () => {
  test.fail(
    'returns the full message',
    { annotation: { type: 'issue', description: `${KNOWN_ISSUES}#ki-1-get-by-id-returns-500` } },
    async ({ messageApi, adminToken }) => {
      const message = newMessage();
      await expectJson(await messageApi.create(message), 200, successSchema);
      const { messages } = await expectJson(
        await messageApi.list(adminToken),
        200,
        messageListSchema,
      );
      const created = expectFound(messages, (m) => m.name === message.name, message.name);

      const response = await messageApi.get(created.id, adminToken);

      const body = await expectJson(response, 200, messageSchema);
      expect(body).toMatchObject(message);
    },
  );
});
