/**
 * 💎 v83: Currency Store (Zustand)
 */

'use client';

import { create } from 'zustand';
import type { UserCurrency } from '@/types/currency.types';

interface CurrencyStore {
  balance: UserCurrency;
  isLoading: boolean;
  loaded: boolean;
  fetchBalance: () => Promise<void>;
  setBalance: (b: UserCurrency) => void;
}

const DEFAULT_BALANCE: UserCurrency = { heartStone: 0, starlight: 0, bondShards: 0 };

export const useCurrencyStore = create<CurrencyStore>((set) => ({
  balance: DEFAULT_BALANCE,
  isLoading: false,
  loaded: false,
  fetchBalance: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/currency/balance');
      if (!res.ok) throw new Error('fetch failed');
      const data = (await res.json()) as UserCurrency;
      set({ balance: data, loaded: true });
    } catch (err) {
      console.error('[currency-store] fetch 실패', err);
    } finally {
      set({ isLoading: false });
    }
  },
  setBalance: (b) => set({ balance: b }),
}));
