import {
  base64URLToArrayBuffer as toAB,
} from './utils'
import { UserRegistrationInfo } from './SDK'

export const parseRequestOptions = (json: CredentialRequestOptionsJSON): CredentialRequestOptions => {
  let getOptions: CredentialRequestOptions = {}
  getOptions.mediation = json.mediation
  // TODO: restore parseRequestOptionsFromJSON (see #16+#17)
  // Manually remap buffersources
  getOptions.publicKey = {
    ...json.publicKey,
    allowCredentials: json.publicKey.allowCredentials?.map(parseDescriptor),
    challenge: toAB(json.publicKey.challenge),
  }
  return getOptions
}

type CombinedRegistrationFormat =
  | UserRegistrationInfo
  | { name: string, displayName?: string }

export const parseCreateOptions = (user: CombinedRegistrationFormat, json: CredentialCreationOptionsJSON): CredentialCreationOptions => {
  // Combine the server response (w/ user.id) and the client data into the
  // webAuthn structure, which requires `id`, `name`, and `displayName`.
  // What WebAuthn calls `name` we call `username` to enhance usage clarity.
  //
  // Pre-1.0, continue to support `name` as well.
  // @ts-ignore It's incorrectly inferring username|name
  const name = user.username ?? user.name
  json.publicKey.user = {
    ...json.publicKey.user,
    name,
    displayName: user.displayName ?? name,
  }

  let createOptions: CredentialCreationOptions = {}
  createOptions.mediation = json.mediation

  // TODO: restore parseCreationOptionsFromJSON (see #16+#17)
  createOptions.publicKey = {
    ...json.publicKey,
    challenge: toAB(json.publicKey.challenge),
    excludeCredentials: json.publicKey.excludeCredentials?.map(parseDescriptor),
    user: {
      ...json.publicKey.user,
      id: toAB(json.publicKey.user.id),
    }
  }

  return createOptions
}

const parseDescriptor = (json: PublicKeyCredentialDescriptorJSON): PublicKeyCredentialDescriptor => ({
  ...json,
  id: toAB(json.id),
})
