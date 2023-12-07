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
// success:true, token: string
// success:false, error: info?
type Result<T, E> =
  | { ok: true, data: T }
  | { ok: false, error: E, more?: unknown }

type WebAuthnError =
  | 'network_failed' // timeouts?
  | 'bad_request'
  | 'server_error'
  | 'canceled_by_user'
  // Other = 'other',
  | 'tbd'

export type AuthResponse = Result<{ token: string }, WebAuthnError>
export type RegisterResponse = Result<{ token: string }, WebAuthnError>

type UserIdOrHandle =
  | { id: string }
  | { handle: string }
type OptionalUserIdOrHandle = UserIdOrHandle | undefined

type UserRegistrationInfo = {
  name: string
  displayName?: string
} & UserIdOrHandle

class SDK {
  private apiKey: string
  private host: string

  constructor(publicKey: string, host: string = 'https://api.webauthn.biz') {
    this.apiKey = publicKey
    this.host = host
    // this.host = 'http://localhost:456'

  }

  get isWebAuthnAvailable() {
    return !!window.PublicKeyCredential
  }

  private requireWebAuthn() {
    // if (!this.isWebAuthnAvailable) {
    //   throw new Error
    // }
  }

  async startAuth(user: UserIdOrHandle): Promise<AuthResponse> {
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
      const res = await this.api('/registration/createOptions', { user }) as Result<CredentialCreationOptionsJSON, WebAuthnError>
      if (!res.ok) {
        return res
      }
      const options = parseCreateOptions(res.data)
      console.debug(options)
      const credential = await navigator.credentials.create(options)
      console.debug(credential)
      if (!this.isPublicKeyCredential(credential)) {
        throw new Error('wat')
      }
      const json = registrationResponseToJSON(credential)
      console.debug(json)
      // const cer = credential.getClientExtensionResults && credential.getClientExtensionResults()
      // console.debug(cer)
      //user.handle = this._toBase64Url(res.publicKey.user.id)

      // @ts-ignore
      const response = await this.api('/registration/process', { credential: json, user }) as RegisterResponse
      return response
    } catch (error) {
      console.error(error)
      return {
        ok: false,
        error: 'tbd',
        // @ts-ignore
        more: [error.name, error.message],
      }
    }
  }

  async handleAutofill(callback: (arg0: AuthResponse) => void) {
    if (!PublicKeyCredential.isConditionalMediationAvailable) {
      console.debug('CMA feature does not exist')
      return false
    }
    const isCMA = await PublicKeyCredential.isConditionalMediationAvailable()
    if (!isCMA) {
      console.debug('!CMA')
      return false
    }

    // available, let's gooo
    // try/catch?
    // const token = await this.startAuth(user)
    // merge w/ startAith?
    const res = await this.api('/auth/createOptions', {}) as Result<CredentialRequestOptionsJSON, WebAuthnError>
    if (!res.ok) {
      // FIXME: not this?
      return
    }
    const options = parseRequestOptions(res.data)
    const response = await this.doAuth(options, undefined)
    callback(response)
  }



  private async doAuth(options: CredentialRequestOptions, user: UserIdOrHandle|undefined): Promise<AuthResponse> {
    console.debug(options)
    try {
      const result = await navigator.credentials.get(options)
      if (!this.isPublicKeyCredential(result)) throw new Error('wat')
      console.debug(result)
      return await this.processGetCredential(result, user)
    } catch (error) {
      // welp, problem. ok. what's the error handling story here?
      console.error(error)
      // NotAllowedError = canceled by user OR webauthn timeout exceeded
      // Safari:
      // error.message = "This request has been cancelled by the user."
      // ^ "Operation timed out."
      // Firefox: "The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission."
      return {
        ok: false,
        error: 'tbd',
        // @ts-ignore
        more: [error.name, error.message],
      }
    }
  }

  private async processGetCredential(credential: PublicKeyCredential, user: OptionalUserIdOrHandle): Promise<AuthResponse> {
    const json = authenticationResponseToJSON(credential)
    console.debug(json)
    // user info of some kind needed for credential lookup when user handle is not present.
    // technically the remote server could look up by credential id, but that's a bad idea.

    // @ts-ignore
    const response = await this.api('/auth/process', { credential: json, user })

    return response
  }

  private async api(path: string, body: JsonEncodable): Promise<Result<any, WebAuthnError>> {
    const headers = new Headers({
      Accept: 'application/json',
      'Content-type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    })

    const request = new Request(this.host + path, {
      body: JSON.stringify(body),
      headers,
      method: 'POST',
      signal: AbortSignal.timeout(500),
    })
    // TODO: timeouts?
    try {
      const response = await fetch(request)
      if (!response.ok) {
        return {
          ok: false,
          error: (response.status >= 500 ? 'server_error' : 'bad_request'),
          more: [response.status, response.statusText],
        }
      }
      return { ok: true, data: await response.json() }
    } catch (error) {
      // error.name, error.message, cause
      // TypeError, "Failed to fetch", bad destination edge
      // TypeError, "Load failed", bad destination safar
      // AbortError, "Fetch is aborted", timeout safari
      // AbortError, "The user aborted a request", timeout edge
      // TimeoutError,, "The operation timed out.", timeout FF
      return {
        ok: false,
        error: 'network_failed',
        more: {
        // @ts-ignore
          name: error.name,
        // @ts-ignore
          message: error.message,
          te: error instanceof TypeError,
          ue: error instanceof URIError,
        },
      }
    }
  }

  /**
   * @internal - type refinement tool
   */
  private isPublicKeyCredential(credential: Credential|null): credential is PublicKeyCredential {
    return credential?.type === 'public-key'
  }

}

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
