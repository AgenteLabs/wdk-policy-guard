<!-- estate-hygiene:begin — emitted by tools/estate-hygiene-files.mjs in AgenteLabs/flashyos; regenerate, never edit -->
# Security

## Reporting a vulnerability

Report it privately, never in a public issue, pull request or chat channel.
Two routes, and both reach the same people:

- **Email michael@flashygroup.com** — the estate's one disclosure address, the same one
  published at https://flashynetwork.com/security/
  and in https://flashynetwork.com/.well-known/security.txt.
  One route across every repository is deliberate: a researcher who finds two
  addresses and picks the worse one has been failed by us, not by their choice.
- **GitHub → Security → Report a vulnerability** on this repository, which
  opens a private advisory only the maintainers can read. If that button is
  missing, private vulnerability reporting has not been enabled on this
  repository yet; use the email route and say so in the report.

Include what you found, how to reproduce it and what you believe the impact
is. Do not include real credentials, private keys or production data: nothing
here needs them to reproduce a finding.

## What to expect

| | |
|---|---|
| Acknowledgement | within 72 hours |
| An assessment, and what we are doing | agreed with you, in writing |
| Publication | a window agreed with you, never imposed |

If we miss the acknowledgement window, say so publicly. A window nobody is
held to is worse than none, because it asks a reporter to wait on a promise
that was never load-bearing.

## Supported versions

The default branch only. There is no maintained release line behind it: a
finding against the default branch is in scope, a finding against an older
tag or a fork is a reason to update.

## A committed credential is rotated, never removed

If a report is that a secret reached this repository, the fix is rotation at
the issuer. Deleting the file, rewriting history or force-pushing is not a
fix: the value is burned the moment it lands and stays burned, because
history, forks, caches and mirrors keep it. Say which secret, and we rotate
it before anything else.

## About this document

The sections above are emitted by [`tools/estate-hygiene-files.mjs`](https://github.com/AgenteLabs/flashyos/blob/main/tools/estate-hygiene-files.mjs)
in AgenteLabs/flashyos from one template the whole estate shares, and
`--check` fails when they drift.
Regenerate them; never edit them here. Anything below the marker is this
repository's own and is kept as written.
<!-- estate-hygiene:end — everything below is this repository’s own -->

## Threat model

This package holds no key, signs nothing, and makes no network call. Its entire job is a pure decision function: given an envelope, a candidate spend, and a ledger, return `ALLOW`, `ESCALATE`, or `DENY`. Its security surface is therefore narrow and specific:

- **A `DENY` that should have been an `ALLOW`** is an availability bug — annoying, not dangerous.
- **An `ALLOW` that should have been a `DENY` or `ESCALATE`** is the failure that matters: it means a spend outside the intended limits reached a signer. This is the class of bug every test in `test/policy.test.mjs` and `test/adapters.wdk.test.mjs` exists to catch.

This package assumes the caller has already authenticated and authorized *who* is asking to spend, and that the envelope handed to `grade()` is the correct one for that caller. It does not perform authentication, and an envelope constructed by an untrusted party is not something `grade()` can protect against — validate the envelope's provenance upstream.

## Known, deliberate limitations

- **`DailyLedger`'s default is in-memory and single-process.** In a multi-process or multi-device deployment without a shared, atomic ledger implementation, two processes can each observe a daily budget as not-yet-exhausted and both allow a spend that together exceed it. See `ARCHITECTURE.md`'s ledger section for the three-method contract a shared implementation must satisfy.
- **No replay protection.** `grade()` does not track spend identifiers — grading the same spend twice produces the same verdict twice, and (if you reserve after each) reserves the ledger twice. If your integration must guarantee a spend is graded and executed at most once, that idempotency key belongs in your own send path, alongside (not inside) this package.
- **Amount precision is bounded by BigInt, not by any protocol-specific limit.** This package will grade an amount of any size a `BigInt` can represent; it does not know or enforce a chain's actual token supply or transfer limits.
