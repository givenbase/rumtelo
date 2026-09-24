/**
 * Runtime narrow for string enums / const maps (native `<select>` values, localStorage).
 * Zod stays on submit schemas — do not call z.enum().safeParse in onChange handlers.
 */
export function isEnumValue<T extends Record<string, string>>(
    enumeration: T,
    value: string
): value is T[keyof T] {
    return new Set<string>(Object.values(enumeration)).has(value);
}

/** Same as {@link isEnumValue}, returning `undefined` when the value is not a member. */
export function parseEnum<T extends Record<string, string>>(
    enumeration: T,
    value: string
): T[keyof T] | undefined {
    return isEnumValue(enumeration, value) ? value : undefined;
}
