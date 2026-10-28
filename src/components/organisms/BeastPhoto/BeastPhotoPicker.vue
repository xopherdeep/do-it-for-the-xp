<template>
  <ion-content class="beast-photo" :scroll-y="true">
    <div class="beast-photo__box" role="dialog" aria-labelledby="beast-photo-title">
      <h2 id="beast-photo-title" class="beast-photo__title">{{ t("beastMaker.photo.title") }}</h2>
      <p class="beast-photo__sub">{{ t("beastMaker.photo.guide") }}</p>

      <div class="beast-photo__stage">
        <!-- The picture fills this box exactly, so the frame's percentages are the picture's -->
        <div v-if="picture" class="beast-photo__picture" :style="pictureStyle">
          <img ref="pictureEl" class="beast-photo__img" :src="picture.url" alt="Your drawing" draggable="false" />
          <div
            class="beast-photo__frame rpg-box"
            :style="frameStyle"
            role="group"
            aria-label="Crop frame: drag it over the beast"
            data-test="photo-frame"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="endDrag"
            @pointercancel="endDrag"
          ></div>
        </div>
        <i v-else class="fad fa-camera-retro beast-photo__placeholder" aria-hidden="true"></i>
      </div>

      <p v-if="error" class="beast-photo__error" role="alert" data-test="photo-error">{{ error }}</p>
      <p v-else-if="working" class="beast-photo__sub">{{ t("beastMaker.photo.opening") }}</p>

      <!-- The camera on a phone; a file picker on a computer -->
      <input
        ref="fileInput"
        class="beast-photo__input"
        type="file"
        accept="image/*"
        capture="environment"
        data-test="photo-input"
        @change="onPicked"
      />

      <!-- The controls sit at the bottom, in thumb reach: the frame's tools, then the verbs -->
      <div class="beast-photo__controls">
        <div v-if="picture" class="beast-photo__row beast-photo__row--tools">
          <button type="button" class="beast-photo__btn" data-test="photo-smaller" @click="smaller">
            <i class="fad fa-search-minus" aria-hidden="true"></i> {{ t("beastMaker.photo.smaller") }}
          </button>
          <button type="button" class="beast-photo__btn" data-test="photo-fit" @click="fit">
            <i class="fad fa-expand" aria-hidden="true"></i> {{ t("beastMaker.photo.fit") }}
          </button>
          <button type="button" class="beast-photo__btn" data-test="photo-bigger" @click="bigger">
            <i class="fad fa-search-plus" aria-hidden="true"></i> {{ t("beastMaker.photo.bigger") }}
          </button>
        </div>
        <div class="beast-photo__row">
          <button type="button" class="beast-photo__btn beast-photo__btn--quiet" data-test="photo-cancel" @click="cancel">
            {{ t("beastMaker.photo.notNow") }}
          </button>
          <button type="button" class="beast-photo__btn" data-test="photo-take" :disabled="working" @click="take">
            <i class="fad fa-camera" aria-hidden="true"></i> {{ picture ? t("beastMaker.photo.another") : t("beastMaker.photo.take") }}
          </button>
          <button v-if="picture" type="button" class="beast-photo__btn beast-photo__btn--go" data-test="photo-use" @click="use">
            <i class="fad fa-check" aria-hidden="true"></i> {{ t("beastMaker.photo.use") }}
          </button>
        </div>
      </div>
    </div>
  </ion-content>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import { IonContent, modalController } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import { useCopy, useReadAloud } from "@/hooks/useVoice";
import { largestSquare, moveFrame, resizeFrame } from "@/lib/services/creations/beastPhoto";
import type { CropFrame } from "@/lib/services/creations/beastPhoto";
import { openPicture, portraitFromImage } from "@/lib/services/creations/beastPhotoImage";
import type { OpenedPicture } from "@/lib/services/creations/beastPhotoImage";
import debug from "@/lib/utils/debug";

defineOptions({ name: "beast-photo-picker" });

/**
 * A kid's drawing becomes a beast's portrait: Take a picture opens the camera (a file input with capture), the picture
 * is shown with a square frame the player slides (a drag) and sizes (Bigger / Smaller / Fit), and Use it cuts the frame
 * out as a 512px JPEG and hands the data URL to whoever opened the sheet. Not now closes it with nothing. The maths are
 * beastPhoto.ts; the canvas is beastPhotoImage.ts. The words are the Beast Maker's catalog (beastMaker.photo.*), in
 * the hero's voice; opened from the Maker (`autoRead`) the guide line is read aloud as the Maker's own screens are.
 */
const props = withDefaults(defineProps<{ autoRead?: boolean }>(), { autoRead: false });

const t = useCopy();
const { startAutoReading } = useReadAloud();

/** Bigger and Smaller change the frame by this share of the picture's short side per tap */
const STEP_SHARE = 0.1;

