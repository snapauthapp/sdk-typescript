# SnapAuth TypeScript/JavaScript SDK

The official TS/JS SDK for SnapAuth 🫰

This is for _client_ code.
If you're looking for the _server_ integration, check out [`@snapauth/node-sdk`](https://github.com/snapauthapp/sdk-node).

[![NPM Version](https://img.shields.io/npm/v/%40snapauth%2Fsdk)](https://www.npmjs.com/package/@snapauth/sdk)
![npm bundle size](https://img.shields.io/bundlephobia/min/%40snapauth%2Fsdk)
![GitHub License](https://img.shields.io/github/license/snapauthapp/sdk-typescript)

- [SnapAuth Homepage](https://www.snapauth.app)
- [Docs](https://docs.snapauth.app)
- [Dashboard](https://dashboard.snapauth.app)
- [Github](https://github.com/snapauthapp/sdk-typescript)

## Installation and Setup
### Node
```bash
npm i --save @snapauth/sdk
```
or
```bash
yarn add @snapauth/sdk
```

```typescript
import { SDK } from '@snapauth/sdk'
const snapAuth = new SDK('pubkey_your_value')
```

### Directly linking (UMD)
```html
<script src="https://unpkg.com/@snapauth/sdk@0.1.4/dist/index.js"></script>
<script type="text/javascript">
const snapAuth = new SnapAuth.SDK('pubkey_your_value')
</script>
```


## Usage
All examples are in TypeScript.
For use with vanilla JavaScript, omit the type imports and annotations.

> [!IMPORTANT]
> Both registration and authentication MUST be called in response to a user gesture.
> Browsers will block the attempt otherwise.
> This includes `onClick`, `onSubmit`, etc.

### Registering a Credential

```typescript
// Get `name` from a field in your UI, your backend, etc.
// This is what the user will see when authenticating
const registration = await snapAuth.startRegister({ name })
if (registration.ok) {
  const token = registration.data.token
  // Send token to your backend to use the /registration/attach API
} else {
  // Inspect registration.error and decide how best to proceed
}
```

> [!NOTE]
> The `name` value is used completely locally, and not even sent to SnapAuth's servers.
> This is commonly something like a human name, email address, or login handle.
>
> You MAY also set `displayName`.
> If not provided, we default it to the `name` value.
> Browsers typically (counter-intuitively) ignore `displayName` in favor of `name`.
>
> This is reflected in the TypeScript formats.

> [!CAUTION]
> You MUST send the token to the backend `/registration/attach` API to associate it with the user.
> Failure to do so will prevent the user from signing in the credential they just created.
> The response also includes a `expiresAt` field containing a Unix timestamp indicating by when the token must be attached.

> [!WARNING]
> The `name` field cannot be changed at this time - it's not supported by browers.
> Once browser APIs exist to modify it, we will add support to the SDK.


### Authenticating

```typescript
// This would typically be in an onClick/onSubmit handler
const handle = document.getElementById('username').value // Adjust to your UI
const auth = await snapAuth.startAuth({ handle })
if (auth.ok) {
  const token = auth.data.token
  // Send token to your backend to use the /auth/verify API
  // It will return the verified user's id and handle, which you should use to
  // sign in the user with your existing mechanism (cookie, token, etc)
} else {
  // Inspect auth.error and decide how best to proceed
}
```

> [!TIP]
> You may use `id` or `handle` when calling `startAuth()`.
> Using `id` will typically require a roundtrip to your service, but tends to be necessary if you normalize handles.
> Both values are **case-insensitive**.

> [!CAUTION]
> DO NOT sign in the user based on getting the client token alone!
> You MUST send it to the `/auth/verify` Server API endpoint, and inspect its response to get the _verified_ user id to securely authenticate.

#### AutoFill-assisted requests

Most browsers support credential autofill, which will automatically prompt a user to sign in using a previous-registered credential.
To take advantage of this, you need two things:

1) An `<input>` (or `<textarea>`) field with `autocomplete="username webauthn"` set[^1].
   We strongly recommend adding these details to your standard sign-in field:
```html
<input type="text" autocomplete="username webauthn" placeholder="Username" />
```

2) Run the `handleAutofill` API. This takes a callback which runs on successful authentication using the autofill API:
```typescript
// Type import is optional, but recommended.
import { AuthResponse } from '@snapauth/sdk'
const onSignIn = (auth: AuthResponse) => {
  if (auth.ok) {
    // send `auth.data.token` to your backend, as above
  }
}
snapAuth.handleAutofill(onSignIn)
```

> [!IMPORTANT]
> Never rely on the autofill experience alone.
> Always treat it as progressive enhancement to the standard flow.

> [!TIP]
> Re-use the `handleAutofill` callback in the traditional flow to create a consistent experience:
```typescript
const validateAuth = async (auth: AuthResponse) => {
  if (auth.ok) {
    await fetch(...) // send auth.data.token
  }
}
const onSignInSubmit = async (e) => {
  // ...
  const auth = await snapAuth.startAuth({ handle })
  await validateAuth(auth)
}
sdk.handleAutofill(validateAuth)
```

> [!TIP]
> Unlike the direct startRegister and startAuth calls, handleAutofill CAN and SHOULD be called as early in the page lifecycle is possible.
> This helps ensure that autofill can occur when a user interacts with the form field.

## Building the SDK

Run `npm run watch` to keep the build running continually on file change.

To make the local version available for linking, run `npm link` in this directory.

In the project that should _use_ the local version, run `npm link '@snapauth/sdk'` which will set up the symlinking.

If working with a non-production backend, provide the host as a string to the second parameter of the SDK constructor.

[^1]: The WebAuthn spec says that only `webauthn` is required in `autocomplete`, but real-world browser testing shows that using exactly `autocomplete="username webauthn"` string is most reliable.
If you do not have this element, or the browser otherwise fails to detect it, the autofill-assited experience will not start.
