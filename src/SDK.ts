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
type AuthResponse = string
type RegisterResponse = string

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

  constructor(publicKey: string) {
    this.apiKey = publicKey
    this.host = 'http://localhost:9987'
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
    const res = await this.api('/auth/createOptions', { user })
    const options = parseRequestOptions(res)
    return await this.doAuth(options, user)
  }

  async startRegister(user: UserRegistrationInfo): Promise<RegisterResponse> {
    this.requireWebAuthn()
    const res = await this.api('/registration/createOptions', { user })
    const options = parseCreateOptions(res)
    console.debug(options)
    const credential = await navigator.credentials.create(options)
    console.debug(credential)
    if (!this.isPublicKeyCredential(credential)) {
      throw new Error('wat')
    }
    const json = registrationResponseToJSON(credential)
    // const cer = credential.getClientExtensionResults && credential.getClientExtensionResults()
    // console.debug(cer)
    //user.handle = this._toBase64Url(res.publicKey.user.id)

    // @ts-ignore
    return this.api('/registration/process', { credential: json, user })
  }

  async handleAutofill(callback: (arg0: AuthResponse) => void) {
    if (!PublicKeyCredential.isConditionalMediationAvailable) {
      return false
    }
    const isCMA = await PublicKeyCredential.isConditionalMediationAvailable()
    if (!isCMA) {
      return false
    }

    console.debug('cma not done yet')
    return true
    // available, let's gooo
    const user = undefined // empty object instead?
    // try/catch?
    // const token = await this.startAuth(user)
    // merge w/ startAith?
    const res = await this.api('/auth/createOptions', undefined)
    const options = parseRequestOptions(res)
    const response = await this.doAuth(options, undefined)
    callback(response)
  }



  private async doAuth(options: CredentialRequestOptions, user: UserIdOrHandle|undefined) {
    console.debug(options)
    try {
      const result = await navigator.credentials.get(options)
      if (!result || !this.isPublicKeyCredential(result)) throw new Error('wat')
      console.debug(result)
      return await this.processGetCredential(result, user)
    } catch (error) {
      // welp, problem. ok. what's the error handling story here?
      console.error(error)
    }
  }

  private async processGetCredential(credential: PublicKeyCredential, user: OptionalUserIdOrHandle) {
    const json = authenticationResponseToJSON(credential)
    // user info of some kind needed for credential lookup when user handle is not present.
    // technically the remote server could look up by credential id, but that's a bad idea.

    // @ts-ignore
    return this.api('/auth/process', { credential: json, user })
  }

  private async api(path: string, body: JsonEncodable) {
    const headers = new Headers({
      Accept: 'application/json',
      'Content-type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    })

    const request = new Request(this.host + path, {
      body: JSON.stringify(body),
      headers,
      method: 'POST',
    })
    // todo: timeouts?
    const response = await fetch(request)
    if (!response.ok) {
      console.error(request, response)
      return // return WHAT?
    }
    // switch on status codes etc
    // expect json
    const parsedResponse = await response.json()
    // format wrapping?
    return parsedResponse

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
