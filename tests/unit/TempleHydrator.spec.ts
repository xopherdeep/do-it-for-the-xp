import { TempleHydrator } from '@/lib/engine/core/dungeons/TempleHydrator';

describe('TempleHydrator', () => {
  const testBlueprint = `
    EXIT  ____  M01_
    ____  BOSS  ____
    $GP$  ____  EXIT
  `;

  it('should hydrate a valid dungeon from a DSL string with EXIT as entrance/exit', () => {
    const dungeon = TempleHydrator.hydrate(testBlueprint, 'test-temple', 'Test Temple');

    expect(dungeon.id).toBe('test-temple');
    expect(dungeon.name).toBe('Test Temple');
    expect(dungeon.maze.length).toBe(3);
    
    const maze = dungeon.maze as string[][];
    expect(maze[0].length).toBe(3);

    // First EXIT is entrance
    expect(dungeon.entrance).toEqual([0, 0]);
    expect(dungeon.rooms[maze[0][0]].type).toBe('entrance');

    // Check monster
    expect(dungeon.rooms[maze[0][2]].type).toBe('monster');
    expect(dungeon.rooms[maze[0][2]].content?.difficulty).toBe('normal');

    // Check boss
    expect(dungeon.rooms[maze[1][1]].type).toBe('boss');

    // Check loot
    expect(dungeon.rooms[maze[2][0]].type).toBe('loot');
    expect(dungeon.rooms[maze[2][0]].content?.chest).toBe('gold');

    // Last EXIT is exit
    expect(dungeon.rooms[maze[2][2]].type).toBe('exit');
  });

  it('should handle M01! hard monsters (4 chars)', () => {
    const blueprint = 'M01!';
    const dungeon = TempleHydrator.hydrate(blueprint, 'test', 'test');
    const firstRoomKey = (dungeon.maze as string[][])[0][0];
    expect(dungeon.rooms[firstRoomKey].content?.difficulty).toBe('hard');
    expect(dungeon.rooms[firstRoomKey].content?.lockOnEnter).toBe(true);
  });

  it('should handle D1_N locked doors (4 chars)', () => {
    const blueprint = 'D1_N D1_S DMSN';
    const dungeon = TempleHydrator.hydrate(blueprint, 'test', 'test');
    const maze = (dungeon.maze as string[][])[0];
    
    expect(dungeon.rooms[maze[0]].content?.keyRequired).toBe('key1');
    expect(dungeon.rooms[maze[0]].locked?.north).toBe(true);
    
    expect(dungeon.rooms[maze[1]].content?.keyRequired).toBe('key1');
    expect(dungeon.rooms[maze[1]].locked?.south).toBe(true);
    
    expect(dungeon.rooms[maze[2]].content?.keyRequired).toBe('master');
    expect(dungeon.rooms[maze[2]].locked?.north).toBe(true);
  });
});
