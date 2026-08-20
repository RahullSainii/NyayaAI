import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Scale, ArrowRight, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import Navbar from '../components/Navbar';
import SectionCard from '../components/SectionCard';
import MappingDrawer from '../components/MappingDrawer';
import { apiUrl } from '../lib/api';
import type { LegalSection, ApiMappingResult } from '../types';

const SAMPLE_SECTIONS: LegalSection[] = [
  {
    id: 1,
    ipcSection: '302',
    ipcTitle: 'Punishment for Murder',
    bnsSection: '103(1)',
    bnsTitle: 'Punishment for murder',
    punishment: 'Death or imprisonment for life, and fine',
    cognizable: true,
    bailable: false,
    description:
      'Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine.',
  },
  {
    id: 2,
    ipcSection: '304',
    ipcTitle: 'Punishment for Culpable Homicide not amounting to Murder',
    bnsSection: '105',
    bnsTitle: 'Punishment for culpable homicide not amounting to murder',
    punishment: 'Imprisonment for life, or up to 10 years and fine',
    cognizable: true,
    bailable: false,
    description:
      'Punishment varies based on the degree of culpability and intent involved in the act.',
  },
  {
    id: 3,
    ipcSection: '376',
    ipcTitle: 'Punishment for Rape',
    bnsSection: '64',
    bnsTitle: 'Punishment for rape',
    punishment:
      'Rigorous imprisonment not less than 10 years, may extend to life',
    cognizable: true,
    bailable: false,
    description:
      'This provision covers punishment for rape with enhanced minimum sentences.',
  },
  {
    id: 4,
    ipcSection: '420',
    ipcTitle: 'Cheating and dishonestly inducing delivery of property',
    bnsSection: '341',
    bnsTitle: 'Cheating and dishonestly inducing delivery of property',
    punishment: 'Imprisonment up to 7 years and fine',
    cognizable: true,
    bailable: false,
    description:
      'This section deals with fraud and cheating involving delivery of property.',
  },
  {
    id: 5,
    ipcSection: '498A',
    ipcTitle: 'Cruelty by Husband or Relatives',
    bnsSection: '85',
    bnsTitle: 'Cruelty by husband or his relatives',
    punishment: 'Imprisonment up to 3 years and fine',
    cognizable: true,
    bailable: false,
    description:
      'Deals with domestic cruelty and related protections for married women.',
  },
];

const SECTION_DETAILS: Record<string, LegalSection> = Object.fromEntries(
  SAMPLE_SECTIONS.map((section) => [section.ipcSection, section]),
);

const normalizeSectionInput = (value: string): string =>
  value.trim().toUpperCase().replace(/^SECTION\s+/i, '').replace(/^SEC\s+/i, '');

const buildSectionFromApi = (result: ApiMappingResult): LegalSection => {
  const fallback = SECTION_DETAILS[result.ipc] || {};
  const bnsSection = result.bns || 'Not Found';
  const mappingFound = bnsSection !== 'Not Found';

  return {
    id: Date.now(),
    ipcSection: result.ipc,
    ipcTitle: fallback.ipcTitle || `IPC Section ${result.ipc}`,
    bnsSection,
    bnsTitle: fallback.bnsTitle || result.description || 'BNS mapping result',
    punishment:
      fallback.punishment ||
      (mappingFound
        ? 'Refer to the full statute text for punishment details.'
        : 'No mapped BNS punishment information is available for this section.'),
    cognizable: fallback.cognizable ?? false,
    bailable: fallback.bailable ?? false,
    description:
      fallback.description ||
      result.description ||
      'No additional mapping description is available.',
  };
};

