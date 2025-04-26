import { Store } from 'vuex';
import debug from '@/utils/debug';

/**
 * GPSystem handles all GP (Gold Points) operations in the game
 * Centralizing the economy logic in the engine layer
 */
export class GPSystem {
  private static instance: GPSystem;
  private store: Store<any>;

  private constructor(store: Store<any>) {
    this.store = store;
    debug.log('GPSystem initialized');
  }

  /**
   * Initialize the GPSystem with the Vuex store
   */
  public static initialize(store: Store<any>): GPSystem {
    if (!GPSystem.instance) {
      GPSystem.instance = new GPSystem(store);
    }
    return GPSystem.instance;
  }

  /**
   * Get the GPSystem instance
   */
  public static getInstance(): GPSystem {
    if (!GPSystem.instance) {
      throw new Error('GPSystem not initialized. Call initialize() first.');
    }
    return GPSystem.instance;
  }

  /**
   * Get user's wallet balance
   * @param userId User ID
   */
  public getWalletBalance(userId: string): number {
    const user = this.store.getters.getUserById(userId);
    return user?.wallet || 0;
  }

  /**
   * Get user's savings balance
   * @param userId User ID
   */
  public getSavingsBalance(userId: string): number {
    const user = this.store.getters.getUserById(userId);
    return user?.savings || 0;
  }

  /**
   * Get user's debt balance
   * @param userId User ID
   */
  public getDebtBalance(userId: string): number {
    const user = this.store.getters.getUserById(userId);
    return user?.debt || 0;
  }

  /**
   * Deposit GP from wallet to savings
   * @param userId User ID
   * @param amount Amount to deposit
   * @returns Promise that resolves when deposit completes
   */
  public depositToSavings(userId: string, amount: number): Promise<void> {
    if (amount <= 0) {
      return Promise.reject(new Error('Amount must be greater than 0'));
    }

    const walletBalance = this.getWalletBalance(userId);
    if (amount > walletBalance) {
      return Promise.reject(new Error('Insufficient funds in wallet'));
    }

    return this.store.dispatch("updateUserGP", {
      userId,
      wallet: -amount,
      savings: amount
    });
  }

  /**
   * Withdraw GP from savings to wallet
   * @param userId User ID
   * @param amount Amount to withdraw
   * @returns Promise that resolves when withdrawal completes
   */
  public withdrawFromSavings(userId: string, amount: number): Promise<void> {
    if (amount <= 0) {
      return Promise.reject(new Error('Amount must be greater than 0'));
    }

    const savingsBalance = this.getSavingsBalance(userId);
    if (amount > savingsBalance) {
      return Promise.reject(new Error('Insufficient funds in savings'));
    }

    return this.store.dispatch("updateUserGP", {
      userId,
      wallet: amount,
      savings: -amount
    });
  }

  /**
   * Pay off debt using wallet funds
   * @param userId User ID
   * @param amount Amount to pay
   * @returns Promise that resolves when payment completes
   */
  public payDebtFromWallet(userId: string, amount: number): Promise<void> {
    if (amount <= 0) {
      return Promise.reject(new Error('Amount must be greater than 0'));
    }

    const walletBalance = this.getWalletBalance(userId);
    const debtBalance = this.getDebtBalance(userId);
    
    if (amount > walletBalance) {
      return Promise.reject(new Error('Insufficient funds in wallet'));
    }
    
    if (amount > debtBalance) {
      return Promise.reject(new Error('Amount exceeds debt balance'));
    }

    return this.store.dispatch("updateUserGP", {
      userId,
      wallet: -amount,
      debt: -amount
    });
  }

  /**
   * Add GP to the user's wallet (e.g., from combat rewards, quests)
   * @param userId User ID
   * @param amount Amount to add
   */
  public addToWallet(userId: string, amount: number): Promise<void> {
    if (amount <= 0) {
      return Promise.reject(new Error('Amount must be greater than 0'));
    }

    return this.store.dispatch("updateUserGP", {
      userId,
      wallet: amount
    });
  }

  /**
   * Remove GP from the user's wallet (e.g., for purchases)
   * @param userId User ID
   * @param amount Amount to remove
   */
  public removeFromWallet(userId: string, amount: number): Promise<void> {
    if (amount <= 0) {
      return Promise.reject(new Error('Amount must be greater than 0'));
    }

    const walletBalance = this.getWalletBalance(userId);
    if (amount > walletBalance) {
      return Promise.reject(new Error('Insufficient funds in wallet'));
    }

    return this.store.dispatch("updateUserGP", {
      userId,
      wallet: -amount
    });
  }
}

// Export a convenience function to get the GPSystem instance
export const getGPSystem = (): GPSystem => {
  return GPSystem.getInstance();
};

export default GPSystem;