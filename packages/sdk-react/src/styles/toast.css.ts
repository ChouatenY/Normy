/** Injected once by NormyToast — keyframes referenced in inline styles */
export const NORMY_TOAST_STYLES = `
@keyframes normy-slide-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes normy-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
`;

let injected = false;

export function injectNormyToastStyles(): void {
  if (typeof document === 'undefined' || injected) return;
  const style = document.createElement('style');
  style.setAttribute('data-normy', 'toast-styles');
  style.textContent = NORMY_TOAST_STYLES;
  document.head.appendChild(style);
  injected = true;
}
