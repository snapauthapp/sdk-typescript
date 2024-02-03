import { NativeSupportResult, TracksNativeSupport } from '../types'
import {
  base64URLToArrayBuffer as toAB,
  arrayBufferToBase64URL as toB64,
} from './utils'

export const registrationResponseToJSON = (credential: PublicKeyCredential): TracksNativeSupport<RegistrationResponseJSON> => {
  if (credential.toJSON) {
    // There's no discriminator to directly refine this type :(
    return credential.toJSON() as RegistrationResponseJSON
  }
  const response = credential.response as AuthenticatorAttestationResponse
  return {
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
 }

export const authenticationResponseToJSON = (credential: PublicKeyCredential): TracksNativeSupport<AuthenticationResponseJSON> => {
  if (credential.toJSON) {
    // There's no discriminator to directly refine this type :(
    return credential.toJSON() as AuthenticationResponseJSON
  }
  const response = credential.response as AuthenticatorAssertionResponse
  return  {
    id: credential.id,
    rawId: toB64(credential.rawId),
    type: credential.type,
    response: {
      authenticatorData: toB64(response.authenticatorData),
      clientDataJSON: toB64(response.clientDataJSON),
      signature: toB64(response.signature),
      userHandle: toB64(response.userHandle) ?? undefined,
      attestationObject: toB64(response.attestationObject) ?? undefined,
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  }
}
