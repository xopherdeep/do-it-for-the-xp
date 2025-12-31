<template>
    <div class="xp-chat-list" ref="scrollContainer">
        <div v-if="canLoadMore" class="load-more-container">
            <ion-button fill="clear" size="small" @click="$emit('loadMore')" :disabled="isLoading">
                <i v-if="isLoading" class="fad fa-spinner-third fa-spin mr-2"></i>
                {{ isLoading ? 'Loading...' : 'Load Older Messages' }}
            </ion-button>
        </div>

        <div v-if="messages.length === 0 && !isLoading" class="empty-chat rpg-box">
            <i class="fad fa-comments-alt fa-3x"></i>
            <p>No messages yet. Start the conversation!</p>
        </div>

        <xp-chat-message v-for="msg in messages" :key="msg.id" :message="msg" />
    </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, watch, onMounted, nextTick } from 'vue';
import { ChatMessage } from '@/lib/databases/ChatDb';
import XpChatMessage from './XpChatMessage.vue';

export default defineComponent({
    name: 'XpChatList',
    components: { XpChatMessage },
    props: {
        messages: {
            type: Array as PropType<ChatMessage[]>,
            required: true
        },
        canLoadMore: {
            type: Boolean,
            default: false
        },
        isLoading: {
            type: Boolean,
            default: false
        }
    },
    emits: ['loadMore'],
    setup(props) {
        const scrollContainer = ref<HTMLElement | null>(null);
        const scrollToBottom = async (forceAuto = false) => {
            await nextTick();
            if (scrollContainer.value) {
                // Ensure the scroll height is fully updated
                await nextTick();

                scrollContainer.value.scrollTo({
                    top: scrollContainer.value.scrollHeight,
                    behavior: forceAuto ? 'auto' : 'smooth'
                });
            }
        };

        const lastProcessedId = ref<string | null>(null);

        // Watch for new messages
        watch(() => props.messages, (newVal) => {
            if (!newVal || !newVal.length) {
                lastProcessedId.value = null;
                return;
            }

            const newLastId = newVal[newVal.length - 1]?.id;
            const isInitialLoad = lastProcessedId.value === null;

            if (newLastId !== lastProcessedId.value) {
                scrollToBottom(isInitialLoad);
                lastProcessedId.value = newLastId;
            }
        }, { deep: true, immediate: true });

        onMounted(() => {
            // Initial scroll (redundant with immediate watch but safe)
            scrollToBottom(true);

            // Re-scroll on any image load inside the container
            if (scrollContainer.value) {
                scrollContainer.value.addEventListener('load', (e) => {
                    if ((e.target as HTMLElement).tagName === 'IMG') {
                        scrollToBottom(false);
                    }
                }, true);
            }
        });

        return {
            scrollContainer,
            // Re-export props for explicit template access if needed by some linters, 
            // though standard Vue 3 doesn't strictly require this if defined in props.
        };
    }
});
</script>

<style lang="scss" scoped>
.xp-chat-list {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    // background: rgba(0, 0, 0, 0.2);

    .load-more-container {
        display: flex;
        justify-content: center;
        margin-bottom: 1rem;

        ion-button {
            --color: var(--ion-color-medium);
            font-size: 0.8rem;
        }
    }

    // Custom scrollbar
    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
    }

    .empty-chat {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin: auto;
        padding: 2rem;
        opacity: 0.5;
        text-align: center;

        i {
            margin-bottom: 1rem;
        }
    }
}
</style>
