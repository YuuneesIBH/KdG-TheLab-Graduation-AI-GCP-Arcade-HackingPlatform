const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const repoRoot = path.resolve(__dirname, '..')
const arcadeRoot = path.join(repoRoot, 'arcade-flipper')
const venvDir = path.join(arcadeRoot, '.venv')
const isWindows = process.platform === 'win32'
const baselinePackages = ['pygame']

function log(message) {
  console.log(`[python-venv] ${message}`)
}

function fail(message) {
  console.error(`[python-venv] ${message}`)
  process.exit(1)
}

function runCommand(command, args, options = {}) {
  const rendered = [command, ...args].join(' ')
  log(`$ ${rendered}`)
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: { ...process.env, PIP_DISABLE_PIP_VERSION_CHECK: '1' },
    ...options
  })
  if (result.status !== 0) {
    fail(`Command failed (${result.status ?? 'unknown'}): ${rendered}`)
  }
}

function commandExists(command, args = ['--version']) {
  const result = spawnSync(command, args, { stdio: 'ignore' })
  return result.status === 0
}

function detectBootstrapPython() {
  const candidates = isWindows
    ? [
        { command: 'py', args: ['-3'] },
        { command: 'python', args: [] },
        { command: 'python3', args: [] }
      ]
    : [
        { command: 'python3', args: [] },
        { command: 'python', args: [] }
      ]

  for (const candidate of candidates) {
    if (commandExists(candidate.command, [...candidate.args, '--version'])) {
      return candidate
    }
  }

  return null
}

function detectVenvPython() {
  const candidates = isWindows
    ? [
        path.join(venvDir, 'Scripts', 'python.exe'),
        path.join(venvDir, 'Scripts', 'python')
      ]
    : [
        path.join(venvDir, 'bin', 'python3'),
        path.join(venvDir, 'bin', 'python')
      ]

  return candidates.find((candidate) => fs.existsSync(candidate))
}

function collectRequirementsFiles(baseDir) {
  if (!fs.existsSync(baseDir)) return []

  const collected = []
  const stack = [baseDir]

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue

    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === '__pycache__' || entry.name.startsWith('.')) continue

      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(fullPath)
        continue
      }

      if (/^requirements(\..+)?\.txt$/i.test(entry.name)) {
        collected.push(fullPath)
      }
    }
  }

  return collected
}

if (!fs.existsSync(arcadeRoot)) {
  fail(`Arcade folder not found: ${arcadeRoot}`)
}

const bootstrapPython = detectBootstrapPython()
if (!bootstrapPython) {
  fail('No Python interpreter found (expected python3/python)')
}

if (!fs.existsSync(venvDir)) {
  log(`Creating venv at ${venvDir}`)
  runCommand(bootstrapPython.command, [...bootstrapPython.args, '-m', 'venv', venvDir], { cwd: repoRoot })
} else {
  log(`Using existing venv at ${venvDir}`)
}

const venvPython = detectVenvPython()
if (!venvPython) {
  fail(`Venv python not found in ${venvDir}`)
}

runCommand(venvPython, ['-m', 'pip', 'install', '--disable-pip-version-check', '--upgrade', 'pip'], { cwd: repoRoot })

runCommand(venvPython, ['-m', 'pip', 'install', '--disable-pip-version-check', ...baselinePackages], { cwd: repoRoot })

const requirementsFiles = Array.from(new Set([
  path.join(repoRoot, 'requirements.txt'),
  path.join(arcadeRoot, 'requirements.txt'),
  ...collectRequirementsFiles(path.join(arcadeRoot, 'src', 'games'))
]))

for (const requirementsPath of requirementsFiles) {
  if (!fs.existsSync(requirementsPath)) {
    continue
  }
  runCommand(venvPython, ['-m', 'pip', 'install', '--disable-pip-version-check', '-r', requirementsPath], { cwd: repoRoot })
}

log(`Ready. Python launcher will use: ${venvPython}`)
