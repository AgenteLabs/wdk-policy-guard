// This package moved from the @flashylabs npm scope to @flashyfinancial.
// A rename like this has no code path that fails loudly if a reference is
// missed — an old import still resolves locally through a symlinked
// node_modules, and a stale scope in a workflow only shows up the next time
// that workflow actually runs against the registry. So this is a text sweep
// over every place the old scope could have been left behind, plus a check
// that the one workflow allowed to touch the old scope on the registry
// (deprecating it) can never fire on its own.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const PKG = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))

const OLD_SCOPE = '@flashylabs/wdk-policy-guard'
const NEW_SCOPE = '@flashyfinancial/wdk-policy-guard'

// Files whose old-scope text is legitimate and must stay exactly as it is:
// the deprecate workflow has to name the scope it deprecates, and the
// CHANGELOG has to say what changed from what.
const ALLOWED_OLD_SCOPE_FILES = new Set([
  join(ROOT, '.github', 'workflows', 'deprecate-old-scope.yml'),
  join(ROOT, 'CHANGELOG.md'),
])

// Source-ish files worth sweeping for the old scope. Not README.md's whole
// prose tree or CONTRIBUTING.md/SECURITY.md, which name no scope at all —
// listed explicitly so this test fails loudly if one of them ever does.
function sweepFiles() {
  const files = [
    join(ROOT, 'package.json'),
    join(ROOT, 'package-lock.json'),
    join(ROOT, 'README.md'),
    join(ROOT, 'INVARIANTS.md'),
    join(ROOT, 'wdk-policy-guard.manifest.json'),
    join(ROOT, 'src', 'manifest.js'),
    join(ROOT, 'test-types', 'consumer.ts'),
    join(ROOT, 'test-types', 'tsconfig.json'),
    join(ROOT, '.github', 'ISSUE_TEMPLATE', 'bug_report.md'),
  ]
  for (const f of readdirSync(join(ROOT, '.github', 'workflows'))) {
    files.push(join(ROOT, '.github', 'workflows', f))
  }
  return files
}

test('package.json publishes under the new scope', () => {
  assert.equal(PKG.name, NEW_SCOPE)
  assert.equal(PKG.publishConfig?.access, 'public', 'publishConfig.access must be "public" for a scoped package meant to be installable by anyone')
})

test('no file this rename touches still names the old scope, except where it is naming it on purpose', () => {
  const files = sweepFiles()
  assert.ok(files.length > 5, 'the file list looks too short — the sweep is probably broken')
  const offenders = []
  for (const f of files) {
    if (ALLOWED_OLD_SCOPE_FILES.has(f)) continue
    const text = readFileSync(f, 'utf8')
    if (text.includes(OLD_SCOPE)) offenders.push(f)
  }
  assert.deepEqual(offenders, [], `these files still reference ${OLD_SCOPE}: ${offenders.join(', ')}`)
})

test('the publish workflow publishes and checks under the new scope', () => {
  const text = readFileSync(join(ROOT, '.github', 'workflows', 'publish.yml'), 'utf8')
  assert.ok(text.includes(NEW_SCOPE), 'publish.yml should name the new scope')
  assert.ok(!text.includes(OLD_SCOPE), 'publish.yml should not still reference the old scope')
})

test('the old-scope deprecation workflow exists and can only run by hand', () => {
  const path = join(ROOT, '.github', 'workflows', 'deprecate-old-scope.yml')
  const text = readFileSync(path, 'utf8')

  assert.ok(text.includes(OLD_SCOPE), 'the deprecation workflow must name the scope it deprecates')
  assert.ok(text.includes('npm deprecate'), 'the workflow must actually call npm deprecate, not just describe doing so')

  // The "on:" block must be workflow_dispatch and nothing else — no push,
  // pull_request or schedule trigger may ever cause this to fire on its own.
  const onMatch = text.match(/^on:\n((?:[ \t].*\n?)*)/m)
  assert.ok(onMatch, 'could not find an "on:" trigger block')
  const triggerBlock = onMatch[1]
  assert.ok(/workflow_dispatch:/.test(triggerBlock), 'the workflow must declare workflow_dispatch')
  for (const forbidden of ['push:', 'pull_request:', 'schedule:', 'branch_protection_rule:']) {
    assert.ok(!triggerBlock.includes(forbidden), `the deprecation workflow must never trigger on "${forbidden}"`)
  }

  // It must reuse this repository's existing npm credential, never a secret
  // invented just for this workflow.
  assert.ok(
    text.includes('secrets.NPM_TOKEN_FLASHYOS_CI') || text.includes('secrets.NPM_TOKEN'),
    'the deprecation workflow must use the existing NPM_TOKEN(_FLASHYOS_CI) secret, not a new one',
  )
})
