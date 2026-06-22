import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

const ROOT = path.resolve(import.meta.dirname, '..')
const LINKS_PATH = path.join(ROOT, 'public', 'links.json')
const PREVIEWS_DIR = path.join(ROOT, 'public', 'previews')
const VIEWPORT = { width: 1280, height: 720 }
const DEFAULT_WAIT_MS = 7000
const DEFAULT_CONCURRENCY = 2

const INVALID_PAGE_PATTERNS = [
  /just a moment/i,
  /performing security verification/i,
  /checking your browser/i,
  /verify you are human/i,
  /attention required.*cloudflare/is,
  /enable javascript and cookies to continue/i,
  /your browser is not supported/i,
  /browser is not supported/i,
  /image not authorized/i,
  /sign-?up for a paid account/i,
  /preview unavailable/i,
  /site can(?:not|'t) work correctly in your current browser/i,
]

const BLOCKED_URLS = [
  '*://*.doubleclick.net/*',
  '*://*.googlesyndication.com/*',
  '*://*.googleadservices.com/*',
  '*://*.amazon-adsystem.com/*',
  '*://*.taboola.com/*',
  '*://*.outbrain.com/*',
  '*://*.scorecardresearch.com/*',
  '*://*.hotjar.com/*',
  '*://*.clarity.ms/*',
]

const DEFAULT_HIDDEN_SELECTORS = [
  'ins.adsbygoogle',
  '[id^="google_ads_"]',
  '[id*="google_ads"]',
  '[class*="google-ad"]',
  '[class*="google_ad"]',
  '[class*="ad-container"]',
  '[class*="ad_container"]',
  '[data-ad-slot]',
]

class CdpSession {
  constructor(socket) {
    this.socket = socket
    this.nextId = 0
    this.pending = new Map()
    this.listeners = new Map()

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)

      if (message.id && this.pending.has(message.id)) {
        const pending = this.pending.get(message.id)
        this.pending.delete(message.id)
        if (message.error) pending.reject(new Error(message.error.message))
        else pending.resolve(message.result)
        return
      }

      if (message.method) {
        for (const listener of this.listeners.get(message.method) || []) {
          listener(message.params || {})
        }
      }
    })
  }

  static async connect(url) {
    const socket = new WebSocket(url)
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true })
      socket.addEventListener('error', reject, { once: true })
    })
    return new CdpSession(socket)
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.nextId
      this.pending.set(id, { resolve, reject })
      this.socket.send(JSON.stringify({ id, method, params }))
    })
  }

  on(method, listener) {
    if (!this.listeners.has(method)) this.listeners.set(method, new Set())
    this.listeners.get(method).add(listener)
    return () => this.listeners.get(method)?.delete(listener)
  }

  waitFor(method, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe()
        reject(new Error(`tempo excedido aguardando ${method}`))
      }, timeoutMs)
      const unsubscribe = this.on(method, (params) => {
        clearTimeout(timeout)
        unsubscribe()
        resolve(params)
      })
    })
  }

  close() {
    if (this.socket.readyState < WebSocket.CLOSING) this.socket.close()
  }
}

const args = parseArgs(process.argv.slice(2))

if (args.help) {
  printHelp()
  process.exit(0)
}

if (!fs.existsSync(LINKS_PATH)) {
  fail(`Arquivo não encontrado: ${LINKS_PATH}`)
}

fs.mkdirSync(PREVIEWS_DIR, { recursive: true })

const source = fs.readFileSync(LINKS_PATH, 'utf8')
const eol = source.includes('\r\n') ? '\r\n' : '\n'
const links = JSON.parse(source)

if (!Array.isArray(links)) {
  fail('public/links.json precisa conter uma lista.')
}

const previewNames = allocatePreviewNames(links)

if (args.check) {
  const issues = checkPreviews(links)
  if (issues.length) {
    console.error(`\n${issues.length} problema(s) encontrado(s):`)
    for (const issue of issues) console.error(`  - ${issue}`)
    process.exit(1)
  }

  console.log(
    `Catálogo consistente: previews locais válidos ou links marcados como indisponíveis (${links.length} links).`,
  )
  process.exit(0)
}

const selected = links
  .map((link, index) => ({ link, index, ...previewNames[index] }))
  .filter(({ link, slug }) => matchesOnly(link, slug, args.only))

const pending = []
let attached = 0
let skipped = 0
let unavailable = 0

