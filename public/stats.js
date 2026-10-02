// Only ratings 1-4 count as scored and enter the average. "Don't calculate here" stores no score.
export function summarize(ids, scores) {
  const rated = ids.map((id) => scores[id]).filter((v) => v >= 1);
  const avg = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : null;
  return { count: rated.length, avg };
}
