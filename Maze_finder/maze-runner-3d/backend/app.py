from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import sqlite3

# Get the absolute path to the frontend directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, '..', 'frontend')
DB_PATH = os.path.join(BASE_DIR, 'maze_runner.db')

from maze_generator import generate_maze
from solvers import bfs_solve, dfs_solve, astar_solve
from csp_solver import MazeCSP
from griever import GrieverAgent
from models import init_db
# Note: If pyswip fails to find SWI-Prolog on Windows, you might need:
# os.environ['PATH'] = r"C:\Program Files\swipl\bin" + os.pathsep + os.environ['PATH']
# from pyswip import Prolog

app = Flask(__name__)
CORS(app)

# Initialize Prolog lazily
# prolog = None

# def get_prolog():
#     global prolog
#     if prolog is None:
#         try:
#             prolog = Prolog()
#             prolog_path = os.path.join(BASE_DIR, "knowledge_base.pl")
#             if os.path.exists(prolog_path):
#                 prolog.consult(prolog_path)
#                 print("Prolog Knowledge Base loaded successfully.")
#             else:
#                 print(f"Warning: Prolog file not found at {prolog_path}")
#         except Exception as e:
#             print(f"Prolog initialization error: {e}")
#             prolog = False # Mark as failed
#     return prolog

# Always initialize DB at startup (not just when run as __main__)
init_db()

print(f"Starting Maze Runner Backend...")
print(f"Frontend directory: {FRONTEND_DIR}")

def db_query(query, args=(), one=False):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(query, args)
    rv = cur.fetchall()
    conn.commit()
    conn.close()
    return (rv[0] if rv else None) if one else rv

current_maze_grid = None
griever_agent = None
last_stats = {}
maze_state = {}

@app.route('/api/maze', methods=['GET'])
def get_maze():
    global current_maze_grid, griever_agent, maze_state
    
    rows = request.args.get('rows', default=21, type=int)
    cols = request.args.get('cols', default=21, type=int)
    seed = request.args.get('seed', default=None, type=int)
    
    # Needs to be odd
    if rows % 2 == 0: rows += 1
    if cols % 2 == 0: cols += 1
    
    maze_data = generate_maze(rows=rows, cols=cols, seed=seed)
    
    current_maze_grid = maze_data["grid"]
    maze_state = maze_data
    
    # Initialize Griever
    griever_agent = GrieverAgent(current_maze_grid, maze_data["safe_zone"])
    
    return jsonify(maze_data)

@app.route('/api/solve', methods=['POST'])
def solve_maze():
    global last_stats
    
    data = request.get_json()
    if not data or 'grid' not in data or 'start' not in data or 'end' not in data or 'algorithm' not in data:
        return jsonify({"error": "Missing required fields"}), 400
        
    grid = data['grid']
    start = data['start']
    end = data['end']
    algorithm = data['algorithm']
    
    if algorithm == 'bfs':
        res = bfs_solve(grid, start, end)
        return jsonify(res)
    elif algorithm == 'dfs':
        res = dfs_solve(grid, start, end)
        return jsonify(res)
    elif algorithm == 'astar':
        res = astar_solve(grid, start, end)
        return jsonify(res)
    elif algorithm == 'all':
        res_bfs = bfs_solve(grid, start, end)
        res_dfs = dfs_solve(grid, start, end)
        res_astar = astar_solve(grid, start, end)
        
        # BUG-13 Fix: Store only required stats to prevent memory bloat
        last_stats = {
            "bfs": {"steps_count": res_bfs["steps_count"], "path_length": res_bfs["path_length"], "time_ms": res_bfs["time_ms"]},
            "dfs": {"steps_count": res_dfs["steps_count"], "path_length": res_dfs["path_length"], "time_ms": res_dfs["time_ms"]},
            "astar": {"steps_count": res_astar["steps_count"], "path_length": res_astar["path_length"], "time_ms": res_astar["time_ms"]}
        }
        
        # return astar path as default action when running all
        return jsonify({
            "path": res_astar["path"],
            "visited_order": res_astar["visited_order"],
            "steps_count": res_astar["steps_count"],
            "path_length": res_astar["path_length"],
            "time_ms": res_astar["time_ms"]
        })
    else:
        return jsonify({"error": "Unknown algorithm specified"}), 400

@app.route('/api/night', methods=['POST'])
def night_transition():
    global current_maze_grid, maze_state, griever_agent
    data = request.get_json()
    
    if not data or 'current_grid' not in data or 'formation' not in data:
        return jsonify({"error": "Missing required fields"}), 400
        
    current_grid = data['current_grid']
    formation = data['formation']
    player_pos     = data.get('player_pos', None)
    player_trapped = data.get('player_trapped', False)
    
    if not maze_state:
        return jsonify({"error": "Generate maze first"}), 400
        
    csp = MazeCSP(len(current_grid), len(current_grid[0]), maze_state["safe_zone"])
    # Pass player position as 'avoid_pos' list to the solver
    avoid_list = [player_pos] if player_pos else []
    if player_trapped and player_pos:
        print(f"[NIGHT] Player TRAPPED at {player_pos} — CSP avoids their cell")
    result = csp.solve(current_grid, formation, avoid_pos=avoid_list)
    
    current_maze_grid = result["new_grid"]
    
    # BUG-07 Fix: Re-initialize GrieverAgent after CSP maze change
    griever_agent = GrieverAgent(current_maze_grid, maze_state["safe_zone"])
    
    return jsonify(result)

