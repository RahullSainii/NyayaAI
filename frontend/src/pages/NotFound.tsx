import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import Navbar from '../components/Navbar';
import { Backdrop } from '../components/ui/Backdrop';
import { buttonClass } from '../components/ui/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Page not found · NyayaAI');

  return (
    <div className="relative min-h-[100dvh] bg-ink">
      <Backdrop />
      <Navbar />

      <main
        id="main-content"
        className="relative flex min-h-[100dvh] flex-col items-center justify-center px-5 text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
          className="max-w-md"
        >
          <p className="t-mono lum-metric">404</p>
          <h1 className="t-h1 lum-heading mt-4">This page isn’t here</h1>
          <p className="t-lead mt-3">
            The link may be out of date. The two things you can do from anywhere are ask a question
            and look up a section.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row">
            <Link to="/chat" className={buttonClass({ variant: 'primary' })}>
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              Ask a question
            </Link>
            <Link to="/" className={buttonClass({ variant: 'secondary' })}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back home
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
