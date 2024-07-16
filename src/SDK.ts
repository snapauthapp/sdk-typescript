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
  | 'webauthn_unavailable'
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
  private abortSignals: AbortController[] = []

  constructor(publicKey: string, host: string = 'https://api.snapauth.app') {
    this.apiKey = publicKey
    this.host = host
  }

  get isWebAuthnAvailable() {
    return !!window.PublicKeyCredential
  }

  async isConditionalCreateAvailable(): Promise<boolean> {
    if (!window.PublicKeyCredential) {
      return false
    }
    // Modern/upcoming API
    if (window.PublicKeyCredential.getClientCapabilities) {
      const cc = await window.PublicKeyCredential.getClientCapabilities()
      // Cast unexpected undefines to false
      return cc.conditionalCreate === true
    }
    return false
  }

  async isConditionalGetAvailable(): Promise<boolean> {
    if (!window.PublicKeyCredential) {
      return false
    }
    // Modern/upcoming API
    if (window.PublicKeyCredential.getClientCapabilities) {
      // TODO: spec says `conditionalGet`; Safari (only browser so far with
      // this API at all) has `conditionalMediation`
      // https://bugs.webkit.org/show_bug.cgi?id=275765
      const cc = await window.PublicKeyCredential.getClientCapabilities()
      if (cc.conditionalGet !== undefined) {
        return cc.conditionalGet
      }
    }
    // More common (legacy?) API
    if (window.PublicKeyCredential.isConditionalMediationAvailable) {
      return await window.PublicKeyCredential.isConditionalMediationAvailable()
    }
    return false
  }

  async startAuth(user: UserAuthenticationInfo): Promise<AuthResponse> {
    if (!this.isWebAuthnAvailable) {
      return { ok: false, error: 'webauthn_unavailable' }
    }
    const res = await this.api('/auth/createOptions', { user }) as Result<CredentialRequestOptionsJSON, WebAuthnError>
    if (!res.ok) {
      return res
    }
    const options = parseRequestOptions(res.data)
    return await this.doAuth(options, user)
  }

  async startRegister(user: UserRegistrationInfo): Promise<RegisterResponse> {
    if (!this.isWebAuthnAvailable) {
      return { ok: false, error: 'webauthn_unavailable' }
    }
    // If you do this inside the try/catch it seems to fail. Some sort of race
    // condition w/ the other request being canceled AFAICT. Doesn't make total
    // sense to me and may be a browser specific issue.
    const signal = this.cancelExistingRequests()
    try {
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
      options.signal = signal

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

  // TODO: name better
  async handleAutomaticRegistration(user: UserRegistrationInfo, callback: (arg0: RegisterResponse) => void) {
    if (!(await this.isConditionalCreateAvailable())) {
      return false
    }
    // TODO: try/catch everywhere
    const res = await this.api('/registration/createOptions', { upgrade: true }) as Result<CredentialCreationOptionsJSON, WebAuthnError>
    if (!res.ok) {
      // Optimistic request failed, do nothing
      return
    }

    const signal = this.cancelExistingRequests()
    const options = parseCreateOptions(user, res.data)
    options.signal = signal

    const credential = await navigator.credentials.create(options)
    this.mustBePublicKeyCredential(credential)
    const json = registrationResponseToJSON(credential)
    // @ts-ignore
    const response = await this.api('/registration/process', { credential: json, user }) as RegisterResponse
    callback(response)
  }

  async handleAutofill(callback: (arg0: AuthResponse) => void) {
    if (!(await this.isConditionalGetAvailable())) {
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
      // User aborted conditional mediation (UI doesn't even exist in all
      // browsers). Do not run the callback.
    }
  }

  private async doAuth(options: CredentialRequestOptions, user: UserIdOrHandle|undefined): Promise<AuthResponse> {
    const signal = this.cancelExistingRequests()
    try {
      options.signal = signal
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

  /**
   * This is primarily to deal with inconsistent browser behavior around
   * conditional mediation. Safari (and FF?) permit having a CM request pending
   * while starting a new modal request. If you try to do the same in Chrome,
   * it errors out indicating that another request is running.
   *
   * So now this will try to cancel any pending request when a new one starts.
   */
  private cancelExistingRequests(): AbortSignal {
    this.abortSignals.forEach(signal => {
      signal.abort('Starting new request')
    })
    const ac = new AbortController()
    this.abortSignals = [ac]
    return ac.signal
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

export default SDK
