/**
 * Parse env variable strings of the form "KEY=VALUE" into a record.
 * Splits only on the first '=' so that values containing '=' are preserved.
 */
export function parseEnvVariables(
    environmentVariables: string[],
): Record<string, string> {
    return environmentVariables.reduce<Record<string, string>>(
        (acc, envKeyValue) => {
            const eqIdx = envKeyValue.indexOf("=");
            const key = envKeyValue.substring(0, eqIdx);
            const value = envKeyValue.substring(eqIdx + 1);
            return { ...acc, [key]: value };
        },
        {},
    );
}
