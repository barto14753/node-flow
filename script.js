// Global variables
let network;
let nodes, edges;
let nodeCounter = 0;
let edgeCounter = 0;
let currentEditingNode = null;
let currentEditingEdge = null;
let algorithmRunning = false;
let algorithmTimeout = null;
let isDraggingEdge = false;
let edgeSourceNode = null;
let isRightMouseDown = false;
let hoveredNode = null;
let selectedNodeForEdge = null;

// vis.js options
const options = {
	physics: {
		enabled: true,
		stabilization: {
			iterations: 100,
			fit: false,
			onlyDynamicEdges: false,
			updateInterval: 100,
		},
		solver: "barnesHut",
		barnesHut: {
			gravitationalConstant: -8000,
			centralGravity: 0.3,
			springLength: 95,
			springConstant: 0.04,
			damping: 0.09,
			avoidOverlap: 0,
		},
		adaptiveTimestep: true,
		timestep: 0.5,
	},
	interaction: {
		dragNodes: true,
		dragView: true,
		zoomView: true,
		selectConnectedEdges: false,
	},
	manipulation: {
		enabled: false,
	},
	nodes: {
		shape: "circle",
		size: 25,
		font: {
			size: 16,
			color: "#ffffff",
		},
		borderWidth: 2,
		shadow: true,
	},
	edges: {
		width: 2,
		shadow: true,
		smooth: {
			type: "continuous",
		},
	},
};

// Application initialization
document.addEventListener("DOMContentLoaded", function () {
	initializeNetwork();
	setupEventListeners();
	updateStartNodeSelect();
});

// Initialize network
function initializeNetwork() {
	const container = document.getElementById("network");

	// Initialize data sets
	nodes = new vis.DataSet([]);
	edges = new vis.DataSet([]);

	const data = { nodes: nodes, edges: edges };
	network = new vis.Network(container, data, options);

	// Network event listeners
	network.on("click", onNetworkClick);
	network.on("doubleClick", onNetworkDoubleClick);
	network.on("oncontext", onNetworkRightClick);
	network.on("selectEdge", onEdgeSelect);
	network.on("deselectAll", onDeselectAll);
}

// Setup event listeners
function setupEventListeners() {
	// Node management buttons
	document.getElementById("addNode").addEventListener("click", addNode);

	// Algorithms
	document.getElementById("runBFS").addEventListener("click", runBFS);
	document.getElementById("runDFS").addEventListener("click", runDFS);
	document
		.getElementById("stopAlgorithm")
		.addEventListener("click", stopAlgorithm);

	// Other functions
	document.getElementById("clearGraph").addEventListener("click", clearGraph);
	document.getElementById("centerGraph").addEventListener("click", centerGraph);

	// Checkbox for directed edges
	document
		.getElementById("directedEdges")
		.addEventListener("change", toggleDirectedEdges);

	// Edge management buttons
	document
		.getElementById("connectAllNodes")
		.addEventListener("click", connectAllNodes);
	document
		.getElementById("removeAllEdges")
		.addEventListener("click", removeAllEdges);

	// Modals
	setupModalListeners();

	// Forms
	document
		.getElementById("nodeForm")
		.addEventListener("submit", saveNodeChanges);
	document
		.getElementById("edgeForm")
		.addEventListener("submit", saveEdgeChanges);

	// Delete buttons in modals
	document
		.getElementById("deleteNodeBtn")
		.addEventListener("click", deleteCurrentNode);
	document
		.getElementById("deleteEdgeBtn")
		.addEventListener("click", deleteCurrentEdge);

	// Prevent context menu on network
	document
		.getElementById("network")
		.addEventListener("contextmenu", function (e) {
			e.preventDefault();
		});
}

// Setup modals
function setupModalListeners() {
	const modals = ["nodeModal", "edgeModal"];

	modals.forEach((modalId) => {
		const modal = document.getElementById(modalId);
		const closeBtn = modal.querySelector(".close");

		closeBtn.addEventListener("click", () => closeModal(modalId));

		window.addEventListener("click", (event) => {
			if (event.target === modal) {
				closeModal(modalId);
			}
		});
	});
}

