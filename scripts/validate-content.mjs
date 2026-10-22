import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { validateContent } from './content-validation.mjs';

const contentPath = new URL('../contenido/preguntas.json', import.meta.url);
const catalogPath = new URL('../contenido/catalogo.json', import.meta.url);
const questions = JSON.parse(await readFile(fileURLToPath(contentPath), 'utf8'));
const catalog = JSON.parse(await readFile(fileURLToPath(catalogPath), 'utf8'));
const errors = validateContent(questions, catalog);

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Contenido válido: ${questions.length} preguntas originales de ejemplo.`);
}
