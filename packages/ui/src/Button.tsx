import { createEffect, createSignal, onMount, Show } from 'solid-js';
import { cva } from './lib/cva';

// Button variant configuration
const buttonVariants = {
  variants: {
    variant: {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-2 focus:ring-ring focus:ring-offset-2',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-2 focus:ring-ring focus:ring-offset-2',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-2 focus:ring-ring focus:ring-offset-2',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2',
      ghost: 'hover:bg-accent hover:text-accent-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2',
      link: 'text-primary underline-offset-4 hover:underline focus:ring-2 focus:ring-ring focus:ring-offset-2',
    },
    size: {
      sm: 'h-8 px-3 text-xs',
      md: 'h-9 px-4 py-2 text-sm',
      lg: 'h-10 px-8 py-2 text-base',
      xl: 'h-11 px-10 py-3 text-lg',
    },
    state: {
      default: '',
      loading: 'opacity-70 cursor-not-allowed',
      disabled: 'opacity-50 cursor-not-allowed pointer-events-none',
      focused: 'ring-2 ring-ring ring-offset-2',
      active: 'scale-[0.98]',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
    state: 'default',
  },
};

export interface ButtonProps {
  children: unknown;
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  state?: 'default' | 'loading' | 'disabled' | 'focused' | 'active';
  disabled?: boolean;
  loading?: boolean;
  class?: string;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  ref?: HTMLButtonElement;
}

export const Button = (props: ButtonProps) => {
  const [isLoading, setIsLoading] = createSignal(props.loading ?? false);

  // Create enhanced props for CVA
  const enhancedProps = () => ({
    ...props,
    variant: props.variant,
    size: props.size,
    state: props.disabled ? 'disabled' : isLoading() ? 'loading' : props.state,
    class: props.class,
    disabled: props.disabled ?? isLoading(),
  });

  // Handle focus events
  const handleFocus = () => {
    props.onFocus?.();
  };

  const handleBlur = () => {
    props.onBlur?.();
  };

  // Handle mouse events
  const handleMouseEnter = () => {
    props.onMouseEnter?.();
  };

  const handleMouseLeave = () => {
    props.onMouseLeave?.();
  };

  const handleMouseDown = () => {
    // Mouse down handling
  };

  const handleMouseUp = () => {
    // Mouse up handling
  };

  // Handle keyboard events
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (props.onClick) {
        props.onClick();
      }
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
    }
  };

  // Loading animation setup
  onMount(() => {
    if (props.loading) {
      setIsLoading(true);
    }
  });

  createEffect(() => {
    setIsLoading(props.loading ?? false);
  });

  // Generate CVA classes
  const buttonClasses = cva(buttonVariants)(enhancedProps());

  return (
    <button
      class={buttonClasses}
      type={props.type ?? 'button'}
      disabled={props.disabled ?? isLoading()}
      ref={props.ref}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      {...(props.onClick && !props.disabled && !isLoading() ? { onClick: props.onClick } : {})}
    >
      <ShowButtonContent loading={isLoading()} disabled={props.disabled}>
        {props.children}
      </ShowButtonContent>
    </button>
  );
};

// Content component for conditional rendering
interface ButtonContentProps {
  loading?: boolean;
  disabled?: boolean;
  children: unknown;
}

function ShowButtonContent(props: ButtonContentProps) {
  return (
    <Show
      when={props.loading}
      fallback={
        <Show
          when={props.disabled}
          fallback={<>{props.children as any}</>}
        >
          <span class="inline-flex items-center">
            {props.children as any}
          </span>
        </Show>
      }
    >
      <div class="flex items-center gap-2">
        <svg
          class="h-4 w-4 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 00-15.357-2m15.357 2H15"
          />
        </svg>
        <span class="sr-only">Loading</span>
      </div>
    </Show>
  );
}

export default Button;

// Export types for external use
export type { CompoundVariant, VariantConfig, VariantProps } from './lib/cva';