// Adding node
function addNode() {
	nodeCounter++;
	const newNode = {
		id: nodeCounter,
		label: `Node ${nodeCounter}`,
		color: "#3498db",
		originalColor: "#3498db",
		x: Math.random() * 400 - 200,
		y: Math.random() * 400 - 200,
	};

	nodes.add(newNode);
	updateStartNodeSelect();
	updateInfo(`Added node: ${newNode.label}`);
}

// Edit selected node
function editSelectedNode() {
	const selectedNodes = network.getSelectedNodes();
	if (selectedNodes.length === 0) {
		alert("Select a node to edit");
		return;
	}

	const nodeId = selectedNodes[0];
	const node = nodes.get(nodeId);
	currentEditingNode = nodeId;

	// Fill form
	document.getElementById("nodeName").value = node.label;
	document.getElementById("nodeColor").value =
		node.color || node.originalColor || "#3498db";

	openModal("nodeModal");
}

// Save node changes
function saveNodeChanges(event) {
	event.preventDefault();

	if (currentEditingNode === null) return;

	const newColor = document.getElementById("nodeColor").value;

	const updatedNode = {
		id: currentEditingNode,
		label: document.getElementById("nodeName").value,
		color: newColor,
		originalColor: newColor,
	};

	nodes.update(updatedNode);
	updateStartNodeSelect();
	closeModal("nodeModal");
	updateInfo(`Updated node: ${updatedNode.label}`);
}

// Delete current node (from modal)
function deleteCurrentNode() {
	if (currentEditingNode === null) return;

	// Remove all edges connected to the node
	const connectedEdges = network.getConnectedEdges(currentEditingNode);
	edges.remove(connectedEdges);

	// Remove node
	nodes.remove(currentEditingNode);
	updateStartNodeSelect();
	closeModal("nodeModal");
	updateInfo("Removed node and related edges");
}

// Save edge changes
function saveEdgeChanges(event) {
	event.preventDefault();

	if (currentEditingEdge === null) return;

	const weight = document.getElementById("edgeWeight").value;
	const label = document.getElementById("edgeLabel").value;
	const color = document.getElementById("edgeColor").value;

	const updatedEdge = {
		id: currentEditingEdge,
		color: color,
	};

	if (weight) {
		updatedEdge.weight = parseFloat(weight);
		updatedEdge.label = weight;
	}

	if (label) {
		updatedEdge.label = label;
	}

	edges.update(updatedEdge);
	closeModal("edgeModal");
	updateInfo("Updated edge");
}

// Delete current edge (from modal)
function deleteCurrentEdge() {
	if (currentEditingEdge === null) return;

	edges.remove(currentEditingEdge);
	closeModal("edgeModal");
	updateInfo("Removed edge");
}

// Toggle directed edges
function toggleDirectedEdges() {
	const directed = document.getElementById("directedEdges").checked;

	const edgeUpdate = edges.get().map((edge) => ({
		...edge,
		arrows: directed ? { to: { enabled: true } } : { to: { enabled: false } },
	}));

	edges.update(edgeUpdate);
	updateInfo(`Switched to ${directed ? "directed" : "undirected"} edges`);
}

// Connect all nodes
function connectAllNodes() {
	const allNodes = nodes.get();
	if (allNodes.length < 2) {
		updateInfo("Need at least 2 nodes to create connections");
		return;
	}

	const directed = document.getElementById("directedEdges").checked;
	let newEdgesCount = 0;

	// Create edges between all pairs of nodes
	for (let i = 0; i < allNodes.length; i++) {
		for (let j = i + 1; j < allNodes.length; j++) {
			const fromNode = allNodes[i].id;
			const toNode = allNodes[j].id;

			// Check if edge already exists
			const existingEdges = edges.get();
			const edgeExists = existingEdges.some(
				(edge) =>
					(edge.from === fromNode && edge.to === toNode) ||
					(!directed && edge.from === toNode && edge.to === fromNode)
			);

			if (!edgeExists) {
				edgeCounter++;
				const newEdge = {
					id: edgeCounter,
					from: fromNode,
					to: toNode,
					arrows: directed
						? { to: { enabled: true } }
						: { to: { enabled: false } },
				};
				edges.add(newEdge);
				newEdgesCount++;

				// If directed, also create reverse edge
				if (directed) {
					edgeCounter++;
					const reverseEdge = {
						id: edgeCounter,
						from: toNode,
						to: fromNode,
						arrows: { to: { enabled: true } },
					};
					edges.add(reverseEdge);
					newEdgesCount++;
				}
			}
		}
	}

	updateInfo(`Connected all nodes. Added ${newEdgesCount} new edges`);
}

