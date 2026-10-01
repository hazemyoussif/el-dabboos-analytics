/** Project a canonical JSON Schema into the bounded dialect sent to structured-output providers. */
const scalarKeywords = ['title', 'description', '$ref', 'type', 'required', 'minItems', 'maxItems', 'minimum', 'maximum', 'enum'] as const;
const schemaMapKeywords = ['$defs', 'properties'] as const;
const schemaArrayKeywords = ['oneOf', 'anyOf'] as const;
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function projectNode(schema: unknown): Record<string, unknown> {
  if (!isObject(schema)) throw new Error('A JSON Schema object is required for provider projection.');
  const projected: Record<string, unknown> = {};
  for (const key of scalarKeywords) if (Object.hasOwn(schema, key)) projected[key] = structuredClone(schema[key]);
  for (const key of schemaMapKeywords) {
    if (!Object.hasOwn(schema, key)) continue;
    const entries = schema[key];
    if (!isObject(entries)) throw new Error(`Invalid JSON Schema ${key}.`);
    projected[key] = Object.fromEntries(Object.entries(entries).map(([name, child]) => [name, projectNode(child)]));
  }
  for (const key of schemaArrayKeywords) {
    if (!Object.hasOwn(schema, key)) continue;
    const branches = schema[key];
    if (!Array.isArray(branches)) throw new Error(`Invalid JSON Schema ${key}.`);
    projected[key] = branches.map(projectNode);
  }
  if (Object.hasOwn(schema, 'items')) projected.items = projectNode(schema.items);
  if (Object.hasOwn(schema, 'additionalProperties')) {
    const additional = schema.additionalProperties;
    projected.additionalProperties = typeof additional === 'boolean' ? additional : projectNode(additional);
  }
  if (Object.hasOwn(schema, 'const')) {
    const value = schema.const;
    if (typeof value === 'string' || typeof value === 'number') projected.enum = [value];
    else if (typeof value === 'boolean') projected.type = 'boolean';
    else throw new Error('Unsupported JSON Schema const value for provider projection.');
  }
  return projected;
}

export function projectProviderSchema(schema: Readonly<Record<string, unknown>>): Record<string, unknown> {
  return projectNode(schema);
}
