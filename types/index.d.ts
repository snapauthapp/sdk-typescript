interface PublicKeyCredentialStaticMethods {
  // FIXME: wrong, this is json=>native (pk only?)
  parseCreationOptionsFromJSON?: (data: PublicKeyCredentialCreationOptionsJSON) => PublicKeyCredentialCreationOptions
  parseRequestOptionsFromJSON?: (data: PublicKeyCredentialRequestOptionsJSON) => PublicKeyCredentialRequestOptions
}
declare var PublicKeyCredential: PublicKeyCredentialStaticMethods

declare global {

  interface PublicKeyCredentialCreationOptionsJSON {
    rp: PublicKeyCredentialRpEntity
    user: PublicKeyCredentialUserEntityJSON
    challenge: Base64URLString
    pubKeyCredParams: PublicKeyCredentialParameters[]
    timeout?: number // unsigned long
    excludeCredentials?: PublicKeyCredentialDescriptorJSON[]
    authenticatorSelection?: AuthenticatorSelectionCriteria
    hints?: PublicKeyCredentialHints[]
    attestation?: AttestationConveyancePreference
    attestationFormats?: AuthenticatorAttestationStatementFormat[]
    extensions?: AuthenticatorExtensionsClientInputsJSON
  }

  interface PublicKeyCredentialRequestOptionsJSON {
    challenge: Base64URLString
    timeout?: number // unsigned long
    rpId?: string
    allowCredentials?: PublicKeyCredentialDescriptorJSON[]
    userVerification?: UserVerificationRequirement
    hints?: PublicKeyCredentialHints[]
    attestation?: AttestationConveyancePreference
    attestationFormats?: AuthenticatorAttestationStatementFormat[]
    extensions?: AuthenticatorExtensionsClientInputsJSON
  }

  interface PublicKeyCredentialDescriptorJSON {
    id: Base64URLString
    type: PublicKeyCredentialType
    transports?: AuthenticatorTransport[]
  }

  // Browsers are starting to support direct serialization to JSON with
  // WebAuthn Level 3. TS isn't yet aware of this.
  interface PublicKeyCredential {
    toJSON?: () => PublicKeyCredentialJSON
  }
  // Same for request extensions
  interface PublicKeyCredentialRequestOptions {
    hints?: PublicKeyCredentialHints[],
    attestation?: AttestationConveyancePreference
    attestationFormats?: AuthenticatorAttestationStatementFormat[]
  }
  // And responses
  interface AuthenticatorAssertionResponse {
    attestationObject: ArrayBuffer | null
  }


  interface AuthenticatorAssertionResponseJSON {
    clientDataJSON: Base64URLString
    authenticatorData: Base64URLString;
    signature: Base64URLString;
    userHandle?: Base64URLString;
    attestationObject?: Base64URLString;
  }

  // Wire formats
  interface RegistrationResponseJSON {
    id: Base64URLString
    rawId: Base64URLString
    response: AuthenticatorAttestationResponseJSON
    authenticatorAttachment?: AuthenticatorAttachment
    clientExtensionResults: AuthenticationExtensionsClientOutputsJSON
    type: PublicKeyCredentialType
  }
  interface AuthenticationResponseJSON {
    id: Base64URLString
    rawId: Base64URLString
    response: AuthenticatorAssertionResponseJSON
    authenticatorAttachment?: AuthenticatorAttachment
    clientExtensionResults: AuthenticationExtensionsClientOutputsJSON
    type: PublicKeyCredentialType
  }






  // These aren't official per se, but make the json wire formats clearer
  interface CredentialCreationOptionsJSON extends Omit<CredentialCreationOptions, "signal"> {
    publicKey: PublicKeyCredentialCreationOptionsJSON
  }
  interface CredentialRequestOptionsJSON extends Omit<CredentialRequestOptions, "signal"> {
    publicKey: PublicKeyCredentialRequestOptionsJSON
  }




}


export type Base64URLString = string

export type PublicKeyCredentialJSON = RegistrationResponseJSON | AuthenticationResponseJSON


export type AuthenticatorAttestationResponseJSON = {
  clientDataJSON: Base64URLString
  authenticatorData: Base64URLString;
  transports: AuthenciatorTransport[]
  // The publicKey field will be missing if pubKeyCredParams was used to
  // negotiate a public-key algorithm that the user agent doesn’t
  // understand. (See section “Easily accessing credential data” for a
  // list of which algorithms user agents must support.) If using such an
  // algorithm then the public key must be parsed directly from
  // attestationObject or authenticatorData.
  publicKey?: Base64URLString
  publicKeyAlgorithm: number // long long
  // This value contains copies of some of the fields above. See
  // section “Easily accessing credential data”.
  attestationObject: Base64URLString;
};

export type AuthenticationExtensionsClientOutputsJSON = {
}

export type PublicKeyCredentialUserEntityJSON = {
  id: Base64URLString
  name: string
  displayName: string
}
export type AuthenticatorExtensionsClientInputsJSON = {
}

// https://www.w3.org/TR/webauthn-3/#enumdef-publickeycredentialhints
type PublicKeyCredentialHints = 'security-key' | 'client-device' | 'hybrid'

// https://www.iana.org/assignments/webauthn/webauthn.xhtml
type AuthenticatorAttestationStatementFormat = 'packed' | 'tpm' | 'android-key' | 'android-safetynet' | 'fido-u2f' | 'apple' | 'none'