function Mapping() {
  const [search, setSearch] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<LegalSection | null>(null);
  const [resultSection, setResultSection] = useState<LegalSection | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);

  const runLookup = async (rawValue: string) => {
    const ipcSection = normalizeSectionInput(rawValue);

    if (!ipcSection) {
      setResultSection(null);
      setError('');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        apiUrl(`/map?ipc=${encodeURIComponent(ipcSection)}`),
      );

      if (!response.ok) {
        throw new Error(`Mapping request failed with status ${response.status}`);
      }

      const result: ApiMappingResult = await response.json();
      const mappedSection = buildSectionFromApi(result);
      setResultSection(mappedSection);
    } catch {
      setResultSection(null);
      setError(
        'Unable to fetch mapping right now. Please try again in a moment.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runLookup(search);
  };

  const handleQuickPick = async (section: LegalSection) => {
    setSearch(section.ipcSection);
    await runLookup(section.ipcSection);
  };

  return (
    <div className="min-h-screen bg-ink text-fg font-body">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 pt-28 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center md:text-left"
        >
          <h1 className="text-4xl md:text-5xl font-display font-bold text-fg">
            IPC <span className="text-gold mx-2 inline-block"><ArrowRight className="inline w-8 h-8" /></span> BNS Mapping
          </h1>
          <p className="text-fg-muted mt-4 text-lg md:text-xl font-body max-w-2xl">
            Enter an IPC section number to fetch its live BNS mapping from the backend API.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          className="mt-10 max-w-3xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div 
              className={`relative flex-1 bg-surface-glass-strong rounded-xl border transition-all duration-300 ${isFocused ? 'border-gold-glow shadow-[0_0_15px_rgba(255,215,0,0.15)]' : 'border-line'}`}
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-muted" />
              <div className="relative">
                <input
                  type="text"
                  id="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className="w-full bg-transparent pl-12 pr-4 pt-5 pb-2 text-fg focus:outline-none peer"
                  placeholder=" "
                />
                <label 
                  htmlFor="search"
                  className={`absolute left-12 text-fg-muted transition-all duration-200 pointer-events-none ${
                    search || isFocused 
                      ? 'top-1.5 text-xs'
                      : 'top-1/2 -translate-y-1/2 text-base'
                  }`}
                >
                  Enter IPC section (e.g., 302, 498A)
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-gold-dim to-gold text-ink px-8 py-3.5 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Find Mapping'}
            </button>
          </div>
        </motion.form>

        <motion.div
          className="mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <p className="text-sm font-semibold text-fg-muted uppercase tracking-wider mb-3">
            Quick picks
          </p>
          <div className="flex flex-wrap gap-3">
            {SAMPLE_SECTIONS.map((section) => (
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                key={section.id}
                type="button"
                onClick={() => handleQuickPick(section)}
                className="bg-surface border border-line text-fg rounded-lg px-4 py-2 hover:border-gold-line hover:shadow-[0_0_10px_rgba(255,215,0,0.1)] transition-all text-sm"
              >
                IPC {section.ipcSection}
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full max-w-3xl"
              >
                <div className="bg-surface border border-line rounded-xl p-6 shadow-sm animate-pulse">
                  <div className="h-6 bg-line rounded w-1/3 mb-4"></div>
                  <div className="h-8 bg-line rounded w-2/3 mb-4"></div>
                  <div className="h-4 bg-line rounded w-1/4"></div>
                </div>
              </motion.div>
            )}

            {error && !isLoading && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full max-w-3xl"
              >
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                  <p className="text-red-400">{error}</p>
                  <button onClick={() => runLookup(search)} className="mt-2 text-sm text-red-300 hover:text-red-200 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Retry
                  </button>
                </div>
              </motion.div>
            )}

            {resultSection && !isLoading && !error && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full max-w-3xl"
              >
                <SectionCard
                  section={resultSection}
                  onClick={() => setSelectedSection(resultSection)}
                />
              </motion.div>
            )}

            {!resultSection && !isLoading && !error && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full"
              >
                <div className="bg-surface-glass-strong border border-line rounded-xl p-12 flex flex-col items-center justify-center text-center max-w-3xl mx-auto mb-12">
                  <Scale className="w-12 h-12 text-fg-faint mb-4" />
                  <p className="text-fg-subtle text-lg">Search an IPC section to view its BNS equivalent.</p>
                </div>
                
                <div>
                  <h3 className="text-xl font-display font-semibold text-fg mb-6">Sample Sections</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {SAMPLE_SECTIONS.map(section => (
                      <SectionCard 
                        key={section.id} 
                        section={section} 
                        onClick={() => setSelectedSection(section)} 
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      <AnimatePresence>
        {selectedSection && (
          <MappingDrawer
            section={selectedSection}
            onClose={() => setSelectedSection(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default Mapping;
