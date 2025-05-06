import { ref } from 'vue';
import { CanvasContext, Temple, RoomDefinition, Direction } from '../types';
import debug from '@/lib/utils/debug';
import { useStyleConfig } from './useStyleConfig';

export function useCanvasRenderer() {
  const dungeonCanvas = ref<HTMLCanvasElement | null>(null);
  const canvasWidth = ref(640);
  const canvasHeight = ref(480);
  const showRoomTypeLabel = ref(true);
  
  const { 
    selectedEraStyle, 
    eraPixelSizes,
    floorStyle,
    wallStyle,
    floorPatternType,
    wallPatternType,
    getEraColor 
  } = useStyleConfig();

  // Draw an empty room (black background)
  const drawEmptyRoom = (ctx: CanvasContext) => {
    if (!ctx) return;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value);
  };

  // Draw the room based on its type and current styles
  const drawRoom = (
    ctx: CanvasContext, 
    temple: Temple | undefined, 
    position: [number, number], 
    room: RoomDefinition | undefined,
    isDoorLocked: (dir: Direction) => boolean
  ) => {
    if (!ctx || !temple) {
      drawEmptyRoom(ctx);
      return;
    }

    const [row, col] = position;
    if (row < 0 || row >= temple.maze.length || col < 0 || col >= temple.maze[0].length || !room || room.type === 'wall') {
      drawEmptyRoom(ctx);
      return;
    }

    // Draw the floor
    drawFloor(ctx);

    // Draw walls with doors
    drawWalls(ctx, temple, row, col, isDoorLocked);

    // Draw room-specific details
    drawRoomDetails(ctx, room);

    // Apply era-specific visual effects
    applyEraStyle(ctx);
  };

  // Draw the floor
  const drawFloor = (ctx: CanvasContext) => {
    if (!ctx) return;
    
    const color = getEraColor('floor', floorStyle.value);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value);
    
    // Add pattern based on selected type
    switch(floorPatternType.value) {
      case 'grid':
        drawGridPattern(ctx);
        break;
      case 'dots':
        drawDotsPattern(ctx);
        break;
      case 'checkerboard':
        drawCheckerboardPattern(ctx);
        break;
      case 'herringbone':
        drawHerringbonePattern(ctx);
        break;
      case 'hexagonal':
        drawHexagonalPattern(ctx);
        break;
      case 'random':
        drawRandomPattern(ctx);
        break;
      // 'basic' has no additional pattern
    }
  };

  // Draw walls with doors
  const drawWalls = (
    ctx: CanvasContext, 
    temple: Temple, 
    row: number, 
    col: number, 
    isDoorLocked: (dir: Direction) => boolean
  ) => {
    if (!ctx) return;
    
    const wallThickness = 40;
    
    // Function to check if there's a valid room in a direction
    const hasRoomInDirection = (r: number, c: number): boolean => {
      if (r < 0 || r >= temple.maze.length || c < 0 || c >= temple.maze[0].length) {
        return false;
      }
      const roomKey = temple.maze[r][c];
      const room = temple.rooms[roomKey];
      return room && room.type !== 'wall';
    };
    
    // Check for adjacent rooms
    const hasNorth = hasRoomInDirection(row - 1, col);
    const hasSouth = hasRoomInDirection(row + 1, col);
    const hasEast = hasRoomInDirection(row, col + 1);
    const hasWest = hasRoomInDirection(row, col - 1);
    
    // Draw top wall (north)
    drawWallSection(
      ctx, 
      0, 0, 
      canvasWidth.value, wallThickness, 
      hasNorth, 'north', 
      isDoorLocked
    );
    
    // Draw bottom wall (south)
    drawWallSection(
      ctx, 
      0, canvasHeight.value - wallThickness, 
      canvasWidth.value, wallThickness, 
      hasSouth, 'south',
      isDoorLocked
    );
    
    // Draw left wall (west)
    drawWallSection(
      ctx, 
      0, 0, 
      wallThickness, canvasHeight.value, 
      hasWest, 'west',
      isDoorLocked
    );
    
    // Draw right wall (east)
    drawWallSection(
      ctx, 
      canvasWidth.value - wallThickness, 0, 
      wallThickness, canvasHeight.value, 
      hasEast, 'east',
      isDoorLocked
    );
  };

  // Draw a section of wall with optional door
  const drawWallSection = (
    ctx: CanvasContext,
    x: number,
    y: number,
    width: number,
    height: number,
    hasDoor: boolean,
    wallDirection: string,
    isDoorLocked: (dir: Direction) => boolean
  ) => {
    if (!ctx) return;
    
    // Get wall color based on selected style and era
    const wallColor = getEraColor('wall', wallStyle.value);
    ctx.fillStyle = wallColor;
    
    // Horizontal wall (north/south) vs vertical wall (east/west)
    const isHorizontal = wallDirection === 'north' || wallDirection === 'south';
    
    if (hasDoor) {
      // Create door opening
      const doorSize = 100;
      const doorStart = isHorizontal
        ? (width - doorSize) / 2 // Center horizontally
        : (height - doorSize) / 2; // Center vertically

      if (isHorizontal) {
        // Draw wall on either side of door
        ctx.fillRect(x, y, doorStart, height);
        ctx.fillRect(x + doorStart + doorSize, y, width - doorStart - doorSize, height);
        
        // Draw door frame
        ctx.fillStyle = '#8B4513'; // Brown door frame
        ctx.fillRect(x + doorStart - 5, y, 5, height);
        ctx.fillRect(x + doorStart + doorSize, y, 5, height);
        
        // Draw lock if door is locked
        if (isDoorLocked(wallDirection as Direction)) {
          drawLock(ctx, x + doorStart + doorSize / 2, y + height / 2);
        }
      } else {
        // Draw wall above and below door
        ctx.fillRect(x, y, width, doorStart);
        ctx.fillRect(x, y + doorStart + doorSize, width, height - doorStart - doorSize);
        
        // Draw door frame
        ctx.fillStyle = '#8B4513'; // Brown door frame
        ctx.fillRect(x, y + doorStart - 5, width, 5);
        ctx.fillRect(x, y + doorStart + doorSize, width, 5);
        
        // Draw lock if door is locked
        if (isDoorLocked(wallDirection as Direction)) {
          drawLock(ctx, x + width / 2, y + doorStart + doorSize / 2);
        }
      }
    } else {
      // No door - draw solid wall
      ctx.fillRect(x, y, width, height);
    }
    
    // Apply wall pattern
    applyWallPattern(ctx, x, y, width, height);
  };

  // Draw a lock icon on a door
  const drawLock = (ctx: CanvasContext, x: number, y: number) => {
    if (!ctx) return;
    
    // Draw gold lock
    ctx.fillStyle = '#FFD700';
    
    // Lock body
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Lock shackle
    ctx.beginPath();
    ctx.arc(x, y - 10, 6, Math.PI, Math.PI * 2);
    ctx.fill();
    
    // Keyhole
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  };

  // Apply wall pattern
  const applyWallPattern = (ctx: CanvasContext, x: number, y: number, width: number, height: number) => {
    if (!ctx) return;
    
    switch(wallPatternType.value) {
      case 'blocks':
        drawBlockPattern(ctx, x, y, width, height);
        break;
      case 'bricks':
        drawBrickPattern(ctx, x, y, width, height);
        break;
      case 'cracks':
        drawCrackedPattern(ctx, x, y, width, height);
        break;
      case 'detailed':
        drawDetailedPattern(ctx, x, y, width, height);
        break;
      case 'engraved':
        drawEngravedPattern(ctx, x, y, width, height);
        break;
      // 'plain' has no additional pattern
    }
  };

  // Draw room-specific details based on room type
  const drawRoomDetails = (ctx: CanvasContext, room: RoomDefinition) => {
    if (!ctx) return;
    
    if (showRoomTypeLabel.value) {
      // Display room type
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        room.type.charAt(0).toUpperCase() + room.type.slice(1) + ' Room',
        canvasWidth.value / 2,
        canvasHeight.value / 2 - 50
      );
    }
    
    // Add room-specific decorations
    switch(room.type) {
      case 'entrance':
        drawEntranceDecoration(ctx);
        break;
      case 'monster':
        drawMonsterDecoration(ctx);
        break;
      case 'boss':
        drawBossDecoration(ctx);
        break;
      case 'loot':
        drawLootDecoration(ctx, room);
        break;
      case 'shop':
        drawShopDecoration(ctx);
        break;
      case 'teleport':
        drawTeleportDecoration(ctx);
        break;
    }
  };

  // Apply era-specific visual effects
  const applyEraStyle = (ctx: CanvasContext) => {
    if (!ctx) return;
    
    // Get current canvas content for processing
    const imageData = ctx.getImageData(0, 0, canvasWidth.value, canvasHeight.value);
    
    switch(selectedEraStyle.value) {
      case 'retro80s':
        apply80sRetroStyle(ctx, imageData);
        break;
      case '16bit90s':
        apply90sSnesStyle(ctx, imageData);
        break;
      case 'rpg00s':
        applyRpgStyle(ctx);
        break;
      case 'modern':
        applyModernStyle(ctx);
        break;
    }
  };

  // Floor pattern drawing functions
  const drawGridPattern = (ctx: CanvasContext) => {
    if (!ctx) return;
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1;
    
    // Draw vertical lines
    for (let x = 0; x <= canvasWidth.value; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight.value);
      ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= canvasHeight.value; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth.value, y);
      ctx.stroke();
    }
  };

  const drawDotsPattern = (ctx: CanvasContext) => {
    if (!ctx) return;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    
    // Draw dots in grid pattern
    for (let x = 20; x < canvasWidth.value; x += 40) {
      for (let y = 20; y < canvasHeight.value; y += 40) {
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const drawCheckerboardPattern = (ctx: CanvasContext) => {
    if (!ctx) return;
    
    const tileSize = 40;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    
    for (let x = 0; x < canvasWidth.value; x += tileSize) {
      for (let y = 0; y < canvasHeight.value; y += tileSize) {
        if ((Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0) {
          ctx.fillRect(x, y, tileSize, tileSize);
        }
      }
    }
  };

  const drawHerringbonePattern = (ctx: CanvasContext) => {
    if (!ctx) return;
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1;
    
    // Simplified herringbone pattern
    for (let y = 0; y < canvasHeight.value; y += 20) {
      for (let x = -20; x < canvasWidth.value; x += 40) {
        // Draw V patterns
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 20, y + 20);
        ctx.lineTo(x + 40, y);
        ctx.stroke();
      }
    }
  };
  
  const drawHexagonalPattern = (ctx: CanvasContext) => {
    if (!ctx) return;
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1;

    const size = 30;
    const h = size * Math.sqrt(3) / 2;
    
    for (let row = 0; row < canvasHeight.value / h + 1; row++) {
      for (let col = 0; col < canvasWidth.value / (size * 3) + 1; col++) {
        const x = col * size * 3;
        const y = row * h;
        const offset = row % 2 ? size * 1.5 : 0;
        
        // Draw hexagon
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = Math.PI / 3 * i;
          const px = x + offset + size * Math.cos(angle);
          const py = y + size * Math.sin(angle);
          
          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  };
  
  const drawRandomPattern = (ctx: CanvasContext) => {
    if (!ctx) return;
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1;
    
    // Draw random line cracks
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * canvasWidth.value;
      const y = Math.random() * canvasHeight.value;
      const length = Math.random() * 50 + 30;
      const angle = Math.random() * Math.PI * 2;
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x + Math.cos(angle) * length,
        y + Math.sin(angle) * length
      );
      ctx.stroke();
      
      // Add some branches
      const branchCount = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < branchCount; j++) {
        const branchX = x + Math.cos(angle) * length * Math.random();
        const branchY = y + Math.sin(angle) * length * Math.random();
        const branchLength = length * 0.6;
        const branchAngle = angle + (Math.random() - 0.5) * Math.PI;
        
        ctx.beginPath();
        ctx.moveTo(branchX, branchY);
        ctx.lineTo(
          branchX + Math.cos(branchAngle) * branchLength,
          branchY + Math.sin(branchAngle) * branchLength
        );
        ctx.stroke();
      }
    }
  };
  
  // Wall pattern drawing functions
  const drawBlockPattern = (ctx: CanvasContext, x: number, y: number, width: number, height: number) => {
    if (!ctx) return;
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    
    const blockWidth = 20;
    const blockHeight = 20;
    
    // Draw vertical lines
    for (let posX = x; posX <= x + width; posX += blockWidth) {
      ctx.beginPath();
      ctx.moveTo(posX, y);
      ctx.lineTo(posX, y + height);
      ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let posY = y; posY <= y + height; posY += blockHeight) {
      ctx.beginPath();
      ctx.moveTo(x, posY);
      ctx.lineTo(x + width, posY);
      ctx.stroke();
    }
  };
  
  const drawBrickPattern = (ctx: CanvasContext, x: number, y: number, width: number, height: number) => {
    if (!ctx) return;
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    
    const brickHeight = 15;
    const brickWidth = 30;
    
    // Draw horizontal mortar lines
    for (let posY = y; posY <= y + height; posY += brickHeight) {
      ctx.beginPath();
      ctx.moveTo(x, posY);
      ctx.lineTo(x + width, posY);
      ctx.stroke();
    }
    
    // Draw vertical mortar lines for odd rows
    for (let posY = y; posY < y + height; posY += brickHeight * 2) {
      for (let posX = x; posX < x + width; posX += brickWidth) {
        ctx.beginPath();
        ctx.moveTo(posX, posY);
        ctx.lineTo(posX, posY + brickHeight);
        ctx.stroke();
      }
    }
    
    // Draw vertical mortar lines for even rows (offset)
    for (let posY = y + brickHeight; posY < y + height; posY += brickHeight * 2) {
      for (let posX = x + brickWidth / 2; posX < x + width; posX += brickWidth) {
        ctx.beginPath();
        ctx.moveTo(posX, posY);
        ctx.lineTo(posX, posY + brickHeight);
        ctx.stroke();
      }
    }
  };
  
  const drawCrackedPattern = (ctx: CanvasContext, x: number, y: number, width: number, height: number) => {
    if (!ctx) return;
    
    // First draw the block pattern as base
    drawBlockPattern(ctx, x, y, width, height);
    
    // Add cracks
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    
    const crackCount = Math.max(2, Math.round((width * height) / 5000));
    
    for (let i = 0; i < crackCount; i++) {
      const crackX = x + Math.random() * width;
      const crackY = y + Math.random() * height;
      const length = 20 + Math.random() * 30;
      const angle = Math.random() * Math.PI * 2;
      
      // Main crack
      ctx.beginPath();
      ctx.moveTo(crackX, crackY);
      ctx.lineTo(
        crackX + Math.cos(angle) * length, 
        crackY + Math.sin(angle) * length
      );
      ctx.stroke();
      
      // Branch cracks
      const branchCount = Math.floor(Math.random() * 3);
      for (let j = 0; j < branchCount; j++) {
        const branchX = crackX + Math.cos(angle) * length * 0.6;
        const branchY = crackY + Math.sin(angle) * length * 0.6;
        const branchLength = length * 0.4;
        const branchAngle = angle + (Math.random() - 0.5) * Math.PI / 2;
        
        ctx.beginPath();
        ctx.moveTo(branchX, branchY);
        ctx.lineTo(
          branchX + Math.cos(branchAngle) * branchLength,
          branchY + Math.sin(branchAngle) * branchLength
        );
        ctx.stroke();
      }
    }
  };
  
  const drawDetailedPattern = (ctx: CanvasContext, x: number, y: number, width: number, height: number) => {
    if (!ctx) return;
    
    // First draw the block pattern
    drawBlockPattern(ctx, x, y, width, height);
    
    // Add detailed texturing
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    const detailCount = Math.round((width * height) / 100);
    
    for (let i = 0; i < detailCount; i++) {
      const detailX = x + Math.random() * width;
      const detailY = y + Math.random() * height;
      const size = Math.random() * 3 + 1;
      
      ctx.beginPath();
      ctx.arc(detailX, detailY, size, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  
  const drawEngravedPattern = (ctx: CanvasContext, x: number, y: number, width: number, height: number) => {
    if (!ctx) return;
    
    // First draw basic blocks
    drawBlockPattern(ctx, x, y, width, height);
    
    // Add engraved design
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    
    const isVertical = height > width;
    
    if (isVertical) {
      // Vertical wall design
      const centerX = x + width / 2;
      
      // Draw vertical line
      ctx.beginPath();
      ctx.moveTo(centerX, y + 20);
      ctx.lineTo(centerX, y + height - 20);
      ctx.stroke();
      
      // Draw decorative elements
      for (let i = 0; i < 3; i++) {
        const elementY = y + 30 + i * (height - 60) / 2;
        
        // Draw circle or square pattern
        if (i % 2 === 0) {
          ctx.beginPath();
          ctx.arc(centerX, elementY, 8, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.strokeRect(centerX - 8, elementY - 8, 16, 16);
        }
      }
    } else {
      // Horizontal wall design
      const centerY = y + height / 2;
      
      // Draw horizontal line
      ctx.beginPath();
      ctx.moveTo(x + 20, centerY);
      ctx.lineTo(x + width - 20, centerY);
      ctx.stroke();
      
      // Draw decorative elements
      for (let i = 0; i < 5; i++) {
        const elementX = x + 30 + i * (width - 60) / 4;
        
        // Alternate circle and square patterns
        if (i % 2 === 0) {
          ctx.beginPath();
          ctx.arc(elementX, centerY, 8, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.strokeRect(elementX - 8, centerY - 8, 16, 16);
        }
      }
    }
  };

  // Room decoration functions
  const drawEntranceDecoration = (ctx: CanvasContext) => {
    if (!ctx) return;
    
    // Draw stairs symbol
    ctx.fillStyle = '#333333';
    
    const centerX = canvasWidth.value / 2;
    const centerY = canvasHeight.value / 2 + 50;
    const stairWidth = 100;
    
    // Draw steps
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(
        centerX - stairWidth / 2 + i * 10,
        centerY + i * 10,
        stairWidth - i * 20,
        8
      );
    }
  };
  
  const drawMonsterDecoration = (ctx: CanvasContext) => {
    if (!ctx) return;
    
    // Draw monster footprints/tracks
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    
    for (let i = 0; i < 8; i++) {
      const x = 100 + Math.random() * (canvasWidth.value - 200);
      const y = 100 + Math.random() * (canvasHeight.value - 200);
      
      // Draw paw print
      ctx.beginPath();
      ctx.ellipse(x, y, 10, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Toe prints
      ctx.beginPath();
      ctx.ellipse(x - 10, y - 15, 4, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.ellipse(x, y - 18, 4, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.ellipse(x + 10, y - 15, 4, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  
  const drawBossDecoration = (ctx: CanvasContext) => {
    if (!ctx) return;
    
    // Draw boss symbol (skull)
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    
    const centerX = canvasWidth.value / 2;
    const centerY = canvasHeight.value / 2 + 50;
    
    // Skull shape
    ctx.beginPath();
    ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(centerX - 15, centerY - 10, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(centerX + 15, centerY - 10, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Teeth
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(
        centerX - 20 + i * 10,
        centerY + 10,
        6,
        10
      );
    }
  };
  
  const drawLootDecoration = (ctx: CanvasContext, room: RoomDefinition) => {
    if (!ctx) return;
    
    // Draw treasure chest
    const centerX = canvasWidth.value / 2;
    const centerY = canvasHeight.value / 2 + 50;
    
    // Chest base
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(centerX - 30, centerY - 20, 60, 40);
    
    // Chest lid
    ctx.fillStyle = '#A0522D';
    ctx.beginPath();
    ctx.moveTo(centerX - 35, centerY - 20);
    ctx.lineTo(centerX + 35, centerY - 20);
    ctx.lineTo(centerX + 35, centerY - 35);
    ctx.lineTo(centerX - 35, centerY - 35);
    ctx.closePath();
    ctx.fill();
    
    // Chest lock
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(centerX - 5, centerY - 25, 10, 10);
    
    // Display loot content if available
    if (room.content && room.content.items && room.content.items.length > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `Contains: ${room.content.items.length} items`,
        centerX,
        centerY + 50
      );
    }
  };
  
  const drawShopDecoration = (ctx: CanvasContext) => {
    if (!ctx) return;
    
    const centerX = canvasWidth.value / 2;
    const centerY = canvasHeight.value / 2 + 50;
    
    // Shop counter
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(centerX - 80, centerY - 15, 160, 30);
    
    // Shop sign
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(centerX - 40, centerY - 80, 80, 30);
    
    ctx.fillStyle = '#FFD700';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SHOP', centerX, centerY - 60);
    
    // Items on counter
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(centerX - 60, centerY - 25, 20, 10);
    
    ctx.fillStyle = '#0000FF';
    ctx.fillRect(centerX - 20, centerY - 25, 15, 15);
    
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(centerX + 20, centerY - 25, 30, 10);
  };
  
  const drawTeleportDecoration = (ctx: CanvasContext) => {
    if (!ctx) return;
    
    const centerX = canvasWidth.value / 2;
    const centerY = canvasHeight.value / 2 + 50;
    
    // Draw teleport circle
    ctx.strokeStyle = 'rgba(100, 100, 255, 0.8)';
    ctx.lineWidth = 2;
    
    // Concentric circles
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, 50 - i * 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Magic symbols
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      const x = centerX + Math.cos(angle) * 40;
      const y = centerY + Math.sin(angle) * 40;
      
      ctx.fillStyle = 'rgba(150, 150, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Center glow
    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, 20
    );
    gradient.addColorStop(0, 'rgba(200, 200, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(200, 200, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
    ctx.fill();
  };

  // Era-specific visual effect functions
  const apply80sRetroStyle = (ctx: CanvasContext, imageData: ImageData) => {
    if (!ctx) return;
    
    const pixelSize = eraPixelSizes['retro80s'];
    
    // Apply color reduction for 8-bit look
    const data = imageData.data;
    const colorLevels = 4; // Very limited color palette
    const colorStep = 255 / (colorLevels - 1);
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.round(Math.round(data[i] / colorStep) * colorStep);
      data[i + 1] = Math.round(Math.round(data[i + 1] / colorStep) * colorStep);
      data[i + 2] = Math.round(Math.round(data[i + 2] / colorStep) * colorStep);
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Apply pixelation effect
    if (pixelSize > 1) {
      // Create temporary canvas for pixelation
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasWidth.value / pixelSize;
      tempCanvas.height = canvasHeight.value / pixelSize;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (tempCtx) {
        // Draw downscaled image
        tempCtx.drawImage(
          ctx.canvas, 
          0, 0, canvasWidth.value, canvasHeight.value,
          0, 0, tempCanvas.width, tempCanvas.height
        );
        
        // Draw upscaled pixelated image
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);
        ctx.drawImage(
          tempCanvas,
          0, 0, tempCanvas.width, tempCanvas.height,
          0, 0, canvasWidth.value, canvasHeight.value
        );
      }
    }
    
    // Add scanlines
    for (let y = 0; y < canvasHeight.value; y += 4) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, y, canvasWidth.value, 1);
    }
  };
  
  const apply90sSnesStyle = (ctx: CanvasContext, imageData: ImageData) => {
    if (!ctx) return;
    
    const pixelSize = eraPixelSizes['16bit90s'];
    
    // Apply color adjustment for 16-bit look
    const data = imageData.data;
    const colorLevelsR = 32; // 5-bit
    const colorLevelsG = 32; // 5-bit
    const colorLevelsB = 32; // 5-bit
    
    const colorStepR = 255 / (colorLevelsR - 1);
    const colorStepG = 255 / (colorLevelsG - 1);
    const colorStepB = 255 / (colorLevelsB - 1);
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.round(Math.round(data[i] / colorStepR) * colorStepR);
      data[i + 1] = Math.round(Math.round(data[i + 1] / colorStepG) * colorStepG);
      data[i + 2] = Math.round(Math.round(data[i + 2] / colorStepB) * colorStepB);
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Apply pixelation effect
    if (pixelSize > 1) {
      // Create temporary canvas for pixelation
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasWidth.value / pixelSize;
      tempCanvas.height = canvasHeight.value / pixelSize;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (tempCtx) {
        // Draw downscaled image
        tempCtx.drawImage(
          ctx.canvas, 
          0, 0, canvasWidth.value, canvasHeight.value,
          0, 0, tempCanvas.width, tempCanvas.height
        );
        
        // Draw upscaled pixelated image
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);
        ctx.drawImage(
          tempCanvas,
          0, 0, tempCanvas.width, tempCanvas.height,
          0, 0, canvasWidth.value, canvasHeight.value
        );
      }
    }
    
    // Enhance contrast and saturation slightly
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(180, 180, 200, 0.1)';
    ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value);
    ctx.globalCompositeOperation = 'source-over';
  };
  
  const applyRpgStyle = (ctx: CanvasContext) => {
    if (!ctx) return;
    
    const pixelSize = eraPixelSizes['rpg00s'];
    
    // Only slight pixelation for early 3D era
    if (pixelSize > 1) {
      // Create temporary canvas for pixelation
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasWidth.value / pixelSize;
      tempCanvas.height = canvasHeight.value / pixelSize;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (tempCtx) {
        // Draw downscaled image
        tempCtx.drawImage(
          ctx.canvas, 
          0, 0, canvasWidth.value, canvasHeight.value,
          0, 0, tempCanvas.width, tempCanvas.height
        );
        
        // Draw upscaled image with smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);
        ctx.drawImage(
          tempCanvas,
          0, 0, tempCanvas.width, tempCanvas.height,
          0, 0, canvasWidth.value, canvasHeight.value
        );
      }
    }
    
    // Add slight vignette effect
    const gradient = ctx.createRadialGradient(
      canvasWidth.value / 2, canvasHeight.value / 2, 0,
      canvasWidth.value / 2, canvasHeight.value / 2, canvasWidth.value / 1.5
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value);
    
    // Add blue tint common in PS1/PS2 era
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(100, 100, 150, 0.1)';
    ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value);
    ctx.globalCompositeOperation = 'source-over';
  };
  
  const applyModernStyle = (ctx: CanvasContext) => {
    if (!ctx) return;
    
    // Add ambient occlusion in corners
    ctx.globalCompositeOperation = 'multiply';
    
    // Top-left corner shadow
    const gradient1 = ctx.createRadialGradient(0, 0, 0, 0, 0, 200);
    gradient1.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
    gradient1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient1;
    ctx.fillRect(0, 0, 200, 200);
    
    // Top-right corner shadow
    const gradient2 = ctx.createRadialGradient(
      canvasWidth.value, 0, 0,
      canvasWidth.value, 0, 200
    );
    gradient2.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
    gradient2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient2;
    ctx.fillRect(canvasWidth.value - 200, 0, 200, 200);
    
    // Bottom corners
    const gradient3 = ctx.createRadialGradient(
      0, canvasHeight.value, 0,
      0, canvasHeight.value, 200
    );
    gradient3.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
    gradient3.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient3;
    ctx.fillRect(0, canvasHeight.value - 200, 200, 200);
    
    const gradient4 = ctx.createRadialGradient(
      canvasWidth.value, canvasHeight.value, 0,
      canvasWidth.value, canvasHeight.value, 200
    );
    gradient4.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
    gradient4.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient4;
    ctx.fillRect(canvasWidth.value - 200, canvasHeight.value - 200, 200, 200);
    
    ctx.globalCompositeOperation = 'source-over';
    
    // Add subtle light source from top
    ctx.globalCompositeOperation = 'overlay';
    const lightGradient = ctx.createLinearGradient(
      canvasWidth.value / 2, 0,
      canvasWidth.value / 2, canvasHeight.value
    );
    lightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    lightGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = lightGradient;
    ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value);
    ctx.globalCompositeOperation = 'source-over';
  };

  // Export background as image
  const exportBackground = () => {
    if (!dungeonCanvas.value) return false;
    
    try {
      // Convert canvas to data URL
      const imageURL = dungeonCanvas.value.toDataURL('image/png');
      
      // Create download link
      const downloadLink = document.createElement('a');
      downloadLink.href = imageURL;
      downloadLink.download = 'dungeon-background.png';
      
      // Trigger download
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      return true;
    } catch (error) {
      debug.error('Error exporting background:', error);
      return false;
    }
  };

  // Handle canvas resize
  const resizeCanvas = () => {
    if (!dungeonCanvas.value) return;
    
    // Use window dimensions
    canvasWidth.value = window.innerWidth;
    canvasHeight.value = window.innerHeight - 56; // Account for header
    
    // Update canvas dimensions
    dungeonCanvas.value.width = canvasWidth.value;
    dungeonCanvas.value.height = canvasHeight.value;
  };

  // Set up resize handler
  const initCanvasResizeHandling = () => {
    window.addEventListener('resize', resizeCanvas);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  };

  return {
    dungeonCanvas,
    canvasWidth,
    canvasHeight,
    showRoomTypeLabel,
    drawRoom,
    exportBackground,
    resizeCanvas,
    initCanvasResizeHandling
  };
}