for (const item of selected) {
  const { link, absolutePreview } = item
  const currentLocalPreview = localPreviewPath(link.preview)
  const currentPreviewExists =
    currentLocalPreview && fs.existsSync(currentLocalPreview)
      ? currentLocalPreview
      : fs.existsSync(absolutePreview)
        ? absolutePreview
        : null

  if (!args.force && currentPreviewExists) {
    const expectedValue = toPublicPath(currentPreviewExists)
    if (link.preview !== expectedValue) {
      link.preview = expectedValue
      attached += 1
    } else {
      skipped += 1
    }
    continue
  }

  if (link.previewConfig?.skip === true) {
    skipped += 1
    console.log(`↷ ${link.title}: ignorado por previewConfig.skip`)
    continue
  }

  if (!args.force && !args.retryFailed && link.previewStatus === 'unavailable') {
    unavailable += 1
    console.log(`↷ ${link.title}: indisponível; use --retry-failed para testar novamente`)
    continue
  }

  pending.push({
    ...item,
    previousPreview: link.preview,
    previousFileExists: Boolean(currentPreviewExists),
  })
}

if (attached) writeLinks()

if (!pending.length) {
  console.log(
    `Nenhuma captura pendente. ${skipped} preview(s) existentes e ${unavailable} indisponível(is).`,
  )
  process.exit(0)
}

if (args.dryRun) {
  console.log(`${pending.length} preview(s) seriam gerados:`)
  for (const { link, relativePreview } of pending) {
    console.log(`  - ${link.title} → ${relativePreview}`)
  }
  process.exit(0)
}

const chromePath = findChrome()
if (!chromePath) {
  fail(
    'Chrome/Chromium não encontrado. Instale o Google Chrome ou defina CHROME_PATH com o executável.',
  )
}

console.log(`Chrome: ${chromePath}`)
console.log(
  `Gerando ${pending.length} preview(s), ${args.concurrency} por vez, em ${VIEWPORT.width}×${VIEWPORT.height}.\n`,
)

const browser = await launchBrowser(chromePath, args.headed)
const failures = []
let completed = 0

const shutdown = async () => {
  await browser.close()
}

process.once('SIGINT', async () => {
  console.log('\nInterrompido. As capturas concluídas foram preservadas.')
  await shutdown()
  process.exit(130)
})

try {
  await runPool(pending, args.concurrency, async (item) => {
    const result = await capturePreview(browser, item)

    if (result.ok) {
      fs.writeFileSync(item.absolutePreview, result.buffer)
      item.link.preview = item.relativePreview
      delete item.link.previewStatus
      delete item.link.previewError
      writeLinks()
      completed += 1
      console.log(
        `✓ ${item.link.title} (${formatBytes(result.buffer.length)}, ${result.elapsedSeconds}s)`,
      )
      return
    }

    if (!item.previousFileExists && item.link.preview) {
      delete item.link.preview
    }
    item.link.previewStatus = 'unavailable'
    item.link.previewError = result.reason
    writeLinks()

    failures.push({ title: item.link.title, reason: result.reason })
    console.error(`✗ ${item.link.title}: ${result.reason}`)
  })
} finally {
  await shutdown()
}

console.log(
  `\nConcluído: ${completed} gerado(s), ${skipped} existente(s), ${unavailable} indisponível(is), ${failures.length} nova(s) falha(s).`,
)

if (failures.length) {
  console.error('\nLinks que precisam de ajuste:')
  for (const failure of failures) {
    console.error(`  - ${failure.title}: ${failure.reason}`)
  }
  console.error(
    '\nUse previewConfig no links.json ou rode novamente com --only=<nome> --headed.',
  )
  process.exit(1)
}

function parseArgs(values) {
  const options = {
    check: false,
    concurrency: DEFAULT_CONCURRENCY,
    dryRun: false,
    force: false,
    headed: false,
    help: false,
    only: '',
    retryFailed: false,
  }

  for (const value of values) {
    if (value === '--check') options.check = true
    else if (value === '--dry-run') options.dryRun = true
    else if (value === '--force') options.force = true
    else if (value === '--headed') options.headed = true
    else if (value === '--retry-failed') options.retryFailed = true
    else if (value === '--help' || value === '-h') options.help = true
    else if (value.startsWith('--only=')) options.only = value.slice('--only='.length)
    else if (value.startsWith('--concurrency=')) {
      const concurrency = Number(value.slice('--concurrency='.length))
      if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) {
        fail('--concurrency precisa ser um número entre 1 e 4.')
      }
      options.concurrency = concurrency
    } else {
      fail(`Opção desconhecida: ${value}`)
    }
  }

  return options
}

