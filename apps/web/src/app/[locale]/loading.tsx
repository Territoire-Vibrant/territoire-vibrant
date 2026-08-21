import { CircleNotchIcon } from '@phosphor-icons/react/dist/ssr'

export default function Loading() {
  return (
    <div className='fixed inset-0 flex items-center justify-center'>
      <CircleNotchIcon className='animate-spin text-[10vh] text-primary' />
    </div>
  )
}
