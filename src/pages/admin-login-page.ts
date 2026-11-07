import { expect, type Locator, type Page } from '@playwright/test';
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

  async login({ username, password }: Credentials): Promise<void> {
    await this.username.fill(username);
    await fillSecret(this.password, password);
    await this.submit.click();
  }
}
