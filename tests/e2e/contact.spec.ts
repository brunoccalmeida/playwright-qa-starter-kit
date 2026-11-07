import { expectFound, expectJson } from '../../src/api/expect-json.ts';
import { messageListSchema } from '../../src/api/message-api.ts';
import { newMessage } from '../../src/data/factories.ts';
import { expect, knownIssue, test } from './fixtures.ts';

test.describe('Contact form', () => {
  test('a guest sends a message and the hotel receives it', async ({
    homePage,
    messageApi,
    adminToken,
  }) => {
    const message = newMessage();

    await homePage.goto();
    await homePage.sendMessage(message);

    await expect(homePage.contactConfirmation(message.name)).toBeVisible();
    const { messages } = await expectJson(
      await messageApi.list(adminToken),
      200,
      messageListSchema,
    );
    const received = expectFound(messages, (m) => m.name === message.name, message.name);
    expect(received.subject).toBe(message.subject);
  });

  test.fail(
    'the message field is found by its label',
    knownIssue('KI-5'),
    async ({ homePage, page }) => {
      await homePage.goto();

      await expect(page.getByLabel('Message', { exact: true })).toBeVisible();
    },
  );
});
