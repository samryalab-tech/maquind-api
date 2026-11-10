import fs from 'node:fs';
import path from 'node:path';
import Handlebars from 'handlebars';
import puppeteer, { type Browser } from 'puppeteer';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { formatMoney, toNum } from '../../utils/money';

/**
 * Generación de PDF con una sola instancia de Chrome reutilizada y una cola
 * interna, para no "alentar" el servidor ni abrir un navegador por cada PDF.
 */

let browserPromise: Promise<Browser> | null = null;
// Cola simple: encadena las tareas una tras otra.
let cola: Promise<unknown> = Promise.resolve();

/**
 * Busca un navegador Chromium/Chrome utilizable. Prioridad:
 *   1. PUPPETEER_EXECUTABLE_PATH (variable de entorno).
 *   2. Chrome del sistema en rutas típicas (macOS / Linux).
 *   3. El Chromium que Puppeteer descargue automáticamente.
 * Así el servidor de producción puede funcionar solo instalando Chromium, sin
 * configuración extra, y en desarrollo aprovecha el Chrome ya instalado.
 */
function resolveExecutablePath(): string | undefined {
  if (env.puppeteerExecutablePath) return env.puppeteerExecutablePath;
  const candidatos = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ];
  for (const p of candidatos) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

function launchBrowser(): Promise<Browser> {
  return puppeteer
    .launch({
      headless: true,
      executablePath: resolveExecutablePath(),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-default-browser-check',
      ],
    })
    .catch((err) => {
      browserPromise = null;
      logger.error(
        { err },
        'Puppeteer: no se pudo iniciar el navegador. Instala Chromium/Chrome o define PUPPETEER_EXECUTABLE_PATH.',
      );
      throw new Error(
        'No se pudo generar el PDF: no hay un navegador (Chrome/Chromium) disponible en el servidor.',
      );
    });
}

/** Cierra el navegador en caché (p. ej. cuando su conexión quedó muerta). */
async function resetBrowser() {
  const prev = browserPromise;
  browserPromise = null;
  if (!prev) return;
  try {
    const b = await prev;
    if (b.connected) await b.close();
  } catch {
    /* ignore */
  }
}

async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    try {
      const b = await browserPromise;
      if (b.connected) return b;
    } catch {
      /* la promesa falló, se relanza abajo */
    }
    // La instancia guardada ya no sirve: se descarta y se lanza otra.
    logger.warn('Puppeteer: la conexión con el navegador se perdió, reiniciándolo');
    browserPromise = null;
  }
  browserPromise = launchBrowser();
  logger.info('Puppeteer: navegador iniciado');
  return browserPromise;
}

export function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function registerHelpers() {
  if ((Handlebars as any).__maquindHelpers) return;
  (Handlebars as any).__maquindHelpers = true;
  Handlebars.registerHelper('money', (value: unknown, moneda?: string) =>
    formatMoney(value as any, moneda ?? 'MXN'),
  );
  Handlebars.registerHelper('num', (value: unknown, decimals = 2) => toNum(value as any).toFixed(decimals));
  Handlebars.registerHelper('fecha', (value: unknown) => {
    if (!value) return '';
    const d = new Date(value as any);
    return isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  });
  Handlebars.registerHelper('fechaCorta', (value: unknown) => {
    if (!value) return '';
    const d = new Date(value as any);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-MX');
  });
  Handlebars.registerHelper('eq', (a, b) => a === b);
  Handlebars.registerHelper('inc', (v: unknown) => Number(v) + 1);
  Handlebars.registerHelper('upper', (v: unknown) => String(v ?? '').toUpperCase());
  Handlebars.registerHelper('mayus', (v: unknown) => String(v ?? '').toUpperCase());
}

registerHelpers();

const templatesDir = (() => {
  const candidatos = [
    path.join(__dirname, 'templates'), // compilado (dist/...)
    path.join(process.cwd(), 'src/modules/pdf/templates'), // desarrollo (tsx)
  ];
  for (const dir of candidatos) {
    if (fs.existsSync(dir)) return dir;
  }
  return candidatos[0];
})();

function renderTemplate(name: string, data: Record<string, unknown>): string {
  const file = path.join(templatesDir, `${name}.hbs`);
  const source = fs.readFileSync(file, 'utf8');
  return Handlebars.compile(source)(data);
}

export interface RenderPdfOptions {
  template: 'cotizacion' | 'factura' | string;
  data: Record<string, unknown>;
  /** Ruta relativa dentro de storage, p. ej. cotizaciones/COT-0001.pdf */
  outputRelativePath: string;
}

/** Genera un PDF y lo guarda en disco. Devuelve la ruta absoluta y la relativa. */
export async function renderPdf(options: RenderPdfOptions): Promise<{ absolutePath: string; relativePath: string }> {
  const html = renderTemplate(options.template, options.data);

  const absolutePath = path.join(env.storageDir, options.outputRelativePath);
  ensureDir(path.dirname(absolutePath));

  const runOnce = async () => {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '12mm', bottom: '14mm', left: '10mm', right: '10mm' },
      });
      fs.writeFileSync(absolutePath, pdf);
    } finally {
      await page.close().catch(() => undefined);
    }
  };

  const esErrorDeConexion = (err: unknown) =>
    /protocol error|connection closed|target closed|session closed|browser has disconnected/i.test(
      err instanceof Error ? err.message : String(err),
    );

  // Reintenta una vez si el navegador en caché perdió la conexión.
  const run = async () => {
    try {
      await runOnce();
    } catch (err) {
      if (!esErrorDeConexion(err)) throw err;
      logger.warn('Puppeteer: reintentando generar el PDF tras perder la conexión con el navegador');
      await resetBrowser();
      await runOnce();
    }
  };

  // Encadena a la cola para evitar concurrencia excesiva.
  const task = cola.then(run, run);
  cola = task.catch(() => undefined);
  await task;

  return { absolutePath, relativePath: options.outputRelativePath };
}

export async function closeBrowser() {
  if (browserPromise) {
    const b = await browserPromise;
    await b.close();
    browserPromise = null;
  }
}
