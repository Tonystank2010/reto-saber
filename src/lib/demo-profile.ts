export function isFictionalEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.invalid$/i.test(email.trim());
}
