/// <reference types="vite/client" />

import type { OpenGmsApi } from '../../shared/types'

declare global {
  interface Window {
    openGms: OpenGmsApi
  }
}

export {}
