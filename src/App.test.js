import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// P01 — the portal selection page is the public landing page.
test('renders the portal selection page with both portal buttons', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>
  );
  expect(screen.getByText('TSPES')).toBeInTheDocument();
  expect(screen.getByText('Participant Portal')).toBeInTheDocument();
  expect(screen.getByText('Administrator Portal')).toBeInTheDocument();
});
