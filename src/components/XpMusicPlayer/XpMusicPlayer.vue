<template>
  <div class="xp-music-player">
    <div class="music-player-container">
      <div class="player-controls relative">
        <transition name="slide-fade" mode="out-in">
          <div v-if="showTrackInfo && isInfoVisible" class="track-info rpg-box">
            <div class="track-title rpg-box" :class="{ 'marquee': shouldMarquee }">
              <span>{{ currentTrackTitle }}</span>
              <span v-if="shouldMarquee" class="marquee-duplicate">{{ currentTrackTitle }}</span>
              <span class="music-label">{{ isPlaying ? 'BGM ON' : 'BGM OFF' }}</span>
            </div>
          </div>
        </transition>
        <ion-item detail="false" lines="none" class="music-control-item flex flex-col">
          <div class="player-buttons flex flex-row gap-4 justify-evenly">
            <ion-button fill="clear" @click="handleButtonClick($event, prevTrack)" class="control-button">
              <ion-icon :icon="playSkipBackSharp"></ion-icon>
            </ion-button>
            <ion-button fill="clear" @click="handleButtonClick($event, rewind)" class="control-button">
              <ion-icon :icon="playBackSharp"></ion-icon>
            </ion-button>
            <ion-button fill="clear" @click="handleButtonClick($event, togglePlayPause)" class="control-button play-pause-button">
              <ion-icon :icon="isPlaying ? pauseSharp : playSharp" size="large"></ion-icon>
            </ion-button>
            <ion-button fill="clear" @click="handleButtonClick($event, fastForward)" class="control-button">
              <ion-icon :icon="playForwardSharp"></ion-icon>
            </ion-button>
            <ion-button fill="clear" @click="handleButtonClick($event, nextTrack)" class="control-button">
              <ion-icon :icon="playSkipForwardSharp"></ion-icon>
            </ion-button>
          </div>
        </ion-item>
        <ion-progress-bar :value="progressPercentage / 100" color="primary"></ion-progress-bar>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapState } from 'vuex';
import ionic from '@/mixins/ionic';
import debug from '@/utils/debug';
import { 
  playSkipBackSharp, 
  playBackSharp,
  playSharp,
  pauseSharp,
  playForwardSharp,
  playSkipForwardSharp,
  volumeHighSharp,
  volumeMuteSharp
} from 'ionicons/icons';

