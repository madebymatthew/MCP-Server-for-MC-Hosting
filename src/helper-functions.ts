/**
 * Fetches a value from the .env file, located in the root directory.
 * Throws an error if the value is not found OR empty.
 * @param key
 * @returns value associated to key
 */
export function getRequiredFromEnv(key: string): string {
    const val = process.env[key];
    if (!val) throw new Error(`Missing required environment variable: ${key}`);
    return val;
}