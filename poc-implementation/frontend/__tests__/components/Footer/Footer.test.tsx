import React from 'react';
import { render, screen } from '@testing-library/react';
import { Footer } from '../../../components/Footer/Footer';

describe('Footer', () => {
  it('should render the footer with the correct text', () => {
    render(<Footer />);
    const footerElement = screen.getByText(/© 2024 Nen Platform. Built with ⚡ by hunters, for hunters./i);
    expect(footerElement).toBeInTheDocument();
  });
});

