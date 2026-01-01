<template>
    <ion-page>
        <ion-content class="ion-no-padding">
            <xp-intro-splash v-if="viewActive" key="gameOverSplash" ref="gameOverSplash" :splash-screens="splashScreens"
                :auto-play="true" :default-duration="4000" :transition-duration="800" :text-speed="40"
                :use-pixel-art-scaling="true" :skip-enabled="true" :show-skip-button="true" :play-intro-sound="true"
                @complete="onComplete" @skip="onSkip" />
        </ion-content>
    </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { useRouter } from "vue-router";
import { IonPage, IonContent } from "@ionic/vue";
import { XpIntroSplash } from "@/components/organisms/IntroSplash";
import type { SplashScreen } from "@/components/organisms/IntroSplash";
import Ionic from "@/lib/mixins/ionic";

export default defineComponent({
    name: "XpGameOver",
    mixins: [Ionic],
    components: {
        XpIntroSplash,
        IonPage,
        IonContent,
    },
    setup() {
        const router = useRouter();
        const viewActive = ref(false);
        const duration = 3000;

        // Define the splash screens for the game over sequence
        const splashScreens = ref<SplashScreen[]>([
            {
                image: require("@/assets/images/about/darkness.png"),
                text: "You have been defeated...",
                alt: "Game Over",
                duration,
                soundEffect: "defeat",
            },
            {
                image: require("@/assets/images/midjourney/hospital.png"),
                text: "The hospital will patch you up.",
                alt: "To the hospital",
                duration,
            },
        ]);

        // Handle completion
        const onComplete = () => {
            navigateToHospital();
        };

        // Handle skip
        const onSkip = () => {
            navigateToHospital();
        };

        // Navigate to hospital
        const navigateToHospital = () => {
            router.push({ name: "hospital" });
        };

        return {
            viewActive,
            splashScreens,
            onComplete,
            onSkip,
        };
    },

    // Use Ionic-specific lifecycle hooks
    ionViewWillEnter() {
        // Ensure intro will play when entering the view
        this.viewActive = false;
        // Short delay to ensure a clean start
        setTimeout(() => {
            this.viewActive = true;
        }, 100);
    },

    // This is called when leaving the view - Ionic specific
    ionViewWillLeave() {
        // Deactivate the component when navigating away
        this.viewActive = false;
    },
});
</script>

<style scoped>
/* Add any specific overrides here if needed */
</style>
