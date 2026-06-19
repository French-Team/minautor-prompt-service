// Result pattern for better error handling

export type Result<T, E = Error> = Success<T> | Failure<E>;

export class Success<T> {
  readonly success = true;
  readonly failure = false;

  constructor(public readonly _value: T) {}

  map<U>(fn: (_value: T) => U): Result<U, never> {
    return new Success(fn(this._value));
  }

  flatMap<U, E>(fn: (_value: T) => Result<U, E>): Result<U, E> {
    return fn(this._value);
  }

  mapError<F>(_fn: (_error: never) => F): Result<T, F> {
    return this as Result<T, F>;
  }
}

export class Failure<E> {
  readonly success = false;
  readonly failure = true;

  constructor(public readonly _error: E) {}

  map<U>(_fn: (_value: never) => U): Result<U, E> {
    return this as Result<U, E>;
  }

  flatMap<U, F>(_fn: (_value: never) => Result<U, F>): Result<U, E | F> {
    return this as Result<U, E | F>;
  }

  mapError<F>(fn: (_error: E) => F): Result<never, F> {
    return new Failure(fn(this._error));
  }
}

// Helper functions
export const success = <T>(_value: T): Success<T> => new Success(_value);
export const failure = <E>(_error: E): Failure<E> => new Failure(_error);

// Utility functions
export const isSuccess = <T, E>(result: Result<T, E>): result is Success<T> => result.success;
export const isFailure = <T, E>(result: Result<T, E>): result is Failure<E> => result.failure;
