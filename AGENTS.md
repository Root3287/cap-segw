# Repository Guidelines

## Project Structure & Module Organization
- TypeScript sources live in `src/` with key areas: `generator/` (ABAP class writers and interfaces), `converters/` and `types/` (CDS/EDM mappings), `writers/` (MPC/DPC emitters), and `utils/` (ABAP/CDS helpers). `cds-plugin.js` wires the compiled output so CAP can call `cds.compile.to.segw`.
- Built artifacts are emitted to `dist/` via the TypeScript compiler; keep `dist/` in sync with `src/` changes.
- Tests sit in `test/` with mirrors of the runtime structure and CAP fixture projects under `test/cds/` for integration-style checks.

## Build, Test, and Development Commands
- `npm install` — install dependencies (CAP/CDS peer resolved from the host project when the plugin runs).
- `npm run build` — run `tsc` to refresh `dist/`.
- `npm test` — execute Jest via `ts-jest` in a Node environment.
- `cds compile srv -s all --to segw --odata-version 2` — example command to generate OData V2 ABAP classes for local validation; omit the version flag for OData V4.
- For local plugin testing inside another CAP repo, `npm link` here then `npm link cap-segw` in the target project.

## Coding Style & Naming Conventions
- Codebase is TypeScript targeting CommonJS; use tabs for indentation, semicolons, and double quotes for strings to match existing files.
- Classes and generator implementations are PascalCase (e.g., `ABAPGenerator`), interfaces often prefixed with `I/IF`, and test files follow `*.test.ts`.
- Keep ABAP output deterministic (no random data, stable ordering); prefer pure helpers in `utils/` and centralized type conversions in `converters/`.

## Testing Guidelines
- Jest with `ts-jest` powers unit and integration tests; place new specs alongside the area they cover under `test/`.
- Name tests after the unit under test (`ABAPGenerator.test.ts`) and use CAP fixture projects in `test/cds/` when exercising end-to-end generation.
- Always run `npm test` before opening a PR; add focused cases when changing generation logic or CDS/EDM conversions.

## Commit & Pull Request Guidelines
- Commit messages follow a Conventional Commit style seen in history (`fix: ...`, `refactor(scope): ...`, `chore: ...`, `test: ...`).
- PRs should include: a short summary of the change, linked issue (if any), commands run (`npm run build`, `npm test`), and notes on generated ABAP output if behavior changes.
- When TypeScript changes affect runtime output, rebuild and commit the updated `dist/` artifacts so `cds-plugin.js` stays accurate.
