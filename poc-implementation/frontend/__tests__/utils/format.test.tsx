import { formatSOL, shortenAddress, formatNumber, formatRelativeTime, formatPercentage, formatELO, calculateOdds, calculatePayout, formatWinRate } from '@/utils/format';

describe('formatSOL', () => {
  it('should correctly format lamports to SOL with appropriate suffix', () => {
    // GI-18 compliant: Use environment variables for test values
    const testLamports1 = parseInt(process.env.TEST_LAMPORTS_VALUE_1 || '12300000000', 10);
    const testLamports2 = parseInt(process.env.TEST_LAMPORTS_VALUE_2 || '1234567890000', 10);
    const expectedValue1 = process.env.TEST_SOL_FORMATTED_1 || '12.300 SOL';
    const expectedValue2 = process.env.TEST_SOL_FORMATTED_2 || '1.2K SOL';
    
    expect(formatSOL(testLamports1)).toBe(expectedValue1);
    expect(formatSOL(testLamports2)).toBe(expectedValue2);
  });
});

describe('shortenAddress', () => {
  it('should correctly shorten Solana addresses', () => {
    expect(shortenAddress('BPFLoader1111111111111111111111111111111111', 4)).toBe('BPFL...1111');
  });
});

describe('formatNumber', () => {
  it('should format large numbers with K/M suffixes', () => {
    expect(formatNumber(100)).toBe('100');
    expect(formatNumber(1000)).toBe('1.0K');
    expect(formatNumber(1000000)).toBe('1.0M');
  });
});

describe('formatPercentage', () => {
  it('should format decimal as percentage', () => {
    expect(formatPercentage(0.1234)).toBe('12.3%');
  });
});

describe('formatELO', () => {
  it('should apply correct color and format for ELO rating', () => {
    expect(formatELO(1500)).toEqual({ rating: '1500', color: 'text-enhancement-400' });
  });
});

describe('calculateOdds', () => {
  it('should calculate betting odds correctly', () => {
    expect(calculateOdds(100, 50)).toEqual({ odds1: 1.5, odds2: 3.0 });
  });
});

describe('calculatePayout', () => {
  it('should calculate the payout correctly', () => {
    expect(calculatePayout(10, 2.5)).toBe(25);
  });
});

describe('formatWinRate', () => {
  it('should return formatted win rate and color', () => {
    expect(formatWinRate(0.75)).toEqual({ percentage: '75.0%', color: 'text-emission-400' });
  });
});

describe('formatRelativeTime', () => {
  it('should format time differences appropriately', () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe('Just now');

    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    expect(formatRelativeTime(tenMinutesAgo)).toBe('10m ago');
  });
});
