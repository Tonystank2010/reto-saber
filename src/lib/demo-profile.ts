export function isValidEmail(email: string): boolean {
  const value = email.trim();
  const parts = value.split('@');
  if (parts.length !== 2) return false;
  const local = parts[0] ?? '';
  const domain = parts[1] ?? '';
  if (
    !local || local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..') ||
    !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local) ||
    domain.length > 253
  ) return false;
  const labels = domain.split('.');
  return labels.length >= 2 &&
    labels.every((label) => label.length > 0 && label.length <= 63 && /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(label)) &&
    /^[A-Za-z]{2,63}$/.test(labels[labels.length - 1] ?? '');
}
