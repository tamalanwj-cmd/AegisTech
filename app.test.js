import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from './App';

// Global mock for fetch calls to NocoDB API
global.fetch = jest.fn();

describe('TSPES Dashboard - Unit & Integration Tests', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  // 1. Authentication Tests
  describe('Authentication Module', () => {
    test('renders login form by default', () => {
      render(<App />);
      expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    });

    test('authenticates user successfully on valid credentials', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([{ id: 1, username: 'admin', role: 'admin', status: 'Active' }]),
      });

      render(<App />);
      fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'admin' } });
      fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByText(/user management/i)).toBeInTheDocument();
      });
    });

    test('shows error message on failed login', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([]), // Empty user list = invalid credentials
      });

      render(<App />);
      fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'wronguser' } });
      fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'wrongpass' } });
      fireEvent.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    test('switches to registration view when clicking Sign Up', () => {
      render(<App />);
      const signUpLink = screen.getByText(/sign up/i);
      fireEvent.click(signUpLink);

      expect(screen.getByRole('heading', { name: /register/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    });

    test('switches to password reset view when requested', () => {
      render(<App />);
      const resetLink = screen.getByText(/forgot password/i);
      fireEvent.click(resetLink);

      expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
    });
  });

  // 2. User Management & Data Operations
  describe('User Management Module', () => {
    const mockUsers = [
      { id: 1, username: 'admin', email: 'admin@tspes.local', role: 'admin', status: 'Active' },
      { id: 2, username: 'yang001', email: 'yang001@qq.com', role: 'participant', status: 'Active' },
    ];

    test('fetches and displays the list of users', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers,
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('admin@tspes.local')).toBeInTheDocument();
        expect(screen.getByText('yang001@qq.com')).toBeInTheDocument();
      });
    });

    test('filters user list based on search keyword', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers,
      });

      render(<App />);

      await waitFor(() => {
        const filterInput = screen.getByPlaceholderText(/search users/i);
        fireEvent.change(filterInput, { target: { value: 'yang001' } });

        expect(screen.getByText('yang001@qq.com')).toBeInTheDocument();
        expect(screen.queryByText('admin@tspes.local')).not.toBeInTheDocument();
      });
    });

    test('submits new user creation request', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 3, username: 'newuser', email: 'new@tspes.local', role: 'participant' }),
      });

      render(<App />);
      
      const addButton = screen.getByRole('button', { name: /add user/i });
      fireEvent.click(addButton);

      fireEvent.change(screen.getByPlaceholderText(/new username/i), { target: { value: 'newuser' } });
      fireEvent.change(screen.getByPlaceholderText(/new email/i), { target: { value: 'new@tspes.local' } });
      
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v2/tables/'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    test('triggers delete API call when user deletion is confirmed', async () => {
      fetch.mockResolvedValueOnce({ ok: true });

      render(<App />);

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v2/tables/'),
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });
  });
});