const fileInput = ref<HTMLInputElement | null>(null);
const pictureEl = ref<HTMLImageElement | null>(null);
// The loaded image is not a thing for Vue to watch; the frame beside it is what changes
const picture = shallowRef<OpenedPicture | null>(null);
const frame = ref<CropFrame>({ x: 0, y: 0, size: 0 });
const error = ref("");
const working = ref(false);

const sizeOf = (opened: OpenedPicture) => ({ width: opened.image.naturalWidth, height: opened.image.naturalHeight });

// The box is as wide as the picture allows at 46% of the screen's height, so a tall photo does not push the controls away
const pictureStyle = computed(() => {
  if (!picture.value) return {};
  const { width, height } = sizeOf(picture.value);
  return { aspectRatio: `${width} / ${height}`, width: `min(100%, calc(46vh * ${width / height}))` };
});

// The frame in percentages of the picture, so it follows the picture at any size
const frameStyle = computed(() => {
  if (!picture.value) return {};
  const { width, height } = sizeOf(picture.value);
  const { x, y, size } = frame.value;
  return {
    left: `${(x / width) * 100}%`,
    top: `${(y / height) * 100}%`,
    width: `${(size / width) * 100}%`,
    height: `${(size / height) * 100}%`,
  };
});

const letGo = (opened: OpenedPicture | null) => {
  if (opened) URL.revokeObjectURL(opened.url);
};

onBeforeUnmount(() => letGo(picture.value));

onMounted(() => {
  if (props.autoRead) startAutoReading(t("beastMaker.photo.guide"));
});

const take = () => {
  play$fx("cursor");
  error.value = "";
  fileInput.value?.click();
};

const onPicked = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  // The same file can be picked again after Another
  input.value = "";
  const isNothingPicked = !file;
  if (isNothingPicked) return;
  working.value = true;
  error.value = "";
  try {
    const opened = await openPicture(file as File);
    letGo(picture.value);
    picture.value = opened;
    const { width, height } = sizeOf(opened);
    frame.value = largestSquare(width, height);
  } catch (caught) {
    debug.warn("[BeastPhoto] could not read the picture", caught);
    error.value = t("beastMaker.error.photo");
    play$fx("no");
  } finally {
    working.value = false;
  }
};

// ---- The frame ---------------------------------------------------------------------------------------------------

const fit = () => {
  if (!picture.value) return;
  play$fx("cursor");
  const { width, height } = sizeOf(picture.value);
  frame.value = largestSquare(width, height);
};

const resize = (direction: 1 | -1) => {
  if (!picture.value) return;
  play$fx("cursor");
  const { width, height } = sizeOf(picture.value);
  const step = Math.round(Math.min(width, height) * STEP_SHARE) * direction;
  frame.value = resizeFrame(frame.value, step, width, height);
};
const bigger = () => resize(1);
const smaller = () => resize(-1);

// One finger on the frame at a time; the pointer is captured so a drag that slips off the frame still moves it
let dragging: { id: number; x: number; y: number } | null = null;

const onPointerDown = (event: PointerEvent) => {
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  dragging = { id: event.pointerId, x: event.clientX, y: event.clientY };
};

const onPointerMove = (event: PointerEvent) => {
  const drag = dragging;
  const opened = picture.value;
  const shown = pictureEl.value;
  const isDragging = drag !== null && drag.id === event.pointerId && opened !== null && shown !== null;
  if (!isDragging) return;
  const box = shown.getBoundingClientRect();
  const isNotShown = box.width === 0 || box.height === 0;
  if (isNotShown) return;
  const { width, height } = sizeOf(opened);
  // Screen pixels to source pixels: the picture is shown smaller than it is
  const dx = (event.clientX - drag.x) * (width / box.width);
  const dy = (event.clientY - drag.y) * (height / box.height);
  dragging = { id: event.pointerId, x: event.clientX, y: event.clientY };
  frame.value = moveFrame(frame.value, dx, dy, width, height);
};

const endDrag = (event: PointerEvent) => {
  const isThisDrag = dragging !== null && dragging.id === event.pointerId;
  if (isThisDrag) dragging = null;
};

// ---- The verbs ---------------------------------------------------------------------------------------------------

const use = () => {
  const opened = picture.value;
  if (!opened) return;
  try {
    const portrait = portraitFromImage(opened.image, frame.value);
    play$fx("yes");
    void modalController.dismiss(portrait, "picked");
  } catch (caught) {
    debug.warn("[BeastPhoto] could not cut the portrait", caught);
    error.value = t("beastMaker.error.photo");
    play$fx("no");
  }
};

const cancel = () => {
  void modalController.dismiss(null, "cancel");
};
</script>

<style lang="scss" scoped src="./_BeastPhotoPicker.scss" />
