// This constant is set by webpack during the build process
declare var VERSION: string

import {
  base64URLToArrayBuffer,
  arrayBufferToBase64URL,
} from './utils'

import {
  authenticationResponseToJSON,
  registrationResponseToJSON,
} from './toJSON'

import {
  parseCreateOptions,
  parseRequestOptions,
} from './fromJSON'

/**
 * API formats
 */
type Result<T, E> =
  | { ok: true, data: T }
  | { ok: false, error: E, more?: unknown }

type WebAuthnError =
  | 'timeout'
  | 'network_error'
  | 'bad_request'
  | 'server_error'
  | 'canceled_by_user'
  | 'invalid_domain'
  | 'browser_bug?'
  | 'unexpected'

export type AuthResponse = Result<{ token: string }, WebAuthnError>
export type RegisterResponse = Result<{ token: string }, WebAuthnError>

type UserIdOrHandle =
  | { id: string }
  | { handle: string }
type OptionalUserIdOrHandle = UserIdOrHandle | undefined

export type UserAuthenticationInfo = UserIdOrHandle
export type UserRegistrationInfo = {
  name: string
  displayName?: string
  id?: string
  handle?: string
}

class SDK {
  private apiKey: string
  private host: string
  // private abortController: AbortController
  private abortController: AbortController|null = null

  constructor(publicKey: string, host: string = 'https://api.snapauth.app') {
    this.apiKey = publicKey
    this.host = host
    // this.abortController = new AbortController()
  }

  get isWebAuthnAvailable() {
    return !!window.PublicKeyCredential
  }

  private requireWebAuthn() {
    // if (!this.isWebAuthnAvailable) {
    //   throw new Error
    // }
  }

  async startAuth(user: UserAuthenticationInfo): Promise<AuthResponse> {
    this.requireWebAuthn()
    const res = await this.api('/auth/createOptions', { user }) as Result<CredentialRequestOptionsJSON, WebAuthnError>
    if (!res.ok) {
      return res
    }
    const options = parseRequestOptions(res.data)
    return await this.doAuth(options, user)
  }

  async startRegister(user: UserRegistrationInfo): Promise<RegisterResponse> {
    try {
      this.requireWebAuthn()
      // If user info provided, send only the id or handle. Do NOT send name or
      // displayName.
      let remoteUserData: UserIdOrHandle | undefined
      if (user.id || user.handle) {
        remoteUserData = {
          id: user.id,
          // @ts-ignore figure this type hack out later
          handle: user.handle,
        }
      }

      const res = await this.api('/registration/createOptions', { user: remoteUserData }) as Result<CredentialCreationOptionsJSON, WebAuthnError>
      if (!res.ok) {
        return res
      }
      const options = parseCreateOptions(user, res.data)

      const credential = await navigator.credentials.create(options)
      this.mustBePublicKeyCredential(credential)
      const json = registrationResponseToJSON(credential)

      // @ts-ignore
      const response = await this.api('/registration/process', { credential: json, user }) as RegisterResponse
      return response
    } catch (error) {
      return error instanceof Error ? this.convertCredentialsError(error) : this.genericError(error)
    }
  }

  async handleAutofill(callback: (arg0: AuthResponse) => void) {
    console.debug('handle autofill starated')
    if (!PublicKeyCredential.isConditionalMediationAvailable) {
      return false
    }
    const isCMA = await PublicKeyCredential.isConditionalMediationAvailable()
    if (!isCMA) {
      return false
    }

    // TODO: warn if no <input autocomplete="webauthn"> is found?

    // Autofill API is available. Make the calls and set it up.
    const res = await this.api('/auth/createOptions', {}) as Result<CredentialRequestOptionsJSON, WebAuthnError>
    if (!res.ok) {
      // This results in a silent failure. Intetional but subject to change.
      return
    }
    const options = parseRequestOptions(res.data)
    const response = await this.doAuth(options, undefined)
    if (response.ok) {
      callback(response)
    } else {
      console.error('HAF nope', response)
      // User aborted conditional mediation (UI doesn't even exist in all
      // browsers). Do not run the callback.
    }
  }

  private async doAuth(options: CredentialRequestOptions, user: UserIdOrHandle|undefined): Promise<AuthResponse> {
    if (this.abortController) {
      this.abortController.abort('Another request is starting')
      this.abortController = null
    }
    this.abortController = new AbortController()
    options.signal = this.abortController.signal
    console.debug('init AC')
    try {
      const credential = await navigator.credentials.get(options)
      this.mustBePublicKeyCredential(credential)
      const json = authenticationResponseToJSON(credential)
      // @ts-ignore
      return await this.api('/auth/process', {
        credential: json,
        user,
      })
    } catch (error) {
      return error instanceof Error ? this.convertCredentialsError(error) : this.genericError(error)
    }
  }

  private async api(path: string, body: JsonEncodable): Promise<Result<any, WebAuthnError>> {
    const headers = new Headers({
      Accept: 'application/json',
      'Content-type': 'application/json',
      Authorization: `Basic ${btoa(this.apiKey + ':')}`,
      'X-SDK': `js/${VERSION}`,
    })

    const request = new Request(this.host + path, {
      body: JSON.stringify(body),
      headers,
      method: 'POST',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })
    try {
      const response = await fetch(request)
      if (!response.ok) {
        return {
          ok: false,
          error: (response.status >= 500 ? 'server_error' : 'bad_request'),
          more: [response.status, response.statusText],
        }
      }
      const parsed = await response.json()
      return { ok: true, data: parsed.result }
    } catch (error) {
      return error instanceof Error ? this.convertNetworkError(error) : this.genericError(error)
    }
  }

  /**
   * @internal - type refinement tool
   */
  private mustBePublicKeyCredential(credential: Credential|null): asserts credential is PublicKeyCredential {
    if (credential === null) {
      throw new TypeError('Not a credential')
    } else if (credential.type !== 'public-key') {
      throw new TypeError('Unexpected credential type ' + credential.type)
    }
  }

  private genericError<T>(error: unknown): Result<T, WebAuthnError> {
    return { ok: false, error: 'unexpected', more: error }
  }

  private convertCredentialsError<T>(error: Error): Result<T, WebAuthnError> {
    // rpId mismatch (maybe others?)
    if (error.name === 'SecurityError') {
      return formatError('invalid_domain', error)
    }
    if (error.name === 'AbortError' || error.name === 'NotAllowedError') {
      // Either cancel or timeout. There's no reliable way to know which right
      // now, it's super stringy.
      return formatError('canceled_by_user', error)
    }
    // Failed mustBePublicKeyCredential (most likely)
    if (error.name === 'TypeError') {
      return formatError('browser_bug?', error)
    }
    console.error('Unhandled error type converting credentials', error)
    return formatError('unexpected', error)
  }

  private convertNetworkError<T>(error: Error): Result<T, WebAuthnError> {
    // Handle known timeout formats
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return formatError('timeout', error)
    }
    // Fall back to a generic network error. This tends to be stuff like
    // unresolvable hosts, etc. Log this one as it's pretty weird.
    console.error('Non-timeout network error', error)
    return formatError('network_error', error)
  }

}

const formatError = <T>(error: WebAuthnError, obj: Error): Result<T, WebAuthnError> => ({
  ok: false,
  error,
  more: {
    raw: obj,
    name: obj.name,
    message: obj.message,
  }
})

// type DictOf<T> = {[key: string]: T}
type JsonEncodable =
  | string
  | number
  | boolean
  | null
  | undefined
  | { [key: string]: JsonEncodable }
  | JsonEncodable[]

export default SDK
