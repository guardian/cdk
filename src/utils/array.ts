/**
 * Group an array of T by a field in T.
 * @param input what to group
 * @param identityFn what field to group on
 */
export function groupBy<T>(input: T[], identityFn: (i: T) => string): Record<string, T[]> {
  return input.reduce<Record<string, T[]>>((acc, element) => {
    const key = identityFn(element);
    const current = acc[key] ?? [];
    return {
      ...acc,
      [key]: [...current, element],
    };
  }, {});
}
