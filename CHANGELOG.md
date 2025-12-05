# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0-rc.3] - 2025-12-05

### Fixed
- CI/CD

## [1.0.0-rc.2] - 2025-12-05

### Fixed
- CI/CD

## [1.0.0-rc.1] - 2025-12-05
### Added
- Initial public release of the CAP ➜ SEGW generator supporting OData V2 and V4.
- MPC/DPC class generation from CAP CDS with custom `@segw.*` annotations for names, ABAP types, sets, and associations.
- Support for generating actions/functions, complex types, and associations across V2/V4.
- Unit and integration test suites for writers, generators, and CDS-to-ABAP conversions.

### Changed
- Emits ABAP DDIC types and ABAP-friendly names via `@segw.abap.*` overrides where provided.
- Improved association handling to respect on-clause constraints and custom association names.

### Build/CI
- GitLab CI pipeline with test/build, manual publish to GitLab registry, and GitHub status/release notifications.
- GitHub Actions workflow for npm publishing (Trusted Publishing) and GitLab registry publishing.

[1.0.0-rc.3]: https://git.root3287.site/root3287/cap-segw/-/releases/v1.0.0-rc.3 https://github.com/Root3287/cap-segw/releases/tag/v1.0.0-rc.3
[1.0.0-rc.2]: https://git.root3287.site/root3287/cap-segw/-/releases/v1.0.0-rc.2 https://github.com/Root3287/cap-segw/releases/tag/v1.0.0-rc.2
[1.0.0-rc.1]: https://git.root3287.site/root3287/cap-segw/-/releases/v1.0.0-rc.1 https://github.com/Root3287/cap-segw/releases/tag/v1.0.0-rc.1
