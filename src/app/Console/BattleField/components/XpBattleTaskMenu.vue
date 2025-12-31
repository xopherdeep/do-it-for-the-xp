<template>
    <div class="xp-battle-task-menu">
        <div class="menu-container rpg-box">
            <div class="menu-header">
                <i class="fad fa-swords header-icon"></i>
                <span class="header-text">SELECT ATTACK</span>
            </div>

            <div class="menu-content">
                <div v-if="!activeTasks.length" class="empty-state">
                    No available attacks!
                </div>

                <div v-for="task in activeTasks" :key="task.id" class="battle-task-item"
                    :class="{ 'is-disabled': task.completed || task.isCompleted }" @click="handleTaskClick(task)">
                    <div class="task-icon-wrapper">
                        <i class="fad fa-bolt" v-if="!task.completed && !task.isCompleted"></i>
                        <i class="fad fa-check" v-else></i>
                    </div>
                    <div class="task-info">
                        <div class="task-name">{{ task.label || task.name }}</div>
                        <div class="task-cost" v-if="!task.completed && !task.isCompleted">
                            <span>Bash</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="menu-footer">
                <ion-button color="medium" fill="clear" size="small" @click="$emit('cancel')">
                    Cancel
                </ion-button>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from 'vue';
import { alertController, IonButton } from '@ionic/vue';

export default defineComponent({
    name: 'XpBattleTaskMenu',
    components: {
        IonButton
    },
    props: {
        enemyName: {
            type: String,
            default: 'Enemy'
        },
        tasks: {
            type: Array as PropType<any[]>,
            default: () => []
        }
    },
    emits: ['cancel', 'attack-start', 'attack-end', 'task-complete'],
    setup(props, { emit }) {
        const activeTasks = computed(() => props.tasks);

        const handleTaskClick = async (task: any) => {
            if (task.completed || task.isCompleted) return;

            const alert = await alertController.create({
                header: 'Execute Attack?',
                message: `Do you want to unleash "${task.label || task.name}" on ${props.enemyName}?`,
                buttons: [
                    {
                        text: 'Cancel',
                        role: 'cancel'
                    },
                    {
                        text: 'ATTACK!',
                        handler: () => executeAttack(task)
                    }
                ]
            });

            await alert.present();
        };

        const executeAttack = async (task: any) => {
            // 1. Notify start (for animations)
            emit('attack-start', task);

            // 2. Emit task-complete with the task ID
            // The parent (BattleField) will call finishCombatTask which updates BattleService
            emit('task-complete', task.id);

            // 3. Close the menu via attack-end
            emit('attack-end', { success: true, taskId: task.id, taskName: task.name || task.label });
        };

        return {
            activeTasks,
            handleTaskClick
        };
    }
});
</script>

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;

.xp-battle-task-menu {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 350px;
    z-index: 2000;
}

.menu-container {
    @include eb-box();
    background: rgba(0, 0, 0, 0.9);
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.menu-header {
    padding: 12px;
    background: var(--ion-color-danger);
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 2px solid rgba(255, 255, 255, 0.2);

    .header-icon {
        color: white;
        font-size: 1.2rem;
    }

    .header-text {
        font-family: 'StatusPlz', sans-serif;
        color: white;
        font-size: 1.2rem;
        letter-spacing: 1px;
        text-transform: uppercase;
    }
}

.menu-content {
    padding: 10px;
    max-height: 400px;
    overflow-y: auto;
}

.battle-task-item {
    display: flex;
    align-items: center;
    padding: 12px;
    margin-bottom: 8px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover:not(.is-disabled) {
        background: rgba(255, 255, 255, 0.1);
        transform: translateX(4px);
        border-color: var(--ion-color-secondary);
    }

    &.is-disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background: rgba(0, 0, 0, 0.3);

        .task-name {
            text-decoration: line-through;
        }
    }

    .task-icon-wrapper {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        margin-right: 12px;

        i {
            color: var(--ion-color-warning);
        }
    }

    .task-info {
        flex: 1;
        display: flex;
        justify-content: space-between;
        align-items: center;

        .task-name {
            font-family: 'Apple Kid', sans-serif;
            font-size: 1rem;
            color: white;
        }

        .task-cost {
            font-size: 0.8rem;
            color: var(--ion-color-medium);
            font-family: 'StatusPlz', sans-serif;
        }
    }
}

.menu-footer {
    padding: 8px;
    display: flex;
    justify-content: center;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
