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

export const parseCreateOptions = (user: UserRegistrationInfo, json: CredentialCreationOptionsJSON): CredentialCreationOptions => {
  // Locally merge in user.name and displayName - they are never sent out (see
  // filterRegistrationData) and thus are not part of the server response.
  json.publicKey.user = {
    ...json.publicKey.user,
    name: user.name,
    displayName: user.displayName ?? user.name,
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
