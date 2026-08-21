import Image, { type StaticImageData } from 'next/image'

import PlaceholderImage from '~/assets/images/placeholder.png'

type TeamCardProps = {
  name: string
  position: string
  bio: string
  image?: StaticImageData | string
}

export const TeamCard = ({ name, position, bio, image }: TeamCardProps) => {
  return (
    <div className='group flex h-[400px] select-none flex-col rounded-xl border bg-background shadow-sm transition-[transform,box-shadow] ease-out hover:-translate-y-2'>
      <div className='px-6 pt-6'>
        <Image src={image ?? PlaceholderImage} alt={name} className='aspect-4/3 w-full object-cover' />
      </div>

      <div className='h-full rounded-b-xl bg-tertiary px-6 pt-6 transition-colors ease-out group-hover:bg-primary'>
        <h3 className='font-semibold text-lg text-neutral-900 transition-colors ease-out group-hover:text-background'>
          {name}
        </h3>

        <p className='font-medium text-neutral-600 text-sm italic transition-colors ease-out group-hover:text-background'>
          {position}
        </p>

        <p className='mt-2 text-neutral-700 text-sm leading-relaxed transition-colors ease-out group-hover:text-background'>
          {bio}
        </p>
      </div>
    </div>
  )
}
