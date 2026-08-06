import random
from solvers import bfs_solve, astar_solve, manhattan

DORMANT = "DORMANT"
ALERT = "ALERT"
CHASE = "CHASE"

class GrieverAgent:
    def __init__(self, maze_grid, safe_zone):
        self.state = DORMANT
        self.position = [1, len(maze_grid[0]) - 2] # Start away from player
        self.target = None
        self.safe_zone = safe_zone
        
    def _in_safe_zone(self, pos):
        r, c = pos
        sz = self.safe_zone
        return sz['r1'] <= r <= sz['r2'] and sz['c1'] <= c <= sz['c2']
        
    def _dist_to_boundary(self, pos):
        r, c = pos
        sz = self.safe_zone
        
        # Min distance to boundary of safe zone
        dist_r = min(abs(r - sz['r1']), abs(r - sz['r2']))
        dist_c = min(abs(c - sz['c1']), abs(c - sz['c2']))
        
        if self._in_safe_zone(pos):
            return 0
            
        # If outside, calculate Manhattan to nearest boundary cell
        # Boundary cells are r in [r1, r2] and c in {c1, c2} or vice versa
        closest_r = max(sz['r1'], min(r, sz['r2']))
        closest_c = max(sz['c1'], min(c, sz['c2']))
        
        return manhattan(pos, [closest_r, closest_c])

    def _get_nearest_boundary_cell(self, pos):
        r, c = pos
        sz = self.safe_zone
        closest_r = max(sz['r1'], min(r, sz['r2']))
        closest_c = max(sz['c1'], min(c, sz['c2']))
        return [closest_r, closest_c]

    def update_state(self, player_pos, is_night):
        if self._in_safe_zone(player_pos):
            self.state = DORMANT
        elif self._dist_to_boundary(player_pos) <= 3 and not is_night:
            self.state = ALERT
        elif not self._in_safe_zone(player_pos) and is_night:
            self.state = CHASE
        else:
            self.state = DORMANT
            
        return self.state

    def get_next_move(self, griever_pos, player_pos, grid):
        self.position = list(griever_pos)
        
        if self.state == DORMANT:
            # Random adjacent open cell
            r, c = self.position
            neighbors = []
            for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nr, nc = r + dr, c + dc
                if 0 <= nr < len(grid) and 0 <= nc < len(grid[0]) and grid[nr][nc] == 0:
                    neighbors.append([nr, nc])
            if neighbors:
                next_step = random.choice(neighbors)
                return next_step
            return self.position
            
        elif self.state == ALERT:
            # BFS one step toward safe zone boundary
            boundary_cell = self._get_nearest_boundary_cell(self.position)
            self.target = boundary_cell
            result = bfs_solve(grid, self.position, boundary_cell)
            if result['path'] and len(result['path']) > 1:
                return result['path'][1]
            return self.position
            
        elif self.state == CHASE:
            # A* one step toward player_pos
            self.target = player_pos
            result = astar_solve(grid, self.position, player_pos)
            if result['path'] and len(result['path']) > 1:
                return result['path'][1]
            return self.position

    def to_dict(self):
        return {
            "state": self.state,
            "position": self.position,
            "target": self.target
        }
