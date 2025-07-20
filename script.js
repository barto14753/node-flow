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
	initializeCollapsibleSections();
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

	// Import/Export functions
	document.getElementById("importJSON").addEventListener("click", importJSON);
	document.getElementById("importXML").addEventListener("click", importXML);
	document.getElementById("exportJSON").addEventListener("click", exportJSON);
	document.getElementById("exportXML").addEventListener("click", exportXML);

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

	// Algorithm speed slider
	document
		.getElementById("algorithmSpeed")
		.addEventListener("input", updateAlgorithmSpeed);

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

// Update algorithm speed based on slider value
function updateAlgorithmSpeed() {
	const speedSlider = document.getElementById("algorithmSpeed");
	const speedValue = document.getElementById("speedValue");
	const speed = parseInt(speedSlider.value);

	const speedNames = {
		1: "Very Slow",
		2: "Slow",
		3: "Normal",
		4: "Fast",
		5: "Very Fast",
	};

	speedValue.textContent = speedNames[speed];
}

// Get algorithm delay based on speed setting
function getAlgorithmDelay() {
	const speed = parseInt(document.getElementById("algorithmSpeed").value);
	const delays = {
		1: 1500, // Very Slow
		2: 1000, // Slow
		3: 500, // Normal
		4: 300, // Fast
		5: 100, // Very Fast
	};
	return delays[speed] || 1000;
}

// Get algorithm step delay (shorter delay between steps)
function getAlgorithmStepDelay() {
	const speed = parseInt(document.getElementById("algorithmSpeed").value);
	const delays = {
		1: 1000, // Very Slow - 1 second
		2: 750, // Slow - 0.75 seconds
		3: 500, // Normal - 0.5 seconds
		4: 300, // Fast - 0.3 seconds
		5: 150, // Very Fast - 0.15 seconds
	};
	return delays[speed] || 500;
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
		await sleep(getAlgorithmDelay());

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
		await sleep(getAlgorithmStepDelay());
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
		await sleep(getAlgorithmDelay());

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
		await sleep(getAlgorithmStepDelay());
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

// ==================== IMPORT/EXPORT FUNCTIONS ====================

// Export graph to JSON format
function exportJSON() {
	try {
		const graphData = {
			nodes: nodes.get(),
			edges: edges.get(),
			metadata: {
				nodeCounter: nodeCounter,
				edgeCounter: edgeCounter,
				exportDate: new Date().toISOString(),
				version: "1.0",
			},
		};

		const jsonString = JSON.stringify(graphData, null, 2);
		downloadFile(jsonString, "graph.json", "application/json");
		updateInfo("Graph exported to JSON successfully");
	} catch (error) {
		updateInfo("Error exporting to JSON: " + error.message);
	}
}

// Export graph to XML format
function exportXML() {
	try {
		const nodesData = nodes.get();
		const edgesData = edges.get();

		let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
		xml += "<graph>\n";
		xml += "  <metadata>\n";
		xml += `    <nodeCounter>${nodeCounter}</nodeCounter>\n`;
		xml += `    <edgeCounter>${edgeCounter}</edgeCounter>\n`;
		xml += `    <exportDate>${new Date().toISOString()}</exportDate>\n`;
		xml += `    <version>1.0</version>\n`;
		xml += "  </metadata>\n";

		// Export nodes
		xml += "  <nodes>\n";
		nodesData.forEach((node) => {
			xml += `    <node id="${node.id}" label="${escapeXml(
				node.label
			)}" color="${node.color || node.originalColor || "#3498db"}"`;
			if (node.x !== undefined) xml += ` x="${node.x}"`;
			if (node.y !== undefined) xml += ` y="${node.y}"`;
			xml += "/>\n";
		});
		xml += "  </nodes>\n";

		// Export edges
		xml += "  <edges>\n";
		edgesData.forEach((edge) => {
			xml += `    <edge id="${edge.id}" from="${edge.from}" to="${edge.to}"`;
			if (edge.label) xml += ` label="${escapeXml(edge.label)}"`;
			if (edge.weight) xml += ` weight="${edge.weight}"`;
			if (edge.color) xml += ` color="${edge.color}"`;
			if (edge.arrows && edge.arrows.to && edge.arrows.to.enabled)
				xml += ` directed="true"`;
			xml += "/>\n";
		});
		xml += "  </edges>\n";
		xml += "</graph>";

		downloadFile(xml, "graph.xml", "application/xml");
		updateInfo("Graph exported to XML successfully");
	} catch (error) {
		updateInfo("Error exporting to XML: " + error.message);
	}
}

// Import graph from JSON format
function importJSON() {
	const fileInput = document.getElementById("importFile");
	const file = fileInput.files[0];

	if (!file) {
		updateInfo("Please select a file first");
		return;
	}

	if (!file.name.toLowerCase().endsWith(".json")) {
		updateInfo("Please select a JSON file");
		return;
	}

	const reader = new FileReader();
	reader.onload = function (e) {
		try {
			const graphData = JSON.parse(e.target.result);

			// Validate JSON structure
			if (!graphData.nodes || !graphData.edges) {
				throw new Error("Invalid JSON structure. Missing nodes or edges.");
			}

			// Clear current graph
			nodes.clear();
			edges.clear();

			// Import nodes
			const importedNodes = graphData.nodes.map((node) => ({
				...node,
				originalColor: node.color || node.originalColor || "#3498db",
			}));
			nodes.add(importedNodes);

			// Import edges
			edges.add(graphData.edges);

			// Update counters
			if (graphData.metadata) {
				nodeCounter =
					graphData.metadata.nodeCounter ||
					Math.max(...graphData.nodes.map((n) => n.id), 0);
				edgeCounter =
					graphData.metadata.edgeCounter ||
					Math.max(...graphData.edges.map((e) => e.id), 0);
			} else {
				nodeCounter = Math.max(...graphData.nodes.map((n) => n.id), 0);
				edgeCounter = Math.max(...graphData.edges.map((e) => e.id), 0);
			}

			updateStartNodeSelect();
			updateInfo(
				`JSON imported successfully: ${graphData.nodes.length} nodes, ${graphData.edges.length} edges`
			);

			// Clear file input
			fileInput.value = "";
		} catch (error) {
			updateInfo("Error importing JSON: " + error.message);
		}
	};
	reader.readAsText(file);
}

// Import graph from XML format
function importXML() {
	const fileInput = document.getElementById("importFile");
	const file = fileInput.files[0];

	if (!file) {
		updateInfo("Please select a file first");
		return;
	}

	if (!file.name.toLowerCase().endsWith(".xml")) {
		updateInfo("Please select an XML file");
		return;
	}

	const reader = new FileReader();
	reader.onload = function (e) {
		try {
			const parser = new DOMParser();
			const xmlDoc = parser.parseFromString(e.target.result, "text/xml");

			// Check for parsing errors
			if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
				throw new Error("Invalid XML format");
			}

			// Clear current graph
			nodes.clear();
			edges.clear();

			// Import nodes
			const nodeElements = xmlDoc.getElementsByTagName("node");
			const importedNodes = [];
			for (let i = 0; i < nodeElements.length; i++) {
				const nodeEl = nodeElements[i];
				const node = {
					id: parseInt(nodeEl.getAttribute("id")),
					label: nodeEl.getAttribute("label"),
					color: nodeEl.getAttribute("color") || "#3498db",
					originalColor: nodeEl.getAttribute("color") || "#3498db",
				};

				if (nodeEl.getAttribute("x"))
					node.x = parseFloat(nodeEl.getAttribute("x"));
				if (nodeEl.getAttribute("y"))
					node.y = parseFloat(nodeEl.getAttribute("y"));

				importedNodes.push(node);
			}
			nodes.add(importedNodes);

			// Import edges
			const edgeElements = xmlDoc.getElementsByTagName("edge");
			const importedEdges = [];
			for (let i = 0; i < edgeElements.length; i++) {
				const edgeEl = edgeElements[i];
				const edge = {
					id: parseInt(edgeEl.getAttribute("id")),
					from: parseInt(edgeEl.getAttribute("from")),
					to: parseInt(edgeEl.getAttribute("to")),
				};

				if (edgeEl.getAttribute("label"))
					edge.label = edgeEl.getAttribute("label");
				if (edgeEl.getAttribute("weight"))
					edge.weight = parseFloat(edgeEl.getAttribute("weight"));
				if (edgeEl.getAttribute("color"))
					edge.color = edgeEl.getAttribute("color");

				const directed = edgeEl.getAttribute("directed") === "true";
				edge.arrows = directed
					? { to: { enabled: true } }
					: { to: { enabled: false } };

				importedEdges.push(edge);
			}
			edges.add(importedEdges);

			// Update counters from metadata or calculate
			const metadataEl = xmlDoc.getElementsByTagName("metadata")[0];
			if (metadataEl) {
				const nodeCounterEl = metadataEl.getElementsByTagName("nodeCounter")[0];
				const edgeCounterEl = metadataEl.getElementsByTagName("edgeCounter")[0];

				nodeCounter = nodeCounterEl
					? parseInt(nodeCounterEl.textContent)
					: Math.max(...importedNodes.map((n) => n.id), 0);
				edgeCounter = edgeCounterEl
					? parseInt(edgeCounterEl.textContent)
					: Math.max(...importedEdges.map((e) => e.id), 0);
			} else {
				nodeCounter = Math.max(...importedNodes.map((n) => n.id), 0);
				edgeCounter = Math.max(...importedEdges.map((e) => e.id), 0);
			}

			updateStartNodeSelect();
			updateInfo(
				`XML imported successfully: ${importedNodes.length} nodes, ${importedEdges.length} edges`
			);

			// Clear file input
			fileInput.value = "";
		} catch (error) {
			updateInfo("Error importing XML: " + error.message);
		}
	};
	reader.readAsText(file);
}

