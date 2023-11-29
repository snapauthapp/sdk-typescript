import {
  base64URLToArrayBuffer as toAB,
} from './utils'

export const parseRequestOptions = (json: CredentialRequestOptionsJSON): CredentialRequestOptions => {
  let getOptions: CredentialRequestOptions = {}
  if (PublicKeyCredential.parseRequestOptionsFromJSON) {
    console.debug('native ROFJ')
    let pk = PublicKeyCredential.parseRequestOptionsFromJSON(json.publicKey)
    getOptions.publicKey = pk
    // other flags from response?
  } else {
    console.debug('manual pROFJ')
    // Manually remap buffersources
    let pk = json.publicKey
    pk.challenge = toAB(pk.challenge)
    pk.allowCredentials.forEach(cred => cred.id = toAB(cred.id))
    getOptions.publicKey = pk
    // manual mode
  }
  // HACK, remove (not needed?)
  if (getOptions.publicKey.allowCredentials.length === 0) {
    delete getOptions.publicKey.allowCredentials
  }
  getOptions.publicKey.attestation = json.publicKey.attestation
  getOptions.publicKey.attestationFormats = json.publicKey.attestationFormats
  getOptions.publicKey.extensions = json.publicKey.extensions
  // Splat other options outside of PK back in
  // add abort signal?
  return getOptions
}

export const parseCreateOptions = (json: CredentialCreationOptionsJSON): CredentialCreationOptions => {
  let createOptions: CredentialCreationOptions = {}
  console.debug(createOptions)
  if (PublicKeyCredential.parseCreationOptionsFromJSON) {
    console.debug('native pCOFJ')
    createOptions.publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(json.publicKey)
  } else {
    console.debug('fallback pCOFJ')
    // fabllack
    json.publicKey.user.id = toAB(json.publicKey.user.id)
    json.publicKey.challenge = toAB(json.publicKey.challenge)
    // TODO: what other fields need converting?
    // - excludeCrentials at least
    createOptions = opts
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