function printHelp() {
  console.log(`
Gera screenshots locais para os links que ainda não possuem imagem.

Uso:
  npm run previews
  npm run previews -- --only=frameset
  npm run previews -- --only=frameset --force --headed
  npm run previews:check

Opções:
  --only=texto        Processa apenas título, domínio ou slug correspondente
  --force             Regenera previews existentes
  --headed            Exibe o Chrome para login, CAPTCHA ou inspeção manual
  --retry-failed      Tenta novamente links marcados como indisponíveis
  --concurrency=1..4  Número de capturas simultâneas (padrão: 2)
  --dry-run           Lista o que seria criado sem abrir o navegador
  --check             Verifica se todos os links têm arquivos locais válidos
`)
}

function allocatePreviewNames(items) {
  const used = new Set()

  return items.map((link) => {
    const configuredFile = link.previewConfig?.filename
    const currentLocal = localPreviewPath(link.preview)
    const currentName = currentLocal
      ? path.basename(currentLocal, path.extname(currentLocal))
      : null
    const base = slugify(
      configuredFile || currentName || link.title || domainOf(link.url) || 'link',
    )
    let slug = base || 'link'
    let suffix = 2

    while (used.has(slug)) {
      slug = `${base}-${suffix}`
      suffix += 1
    }

    used.add(slug)
    const filename = `${slug}.jpg`

    return {
      slug,
      relativePreview: `/previews/${filename}`,
      absolutePreview: path.join(PREVIEWS_DIR, filename),
    }
  })
}

function checkPreviews(items) {
  const issues = []

  for (const link of items) {
    const localPath = localPreviewPath(link.preview)
    if (!localPath) {
      if (link.previewStatus === 'unavailable') continue
      issues.push(`${link.title}: campo preview ausente ou não local`)
      continue
    }

    if (!fs.existsSync(localPath)) {
      issues.push(`${link.title}: arquivo ausente (${link.preview})`)
      continue
    }

    const size = fs.statSync(localPath).size
    if (size < 10_000) {
      issues.push(`${link.title}: imagem suspeita, apenas ${formatBytes(size)}`)
    }
  }

  return issues
}

function matchesOnly(link, slug, only) {
  if (!only) return true
  const needle = normalize(only)
  return [link.title, link.url, domainOf(link.url), slug]
    .map(normalize)
    .some((value) => value.includes(needle))
}

function localPreviewPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/previews/')) return null
  const resolved = path.resolve(ROOT, 'public', value.slice(1))
  const previewsRoot = `${path.resolve(PREVIEWS_DIR)}${path.sep}`
  return resolved.startsWith(previewsRoot) ? resolved : null
}

function toPublicPath(file) {
  return `/${path.relative(path.join(ROOT, 'public'), file).split(path.sep).join('/')}`
}

function writeLinks() {
  const output = `${JSON.stringify(links, null, 2).replace(/\n/g, eol)}${eol}`
  fs.writeFileSync(LINKS_PATH, output, 'utf8')
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    process.platform === 'win32'
      ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      : null,
    process.platform === 'win32'
      ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
      : null,
    process.platform === 'win32'
      ? path.join(
          process.env.LOCALAPPDATA || '',
          'Google',
          'Chrome',
          'Application',
          'chrome.exe',
        )
      : null,
    process.platform === 'win32'
      ? 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
      : null,
    process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : null,
    process.platform === 'darwin'
      ? '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
      : null,
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }

  const commands = [
    'google-chrome-stable',
    'google-chrome',
    'chromium',
    'chromium-browser',
    'microsoft-edge',
  ]

  for (const command of commands) {
    const lookup = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', [command], {
      encoding: 'utf8',
      windowsHide: true,
    })
    const candidate = lookup.stdout?.split(/\r?\n/).find(Boolean)
    if (candidate && fs.existsSync(candidate)) return candidate.trim()
  }

  return null
}

async function launchBrowser(executable, headed) {
  const port = await findFreePort()
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'klink-previews-'))
  const browserArgs = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-sync',
    '--disable-features=Translate,MediaRouter',
    '--disable-blink-features=AutomationControlled',
    `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
    headed ? '--window-position=80,80' : '--window-position=-32000,-32000',
    'about:blank',
  ]

  const child = spawn(executable, browserArgs, {
    stdio: 'ignore',
    windowsHide: !headed,
  })

  await waitForBrowser(port, child)

  return {
    port,
    child,
    profileDir,
    async close() {
      try {
        const version = await fetchJson(`http://127.0.0.1:${port}/json/version`)
        const session = await CdpSession.connect(version.webSocketDebuggerUrl)
        await session.send('Browser.close')
        session.close()
      } catch {
        child.kill()
      }

      await wait(800)
      if (!child.killed) child.kill()

      try {
        fs.rmSync(profileDir, { recursive: true, force: true })
      } catch {
        // O sistema operacional pode terminar processos auxiliares alguns milissegundos depois.
      }
    },
  }
}

