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
  let pk = json.publicKey
  // add abort signal?
  return getOptions
}

export const parseCreateOptions = (user: UserRegistrationInfo, json: CredentialCreationOptionsJSON): CredentialCreationOptions => {
  // TODO: mediation (see handleUpgrade)
  // Locally merge in user.name and displayName - they are never sent out and
  // not part of the server response.
  json.publicKey.user = {
    ...json.publicKey.user,
    name: user.name,
    displayName: user.displayName ?? user.name,
  }

  let createOptions: CredentialCreationOptions = {}

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

  // TODO: abortSignal?
  return createOptions
}

const parseDescriptor = (json: PublicKeyCredentialDescriptorJSON): PublicKeyCredentialDescriptor => ({
  ...json,
  id: toAB(json.id),
})

/**
 * Add WebAuthn Level 3 type info that's missing from TS
 */
interface PublicKeyCredentialStaticMethods {
  parseCreationOptionsFromJSON?: (data: PublicKeyCredentialCreationOptionsJSON) => PublicKeyCredentialCreationOptions
  parseRequestOptionsFromJSON?: (data: PublicKeyCredentialRequestOptionsJSON) => PublicKeyCredentialRequestOptions
  // copying these from the original version :shrug:
  // isConditionalMediationAvailable?: () => Promise<boolean>
}
declare var PublicKeyCredential: PublicKeyCredentialStaticMethods
