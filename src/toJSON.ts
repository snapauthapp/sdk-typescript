import { NativeSupportResult, TracksNativeSupport } from '../types'
import {
  areObjectPropertiesEqual as cmp,
  base64URLToArrayBuffer as toAB,
  arrayBufferToBase64URL as toB64,
} from './utils'

export const registrationResponseToJSON = (credential: PublicKeyCredential): TracksNativeSupport<RegistrationResponseJSON> => {
  const response = credential.response as AuthenticatorAttestationResponse
  const manualEncoding = {
    id: credential.id,
    rawId: toB64(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: toB64(response.clientDataJSON),
      transports: response.getTransports(),
      publicKey: toB64(response.getPublicKey()) ?? undefined,
      publicKeyAlgorithm: response.getPublicKeyAlgorithm(),
      authenticatorData: toB64(response.getAuthenticatorData()),
      attestationObject: toB64(response.attestationObject),
    },
    authenticatorAttachment: credential.authenticatorAttachment as AuthenticatorAttachment ?? undefined,
    clientExtensionResults: credential.getClientExtensionResults(), // ??
  }

  let native: NativeSupportResult = NativeSupportResult.NotSupported
  if (credential.toJSON) {
    const nativeResult = credential.toJSON()
    console.debug(nativeResult, manualEncoding, nativeResult == manualEncoding)
    // TODO: compare and update native
    native = NativeSupportResult.MismatchedManual
  }
  return { result: manualEncoding, native }
 }

export const authenticationResponseToJSON = (credential: PublicKeyCredential): TracksNativeSupport<AuthenticationResponseJSON> => {
  const response = credential.response as AuthenticatorAssertionResponse
  console.debug(credential.response)
  const manualEncoding: AuthenticationResponseJSON = {
    id: credential.id,
    rawId: toB64(credential.rawId),
    type: credential.type,
    response: {
      authenticatorData: toB64(response.authenticatorData),
      clientDataJSON: toB64(response.clientDataJSON),
      signature: toB64(response.signature),
      userHandle: toB64(response.userHandle) ?? undefined,
      // attestationObject: toB64(response.attestationObject) ?? undefined,
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  }
  if (response.attestationObject) {
    manualEncoding.response.attestationObject = toB64(response.attestationObject)
  }
  let native: NativeSupportResult = NativeSupportResult.NotSupported
  if (credential.toJSON) {
    const nativeResult = credential.toJSON()
    // TODO: compare and update native
    // console.debug(nativeResult, manualEncoding, cmp(manualEncoding, nativeResult))
    native = cmp(manualEncoding, nativeResult) ? NativeSupportResult.MatchedManual : NativeSupportResult.MismatchedManual
  }
  return { result: manualEncoding, native }
}
