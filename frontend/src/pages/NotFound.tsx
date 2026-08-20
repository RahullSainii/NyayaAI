import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function NotFound() {
  return (
    <>
      <Navbar />
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--navy, #0b1322)',
        color: '#f5f7ff',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <h1 style={{ fontSize: '6rem', fontWeight: 800, color: '#e3bb56', margin: 0, lineHeight: 1 }}>
          404
        </h1>
        <p style={{ fontSize: '1.5rem', marginTop: '0.5rem', marginBottom: '0.25rem' }}>
          Page not found
        </p>
        <p style={{ color: '#8fa4cb', maxWidth: '420px', lineHeight: 1.6, marginBottom: '2rem' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          style={{
            padding: '0.75rem 2rem',
            borderRadius: '999px',
            background: 'linear-gradient(135deg, #f1cf75, #e3bb56, #c99433)',
            color: '#0b1322',
            fontWeight: 700,
            textDecoration: 'none',
            fontSize: '0.95rem',
          }}
        >
          Back to Home
        </Link>
      </div>
    </>
  )
}
