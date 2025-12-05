import { StartClient } from '@tanstack/solid-start/client'
import { hydrate } from 'solid-js/web'
import { getRouter } from './router'

const router = getRouter()

hydrate(() => <StartClient router={router} />, document)
