const STORAGE_KEY = 'weaver.deviceId'

/**
 * Stable per-browser id used to scope saved canvases.
 *
 * There is no sign-in: saves are grouped under a random id kept in
 * localStorage so different browsers don't see each other's canvases. It is
 * not a security boundary — anyone who knows the id can read or write it.
 */
export function getDeviceId(): string {
  let id = localStorage.getItem(STORAGE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, id)
  }
  return id
}
