export const LORE_COMBO_MATRIX: Record<
    string,
    Record<string, { name: string; icon: string; tagline: string }>
> = {
    asNeeded: {
        simple: {
            name: "Public Bounty",
            icon: "fa-scroll",
            tagline: "A simple favor for the local townsfolk",
        },
        beast: {
            name: "Monster Hunt",
            icon: "fa-skull-crossbones",
            tagline: "The cryptid is back! Wanted: Dead not Alive",
        },
        chain: {
            name: "Guild Campaign",
            icon: "fa-map-marked-alt",
            tagline: "A multi-stage expedition for the guild",
        },
    },
    individual: {
        simple: {
            name: "Han Solo",
            icon: "fa-user-astronaut",
            tagline: "A lone hero on a simple errand",
        },
        beast: {
            name: "Vendetta",
            icon: "fa-swords",
            tagline: "Face the beast alone in single combat",
        },
        chain: {
            name: "Personal Saga",
            icon: "fa-route",
            tagline: "An epic personal journey across the realms",
        },
    },
    collaborate: {
        simple: {
            name: "Party Event",
            icon: "fa-users",
            tagline: "The whole party helps a neighbor",
        },
        beast: {
            name: "Boss Raid",
            icon: "fa-dragon",
            tagline: "Unite the guild to slay the behemoth!",
        },
        chain: {
            name: "Epic Saga",
            icon: "fa-dungeon",
            tagline: "A legendary multi-chapter tale for the party",
        },
    },
    rotate: {
        simple: {
            name: "Shift Duty",
            icon: "fa-sync",
            tagline: "A cycle of mundane civic duties",
        },
        beast: {
            name: "Rotating Challenge",
            icon: "fa-crosshairs",
            tagline: "The monster returns... who is next to fight?",
        },
        chain: {
            name: "Seasonal Arc",
            icon: "fa-calendar-alt",
            tagline: "A recurring adventure for the rotating heroes",
        },
    },
    compete: {
        simple: {
            name: "Time Trial",
            icon: "fa-rabbit-fast",
            tagline: "Race to finish the NPC errand first!",
        },
        beast: {
            name: "Arena Battle",
            icon: "fa-trophy",
            tagline: "Last hero standing against the beast wins",
        },
        chain: {
            name: "Tournament",
            icon: "fa-crown",
            tagline: "A multi-round champion of champions challenge",
        },
    },
};

export default LORE_COMBO_MATRIX;
