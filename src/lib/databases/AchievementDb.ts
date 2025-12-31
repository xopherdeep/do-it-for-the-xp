import { v4 as uuidv4 } from "uuid";
import DbStorageApi from "./DbStorageApi";

import { Drivers, Storage } from "@ionic/storage";

export const achievementStorage = new Storage({
  name: "__achievements",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export const achievementCategoryStorage = new Storage({
  name: "__achievementCategories",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export interface Achievement {
  // achievement
  id: any;
  achievementName: string;
  categoryId: string;
  imageUrl?: string;
  localImage?: string;
  bonusAchievement: boolean;
  requiresApproval: boolean;
  beastId?: string;
  subAchievementIds?: string[];
  // assignment
  type: string;
  assignee: string[];
  // schedule
  basicSchedule: string;
  scheduleType: string;
  customFrequency: number;
  customPeriodType: string;
  customPeriodNumber: number;
  dueByTime: string;
  endsOn: string;
  startsOn: string;
  repeatOnDays: string[];
  showDailyUntilComplete: boolean;
  // stats
  difficulty: number;
  xp: number;
  gp: number;
  ap: number;
  // meta
  adventureType: string;
}

export interface AchievementCategoryInterface {
  id: string;
  name: string;
}

export class AchievementCategoryDb extends DbStorageApi {
  public async setCategory(category: AchievementCategoryInterface) {
    await this.set(category.id, category);
  }

  public async setCategories(categories: AchievementCategoryInterface[]) {
    categories.forEach(this.setCategory);
  }
}

export class AchievementDb extends DbStorageApi {
  public static getDefault(): Achievement {
    return {
      id: uuidv4(),
      achievementName: "",
      categoryId: "",
      beastId: "",
      subAchievementIds: [],
      requiresApproval: false,
      assignee: [],
      type: "individual",
      bonusAchievement: false,
      startsOn: new Date().toISOString(),
      endsOn: "",
      dueByTime: "",
      basicSchedule: "once",
      scheduleType: "basic",
      showDailyUntilComplete: false,
      customFrequency: 1,
      customPeriodType: "day",
      customPeriodNumber: 1,
      repeatOnDays: [],
      difficulty: 1,
      xp: 200,
      gp: 20,
      ap: 2,
      adventureType: "simple",
    };
  }

  public async setTask(task: Achievement) {
    const id = task.id ? task.id : uuidv4();
    await this.set(id, {
      ...AchievementDb.getDefault(),
      ...task,
      id,
    });
  }

  public async deleteTask(task: Achievement) {
    this.remove(task.id);
    return await this.getTasks();
  }

  public async cloneTask(task: Achievement) {
    const cloneFromTasks = async () => {
      const clone = {
        ...task,
        id: uuidv4(),
        achievementName: `${task.achievementName} (clone)`,
      };
      const cloneToast = () => this.showSuccessToast("Clone Successful!");
      return await this.setTask(clone).then(cloneToast);
    };

    const clone = await this.getTasks().then(cloneFromTasks);
    return clone;
  }

  public async getTaskById(id: string): Promise<Achievement | null> {
    const tasks = await this.getTasks();
    return tasks.find((task) => task.id === id) || null;
  }

  public async getTasks(): Promise<Achievement[]> {
    const tasks = await this.getAll();
    return tasks as Achievement[];
  }

  // NEW IMPORT/EXPORT FUNCTIONALITY

  /**
   * Export achievements data
   * @returns Promise that resolves when the export is complete
   */
  public async exportAchievements(): Promise<void> {
    try {
      // Get all achievements
      const achievements = await this.getTasks();

      if (achievements.length === 0) {
        this.showWarningToast("No achievements to export!");
        return;
      }

      // Create a data URL with the JSON data
      const jsonData = JSON.stringify(achievements, null, 2);
      const dataUrl = `data:text/json;charset=utf-8,${encodeURIComponent(
        jsonData
      )}`;

      // Create a temporary link element and trigger download
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `xp-achievements-export-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Show success toast
      this.showSuccessToast(`Exported ${achievements.length} achievements!`);
    } catch (error) {
      console.error("Failed to export achievements:", error);
      this.showErrorToast("Failed to export achievements");
    }
  }

  /**
   * Trigger file selection to import achievements data
   * @param onComplete Optional callback function to run after import completes
   */
  public async importAchievements(onComplete?: () => void): Promise<void> {
    try {
      // Create file input element
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".json";

      // Set up file change handler
      fileInput.onchange = async (event) => {
        const target = event.target as HTMLInputElement;
        if (!target || !target.files || target.files.length === 0) return;

        const file = target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = async (e) => {
          try {
            if (!e.target || e.target.result === null) {
              this.showErrorToast("Failed to read file");
              return;
            }

            const content = e.target.result as string;
            const importedData = JSON.parse(content);

            let achievements: Achievement[] = [];

            if (Array.isArray(importedData)) {
              achievements = importedData as Achievement[];
            } else {
              this.showErrorToast("Invalid achievements file format");
              return;
            }

            // Import achievements
            if (achievements.length > 0) {
              const count = await this.importAchievementsData(achievements);
              this.showSuccessToast(
                `Successfully imported ${count} achievements!`
              );
            } else {
              this.showWarningToast("No achievements found in file");
            }

            // Run callback if provided
            if (onComplete) {
              onComplete();
            }
          } catch (parseError) {
            console.error("Error parsing import file:", parseError);
            this.showErrorToast("Invalid JSON file");
          }
        };

        reader.readAsText(file);
      };

      // Trigger file selection
      fileInput.click();
    } catch (error) {
      console.error("Failed to import achievements:", error);
      this.showErrorToast("Failed to import achievements");
    }
  }

  /**
   * Import achievements data from parsed JSON
   * @param achievements Array of achievements to import
   * @returns Number of successfully imported achievements
   */
  public async importAchievementsData(
    achievements: Achievement[]
  ): Promise<number> {
    try {
      let successCount = 0;

      for (const achievement of achievements) {
        try {
          // Ensure each achievement has a new UUID to avoid conflicts
          const importedAchievement = {
            ...achievement,
            id: uuidv4(),
          };

          await this.setTask(importedAchievement);
          successCount++;
        } catch (err) {
          console.error("Error importing achievement:", err);
        }
      }

      return successCount;
    } catch (error) {
      console.error("Error importing achievements data:", error);
      this.showErrorToast("Failed to import achievements");
      return 0;
    }
  }
}

export default AchievementDb;
