import debug from '@/lib/utils/debug';
import { useUserStore } from '@/lib/store/stores/user';
import StorageService from '@/lib/services/core/StorageService';

/**
 * GPService handles all GP (Gold Points) operations in the game
 * Centralizing the economy logic in the services layer
 */
export class GPService {
  private static instance: GPService;

  private constructor() {
    debug.log('GPService initialized (Pinia version)');
  }

  /**
   * Initialize the GPService
   */
  public static initialize(): GPService {
    if (!GPService.instance) {
      GPService.instance = new GPService();
    }
    return GPService.instance;
  }

  /**
   * Get the GPService instance
   */
  public static getInstance(): GPService {
    if (!GPService.instance) {
      this.initialize();
    }
    return GPService.instance;
  }

  private getUserStore() {
    return useUserStore();
  }

  /**
   * Get user's wallet balance
   * @param userId User ID
   */
  public getWalletBalance(userId: string): number {
    const userStore = this.getUserStore();
    const user = userStore.getUserById(userId);
    return user?.stats?.gp?.wallet || 0;
  }

  /**
   * Get user's savings balance
   * @param userId User ID
   */
  public getSavingsBalance(userId: string): number {
    const userStore = this.getUserStore();
    const user = userStore.getUserById(userId);
    return user?.stats?.gp?.savings || 0;
  }

  /**
   * Get user's debt balance
   * @param userId User ID
   */
  public getDebtBalance(userId: string): number {
    const userStore = this.getUserStore();
    const user = userStore.getUserById(userId);
    return user?.stats?.gp?.debt || 0;
  }

  /**
   * Deposit GP from wallet to savings
   */
  public async depositToSavings(userId: string, amount: number): Promise<void> {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const walletBalance = this.getWalletBalance(userId);
    if (amount > walletBalance) {
      throw new Error('Insufficient funds in wallet');
    }

    const userStore = this.getUserStore();
    return userStore.updateUserGP({
      userId,
      wallet: -amount,
      savings: amount
    });
  }

  /**
   * Withdraw GP from savings to wallet
   */
  public async withdrawFromSavings(userId: string, amount: number): Promise<void> {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const savingsBalance = this.getSavingsBalance(userId);
    if (amount > savingsBalance) {
      throw new Error('Insufficient funds in savings');
    }

    const userStore = this.getUserStore();
    return userStore.updateUserGP({
      userId,
      wallet: amount,
      savings: -amount
    });
  }

  /**
   * Pay off debt using wallet funds
   */
  public async payDebtFromWallet(userId: string, amount: number): Promise<void> {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const walletBalance = this.getWalletBalance(userId);
    const debtBalance = this.getDebtBalance(userId);
    
    if (amount > walletBalance) {
      throw new Error('Insufficient funds in wallet');
    }
    
    if (amount > debtBalance) {
      throw new Error('Amount exceeds debt balance');
    }

    const userStore = this.getUserStore();
    return userStore.updateUserGP({
      userId,
      wallet: -amount,
      debt: -amount
    });
  }

  /**
   * Add GP to the user's wallet
   */
  public async addToWallet(userId: string, amount: number): Promise<void> {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const userStore = this.getUserStore();
    return userStore.updateUserGP({
      userId,
      wallet: amount
    });
  }

  /**
   * Remove GP from the user's wallet
   */
  public async removeFromWallet(userId: string, amount: number): Promise<void> {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const walletBalance = this.getWalletBalance(userId);
    if (amount > walletBalance) {
      throw new Error('Insufficient funds in wallet');
    }

    const userStore = this.getUserStore();
    return userStore.updateUserGP({
      userId,
      wallet: -amount
    });
  }

  /**
   * Sync GP changes to local storage
   */
  public async syncGP(userId: string): Promise<any> {
    try {
      const userStore = this.getUserStore();
      const users = userStore.users;
      await StorageService.saveUsers(users);
      return { success: true };
    } catch (error) {
      debug.error(`Failed to sync GP for user ${userId}`, error);
      return null;
    }
  }
}

// Export a convenience function to get the GPService instance
export const getGPService = (): GPService => {
  return GPService.getInstance();
};

export default GPService;