// Helper function to download files
function downloadFile(content, filename, contentType) {
	const blob = new Blob([content], { type: contentType });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

// Helper function to escape XML special characters
function escapeXml(text) {
	if (!text) return "";
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

// ==================== COLLAPSIBLE SECTIONS ====================

// Initialize collapsible sections (collapsed by default)
function initializeCollapsibleSections() {
	// Initialize speed slider
	updateAlgorithmSpeed();

	// Collapse Algorithms section
	const algorithmsSection = document.getElementById("algorithmsSection");
	const algorithmsChevron = document.getElementById("algorithmsChevron");
	algorithmsSection.style.maxHeight = "0px";
	algorithmsChevron.style.transform = "rotate(0deg)";

	// Collapse Import/Export section
	const importExportSection = document.getElementById("importExportSection");
	const importExportChevron = document.getElementById("importExportChevron");
	importExportSection.style.maxHeight = "0px";
	importExportChevron.style.transform = "rotate(0deg)";
}

// Toggle section visibility
function toggleSection(sectionId) {
	const section = document.getElementById(sectionId);
	const chevronId = sectionId.replace("Section", "Chevron");
	const chevron = document.getElementById(chevronId);

	if (section.style.maxHeight === "0px" || section.style.maxHeight === "") {
		// Show section
		section.style.maxHeight = section.scrollHeight + "px";
		chevron.style.transform = "rotate(180deg)";
		section.classList.add("expanded");
	} else {
		// Hide section
		section.style.maxHeight = "0px";
		chevron.style.transform = "rotate(0deg)";
		section.classList.remove("expanded");
	}
}
