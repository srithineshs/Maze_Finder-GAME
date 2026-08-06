import subprocess
import sys
import os
import time

def run():
    print("="*50)
    print("MAZE RUNNER 3D - UNIFIED STARTER")
    print("="*50)
    
    # Path to backend app
    backend_script = os.path.join("backend", "app.py")
    
    if not os.path.exists(backend_script):
        print(f"Error: Could not find {backend_script}")
        return

    print("Starting Flask server (Backend + Frontend)...")
    print("This will serve the game at: http://127.0.0.1:5000")
    print("Press CTRL+C to stop the server.")
    print("-" * 50)
    
    try:
        # Run the backend script
        # Since app.py now serves the frontend, we only need this one process.
        process = subprocess.Popen([sys.executable, backend_script])
        process.wait()
    except KeyboardInterrupt:
        print("\nStopping server...")
        process.terminate()
        print("Done.")

if __name__ == "__main__":
    run()
