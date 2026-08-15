import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DisclaimerModal from './DisclaimerModal'

describe('DisclaimerModal', () => {
  it('renders when ack is false', () => {
    render(<DisclaimerModal ack={false} onAccept={() => {}} />)
    expect(screen.getByText(/Before you begin/i)).toBeInTheDocument()
    expect(screen.getByText(/I understand/i)).toBeInTheDocument()
  })

  it('does not render when ack is true', () => {
    render(<DisclaimerModal ack={true} onAccept={() => {}} />)
    expect(screen.queryByText(/Before you begin/i)).not.toBeInTheDocument()
  })

  it('calls onAccept when button is clicked', () => {
    const onAcceptMock = vi.fn()
    render(<DisclaimerModal ack={false} onAccept={onAcceptMock} />)
    fireEvent.click(screen.getByText(/I understand/i))
    expect(onAcceptMock).toHaveBeenCalledTimes(1)
  })
})
