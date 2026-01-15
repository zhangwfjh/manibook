export const CONCURRENCY_LIMIT = 3;

export async function executeConcurrent<T>(
  tasks: (() => Promise<T>)[]
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];

  for (let i = 0; i < tasks.length; i += CONCURRENCY_LIMIT) {
    const chunk = tasks.slice(i, i + CONCURRENCY_LIMIT);
    const chunkResults = await Promise.allSettled(chunk.map(task => task()));
    results.push(...chunkResults);
  }

  return results;
}