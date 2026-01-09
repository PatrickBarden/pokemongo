'use client';

import { motion, HTMLMotionProps, Variants } from 'framer-motion';
import { forwardRef } from 'react';

// Variantes de animação reutilizáveis
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 },
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};

export const slideInFromBottom: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0 },
};

// Container com stagger para filhos
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

// Transições padrão
export const defaultTransition = {
  type: 'spring',
  stiffness: 260,
  damping: 20,
};

export const smoothTransition = {
  type: 'tween',
  duration: 0.3,
  ease: 'easeOut',
};

export const bounceTransition = {
  type: 'spring',
  stiffness: 400,
  damping: 10,
};

// Componentes de animação reutilizáveis
interface MotionDivProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
}

// FadeIn Component
export const FadeIn = forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      transition={smoothTransition}
      {...props}
    >
      {children}
    </motion.div>
  )
);
FadeIn.displayName = 'FadeIn';

// FadeInUp Component
export const FadeInUp = forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      transition={smoothTransition}
      {...props}
    >
      {children}
    </motion.div>
  )
);
FadeInUp.displayName = 'FadeInUp';

// ScaleIn Component
export const ScaleIn = forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="hidden"
      animate="visible"
      variants={scaleIn}
      transition={defaultTransition}
      {...props}
    >
      {children}
    </motion.div>
  )
);
ScaleIn.displayName = 'ScaleIn';

// StaggerContainer Component
export const StaggerContainer = forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      {...props}
    >
      {children}
    </motion.div>
  )
);
StaggerContainer.displayName = 'StaggerContainer';

// StaggerItem Component - para usar dentro do StaggerContainer
export const StaggerItem = forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, ...props }, ref) => (
    <motion.div
      ref={ref}
      variants={fadeInUp}
      transition={smoothTransition}
      {...props}
    >
      {children}
    </motion.div>
  )
);
StaggerItem.displayName = 'StaggerItem';

// Viewport Animation - anima quando entra na viewport
interface ViewportAnimationProps extends MotionDivProps {
  once?: boolean;
  amount?: number;
}

export const ViewportFadeIn = forwardRef<HTMLDivElement, ViewportAnimationProps>(
  ({ children, once = true, amount = 0.3, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={fadeInUp}
      transition={smoothTransition}
      {...props}
    >
      {children}
    </motion.div>
  )
);
ViewportFadeIn.displayName = 'ViewportFadeIn';

// Card com hover effect
export const AnimatedCard = forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="hidden"
      animate="visible"
      variants={scaleIn}
      whileHover={{ 
        scale: 1.02, 
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
      transition={smoothTransition}
      {...props}
    >
      {children}
    </motion.div>
  )
);
AnimatedCard.displayName = 'AnimatedCard';

// Button com efeito de press
export const AnimatedButton = forwardRef<HTMLButtonElement, HTMLMotionProps<'button'>>(
  ({ children, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      {...props}
    >
      {children}
    </motion.button>
  )
);
AnimatedButton.displayName = 'AnimatedButton';

// Pulse animation para notificações/badges
export const PulseAnimation = forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, ...props }, ref) => (
    <motion.div
      ref={ref}
      animate={{
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        repeatType: 'loop',
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
);
PulseAnimation.displayName = 'PulseAnimation';

// Shake animation para erros
export const ShakeAnimation = forwardRef<HTMLDivElement, MotionDivProps & { trigger?: boolean }>(
  ({ children, trigger, ...props }, ref) => (
    <motion.div
      ref={ref}
      animate={trigger ? {
        x: [0, -10, 10, -10, 10, 0],
        transition: { duration: 0.5 }
      } : {}}
      {...props}
    >
      {children}
    </motion.div>
  )
);
ShakeAnimation.displayName = 'ShakeAnimation';

// Floating animation suave
export const FloatingAnimation = forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, ...props }, ref) => (
    <motion.div
      ref={ref}
      animate={{
        y: [0, -8, 0],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        repeatType: 'loop',
        ease: 'easeInOut',
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
);
FloatingAnimation.displayName = 'FloatingAnimation';

// Lista animada com stagger
interface AnimatedListProps extends MotionDivProps {
  items: React.ReactNode[];
  itemClassName?: string;
}

export const AnimatedList = forwardRef<HTMLDivElement, AnimatedListProps>(
  ({ items, itemClassName, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="hidden"
      animate="visible"
      variants={staggerContainerFast}
      {...props}
    >
      {items.map((item, index) => (
        <motion.div
          key={index}
          variants={fadeInUp}
          transition={smoothTransition}
          className={itemClassName}
        >
          {item}
        </motion.div>
      ))}
    </motion.div>
  )
);
AnimatedList.displayName = 'AnimatedList';

// Export motion para uso direto
export { motion };
