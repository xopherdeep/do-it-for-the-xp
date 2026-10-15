import debug from '@/lib/utils/debug';
import { useUserStore } from '@/lib/store/stores/user';
import StorageService from '@/lib/services/core/StorageService';
import { hospitalBillOf } from '@/lib/services/gp/wallet';

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
    const isUninitialized = !GPService.instance;
    if (isUninitialized) {
      GPService.instance = new GPService();
    }
    return GPService.instance;
  }

  /**
   * Get the GPService instance
   */
  public static getInstance(): GPService {
    const isUninitialized = !GPService.instance;
    if (isUninitialized) {
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
   * Get what the hero still owes the Hospital (a bill above 0 means the hero is grounded)
   * @param userId User ID
   */
  public getHospitalBill(userId: string): number {
    const userStore = this.getUserStore();
    const user = userStore.getUserById(userId);
    return hospitalBillOf(user?.stats?.gp);
  }

  /**
   * Deposit GP from wallet to savings
   */
  public async depositToSavings(userId: string, amount: number): Promise<void> {
    const isInvalidAmount = amount <= 0;
    if (isInvalidAmount) {
      throw new Error('Amount must be greater than 0');
    }

    const walletBalance = this.getWalletBalance(userId);
    const isOverWallet = amount > walletBalance;
    if (isOverWallet) {
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
    const isInvalidAmount = amount <= 0;
    if (isInvalidAmount) {
      throw new Error('Amount must be greater than 0');
    }

    const savingsBalance = this.getSavingsBalance(userId);
    const isOverSavings = amount > savingsBalance;
    if (isOverSavings) {
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
    const isInvalidAmount = amount <= 0;
    if (isInvalidAmount) {
      throw new Error('Amount must be greater than 0');
    }

    const walletBalance = this.getWalletBalance(userId);
    const debtBalance = this.getDebtBalance(userId);
    
    const isOverWallet = amount > walletBalance;
    if (isOverWallet) {
      throw new Error('Insufficient funds in wallet');
    }
    
    const isOverDebt = amount > debtBalance;
    if (isOverDebt) {
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
   * Pay the hospital bill using wallet funds (docs/Quest-Rooms-Spec.md 5.8). The grounding lifts when it reaches 0.
   */
  public async payHospitalBillFromWallet(userId: string, amount: number): Promise<void> {
    const isInvalidAmount = amount <= 0;
    if (isInvalidAmount) {
      throw new Error('Amount must be greater than 0');
    }

    const isOverWallet = amount > this.getWalletBalance(userId);
    if (isOverWallet) {
      throw new Error('Insufficient funds in wallet');
    }

    const isOverBill = amount > this.getHospitalBill(userId);
    if (isOverBill) {
      throw new Error('Amount exceeds hospital bill');
    }

    const userStore = this.getUserStore();
    return userStore.updateUserGP({
      userId,
      wallet: -amount,
      hospitalBill: -amount
    });
  }

  /**
   * Add GP to the user's wallet
   */
  public async addToWallet(userId: string, amount: number): Promise<void> {
    const isInvalidAmount = amount <= 0;
    if (isInvalidAmount) {
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
    const isInvalidAmount = amount <= 0;
    if (isInvalidAmount) {
      throw new Error('Amount must be greater than 0');
    }

    const walletBalance = this.getWalletBalance(userId);
    const isOverWallet = amount > walletBalance;
    if (isOverWallet) {
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
