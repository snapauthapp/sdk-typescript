import {
  base64URLToArrayBuffer as toAB,
} from './utils'
import { UserRegistrationInfo } from './SDK'

export const parseRequestOptions = (json: CredentialRequestOptionsJSON): CredentialRequestOptions => {
  let getOptions: CredentialRequestOptions = {}
  getOptions.mediation = json.mediation
  if (PublicKeyCredential.parseRequestOptionsFromJSON) {
    console.debug('native ROFJ supported')
    getOptions.publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(json.publicKey)
    // other flags from response?
  } else {
    console.debug('using manual pROFJ')
    // Manually remap buffersources
    getOptions.publicKey = {
      ...json.publicKey,
      allowCredentials: json.publicKey.allowCredentials?.map(parseDescriptor),
      challenge: toAB(json.publicKey.challenge),
    }
    let pk = json.publicKey
  }
  // add abort signal?
  return getOptions
}

export const parseCreateOptions = (user: UserRegistrationInfo, json: CredentialCreationOptionsJSON): CredentialCreationOptions => {
  // Locally merge in user.name and displayName - they are never sent out and
  // not part of the server response.
  json.publicKey.user = {
    ...json.publicKey.user,
    name: user.name,
    displayName: user.displayName ?? user.name,
  }

  let createOptions: CredentialCreationOptions = {}

  if (PublicKeyCredential.parseCreationOptionsFromJSON) {
    console.debug('native pCOFJ supported')
    createOptions.publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(json.publicKey)
  } else {
    console.debug('using fallback pCOFJ')
    createOptions.publicKey = {
      ...json.publicKey,
      challenge: toAB(json.publicKey.challenge),
      excludeCredentials: json.publicKey.excludeCredentials?.map(parseDescriptor),
      user: {
        ...json.publicKey.user,
        id: toAB(json.publicKey.user.id),
      }
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
