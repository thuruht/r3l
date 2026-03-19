/**
 * Animation Utilities
 * Helper functions for managing animations across the application
 */

import gsap from 'gsap';

/**
 * CSS-based animations (preferred for simple transitions)
 */
export const CSSAnimations = {
  /**
   * Fade in an element
   */
  fadeIn: (element: HTMLElement | null) => {
    if (!element) return;
    element.classList.remove('anim-fade-out');
    element.classList.add('anim-fade-in');
  },

  /**
   * Fade out an element
   */
  fadeOut: (element: HTMLElement | null) => {
    if (!element) return;
    element.classList.remove('anim-fade-in');
    element.classList.add('anim-fade-out');
  },

  /**
   * Slide in from above
   */
  slideUp: (element: HTMLElement | null) => {
    if (!element) return;
    element.classList.add('anim-slide-up');
  },

  /**
   * Slide in from below
   */
  slideDown: (element: HTMLElement | null) => {
    if (!element) return;
    element.classList.add('anim-slide-down');
  },

  /**
   * Scale in animation
   */
  scaleIn: (element: HTMLElement | null) => {
    if (!element) return;
    element.classList.add('anim-scale-in');
  },

  /**
   * Pulse animation
   */
  pulse: (element: HTMLElement | null) => {
    if (!element) return;
    element.classList.add('anim-pulse');
  },

  /**
   * Remove all animation classes
   */
  clear: (element: HTMLElement | null) => {
    if (!element) return;
    const animClasses = Array.from(element.classList).filter((cls) =>
      cls.startsWith('anim-')
    );
    animClasses.forEach((cls) => element.classList.remove(cls));
  },
};

/**
 * GSAP animations (for complex sequences and timing control)
 */
export const GSAPAnimations = {
  /**
   * Animate element entry with GSAP
   */
  animateIn: (element: HTMLElement | null, duration = 0.4) => {
    if (!element) return;
    return gsap.from(element, {
      duration,
      opacity: 0,
      scale: 0.95,
      ease: 'power2.out',
    });
  },

  /**
   * Animate element exit
   */
  animateOut: (element: HTMLElement | null, duration = 0.3) => {
    if (!element) return;
    return gsap.to(element, {
      duration,
      opacity: 0,
      scale: 0.95,
      ease: 'power2.in',
    });
  },

  /**
   * Stagger animation for lists
   */
  staggerIn: (elements: HTMLElement[] | NodeListOf<Element>, duration = 0.5) => {
    return gsap.from(elements, {
      duration,
      opacity: 0,
      y: 20,
      stagger: 0.1,
      ease: 'power2.out',
    });
  },

  /**
   * Pulse animation with GSAP
   */
  pulse: (element: HTMLElement | null, scale = 1.1, duration = 0.6) => {
    if (!element) return;
    return gsap.to(element, {
      duration,
      scale,
      ease: 'power1.inOut',
      yoyo: true,
      repeat: -1,
    });
  },

  /**
   * Shake animation for errors
   */
  shake: (element: HTMLElement | null, duration = 0.5) => {
    if (!element) return;
    return gsap.to(element, {
      duration,
      x: 10,
      ease: 'power1.inOut',
      yoyo: true,
      repeat: 5,
    });
  },
};

/**
 * D3 Animation helpers (for graph visualizations)
 */
export const D3Animations = {
  /**
   * Standard transition duration in milliseconds
   */
  FAST: 150,
  BASE: 250,
  SLOW: 350,

  /**
   * Get transition duration based on category
   */
  getDuration: (speed: 'fast' | 'base' | 'slow' = 'base') => {
    const durations = {
      fast: 150,
      base: 250,
      slow: 350,
    };
    return durations[speed];
  },

  /**
   * Common easing functions for D3 (string names for use with d3.ease)
   */
  easing: {
    linear: 'linear',
    quadIn: 'quadIn',
    quadOut: 'quadOut',
    quadInOut: 'quadInOut',
    cubicIn: 'cubicIn',
    cubicOut: 'cubicOut',
    cubicInOut: 'cubicInOut',
    sine: 'sineInOut',
    elastic: 'elasticOut',
  },
};

/**
 * Combined animation helper
 * Prefers CSS for simple animations, falls back to GSAP for complex ones
 */
export const animate = {
  /**
   * Animate element appearance (prefers CSS)
   */
  in: (element: HTMLElement | null, type: 'fade' | 'slide' | 'scale' = 'fade') => {
    if (!element) return;
    switch (type) {
      case 'fade':
        CSSAnimations.fadeIn(element);
        break;
      case 'slide':
        CSSAnimations.slideUp(element);
        break;
      case 'scale':
        CSSAnimations.scaleIn(element);
        break;
    }
  },

  /**
   * Animate element removal
   */
  out: (element: HTMLElement | null) => {
    if (!element) return;
    CSSAnimations.fadeOut(element);
  },

  /**
   * Pulse effect (for attention)
   */
  attention: (element: HTMLElement | null, useGSAP = false) => {
    if (!element) return;
    if (useGSAP) {
      return GSAPAnimations.pulse(element);
    }
    CSSAnimations.pulse(element);
  },
};
