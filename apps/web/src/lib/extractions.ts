export type ExtractionType = 'jsonPath' | 'header' | 'regex';

export interface Extraction {
  id: string;
  type: ExtractionType;
  expression: string;
  variableName: string;
  enabled: boolean;
  value?: string;
  error?: string;
}

let extractionCounter = 0;
export function createExtractionId(): string {
  extractionCounter += 1;
  return `extr_${Date.now()}_${extractionCounter}`;
}

interface ExtractionResult {
  value?: string;
  error?: string;
}

export function runExtraction(
  extraction: Extraction,
  response: { status: number; statusText: string; headers: Record<string, string>; body: string } | null,
): ExtractionResult {
  if (!response) {
    return { error: 'No response' };
  }

  try {
    switch (extraction.type) {
      case 'jsonPath': {
        let parsed: unknown;
        try { parsed = JSON.parse(response.body); } catch { return { error: 'Invalid JSON response' }; }
        const value = resolveJsonPath(parsed, extraction.expression);
        if (value === undefined) return { error: `Path "${extraction.expression}" not found` };
        return { value: typeof value === 'string' ? value : JSON.stringify(value) };
      }

      case 'header': {
        const headerName = extraction.expression.toLowerCase();
        const entry = Object.entries(response.headers).find(
          ([k]) => k.toLowerCase() === headerName,
        );
        if (!entry) return { error: `Header "${extraction.expression}" not found` };
        return { value: entry[1] };
      }

      case 'regex': {
        try {
          const re = new RegExp(extraction.expression);
          const match = response.body.match(re);
          if (!match) return { error: 'No match found' };
          return { value: match[1] ?? match[0] };
        } catch {
          return { error: 'Invalid regex' };
        }
      }

      default:
        return { error: 'Unknown extraction type' };
    }
  } catch (err) {
    return { error: String(err) };
  }
}

function resolveJsonPath(obj: unknown, path: string): unknown {
  if (!path.startsWith('$')) return undefined;
  const segments = path
    .replace(/^\$\.?/, '')
    .split('.')
    .filter(Boolean);
  let current: unknown = obj;
  for (const seg of segments) {
    if (current === null || current === undefined) return undefined;
    const arrayMatch = seg.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      current = (current as Record<string, unknown>)[arrayMatch[1]];
      if (Array.isArray(current)) current = current[Number(arrayMatch[2])];
    } else {
      current = (current as Record<string, unknown>)[seg];
    }
  }
  return current;
}

export function runAllExtractions(
  extractions: Extraction[],
  response: { status: number; statusText: string; headers: Record<string, string>; body: string } | null,
): Extraction[] {
  if (!response) return extractions.map((e) => ({ ...e, value: undefined, error: undefined }));
  return extractions.map((e) => {
    if (!e.enabled) return { ...e, value: undefined, error: undefined };
    const r = runExtraction(e, response);
    return { ...e, value: r.value, error: r.error };
  });
}
