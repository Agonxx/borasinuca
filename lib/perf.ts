export function perfStart(label: string) {
  const start = performance.now();
  return (step?: string) => {
    const ms = (performance.now() - start).toFixed(1);
    console.log(`[perf] ${label}${step ? ` > ${step}` : ""}: ${ms}ms`);
    return performance.now();
  };
}
