# Changelog

## Upcoming

## 0.3.0

### Changed

- Made parameter names more consistent across the SDK. Both registration and authentication use `username` instead of `name` and `handle` parameters.

### Fixed

- Cancel pending requests `beforeunload`. This improves reliability by working around rare browser bugs, particularly during development.

## 0.2.0

### Added

- Support for automatic passkey upgrades

## 0.1.5

### Added

- New `async/await`-based API for autofilled requests
- Improved APIs for availability checks

### Fixed

- License year and other internal housekeeping

## 0.1.4

### Fixed

- Cancel pending request when a new one is starting

## 0.1.3

**Note**: This version was not released due to a tagging error.

## 0.1.2

### Changed

- Send SDK version in request headers

## 0.1.1

### Changed

- User id and handle are no longer required during client registration phase

## 0.1.0

**Initial release**
