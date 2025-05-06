<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/xp-support"></ion-back-button>
        </ion-buttons>
        <ion-title>Developer Tools</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="bg-slide">
      <ion-router-outlet ref="outlet"></ion-router-outlet>
      <div class="container">
        <ion-card class="intro-card">
          <ion-card-header>
            <ion-card-title>Developer Tools Dashboard</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>
              Welcome to the Developer Tools Dashboard. This interface provides access to various development
              and debugging tools for the Do It for the XP application.
            </p>
          </ion-card-content>
        </ion-card>

        <ion-list>
          <ion-item-divider>
            <ion-label>Component Development</ion-label>
          </ion-item-divider>

          <ion-item
            button
            detail
            @click="navigateTo('/dev/component-showcase')"
          >
            <ion-icon
              :icon="cubeOutline"
              slot="start"
            ></ion-icon>
            <ion-label>
              <h2>Component Showcase</h2>
              <p>View and interact with UI components in isolation</p>
            </ion-label>
          </ion-item>

          <ion-item
            button
            detail
            @click="navigateTo('/dev/dialog-demo')"
          >
            <ion-icon
              :icon="chatboxOutline"
              slot="start"
            ></ion-icon>
            <ion-label>
              <h2>Dialog Demo</h2>
              <p>Test and debug dialog and notification systems</p>
            </ion-label>
          </ion-item>

          <ion-item
            button
            detail
            @click="navigateTo('/dev/intro-splash')"
          >
            <ion-icon
              :icon="imageOutline"
              slot="start"
            ></ion-icon>
            <ion-label>
              <h2>Intro Splash Demo</h2>
              <p>Test and customize 90s-style game intro splash screens</p>
            </ion-label>
          </ion-item>

          <ion-item
            button
            detail
            @click="navigateTo('/rpg-text-demo')"
          >
            <ion-icon
              :icon="keypadOutline"
              slot="start"
            ></ion-icon>
            <ion-label>
              <h2>RPG Text Demo</h2>
              <p>Test the typing text animation system</p>
            </ion-label>
          </ion-item>

          <ion-item
            button
            detail
            @click="navigateTo('/dev/abilities')"
          >
            <ion-icon
              :icon="colorWandOutline"
              slot="start"
            ></ion-icon>
            <ion-label>
              <h2>Ability Manager Dev Tools</h2>
              <p>Test and debug the ability components with sample data</p>
            </ion-label>
          </ion-item>

          <ion-item
            button
            detail
            @click="navigateTo('/dev/soundfx')"
          >
            <ion-icon
              :icon="volumeHighOutline"
              slot="start"
            ></ion-icon>
            <ion-label>
              <h2>Sound FX Dev Tools</h2>
              <p>Test and preview all sound effects and music</p>
            </ion-label>
          </ion-item>

          <ion-item-divider>
            <ion-label>World & Environment Tools</ion-label>
          </ion-item-divider>

          <ion-item
            button
            detail
            @click="navigateTo('/dev/weatherfx')"
          >
            <ion-icon
              :icon="cloudOutline"
              slot="start"
            ></ion-icon>
            <ion-label>
              <h2>WeatherFX Dev Tools</h2>
              <p>Test and debug weather effects and animations</p>
            </ion-label>
          </ion-item>

          <ion-item
            button
            detail
            @click="navigateTo('/dev/dungeon-background')"
          >
            <ion-icon
              :icon="gridOutline"
              slot="start"
            ></ion-icon>
            <ion-label>
              <h2>Dungeon Background Designer</h2>
              <p>Generate and test procedural temple/dungeon backgrounds</p>
            </ion-label>
          </ion-item>

          <ion-item
            button
            detail
            @click="navigateTo('/xp-demo')"
          >
            <ion-icon
              :icon="globeOutline"
              slot="start"
            ></ion-icon>
            <ion-label>
              <h2>World Showcase Demo</h2>
              <p>View a showcase of all game worlds</p>
            </ion-label>
          </ion-item>

          <ion-item-divider>
            <ion-label>Battle System Tools</ion-label>
          </ion-item-divider>

          <ion-item
            button
            detail
            @click="navigateTo('/dev/battleroom')"
          >
            <ion-icon
              :icon="flashOutline"
              slot="start"
            ></ion-icon>
            <ion-label>
              <h2>Battleroom Dev Tools</h2>
              <p>Test battle interactions, animations and systems</p>
            </ion-label>
          </ion-item>
        </ion-list>

        <ion-card>
          <ion-card-header>
            <ion-card-title>System Information</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="system-info">
              <p><strong>App Version:</strong> {{ appVersion }}</p>
              <p><strong>Environment:</strong> {{ environment }}</p>
              <p><strong>Platform:</strong> {{ platform }}</p>
              <p><strong>Last Build:</strong> {{ buildDate }}</p>
              <p><strong>Build Task:</strong> <ion-button
                  size="small"
                  @click="runBuild"
                >Run Build</ion-button></p>
              <p><strong>Battleroom:</strong>
                <ion-button
                  size="small"
                  @click="runBattleroomServe"
                >Serve</ion-button>
                <ion-button
                  size="small"
                  @click="runBattleroomBuild"
                >Build</ion-button>
                <ion-button
                  size="small"
                  @click="runBattleroomTest"
                >Test</ion-button>
              </p>
            </div>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref } from 'vue';
  import { useRouter } from 'vue-router';
  import {
    cloudOutline, flashOutline, cubeOutline, chatboxOutline, keypadOutline,
    imageOutline, colorWandOutline, volumeHighOutline, globeOutline, gridOutline
  } from 'ionicons/icons';
  import { isPlatform } from '@ionic/vue';
  import { useToast } from '@/hooks/useToast';

  import packageJson from '@/../package.json'; 
  import Ionic from '@/mixins/ionic';