// Remove all edges
function removeAllEdges() {
	const allEdges = edges.get();
	if (allEdges.length === 0) {
		updateInfo("No edges to remove");
		return;
	}

	const edgeCount = allEdges.length;
	edges.clear();
	updateInfo(`Removed all ${edgeCount} edges`);
}

// BFS Algorithm
async function runBFS() {
	const startNodeId = document.getElementById("startNode").value;
	if (!startNodeId) {
		alert("Select a start node");
		return;
	}

	if (algorithmRunning) {
		alert("Algorithm is already running");
		return;
	}

	resetNodeColors();
	algorithmRunning = true;
	updateInfo("Started BFS...");

	const queue = [parseInt(startNodeId)];
	const visited = new Set();
	const allNodes = nodes.get();

	while (queue.length > 0 && algorithmRunning) {
		const currentNodeId = queue.shift();

		if (visited.has(currentNodeId)) continue;

		visited.add(currentNodeId);

		// Highlight current node
		highlightNode(currentNodeId, "#f39c12");
		await sleep(1000);

		// Mark as visited
		highlightNode(currentNodeId, "#2ecc71");

		// Find neighbors (respecting directed edges)
		const connectedEdges = network.getConnectedEdges(currentNodeId);
		const directed = document.getElementById("directedEdges").checked;

		for (let edgeId of connectedEdges) {
			const edge = edges.get(edgeId);
			let neighborId = null;

			if (directed) {
				// For directed graphs, only follow edges going OUT from current node
				if (edge.from === currentNodeId) {
					neighborId = edge.to;
				}
			} else {
				// For undirected graphs, can go both ways
				neighborId = edge.from === currentNodeId ? edge.to : edge.from;
			}

			if (
				neighborId &&
				!visited.has(neighborId) &&
				!queue.includes(neighborId)
			) {
				queue.push(neighborId);
				highlightNode(neighborId, "#3498db");
			}
		}

		updateAlgorithmInfo(
			`BFS: Visited ${visited.size} nodes, Queue: ${queue.length}`
		);
		await sleep(500);
	}

	algorithmRunning = false;
	updateInfo("BFS finished");
	updateAlgorithmInfo(`BFS finished. Visited ${visited.size} nodes.`);

	// Reset colors after 2 seconds
	setTimeout(() => {
		resetNodeColors();
		updateInfo("Graph colors reset");
	}, 2000);
}

// DFS Algorithm
async function runDFS() {
	const startNodeId = document.getElementById("startNode").value;
	if (!startNodeId) {
		alert("Select a start node");
		return;
	}

	if (algorithmRunning) {
		alert("Algorithm is already running");
		return;
	}

	resetNodeColors();
	algorithmRunning = true;
	updateInfo("Started DFS...");

	const stack = [parseInt(startNodeId)];
	const visited = new Set();

	while (stack.length > 0 && algorithmRunning) {
		const currentNodeId = stack.pop();

		if (visited.has(currentNodeId)) continue;

		visited.add(currentNodeId);

		// Highlight current node
		highlightNode(currentNodeId, "#f39c12");
		await sleep(1000);

		// Mark as visited
		highlightNode(currentNodeId, "#2ecc71");

		// Find neighbors (respecting directed edges)
		const connectedEdges = network.getConnectedEdges(currentNodeId);
		const directed = document.getElementById("directedEdges").checked;

		for (let edgeId of connectedEdges) {
			const edge = edges.get(edgeId);
			let neighborId = null;

			if (directed) {
				// For directed graphs, only follow edges going OUT from current node
				if (edge.from === currentNodeId) {
					neighborId = edge.to;
				}
			} else {
				// For undirected graphs, can go both ways
				neighborId = edge.from === currentNodeId ? edge.to : edge.from;
			}

			if (neighborId && !visited.has(neighborId)) {
				stack.push(neighborId);
				highlightNode(neighborId, "#9b59b6");
			}
		}

		updateAlgorithmInfo(
			`DFS: Visited ${visited.size} nodes, Stack: ${stack.length}`
		);
		await sleep(500);
	}

	algorithmRunning = false;
	updateInfo("DFS finished");
	updateAlgorithmInfo(`DFS finished. Visited ${visited.size} nodes.`);

	// Reset colors after 2 seconds
	setTimeout(() => {
		resetNodeColors();
		updateInfo("Graph colors reset");
	}, 2000);
}

