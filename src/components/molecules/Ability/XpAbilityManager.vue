<template>
  <div class="ability-manager">
    <!-- List View of Abilities -->
    <div v-if="viewMode === 'list'">
      <ion-list>
        <ion-item-group
          v-for="group in abilitiesByFrequency"
          :key="String(group.period)"
        >
          <ion-item-divider>
            <ion-label>{{ formatFrequency(group.period) }} Abilities</ion-label>
          </ion-item-divider>
          <ion-item
            v-for="ability in group.abilities"
            :key="ability.id"
            button
            @click="editAbility(ability)"
            :class="{ 'ability-unlocked': showStatus && isUnlocked(ability.id) }"
          >
            <ion-icon
              :icon="getAbilityIcon(ability)"
              slot="start"
              v-if="!ability.iconPrefix"
            />
            <i
              v-else
              :class="getIconClass(ability)"
              slot="start"
              class="fa-lg mr-2"
            ></i>
            <ion-label class="ion-text-wrap">
              <h2>{{ ability.name }}</h2>
              <p>{{ ability.description }}</p>
              <!-- Under the text, not beside it: at phone width three end badges squeezed the name to a sliver -->
              <div class="ability-badges">
                <ion-badge color="warning">{{ ability.apRequirement.amount }} AP</ion-badge>
                <ion-badge color="tertiary" v-if="ability.mpCost">{{ ability.mpCost }} MP</ion-badge>
                <ion-badge
                  v-if="showStatus"
                  :color="getStatusColor(getAbilityStatus(ability.id))"
                  >{{ formatStatus(getAbilityStatus(ability.id)) }}</ion-badge
                >
              </div>
            </ion-label>
          </ion-item>
        </ion-item-group>
      </ion-list>
    </div>

    <!-- Grid View (FFX-inspired) of Abilities -->
    <div v-else class="ability-grid-container">
      <div class="grid-controls">
        <ion-button fill="clear" @click="zoomIn">
          <ion-icon :icon="addCircleOutline"></ion-icon>
        </ion-button>
        <ion-button fill="clear" @click="zoomOut">
          <ion-icon :icon="removeCircleOutline"></ion-icon>
        </ion-button>
        <ion-button fill="clear" @click="resetView">
          <ion-icon :icon="refreshOutline"></ion-icon>
        </ion-button>
      </div>

      <div
        class="ability-canvas"
        ref="abilityCanvas"
        @mousedown="startPan"
        @mousemove="pan"
        @mouseup="endPan"
        @mouseleave="endPan"
        @wheel="handleZoom"
        :style="{
          transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
          cursor: isPanning ? 'grabbing' : 'grab',
        }"
      >
        <svg class="ability-paths" ref="abilitySvg">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#2ecc71" />
            </marker>
            <marker
              id="locked-arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#7f8c8d" />
            </marker>
          </defs>
          <g>
            <path
              v-for="connection in abilityConnections"
              :key="connection.id"
              :d="connection.path"
              :class="connection.status"
              :marker-end="
                connection.status === 'unlocked'
                  ? 'url(#arrowhead)'
                  : 'url(#locked-arrowhead)'
              "
            />
          </g>
        </svg>

        <div
          class="ability-node"
          v-for="ability in abilities"
          :key="ability.id"
          :class="[
            ability.type,
            getClassNameFromAbility(ability),
            { connected: hasConnections(ability) },
            getNodeStatusClass(ability.id),
          ]"
          :style="getNodeStyle(ability)"
          @click="editAbility(ability)"
        >
          <div class="node-icon">
            <ion-icon
              v-if="!ability.iconPrefix"
              :icon="getAbilityIcon(ability)"
            />
            <i v-else :class="getIconClass(ability)"></i>
          </div>
          <div class="node-tooltip">
            <div class="tooltip-title">{{ ability.name }}</div>
            <div class="tooltip-class" v-if="getClassNameFromAbility(ability)">
              {{ formatClassName(getClassNameFromAbility(ability)) }}
            </div>
            <div class="tooltip-description">{{ ability.description }}</div>
            <div class="tooltip-cost">
              <span>{{ ability.apRequirement.amount }} AP</span>
              <span v-if="ability.mpCost">{{ ability.mpCost }} MP</span>
            </div>
            <div class="tooltip-frequency" v-if="ability.frequency">
              {{ formatFrequency(ability.frequency) }}
            </div>
            <div class="tooltip-status" v-if="showStatus">
              {{ formatStatus(getAbilityStatus(ability.id)) }}
            </div>
          </div>
        </div>
      </div>

      <div class="mini-map">
        <div class="mini-map-content" :style="getMiniMapStyle()">
          <div
            v-for="ability in abilities"
            :key="`mini-${ability.id}`"
            :class="[
              'mini-node',
              ability.type,
              getClassNameFromAbility(ability),
              getNodeStatusClass(ability.id),
            ]"
            :style="getMiniNodeStyle(ability)"
          ></div>
          <div class="view-rectangle" :style="getViewRectStyle()"></div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <ion-card
      v-if="abilities.length === 0"
      class="empty-state max-w-[80%] mx-auto my-4 h-auto text-center"
    >
      <ion-card-title class="flex flex-row gap-2 items-center justify-center">
        <h2>{{ emptyTitle }}</h2>
      </ion-card-title>
      <ion-card-content>
        {{ emptyHint }}
        <slot name="empty-actions" />
      </ion-card-content>
      <ion-icon :icon="colorWandOutline" size="large"></ion-icon>
    </ion-card>
  </div>
