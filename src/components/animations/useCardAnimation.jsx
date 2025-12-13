import { useEffect, useRef } from 'react';
import anime from 'animejs';

/**
 * Hook לאנימציית כרטיסים בכניסה
 * @param {Object} options - אפשרויות האנימציה
 * @returns {Object} ref להצמדה לאלמנט
 */
export function useCardAnimation(options = {}) {
  const elementRef = useRef(null);

  useEffect(() => {
    if (elementRef.current) {
      anime({
        targets: elementRef.current,
        translateY: options.translateY || [20, 0],
        opacity: [0, 1],
        duration: options.duration || 800,
        delay: options.delay || 0,
        easing: options.easing || 'easeOutExpo'
      });
    }
  }, []);

  return elementRef;
}

/**
 * Hook לאנימציית רשימה עם stagger
 * @param {Object} options - אפשרויות האנימציה
 * @returns {Object} ref להצמדה לאלמנט המכיל
 */
export function useListAnimation(options = {}) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      const children = containerRef.current.children;
      
      anime({
        targets: children,
        translateY: [30, 0],
        opacity: [0, 1],
        duration: options.duration || 600,
        delay: anime.stagger(options.stagger || 100),
        easing: options.easing || 'easeOutExpo'
      });
    }
  }, []);

  return containerRef;
}

/**
 * אנימציה לספירה של מספרים
 * @param {HTMLElement} element - אלמנט שמכיל את המספר
 * @param {number} endValue - ערך סיום
 * @param {number} duration - משך האנימציה במילישניות
 */
export function animateNumber(element, endValue, duration = 2000) {
  const obj = { value: 0 };
  
  anime({
    targets: obj,
    value: endValue,
    duration: duration,
    easing: 'easeOutExpo',
    update: function() {
      if (element) {
        element.textContent = Math.round(obj.value).toLocaleString('he-IL');
      }
    }
  });
}

/**
 * אנימציה לכפתור hover
 */
export function buttonHoverAnimation(buttonRef) {
  if (!buttonRef.current) return;

  buttonRef.current.addEventListener('mouseenter', () => {
    anime({
      targets: buttonRef.current,
      scale: 1.05,
      duration: 300,
      easing: 'easeOutElastic(1, .5)'
    });
  });

  buttonRef.current.addEventListener('mouseleave', () => {
    anime({
      targets: buttonRef.current,
      scale: 1,
      duration: 300,
      easing: 'easeOutElastic(1, .5)'
    });
  });
}