const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const repoRoot = path.resolve(__dirname, '..')
const arcadeRoot = path.join(repoRoot, 'arcade-guppy')
const venvDir = path.join(arcadeRoot, '.venv')
const isWindows = process.platform === 'win32'
const baselinePackages = ['pygame']
const pipDisableVersionEnv = { PIP_DISABLE_PIP_VERSION_CHECK: '1' }
const pipInstallArgs = ['-m', 'pip', 'install', '--disable-pip-version-check']
const requirementsFilePattern = /^requirements(\..+)?\.txt$/i
const skippedEntryNames = new Set(['__pycache__'])
const bootstrapPythonCandidates = isWindows
  ? [
      { command: 'py', args: ['-3'] },
      { command: 'python', args: [] },
      { command: 'python3', args: [] }
    ]
  : [
      { command: 'python3', args: [] },
      { command: 'python', args: [] }
    ]

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
    env: { ...process.env, ...pipDisableVersionEnv },
    ...options
  })
  if (result.status !== 0) {
    fail(`Command failed (${result.status ?? 'unknown'}): ${rendered}`)
  }
}

function commandExists(command, args = ['--version']) {
  try {
    const result = spawnSync(command, args, { stdio: 'ignore' })
    return result.status === 0
  } catch {
    return false
  }
}

function runPipInstall(pythonCommand, args, options = {}) {
  runCommand(pythonCommand, [...pipInstallArgs, ...args], options)
}

function detectBootstrapPython() {
  for (const candidate of bootstrapPythonCandidates) {
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
      if (skippedEntryNames.has(entry.name) || entry.name.startsWith('.')) continue

      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(fullPath)
        continue
      }

      if (requirementsFilePattern.test(entry.name)) {
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

runPipInstall(venvPython, ['--upgrade', 'pip'], { cwd: repoRoot })
runPipInstall(venvPython, baselinePackages, { cwd: repoRoot })

const requirementsFiles = Array.from(new Set([
  path.join(repoRoot, 'requirements.txt'),
  path.join(arcadeRoot, 'requirements.txt'),
  ...collectRequirementsFiles(path.join(arcadeRoot, 'src', 'games'))
]))
  .filter((requirementsPath) => fs.existsSync(requirementsPath))
  .sort()

for (const requirementsPath of requirementsFiles) {
  runPipInstall(venvPython, ['-r', requirementsPath], { cwd: repoRoot })
}

log(`Ready. Python launcher will use: ${venvPython}`)
