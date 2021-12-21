import { CookieOptions, getCookie, setCookie } from '../../browser/cookie'
import * as utils from '../../tools/utils'
import { isExperimentalFeatureEnabled } from '../configuration/experimentalFeatures'
import { monitor } from '../internalMonitoring/internalMonitoring'
import { SessionState, SESSION_EXPIRATION_DELAY } from './sessionStore'

const SESSION_ENTRY_REGEXP = /^([a-z]+)=([a-z0-9-]+)$/
const SESSION_ENTRY_SEPARATOR = '&'

export const SESSION_COOKIE_NAME = '_dd_s'
const RETRY_DELAY = 1

type Operations = {
  options: CookieOptions
  process: (cookieSession: SessionState) => SessionState | undefined
  after?: (cookieSession: SessionState) => void
}

export function withCookieLockAccess(operations: Operations) {
  let currentLock: string
  let currentSession = retrieveSession()
  if (isExperimentalFeatureEnabled('cookie-lock')) {
    // if someone has lock, postpone
    if (currentSession.lock) {
      postpone(operations)
      return
    }
    // acquire lock
    currentLock = utils.generateUUID()
    currentSession.lock = currentLock
    setSession(currentSession, operations.options)
    // if lock is not acquired, postpone
    currentSession = retrieveSession()
    if (currentSession.lock !== currentLock) {
      postpone(operations)
      return
    }
  }
  let processedSession = operations.process(currentSession)
  if (isExperimentalFeatureEnabled('cookie-lock')) {
    // if lock corrupted after process, postpone
    currentSession = retrieveSession()
    if (currentSession.lock !== currentLock!) {
      postpone(operations)
      return
    }
  }
  if (processedSession) {
    persistSession(processedSession, operations.options)
  }
  if (isExperimentalFeatureEnabled('cookie-lock')) {
    if (!processedSession || !utils.isEmptyObject(processedSession)) {
      // if lock corrupted after persist, postpone
      currentSession = retrieveSession()
      if (currentSession.lock !== currentLock!) {
        postpone(operations)
        return
      }
      delete currentSession.lock
      setSession(currentSession, operations.options)
      processedSession = currentSession
    }
  }
  operations.after?.(processedSession || currentSession)
}

function postpone(operations: Operations) {
  setTimeout(
    monitor(() => {
      withCookieLockAccess(operations)
    }),
    RETRY_DELAY
  )
}

export function persistSession(session: SessionState, options: CookieOptions) {
  if (utils.isEmptyObject(session)) {
    clearSession(options)
    return
  }
  session.expire = String(Date.now() + SESSION_EXPIRATION_DELAY)
  setSession(session, options)
}

function setSession(session: SessionState, options: CookieOptions) {
  setCookie(SESSION_COOKIE_NAME, toSessionString(session), SESSION_EXPIRATION_DELAY, options)
}

export function toSessionString(session: SessionState) {
  return utils
    .objectEntries(session)
    .map(([key, value]) => `${key}=${value as string}`)
    .join(SESSION_ENTRY_SEPARATOR)
}

export function retrieveSession(): SessionState {
  const sessionString = getCookie(SESSION_COOKIE_NAME)
  const session: SessionState = {}
  if (isValidSessionString(sessionString)) {
    sessionString.split(SESSION_ENTRY_SEPARATOR).forEach((entry) => {
      const matches = SESSION_ENTRY_REGEXP.exec(entry)
      if (matches !== null) {
        const [, key, value] = matches
        session[key] = value
      }
    })
  }
  return session
}

function isValidSessionString(sessionString: string | undefined): sessionString is string {
  return (
    sessionString !== undefined &&
    (sessionString.indexOf(SESSION_ENTRY_SEPARATOR) !== -1 || SESSION_ENTRY_REGEXP.test(sessionString))
  )
}

function clearSession(options: CookieOptions) {
  setCookie(SESSION_COOKIE_NAME, '', 0, options)
}
