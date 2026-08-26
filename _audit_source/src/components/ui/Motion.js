import { motion } from "framer-motion";

/**
 * FadeUp: premium reveal animation for sections/cards.
 */
export function FadeUp({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * HoverCard: subtle lift on hover (premium micro-motion).
 */
export function HoverCard({ children, className = "" }) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      {children}
    </motion.div>
  );
}