// Stop algorithm
function stopAlgorithm() {
	algorithmRunning = false;
	if (algorithmTimeout) {
		clearTimeout(algorithmTimeout);
	}
	resetNodeColors();
	updateInfo("Algorithm stopped");
	updateAlgorithmInfo("");
}

// Clear graph
function clearGraph() {
	nodes.clear();
	edges.clear();
	nodeCounter = 0;
	edgeCounter = 0;
	updateStartNodeSelect();
	updateInfo("Graph cleared");
}

// Center graph
function centerGraph() {
	network.fit();
	updateInfo("Graph centered");
}

// Funkcje pomocnicze
function highlightNode(nodeId, color) {
	const node = nodes.get(nodeId);
	if (node) {
		nodes.update({ id: nodeId, color: color });
	}
}

function resetNodeColors() {
	const allNodes = nodes.get();
	const resetNodes = allNodes.map((node) => ({
		id: node.id,
		color: node.originalColor || "#3498db",
	}));
	nodes.update(resetNodes);
}

function sleep(ms) {
	return new Promise((resolve) => {
		algorithmTimeout = setTimeout(resolve, ms);
	});
}

function updateStartNodeSelect() {
	const select = document.getElementById("startNode");
	select.innerHTML = '<option value="">Select start node</option>';

	const allNodes = nodes.get();
	allNodes.forEach((node) => {
		const option = document.createElement("option");
		option.value = node.id;
		option.textContent = node.label;
		select.appendChild(option);
	});
}

function updateInfo(message) {
	addLogEntry(message);
}

function updateAlgorithmInfo(message) {
	if (message.trim()) {
		addLogEntry(message, "algorithm");
	}
}

function addLogEntry(message, type = "info") {
	const logContainer = document.getElementById("logContainer");
	const now = new Date();
	const timeString = now.toLocaleTimeString("pl-PL", {
		hour12: false,
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});

	// Check if we should auto-scroll (only if user is at the bottom)
	const shouldAutoScroll =
		logContainer.scrollTop + logContainer.clientHeight >=
		logContainer.scrollHeight - 5;

	const logEntry = document.createElement("div");
	logEntry.className =
		"log-entry flex flex-wrap mb-2 pb-2 border-b border-gray-700";

	// Determine color based on type
	let timeColor = "text-blue-400";
	let messageColor = "text-gray-100";

	switch (type) {
		case "success":
			messageColor = "text-green-400";
			break;
		case "warning":
			messageColor = "text-yellow-400";
			break;
		case "error":
			messageColor = "text-red-400";
			break;
		case "algorithm":
			messageColor = "text-cyan-400";
			break;
		default:
			messageColor = "text-gray-100";
	}

	logEntry.innerHTML = `
		<span class="log-time ${timeColor} font-bold mr-3 flex-shrink-0">[${timeString}]</span>
		<span class="log-message ${messageColor}">${message}</span>
	`;

	// Limit log entries to prevent memory issues and maintain performance (keep last 30)
	const entries = logContainer.querySelectorAll(".log-entry");
	if (entries.length >= 30) {
		// Remove oldest entries in batches to maintain stable height
		const toRemove = entries.length - 29;
		for (let i = 0; i < toRemove; i++) {
			entries[i].remove();
		}
	}

	logContainer.appendChild(logEntry);

	// Only auto-scroll if user was at bottom, and do it smoothly
	if (shouldAutoScroll) {
		requestAnimationFrame(() => {
			logContainer.scrollTo({
				top: logContainer.scrollHeight,
				behavior: "smooth",
			});
		});
	}
}

function openModal(modalId) {
	const modal = document.getElementById(modalId);
	modal.classList.remove("hidden");
	modal.classList.add("flex", "items-center", "justify-center");
}

function closeModal(modalId) {
	const modal = document.getElementById(modalId);
	modal.classList.add("hidden");
	modal.classList.remove("flex", "items-center", "justify-center");
	currentEditingNode = null;
	currentEditingEdge = null;
}

