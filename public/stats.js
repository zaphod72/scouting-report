// Ratings 1-4 count toward the category stat. 0 (N/A) and blank do not.
export function summarize(ids, scores) {
  const rated = ids.map((id) => scores[id]).filter((v) => v >= 1);
  const avg = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : null;
  return { count: rated.length, avg };
}