export default defineComponent({
  name: 'XpMusicPlayer',
  mixins: [ionic],
  
  props: {
    showTrackInfo: {
      type: Boolean,
      default: false,
    },
    seekAmount: {
      type: Number,
      default: 10, // Default seek time in seconds
    },
    infoVisibilityDuration: {
      type: Number,
      default: 5000, // How long the track info stays visible after interaction (ms)
    }
  },
  
  data() {
    return {
      progressPercentage: 0,
      currentTrackTitle: 'Unknown Track',
      intervalId: null as number | null,
      infoVisibilityTimeoutId: null as number | null,
      isInfoVisible: false,
      shouldMarquee: false,
      // Ionic icons
      playSkipBackSharp,
      playBackSharp, 
      playSharp,
      pauseSharp,
      playForwardSharp,
      playSkipForwardSharp,
      volumeHighSharp,
      volumeMuteSharp
    };
  },
  
  computed: {
    ...mapState(['bgm']),
    
    isPlaying(): boolean {
      return this.bgm.is_on;
    },
    
    audioElement(): HTMLAudioElement {
      return this.bgm.audio;
    }
  },
  
  methods: {
    handleButtonClick(event: Event, action: () => void) {
      event.stopPropagation();
      this.showTrackInfoTemporarily();
      action();
    },
    
    showTrackInfoTemporarily() {
      // Clear any existing timeout
      if (this.infoVisibilityTimeoutId !== null) {
        clearTimeout(this.infoVisibilityTimeoutId);
        this.infoVisibilityTimeoutId = null;
      }
      
      // Show the info immediately
      this.isInfoVisible = true;
      
      // Set timeout to hide it after the specified duration
      this.infoVisibilityTimeoutId = setTimeout(() => {
        this.isInfoVisible = false;
      }, this.infoVisibilityDuration) as unknown as number;
    },
    
    toggleMusic(event: CustomEvent) {
      this.$emit('toggleMusic', event);
      this.simulateProgressUpdate();
    },
    
    prevTrack() {
      this.$emit('changeBGM', -1);
      this.$fx.ui[this.$fx.theme.ui].select.play();
      this.resetProgress();
    },
    
    nextTrack() {
      this.$emit('changeBGM', 1);
      this.$fx.ui[this.$fx.theme.ui].select.play();
      this.resetProgress();
    },
    
    togglePlayPause() {
      this.$emit('toggleMusic', { detail: { checked: !this.isPlaying } });
      this.$fx.ui[this.$fx.theme.ui].select.play();
      this.simulateProgressUpdate();
    },
    
    rewind() {
      if (this.audioElement && this.audioElement.currentTime) {
        // Rewind by seekAmount seconds, but don't go below 0
        this.audioElement.currentTime = Math.max(0, this.audioElement.currentTime - this.seekAmount);
        this.$fx.ui[this.$fx.theme.ui].select.play();
        
        // Update progress percentage based on current time
        if (this.audioElement.duration) {
          this.updateProgressFromAudio();
        }
      }
    },
    
    fastForward() {
      if (this.audioElement && this.audioElement.currentTime) {
        // Fast forward by seekAmount seconds, but don't exceed duration
        const newTime = this.audioElement.currentTime + this.seekAmount;
        if (this.audioElement.duration) {
          this.audioElement.currentTime = Math.min(newTime, this.audioElement.duration);
        } else {
          this.audioElement.currentTime = newTime;
        }
        this.$fx.ui[this.$fx.theme.ui].select.play();
        
        // Update progress percentage based on current time
        if (this.audioElement.duration) {
          this.updateProgressFromAudio();
        }
      }
    },
    
    updateProgressFromAudio() {
      if (this.audioElement && this.audioElement.duration) {
        this.progressPercentage = (this.audioElement.currentTime / this.audioElement.duration) * 100;
      }
    },
    
    simulateProgressUpdate() {
      // Clear any existing interval
      if (this.intervalId !== null) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      
      // Only start progress simulation if music is playing
      if (this.isPlaying) {
        // First try to get actual progress if possible
        this.updateProgressFromAudio();
        
        // Then set up interval for regular updates
        this.intervalId = setInterval(() => {
          if (this.audioElement && this.audioElement.duration) {
            // Use actual audio progress if available
            this.updateProgressFromAudio();
          } else {
            // Fallback to simulation
            this.progressPercentage = (this.progressPercentage + 0.5) % 100;
          }
        }, 1000) as unknown as number;
      }
    },
    
    resetProgress() {
      this.progressPercentage = 0;
      this.simulateProgressUpdate();
    },
    
    getTrackTitle() {
      // First try to get the track title from the tracks array if available
      if (this.bgm && this.bgm.tracks && this.bgm.track !== undefined) {
        const currentTrack = this.bgm.tracks[this.bgm.track];
        if (currentTrack && currentTrack.title) {
          return currentTrack.title;
        }
      }
      
      // If no title in tracks array, try to extract from the audio source URL
      if (this.audioElement && this.audioElement.src) {
        const url = this.audioElement.src;
        
        // Extract the filename from the URL
        const urlParts = url.split('/');
        let filename = urlParts[urlParts.length - 1];
        
        // URL decode the filename to handle special characters
        try {
          filename = decodeURIComponent(filename);
        } catch (e) {
          // If decoding fails, use the encoded version
          debug.warn('Error decoding track name:', e);
        }
        
        // Remove file extension and query parameters
        filename = filename.split('?')[0]; // Remove query parameters
        filename = filename.split('#')[0]; // Remove hash
        
        // Remove extension
        if (filename.includes('.')) {
          filename = filename.substring(0, filename.lastIndexOf('.'));
        }
        
        // Replace underscores, hyphens and plus signs with spaces
        filename = filename.replace(/[_\-+]/g, ' ');
        
        // Remove any remaining URL encoded characters or special sequences
        filename = filename.replace(/%[0-9A-Fa-f]{2}/g, ' ');
        
        // Clean up multiple spaces
        filename = filename.replace(/\s+/g, ' ').trim();
        
        // Capitalize words
        filename = filename.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        
        if (filename) {
          return filename;
        }
      }
      
      return 'Unknown Track';
    },
    
    updateTrackInfo() {
      this.currentTrackTitle = this.getTrackTitle();
      
      // Need to check if title is long enough to need marquee
      this.$nextTick(() => {
        // Check if the track title is longer than its container
        const titleEl = document.querySelector('.xp-music-player .track-title span');
        const containerEl = document.querySelector('.xp-music-player .track-title');
        
        if (titleEl && containerEl) {
          this.shouldMarquee = titleEl.scrollWidth > containerEl.clientWidth - 80; // Account for the BGM ON/OFF label
        }
      });
      
      // Show the track info when it updates
      this.showTrackInfoTemporarily();
    }
  },
  
  mounted() {
    this.updateTrackInfo();
    
    if (this.isPlaying) {
      this.simulateProgressUpdate();
    }
    
    // Listen for changes in the audio source
    if (this.audioElement) {
      // Using watch instead of MutationObserver since it won't work directly on Audio element
      debug.log('Audio element available, using watch for changes instead');
    }
  },
  
  watch: {
    // Watch for changes in the bgm object to update the track title
    'bgm.track': {
      handler() {
        this.updateTrackInfo();
        this.resetProgress();
      }
    },
    
    'bgm.src': {
      handler() {
        this.updateTrackInfo();
        this.resetProgress();
      }
    }
  }
});
</script>