</template>

<script lang="ts">
  import {
    defineComponent,
    ref,
    computed,
    PropType,
    onMounted,
    watch,
  } from "vue";
  import { Ability, AbilityStatus, TimePeriod } from "@/hooks/abilities/abilityConstants";
  import {
    addCircleOutline,
    removeCircleOutline,
    refreshOutline,
    colorWandOutline,
    timeOutline,
    flameOutline,
    waterOutline,
    flashOutline,
    medkitOutline,
    shieldOutline,
    homeOutline,
    tvOutline,
    gameControllerOutline,
    peopleOutline,
    calendarOutline,
    listOutline,
    pizzaOutline,
    planetOutline,
    giftOutline,
    appsOutline,
    helpOutline,
  } from "ionicons/icons";
  import Ionic from "@/lib/mixins/ionic";

  export default defineComponent({
    name: "XpAbilityManager",
    mixins: [Ionic],
    props: {
      abilities: {
        type: Array as PropType<Ability[]>,
        required: true,
      },
      viewMode: {
        type: String,
        default: "list",
      },
      abilityStatuses: {
        type: Object as PropType<{ [abilityId: string]: AbilityStatus }>,
        default: () => ({}),
      },
      unlockStatuses: {
        type: Object as PropType<{ [abilityId: string]: boolean }>,
        default: () => ({}),
      },
      // False when there is no hero to judge the abilities for: no lock, cooldown or unlocked marks at all
      showStatus: {
        type: Boolean,
        default: true,
      },
      emptyTitle: {
        type: String,
        default: "No Abilities Created Yet",
      },
      emptyHint: {
        type: String,
        default:
          "Abilities are special skills or privileges you can use in your game. Start by adding your first ability using the + button below",
      },
    },
    emits: ["edit-ability", "view-mode-change"],
    setup(props, { emit }) {
      // Reactive State
      const zoom = ref(1);
      const panOffset = ref({ x: 0, y: 0 });
      const isPanning = ref(false);
      const startPanPosition = ref({ x: 0, y: 0 });
      const startPanOffset = ref({ x: 0, y: 0 });
      const abilityConnections = ref<
        Array<{
          id: string;
          startX: number;
          startY: number;
          endX: number;
          endY: number;
          status: string;
          path: string;
        }>
      >([]);

      // Computed properties
      const hidesStatus = computed(() => !props.showStatus);
      const abilitiesByFrequency = computed(() => {
        return (Object.values(TimePeriod) as TimePeriod[])
          .map((period) => ({
            period,
            abilities: props.abilities.filter(
              (ability) => ability.frequency === period
            ),
          }))
          .filter((group) => group.abilities.length > 0);
      });

      // Methods
      const toggleViewMode = () => {
        const newMode = props.viewMode === "list" ? "grid" : "list";
        emit("view-mode-change", newMode);
        if (newMode === "grid") {
          calculateConnections();
        }
      };

      const editAbility = (ability: Ability) => {
        emit("edit-ability", ability);
      };

      const getAbilityStatus = (abilityId: string): AbilityStatus => {
        return props.abilityStatuses[abilityId] || AbilityStatus.Locked;
      };

      const isUnlocked = (abilityId: string): boolean => {
        return props.unlockStatuses[abilityId] || false;
      };

      const getStatusColor = (status: AbilityStatus): string => {
        switch (status) {
          case AbilityStatus.Available:
            return "success";
          case AbilityStatus.Unlocked:
            return "warning";
          case AbilityStatus.Used:
          case AbilityStatus.Cooling:
            return "medium";
          case AbilityStatus.Locked:
          default:
            return "danger";
        }
      };

      const formatStatus = (status: AbilityStatus): string => {
        switch (status) {
          case AbilityStatus.Available:
            return "Available";
          case AbilityStatus.Unlocked:
            return "Unlocked";
          case AbilityStatus.Used:
            return "Used";
          case AbilityStatus.Cooling:
            return "Cooling";
          case AbilityStatus.Locked:
          default:
            return "Locked";
        }
      };

      const formatFrequency = (frequency: TimePeriod): string => {
        switch (frequency) {
          case TimePeriod.Hourly:
            return "Hourly";
          case TimePeriod.Daily:
            return "Daily";
          case TimePeriod.Weekly:
            return "Weekly";
          case TimePeriod.Monthly:
            return "Monthly";
          case TimePeriod.Quarterly:
            return "Quarterly";
          case TimePeriod.BiAnnual:
            return "Bi-Annual";
          case TimePeriod.Yearly:
            return "Yearly";
          case TimePeriod.Flat:
          default:
            return "One-time";
        }
      };

      const getAbilityIcon = (ability: Ability) => {
        // Return the appropriate icon based on ability.icon
        const iconMap = {
          timeOutline,
          flameOutline,
          waterOutline,
          flashOutline,
          medkitOutline,
          shieldOutline,
          colorWandOutline,
          homeOutline,
          tvOutline,
          gameControllerOutline,
          peopleOutline,
          calendarOutline,
          listOutline,
          pizzaOutline,
          planetOutline,
          giftOutline,
          appsOutline,
          helpOutline,
        };

        return iconMap[ability.icon] || colorWandOutline;
      };

      const getIconClass = (ability: Ability) => {
        // If the ability has a specific iconPrefix, use it, otherwise default to solid
        const prefix = ability.iconPrefix || "fas";
        return `${prefix} fa-${ability.icon}`;
      };

      const getClassNameFromAbility = (ability: Ability): string => {
        if (ability.characterRequirement?.class) {
          // Return the first class requirement
          return Object.keys(ability.characterRequirement.class)[0] || "";
        }
        return "";
      };

      const hasConnections = (ability: Ability): boolean => {
        const hasNoPrerequisites = !ability.prerequisites || ability.prerequisites.length === 0;
        if (hasNoPrerequisites) {
          return false;
        }
        return true;
      };

      const getNodeStyle = (ability: Ability) => {
        // Return style for positioning the node in grid view
        if (!ability.position) {
          ability.position = {
            x: Math.floor(Math.random() * 800),
            y: Math.floor(Math.random() * 600),
          };
        }

        return {
          left: `${ability.position.x}px`,
          top: `${ability.position.y}px`,
        };
      };

      // A line between two nodes: green once its prerequisite is unlocked, grey dashes while locked, plain grey with no hero
      const getConnectionStatus = (prereqId: string): string => {
        if (hidesStatus.value) return "neutral";
        return isUnlocked(prereqId) ? "unlocked" : "locked";
      };

      const getNodeStatusClass = (abilityId: string): string => {
        if (hidesStatus.value) return "";
        const status = getAbilityStatus(abilityId);
        switch (status) {
          case AbilityStatus.Available:
            return "status-available";
          case AbilityStatus.Unlocked:
            return "status-unlocked";
          case AbilityStatus.Used:
            return "status-used";
          case AbilityStatus.Cooling:
            return "status-cooling";
          default:
            return "status-locked";
        }
      };

      const calculateConnections = () => {
        // Calculate SVG lines for connections between abilities
        const connections: Array<{
          id: string;
          startX: number;
          startY: number;
          endX: number;
          endY: number;
          status: string;
          path: string;
        }> = [];

        props.abilities.forEach((ability) => {
          // Initialize position if it doesn't exist
          if (!ability.position) {
            ability.position = {
              x: Math.floor(Math.random() * 800),
              y: Math.floor(Math.random() * 600),
            };
          }

          const prerequisiteIds = ability.prerequisites;
          const hasPrerequisites = prerequisiteIds && prerequisiteIds.length > 0;
          if (hasPrerequisites) {
            prerequisiteIds.forEach((prereqId) => {
              const prereq = props.abilities.find((a) => a.id === prereqId);
              if (prereq) {
                // Initialize position for prereq if it doesn't exist
                if (!prereq.position) {
                  prereq.position = {
                    x: Math.floor(Math.random() * 800),
                    y: Math.floor(Math.random() * 600),
                  };
                }

                // TypeScript needs to know both positions are now defined
                const abilityPosition = ability.position!;
                const prereqPosition = prereq.position!;

                const startX = prereqPosition.x + 25; // center of node
                const startY = prereqPosition.y + 25;
                const endX = abilityPosition.x + 25;
                const endY = abilityPosition.y + 25;
                const path = `M${startX},${startY} L${endX},${endY}`;

                // Determine connection status based on prereq being unlocked
                const status = getConnectionStatus(prereqId);

                connections.push({
                  id: `${prereqId}-${ability.id}`,
                  startX,
                  startY,
                  endX,
                  endY,
                  status,
                  path,
                });
              }
            });
          }
        });

        abilityConnections.value = connections;
      };

      const formatClassName = (className: string): string => {
        return className
          .replace("-", " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
      };

      const zoomIn = () => {
        zoom.value = Math.min(zoom.value + 0.1, 2);
      };

      const zoomOut = () => {
        zoom.value = Math.max(zoom.value - 0.1, 0.5);
      };

      const resetView = () => {
        zoom.value = 1;
        panOffset.value = { x: 0, y: 0 };
      };

      const startPan = (event) => {
        isPanning.value = true;
        startPanPosition.value = { x: event.clientX, y: event.clientY };
        startPanOffset.value = { ...panOffset.value };
      };

      const pan = (event) => {
        if (isPanning.value) {
          const deltaX = event.clientX - startPanPosition.value.x;
          const deltaY = event.clientY - startPanPosition.value.y;
          panOffset.value = {
            x: startPanOffset.value.x + deltaX / zoom.value,
            y: startPanOffset.value.y + deltaY / zoom.value,
          };
        }
      };

      const endPan = () => {
        isPanning.value = false;
      };

      const handleZoom = (event) => {
        event.preventDefault();
        if (event.deltaY < 0) {
          zoomIn();
        } else {
          zoomOut();
        }
      };

      const getMiniMapStyle = () => {
        return {
          transform: `scale(${1 / zoom.value}) translate(${-panOffset.value
            .x}px, ${-panOffset.value.y}px)`,
        };
      };

      const getMiniNodeStyle = (ability: Ability) => {
        // Initialize position if it doesn't exist
        if (!ability.position) {
          ability.position = {
            x: Math.floor(Math.random() * 800),
            y: Math.floor(Math.random() * 600),
          };
        }

        return {
          left: `${ability.position.x / 10}px`,
          top: `${ability.position.y / 10}px`,
        };
      };

      const getViewRectStyle = () => {
        return {
          width: `${1000 / zoom.value}px`,
          height: `${800 / zoom.value}px`,
          transform: `translate(${panOffset.value.x / 10}px, ${
            panOffset.value.y / 10
          }px)`,
        };
      };

      // Effects
      onMounted(() => {
        if (props.viewMode === "grid") {
          calculateConnections();
        }
      });

      watch(
        () => props.abilities,
        () => {
          if (props.viewMode === "grid") {
            calculateConnections();
          }
        },
        { deep: true }
      );

      watch(
        () => props.unlockStatuses,
        () => {
          if (props.viewMode === "grid") {
            calculateConnections();
          }
        },
        { deep: true }
      );

      return {
        // State
        zoom,
        panOffset,
        isPanning,
        abilityConnections,
        abilitiesByFrequency,

        // Methods
        toggleViewMode,
        editAbility,
        getAbilityStatus,
        isUnlocked,
        getStatusColor,
        formatStatus,
        formatFrequency,
        getAbilityIcon,
        getIconClass,
        getClassNameFromAbility,
        hasConnections,
        getNodeStyle,
        getNodeStatusClass,
        formatClassName,
        calculateConnections,
        zoomIn,
        zoomOut,
        resetView,
        startPan,
        pan,
        endPan,
        handleZoom,
        getMiniMapStyle,
        getMiniNodeStyle,
        getViewRectStyle,

        // Icons
        addCircleOutline,
        removeCircleOutline,
        refreshOutline,
        colorWandOutline,
      };
    },
  });
</script>

<style lang="scss" scoped src="./_XpAbilityManager.scss" />
