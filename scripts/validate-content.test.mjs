import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { validateContent } from './content-validation.mjs';

describe('contenido ilustrativo', () => {
  it('incluye 15–20 preguntas originales con cuatro opciones, una respuesta y revisores pendientes', async () => {
    const questions = JSON.parse(await readFile(new URL('../contenido/preguntas.json', import.meta.url), 'utf8'));
    const catalog = JSON.parse(await readFile(new URL('../contenido/catalogo.json', import.meta.url), 'utf8'));
    expect(validateContent(questions, catalog)).toEqual([]);
    expect(questions.length).toBeGreaterThanOrEqual(15);
    expect(questions.length).toBeLessThanOrEqual(20);
    for (const question of questions) {
      expect(question.original).toBe(true);
      expect(question.marcaContenido).toBe('Pregunta de práctica, no oficial');
      expect(question.estado).toBe('ejemplo-demo');
      expect(question.opciones).toHaveLength(4);
      expect(question.opciones.filter((option) => option.id === question.respuesta)).toHaveLength(1);
      expect(question.revisores).toHaveLength(2);
    }
  });

  it('detecta IDs, enunciados y opciones repetidos y rechaza respuestas no listadas', async () => {
    const questions = JSON.parse(await readFile(new URL('../contenido/preguntas.json', import.meta.url), 'utf8'));
    const catalog = JSON.parse(await readFile(new URL('../contenido/catalogo.json', import.meta.url), 'utf8'));
    const changed = structuredClone(questions);
    changed[1].id = changed[0].id;
    changed[1].enunciado = changed[0].enunciado;
    changed[1].opciones[0].id = changed[1].opciones[1].id;
    changed[1].respuesta = 'Z';
    const errors = validateContent(changed, catalog).join('\n');
    expect(errors).toContain('ID duplicado');
    expect(errors).toContain('enunciado duplicado');
    expect(errors).toContain('identificadores de opción duplicados');
    expect(errors).toContain('respuesta debe coincidir con una única opción');
  });
});
