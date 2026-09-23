/**
 * Validation Error Class
 * For form and input validation errors
 */

export interface ValidationErrorField {
    field: string;
    message: string;
    code?: string;
}

export class ValidationError extends Error {
    public readonly fields: ValidationErrorField[];

    constructor(message: string, fields: ValidationErrorField[] = []) {
        super(message);
        this.name = 'ValidationError';
        this.fields = fields;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ValidationError);
        }
    }

    /**
     * Create from Zod validation errors
     */
    static fromZodError(zodError: { issues: { path: (string | number)[]; message: string; code: string }[] }): ValidationError {
        const fields: ValidationErrorField[] = zodError.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
        }));

        return new ValidationError('Validation failed', fields);
    }

    /**
     * Get error message for a specific field
     */
    getFieldError(fieldName: string): string | undefined {
        return this.fields.find((f) => f.field === fieldName)?.message;
    }

    /**
     * Check if a specific field has an error
     */
    hasFieldError(fieldName: string): boolean {
        return this.fields.some((f) => f.field === fieldName);
    }

    /**
     * Get all field errors as a map
     */
    getFieldErrors(): Record<string, string> {
        return this.fields.reduce(
            (acc, field) => {
                acc[field.field] = field.message;
                return acc;
            },
            {} as Record<string, string>
        );
    }
}
