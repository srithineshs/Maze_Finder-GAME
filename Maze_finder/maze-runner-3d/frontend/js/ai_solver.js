// ai_solver.js

window.vizMeshes = [];
let animIntervals = [];

const colors = {
    'bfs': 0x4a8cff,
    'dfs': 0xff6b4a,
    'astar': 0x4aff8c
};

window.stopAnimation = function () {
    animIntervals.forEach(clearInterval);
    animIntervals = [];

    if (window.vizMeshes) {
        window.vizMeshes.forEach(mesh => {
            window.scene.remove(mesh);
            // Properly dispose geometry and material to prevent GPU memory leak
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        });
    }
    window.vizMeshes = [];
};

window.solveMaze = async function (grid, start, end, algorithm) {
    window.stopAnimation();

    const response = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grid, start, end, algorithm })
    });

    if (!response.ok) return null;
    const data = await response.json();

    const color = colors[algorithm] || 0xffffff;
    const visitedNodes = data.visited_order || [];
    const pathNodes = data.path || [];

    const exploreGeo = new THREE.PlaneGeometry(0.3, 0.3);
    const exploreMat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });

    let visitIndex = 0;
    const visitInterval = setInterval(() => {
        if (visitIndex < visitedNodes.length) {
            const [r, c] = visitedNodes[visitIndex];
            const mesh = new THREE.Mesh(exploreGeo, exploreMat);
            mesh.position.set(c, 0.05, r);
            mesh.rotation.x = -Math.PI / 2;
            window.scene.add(mesh);
            window.vizMeshes.push(mesh);
            visitIndex++;
        } else {
            clearInterval(visitInterval);

            // Path animation
            const pathGeo = new THREE.PlaneGeometry(0.5, 0.5);
            const pathMat = new THREE.MeshLambertMaterial({
                color: 0xffffff,
                emissive: color,
                emissiveIntensity: 1
            });
            const pathMesh = new THREE.Mesh(pathGeo, pathMat);
            window.scene.add(pathMesh);
            window.vizMeshes.push(pathMesh);

            let pathIndex = 0;
            const pathInterval = setInterval(() => {
                if (pathIndex < pathNodes.length) {
                    const [r, c] = pathNodes[pathIndex];
                    pathMesh.position.set(c, 0.06, r);
                    pathMesh.rotation.x = -Math.PI / 2;
                    pathIndex++;
                } else {
                    clearInterval(pathInterval);
                }
            }, 150);
            animIntervals.push(pathInterval);
        }
    }, 40);

    animIntervals.push(visitInterval);
    return data;
};

window.runAllThree = async function (grid, start, end) {
    window.stopAnimation();

    const fetchAlg = (algorithm) => fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grid, start, end, algorithm })
    }).then(r => r.json());

    const bfsData = await fetchAlg('bfs');
    const dfsData = await fetchAlg('dfs');
    const astarData = await fetchAlg('astar');

    if (window.updateStatsPanel) {
        window.updateStatsPanel(bfsData, dfsData, astarData);
    }
};
