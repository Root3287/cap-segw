# AGENTS Guide

## Purpose
- This repository generates SEGW ABAP classes from SAP CAP/CDS models.
- Treat this file as the operating guide for agentic coding tools working in this repo.
- Prefer small, local changes that preserve generated output shape and ordering.
- Build context from existing code before editing; do not invent project conventions.

## Instruction Sources
- Primary repo-specific guidance lives in this `AGENTS.md`.
- No `.cursor/rules/` directory is present.
- No `.cursorrules` file is present.
- No `.github/copilot-instructions.md` file is present.
- If any of those files are added later, merge their instructions with this guide and follow the most specific rule for the files you touch.

## Repository Layout
- `src/` contains the TypeScript source.
- `src/generator/` contains the high-level ABAP class generators and shared writer utilities.
- `src/writers/` contains focused emitters for entities, associations, operations, and complex types.
- `src/converters/` maps CDS and EDM types into ABAP-friendly structures.
- `src/types/` holds shared TS types and enums for ABAP, CDS, EDM, and frontend compiler data.
- `src/utils/` holds helper utilities for ABAP naming, CDS mapping, EDM mapping, and cardinality.
- `cds-plugin.js` is the package entry point used by CAP.
- `dist/` is compiler output from `tsc`; keep it synchronized with `src/` changes.
- `test/unit/` holds focused unit tests.
- `test/integration/` holds integration tests that compile inline CDS and assert generated ABAP.
- `test/cds/` is a fixture CAP project for manual plugin validation.

## Environment And Tooling
- Package manager: `npm`.
- Language: TypeScript.
- Module format: CommonJS (`"type": "commonjs"`).
- Compiler: `tsc`.
- Test runner: `jest` with `ts-jest` transform.
- Strict type checking is enabled in `tsconfig.json`.
- There is currently no lint script and no ESLint/Prettier config in the repo.
- CI runs `npm test` before `npm run build`.

## Core Commands
- Install dependencies: `npm install`
- Clean install matching CI: `npm ci`
- Build TypeScript to `dist/`: `npm run build`
- Run the full test suite: `npm test`
- Run Jest directly: `npx jest`
- Pack the module locally: `npm pack`

## Running A Single Test
- Run one test file through npm: `npm test -- --runTestsByPath test/unit/generator/ABAPGenerator.test.ts`
- Run one integration test file: `npm test -- --runTestsByPath test/integration/SegwGenerator.integration.test.ts`
- Run one test by name pattern: `npm test -- -t "Empty Class"`
- Run one file and one test name together: `npm test -- --runTestsByPath test/unit/generator/ABAPGenerator.test.ts -t "Method with RAISING exceptions"`
- Run Jest in watch mode locally if needed: `npx jest --watch`

## Manual Validation Commands
- Generate SEGW output from a CAP project: `cds compile srv -s all --to segw`
- Force OData V2 generation: `cds compile srv -s all --to segw --odata-version 2`
- For local plugin testing in another CAP repo:
- Run `npm link` in this repo.
- Run `npm link cap-segw` in the target CAP project.

## Build Expectations
- Any runtime change under `src/` should usually be followed by `npm run build`.
- If `src/` changes affect runtime output, commit the updated `dist/` artifacts too.
- Do not hand-edit `dist/` first; edit `src/`, then rebuild.
- Keep generated output deterministic where possible.

## Testing Expectations
- Add or update tests for behavioral changes in generators, writers, converters, or helpers.
- Prefer unit tests when a single class or helper can be exercised directly.
- Prefer integration tests when validating full CAP-to-SEGW generation behavior.
- The repo already favors inline CDS definitions in tests over fixture-heavy setups.
- Use `test/cds/` mainly for manual validation, not as the default for new automated tests.
- Before finishing a change, run the smallest relevant Jest command first, then broader coverage if the change is non-trivial.

## Code Style Overview
- Match existing file style instead of introducing a new formatter style.
- Use tabs for indentation in TypeScript source and tests.
- Use semicolons.
- Use double quotes for TS and JS string literals unless an existing file clearly uses single quotes in a nearby block.
- Prefer trailing commas only where the surrounding file already uses them.
- Keep lines and blocks readable; do not collapse large logic into dense one-liners.
- Favor small helper methods only when they reduce duplication or isolate logic clearly.

