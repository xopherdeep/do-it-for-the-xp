import { defineComponent, onMounted, computed } from "vue";
import ionic from "@/lib/mixins/ionic";
import { useChatStore } from "@/lib/store/stores/chat";
import { useRouter } from "vue-router";
import { modalController } from "@ionic/vue";
import XpChatList from "./components/XpChatList.vue";
import XpChatInput from "./components/XpChatInput.vue";
import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";

export default defineComponent({
  name: "xp-chat",
  mixins: [ionic],
  components: {
    XpChatList,
    XpChatInput,
    XpCloseButton
  },
  setup() {
    const router = useRouter();
    const chatStore = useChatStore();
    const roomId = 'family-chat';

    onMounted(() => {
      chatStore.initRoom(roomId);
    });

    const onSendMessage = (text: string) => {
      chatStore.sendMessage(roomId, text);
    };

    const onLoadMore = () => {
      chatStore.loadMoreMessages(roomId);
    };

    const handleClose = async () => {
      // Try to dismiss modal first
      const modal = await modalController.getTop();
      if (modal) {
        await modalController.dismiss();
      } else {
        // Fallback to router
        router.back();
      }
    };

    return {
      messages: computed(() => chatStore.getRoomMessages(roomId)),
      isLoading: computed(() => chatStore.isLoading),
      canLoadMore: computed(() => chatStore.canLoadMore(roomId)),
      onSendMessage,
      onLoadMore,
      handleClose
    };
  }
});