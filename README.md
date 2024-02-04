# SnapAuth TypeScript/JavaScript SDK

The official TS/JS SDK for SnapAuth

## Installation and Setup
### Node
```bash
npm i --save '@snapauth/sdk
```
```typescript
import { SDK } from '@snapauth/sdk'
const snapAuth = new SDK('pubkey_your_value')
```

### Directly linking (UMD)
```html
<script src="https://unpkg.com/@snapauth/sdk@0.1.0/dist/index.js"></script>
<script type="text/javascript">
const snapAuth = new SnapAuth.SDK('pubkey_your_value')
</script>
```

## Building the SDK

Run `npm run watch` to keep the build running continually on file change.

To make the local version available for linking, run `npm link` in this directory.

In the project that should _use_ the local version, run `npm link '@snapauth/sdk'` which will set up the symlinking.

If working with a non-production backend, provide the host as a string to the second parameter of the SDK constructor.
