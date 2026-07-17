export function interpolateVariables(
  template: string,
  variables: Record<string, string>
): string {
  // Allow spaces inside braces e.g., {{ baseUrl }} and allow hyphens/dots in keys
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, key) => {
    return variables[key] ?? match;
  });
}

export function interpolateHeaders(
  headers: { key: string; value: string; enabled: boolean }[],
  variables: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const h of headers || []) {
    if (!h.enabled || !h.key.trim()) continue;
    result[h.key.trim()] = interpolateVariables(h.value, variables);
  }
  return result;
}

export function buildQueryString(
  params: { key: string; value: string; enabled: boolean }[],
  variables: Record<string, string>
): string {
  const parts: string[] = [];
  for (const p of params || []) {
    if (!p.enabled || !p.key.trim()) continue;
    const key = encodeURIComponent(interpolateVariables(p.key, variables));
    const value = encodeURIComponent(interpolateVariables(p.value, variables));
    parts.push(`${key}=${value}`);
  }
  return parts.join('&');
}

export function buildBody(
  bodyType: string,
  body: string | null,
  variables: Record<string, string>
): string | null {
  if (!body || bodyType === 'none') return null;
  return interpolateVariables(body, variables);
}
