# SnapAuth TypeScript/JavaScript SDK

The official TS/JS SDK for SnapAuth 🫰

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
<script src="https://unpkg.com/@snapauth/sdk@0.1.0/dist/index.js"></script>
<script type="text/javascript">
const snapAuth = new SnapAuth.SDK('pubkey_your_value')
</script>
```

## Usage
### Registering a Credential
```typescript
// Type imports are optional, and only apply to TypeScript
import { UserRegistrationInfo } from '@snapauth/sdk'
const registerInfo: UserRegistrationInfo = {
  name: 'any_user_visible_string',
  id: 'your_user_id', // and/or handle
}
const registration = snapAuth.startRegister(registerInfo)
if (registration.ok) {
  const token = registration.data.token
  // Send token to your backend to use the /registration/attach API
} else {
  // Inspect registration.error and decide how best to proceed
}

```
> [!NOTE]
> Registration requires you to provide either:
>
>     `id`: A stable user identifier (e.g. primary key), or
>     `handle`: A possibly-unstable identifier - what the user would type to sign in
>
> You may provide both now, and MUST provide both in the backend `attach` API call.
>
> You MUST also provide `name`, which is what the user sees during authentication.
> It is used completelly locally, and not even sent to SnapAuth's servers.
> This is commonly something like a human name, email address, or login handle.
>
> You MAY also set `displayName`.
> If not provided, we default it to the `name` value.
> Browsers typically (counter-intuitively) ignore `displayName` in favor of `name`.
>
> This is reflected in the TypeScript formats.

> [!WARNING]
> The `name` field cannot be changed at this time - it's not supported by browers.


### Authenticating

```typescript
// Type imports are optional, and only apply to TypeScript
import { UserAuthenticationInfo } from '@snapauth/sdk'
const authInfo: UserAuthenticationInfo = {
  id: 'your_user_id',
  // or handle, as set up during register
}
const auth = snapAuth.startAuth(authInfo)
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
> You can call the `startAuth` API without any roundtrips to your service by using `handle` instead of `id`.
> This matches the value configured during registration.

> [!CAUTION]
> Do not sign in the user based on getting the client token alone!
> You MUST send it to the verify endpoint, and inspect its response to get the _verified_ user id to securely authenticate.

## Building the SDK

Run `npm run watch` to keep the build running continually on file change.

To make the local version available for linking, run `npm link` in this directory.

In the project that should _use_ the local version, run `npm link '@snapauth/sdk'` which will set up the symlinking.

If working with a non-production backend, provide the host as a string to the second parameter of the SDK constructor.
