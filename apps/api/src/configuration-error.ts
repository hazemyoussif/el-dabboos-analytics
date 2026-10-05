export class ConfigurationError extends Error {
    constructor(field: string) { super(`Invalid API configuration: ${field}. Check the documented settings.`); }
}
