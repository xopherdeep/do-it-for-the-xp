<template>
    <div class="xp-chat-message" :class="{ 'is-own': isOwn }">
        <div class="message-avatar" v-if="!isOwn">
            <ion-avatar>
                <img :src="avatarUrl" />
            </ion-avatar>
        </div>

        <div class="message-body">
            <div class="message-info" v-if="!isOwn">
                <span class="sender-name">{{ message.senderName }}</span>
                <span class="timestamp">{{ formattedTime }}</span>
            </div>

            <div class="message-bubble rpg-box" :class="{ 'rpg-box-blue': isOwn, 'rpg-box-flat': !isOwn }">
                <div class="text">{{ message.text }}</div>
                <div class="timestamp-inline" v-if="isOwn">{{ formattedTime }}</div>
            </div>
        </div>

        <div class="message-avatar" v-if="isOwn">
            <ion-avatar>
                <img :src="avatarUrl" />
            </ion-avatar>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from 'vue';
import { ChatMessage } from '@/lib/databases/ChatDb';
import { chatEngine } from '@/lib/engine/core/ChatEngine';
import { useUserStore } from '@/lib/store/stores/user';
import ionic from "@/lib/mixins/ionic";

export default defineComponent({
    name: 'XpChatMessage',
    mixins: [ionic],
    props: {
        message: {
            type: Object as PropType<ChatMessage>,
            required: true
        }
    },
    setup(props) {
        const userStore = useUserStore();

        const isOwn = computed(() => props.message.senderId === userStore.currentUser.id);

        const avatarUrl = computed(() => {
            if (props.message.avatar) {
                return require(`@/assets/images/avatars/${props.message.avatar}.svg`);
            }
            return require('@/assets/images/avatars/001-gamer.svg');
        });

        const formattedTime = computed(() => chatEngine.formatTime(props.message.timestamp));

        return {
            isOwn,
            avatarUrl,
            formattedTime
        };
    }
});
</script>

<style lang="scss" scoped>
.xp-chat-message {
    display: flex;
    margin-bottom: 1rem;
    width: 100%;
    gap: 0.75rem;
    align-items: flex-end;

    &.is-own {
        justify-content: flex-end;
    }

    .message-avatar {
        flex-shrink: 0;

        ion-avatar {
            width: 40px;
            height: 40px;
            border: 2px solid rgba(255, 255, 255, 0.2);
        }
    }

    .message-body {
        display: flex;
        flex-direction: column;
        max-width: 70%;
    }

    .message-info {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.25rem;
        font-size: 0.8rem;

        .sender-name {
            font-weight: bold;
            color: var(--ion-color-secondary);
        }

        .timestamp {
            opacity: 0.6;
        }
    }

    .message-bubble {
        padding: 0.75rem 1rem;
        position: relative;
        font-size: 1rem;
        line-height: 1.4;

        .text {
            word-break: break-word;
        }

        &.rpg-box-blue {
            background: linear-gradient(180deg, #4a90e2 0%, #357abd 100%);
            color: white;
            border-color: #2a5a8e;
            border-radius: 1.25rem 1.25rem 0.25rem 1.25rem;
        }

        &.rpg-box-flat {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(5px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 1.25rem 1.25rem 1.25rem 0.25rem;
        }
    }

    .timestamp-inline {
        font-size: 0.7rem;
        opacity: 0.7;
        margin-top: 0.25rem;
        text-align: right;
    }
}
</style>
