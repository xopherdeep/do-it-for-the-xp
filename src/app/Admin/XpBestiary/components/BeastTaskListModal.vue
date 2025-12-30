<template>
    <ion-header>
        <ion-toolbar class="rpg-box">
            <i slot="start" class="fad fa-clipboard-list fa-lg ml-3 text-tertiary"></i>
            <ion-title>{{ beast.name }}'s Tasks</ion-title>
            <ion-buttons slot="end">
                <ion-button @click="dismiss" color="rpg">
                    <i class="fad fa-times fa-lg"></i>
                </ion-button>
            </ion-buttons>
        </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding bg-slide bg-slide-dark">
        <div class="task-container">
            <div v-if="beast.checklist?.length" class="task-list">
                <div v-for="(task, index) in beast.checklist" :key="index" class="task-item glass-card animate-in"
                    :style="{ '--delay': index * 0.1 + 's' }">
                    <div class="task-bullet">
                        <i class="fad fa-paw-claws"></i>
                    </div>
                    <div class="task-content">
                        {{ task }}
                    </div>
                </div>
            </div>
            <div v-else class="empty-tasks glass-card">
                <i class="fad fa-ghost fa-3x mb-3 text-medium"></i>
                <h3>No Tasks Found</h3>
                <p>This beast has no specific requirements yet.</p>
            </div>
        </div>
    </ion-content>

    <ion-footer>
        <ion-toolbar class="rpg-box">
            <ion-button slot="end" fill="clear" color="rpg" @click="dismiss">
                Close
            </ion-button>
        </ion-toolbar>
    </ion-footer>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { modalController } from '@ionic/vue';
import { Beast } from '@/lib/databases/BestiaryDb';
import ionic from '@/lib/mixins/ionic';

export default defineComponent({
    name: 'BeastTaskListModal',
    mixins: [ionic],
    props: {
        beast: {
            type: Object as PropType<Beast>,
            required: true
        }
    },
    setup() {
        const dismiss = () => modalController.dismiss();
        return { dismiss };
    }
});
</script>

<style lang="scss" scoped>
.task-container {
    max-width: 600px;
    margin: 0 auto;
    padding-bottom: 20px;
}

.task-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.task-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: rgba(var(--ion-color-step-50-rgb), 0.4);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;

    .task-bullet {
        width: 32px;
        height: 32px;
        background: rgba(var(--ion-color-tertiary-rgb), 0.15);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--ion-color-tertiary);
        flex-shrink: 0;
        font-size: 1rem;
    }

    .task-content {
        font-family: inherit;
        font-size: 1rem;
        line-height: 1.4;
        color: white;
    }
}

.empty-tasks {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    text-align: center;

    h3 {
        font-family: var(--xp-font-heading);
        margin: 0 0 8px;
    }

    p {
        color: var(--ion-color-medium);
    }
}

.animate-in {
    opacity: 0;
    transform: translateY(10px);
    animation: slideIn 0.3s forwards;
    animation-delay: var(--delay, 0s);
}

@keyframes slideIn {
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
