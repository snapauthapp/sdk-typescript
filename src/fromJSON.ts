import {
  base64URLToArrayBuffer as toAB,
} from './utils'
import { UserRegistrationInfo } from './SDK'

export const parseRequestOptions = (json: CredentialRequestOptionsJSON): CredentialRequestOptions => {
  let getOptions: CredentialRequestOptions = {}
  getOptions.mediation = json.mediation
  if (PublicKeyCredential.parseRequestOptionsFromJSON) {
    console.debug('native ROFJ')
    getOptions.publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(json.publicKey)
    // other flags from response?
  } else {
    console.debug('manual pROFJ')
    // Manually remap buffersources
    getOptions.publicKey = {
      ...json.publicKey,
      allowCredentials: json.publicKey.allowCredentials?.map(parseDescriptor),
      challenge: toAB(json.publicKey.challenge),
    }
    let pk = json.publicKey
    // pk.challenge = toAB(pk.challenge)
    // pk.allowCredentials.forEach(cred => cred.id = toAB(cred.id))
    // getOptions.publicKey = pk
    // manual mode
  }
  /*
  // HACK, remove (not needed?)
  if (getOptions.publicKey.allowCredentials.length === 0) {
    delete getOptions.publicKey.allowCredentials
  }
  getOptions.publicKey.attestation = json.publicKey.attestation
  getOptions.publicKey.attestationFormats = json.publicKey.attestationFormats
  getOptions.publicKey.extensions = json.publicKey.extensions
  // Splat other options outside of PK back in
  // */
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
    console.debug('native pCOFJ')
    createOptions.publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(json.publicKey)
  } else {
    console.debug('fallback pCOFJ')
    createOptions.publicKey = {
      ...json.publicKey,
      challenge: toAB(json.publicKey.challenge),
      excludeCredentials: json.publicKey.excludeCredentials?.map(parseDescriptor),
      user: {
        ...json.publicKey.user,
        id: toAB(json.publicKey.user.id),
      }
    }
    // json.publicKey.user.id = toAB(json.publicKey.user.id)
    // json.publicKey.challenge = toAB(json.publicKey.challenge)
    // TODO: what other fields need converting?
    // - excludeCrentials at least
    // createOptions = opts
  }

  console.debug(createOptions)
  // if (!createOptions.publicKey.extensions) {
  //   createOptions.publicKey.extensions = {}
  // }
  // createOptions.publicKey.extensions.credProps = true
  // createOptions.publicKey.authenticatorSelection.requireResidentKey = true
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
