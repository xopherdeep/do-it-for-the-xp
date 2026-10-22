import { defineStore } from 'pinia';
import { ref, computed, onScopeDispose } from 'vue';
import { chatDb, ChatMessage } from '@/lib/databases/ChatDb';
import { chatEngine } from '@/lib/engine/core/ChatEngine';
import { v4 as uuidv4 } from 'uuid';
import debug from '@/lib/utils/debug';
import { onRecordsLanded } from '@/lib/services/sync/recordSignals';
import { useUserStore } from './user';

/** The one family room every hero and Game Master shares. */
export const FAMILY_CHAT_ROOM = 'family-chat';
/** The sender id of system lines (casts, announcements) that no person wrote. */
export const TOWN_CRIER_ID = 'town-crier';

export const useChatStore = defineStore('chat', () => {
    const userStore = useUserStore();
    const messages = ref<Record<string, ChatMessage[]>>({});
    const isLoading = ref(false);

    /**
     * Initialize messages for a specific room
     */
    async function initRoom(roomId: string) {
        const isRoomLoaded = !!messages.value[roomId];
        if (isRoomLoaded) return;

        try {
            const roomMessages = await chatDb.getMessagesByRoom(roomId, 50);
            messages.value[roomId] = roomMessages;
        } catch (error) {
            debug.error(`[chat] failed to load messages for room ${roomId}`, error);
            messages.value[roomId] = [];
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Send a message to a room
     */
    async function sendMessage(roomId: string, text: string) {
        const currentUser = userStore.currentUser;
        const heroId = currentUser.id;
        if (!heroId) return;

        const fullUser = userStore.getUserById(heroId);

        const message: ChatMessage = {
            id: uuidv4(),
            roomId,
            senderId: heroId,
            senderName: fullUser?.name?.nick || 'Unknown',
            avatar: fullUser?.avatar,
            text,
            timestamp: Date.now()
        };

        // Save to DB
        await chatDb.saveMessage(message);

        // Update state
        const hasRoom = !!messages.value[roomId];
        if (!hasRoom) {
            messages.value[roomId] = [];
        }
        messages.value[roomId].push(message);

        // Process via Engine (play sound etc.)
        chatEngine.processIncomingMessage(message);
    }

    /**
     * Post a Town Crier line ("Dad cast Video Games") to a room. Nobody has to be logged in:
     * the sender is the Town Crier, not the current hero.
     */
    async function postSystemLine(roomId: string, text: string): Promise<ChatMessage> {
        const message: ChatMessage = {
            id: uuidv4(),
            roomId,
            senderId: TOWN_CRIER_ID,
            senderName: 'Town Crier',
            text,
            timestamp: Date.now(),
            kind: 'system'
        };

        // Load the room's history first: a room that holds only this line would never load the rest (initRoom skips loaded rooms)
        await initRoom(roomId);
        await chatDb.saveMessage(message);

        const hasRoom = !!messages.value[roomId];
        if (!hasRoom) {
            messages.value[roomId] = [];
        }
        messages.value[roomId].push(message);

        chatEngine.processIncomingMessage(message);
        return message;
    }

    /**
     * Chat another device posted landed here (Family Sync: kid phones write the chat too): every open room is read again,
     * as many messages as it shows (at least a page)
     */
    async function reloadRooms(): Promise<void> {
        for (const roomId of Object.keys(messages.value)) {
            try {
                const shown = Math.max(50, messages.value[roomId]?.length ?? 0);
                messages.value[roomId] = await chatDb.getMessagesByRoom(roomId, shown);
            } catch (error) {
                debug.error(`[chat] failed to read room ${roomId} again`, error);
            }
        }
    }
    const stopLandings = onRecordsLanded(({ store }) => {
        const isChat = store === '__chat';
        if (isChat) void reloadRooms();
    });
    onScopeDispose(stopLandings);

    const hasMore = ref<Record<string, boolean>>({});

    /**
     * Load older messages
     */
    async function loadMoreMessages(roomId: string) {
        if (isLoading.value) return;

        const currentMessages = messages.value[roomId] || [];
        const limit = currentMessages.length + 50;

        isLoading.value = true;
        try {
            const olderMessages = await chatDb.getMessagesByRoom(roomId, limit);

            const hasNoOlder = olderMessages.length <= currentMessages.length;
            if (hasNoOlder) {
                hasMore.value[roomId] = false;
            } else {
                messages.value[roomId] = olderMessages;
                hasMore.value[roomId] = true;
            }
        } catch (error) {
            debug.error(`[chat] failed to load more messages for room ${roomId}`, error);
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Get messages for a room
     */
    const getRoomMessages = computed(() => (roomId: string) => messages.value[roomId] || []);
    const canLoadMore = computed(() => (roomId: string) => hasMore.value[roomId] !== false);

    return {
        messages,
        isLoading,
        initRoom,
        sendMessage,
        postSystemLine,
        loadMoreMessages,
        getRoomMessages,
        canLoadMore
    };
});
