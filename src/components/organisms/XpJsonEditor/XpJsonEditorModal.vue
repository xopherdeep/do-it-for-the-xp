<template>
  <ion-modal
    :is-open="isOpen"
    @didDismiss="$emit('close')"
    class="xp-json-editor-modal"
  >
    <div class="modal-container rpg-box">
      <div class="modal-header">
        <div class="header-left">
          <i class="fad fa-brackets-curly mr-2"></i>
          <h2>Raw JSON Editor</h2>
        </div>
        <ion-button
          fill="clear"
          @click="$emit('close')"
        >
          <i class="fas fa-times"></i>
        </ion-button>
      </div>

      <div class="modal-content">
        <p class="editor-hint">
          Standardized coordinate display (+1) is active in the UI, but here in the JSON, indices are
          <strong>0-indexed</strong>. Be careful with manual edits!
        </p>

        <div class="editor-wrapper">
          <textarea
            v-model="rawJson"
            class="json-textarea"
            spellcheck="false"
          ></textarea>
        </div>

        <div
          v-if="errorMessage"
          class="error-message"
        >
          <i class="fas fa-exclamation-triangle mr-1"></i>
          {{ errorMessage }}
        </div>
      </div>

      <div class="modal-footer">
        <ion-button
          fill="outline"
          color="medium"
          @click="$emit('close')"
        >
          Cancel
        </ion-button>
        <ion-button
          color="primary"
          @click="handleApply"
          :disabled="!isValid"
        >
          <i class="fas fa-save mr-2"></i>
          Apply & Save
        </ion-button>
      </div>
    </div>
  </ion-modal>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";
import { IonModal, IonButton } from "@ionic/vue";

export default defineComponent({
  name: "XpJsonEditorModal",
  components: { IonModal, IonButton },
  props: {
    isOpen: {
      type: Boolean,
      required: true
    },
    initialData: {
      type: Object,
      required: true
    }
  },
  emits: ["close", "apply"],
  setup(props, { emit }) {
    const rawJson = ref("");
    const errorMessage = ref("");
    const isValid = ref(true);

    const formatJson = (data: any) => {
      // Standard stringify
      const json = JSON.stringify(data, null, 2);
      
      // Post-process to collapse arrays that only contain strings/numbers (like maze rows)
      // This regex is slightly more restrictive to avoid matching larger nested structures accidentally
      return json.replace(/\[\s+((?:"[^"]{0,10}"|[\d\-. ]+)(?:,\s+(?:"[^"]{0,10}"|[\d\-. ]+))*)\s+\]/g, (match, content) => {
        const collapsed = content
          .split('\n')
          .map((s: string) => s.trim())
          .filter(Boolean)
          .join(' ');
        
        return `[ ${collapsed} ]`;
      });
    };

    // Sync initial data when modal opens
    watch(
      () => props.isOpen,
      (open) => {
        if (open) {
          rawJson.value = formatJson(props.initialData);
          errorMessage.value = "";
          isValid.value = true;
        }
      }
    );

    // Basic validation on change
    watch(rawJson, (val) => {
      try {
        JSON.parse(val);
        isValid.value = true;
        errorMessage.value = "";
      } catch (e: any) {
        isValid.value = false;
        errorMessage.value = e.message;
      }
    });

    const handleApply = () => {
      if (!isValid.value) return;
      emit("apply", rawJson.value);
    };

    return {
      rawJson,
      errorMessage,
      isValid,
      handleApply
    };
  }
});
</script>

<style lang="scss" scoped>
  .xp-json-editor-modal {
    --width: 90%;
    --height: 90%;
    --max-width: 1000px;
    --max-height: 800px;
    --border-radius: 16px;

    .modal-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #1a1c2c;
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);

      .header-left {
        display: flex;
        align-items: center;

        i {
          color: var(--ion-color-primary);
          font-size: 1.4rem;
        }

        h2 {
          margin: 0;
          font-family: "Twoson", serif;
          font-size: 1.2rem;
          color: #fff;
          letter-spacing: 1px;
        }
      }

      ion-button {
        --padding-start: 8px;
        --padding-end: 8px;
        font-size: 1.2rem;
        color: rgba(255, 255, 255, 0.4);
      }
    }

    .modal-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 20px;
      overflow: hidden;
      gap: 16px;

      .editor-hint {
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.5);
        margin: 0;
        line-height: 1.4;

        strong {
          color: var(--ion-color-warning);
        }
      }

      .editor-wrapper {
        flex: 1;
        background: #000;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 4px;
        overflow: hidden;
      }

      .json-textarea {
        width: 100%;
        height: 100%;
        background: transparent;
        color: #00ff41; // Classic hacker green / retro CRT
        border: none;
        resize: none;
        font-family: monospace;
        font-size: 1rem;
        line-height: 1.5;
        padding: 12px;
        outline: none;

        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.2) transparent;

        &::-webkit-scrollbar {
          width: 6px;
        }

        &::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
      }

      .error-message {
        background: rgba(var(--ion-color-danger-rgb), 0.1);
        border: 1px solid rgba(var(--ion-color-danger-rgb), 0.3);
        color: var(--ion-color-danger);
        padding: 12px;
        border-radius: 8px;
        font-size: 0.85rem;
        font-family: monospace;
      }
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(0, 0, 0, 0.2);

      ion-button {
        --border-radius: 10px;
        font-family: "Apple Kid", sans-serif;
        font-size: 1rem;
      }
    }
  }

  .mr-2 {
    margin-right: 0.5rem;
  }

  .mr-1 {
    margin-right: 0.25rem;
  }
</style>
