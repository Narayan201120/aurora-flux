export interface PostProcessUniform<T> {
  value: T;
}

export function requirePostProcessUniform<T>(
  uniform: PostProcessUniform<T> | undefined,
  name: string,
): PostProcessUniform<T> {
  if (uniform === undefined) {
    throw new Error(`Post-process uniform "${name}" is missing`);
  }
  return uniform;
}
