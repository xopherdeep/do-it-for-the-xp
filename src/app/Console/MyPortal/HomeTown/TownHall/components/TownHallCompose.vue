<template>
  <ion-modal :is-open="isOpen" class="th-compose" data-cy="th-compose" @didDismiss="emit('close')">
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-title>{{ heading }}</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" class="th-compose__close" aria-label="Close" data-cy="th-compose-close" @click="emit('close')">
            <i class="fas fa-times" aria-hidden="true"></i>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="th-compose__content">
      <p v-if="replyingTo" class="th-compose__about" data-cy="th-replying-to">Answering: {{ replyingTo }}</p>

      <label v-if="hasTitleField" class="th-compose__field">
        <span class="th-compose__name">{{ kind === "bug" ? "Title (if you like)" : "Title" }}</span>
        <input
          v-model="title"
          type="text"
          class="th-compose__input"
          data-cy="th-title"
          autocomplete="off"
          enterkeyhint="next"
          :placeholder="kind === 'bug' ? 'A few words about it' : 'What is it about?'"
          @input="touched = true"
        />
      </label>

      <label class="th-compose__field">
        <span class="th-compose__name">Message</span>
        <textarea
          v-model="body"
          class="th-compose__input th-compose__textarea"
          data-cy="th-body"
          rows="8"
          autocomplete="off"
          :placeholder="bodyPlaceholder"
          @input="touched = true"
        ></textarea>
      </label>

      <p class="th-compose__count" :class="{ 'is-over': isOver }" data-cy="th-count">{{ count }} / {{ max }}</p>
      <p v-if="shownProblem" class="th-compose__problem" role="alert" data-cy="th-problem">{{ shownProblem }}</p>
    </ion-content>

    <!-- The board and Send: the bottom of the sheet, under the thumb -->
    <ion-footer class="th-compose__dock">
      <div class="dock">
        <div v-if="kind === 'topic'" class="th-compose__boards" role="radiogroup" aria-label="Board" data-cy="th-board-picker">
          <button
            v-for="option in boardOptions"
            :key="option.slug"
            type="button"
            role="radio"
            class="th-compose__board"
            :class="{ 'is-on': option.slug === pickedBoard }"
            :aria-checked="option.slug === pickedBoard"
            :data-cy="`th-pick-${option.slug}`"
            @click="pickedBoard = option.slug"
          >
            {{ option.name }}
          </button>
        </div>
        <button type="button" class="th-compose__send" data-cy="th-send" :disabled="blocked" @click="send">
          <i class="fad fa-paper-plane" aria-hidden="true"></i>
          {{ sending ? "Sending..." : "Send" }}
        </button>
      </div>
    </ion-footer>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonModal, IonTitle, IonToolbar } from "@ionic/vue";
import type { BoardInfo } from "@/lib/services/townhall/townHallFeed";
import { BODY_MAX, BUG_BODY_MAX, charCount, draftProblem, type PostDraft } from "@/lib/services/townhall/townHallPosts";
import { TOWN_HALL_BOARDS, type TownHallBoardSlug } from "@/lib/services/townhall/townHallSite";
import type { TownHallPostKind } from "@/lib/services/townhall/townHallTypes";
import { plainText } from "./townHallShared";

/**
 * The sheet where a hero writes a topic, a comment or a bug report. It holds the words and the board picked; the page
 * keeps the post (`send` carries the trimmed draft) and says when it is `sending`. The board names come from the site's
 * boards when the Board tab has read them, else the four boards of the Town Hall under their slugs, so a post can be
 * written (and kept for later) without a connection.
 */
interface ComposeProps {
  kind: TownHallPostKind;
  /** The board a topic starts on */
  board?: TownHallBoardSlug;
  /** The site's id of the post or topic a comment answers */
  postId?: number;
  /** That post's title, as text */
  replyingTo?: string;
  /** A failed post's words, when the hero edits it */
  initial?: PostDraft;
  boards: BoardInfo[];
  isOpen?: boolean;
  sending?: boolean;
  /** What the page could not do with the draft (it keeps the sheet open) */
  trouble?: string | null;
}

const props = withDefaults(defineProps<ComposeProps>(), { isOpen: true, sending: false, trouble: null });

const emit = defineEmits<{ (event: "send", draft: PostDraft): void; (event: "close"): void }>();

const HEADINGS: Record<TownHallPostKind, string> = { topic: "Post on the Board", comment: "Write a comment", bug: "Report a bug" };
const PLACEHOLDERS: Record<TownHallPostKind, string> = {
  topic: "What's on your mind?",
  comment: "Write your comment",
  bug: "What went wrong? What were you doing?",
};

/** "feature-requests" as a name, until the site has said what the board is called */
const nameOfSlug = (slug: string): string => slug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const boardOptions = computed(() =>
  props.boards.length
    ? props.boards.map((board) => ({ slug: board.slug, name: plainText(board.name) || nameOfSlug(board.slug) }))
    : TOWN_HALL_BOARDS.map((slug) => ({ slug, name: nameOfSlug(slug) })),
);

