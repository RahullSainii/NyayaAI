import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Scale } from 'lucide-react';
import Navbar from '../components/Navbar';

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="flex min-h-screen flex-col items-center justify-center bg-ink px-8 text-center text-fg">
        {/* Decorative background glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-dim blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex flex-col items-center"
        >
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-gold-line bg-gold-dim">
            <Scale className="h-10 w-10 text-gold" />
          </div>

          <h1 className="font-display text-8xl font-extrabold tracking-tight text-gold sm:text-9xl">
            404
          </h1>

          <p className="mt-3 text-xl font-medium text-fg sm:text-2xl">
            Page not found
          </p>

          <p className="mt-2 max-w-md text-fg-muted leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>

          <Link
            to="/"
            className="primary-cta mt-8 gap-2.5 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </motion.div>
      </main>
    </>
  );
}
