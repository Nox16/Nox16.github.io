// File for deprecated code for different chart types
// Used while exploring different chart visualizations

function makeCollapseIcicleChart(data) {
    // Define a counter for unique IDs
    let i = 0;

    // Specify chart dimensions
    const width = 1800;
    const height = 3000;

    // Create a color scale
    const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, 6));

    // Create partition layout
    const partition = d3.partition()
        .size([height, width])
        .padding(1);

    // Convert data to hierarchy and set initial collapse state
    const root = d3.hierarchy(data[0], d => d["Child Ontology Record"])
        .sort((a, b) => b.height - a.height || b.value - a.value);

    // Create SVG container
    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [(width / 4), 0, width, height])
        .style("font", "15px sans-serif");

    function collapseAllDescendants(node) {
        if (node.children) {
            node.children.forEach(collapseAllDescendants);
            node._children = node.children; // Store children in _children
            node.children = null;           // Collapse all descendants
        }
    }

    // Set initial collapsed state for nodes based on depth
    root.each(d => {
        if (d.depth === 1) {
            // Depth-1 nodes should be visible, but their children hidden
            d._children = d.children;
            d.children = null;
        } else if (d.depth > 1) {
            // Depth-2 and deeper nodes should be collapsed
            d._children = d.children;
            d.children = null;
        }
    });

    // Toggle function to expand/collapse nodes
    function toggle(d) {
        if (d.children) {
            // Collapse node if currently expanded
            d._children = d.children;
            d.children = null;
        } else {
            // Expand node if currently collapsed
            d.children = d._children;
            d._children = null;

            // Collapse all descendants of the expanded node to keep only direct children visible
            if (d.children) {
                d.children.forEach(collapseAllDescendants);
            }
        }
        update();
    }

    // Update function to redraw chart with current collapsed/expanded nodes
    function update() {
        partition(root); // Reapply partition layout based on current state

        // Recalculate node heights so each child occupies equal space within its parent
        root.each(d => {
            if (d.children) {
                const childHeight = (d.x1 - d.x0) / d.children.length;
                d.children.forEach((child, i) => {
                    child.x0 = d.x0 + i * childHeight;
                    child.x1 = child.x0 + childHeight;
                });
            }
        });

        const nodes = root.descendants().filter(d => d.depth > 0); // Exclude root for display

        // Bind data to cell groups for each node
        const cell = svg.selectAll("g")
            .data(nodes, d => d.id || (d.id = ++i));  // Use `i` to generate unique ids

        const cellEnter = cell.enter().append("g")
            .attr("transform", d => `translate(${d.y0},${d.x0})`)

        // Add a `foreignObject` for each cell to contain HTML content
        const cellForeignObject = cellEnter.append("foreignObject")
            .attr("width", d => d.y1 - d.y0)
            .attr("height", d => d.x1 - d.x0)
            .append("xhtml:div")
            .style("width", "100%")
            .style("height", "100%")
            .style("background-color", d => {
                while (d.depth > 1) d = d.parent; // Ensure consistent color per section
                return color(d.data["Pattern Name"]);
            })
            .style("display", "flex")
            .style("align-items", "center")
            .style("justify-content", "center")
            .style("border", "1px solid #ddd")
            .style("box-sizing", "border-box")
            .style("padding", "0px")
            .html(d => `
            <div style="text-align: center;">
                <strong>${d.data["Pattern Name"]}</strong>
                <div style="font-size: 10px; color: black;">
                    ${d.data["Unified Definition"] ? d.data["Unified Definition"] : ""}
                </div>
            </div>
        `);

        // Debugging: Check if nodes have children and log
        cellEnter.each(function (d) {
            if (d._children) {
                const button = d3.select(this).select("div")
                    .append("button")
                    .attr("class", "toggle-btn")
                    .text("+")
                    .on("click", function (event) {
                        event.stopPropagation();  // Prevent triggering the parent node click
                        toggle(d);
                        const currentText = d3.select(this).text();
                        d3.select(this).text(currentText === "+" ? "-" : "+");
                    });
            }
        });

        // Transition to update existing cells
        cell.transition().duration(500)
            .attr("transform", d => `translate(${d.y0},${d.x0})`);

        cell.select("foreignObject")
            .attr("width", d => d.y1 - d.y0)
            .attr("height", d => d.x1 - d.x0);

        cell.exit().remove(); // Remove old elements
    }

    // Initial call to render chart
    update();

    return svg.node();
}

