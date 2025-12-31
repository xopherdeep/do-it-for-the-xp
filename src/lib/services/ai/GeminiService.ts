/**
 * GeminiService - AI-powered text generation using Google's Gemini API
 * Used for generating creative monster names from chore checklists
 */

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export interface GenerateMonsterNameOptions {
  checklistItems: string[];
}

export interface GeminiResponse {
  success: boolean;
  name?: string;
  error?: string;
}

/**
 * Generate a creative monster name based on a list of chores/tasks
 */
export async function generateMonsterName(
  options: GenerateMonsterNameOptions
): Promise<GeminiResponse> {
  const apiKey = process.env.VUE_APP_GEMINI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "Gemini API key not configured. Add VUE_APP_GEMINI_API_KEY to your .env file.",
    };
  }

  if (!options.checklistItems.length) {
    return {
      success: false,
      error: "Please add some checklist items first.",
    };
  }

  const checklistText = options.checklistItems.join("\n- ");

  const prompt = `You are a creative naming expert for a family chore gamification app. 
Based on the following list of chores/tasks, generate ONE creative, fun, and kid-friendly monster name.

The monster name should:
- Be a playful portmanteau or pun related to the chores (like "Socktopus" for sock-related chores, or "Dust Dragon" for cleaning tasks. Think earthbound style.)
- Be memorable, creative and fun to say
- Be appropriate for children
- Be a single name (1-3 words max)
- Be more creative than just a simple pun or portmanteau, or just adding 'zilla' to things.
- For example. Socktopus is better than Sockzilla. Because it rhymes with Octopus, a real creature.
Chores:
- ${checklistText}

Respond with ONLY the monster name, nothing else. No quotes, no explanation, just the name.`;

  try {
    const url = `${GEMINI_API_URL}?key=${apiKey}`;
    console.log("Gemini API URL:", GEMINI_API_URL);
    console.log(
      "API Key loaded:",
      apiKey ? "Yes (length: " + apiKey.length + ")" : "No"
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 50,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini API error:", response.status, errorData);
      return {
        success: false,
        error: `API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    const generatedText =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!generatedText) {
      return {
        success: false,
        error: "No response generated. Please try again.",
      };
    }

    return {
      success: true,
      name: generatedText,
    };
  } catch (error) {
    console.error("Gemini API request failed:", error);
    return {
      success: false,
      error: "Failed to connect to AI service. Check your internet connection.",
    };
  }
}

export interface GenerateChecklistOptions {
  monsterName: string;
}

export interface ChecklistResponse {
  success: boolean;
  checklist?: string[];
  error?: string;
}

/**
 * Generate a checklist of chores/tasks based on a monster name
 */
export async function generateChecklistFromName(
  options: GenerateChecklistOptions
): Promise<ChecklistResponse> {
  const apiKey = process.env.VUE_APP_GEMINI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "Gemini API key not configured. Add VUE_APP_GEMINI_API_KEY to your .env file.",
    };
  }

  if (!options.monsterName?.trim()) {
    return {
      success: false,
      error: "Please enter a monster name first.",
    };
  }

  const prompt = `You are a creative assistant for a family chore gamification app.
Based on the monster name "${options.monsterName}", generate a list of 3-5 related household chores or tasks that this monster might represent.

Rules:
- Each task should be a simple, actionable chore appropriate for children
- Tasks should relate to the theme of the monster name (e.g., "Socktopus" would have sock-related tasks)
- Keep each task short (2-6 words)
- Make tasks specific and achievable

Respond with ONLY a JSON array of strings, nothing else. Example format:
["Pick up socks", "Sort clean socks", "Put socks in drawer"]`;

  try {
    const url = `${GEMINI_API_URL}?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 200,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini API error:", response.status, errorData);
      return {
        success: false,
        error: `API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    const generatedText =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!generatedText) {
      return {
        success: false,
        error: "No response generated. Please try again.",
      };
    }

    // Parse the JSON array from the response
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanedText = generatedText;
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText
          .replace(/```json?\n?/g, "")
          .replace(/```/g, "");
      }

      const checklist = JSON.parse(cleanedText.trim());

      if (!Array.isArray(checklist)) {
        throw new Error("Response is not an array");
      }

      return {
        success: true,
        checklist: checklist.filter(
          (item: any) => typeof item === "string" && item.trim()
        ),
      };
    } catch {
      console.error("Failed to parse checklist:", generatedText);
      return {
        success: false,
        error: "Failed to parse AI response. Please try again.",
      };
    }
  } catch (error) {
    console.error("Gemini API request failed:", error);
    return {
      success: false,
      error: "Failed to connect to AI service. Check your internet connection.",
    };
  }
}

/**
 * Check if Gemini API is configured
 */
export function isGeminiConfigured(): boolean {
  return !!process.env.VUE_APP_GEMINI_API_KEY;
}

export interface GenerateFullBeastOptions {
  theme?: string; // Optional theme/concept hint
}

export interface FullBeastResponse {
  success: boolean;
  name?: string;
  checklist?: string[];
  error?: string;
}

/**
 * Generate a complete beast with name and checklist in one API call
 * More efficient than calling generateMonsterName and generateChecklistFromName separately
 */
export async function generateFullBeast(
  options: GenerateFullBeastOptions = {}
): Promise<FullBeastResponse> {
  const apiKey = process.env.VUE_APP_GEMINI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "Gemini API key not configured. Add VUE_APP_GEMINI_API_KEY to your .env file.",
    };
  }

  const themeHint = options.theme
    ? `The beast should be themed around: "${options.theme}".`
    : "Choose a random household chore category (like laundry, dishes, cleaning, trash, yard work, etc.).";

  const prompt = `You are a creative game designer for a family chore gamification app.
Generate a complete "beast" (monster) that represents a set of household chores.

${themeHint}

Create:
1. A creative, kid-friendly monster name that's a playful pun or portmanteau (like "Socktopus" for socks, "Dust Dragon" for dusting). Think Earthbound style. Be creative - don't just add "zilla" to things.
2. A list of 3-5 specific, actionable chores related to that theme.

Respond with ONLY a JSON object in this exact format:
{
  "name": "MonsterName",
  "checklist": ["Task 1", "Task 2", "Task 3"]
}

No markdown, no explanation, just the JSON.`;

  try {
    const url = `${GEMINI_API_URL}?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 300,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini API error:", response.status, errorData);
      return {
        success: false,
        error: `API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    const generatedText =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!generatedText) {
      return {
        success: false,
        error: "No response generated. Please try again.",
      };
    }

    // Parse the JSON response
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanedText = generatedText;
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText
          .replace(/```json?\n?/g, "")
          .replace(/```/g, "");
      }

      const beast = JSON.parse(cleanedText.trim());

      if (!beast.name || !Array.isArray(beast.checklist)) {
        throw new Error("Invalid response format");
      }

      return {
        success: true,
        name: beast.name,
        checklist: beast.checklist.filter(
          (item: string) => typeof item === "string" && item.trim()
        ),
      };
    } catch {
      console.error("Failed to parse beast:", generatedText);
      return {
        success: false,
        error: "Failed to parse AI response. Please try again.",
      };
    }
  } catch (error) {
    console.error("Gemini API request failed:", error);
    return {
      success: false,
      error: "Failed to connect to AI service. Check your internet connection.",
    };
  }
}

export interface GenerateScheduleOptions {
  taskName: string;
  beastName?: string;
  checklist?: string[];
}

export interface ScheduleResponse {
  success: boolean;
  scheduleType?: "once" | "daily" | "weekly" | "custom";
  frequency?: number; // For custom (e.g., 2 times per day)
  periodType?: "day" | "week" | "month" | "year"; // For custom
  periodNumber?: number; // For custom (e.g., every 2 weeks)
  days?: string[]; // For weekly (sun, mon, etc.)
  reasoning?: string; // Why AI chose this
  error?: string;
}

/**
 * Generate a recommended schedule based on a task name
 */
export async function generateSchedule(
  options: GenerateScheduleOptions
): Promise<ScheduleResponse> {
  const apiKey = process.env.VUE_APP_GEMINI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: "Gemini API key not configured.",
    };
  }

  const taskName = options.taskName || "";
  if (!taskName.trim()) {
    return {
      success: false,
      error: "Task name is required.",
    };
  }

  let context = `Task: "${taskName}"\n`;
  if (options.beastName) {
    context += `Beast/Monster Name: "${options.beastName}"\n`;
  }
  if (options.checklist && options.checklist.length > 0) {
    context += `Sub-tasks/Checklist:\n- ${options.checklist.join("\n- ")}\n`;
  }

  const prompt = `You are a scheduling expert for a gamified chore app.
Analyze the following Quest details and determine the most logical recurrence schedule.

${context}

Options:
1. "once" - One-time tasks (fix door, build shed)
2. "daily" - Things done every day (brush teeth, make bed)
3. "weekly" - Things done on specific days (trash day, water plants, laundry)
4. "custom" - Complex (every 2 weeks, twice a month)

Return ONLY a JSON object:
{
  "scheduleType": "once" | "daily" | "weekly" | "custom",
  "frequency": number (optional, default 1. e.g. 2 times per day),
  "periodType": "day" | "week" | "month" | "year" (for custom),
  "periodNumber": number (for custom, e.g. 1 for every week, 2 for every other week),
  "days": ["mon", "tue", ...] (for weekly, use sun,mon,tue,wed,thu,fri,sat),
  "reasoning": "Short explanation (MAX 10 words) referencing specific details provided."
}

Examples:
- "Take out trash" -> {"scheduleType": "weekly", "days": ["tue"], "reasoning": "Trash is usually weekly"}
- "Brush teeth" -> {"scheduleType": "daily", "frequency": 2, "reasoning": "Hygiene is daily"}
- "Mow lawn" -> {"scheduleType": "custom", "frequency": 1, "periodType": "week", "periodNumber": 2, "reasoning": "Bi-weekly maintenance"}
- "Build Lego set" -> {"scheduleType": "once", "reasoning": "One-time project"}

Use the sub-tasks or beast name to infer context (e.g., if checklist has "Water plants", it might be weekly).`;

  try {
    const url = `${GEMINI_API_URL}?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 200 },
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `API error: ${response.status}`,
      };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) return { success: false, error: "No response" };

    const cleanJson = text
      .replace(/```json?\n?/g, "")
      .replace(/```/g, "")
      .trim();
    const result = JSON.parse(cleanJson);

    return {
      success: true,
      ...result,
    };
  } catch (error) {
    console.error("Gemini Schedule Error:", error);
    return {
      success: false,
      error: "Failed to generate schedule.",
    };
  }
}

export default {
  generateMonsterName,
  generateChecklistFromName,
  generateFullBeast,
  generateSchedule,
  isGeminiConfigured,
};
