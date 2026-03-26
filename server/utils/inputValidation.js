const FIELD_LIMITS = {
    BOOKING_TOPIC: 120,
    BOOKING_NOTE: 1000,
    REPORT_TOPIC: 120,
    REPORT_DESCRIPTION: 2000,
    USER_NAME: 120,
    USER_PHONE: 30,
    USER_STUDENT_ID: 30,
    USER_FACULTY: 120,
    BOOKING_USER_DEPARTMENT: 120,
    IMPORT_ROOM_NAME: 50
};

const IMPORT_LIMITS = {
    MAX_SHEETS: 20,
    MAX_SOURCE_ROWS: 300,
    MAX_GENERATED_BOOKINGS: 5000,
    MAX_RANGE_DAYS: 180,
    MAX_ERROR_ITEMS: 100
};

const PATTERNS = {
    PHONE: /^[0-9+\-()\s]{0,30}$/,
    STUDENT_ID: /^[A-Za-z0-9/_-]{0,30}$/
};

const createHttpError = (message, code = 'VALIDATION_ERROR', statusCode = 400) => {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    return error;
};

const normalizeSingleLineText = (value) => String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeMultilineText = (value) => String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

const validateMaxLength = (value, maxLength, fieldName) => {
    if (value.length > maxLength) {
        throw createHttpError(`${fieldName} must be ${maxLength} characters or fewer`);
    }
};

const sanitizeRequiredSingleLineText = (value, { fieldName, maxLength }) => {
    if (typeof value !== 'string') {
        throw createHttpError(`${fieldName} is required`);
    }

    const normalizedValue = normalizeSingleLineText(value);
    if (!normalizedValue) {
        throw createHttpError(`${fieldName} is required`);
    }

    validateMaxLength(normalizedValue, maxLength, fieldName);
    return normalizedValue;
};

const sanitizeOptionalSingleLineText = (value, {
    fieldName,
    maxLength,
    pattern = null,
    emptyValue = ''
}) => {
    if (value === undefined) {
        return undefined;
    }

    if (value === null || value === '') {
        return emptyValue;
    }

    if (typeof value !== 'string') {
        throw createHttpError(`${fieldName} must be a string`);
    }

    const normalizedValue = normalizeSingleLineText(value);
    if (!normalizedValue) {
        return emptyValue;
    }

    validateMaxLength(normalizedValue, maxLength, fieldName);

    if (pattern && !pattern.test(normalizedValue)) {
        throw createHttpError(`${fieldName} has an invalid format`);
    }

    return normalizedValue;
};

const sanitizeRequiredMultilineText = (value, { fieldName, maxLength }) => {
    if (typeof value !== 'string') {
        throw createHttpError(`${fieldName} is required`);
    }

    const normalizedValue = normalizeMultilineText(value);
    if (!normalizedValue) {
        throw createHttpError(`${fieldName} is required`);
    }

    validateMaxLength(normalizedValue, maxLength, fieldName);
    return normalizedValue;
};

const sanitizeOptionalMultilineText = (value, {
    fieldName,
    maxLength,
    emptyValue = ''
}) => {
    if (value === undefined) {
        return undefined;
    }

    if (value === null || value === '') {
        return emptyValue;
    }

    if (typeof value !== 'string') {
        throw createHttpError(`${fieldName} must be a string`);
    }

    const normalizedValue = normalizeMultilineText(value);
    if (!normalizedValue) {
        return emptyValue;
    }

    validateMaxLength(normalizedValue, maxLength, fieldName);
    return normalizedValue;
};

const sanitizeEnumValue = (value, {
    fieldName,
    allowedValues,
    defaultValue
}) => {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }

    if (typeof value !== 'string') {
        throw createHttpError(`${fieldName} must be a string`);
    }

    const normalizedValue = normalizeSingleLineText(value).toLowerCase();
    if (!allowedValues.includes(normalizedValue)) {
        throw createHttpError(`${fieldName} is invalid`);
    }

    return normalizedValue;
};

const getValidationErrorResponse = (error, fallbackMessage = 'Validation failed') => {
    if (error?.statusCode) {
        return {
            statusCode: error.statusCode,
            body: {
                success: false,
                error: error.message,
                code: error.code || 'VALIDATION_ERROR'
            }
        };
    }

    if (error?.name === 'ValidationError') {
        const firstError = Object.values(error.errors || {})[0];
        return {
            statusCode: 400,
            body: {
                success: false,
                error: firstError?.message || fallbackMessage,
                code: 'VALIDATION_ERROR'
            }
        };
    }

    return null;
};

module.exports = {
    FIELD_LIMITS,
    IMPORT_LIMITS,
    PATTERNS,
    createHttpError,
    normalizeSingleLineText,
    normalizeMultilineText,
    sanitizeRequiredSingleLineText,
    sanitizeOptionalSingleLineText,
    sanitizeRequiredMultilineText,
    sanitizeOptionalMultilineText,
    sanitizeEnumValue,
    getValidationErrorResponse
};
