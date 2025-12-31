import { play$fx } from "@/assets/fx";
import { ChatMessage } from "@/lib/databases/ChatDb";
import debug from "@/lib/utils/debug";

/**
 * ChatEngine - Central system for processing and formatting chat messages
 */
export class ChatEngine {
    private static instance: ChatEngine;

    private constructor() { }

    public static getInstance(): ChatEngine {
        if (!ChatEngine.instance) {
            ChatEngine.instance = new ChatEngine();
        }
        return ChatEngine.instance;
    }

    /**
     * Process an incoming message (e.g., play sounds, format text)
     */
    public processIncomingMessage(message: ChatMessage): void {
        debug.log(`ChatEngine: Processing message from ${message.senderName}`);

        // Play message sound
        play$fx('text');

        // Additional processing logic can go here (mentions, links, etc.)
    }

    /**
     * Format a timestamp for display
     */
    public formatTime(timestamp: number): string {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        }).format(new Date(timestamp));
    }
}

export const chatEngine = ChatEngine.getInstance();
export default ChatEngine;
