export interface BackgroundActions {
  getStore: void
  setStore: Partial<Store>
  flushEvents: void
  endSession: void
  getConfig: void
  configReceived: any
}

export interface PopupActions {
  newStore: Store
}

export interface Store {
  devServerStatus: 'unavailable' | 'checking' | 'available'
  useDevBundles: boolean
  useRumSlim: boolean
  logEventsFromRequests: boolean
  blockIntakeRequests: boolean
  config: any
}
