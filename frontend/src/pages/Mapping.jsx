import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/Navbar'
import SectionCard from '../components/SectionCard'
import MappingDrawer from '../components/MappingDrawer'

const SAMPLE_SECTIONS = [
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
]

const SECTION_DETAILS = Object.fromEntries(
  SAMPLE_SECTIONS.map((section) => [section.ipcSection, section]),
)

const normalizeSectionInput = (value) =>
  value.trim().toUpperCase().replace(/^SECTION\s+/i, '').replace(/^SEC\s+/i, '')

const buildSectionFromApi = (result) => {
  const fallback = SECTION_DETAILS[result.ipc] || {}
  const bnsSection = result.bns || 'Not Found'
  const mappingFound = bnsSection !== 'Not Found'

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
  }
}

function Mapping() {
  const [search, setSearch] = useState('')
  const [selectedSection, setSelectedSection] = useState(null)
  const [resultSection, setResultSection] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const runLookup = async (rawValue) => {
    const ipcSection = normalizeSectionInput(rawValue)

    if (!ipcSection) {
      setResultSection(null)
      setError('')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/map?ipc=${encodeURIComponent(ipcSection)}`)

      if (!response.ok) {
        throw new Error(`Mapping request failed with status ${response.status}`)
      }

      const result = await response.json()
      const mappedSection = buildSectionFromApi(result)
      setResultSection(mappedSection)
    } catch (lookupError) {
      setResultSection(null)
      setError(
        'Unable to fetch mapping right now. Please try again in a moment.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    await runLookup(search)
  }

  const handleQuickPick = async (section) => {
    setSearch(section.ipcSection)
    await runLookup(section.ipcSection)
  }

  return (
    <div className="min-h-screen bg-navy font-body">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 pt-28 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-heading font-bold text-text-primary">
            IPC to BNS Mapping
          </h1>
          <p className="text-muted-blue mt-3 text-lg max-w-2xl">
            Enter an IPC section number to fetch its live BNS mapping from the
            backend API.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          className="mt-8 max-w-3xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-blue/50"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Enter IPC section number, for example 302 or 498A"
                className="bg-card border border-border rounded-xl pl-12 pr-5 py-3.5 w-full text-text-primary placeholder:text-muted-blue/50 focus:outline-none focus:border-muted-blue transition-colors text-base"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="bg-gold text-navy px-6 py-3.5 rounded-xl font-semibold hover:bg-gold-hover transition-all disabled:opacity-60"
            >
              {isLoading ? 'Searching...' : 'Find Mapping'}
            </button>
          </div>
        </motion.form>

        <motion.div
          className="mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <p className="text-xs font-semibold text-muted-blue uppercase tracking-wider mb-3">
            Quick picks
          </p>
          <div className="flex flex-wrap gap-3">
            {SAMPLE_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => handleQuickPick(section)}
                className="bg-card border border-border text-text-primary rounded-xl px-4 py-2.5 hover:border-muted-blue transition-all text-sm"
              >
                IPC {section.ipcSection}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <AnimatePresence mode="popLayout">
            {resultSection && (
              <motion.div
                key={resultSection.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
              >
                <SectionCard
                  section={resultSection}
                  onClick={() => setSelectedSection(resultSection)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {!resultSection && !isLoading && !error && (
            <motion.p
              className="col-span-full text-center text-muted-blue/70 py-16 text-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Search an IPC section to load its mapped BNS section.
            </motion.p>
          )}

          {error && (
            <motion.p
              className="col-span-full text-center text-red-400 py-16 text-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {error}
            </motion.p>
          )}
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
  )
}

export default Mapping
