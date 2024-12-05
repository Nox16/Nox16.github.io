// Create Chart Object in Global Scope
let chart;

// Load JSON Data & Checking Quality & Web-Connection
function loadJSONs(file1, file2, func) {
    const loadJSON = (filename) => {
        return new Promise((resolve, reject) => {
            const xobj = new XMLHttpRequest();
            xobj.open("GET", filename);
            xobj.onreadystatechange = () => {
                if (xobj.readyState == 4) {
                    if (xobj.status == 200) {
                        resolve(JSON.parse(xobj.responseText));
                    } else {
                        reject(`Failed to load ${filename}`);
                    }
                }
            };
            xobj.send();
        });
    };

    // Load both JSON Datasets At Once
    Promise.all([loadJSON(file1), loadJSON(file2)])
        .then((data) => {
            // Log Unformatted Ontology Data
            console.log('Unformatted Ontology Data:', data[0]);
            // Log Unformatted Sources Data
            console.log('Unformatted Source Data', data[1]);
            // Run Function on Data
            func(data[0], data[1]);
        })
        .catch((error) => {
            console.error(error);
        });
}

// Format JSON Data for Chart Creation
function prepareData(ontologyData, sourceData) {
    // Sort Records into High, Meso, and Low Level Lists
    function sortLevels(dataJSON) {
        const highLVL = [];
        const mesoLVL = [];
        const lowLVL = [];

        dataJSON.records.forEach(record => {
            if (record.fields["Hierarchical Type"] == "High-level") {
                highLVL.push(record);
            }
            else if (record.fields["Hierarchical Type"] == "Meso-level") {
                mesoLVL.push(record);
            }
            else if (record.fields["Hierarchical Type"] == "Low-level") {
                lowLVL.push(record);
            }
        });

        const sortedLevels = {};

        sortedLevels["Highs"] = highLVL;
        sortedLevels["Mesos"] = mesoLVL;
        sortedLevels["Lows"] = lowLVL;

        return sortedLevels;
    }

    // Takes Nested "Field" Data & Un-Nest (Make Even Depth with Other Properties)
    // Applied to Single Record at a time (used in 'addChildrenRecords()')
    function refactorFields(record) {
        const highKeys = Object.keys(record.fields);
        const highValues = Object.values(record.fields);
        for (let i = 0; i < highKeys.length; i++) {
            record[highKeys[i]] = highValues[i];
        }
        delete record.fields
    }

    // Add List of Children Objects to Parents
    function addChildrenRecords(sortedLevels) {

        // Add Children to High Level Patterns
        sortedLevels.Highs.forEach(high => {
            high.fields["Child Ontology Record"] = [];

            sortedLevels.Mesos.forEach(meso => {
                if (meso.fields["Parent Ontology Record"][0] === high.id) {
                    high.fields["Child Ontology Record"].push(meso);
                }
            })

            // Refactor Fields Property of Pattern Level
            refactorFields(high);
        });

        // Add Children to Meso Level Patterns
        sortedLevels.Mesos.forEach(meso => {
            meso.fields["Child Ontology Record"] = [];

            sortedLevels.Lows.forEach(low => {
                if (low.fields["Parent Ontology Record"][0] === meso.id) {
                    meso.fields["Child Ontology Record"].push(low);
                }
            })

            // Refactor Fields Property of Pattern Level
            refactorFields(meso);
        });

        // Remove 'Fields' from Low Level Patterns
        sortedLevels.Lows.forEach(low => {
            // Refactor Fields Property of Pattern Level
            refactorFields(low);
        });

        return sortedLevels;
    }

    // Add List of Direct & Indirect Source Names to Ontology Data
    function addSourceNames(sortedLevels, sourceData) {
        // Adds Source Names to Pattern Record if Connection Exists
        function checkSources(pattern, sourceData) {
            // Get Pattern Direct Connections
            directConnections = pattern.fields["Direct Connections"];
            // If Direct Connections Exists...
            if (directConnections != null) {
                // Loop Through Direct Connections
                directConnections.forEach(connectionId => {
                    // Loop Through Sources
                    sourceData.records.forEach(source => {
                        // Get Patterns List attached to Source
                        sourcePatterns = source.fields["Patterns"];
                        // If Source Patterns contains Connection ID, add source name to list
                        if (sourcePatterns.includes(connectionId)) {
                            if (pattern["Direct Connection Sources"]) {
                                // If source not already added, add to list (prevents duplicates)
                                if (!pattern["Direct Connection Sources"].includes(source.fields["Name"])) {
                                    pattern["Direct Connection Sources"].push(source.fields["Name"]);
                                }
                            }
                            else {
                                pattern["Direct Connection Sources"] = []
                                pattern["Direct Connection Sources"].push(source.fields["Name"]);
                            }
                        }
                    })
                });
            }

            // Get Pattern Inferred Connections
            inferredConnections = pattern.fields["Inferred Connections"];
            // If Inferred Connections Exists...
            if (inferredConnections != null) {
                // Loop Through Inferred Connections
                inferredConnections.forEach(connectionId => {
                    // Loop Through Sources
                    sourceData.records.forEach(source => {
                        // Get Patterns List attached to Source
                        sourcePatterns = source.fields["Patterns"];
                        // If Source Patterns contains Connection ID, add source name to list
                        if (sourcePatterns.includes(connectionId)) {
                            if (pattern["Inferred Connection Sources"]) {
                                // If source not already added, add to list (prevents duplicates)
                                if (!pattern["Inferred Connection Sources"].includes(source.fields["Name"])) {
                                    pattern["Inferred Connection Sources"].push(source.fields["Name"]);
                                }
                            }
                            else {
                                pattern["Inferred Connection Sources"] = []
                                pattern["Inferred Connection Sources"].push(source.fields["Name"]);
                            }
                        }
                    })
                });
            }

            // Return Pattern with Added Source Names List (if applicable)
            return pattern;
        }

        // Create Empty Object for Patterns with Source Lists, organized by level.
        const ontologyWithSources = {
            Highs: [],
            Mesos: [],
            Lows: []
        };

        // Add Sources to High Level Patterns
        sortedLevels.Highs.forEach(highPattern => {
            ontologyWithSources.Highs.push(checkSources(highPattern, sourceData));
        });

        // Add Sources to Meso Level Patterns
        sortedLevels.Mesos.forEach(mesoPattern => {
            ontologyWithSources.Mesos.push(checkSources(mesoPattern, sourceData));
        });

        // Add Sources to Low Level Patterns
        sortedLevels.Lows.forEach(lowPattern => {
            ontologyWithSources.Lows.push(checkSources(lowPattern, sourceData));
        });

        // Return Sorted-by-Level Patterns with Source Name Lists
        return ontologyWithSources;
    }

    // Sort Patterns by Level
    const sortedLevels = sortLevels(ontologyData);

    // Add Source Names List to Patterns
    const ontologyWithSources = addSourceNames(sortedLevels, sourceData);

    // Refactor Data so a list Child Objects are within Parent Object
    const ontologyWithChildren = addChildrenRecords(ontologyWithSources);

    // Create Single Root for Ontology (for chart creation)
    const ontologyRecords = [{
        "Pattern Name": "Root",
        "Child Ontology Record": ontologyWithChildren.Highs
    }]

    // Send Loaded Data to Global Scope for Other Sources
    window.loadedData = ontologyRecords;

    // Prepare Webpage with Formatted Data
    prepareWebPage(ontologyRecords);

    console.log("Formatted Data: ", ontologyRecords);
}

