/**
 * Lightweight replacement for framer-motion
 * Provides the same API surface so existing imports continue to work
 * without loading the heavy framer-motion library
 */
'use client'

import { useEffect, useRef, useState, forwardRef, cloneElement, Children, type ReactNode, type HTMLAttributes } from 'react'

// ─── Hooks ──────────────────────────────────────────────────────────────

export function useInView(options?: { once?: boolean; amount?: number; margin?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting)
        if (entry.isIntersecting && options?.once) {
          observer.unobserve(el)
        }
      },
      { threshold: options?.amount ?? 0.1, rootMargin: options?.margin }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [options?.once, options?.amount])

  return { ref, inView: isInView }
}

// ─── Motion Components ──────────────────────────────────────────────────

type MotionProps = HTMLAttributes<HTMLDivElement> & {
  initial?: Record<string, number>
  animate?: Record<string, number>
  exit?: Record<string, number>
  whileHover?: Record<string, number>
  whileTap?: Record<string, number>
  whileInView?: Record<string, number>
  transition?: Record<string, unknown>
  viewport?: { once?: boolean; amount?: number }
  variants?: Record<string, Record<string, number>>
  layout?: boolean | string
  layoutId?: string
  children?: ReactNode
}

function getDirection(initial: Record<string, number> | undefined): string {
  if (!initial) return 'up'
  if (initial.y && initial.y > 0) return 'up'
  if (initial.y && initial.y < 0) return 'down'
  if (initial.x && initial.x > 0) return 'left'
  if (initial.x && initial.x < 0) return 'right'
  return 'none'
}

function getDelay(transition: Record<string, unknown> | undefined): number {
  if (!transition) return 0
  const d = transition.delay ?? 0
  return typeof d === 'number' ? d * 1000 : 0
}

function MotionDiv({
  initial, animate, exit, whileHover, whileTap, whileInView,
  transition, viewport, variants, layout, layoutId,
  children, className, style: userStyle, ...rest
}: MotionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Use IntersectionObserver for viewport-triggered animations
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const delay = getDelay(transition as Record<string, unknown> | undefined)
          setTimeout(() => setIsVisible(true), delay)
          if (viewport?.once !== false) {
            observer.unobserve(el)
          }
        }
      },
      { threshold: viewport?.amount ?? 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [viewport?.once, viewport?.amount])

  // Build the CSS transition style
  const direction = getDirection(initial)
  const hasScale = initial?.scale !== undefined
  const delay = getDelay(transition as Record<string, unknown> | undefined)

  const transforms: Record<string, string> = {
    up: 'translateY(20px)',
    down: 'translateY(-20px)',
    left: 'translateX(20px)',
    right: 'translateX(-20px)',
    none: 'none',
  }

  const hoverScale = whileHover?.scale ?? 1
  const duration = typeof (transition as Record<string, unknown>)?.duration === 'number'
    ? ((transition as Record<string, unknown>).duration as number) * 1000
    : 500

  const baseStyle: React.CSSProperties = {
    opacity: isVisible ? 1 : (initial?.opacity ?? 0),
    transform: isVisible
      ? (isHovered && hoverScale !== 1 ? `scale(${hoverScale})` : 'none')
      : (hasScale ? `scale(${initial?.scale ?? 0.95})` : transforms[direction]),
    transition: `opacity ${duration}ms ease-out ${delay}ms, transform ${duration}ms ease-out ${delay}ms`,
    ...userStyle,
  }

  return (
    <div
      ref={ref}
      className={className}
      style={baseStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...rest}
    >
      {children}
    </div>
  )
}

// Same for span, button, section, nav, p
function createMotionElement(tag: string) {
  return forwardRef<HTMLElement, MotionProps>(({
    initial, animate, exit, whileHover, whileTap, whileInView,
    transition, viewport, variants, layout, layoutId,
    children, className, style: userStyle, ...rest
  }, fwdRef) => {
    const localRef = useRef<HTMLElement>(null)
    const [isVisible, setIsVisible] = useState(false)
    const [isHovered, setIsHovered] = useState(false)

    useEffect(() => {
      const el = localRef.current
      if (!el) return
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            const delay = getDelay(transition as Record<string, unknown> | undefined)
            setTimeout(() => setIsVisible(true), delay)
            if (viewport?.once !== false) observer.unobserve(el)
          }
        },
        { threshold: viewport?.amount ?? 0.1 }
      )
      observer.observe(el)
      return () => observer.disconnect()
    }, [viewport?.once, viewport?.amount])

    const direction = getDirection(initial)
    const hasScale = initial?.scale !== undefined
    const delay = getDelay(transition as Record<string, unknown> | undefined)
    const transforms: Record<string, string> = {
      up: 'translateY(20px)', down: 'translateY(-20px)',
      left: 'translateX(20px)', right: 'translateX(-20px)', none: 'none',
    }
    const hoverScale = whileHover?.scale ?? 1
    const duration = typeof (transition as Record<string, unknown>)?.duration === 'number'
      ? ((transition as Record<string, unknown>).duration as number) * 1000 : 500

    const baseStyle: React.CSSProperties = {
      opacity: isVisible ? 1 : (initial?.opacity ?? 0),
      transform: isVisible
        ? (isHovered && hoverScale !== 1 ? `scale(${hoverScale})` : 'none')
        : (hasScale ? `scale(${initial?.scale ?? 0.95})` : transforms[direction]),
      transition: `opacity ${duration}ms ease-out ${delay}ms, transform ${duration}ms ease-out ${delay}ms`,
      ...userStyle as React.CSSProperties,
    }

    const Tag = tag as any
    return (
      <Tag
        ref={(el: HTMLElement) => {
          (localRef as any).current = el
          if (typeof fwdRef === 'function') fwdRef(el)
          else if (fwdRef) (fwdRef as any).current = el
        }}
        className={className}
        style={baseStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...rest}
      >
        {children}
      </Tag>
    )
  })
}

export const motion = {
  div: MotionDiv,
  span: createMotionElement('span'),
  button: createMotionElement('button'),
  section: createMotionElement('section'),
  nav: createMotionElement('nav'),
  p: createMotionElement('p'),
  header: createMotionElement('header'),
  footer: createMotionElement('footer'),
  aside: createMotionElement('aside'),
  main: createMotionElement('main'),
  ul: createMotionElement('ul'),
  li: createMotionElement('li'),
  a: createMotionElement('a'),
}

// ─── AnimatePresence ─────────────────────────────────────────────────────

export function AnimatePresence({ children, mode }: { children: ReactNode; mode?: string }) {
  return <>{children}</>
}

// ─── Re-export commonly used types ──────────────────────────────────────

export type { MotionProps }
