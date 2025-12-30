<template>
    <!-- Blur Backdrop - only renders when open -->
    <xp-blur-backdrop :show="isOpen" :z-index="backdropZIndex" @close="onBackdropClick" />

    <!-- Modal - Ionic handles its own lifecycle -->
    <ion-modal ref="modal" :is-open="isOpen" :class="['xp-rpg-modal', modalClass]" :show-backdrop="false"
        :backdrop-dismiss="false" @ionModalDidDismiss="handleDismiss">
        <ion-card class="rpg-modal-card animated-card">
            <ion-card-header>
                <xp-close-button v-if="showCloseButton" size="md" color="light" class="close-icon" @click="dismiss"
                    :play-sound="false" />

                <div v-if="$slots.icon || icon" class="header-icon">
                    <slot name="icon">
                        <i v-if="icon" :class="['fad', icon]"></i>
                    </slot>
                </div>

                <ion-card-title v-if="title || $slots.title" class="card-title">
                    <slot name="title">{{ title }}</slot>
                </ion-card-title>
            </ion-card-header>

            <ion-card-content>
                <slot></slot>

                <div v-if="$slots.footer" class="button-group">
                    <slot name="footer"></slot>
                </div>
            </ion-card-content>
        </ion-card>
    </ion-modal>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import {
    IonModal,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
} from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
import XpBlurBackdrop from "@/components/atoms/Overlay/XpBlurBackdrop.vue";

export default defineComponent({
    name: "xp-rpg-modal",
    components: {
        IonModal,
        IonCard,
        IonCardHeader,
        IonCardTitle,
        IonCardContent,
        XpCloseButton,
        XpBlurBackdrop,
    },
    props: {
        isOpen: {
            type: Boolean,
            default: false,
        },
        title: {
            type: String,
            default: "",
        },
        icon: {
            type: String,
            default: "",
        },
        modalClass: {
            type: String,
            default: "",
        },
        backdropDismiss: {
            type: Boolean,
            default: true,
        },
        showCloseButton: {
            type: Boolean,
            default: true,
        },
        backdropZIndex: {
            type: Number,
            default: 900,
        },
    },
    emits: ["close"],
    setup(props, { emit }) {
        const modal = ref(null);

        const handleDismiss = () => {
            emit("close");
        };

        const dismiss = () => {
            play$fx("no");
            const modalEl = (modal.value as any)?.$el;
            if (modalEl) {
                modalEl.dismiss();
            } else {
                emit("close");
            }
        };

        const onBackdropClick = () => {
            if (props.backdropDismiss) {
                dismiss();
            }
        };

        return {
            modal,
            handleDismiss,
            dismiss,
            onBackdropClick,
        };
    },
});
</script>

<style lang="scss">
// Global styles for the modal to target shadow DOM
ion-modal.xp-rpg-modal {
    --backdrop-opacity: 0;
    --width: fit-content;
    --height: fit-content;
    --max-width: 450px;
    --min-width: 320px;
    --border-radius: 16px;
    --box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    z-index: 10000;
}
</style>

<style lang="scss" scoped>
.rpg-modal-card {
    margin: auto;
    background: linear-gradient(145deg, #1e1e2e, #2a2a3e);
    border-radius: 16px;
    box-shadow: none;
    overflow: visible;
    width: 95%;
    max-width: 500px;
    font-family: "Year Is 199X", "Apple Kid", sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}

ion-card-header {
    position: relative;
    padding: 32px 24px 12px;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.close-icon {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 10;
}

.header-icon {
    display: flex;
    justify-content: center;
    margin-bottom: 12px;

    i {
        font-size: 3.5rem;
        color: rgba(255, 255, 255, 0.9);
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
    }
}

.card-title {
    text-align: center;
    font-size: 1.5rem !important;
    font-weight: normal;
    letter-spacing: 2px;
    text-transform: uppercase !important;
    margin: 0;
}

ion-card-content {
    // padding: 0 24px 32px;
    font-family: "StatusPlz", sans-serif !important;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    letter-spacing: 2px;
}

.button-group {
    display: flex;
    gap: 16px;
    margin-top: 24px;
    width: 100%;
    justify-content: center;
    font-family: "Year Is 199X", sans-serif;

    ion-button {
        --font-family: "Year Is 199X", sans-serif;
    }
}

.animated-card {
    animation: modalEnter 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalEnter {
    from {
        opacity: 0;
        transform: scale(0.9) translateY(20px);
    }

    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}
</style>