import debug from '@/lib/utils/debug';

  export default defineComponent({
    name: 'DevTools',
    mixins: [ Ionic ],
    setup() {
      const router = useRouter();
      const { showToast } = useToast();
      const appVersion = ref(packageJson.version || '0.0.0');
      const environment = ref(process.env.NODE_ENV || 'development');
      const platform = ref(isPlatform('ios') ? 'iOS' : isPlatform('android') ? 'Android' : 'Web');
      const buildDate = ref(new Date().toLocaleDateString());
      const isTaskRunning = ref(false);

      const navigateTo = (path: string) => {
        router.push(path);
      };

      // Helper to run VS Code tasks
      const runVsCodeTask = async (taskId: string, taskName: string) => {
        if (isTaskRunning.value) {
          showToast('A task is already running. Please wait.');
          return;
        }

        try {
          isTaskRunning.value = true;
          showToast(`Running ${taskName} task...`);

          // This would typically connect to a service that interfaces with VS Code tasks
          // For demonstration, we're using a simulated approach
          await fetch(`/api/vscode-tasks/run`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              workspaceFolder: '/home/xopher/www/x/xp/do-it-for-the-xp',
              taskId: taskId
            }),
          });

          showToast(`${taskName} task completed successfully`);
        } catch (error) {
          debug.error(`Failed to run ${taskName} task:`, error);
          showToast(`Error running ${taskName} task. Check console for details.`);
        } finally {
          isTaskRunning.value = false;
        }
      };

      // VS Code task runners
      const runBuild = () => runVsCodeTask('shell: build', 'Build');
      const runBattleroomServe = () => runVsCodeTask('shell: battleroom:serve', 'Battleroom Serve');
      const runBattleroomBuild = () => runVsCodeTask('shell: battleroom:build', 'Battleroom Build');
      const runBattleroomTest = () => runVsCodeTask('shell: battleroom:test', 'Battleroom Test');

      return {
        navigateTo,
        appVersion,
        environment,
        platform,
        buildDate,
        cloudOutline,
        flashOutline,
        cubeOutline,
        chatboxOutline,
        keypadOutline,
        imageOutline,
        colorWandOutline,
        volumeHighOutline,
        globeOutline,
        gridOutline,
        runBuild,
        runBattleroomServe,
        runBattleroomBuild,
        runBattleroomTest,
        isTaskRunning
      };
    }
  });
</script>

<style lang="scss" scoped>
  .container {
    padding: 16px;
    max-width: 800px;
    margin: 0 auto;
  }

  .intro-card {
    margin-bottom: 24px;
  }

  .system-info {
    p {
      margin: 8px 0;
    }
  }

  ion-item-divider {
    font-weight: bold;
    --background: var(--ion-color-light);
    margin-top: 16px;
  }
</style>