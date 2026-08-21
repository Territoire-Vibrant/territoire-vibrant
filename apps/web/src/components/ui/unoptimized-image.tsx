import Image, { type ImageLoader, type ImageProps } from 'next/image'

const passthroughLoader: ImageLoader = ({ src }) => src

type UnoptimizedImageProps = Omit<ImageProps, 'loader'>

export const UnoptimizedImage = (props: UnoptimizedImageProps) => {
  return <Image {...props} loader={passthroughLoader} unoptimized />
}
