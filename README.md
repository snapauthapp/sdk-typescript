# SnapAuth TypeScript/JavaScript SDK

The official TS/JS SDK for SnapAuth 🫰

This is for _client_ code.
If you're looking for the _server_ integration, check out [`@snapauth/node-sdk`](https://github.com/snapauthapp/sdk-node).

[![NPM Version](https://img.shields.io/npm/v/%40snapauth%2Fsdk)](https://www.npmjs.com/package/@snapauth/sdk)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/%40snapauth%2Fsdk)
![NPM Type Definitions](https://img.shields.io/npm/types/%40snapauth%2Fsdk)
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

> [!NOTE]
> Replace `pubkey_your_value` with the _publishable key_ for your domain from the [dashboard](https://dashboard.snapauth.app).
> Publishable keys are domain-specific and the domain MUST match what's in the browser's address bar.

## Usage
All examples are in TypeScript.
For use with vanilla JavaScript, omit the type imports and annotations.

These should be run in response to a button click, form submission, etc.
Browsers will ignore most WebAuthn requests that are not in response to a user gesture.

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

> [!IMPORTANT]
> You MUST send the token to the backend [`/registration/attach`](https://docs.snapauth.app/server.html#attach-registration-token) API to associate it with the user.
> Until this is done, the user will not be able to use their new credential.
>
> For security, the token expires in a few minutes.
> The response includes a `expiresAt` field indicating when this needs to be done.

The `name` value is used completely locally, and _is not sent to SnapAuth's servers_.
This is commonly something like a human name, email address, or login handle.
This will be visible to the user when they sign in.

> [!WARNING]
> The `name` field cannot be changed at this time - it's not supported by browsers.
> Once browser APIs exist to modify it, we will add support to the SDK.

You may also set `displayName`, though browsers typically (counter-intuitively) ignore `displayName` in favor of `name`.


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

You may use `id` or `handle` when calling `startAuth()`.
`id` is great when you already know who is signing in (returning user, MFA flows, etc); `handle` is more streamlined when initially authenticating.

Both values are **case-insensitive**.

> [!CAUTION]
> DO NOT sign in the user based on getting the client token alone!
> You MUST send it to the [`/auth/verify`](https://docs.snapauth.app/server.html#verify-authentication-token) Server API endpoint, and inspect its response to get the _verified_ user id to securely authenticate.

#### AutoFill-assisted requests

Most browsers support credential autofill, which will automatically prompt a user to sign in using a previously-registered credential.
To take advantage of this, you need two things:

1) An `<input>` (or `<textarea>`) field with `autocomplete="username webauthn"` set[^1].
   We strongly recommend adding these details to your standard sign-in field:
```html
<input type="text" autocomplete="username webauthn" placeholder="Username" />
```

2) Run the `autofill` API.
   This returns an `AuthResponse`, just like the modal `startAuth()` method.
```typescript
const auth = await snapAuth.autofill()
```

Unlike the direct startRegister and startAuth calls, autofill CAN and SHOULD be called as early in the page lifecycle is possible (_not_ in response to a user gesture).
This helps ensure that autofill can occur when a user interacts with the form field.

> [!TIP]
> Use the same logic to validate the the response from both `autofill()` and `startAuth()`.
>
> Avoid giving the user visual feedback if autofill returns an error.

```typescript
import { AuthResponse } from '@snapauth/sdk'
const validateAuth = async (auth: AuthResponse) => {
  if (auth.ok) {
    await fetch(...) // send auth.data.token to your backend to sign in the user
  }
}
const onSignInSubmit = async (e) => {
  // get `handle` (commonly username or email) from a form field or similar
  const auth = await snapAuth.startAuth({ handle })
  if (auth.ok) {
      await validateAuth(auth)
    } else {
      // Display a message to the user, send to a different flow, etc.
    }
}

const afAuth = await snapauth.autofill()
if (afAuth.ok) {
    validateAuth(afAuth)
}
```

## Building the SDK

Run `npm run watch` to keep the build running continually on file change.

To make the local version available for linking, run `npm link` in this directory.

In the project that should _use_ the local version, run `npm link '@snapauth/sdk'` which will set up the symlinking.

If working with a non-production backend, provide the host as a string to the second parameter of the SDK constructor.

[^1]: The WebAuthn spec says that only `webauthn` is required in `autocomplete`, but real-world browser testing shows that using exactly `autocomplete="username webauthn"` string is most reliable.
If you do not have this element, or the browser otherwise fails to detect it, the autofill-assited experience will not start.