function makeTree(data) {
    const width = 1500;

    // Compute the tree height; this approach will allow the height of the
    // SVG to scale according to the breadth (width) of the tree layout.
    const root = d3.hierarchy(
        data[0],
        function children(d) {
            return d["Child Ontology Record"];
        }
    );
    const dx = 50;
    const visibleNodes = root.descendants().filter(d => d.depth > 0);
    const dy = width / (d3.max(visibleNodes, d => d.depth) + 1);

    // Create a tree layout.
    const tree = d3.tree().nodeSize([dx, dy]);

    // Sort the tree and apply the layout.
    root.sort((a, b) => d3.ascending(a.data["Pattern Name"], b.data["Pattern Name"]));
    tree(root);

    // Compute the extent of the tree. Note that x and y are swapped here
    // because in the tree layout, x is the breadth, but when displayed, the
    // tree extends right rather than down.
    let x0 = Infinity;
    let x1 = -x0;
    root.each(d => {
        if (d.x > x1) x1 = d.x;
        if (d.x < x0) x0 = d.x;
    });

    // Calculate minimum y position for depth 1 nodes to shift the viewBox
    const minDepth1Y = d3.min(visibleNodes, d => d.y);
    // Compute the adjusted height of the tree.
    const height = x1 - x0 + dx * 2;

    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [minDepth1Y - dy / 3, x0 - dx, width, height]) // Adjust x-offset with minDepth1Y
        .attr("style", "max-width: 100%; height: auto; font: 15px sans-serif;");

    const link = svg.append("g")
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-opacity", 0.2)
        .attr("stroke-width", 1)
        .selectAll()
        .data(root.links().filter(d => d.source.depth > 0)) // Exclude depth 0 links
        .join("path")
        .attr("class", d => `level-${d.source.depth}`)
        .attr("d", d3.linkHorizontal()
            .x(d => d.y)
            .y(d => d.x));

    const node = svg.append("g")
        .attr("stroke-linejoin", "round")
        .attr("stroke-width", 3)
        .selectAll()
        .data(visibleNodes)
        .join("g")
        .attr("class", d => `level-${d.depth}`)
        .attr("transform", d => `translate(${d.y},${d.x})`);

    const nodePadding = 150; // Padding around text inside the rectangle

    node.append("text")
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(d => d.data["Pattern Name"])
        .attr("font-size", "12px")
        .each(function (d) {
            // Measure text width after rendering
            const textWidth = this.getBBox().width;
            d.textWidth = textWidth + nodePadding * 2; // Store width with padding
        });

    // Now append rectangles with width based on text length
    node.insert("rect", "text")
        .attr("x", d => -d.textWidth / 2)
        .attr("y", -10) // Adjust vertical position as needed
        .attr("width", d => d.textWidth)
        .attr("height", 20) // Set a fixed height
        .attr("fill", d => d.children ? "#ADDE86" : "#81D4FA")
        .attr("stroke", "white");

    return svg.node();
}

