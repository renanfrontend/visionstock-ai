/**
 * "Throws" a thumbnail from a source element to a target (e.g. a tab), along an arc.
 * Purely decorative: resolves immediately when motion is reduced or elements are missing.
 */
export function flyTo(source: Element | null, targetSelector: string, imageUrl: string | null): Promise<void> {
  const target = document.querySelector(targetSelector);
  if (!source || !target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();

  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const size = 56;
  const ghost = document.createElement("div");
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${from.left + from.width / 2 - size / 2}px`,
    top: `${from.top + from.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "14px",
    zIndex: "100",
    pointerEvents: "none",
    background: imageUrl ? `center / cover no-repeat url("${imageUrl}")` : "var(--color-ice)",
    boxShadow: "0 0 0 2px var(--color-ice), 0 12px 30px -6px rgb(110 231 249 / 0.6)",
  });
  document.body.append(ghost);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const animation = ghost.animate(
    [
      { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1 },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 120}px) scale(0.9) rotate(-12deg)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.25) rotate(8deg)`, opacity: 0.4 },
    ],
    { duration: 720, easing: "cubic-bezier(0.5, 0, 0.3, 1)" },
  );

  return animation.finished
    .catch(() => undefined)
    .then(() => {
      ghost.remove();
      target.animate([{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }], {
        duration: 420,
        easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      });
    });
}
