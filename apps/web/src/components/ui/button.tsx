import { CircleNotchIcon } from '@phosphor-icons/react/dist/ssr'
import { Slot } from '@radix-ui/react-slot'
import type { VariantProps } from 'class-variance-authority'
import React from 'react'

import { cn } from '~/lib/utils'
import { buttonVariants } from './button-variants'

function Button({
  className,
  variant,
  size,
  asChild = false,
  isLoading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    isLoading?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'
  const isDisabled = disabled || isLoading

  // When asChild=true, Slot expects a single React element (not an array).
  // React.Children.map always returns an array, which makes Slot silently render nothing.
  // So skip the mapping entirely when asChild is true.
  const renderedChildren = asChild
    ? children
    : React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) {
          return child
        }

        // Preserve non-icon children when loading; replace icons with spinner
        if (!isLoading || typeof child.type === 'string') {
          return child
        }

        return <CircleNotchIcon className='size-4 animate-spin' aria-hidden='true' />
      })

  return (
    <Comp
      data-slot='button'
      className={cn(buttonVariants({ variant, size, className }), isLoading && 'cursor-wait')}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      {...props}
    >
      {isLoading && Array.isArray(renderedChildren) && renderedChildren.length === 0 ? (
        <CircleNotchIcon className='size-4 animate-spin' aria-hidden='true' />
      ) : (
        renderedChildren
      )}
    </Comp>
  )
}

export { Button }