function makeCollapseTree(data) {

    // Specify the charts’ dimensions. The height is variable, depending on the layout.
    const width = 1500;
    const marginTop = 200;
    const marginRight = 200;
    const marginBottom = 200;
    const marginLeft = 40;

    // Rows are separated by dx pixels, columns by dy pixels. These names can be counter-intuitive
    // (dx is a height, and dy a width). This because the tree must be viewed with the root at the
    // “bottom”, in the data domain. The width of a column is based on the tree’s height.
    const root = d3.hierarchy(
        data[0],
        function children(d) {
            return d["Child Ontology Record"];
        }
    );
    const dx = 100;
    const dy = (width - marginRight - marginLeft) / (1 + root.height);

    // Define the tree layout and the shape for links.
    const tree = d3.tree().nodeSize([dx, dy]);
    const diagonal = d3.linkHorizontal().x(d => d.y).y(d => d.x);

    // Create the SVG container, a layer for the links and a layer for the nodes.
    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", dx)
        .attr("viewBox", [-marginLeft / 2, -marginTop / 2, width / 1.5, dx * 2])
        .attr("transform", "scale(1.5)") // Increase the scale factor to zoom in
        .attr("style", "max-width: 100%; height: auto; font: 15px sans-serif; user-select: none;");

    const gLink = svg.append("g")
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 1.5);

    const gNode = svg.append("g")
        .attr("cursor", "pointer")
        .attr("pointer-events", "all");

    function update(event, source) {
        const duration = event?.altKey ? 2500 : 250; // hold the alt key to slow down the transition
        const nodes = root.descendants().filter(d => d.depth > 0).reverse();
        const links = root.links();

        // Compute the new tree layout.
        tree(root);

        let left = root;
        let right = root;
        root.eachBefore(node => {
            if (node.x < left.x) left = node;
            if (node.x > right.x) right = node;
        });

        const height = right.x - left.x + marginTop + marginBottom;

        const transition = svg.transition()
            .duration(duration)
            .attr("height", height)
            .attr("viewBox", [-marginLeft, left.x - marginTop, width, height])
            .tween("resize", window.ResizeObserver ? null : () => () => svg.dispatch("toggle"));

        // Update the nodes…
        const node = gNode.selectAll("g")
            .data(nodes, d => d.id);

        // Enter any new nodes at the parent's previous position.
        const nodeEnter = node.enter().append("g")
            .attr("transform", d => `translate(${source.y0},${source.x0})`)
            .attr("fill-opacity", 0)
            .attr("stroke-opacity", 0)
            .attr("class", d => `level-${d.depth}`)
            .on("click", (event, d) => {
                d.children = d.children ? null : d._children;
                update(event, d);
            });

        const nodePadding = 75; // Padding around text inside the rectangle

        nodeEnter.append("text")
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .text(d => d.data["Pattern Name"])
            .attr("font-size", "12px")
            .each(function (d) {
                const textWidth = this.getBBox().width;
                d.textWidth = textWidth + nodePadding * 2; // Calculate total width with padding
            });

        nodeEnter.insert("rect", "text")
            .attr("x", d => -d.textWidth / 2)
            .attr("y", -10)
            .attr("width", d => d.textWidth)
            .attr("height", 20)
            .attr("fill", d => d._children ? "#ADDE86" : "#81D4FA")
            .attr("stroke", "white");

        // Transition nodes to their new position.
        const nodeUpdate = node.merge(nodeEnter).transition(transition)
            .attr("transform", d => `translate(${d.y},${d.x})`)
            .attr("fill-opacity", 1)
            .attr("stroke-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        const nodeExit = node.exit().transition(transition).remove()
            .attr("transform", d => `translate(${source.y},${source.x})`)
            .attr("fill-opacity", 0)
            .attr("stroke-opacity", 0);

        // Update the links…
        const link = gLink.selectAll("path")
            .data(links, d => d.target.id);

        // Enter any new links at the parent's previous position.
        const linkEnter = link.enter().append("path")
            .attr("class", d => `level-${d.source.depth}`)
            .attr("d", d => {
                const o = { x: source.x0, y: source.y0 };
                return diagonal({ source: o, target: o });
            });

        // Transition links to their new position.
        link.merge(linkEnter).transition(transition)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition(transition).remove()
            .attr("d", d => {
                const o = { x: source.x, y: source.y };
                return diagonal({ source: o, target: o });
            });

        // Stash the old positions for transition.
        root.eachBefore(d => {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    // Do the first update to the initial configuration of the tree — where a number of nodes
    // are open (arbitrarily selected as the root, plus nodes with 7 letters).
    root.x0 = dy / 2;
    root.y0 = 0;
    root.descendants().forEach((d, i) => {
        d.id = i;
        d._children = d.children;
        if (d.depth) d.children = null;
    });

    update(null, root);

    return svg.node();
}

function makeRadialTree(data) {
    // Specify the chart’s dimensions.
    const width = 1500;
    const height = width;
    const cx = width * 0.5; // Center X position
    const cy = height * 0.59; // Center Y position
    const radius = Math.min(width, height) / 2 - 150;

    // Create a radial tree layout.
    const tree = d3.tree()
        .size([2 * Math.PI, radius])
        .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

    // Create the root hierarchy, assuming 'Child Ontology Record' holds the children.
    const root = d3.hierarchy(data[0], d => d["Child Ontology Record"]);

    // Apply the layout to the root node.
    tree(root);

    // Creates the SVG container.
    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [-cx, -cy, width, height])
        .attr("style", "width: 100%; height: auto; font: 10px sans-serif;");

    // Append links.
    svg.append("g")
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 1.5)
        .selectAll()
        .data(root.links())
        .join("path")
        .attr("class", d => `level-${d.source.depth}`)
        .attr("d", d3.linkRadial()
            .angle(d => d.x)
            .radius(d => d.y));

    // Append nodes and assign classes based on their depth.
    const gNode = svg.append("g")
        .attr("cursor", "pointer")
        .selectAll()
        .data(root.descendants())
        .join("g")
        .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`)
        .attr("class", d => `level-${d.depth}`);
    // Assign class based on depth

    gNode.append("circle")
        .attr("fill", d => d.children ? "#555" : "#999")
        .attr("r", 2.5);

    // Append labels for nodes.
    gNode.append("text")
        .attr("dy", "0.31em")
        .attr("x", d => d.x < Math.PI === !d.children ? 6 : -6)
        .attr("text-anchor", d => d.x < Math.PI === !d.children ? "start" : "end")
        .attr("paint-order", "stroke")
        .attr("stroke", "white")
        .attr("fill", "currentColor")
        .text(d => d.data["Pattern Name"]); // Use "Pattern Name" for label

    // Store the initial positions for transition.
    root.each(d => {
        d.x0 = d.x;
        d.y0 = d.y;
        d._children = d.children; // Store the children for toggling
    });

    return svg.node();
}

function makeCollapseRadialTree(data) {
    const width = 1500;
    const radius = Math.min(width, width) / 2 - 40; // Make it a circle with some padding

    // Hierarchy data
    const root = d3.hierarchy(
        data[0],
        function children(d) {
            return d["Child Ontology Record"];
        }
    );

    // Define the tree layout
    const tree = d3.tree()
        .size([2 * Math.PI, radius]);

    // Convert to radial layout
    tree(root);

    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", width)
        .attr("viewBox", [-width / 2, -width / 2, width, width])
        .attr("style", "max-width: 100%; height: auto; font: 15px sans-serif; user-select: none;");

    const gLink = svg.append("g")
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 1.5);

    const gNode = svg.append("g")
        .attr("cursor", "pointer")
        .attr("pointer-events", "all");

    function update(event, source) {
        const nodes = root.descendants().filter(d => d.depth > 0).reverse();
        const links = root.links();

        // Update the nodes…
        const node = gNode.selectAll("g")
            .data(nodes, d => d.id);

        const nodeEnter = node.enter().append("g")
            .attr("transform", d => `rotate(${(source.x0 - Math.PI / 2) * 180 / Math.PI}) translate(${source.y0},0)`)
            .attr("fill-opacity", 0)
            .attr("stroke-opacity", 0)
            .attr("class", d => `level-${d.depth}`)
            .on("click", (event, d) => {
                d.children = d.children ? null : d._children;
                update(event, d);
            });

        const nodePadding = 75;

        nodeEnter.append("text")
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .text(d => d.data["Pattern Name"])
            .attr("font-size", "12px")
            .each(function (d) {
                const textWidth = this.getBBox().width;
                d.textWidth = textWidth + nodePadding * 2;
            });

        nodeEnter.insert("rect", "text")
            .attr("x", d => -d.textWidth / 2)
            .attr("y", -10)
            .attr("width", d => d.textWidth)
            .attr("height", 20)
            .attr("fill", d => d._children ? "#ADDE86" : "#81D4FA")
            .attr("stroke", "white");

        // Transition nodes to their new position.
        const nodeUpdate = node.merge(nodeEnter).transition()
            .attr("transform", d => `rotate(${(d.x - Math.PI / 2) * 180 / Math.PI}) translate(${d.y},0)`)
            .attr("fill-opacity", 1)
            .attr("stroke-opacity", 1);

        // Exit transition
        const nodeExit = node.exit().transition().remove()
            .attr("transform", d => `rotate(${(source.x - Math.PI / 2) * 180 / Math.PI}) translate(${source.y},0)`)
            .attr("fill-opacity", 0)
            .attr("stroke-opacity", 0);

        // Update the links…
        const link = gLink.selectAll("path")
            .data(links, d => d.target.id);

        const linkEnter = link.enter().append("path")
            .attr("class", d => `level-${d.source.depth}`)
            .attr("d", d => {
                const o = { x: source.x0, y: source.y0 };
                return d3.linkRadial()
                    .angle(d => d.x)
                    .radius(d => d.y)({ source: o, target: o });
            });

        // Transition links to their new position.
        link.merge(linkEnter).transition()
            .attr("d", d3.linkRadial()
                .angle(d => d.x)
                .radius(d => d.y));

        // Transition exiting links to the parent's new position.
        link.exit().transition().remove()
            .attr("d", d => {
                const o = { x: source.x, y: source.y };
                return d3.linkRadial()
                    .angle(d => d.x)
                    .radius(d => d.y)({ source: o, target: o });
            });

        // Stash the old positions for transition.
        root.eachBefore(d => {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    // Initial update
    root.x0 = Math.PI / 2;
    root.y0 = 0;
    root.descendants().forEach((d, i) => {
        d.id = i;
        d._children = d.children;
        if (d.depth) d.children = null; // Collapse all but the root
    });

    update(null, root);

    return svg.node();
}

function makeIcicleChart(data) {
    // Specify the chart’s dimensions.
    const width = 2000;
    const height = 2400;
    const format = d3.format(",d");

    // Create a color scale.
    const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, 6));
    // Adjusting to 10 for example

    // Create a partition layout.
    const partition = d3.partition()
        .size([height, width])
        .padding(1);

    const root = d3.hierarchy(
        data[0],
        function children(d) {
            return d["Child Ontology Record"];
        })
        .sum(d => {
            // Use children count or set a default value
            return d["Child Ontology Record"] ? d["Child Ontology Record"].length : 1;
        })
        .sort((a, b) => b.height - a.height || b.value - a.value);

    // Apply the partition layout.
    partition(root);

    // Create the SVG container.
    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [width / 4, 0, width, height])
        .attr("style", "max-width: 100%; height: auto; font: 20px sans-serif");

    // Add a cell for each node of the hierarchy.
    const cell = svg
        .selectAll()
        .data(root.descendants().filter(d => d.depth > 0))
        .join("g")
        .attr("transform", d => `translate(${d.y0},${d.x0})`);

    cell.append("title")
        .text(d => `${d.ancestors().map(d => d.data["Pattern Name"]).reverse().join("/")}\n${format(d.value)}`);

    // Color the cell.
    cell.append("rect")
        .attr("width", d => d.y1 - d.y0)
        .attr("height", d => d.x1 - d.x0)
        .attr("fill-opacity", 0.6)
        .attr("fill", d => {
            if (!d.depth) return "#ccc";
            while (d.depth > 1) d = d.parent;
            return color(d.data["Pattern Name"]);
        });

    // Add labels and a title.
    const text = cell.filter(d => (d.x1 - d.x0) > 16).append("text")
        // .attr("x", 4)
        // .attr("y", 13);
        .attr("text-anchor", "middle") // Center horizontally
        .attr("x", (d) => (d.y1 - d.y0) / 2) // Center horizontally
        .attr("y", (d) => (d.x1 - d.x0) / 2) // Center vertically
        .attr("dy", "0.35em"); // Adjust vertical alignment

    text.append("tspan")
        .text(d => d.data["Pattern Name"]);

    // text.append("tspan")
    //     .attr("fill-opacity", 0.7)
    //     .text(d => ` ${format(d.value)}`);

    return svg.node();
}

function makeSunburst(data) {
    function autoBox() {
        document.body.appendChild(this);
        const { x, y, width, height } = this.getBBox();
        document.body.removeChild(this);
        return [x, y, width, height];
    }

    const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, data[0]["Child Ontology Record"].length + 1));
    const radius = 1500 / 2;

    const partition = data => d3.partition()
        .size([2 * Math.PI, radius])
        (d3.hierarchy(
            data[0],
            function children(d) {
                return d["Child Ontology Record"];
            })
            .sum(d => d["Child Ontology Record"] ? d["Child Ontology Record"].length : 1) // Sum based on children
            .sort((a, b) => b.value - a.value));

    const arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
        .padRadius(radius / 2)
        .innerRadius(d => d.y0)
        .outerRadius(d => d.y1 - 1);

    const root = partition(data);

    // Create the SVG container.
    const svg = d3.create("svg");

    // Add an arc for each element, with a title for tooltips.
    const format = d3.format(",d");
    svg.append("g")
        .attr("fill-opacity", 0.6)
        .selectAll("path")
        .data(root.descendants().filter(d => d.depth))
        .join("path")
        .attr("fill", d => { while (d.depth > 1) d = d.parent; return color(d.data["Pattern Name"]); })
        .attr("d", arc)
        .append("title")
        .text(d => `${d.ancestors().map(d => d.data["Pattern Name"]).reverse().join("/")}\n${format(d.value)}`);

    // Add labels for each element
    svg.append("g")
        .attr("pointer-events", "none")
        .attr("text-anchor", "middle")
        .attr("font-size", 10)
        .attr("font-family", "sans-serif")
        .selectAll("text")
        .data(root.descendants().filter(d => d.depth && (d.y0 + d.y1) / 2 * (d.x1 - d.x0) > 10))
        .join("text")
        .attr("transform", function (d) {
            const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
            const y = (d.y0 + d.y1) / 2;
            return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
        })
        .attr("dy", "0.35em")
        .text(d => d.data["Pattern Name"]);

    return svg.attr("viewBox", autoBox).node();
}

// Dynamic View-box Version
function makeSquareTree(data) {
    const svg = d3.create("svg")
        .attr("style", "font: 12px sans-serif; user-select: none; overflow: visible; max-width: 100%; height: auto;");

    const gLink = svg.append("g")
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 1.5);

    const gNode = svg.append("g")
        .attr("cursor", "pointer")
        .attr("pointer-events", "all");

    const root = d3.hierarchy(
        data[0],
        d => d["Child Ontology Record"]
    );

    const dx = 200;
    const dy = 600;

    const tree = d3.tree().nodeSize([dx, dy]);

    const diagonal = d3.linkVertical()
        .x(d => d.x)
        .y(d => d.y);

    function update(event, source) {
        const duration = event?.altKey ? 2500 : 250;
        const nodes = root.descendants().filter(d => d.depth > 0).reverse();
        const links = root.links();

        tree(root);

        // Calculate boundaries dynamically
        let [left, right, top, bottom] = [Infinity, -Infinity, Infinity, -Infinity];

        root.eachBefore(d => {
            if (d.x < left) left = d.x;
            if (d.x > right) right = d.x;
            if (d.y < top) top = d.y;
            if (d.y > bottom) bottom = d.y;
        });

        const width = right - left + 200;
        const height = bottom - top + 200;

        const transition = svg.transition().duration(duration)
            .attr("viewBox", [left - 75, top + 100, width, height]);

        const node = gNode.selectAll("g")
            .data(nodes, d => d.id);

        const nodeEnter = node.enter().append("g")
            .attr("transform", d => `translate(${source.x0},${source.y0})`)
            .attr("fill-opacity", 0)
            .attr("stroke-opacity", 0)
            .on("click", (event, d) => {
                d.children = d.children ? null : d._children;
                update(event, d);
            });

        const bgColors = ["", "#607D8B", "#B0BEC5", "#ECEFF1"];

        // Adding foreignObject for custom HTML node
        nodeEnter.append("foreignObject")
            .attr("x", -70)
            .attr("y", -10)
            .attr("width", 175)
            .attr("height", 100)
            .append("xhtml:div")
            .style("background-color", d => bgColors[d.depth])
            .attr("class", "pattern-card")
            .html(d =>
                `<div style="text-align: center">
                    ${d.data["Pattern Name"]}
                </div>
                <div style="margin: 0.5em; font-size: 5px; overflow-wrap: break-word; text-align: center;">
                    ${d.data["Unified Definition"]}
                </div>`
            );

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

    root.x0 = 0;
    root.y0 = 0;
    root.descendants().forEach((d, i) => {
        d.id = i;
        d._children = d.children;
        if (d.depth) d.children = null;
    });

    update(null, root);

    return svg.node();
}

// Zoom with Dynamic View Box
function makeSquareTree(data) {
    const svg = d3.create("svg")
        .attr("height", "100%")
        .attr("width", "100%")
        .attr("style", "font: 12px sans-serif; user-select: none; overflow: visible; max-width: 100%; height: auto;");

    const gLink = svg.append("g")
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 1.5);

    const gNode = svg.append("g")
        .attr("cursor", "pointer")
        .attr("pointer-events", "all");

    const root = d3.hierarchy(
        data[0],
        d => d["Child Ontology Record"]
    );

    const dx = 200;
    const dy = 200;

    const tree = d3.tree().nodeSize([dx, dy]);

    const diagonal = d3.linkVertical()
        .x(d => d.x)
        .y(d => d.y);

    // Define zoom functionality
    const zoom = d3.zoom()
        .scaleExtent([1, 15]) // Set zoom scale range
        .on("zoom", (event) => {
            gNode.attr("transform", event.transform);
            gLink.attr("transform", event.transform);
        });

    svg.call(zoom);

    function update(event, source) {
        const duration = event?.altKey ? 2500 : 250;
        const nodes = root.descendants().filter(d => d.depth > 0).reverse();
        const links = root.links();

        tree(root);

        // Calculate boundaries dynamically
        let [left, right, top, bottom] = [Infinity, -Infinity, Infinity, -Infinity];

        root.eachBefore(d => {
            if (d.x < left) left = d.x;
            if (d.x > right) right = d.x;
            if (d.y < top) top = d.y;
            if (d.y > bottom) bottom = d.y;
        });

        const width = right - left + 200;
        const height = bottom - top + 200;

        const transition = svg.transition().duration(duration)
            .attr("viewBox", [left - 75, top + 100, width, height]);

        svg.attr("width", width)
            .attr("height", height);

        const node = gNode.selectAll("g")
            .data(nodes, d => d.id);

        const nodeEnter = node.enter().append("g")
            .attr("transform", d => `translate(${source.x0},${source.y0})`)
            .attr("fill-opacity", 0)
            .attr("stroke-opacity", 0)
            .on("click", (event, d) => {
                d.children = d.children ? null : d._children;
                update(event, d);
            });

        const bgColors = ["", "#607D8B", "#B0BEC5", "#ECEFF1"];

        // Adding foreignObject for custom HTML node
        nodeEnter.append("foreignObject")
            .attr("x", -70)
            .attr("y", -10)
            .attr("width", 175)
            .attr("height", 100)
            .append("xhtml:div")
            .style("background-color", d => bgColors[d.depth])
            .attr("class", "pattern-card")
            .html(d =>
                `<div style="text-align: center">
                    ${d.data["Pattern Name"]}
                </div>
                <div style="margin: 0.5em; font-size: 5px; overflow-wrap: break-word; text-align: center;">
                    ${d.data["Unified Definition"]}
                </div>`
            );

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

    root.x0 = 0;
    root.y0 = 0;
    root.descendants().forEach((d, i) => {
        d.id = i;
        d._children = d.children;
        if (d.depth) d.children = null;
    });

    update(null, root);

    // Add expandAll function to expand all nodes
    function expandAll(root) {
        root.descendants().forEach(d => {
            if (d._children) {
                d.children = d._children;  // Restore the children from _children
                d._children = null;         // Remove the _children property
            }
        });
        update(null, root);  // Re-render the tree after expanding
    }

    // Add collapseAll function to collapse all nodes
    function collapseAll(root) {
        // Collapse all nodes, but skip depth-0 nodes
        root.descendants().forEach(d => {
            if (d.depth > 0 && d.children) {  // Skip depth-0 nodes
                d._children = d.children;
                d.children = null;
            }
        });

        // Reset zoom to the initial state (default view)
        svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity);

        // Re-render the tree after collapsing and reset the zoom
        update(null, root);
    }

    // Adding event listeners for the buttons
    document.getElementById("expand-all").addEventListener("click", () => expandAll(root));
    document.getElementById("collapse-all").addEventListener("click", () => collapseAll(root));

    return svg.node();
}