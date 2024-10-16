# SnapAuth TypeScript/JavaScript SDK

This is the official TS/JS SDK for [SnapAuth](https://www.snapauth.app/?utm_source=GitHub&utm_campaign=sdk&utm_content=sdk-typescript).

SnapAuth will let you add passkey support to your web (and native) app in a snap!
Add strong multi-factor authentication or go fully passwordless while maintaining a great, frictionless user experience.

This is for _client_ code.
If you're looking for the _server_ integration, check out [`@snapauth/node-sdk`](https://github.com/snapauthapp/sdk-node).

[SnapAuth Homepage](https://www.snapauth.app?utm_source=GitHub&utm_campaign=sdk&utm_content=sdk-typescript)
| [SnapAuth Docs](https://docs.snapauth.app)
| [Dashboard](https://dashboard.snapauth.app)
| [Github](https://github.com/snapauthapp/sdk-typescript)
| [NPM](https://www.npmjs.com/package/@snapauth/sdk)

[![GitHub Release](https://img.shields.io/github/v/release/snapauthapp/sdk-typescript)](https://github.com/snapauthapp/sdk-typescript/releases)
[![Test](https://github.com/snapauthapp/sdk-typescript/actions/workflows/test.yml/badge.svg)](https://github.com/snapauthapp/sdk-typescript/actions/workflows/test.yml)
![GitHub License](https://img.shields.io/github/license/snapauthapp/sdk-typescript)

[![NPM Version](https://img.shields.io/npm/v/%40snapauth%2Fsdk)](https://www.npmjs.com/package/@snapauth/sdk)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/%40snapauth%2Fsdk)
![NPM Type Definitions](https://img.shields.io/npm/types/%40snapauth%2Fsdk)


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
<script src="https://unpkg.com/@snapauth/sdk@0.2.0/dist/index.js"></script>
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
// This should be what the user signs in with, such as a username or email address
const registration = await snapAuth.startRegister({ name })
if (registration.ok) {
  const token = registration.data.token
  // Send token to your backend to use the /credential/create API
} else {
  // Inspect registration.error and decide how best to proceed
}
```

> [!IMPORTANT]
> You MUST send the token to the backend [`/credential/create`](https://docs.snapauth.app/server.html#create-a-credential) API to associate it with the user.
> Until this is done, the user will not be able to use their new credential.
>
> For security, the token expires in a few minutes.
> The response includes a `expiresAt` field indicating when this needs to be done.

The `name` value is used completely locally, and _is not sent to SnapAuth's servers_.
This is should be a login handle such as a username or email address.

You may also set `displayName`, though browsers typically (counter-intuitively) ignore `displayName` in favor of `name`.

> [!WARNING]
> The `name` field cannot be changed at this time - it's not supported by browsers.
> Once browser APIs exist to modify it, we will add support to the SDK.
> See [#40](https://github.com/snapauthapp/sdk-typescript/issues/40) for details.

#### Automatic Passkey Upgrades

Browsers and operating systems are adding support for [automatic passkey upgrades](/automatic-passkeys).
These allow adding passkeys to existing accounts without having to send the user through a separate UI flow.
If the browser supports it and the credential manager deems it appropriate, it will automatically create a passkey for the user.
See [the WWDC24 session video](https://developer.apple.com/videos/play/wwdc2024/10125/?time=38) for more information (automatic passkey upgrades are not Apple-specific).

To do this with SnapAuth, it's very similar to registration process above.
Simply swap `startRegister` to `upgradeToPasskey`, and _avoid_ showing feedback to users on failures.
This should be called just _after_ the user signs in with a non-WebAuthn credential, such as a password or OTP code.

```typescript
// Name should, again, be a "handle" that the user uses to sign in (username,
// email, etc)
const registration = await snapAuth.upgradeToPasskey({ name })
if (registration.ok) {
  const token = registration.data.token
  // Send token to your backend to use the /credential/create API
} else {
  // You may want to log this error or add metrics, but should NOT display
  // anything to the user in this flow.
}
```

SnapAuth will automatically handle browser support detection, and return an `api_unsupported_in_browser` for browsers that do not support automatic upgrades.
You can call our API in any browser!


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
