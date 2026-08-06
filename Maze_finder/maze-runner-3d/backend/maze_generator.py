import random
import sys

# Increase recursion depth for larger mazes
sys.setrecursionlimit(20000)  # Task 4: larger maze needs deeper recursion

def generate_maze(rows=31, cols=31, seed=None):
    if rows % 2 == 0: rows += 1
    if cols % 2 == 0: cols += 1
    
    if seed is not None:
        random.seed(seed)
        
    grid = [[1 for _ in range(cols)] for _ in range(rows)]
    
    start_r, start_c = 1, 1
    end_r, end_c = rows - 2, cols - 2
    
    # Define safe zone as inner 7x7
    # For a given generic size, center is rows//2, cols//2
    # So r1 = rows//2 - 3, r2 = rows//2 + 3
    # Same for cols. 
    # Fallback to absolute if the maze is very small
    center_r = rows // 2
    center_c = cols // 2
    sz_r1 = max(1, center_r - 3)
    sz_r2 = min(rows - 2, center_r + 3)
    sz_c1 = max(1, center_c - 3)
    sz_c2 = min(cols - 2, center_c + 3)
    
    safe_zone = {
        "r1": sz_r1,
        "c1": sz_c1,
        "r2": sz_r2,
        "c2": sz_c2
    }
    
    def get_unvisited_neighbors(r, c):
        neighbors = []
        directs = [(-2, 0), (2, 0), (0, -2), (0, 2)]
        for dr, dc in directs:
            nr, nc = r + dr, c + dc
            if 0 < nr < rows and 0 < nc < cols and grid[nr][nc] == 1:
                neighbors.append((dr, dc))
        return neighbors

    def carve(r, c):
        grid[r][c] = 0
        neighbors = get_unvisited_neighbors(r, c)
        random.shuffle(neighbors)
        
        for dr, dc in neighbors:
            nr, nc = r + dr, c + dc
            if grid[nr][nc] == 1:
                # Carve the wall between
                grid[r + dr // 2][c + dc // 2] = 0
                carve(nr, nc)
                
    carve(start_r, start_c)
    
    # Post-process: Clear the Safe Zone Glade area
    for r in range(sz_r1, sz_r2 + 1):
        for c in range(sz_c1, sz_c2 + 1):
            grid[r][c] = 0
            
    # Guarantee the 4 main gates are open paths
    mid_r = (sz_r1 + sz_r2) // 2
    mid_c = (sz_c1 + sz_c2) // 2
    grid[sz_r1][mid_c] = 0 # North
    grid[sz_r2][mid_c] = 0 # South
    grid[mid_r][sz_c1] = 0 # West
    grid[mid_r][sz_c2] = 0 # East
    
    # Ensure end is open, though if it's odd it usually is touched
    grid[end_r][end_c] = 0
    grid[start_r][start_c] = 0
    
    return {
        "grid": grid,
        "rows": rows,
        "cols": cols,
        "start": [start_r, start_c],
        "end": [end_r, end_c],
        "safe_zone": safe_zone
    }

if __name__ == "__main__":
    m = generate_maze(21, 21, seed=42)
    for row in m['grid']:
        print("".join(["#" if c == 1 else " " for c in row]))
