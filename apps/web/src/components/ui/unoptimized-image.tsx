import Image, { type ImageProps } from 'next/image'

type UnoptimizedImageProps = Omit<ImageProps, 'loader'>

/**
 * `next/image` with optimization disabled, for remote hosts we serve as-is
 * (Amazon product art, R2 uploads).
 *
 * It deliberately does NOT pass a `loader`. A loader is a function, and
 * `next/image` is a Client Component: passing one from a Server Component
 * crashes the render with "Functions cannot be passed directly to Client
 * Components". `unoptimized` already bypasses the optimizer and serves `src`
 * untouched, so the loader was redundant on top of being unserializable.
 */
export const UnoptimizedImage = (props: UnoptimizedImageProps) => {
  return <Image {...props} unoptimized />
}