@app.route('/api/scores', methods=['GET'])
def get_scores():
    try:
        rows = db_query(
            "SELECT u.username, s.time_taken FROM scores s "
            "JOIN users u ON s.user_id = u.id "
            "ORDER BY s.time_taken ASC LIMIT 10"
        )
        return jsonify([dict(r) for r in (rows or [])])
    except Exception as e:
        print(f"[SCORES] {e}")
        return jsonify([])

@app.route('/api/griever', methods=['POST'])
def update_griever():
    global griever_agent
    
    if not griever_agent:
        return jsonify({"error": "Generate maze first so griever agent initializes"}), 400
        
    data = request.get_json()
    if not data or 'griever_pos' not in data or 'player_pos' not in data or 'is_night' not in data:
        return jsonify({"error": "Missing required fields"}), 400
        
    griever_pos = data['griever_pos']
    player_pos = data['player_pos']
    # E1: Accept use_cached flag to avoid sending full grid each call
    use_cached = data.get('use_cached', False)
    grid = current_maze_grid if (use_cached and current_maze_grid) else data.get('grid', current_maze_grid)
    is_night = data['is_night']
    
    # --- PYTHON FORWARD-CHAINING RULE ENGINE (Unit III — C4) ---
    # Rule 1: IF player in safe zone          THEN DORMANT
    # Rule 2: IF night AND player outside     THEN CHASE
    # Rule 3: IF day AND player near griever  THEN ALERT
    # Rule 4: default                         THEN DORMANT
    sz = maze_state.get('safe_zone', {})
    pr, pc = player_pos[0], player_pos[1]
    gr, gc = griever_pos[0], griever_pos[1]

    def in_safe_zone(r, c):
        return sz.get('r1', 0) <= r <= sz.get('r2', 0) and sz.get('c1', 0) <= c <= sz.get('c2', 0)

    def manhattan(a, b):
        return abs(a[0] - b[0]) + abs(a[1] - b[1])

    if in_safe_zone(pr, pc):
        griever_agent.state = "DORMANT"                        # Rule 1
    elif is_night and not in_safe_zone(pr, pc):
        griever_agent.state = "CHASE"                          # Rule 2
    elif not is_night and manhattan([pr, pc], [gr, gc]) <= 5:
        griever_agent.state = "ALERT"                          # Rule 3
    else:
        griever_agent.state = "DORMANT"                        # Rule 4

    print(f"[KB] Rules fired: state={griever_agent.state}, night={is_night}, player_in_safe={in_safe_zone(pr,pc)}")
    
    next_move = griever_agent.get_next_move(griever_pos, player_pos, grid)
    
    target = griever_agent.target
    if target:
        path = astar_solve(grid, griever_pos, target)['path']
    else:
        path = []
        
    return jsonify({
        "next_move": next_move,
        "state": griever_agent.state,
        "path": path,
        "target": target
    })

@app.route('/api/stats', methods=['GET'])
def get_stats():
    return jsonify(last_stats)

@app.route('/api/newgame', methods=['POST'])
def new_game():
    global current_maze_grid, griever_agent, last_stats, maze_state
    current_maze_grid = None
    griever_agent = None
    last_stats = {}
    maze_state = {}
    return jsonify({"status": "reset"})

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"error": "Missing username or password"}), 400
        
    try:
        db_query("INSERT INTO users (username, password) VALUES (?, ?)", (username, password))
        return jsonify({"message": "User registered successfully"})
    except sqlite3.IntegrityError:
        return jsonify({"error": "Username already exists"}), 400

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    user_row = db_query("SELECT id, username, role FROM users WHERE username = ? AND password = ?", (username, password), one=True)
    if user_row:
        # Convert sqlite3.Row to dict for easier access and JSON serialization
        user = dict(user_row)
        return jsonify({
            "id": user['id'],
            "username": user['username'],
            "role": user['role']
        })
    else:
        return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/save_score', methods=['POST'])
def save_score():
    data = request.get_json()
    user_id = data.get('user_id')
    time_taken = data.get('time_taken')
    seed = data.get('maze_seed')
    
    if not user_id or not time_taken:
        return jsonify({"error": "Missing required score data"}), 400
        
    db_query("INSERT INTO scores (user_id, time_taken, maze_seed) VALUES (?, ?, ?)", 
             (user_id, time_taken, seed))
    return jsonify({"message": "Score saved"})

@app.route('/api/admin/users', methods=['GET'])
def get_all_users():
    # In a real app, check for admin role here
    users = db_query("SELECT id, username, role FROM users")
    return jsonify([dict(u) for u in (users or [])])

@app.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    # Never serve API paths as static files — return 404 explicitly
    if filename.startswith('api/'):
        return jsonify({"error": "Not found"}), 404
    return send_from_directory(FRONTEND_DIR, filename)

if __name__ == "__main__":
    # Disable reloader because it causes issues with pyswip on Windows
    app.run(debug=True, port=5000, use_reloader=False)
