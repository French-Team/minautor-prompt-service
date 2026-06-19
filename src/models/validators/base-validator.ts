// Base validator interface and common validation utilities

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export abstract class BaseValidator<T> {
  abstract validate(_item: T): ValidationResult;

  protected createError(field: string, message: string, code: string): ValidationError {
    return { field, message, code };
  }

  protected createWarning(field: string, message: string, code: string): ValidationWarning {
    return { field, message, code };
  }

  protected validateStringField(
    value: unknown,
    fieldName: string,
    errorCode: string,
    customMessage?: string,
  ): ValidationError | null {
    if (!value || typeof value !== 'string' || value.trim() === '') {
      return this.createError(fieldName, customMessage || `${fieldName} must be a non-empty string`, errorCode);
    }
    return null;
  }

  protected validateArrayField<T>(
    value: unknown,
    fieldName: string,
    errorCode: string,
    itemValidator?: (_item: T, _index: number) => ValidationError[],
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!Array.isArray(value)) {
      errors.push(this.createError(fieldName, `${fieldName} must be an array`, errorCode));
      return errors;
    }

    if (itemValidator) {
      value.forEach((item, index) => {
        const itemErrors = itemValidator(item, index);
        errors.push(...itemErrors);
      });
    }

    return errors;
  }

  protected validateEnumField<T extends string>(
    value: unknown,
    fieldName: string,
    validValues: readonly T[],
    errorCode: string,
  ): ValidationError | null {
    if (!validValues.includes(value as T)) {
      return this.createError(fieldName, `${fieldName} must be one of: ${validValues.join(', ')}`, errorCode);
    }
    return null;
  }
}
