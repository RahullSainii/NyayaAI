import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChatBubble from './ChatBubble';

// Need to mock lucide-react since it might not be fully supported in basic test env without setup
vi.mock('lucide-react', () => ({
  Copy: () => <span data-testid="icon-copy" />,
  Check: () => <span data-testid="icon-check" />,
  Download: () => <span data-testid="icon-download" />,
  ThumbsUp: () => <span data-testid="icon-thumbsup" />,
  ThumbsDown: () => <span data-testid="icon-thumbsdown" />,
  FileText: () => <span data-testid="icon-filetext" />,
  Share2: () => <span data-testid="icon-share2" />,
  RefreshCw: () => <span data-testid="icon-refreshcw" />,
  Volume2: () => <span data-testid="icon-volume2" />,
  VolumeX: () => <span data-testid="icon-volumex" />,
  GitBranch: () => <span data-testid="icon-gitbranch" />,
  Globe: () => <span data-testid="icon-globe" />,
  Image: () => <span data-testid="icon-image" />,
  ExternalLink: () => <span data-testid="icon-externallink" />,
}));

describe('ChatBubble', () => {
  it('renders a simple user message', () => {
    render(<ChatBubble message={{ role: 'user', content: 'Hello world' }} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders a bot message with markdown', () => {
    render(<ChatBubble message={{ role: 'assistant', content: '# Heading\n\nSome **bold** text.' }} />);
    expect(screen.getByText('Heading')).toBeInTheDocument();
    expect(screen.getByText('bold')).toBeInTheDocument();
  });

  it('renders source badges when provided', () => {
    render(
      <ChatBubble 
        message={{ 
          role: 'assistant', 
          content: 'Here is the answer.', 
          sources: [
            { law_type: 'IPC', section: '302' },
            { url: 'https://example.com/law', law_type: 'WEB' }
          ]
        }} 
      />
    );
    expect(screen.getByText(/IPC Section 302/)).toBeInTheDocument();
  });
});
