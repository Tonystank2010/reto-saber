import { describe, expect, it } from 'vitest';
import { isValidEmail } from './demo-profile';

describe('validación de correo', () => {
  it('acepta correos sintácticamente válidos y rechaza formatos inválidos', () => {
    expect(isValidEmail('estudiante@demo.invalid')).toBe(true);
    expect(isValidEmail('persona@example.com')).toBe(true);
    expect(isValidEmail('estudiante+demo@ejemplo.co')).toBe(true);
    expect(isValidEmail('foo.invalid')).toBe(false);
    expect(isValidEmail('a b@ejemplo.co')).toBe(false);
    expect(isValidEmail('persona@dominio')).toBe(false);
    expect(isValidEmail(`${'a'.repeat(65)}@ejemplo.co`)).toBe(false);
  });
});
