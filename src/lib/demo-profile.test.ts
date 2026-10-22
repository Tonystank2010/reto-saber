import { describe, expect, it } from 'vitest';
import { isFictionalEmail } from './demo-profile';

describe('correo de perfil demo', () => {
  it('solo admite una dirección sintáctica cuyo dominio termina en .invalid', () => {
    expect(isFictionalEmail('estudiante@demo.invalid')).toBe(true);
    expect(isFictionalEmail('Estudiante@DEMO.INVALID')).toBe(true);
    expect(isFictionalEmail('student@example.com')).toBe(false);
    expect(isFictionalEmail('foo.invalid')).toBe(false);
    expect(isFictionalEmail('a b@demo.invalid')).toBe(false);
  });
});
