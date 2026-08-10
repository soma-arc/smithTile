/**
 * Compile-time exhaustiveness guard. Placing `assertNever(x)` in the `default`
 * branch of a switch over a discriminated union makes TypeScript raise a type
 * error if a new variant is added but left unhandled — so every render backend
 * is forced to handle every new `Drawable` kind.
 */
export function assertNever(value: never): never {
    throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
}
