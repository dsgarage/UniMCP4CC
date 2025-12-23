# Changelog

All notable changes to this project will be documented in this file.

## [1.0.3] - 2025-12-23

### Fixed
- **GlobalLogCapture thread safety**: Fixed `SetLogCallbackDefined can only be called from the main thread` error
  - Added `[InitializeOnLoadMethod]` to ensure main thread initialization
  - Added `EnsureInitialized()` method for explicit initialization
  - Added null checks to all GlobalLogCapture.Instance accessors

## [1.0.2] - 2025-12-19

### Fixed
- Added missing package.json.meta file

## [1.0.1] - 2025-12-19

### Fixed
- Fixed Unity package loading errors

## [1.0.0] - 2025-12-19

### Added
- Initial release
- DLL distribution for Unity 6
- Core MCP Server functionality
- Scene, GameObject, Component, Transform, Asset, Prefab, Audio APIs
