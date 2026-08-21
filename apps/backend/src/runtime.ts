import { Layer, ManagedRuntime } from 'effect'

/**
 * Shared memo map so layers are built once per isolate rather than once per
 * runtime construction.
 */
const appMemoMap = Layer.makeMemoMapUnsafe()

export const makeAppRuntime = <R, ER>(layer: Layer.Layer<R, ER, never>) =>
  ManagedRuntime.make(layer, { memoMap: appMemoMap })