<style lang="scss" scoped>
.xp-music-player {
  width: 100%;
  padding: 0;
  
  .music-player-container {
    padding: 0;
  }
  
  .music-control-item {
    --padding-start: 0;
    --inner-padding-end: 0;
    display: flex;
    flex-direction: column;
  }
  
  .music-label {
    opacity: 0.8;
    margin-left: 5px;
    padding: 2px 6px;
    border-radius: 10px;
    /* background-color: rgba(var(--ion-color-primary-rgb), 0.15); */
  }
  
  .player-buttons {
    display: flex;
    justify-content: space-evenly;
    align-items: center;
    width: 100%;
    padding: 8px 0;
    
    .control-button {
      --padding-start: 8px;
      --padding-end: 8px;
      height: 40px;
      margin: 0;
      
      ion-icon {
        font-size: 18px;
      }
    }
    
    .play-pause-button {
      height: 48px;
      
      ion-icon {
        font-size: 22px;
      }
    }
  }
  
  .track-info {
    padding: 4px 16px 8px;
    overflow: hidden;
    
    .track-title {
      position: relative;
      font-size: 1.4rem;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 8px;
      padding: 4px 0;
      
      &.marquee {
        animation: marquee 10s linear infinite;
        
        .marquee-duplicate {
          position: absolute;
          left: 100%;
          margin-left: 20px;
        }
      }
    }
    
    ion-progress-bar {
      --buffer-background: rgba(var(--ion-color-primary-rgb), 0.2);
      --progress-background: var(--ion-color-primary);
      height: 4px;
      border-radius: 2px;
    }
  }
  
  // Animation classes
  .slide-fade-enter-active {
    transition: all 0.3s ease-out;
  }
  
  .slide-fade-leave-active {
    transition: all 0.5s cubic-bezier(0.86, 0, 0.07, 1);
  }
  
  .slide-fade-enter-from {
    transform: translateY(-20px);
    opacity: 0;
  }
  
  .slide-fade-leave-to {
    transform: translateY(-20px);
    opacity: 0;
  }
}

@keyframes marquee {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(-100%, 0);
  }
}
</style>