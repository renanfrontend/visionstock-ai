const DIGITS = "0123456789";

/**
 * Number whose digits roll like a mechanical counter when the value changes.
 * Non-digit characters (separators, currency) render statically.
 */
export function Odometer({ value, className = "" }: { value: string; className?: string }) {
  return (
    <span className={`inline-flex tabular-nums ${className}`} aria-label={value} role="img">
      {[...value].map((char, index) => {
        const digit = DIGITS.indexOf(char);
        if (digit === -1) {
          return (
            <span key={`s${index}`} aria-hidden="true">
              {char}
            </span>
          );
        }
        return (
          <span key={`d${value.length - index}`} className="odometer-digit" aria-hidden="true">
            <span style={{ transform: `translateY(-${digit}em)` }}>
              {[...DIGITS].map((d) => (
                <span key={d} className="h-[1em] leading-none">
                  {d}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
