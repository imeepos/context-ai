
export function getCliOption(name: string): string | undefined {
    const prefix = `--${name}=`;
    const index = process.argv.findIndex((arg) => arg === `--${name}` || arg.startsWith(prefix));
    if (index < 0) return undefined;

    const current = process.argv[index];
    if (!current) return undefined;

    if (current.startsWith(prefix)) {
        return current.slice(prefix.length);
    }

    return process.argv[index + 1];
}