## Imports
- Keep imports at the top of the file.
- Group imports roughly by local module area as the repo already does rather than reordering aggressively.
- Existing files usually place local imports before `@sap/cds`; preserve local file conventions when editing.
- Prefer explicit named imports for enums, types, and CAP symbols when already used in the file.
- Use `import * as X` only when the module is intentionally treated as a namespace, such as `* as ABAP`.
- Do not introduce type-only import syntax unless it matches the surrounding file style.

## TypeScript Conventions
- Keep `strict` mode clean; avoid adding `any` unless there is a real CAP typing gap.
- When `any` is unavoidable because of CAP metadata shape, keep the cast local and narrow.
- Prefer explicit return types on public methods and non-obvious private helpers.
- Use the existing type aliases and enums from `src/types/` instead of duplicating literal strings.
- Preserve CommonJS compatibility assumptions in build output.
- Follow the existing style for class properties: private underscore-prefixed fields are common in generators and writers.

## Naming Conventions
- Classes use PascalCase, for example `ABAPGenerator` and `CodeWriter`.
- Interfaces and interface-like generator contracts commonly use `IF...` prefixes.
- Enums and TS types in `src/types/` use PascalCase names.
- Internal class fields often use `_name` style private properties.
- Method names in TS generally use camelCase.
- Generated ABAP identifiers may intentionally use uppercase and SAP-style prefixes.
- Test files use `*.test.ts`, with integration tests often using `*.integration.test.ts`.

## Control Flow And Implementation Style
- Prefer direct, readable loops and conditionals over clever abstractions.
- Existing code frequently uses `forEach`, `Object.keys(...).forEach`, and `for...of`; follow nearby style.
- Preserve deterministic ordering when iterating over service entities, methods, actions, and generated outputs.
- Be careful with changes that alter generated method order, file names, or ABAP formatting.
- Keep related logic in one function unless extraction materially improves clarity.

## Error Handling And Logging
- The current codebase rarely throws exceptions in source code.
- Prefer preserving generation flow and logging warnings when input is unusual but recoverable.
- Use `cds.log("segw")` when logging within generator or writer code, matching existing patterns.
- Warn for problematic model conditions such as duplicate definitions or overly long generated names.
- Throw only when continuing would produce invalid or misleading output and there is no sensible fallback.
- Do not swallow errors silently in tests; assert on them explicitly if behavior is intentional.

## Working With Generated Output
- This project emits ABAP code as strings; whitespace and blank lines are part of the behavior.
- `CodeWriter` uses tab indentation and newline-terminated output; preserve that contract.
- When modifying writers or generators, verify string output carefully in tests.
- Avoid introducing nondeterminism such as unstable object iteration, random data, or locale-sensitive formatting.
- Be cautious with timestamps: if changing related logic, understand whether tests or consumers rely on the current behavior.

## Test Authoring Patterns
- Use `describe` and `test` blocks as in the existing Jest suite.
- Test names are sentence-like and usually describe observable behavior.
- Integration tests commonly build inline CDS strings, parse them with `@sap/cds`, then inspect generated files/content.
- Unit tests usually assert with `toContain`, `toEqual`, `toHaveLength`, and similar direct matchers.
- Prefer focused assertions on important generated fragments over snapshot tests.
- Add regression tests for bugs in naming, type mapping, operation generation, and ABAP formatting.

## Safe Editing Guidance For Agents
- Read the target file and nearby tests before making non-trivial changes.
- Check whether a behavior is covered by both unit and integration tests before changing it.
- Do not rename exported files, classes, or package entry points without a clear need.
- Do not add new dependencies unless the task clearly requires them.
- Do not create a lint workflow unless explicitly requested; none exists today.
- Avoid broad style-only rewrites in files with behavioral changes.

## Completion Checklist
- Update `src/` code minimally and consistently.
- Add or update the narrowest useful tests.
- Run at least the relevant single-test command.
- Run `npm test` for broad or risky changes.
- Run `npm run build` when runtime code changed.
- Confirm `dist/` matches the updated `src/` output when applicable.

## Commit And PR Notes
- Commit messages in repo history follow Conventional Commit style such as `fix:`, `test:`, `refactor(scope):`, and `chore:`.
- PR summaries should note behavior changes, commands run, and any ABAP output impact.
- If generation behavior changes, mention whether it affects OData V2, OData V4, or both.
