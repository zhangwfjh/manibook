export function combineSearchParams(...searchParamsList: (URLSearchParams | undefined)[]): URLSearchParams {
  const combined = new URLSearchParams();
  
  for (const params of searchParamsList) {
    if (!params) continue;
    params.forEach((value, key) => {
      combined.set(key, value);
    });
  }
  
  return combined;
}