async function capturePreview(browser, item) {
  const startedAt = Date.now()
  const config = item.link.previewConfig || {}
  const targetUrl = config.url || item.link.url
  let target
  let session

  try {
    new URL(targetUrl)
  } catch {
    return failure('URL inválida')
  }

  try {
    target = await fetchJson(
      `http://127.0.0.1:${browser.port}/json/new?${encodeURIComponent(targetUrl)}`,
      { method: 'PUT' },
    )
    session = await CdpSession.connect(target.webSocketDebuggerUrl)
    const documentResponses = []

    session.on('Network.responseReceived', ({ frameId, type, response }) => {
      if (type === 'Document') {
        documentResponses.push({ frameId, status: response.status, url: response.url })
      }
    })

    await Promise.all([
      session.send('Page.enable'),
      session.send('Runtime.enable'),
      session.send('Network.enable'),
    ])
    await session.send('Network.setBlockedURLs', { urls: BLOCKED_URLS })
    await session.send('Emulation.setDeviceMetricsOverride', {
      ...VIEWPORT,
      deviceScaleFactor: 1,
      mobile: false,
    })

    const loadEvent = session.waitFor('Page.loadEventFired', 30_000).catch(() => null)
    const navigation = await session.send('Page.navigate', { url: targetUrl })
    if (navigation.errorText) throw new Error(navigation.errorText)
    await loadEvent

    await wait(positiveNumber(config.waitMs, DEFAULT_WAIT_MS))
    await waitForReadySelector(session, config.readySelector)
    await waitForChallengeToClear(session, 25_000)
    await dismissOverlays(session, config)
    await wait(1200)
    await preparePageForScreenshot(session, config)

    const pageState = await inspectPage(session)
    const mainResponses = documentResponses.filter(
      (response) => response.frameId === navigation.frameId,
    )
    const invalidReason = validatePageState(pageState, mainResponses)
    if (invalidReason) throw new Error(invalidReason)

    const screenshot = await session.send('Page.captureScreenshot', {
      format: 'jpeg',
      quality: 84,
      fromSurface: true,
      captureBeyondViewport: false,
    })
    const buffer = Buffer.from(screenshot.data, 'base64')

    if (buffer.length < 10_000) {
      throw new Error(`captura parece vazia (${formatBytes(buffer.length)})`)
    }

    return {
      ok: true,
      buffer,
      elapsedSeconds: ((Date.now() - startedAt) / 1000).toFixed(1),
    }
  } catch (error) {
    return failure(error instanceof Error ? error.message : String(error))
  } finally {
    session?.close()
    if (target?.id) {
      await fetch(`http://127.0.0.1:${browser.port}/json/close/${target.id}`, {
        method: 'PUT',
      }).catch(() => null)
    }
  }
}

async function dismissOverlays(session, config) {
  if (Array.isArray(config.click)) {
    for (const selector of config.click) {
      await evaluate(
        session,
        `(selector) => document.querySelector(selector)?.click()`,
        selector,
      ).catch(() => null)
      await wait(350)
    }
  }

  await session.send('Runtime.evaluate', {
    expression: `(() => {
      const accepted = /^(accept|accept all|accept cookies|allow all|agree|got it|ok|aceitar|aceitar todos|aceitar cookies|concordo|permitir todos|entendi|fechar)$/i;
      const cookieContext = /(cookie|consent|privacy|privacidade|lgpd)/i;
      const candidates = [...document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]')];

      for (const element of candidates) {
        const text = (element.innerText || element.value || element.getAttribute('aria-label') || '').trim();
        const context = element.closest('[id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i], [id*="privacy" i], [class*="privacy" i]');
        if (accepted.test(text) && (context || cookieContext.test(text))) {
          element.click();
          break;
        }
      }
    })()`,
    awaitPromise: true,
  })
}

