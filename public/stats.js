// Any answer counts as scored, including 0 (N/A). Only ratings 1-4 enter the average.
export function summarize(ids, scores) {
  const answered = ids.map((id) => scores[id]).filter((v) => typeof v === 'number');
  const rated = answered.filter((v) => v >= 1);
  const avg = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : null;
  return { count: answered.length, avg };
}
