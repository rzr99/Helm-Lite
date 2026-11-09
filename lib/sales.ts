// "Alex/blake" and "Blake / Alex" are the same client: compare the set of words.
export function clientKey(name: string) {
  return name
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .sort()
    .join(" ");
}