// Network event handlers
function onNetworkClick(params) {
	// Handle left click for edge creation (only if clicking on nodes, not edges)
	if (params.nodes.length > 0 && params.edges.length === 0) {
		const clickedNode = params.nodes[0];

		if (selectedNodeForEdge === null) {
			// First click - select source node
			selectedNodeForEdge = clickedNode;
			highlightNode(clickedNode, "#f39c12");
			updateInfo(
				`Selected node ${clickedNode} as source. Click another node to create edge.`
			);
		} else if (selectedNodeForEdge === clickedNode) {
			// Clicked same node - deselect
			resetNodeColors();
			selectedNodeForEdge = null;
			updateInfo("Node deselected");
		} else {
			// Second click - create edge
			createEdge(selectedNodeForEdge, clickedNode);
			resetNodeColors();
			selectedNodeForEdge = null;
		}
	} else if (params.edges.length > 0) {
		// Clicked on edge - just show info, don't interfere with edge creation
		return;
	} else {
		// Clicked empty space - deselect
		if (selectedNodeForEdge !== null) {
			resetNodeColors();
			selectedNodeForEdge = null;
			updateInfo("Node deselected");
		}
	}
}

function onNetworkDoubleClick(params) {
	// Handle double click for node editing
	if (params.nodes.length > 0) {
		network.selectNodes([params.nodes[0]]);
		editSelectedNode();
	}
	// Handle double click for edge editing
	else if (params.edges.length > 0) {
		const edgeId = params.edges[0];
		const edge = edges.get(edgeId);
		currentEditingEdge = edgeId;

		// Fill form
		document.getElementById("edgeWeight").value = edge.weight || "";
		document.getElementById("edgeLabel").value = edge.label || "";
		document.getElementById("edgeColor").value = edge.color || "#848484";

		openModal("edgeModal");
	}
}

function onNetworkRightClick(params) {
	// Just prevent context menu
	params.event.preventDefault();
}

function onNodeSelect(params) {
	// Don't auto-open modal or show info - let onNetworkClick handle edge creation
}

function onEdgeSelect(params) {
	if (params.edges.length > 0) {
		const edgeId = params.edges[0];
		const edge = edges.get(edgeId);
		const fromNode = nodes.get(edge.from);
		const toNode = nodes.get(edge.to);

		document.getElementById("edgeInfo").textContent = `Edge: ${
			fromNode.label
		} → ${toNode.label}${edge.weight ? ` (weight: ${edge.weight})` : ""}`;

		// Don't auto-open modal - only show info
		// Modal will be opened on double-click
	}
}

function onDeselectAll() {
	updateInfo("No element selected");
	document.getElementById("edgeInfo").textContent = "";
}

// Hover effect functions - simplified
function addHoverEffect(nodeId) {
	// Not used anymore - keeping for compatibility
}

function removeHoverEffect(nodeId) {
	// Not used anymore - keeping for compatibility
}

function createEdge(fromNode, toNode) {
	if (fromNode === toNode) {
		updateInfo("Cannot connect node to itself");
		return;
	}

	// Check if edge already exists
	const existingEdges = edges.get();
	const edgeExists = existingEdges.some(
		(edge) =>
			(edge.from === fromNode && edge.to === toNode) ||
			(!document.getElementById("directedEdges").checked &&
				edge.from === toNode &&
				edge.to === fromNode)
	);

	if (edgeExists) {
		updateInfo("Edge already exists");
		return;
	}

	edgeCounter++;
	const directed = document.getElementById("directedEdges").checked;

	const newEdge = {
		id: edgeCounter,
		from: fromNode,
		to: toNode,
		arrows: directed ? { to: { enabled: true } } : { to: { enabled: false } },
	};

	// Temporarily disable physics stabilization to prevent auto-zoom
	network.setOptions({
		physics: {
			stabilization: { enabled: false },
		},
	});

	edges.add(newEdge);

	// Re-enable physics stabilization after a short delay
	setTimeout(() => {
		network.setOptions({
			physics: {
				stabilization: {
					enabled: true,
					iterations: 100,
					fit: false,
				},
			},
		});
	}, 100);

	updateInfo(`Created edge between nodes ${fromNode} and ${toNode}`);
}
