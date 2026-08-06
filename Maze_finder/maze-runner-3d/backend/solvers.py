import time
from collections import deque
import heapq

def reconstruct_path(parent, start, end):
    path = []
    curr = tuple(end)
    while curr in parent:
        path.append(list(curr))
        curr = parent[curr]
    path.append(list(start))
    path.reverse()
    return path

def get_neighbors(r, c, grid):
    neighbors = []
    rows, cols = len(grid), len(grid[0])
    # 4 directions
    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        nr, nc = r + dr, c + dc
        if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
            neighbors.append((nr, nc))
    return neighbors

def bfs_solve(grid, start, end):
    start_time = time.time()
    start_t, end_t = tuple(start), tuple(end)
    queue = deque([start_t])
    visited = {start_t}
    parent = {}
    visited_order = []
    
    found = False
    while queue:
        curr = queue.popleft()
        visited_order.append(list(curr))
        
        if curr == end_t:
            found = True
            break
            
        for nxt in get_neighbors(curr[0], curr[1], grid):
            if nxt not in visited:
                visited.add(nxt)
                parent[nxt] = curr
                queue.append(nxt)
                
    path = reconstruct_path(parent, start_t, end_t) if found else []
    
    return {
        "path": path,
        "visited_order": visited_order,
        "steps_count": len(visited_order),
        "path_length": len(path) if path else 0,
        "time_ms": (time.time() - start_time) * 1000
    }

def dfs_solve(grid, start, end):
    start_time = time.time()
    start_t, end_t = tuple(start), tuple(end)
    stack = [start_t]
    visited = {start_t}
    parent = {}
    visited_order = []
    
    found = False
    while stack:
        curr = stack.pop()
        visited_order.append(list(curr))
        
        if curr == end_t:
            found = True
            break
            
        for nxt in get_neighbors(curr[0], curr[1], grid):
            if nxt not in visited:
                visited.add(nxt)
                parent[nxt] = curr
                stack.append(nxt)
                
    path = reconstruct_path(parent, start_t, end_t) if found else []
    
    return {
        "path": path,
        "visited_order": visited_order,
        "steps_count": len(visited_order),
        "path_length": len(path) if path else 0,
        "time_ms": (time.time() - start_time) * 1000
    }

def manhattan(p1, p2):
    return abs(p1[0] - p2[0]) + abs(p1[1] - p2[1])

def astar_solve(grid, start, end):
    start_time = time.time()
    start_t, end_t = tuple(start), tuple(end)
    
    open_list = []
    # heapq format: (f, g, count, node) to handle ties
    # storing count avoids comparing nodes if priorities are tied
    counter = 0
    heapq.heappush(open_list, (manhattan(start_t, end_t), 0, counter, start_t))
    
    parent = {}
    g_scores = {start_t: 0}
    visited_order = []
    closed_set = set()
    
    found = False
    while open_list:
        f, g, _, curr = heapq.heappop(open_list)
        
        if curr in closed_set:
            continue
            
        closed_set.add(curr)
        visited_order.append(list(curr))
        
        if curr == end_t:
            found = True
            break
            
        for nxt in get_neighbors(curr[0], curr[1], grid):
            tentative_g = g + 1
            if nxt not in g_scores or tentative_g < g_scores[nxt]:
                g_scores[nxt] = tentative_g
                f_score = tentative_g + manhattan(nxt, end_t)
                counter += 1
                heapq.heappush(open_list, (f_score, tentative_g, counter, nxt))
                parent[nxt] = curr
                
    path = reconstruct_path(parent, start_t, end_t) if found else []
    
    return {
        "path": path,
        "visited_order": visited_order,
        "steps_count": len(visited_order),
        "path_length": len(path) if path else 0,
        "time_ms": (time.time() - start_time) * 1000
    }

if __name__ == "__main__":
    from maze_generator import generate_maze
    m = generate_maze(21, 21, seed=42)
    for name, fn in [("BFS", bfs_solve), ("DFS", dfs_solve), ("A*", astar_solve)]:
        res = fn(m["grid"], m["start"], m["end"])
        print(f"{name}: path={res['path_length']} steps={res['steps_count']} time={res['time_ms']:.2f}ms")