// Preparing Webpage Container
function prepareWebPage(dataJSON) {
    // Get Chart Container Object from Webpage
    const container = document.getElementById("container");
    // Clear Container of any existing elements
    container.innerHTML = '';

    // Create Chart & Append to Container, making it visible
    chart = makeSquareTree(dataJSON);
    container.append(chart);
}

// Create Global Dictionary for Source Types (Regulatory/Academic)
const sourceTypes = {
    "EDPB (final version)": "regulatory",
    "EUCOM": "regulatory",
    "UKCMA": "regulatory",
    "FTC": "regulatory",
    "OECD": "regulatory",
    "Brignull (2010-2017)": "academic",
    "Bösch (2016)": "academic",
    "Gray (2018)": "academic",
    "Mathur et al. (2019)": "academic",
    "Luguri & Strahilevetz (2021)": "academic",
    "Brignull (2023-)": "academic",
}

// Zoom without Dynamic View-Box
function makeSquareTree(data) {
    const width = 1200;
    const height = 800;

    const nodeWidth = 325;
    const nodeHeight = 200;

    // Horizontal Node Spacing
    const dx = 450;

    // Vertical Node Spacing
    const dy = 300;

    const svg = d3.create("svg")
        .attr("style", "font: 12px sans-serif; user-select: none; overflow: visible; max-width: 100%; height: auto;")
        .attr("width", width)
        .attr("height", height);

    const gLink = svg.append("g")
        .attr("fill", "none")
        .attr("stroke", "#ffffff")
        .attr("stroke-opacity", 1)
        .attr("stroke-width", 1.5);

    const gNode = svg.append("g")
        .attr("pointer-events", "all");

    const root = d3.hierarchy(
        data[0],
        d => d["Child Ontology Record"]
    );

    const tree = d3.tree().nodeSize([dx, dy]);

    // (X,Y) Values to Offset Start & End Points of Link to Align with Node Dimensions
    const widthOffset = nodeWidth / 2;
    const heightOffset = nodeHeight;

    const diagonal = d => {
        const source = { x: d.source.x + widthOffset, y: d.source.y + heightOffset }; // Bottom-center of the source
        const target = { x: d.target.x + widthOffset, y: d.target.y }; // Top-center of the target

        // Cubic Bezier Curve
        return `
                M${source.x},${source.y}
                C${source.x},${(source.y + target.y) / 2}
                 ${target.x},${(source.y + target.y) / 2}
                 ${target.x},${target.y}
            `;
    };


    // Zoom Functionality
    const zoom = d3.zoom()
        // Zoom Scaling Range
        .scaleExtent([0.1, 15])
        .on("zoom", (event) => {
            gNode.attr("transform", event.transform);
            gLink.attr("transform", event.transform);
        })

    svg.call(zoom);

    // Set default view
    const defaultTransform = d3.zoomIdentity
        // Set Initial View Point
        .translate(-80, -50)
        // Set Default Scaling to 0.5
        .scale(0.5);

    svg.call(zoom.transform, defaultTransform);

    root.x0 = width / 2;
    root.y0 = 0;

    root.descendants().forEach((d, i) => {
        d.id = i;
        d._children = d.children;
        if (d.depth) d.children = null;
    });

    tree(root);

    function update(event, source) {
        const duration = event?.altKey ? 2500 : 250;
        const nodes = root.descendants().reverse().filter(d => d.depth > 0);
        const links = root.links();

        tree(root);

        const transition = svg.transition().duration(duration)
            .attr("viewBox", [-width / 2, 0, width, height]);

        svg.attr("width", width)
            .attr("height", height);

        const node = gNode.selectAll("g")
            .data(nodes, d => d.id);

        const nodeEnter = node.enter().append("g")
            .attr("transform", d => `translate(${source.x0},${source.y0})`)
            .attr("fill-opacity", 0)
            .attr("stroke-opacity", 0);

        const bgColors = ["", "#1B160E", "#282015", "#362C1C"];

        // 'foreignObject' makes the Node an HTML Object
        nodeEnter.append("foreignObject")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", nodeWidth)
            .attr("height", nodeHeight)
            .append("xhtml:div")
            .style("background-color", d => bgColors[d.depth])
            .attr("class", "pattern-card")
            .html(d =>
                `
                <i class="fullscreen-btn fa-solid fa-expand"></i>
                
                <div class="pattern-card-content">
                    <div class="pattern-card-name">
                        ${d.data["Pattern Name"]}
                    </div>
                    <hr class="pattern-card-divider"></hr>
                    <div class="pattern-card-sources" style="text-align: center">
                        <div class="pattern-card-sources-${d.data["Direct Connection Sources"] ? sourceTypes[d.data["Direct Connection Sources"][0]] : ""}">
                            ${d.data["Direct Connection Sources"] ? d.data["Direct Connection Sources"][0] : ""}
                        </div>
                        <div class="pattern-card-sources-${d.data["Inferred Connection Sources"] ? sourceTypes[d.data["Inferred Connection Sources"][0]] : ""}">
                            ${d.data["Inferred Connection Sources"] ? d.data["Inferred Connection Sources"][0] : ""}
                        </div>
                    </div>
                    <div class="pattern-card-definition">
                        ${d.data["Unified Definition"] ? d.data["Unified Definition"].replaceAll("**", "") : ""}
                    </div>
                </div>
                
                <i class="pattern-card-arrow toggle-children fa-solid fa-arrow-down"></i>
                `
            );

        nodeEnter.select(".toggle-children")
            .on("click", (event, d) => {
                // Toggle the children
                d.children = d.children ? null : d._children;
                update(event, d); // Update the tree
            });

        nodeEnter.select(".pattern-card-arrow")
            .on("click", (event, d) => {
                d.children = d.children ? null : d._children;
                update(event, d);
            });

        nodeEnter.select(".fullscreen-btn")
            .on('click', (event, d) => {
                openPopup(d.data)
            })

        const nodeUpdate = node.merge(nodeEnter).transition(transition)
            .attr("transform", d => `translate(${d.x},${d.y})`)
            .attr("fill-opacity", 1)
            .attr("stroke-opacity", 1);

        const nodeExit = node.exit().transition(transition).remove()
            .attr("transform", d => `translate(${source.x},${source.y})`)
            .attr("fill-opacity", 0)
            .attr("stroke-opacity", 0);

        const link = gLink.selectAll("path")
            .data(links, d => d.target.id);

        const linkEnter = link.enter().append("path")
            .attr("class", d => `level-${d.source.depth}`)
            .attr("d", d => {
                const o = { x: source.x0, y: source.y0 };
                return diagonal({ source: o, target: o });
            });

        link.merge(linkEnter).transition(transition)
            .attr("d", diagonal);

        // Where Links Retract To
        link.exit().transition(transition).remove()
            .attr("d", d => {
                const o = { x: source.x, y: source.y };
                return diagonal({ source: o, target: o });
            });

        root.eachBefore(d => {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    update(null, root);

    // Expand All Nodes
    function expandAll(root) {
        root.descendants().forEach(d => {
            if (d._children) {
                // Make Child Nodes Visible, get from stored child nodes
                d.children = d._children;

                // Empty stored child nodes
                d._children = null;

                // Expand All Children's Children
                expandAll(d);
            }
        });
        update(null, root);  // Re-render Chart
    }

    // Collapse All Nodes
    function collapseAll(root) {
        root.descendants().forEach(d => {
            // Skip depth-0 Node (Root Node)
            if (d.depth > 0 && d.children) {
                // Store Child Nodes
                d._children = d.children;

                // Set Child Nodes to Nothing
                d.children = null;
            }
        });

        // Reset zoom to the default view
        svg.call(zoom.transform, defaultTransform);

        // Re-render the chart
        update(null, root);
    }

    // Adding Event Listeners for Collapse/Expand Buttons
    document.getElementById("expand-all").addEventListener("click", () => expandAll(root));
    document.getElementById("collapse-all").addEventListener("click", () => collapseAll(root));

    return svg.node();
}

function toggleChildren(button, root, update) {
    const nodeId = +button.getAttribute("data-id"); // Retrieve the node ID from the button
    const node = root.descendants().find(d => d.id === nodeId); // Find the node in the hierarchy

    if (node) {
        node.children = node.children ? null : node._children; // Toggle children visibility
        update(null, node); // Update the tree
    }
}


// Modal 
function openPopup(data) {
    console.log("Pop-Up Data: ", data)

    // Get Pop Up ID
    document.getElementById("modal-container").style.display = "block";

    // Set Direct Pattern Sources
    document.getElementById("direct-tags").innerHTML = "";
    if (data["Direct Connection Sources"]) {
        // Reset Tag Title (In Case Previous Expanded Node Removed It)
        document.getElementById("tag-title-direct").innerHTML = "Direct:";

        // Add Pill per Source
        data["Direct Connection Sources"].forEach(source => {
            const sourcePill = document.createElement('div');
            sourcePill.className = `pill-tag ${sourceTypes[source]}-pill`;
            sourcePill.innerHTML = source;
            document.getElementById("direct-tags").appendChild(sourcePill);
        })
    }
    // If No Sources Exist, Remove Source Tag Title
    else {
        document.getElementById("tag-title-direct").innerHTML = "";
    }

    // Set Inferred Pattern Sources
    document.getElementById("inferred-tags").innerHTML = "";
    if (data["Inferred Connection Sources"]) {
        // Reset Tag Title (In Case Previous Expanded Node Removed It)
        document.getElementById("tag-title-inferred").innerHTML = "Inferred:";

        // Add Pill per Source
        data["Inferred Connection Sources"].forEach(source => {
            const sourcePill = document.createElement('div');
            sourcePill.className = `pill-tag ${sourceTypes[source]}-pill`;
            sourcePill.innerHTML = source;
            document.getElementById("inferred-tags").appendChild(sourcePill);
        })
    }
    // If No Sources Exist, Remove Source Tag Title
    else {
        document.getElementById("tag-title-inferred").innerHTML = "";
    }

    // Set Pattern Name
    if (data["Pattern Name"] === "Manipulating Visual Choice Architecture" ||
        data["Pattern Name"] === "Forced Communication or Disclosure"
    ) {
        document.getElementById("modal-title").style.fontSize = "45px";
    }
    else {
        document.getElementById("modal-title").style.fontSize = "60px";
    }
    document.getElementById("modal-title").innerHTML = data["Pattern Name"];

    // Set Pattern Definition
    const unifiedDefinition = data["Unified Definition"] ?
        data["Unified Definition"].replaceAll("**", "") : "";
    document.getElementById("modal-body-text").innerHTML = unifiedDefinition;
}


// container that modal resides in 
const modalContainer = document.getElementById("modal-container");

// close button
function closePopup() {
    modalContainer.style.display = "none";
}

// click out to close functionality 
modalContainer.addEventListener('click', function (event) {
    if (event.target === document.getElementById("modal-container")) {
        modalContainer.style.display = 'none';
    }
});

// Initialize JSON Loading & Chart Preparation
function init() {
    loadJSONs('./ontology.json', './source.json', prepareData);
}
init();