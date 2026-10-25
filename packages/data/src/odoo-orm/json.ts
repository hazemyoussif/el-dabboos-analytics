/** Node 24 supplies the original numeric token: do not round money through a JS double. */
export function parseOdooJson(text: string): unknown {
  return JSON.parse(text, (_key: string, value: unknown, context?: { source?: string }) => {
    if (typeof value !== 'number') return value;
    if (!context?.source) throw new Error('Lossless JSON parsing requires Node 24');
    return context.source;
  });
}

export function ormObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid Odoo ORM response');
  return value as Record<string, unknown>;
}

export function ormId(value: unknown): string {
  if (typeof value !== 'string' || !/^[1-9]\d{0,14}$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new Error('Invalid Odoo ORM identity');
  }
  return value;
}

/** Preserve the wire decimal, including exponent notation. This does not attest ERP storage precision. */
export function ormDecimal(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid Odoo ORM amount');
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d{1,3}))?$/.exec(value);
  if (!match) throw new Error('Invalid Odoo ORM amount');
  const [, sign, whole, fraction = '', exponent = '0'] = match;
  const digits = whole! + fraction;
  const scale = fraction.length - Number(exponent);
  if (Math.abs(scale) > 100 || digits.length > 100) throw new Error('Invalid Odoo ORM amount');
  const padded = scale < 0 ? digits + '0'.repeat(-scale) : digits.padStart(scale + 1, '0');
  const integer = (scale > 0 ? padded.slice(0, -scale) : padded).replace(/^0+(?=\d)/, '');
  const decimals = scale > 0 ? padded.slice(-scale).replace(/0+$/, '') : '';
  if (integer.length > 24 || decimals.length > 6) throw new Error('Unproven Odoo ORM amount precision');
  const normalized = `${integer}.${decimals.padEnd(6, '0')}`;
  return normalized === '0.000000' ? normalized : `${sign}${normalized}`;
}
