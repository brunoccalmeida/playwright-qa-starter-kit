import { expect, type Locator, type Page, type Response } from '@playwright/test';
import type { Credentials } from '../api/auth-api.ts';
import { fillSecret } from './fill-secret.ts';

/** The admin login form at /admin. */
export class AdminLoginPage {
  readonly heading: Locator;
  /**
   * The login error. The page always renders an empty `alert` element, so
   * the locator keeps only an alert with text.
   */
  readonly error: Locator;
  private readonly username: Locator;
  private readonly password: Locator;
  private readonly submit: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Login', exact: true });
    this.error = page.getByRole('alert').filter({ hasText: /\S/ });
    this.username = page.getByLabel('Username', { exact: true });
    this.password = page.getByLabel('Password', { exact: true });
    this.submit = page.getByRole('button', { name: 'Login', exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin');
    await expect(this.heading).toBeVisible();
  }

  /**
   * Submits the form and returns the login response. The page shows its
   * result only after the response arrives, so waiting for the response
   * keeps a slow one from eating the assertion's timeout (#62).
   */
  async login({ username, password }: Credentials): Promise<Response> {
    await this.username.fill(username);
    await fillSecret(this.password, password);
    // Registered before the click, or a fast response is missed
    const loginResponse = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/ui-api/auth/login',
    );
    // If the click fails, the page closes and loginResponse rejects with
    // nobody awaiting it yet; awaiting it below still throws its own error.
    loginResponse.catch(() => undefined);
    await this.submit.click();
    return loginResponse;
  }
}