async function preparePageForScreenshot(session, config) {
  const hiddenSelectors = [
    ...DEFAULT_HIDDEN_SELECTORS,
    ...(Array.isArray(config.hide) ? config.hide : []),
  ]
  const scrollY = Number.isFinite(Number(config.scrollY)) ? Number(config.scrollY) : 0

  await evaluate(
    session,
    `({ selectors, scrollY }) => {
      document.querySelectorAll(selectors.join(',')).forEach((element) => {
        element.style.setProperty('display', 'none', 'important');
      });

      const style = document.createElement('style');
      style.dataset.klinkPreview = 'true';
      style.textContent = \`
        html { scroll-behavior: auto !important; scrollbar-width: none !important; }
        ::-webkit-scrollbar { display: none !important; }
        *, *::before, *::after {
          caret-color: transparent !important;
          animation-play-state: paused !important;
        }
      \`;
      document.head.appendChild(style);
      document.querySelectorAll('video').forEach((video) => video.pause());
      window.scrollTo(0, scrollY);
      return document.fonts?.ready;
    }`,
    { selectors: hiddenSelectors, scrollY },
    true,
  )
}

async function inspectPage(session) {
  return evaluate(
    session,
    `() => {
      const body = document.body;
      const text = (body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 20000);
      const visuals = document.querySelectorAll('img, video, canvas, svg, picture').length;
      return {
        title: document.title,
        url: location.href,
        text,
        visuals,
        width: Math.max(document.documentElement?.scrollWidth || 0, body?.scrollWidth || 0),
        height: Math.max(document.documentElement?.scrollHeight || 0, body?.scrollHeight || 0),
      };
    }`,
  )
}

function validatePageState(state, responses) {
  if (!state) return 'não foi possível inspecionar a página'
  if (state.url.startsWith('chrome-error://')) return 'o Chrome exibiu uma página de erro'

  const content = `${state.title}\n${state.text}`
  const invalidPattern = INVALID_PAGE_PATTERNS.find((pattern) => pattern.test(content))
  if (invalidPattern) {
    return `página intermediária detectada: “${matchingExcerpt(content, invalidPattern)}”`
  }

  const lastResponse = responses.at(-1)
  if (lastResponse?.status >= 400) {
    return `a página respondeu HTTP ${lastResponse.status}`
  }

  if (state.text.length < 20 && state.visuals === 0) {
    return 'a página carregou praticamente vazia'
  }

  if (state.width < 320 || state.height < 180) {
    return `área renderizada inválida (${state.width}×${state.height})`
  }

  return ''
}

async function waitForChallengeToClear(session, timeoutMs) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const state = await inspectPage(session)
    const content = `${state.title}\n${state.text}`
    const challenge = INVALID_PAGE_PATTERNS.find((pattern) => pattern.test(content))

    if (!challenge) return
    if (
      /browser is not supported|image not authorized|paid account|preview unavailable/i.test(
        content,
      )
    ) {
      return
    }

    await wait(1500)
  }
}

async function waitForReadySelector(session, selector) {
  if (!selector) return
  const deadline = Date.now() + 30_000

  while (Date.now() < deadline) {
    const found = await evaluate(
      session,
      `(selector) => Boolean(document.querySelector(selector))`,
      selector,
    )
    if (found) return
    await wait(500)
  }

  throw new Error(`seletor não apareceu: ${selector}`)
}

async function evaluate(session, functionSource, argument, awaitPromise = false) {
  const hasArgument = arguments.length >= 3
  const expression = hasArgument
    ? `(${functionSource})(${JSON.stringify(argument)})`
    : `(${functionSource})()`
  const result = await session.send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
  })

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'falha ao executar JavaScript na página')
  }

  return result.result?.value
}

async function runPool(items, concurrency, worker) {
  let cursor = 0

  async function runWorker() {
    while (cursor < items.length) {
      const item = items[cursor]
      cursor += 1
      await worker(item)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker))
}

async function waitForBrowser(port, child) {
  const deadline = Date.now() + 15_000

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error('O Chrome encerrou antes de iniciar a captura.')
    }

    try {
      await fetchJson(`http://127.0.0.1:${port}/json/version`)
      return
    } catch {
      await wait(250)
    }
  }

  throw new Error('Não foi possível conectar ao Chrome.')
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(() => resolve(address.port))
    })
  })
}

async function fetchJson(url, init) {
  const response = await fetch(url, init)
  if (!response.ok) throw new Error(`HTTP ${response.status} em ${url}`)
  return response.json()
}

function slugify(value) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
}

function normalize(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function domainOf(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function positiveNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function matchingExcerpt(content, pattern) {
  const match = content.match(pattern)
  return (match?.[0] || 'bloqueio detectado').replace(/\s+/g, ' ').slice(0, 90)
}

function formatBytes(bytes) {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function failure(reason) {
  return { ok: false, reason }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function fail(message) {
  console.error(message)
  process.exit(1)
}
