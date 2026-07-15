import { diff } from 'deep-diff';
import toJsonSchema from 'to-json-schema';
import Ajv from 'ajv';

export interface DiffResult {
  kind: string;
  path: string[];
  lhs?: any; // Left hand side (snapshot)
  rhs?: any; // Right hand side (new response)
  item?: any;
}

export function compareSnapshots(snapshotBody: any, newBody: any): DiffResult[] {
  // Try to parse strings into objects if they aren't already
  let baseObj = snapshotBody;
  let newObj = newBody;

  if (typeof baseObj === 'string') {
    try { baseObj = JSON.parse(baseObj); } catch { /* ignore */ }
  }
  if (typeof newObj === 'string') {
    try { newObj = JSON.parse(newObj); } catch { /* ignore */ }
  }

  const differences = diff(baseObj, newObj) || [];
  
  return differences.map(d => ({
    kind: d.kind,
    path: d.path || [],
    lhs: d.lhs,
    rhs: d.rhs,
    item: d.item,
  }));
}

export function generateSchema(responseBody: any): any {
  let obj = responseBody;
  if (typeof obj === 'string') {
    try { obj = JSON.parse(obj); } catch { /* ignore */ }
  }

  // to-json-schema generates Draft 4 by default, but it's close enough for basic API validation
  const options = {
    required: true,
    arrays: { mode: 'all' },
    objects: { additionalProperties: false }
  };
  
  return toJsonSchema(obj, options);
}

export interface ValidationResult {
  valid: boolean;
  errors: { path: string; message: string }[];
}

export function validateAgainstSchema(schema: any, responseBody: any): ValidationResult {
  const ajv = new Ajv({ allErrors: true });
  
  let obj = responseBody;
  if (typeof obj === 'string') {
    try { obj = JSON.parse(obj); } catch { /* ignore */ }
  }

  const validate = ajv.compile(schema);
  const valid = validate(obj);

  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors = (validate.errors || []).map(err => ({
    path: err.instancePath || '/',
    message: err.message || 'Validation failed'
  }));

  return { valid: false, errors };
}
