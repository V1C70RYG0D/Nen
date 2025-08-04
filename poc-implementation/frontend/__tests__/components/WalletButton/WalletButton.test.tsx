import React from 'react';
import { render, screen } from '@testing-library/react';
import { WalletButton } from '@/components/WalletButton/WalletButton';

// Mock Solana wallet adapter react UI
jest.mock('@solana/wallet-adapter-react-ui', () => ({
  WalletMultiButton: ({ className, children, ...props }: any) => (
    <button className={className} {...props}>
      {children || 'Connect Wallet'}
    </button>
  ),
}));

describe('WalletButton', () => {
  it('should render WalletMultiButton with correct props', () => {
    render(<WalletButton />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Connect Wallet');
    expect(button).toHaveAttribute('data-testid', 'wallet-button');
  });

  it('should apply custom className', () => {
    const customClass = 'custom-wallet-button';
    render(<WalletButton className={customClass} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass(customClass);
    expect(button).toHaveClass('nen-button');
    expect(button).toHaveClass('!bg-solana-gradient');
    expect(button).toHaveClass('!text-white');
  });

  it('should have default styling classes', () => {
    render(<WalletButton />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('nen-button');
    expect(button).toHaveClass('!bg-solana-gradient');
    expect(button).toHaveClass('!text-white');
  });
});
