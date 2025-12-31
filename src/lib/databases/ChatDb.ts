import { Drivers, Storage } from "@ionic/storage";
import DbStorageApi from "./DbStorageApi";

export const chatStorage = new Storage({
    name: "__chat",
    driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export interface ChatMessage {
    id: string;
    roomId: string;
    senderId: string;
    senderName: string;
    avatar?: string;
    text: string;
    timestamp: number;
}

export class ChatDb extends DbStorageApi {
    constructor() {
        super(chatStorage);
    }

    public async saveMessage(message: ChatMessage): Promise<void> {
        await this.set(message.id, message);
    }

    public async getMessagesByRoom(roomId: string, limit: number = 50): Promise<ChatMessage[]> {
        const allMessages = await this.getAll() as ChatMessage[];
        const filtered = allMessages
            .filter(m => m.roomId === roomId)
            .sort((a, b) => a.timestamp - b.timestamp);

        return limit > 0 ? filtered.slice(-limit) : filtered;
    }

    public async deleteMessage(id: string): Promise<void> {
        await this.remove(id);
    }
}

export const chatDb = new ChatDb();
export default ChatDb;
