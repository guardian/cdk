/**
 * A small wrapper around `console`.
 *
 * Messages will only get printed if NODE_ENV is not test.
 * This is to reduce noise in a test environment.
 * Jest's `--silent` flag isn't used as that has a global impact.
 */
export class Logger {
  private static isTest = process.env.NODE_ENV === "test";

  static info(message: string): void {
    !Logger.isTest && console.info(message);
  }

  static warn(message: string): void {
    !Logger.isTest && console.warn(message);
  }
}
