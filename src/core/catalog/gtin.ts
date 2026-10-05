const VALID_LENGTHS = new Set([8, 12, 13, 14]);

/**
 * GS1 check digit validation for GTIN-8/12/13/14 (EAN/UPC).
 * Weights alternate 3 and 1 starting from the digit next to the check digit.
 */
export function isValidGtin(code: string): boolean {
  if (!/^\d+$/.test(code) || !VALID_LENGTHS.has(code.length)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop() as number;
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}
