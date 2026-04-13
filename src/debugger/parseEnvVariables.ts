/**
 * Parse env variable strings of the form "KEY=VALUE" into a record.
 * Splits only on the first '=' so that values containing '=' are preserved.
 */
export function parseEnvVariables(
    environmentVariables: string[]
): Record<string, string> {
    return environmentVariables.reduce<Record<string, string>>(
        (acc, envKeyValue) => {
            const eqIdx = envKeyValue.indexOf("=");
            if (eqIdx <= 0) return acc; // skip malformed entries and empty keys
            const key = envKeyValue.slice(0, eqIdx);
            const value = envKeyValue.slice(eqIdx + 1);
            acc[key] = value;
            return acc;
        },
        {}
    );
}