const title = ref("");
const body = ref("");
const pickedBoard = ref<TownHallBoardSlug | undefined>();
/** Nothing is said about what is missing until the hero starts writing */
const touched = ref(false);

const reset = () => {
  title.value = props.initial?.title ?? "";
  body.value = props.initial?.body ?? "";
  pickedBoard.value = props.initial?.board ?? props.board ?? boardOptions.value[0]?.slug;
  touched.value = false;
};
reset();
watch(
  () => props.isOpen,
  (open) => {
    if (open) reset();
  },
);

const heading = computed(() => HEADINGS[props.kind]);
const bodyPlaceholder = computed(() => PLACEHOLDERS[props.kind]);
const hasTitleField = computed(() => props.kind !== "comment");
const max = computed(() => (props.kind === "bug" ? BUG_BODY_MAX : BODY_MAX));

/** The draft the page keeps: trimmed, so a trailing space never counts against a limit */
const draft = computed<PostDraft>(() => {
  const trimmedTitle = title.value.trim();
  const postId = props.postId ?? props.initial?.postId;
  return {
    kind: props.kind,
    body: body.value.trim(),
    ...(hasTitleField.value && trimmedTitle ? { title: trimmedTitle } : {}),
    ...(props.kind === "topic" && pickedBoard.value ? { board: pickedBoard.value } : {}),
    ...(props.kind === "comment" && postId !== undefined ? { postId } : {}),
  };
});

const count = computed(() => charCount(draft.value.body));
const isOver = computed(() => count.value > max.value);
const problem = computed(() => draftProblem(draft.value));
const shownProblem = computed(() => props.trouble ?? (touched.value ? problem.value : null));
const blocked = computed(() => problem.value !== null || props.sending);

const send = () => {
  if (blocked.value) return;
  emit("send", draft.value);
};
</script>

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;

.th-compose {
  --width: min(96vw, 560px);
  --height: min(92vh, 680px);
  --border-radius: 12px;
}

.th-compose__close {
  --color: #{$eb-color-cream};
}

.th-compose__content {
  --background: #{$eb-color-dark-purple};
  color: $eb-color-cream;
  font-family: $eb-font-status;
}

.th-compose__about {
  margin: 12px 16px 0;
  font-size: 0.95rem;
  line-height: 1.4;
  color: $eb-color-pale-yellow;
  overflow-wrap: anywhere;
}

.th-compose__field {
  display: block;
  margin: 12px 16px 0;
}

.th-compose__name {
  display: block;
  margin-bottom: 4px;
  font-size: 0.9rem;
  color: $eb-color-pale-yellow;
}

.th-compose__input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  font-family: $eb-font-primary;
  // 16px and up: a phone browser zooms in on anything smaller when it is focused
  font-size: 1.15rem;
  color: #fff;
  background: rgba(20, 6, 28, 0.55);
  border: 2px solid rgba(231, 230, 179, 0.3);
  border-radius: 8px;

  &:focus {
    outline: none;
    border-color: $eb-color-minty-blue;
  }
}

.th-compose__textarea {
  min-height: 9rem;
  resize: vertical;
}

.th-compose__count {
  margin: 6px 16px 0;
  font-size: 0.85rem;
  text-align: right;
  color: rgba(231, 230, 179, 0.75);

  &.is-over {
    color: #ffb4b4;
  }
}

.th-compose__problem {
  margin: 6px 16px 12px;
  font-size: 0.95rem;
  color: #ffb4b4;
}

.th-compose__dock {
  --background: transparent;

  &::before {
    display: none;
  }

  .dock {
    padding: 8px 16px calc(10px + env(safe-area-inset-bottom));
    background: rgba(20, 6, 28, 0.92);
    border-top: 2px solid rgba(231, 230, 179, 0.25);
  }
}

// Two boards to a row: the status font is wide and four boards would otherwise fill the dock
.th-compose__boards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}

.th-compose__board {
  min-height: 40px;
  padding: 4px 8px;
  font-family: $eb-font-status;
  font-size: 0.8rem;
  line-height: 1.2;
  text-align: center;
  color: $eb-color-cream;
  background: rgba(20, 6, 28, 0.55);
  border: 2px solid rgba(231, 230, 179, 0.3);
  border-radius: 20px;
  -webkit-tap-highlight-color: transparent;

  &.is-on {
    color: $eb-color-dark-purple;
    background: $eb-color-minty-blue;
    border-color: $eb-color-pale-yellow;
  }

  &:focus-visible {
    outline: 2px solid $eb-color-pale-yellow;
    outline-offset: 2px;
  }
}

.th-compose__send {
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 16px;
  font-family: $eb-font-status;
  font-size: 1.1rem;
  color: $eb-color-dark-purple;
  background: $eb-color-pale-yellow;
  border: 2px solid $eb-color-dark-purple;
  border-radius: 8px;
  box-shadow: 0 0 0 2px $eb-color-pale-yellow;
  -webkit-tap-highlight-color: transparent;

  i {
    --fa-primary-color: #{$eb-color-dark-purple};
    --fa-secondary-color: #{$eb-color-medium-purple};
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.55;
  }

  &:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }
}
</style>
