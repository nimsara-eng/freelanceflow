import { motion, useReducedMotion } from 'framer-motion'

export default function PageWrapper({ children }) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.2 }}
      className="mx-auto w-full max-w-7xl"
    >
      {children}
    </motion.div>
  )
}