export class Try<T> {
  public readonly isSuccess: boolean;
  private readonly result?: T;

  constructor(fn: () => T) {
    try {
      this.result = fn();
      this.isSuccess = true;
    } catch {
      this.isSuccess = false;
    }
  }

  public getOrElse: (defaultValue: T) => T = (defaultValue: T) => this.result ?? defaultValue;

  public get: () => T | undefined = () => this.result;
}
