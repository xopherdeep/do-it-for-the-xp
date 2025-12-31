<template>
    <div class="xp-chat-input-container rpg-box">
        <ion-item lines="none" class="input-item">
            <ion-textarea v-model="text" placeholder="Type a message..." auto-grow rows="1"
                @keyup.enter.exact="handleSend" class="chat-input" :disabled="disabled"></ion-textarea>

            <ion-button slot="end" fill="clear" @click="handleSend" :disabled="!text.trim() || disabled"
                class="send-button">
                <i class="fad fa-paper-plane fa-2x"></i>
            </ion-button>
        </ion-item>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import ionic from "@/lib/mixins/ionic";

export default defineComponent({
    name: 'XpChatInput',
    mixins: [ionic],
    props: {
        disabled: {
            type: Boolean,
            default: false
        }
    },
    emits: ['send'],
    setup(props, { emit }) {
        const text = ref('');

        const handleSend = () => {
            if (!text.value.trim()) return;
            emit('send', text.value.trim());
            text.value = '';
        };

        return {
            text,
            handleSend
        };
    }
});
</script>

<style lang="scss" scoped>
.xp-chat-input-container {
    padding: 0.5rem;
    background: rgba(20, 20, 25, 0.9) !important;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    margin: 0.5rem;
    border-radius: 12px;

    .input-item {
        --background: transparent;
        --padding-start: 0;
        --inner-padding-end: 0;
    }

    .chat-input {
        --padding-start: 0.75rem;
        --padding-end: 0.75rem;
        font-size: 1rem;
        color: white;
    }

    .send-button {
        --color: var(--ion-color-primary);
        margin: 0;

        &:disabled {
            opacity: 0.3;
        }
    }
}
</style>
