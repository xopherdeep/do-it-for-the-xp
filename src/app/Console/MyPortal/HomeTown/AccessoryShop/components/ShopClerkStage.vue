<template>
  <div class="shop-clerk-stage" :style="stageStyle">
    <div class="shop-clerk-stage__scenery" />
    <div class="shop-clerk-stage__dialog-wrap">
      <div class="shop-clerk-stage__dialog rpg-box">
        <div class="shop-clerk-stage__header">
          <span class="shopkeeper-tag">
            <i class="fad fa-store-alt" />
            {{ shopkeeper }}
          </span>
          <span v-if="isOpen && charismaDiscount" class="charisma-pill">
            <i class="fad fa-sparkles" />
            {{ charismaDiscount }} OFF
          </span>
        </div>
        <div class="shop-clerk-stage__speech">
          <template v-if="isOpen">
            {{ shopGreeting }}
          </template>
          <template v-else>
            <span class="shop-closed-cue">
              <i class="fad fa-door-closed" />
              CLOSED:
            </span>
            {{ closedLine }}
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";

export default defineComponent({
  name: "ShopClerkStage",
  props: {
    shopkeeper: {
      type: String,
      required: true,
    },
    shopGreeting: {
      type: String,
      required: true,
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
    closedLine: {
      type: String,
      default: "We are closed right now.",
    },
    charismaDiscount: {
      type: String,
      default: "",
    },
    backgroundImage: {
      type: [String, Object],
      default: "",
    },
  },
  setup(props) {
    const stageStyle = computed(() => {
      const raw = props.backgroundImage;
      const imageUrl = (typeof raw === "string" ? raw : (raw as any)?.default) || "";
      if (!imageUrl) return {};
      const bgDeclaration = imageUrl.startsWith("url(") ? imageUrl : `url("${imageUrl}")`;
      return {
        "--shop-bg-image": bgDeclaration,
      };
    });

    return {
      stageStyle,
    };
  },
});
</script>

<style lang="scss" scoped>
.shop-clerk-stage {
  position: relative;
  width: 100%;
  height: 250px;
  overflow: hidden;
  border-bottom: 2px solid rgba(247, 232, 168, 0.2);

  &__scenery {
    position: absolute;
    inset: 0;
    background-image: var(--shop-bg-image);
    background-size: cover;
    background-position: center 30%;
    background-repeat: no-repeat;
    transform: scale(1.02);

    &::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        rgba(15, 10, 25, 0.15) 0%,
        rgba(15, 10, 25, 0.4) 60%,
        rgba(15, 10, 25, 0.95) 100%
      );
    }
  }

  &__dialog-wrap {
    position: absolute;
    bottom: 12px;
    left: 12px;
    right: 12px;
    z-index: 2;
  }

  &__dialog {
    background: rgba(28, 16, 38, 0.92);
    border: 2px solid #f7e8a8;
    border-radius: 12px;
    padding: 10px 14px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), inset 0 0 12px rgba(247, 232, 168, 0.08);
    backdrop-filter: blur(8px);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
  }

  .shopkeeper-tag {
    font-family: "Twoson", "Apple Kid", sans-serif;
    font-size: 1rem;
    color: #f7e8a8;
    letter-spacing: 0.5px;
    display: inline-flex;
    align-items: center;
    gap: 6px;

    i {
      font-size: 0.95rem;
      color: #68d0b8;
    }
  }

  .charisma-pill {
    background: rgba(104, 208, 184, 0.2);
    border: 1px solid #68d0b8;
    color: #80d890;
    font-family: "StatusPlz", "Apple Kid", sans-serif;
    font-size: 0.8rem;
    padding: 2px 8px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  &__speech {
    font-family: "Apple Kid", sans-serif;
    font-size: 1.25rem;
    line-height: 1.25;
    color: #ffffff;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  }

  .shop-closed-cue {
    color: var(--ion-color-danger, #ff4961);
    font-weight: bold;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-right: 4px;
  }
}

@media (min-width: 768px) {
  .shop-clerk-stage {
    height: 300px;

    &__dialog-wrap {
      max-width: 640px;
      margin: 0 auto;
      left: 20px;
      right: 20px;
    }
  }
}
</style>
