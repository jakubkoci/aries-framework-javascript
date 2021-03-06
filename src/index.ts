// reflect-metadata used for class-transformer + class-validator
import 'reflect-metadata'

export { Agent } from './agent/Agent'
export { InitConfig, OutboundPackage, DidCommMimeType } from './types'
export { InjectionSymbols } from './constants'
export type { Wallet } from './wallet/Wallet'

export * from './transport'
export * from './modules/basic-messages'
export * from './modules/credentials'
export * from './modules/proofs'
export * from './modules/connections'
export * from './modules/ledger'
export * from './modules/routing'
export * from './utils/JsonTransformer'
export * from './logger'
export * from './error'
