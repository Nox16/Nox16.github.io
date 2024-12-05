// Loading for Webpage Based
function loadJSON(filename, func) {
    // Declare Object Dedicated to Reading/Storing JSON
    const xobj = new XMLHttpRequest();
    // Get File to Read/Open
    xobj.open("GET", filename);
    // When Object is Ready, Run Function
    xobj.onreadystatechange = () => {
        // Check if File is Read Properly by checking Ready State and Status
        if (xobj.readyState == 4 && xobj.status == "200") {
            // Store String File Contents as JSON Object
            const dataJSON = JSON.parse(xobj.responseText);
            // Run Callback Function on JSON Data
            func(dataJSON);
        }
    }

    // Send xobj Out for Processing
    xobj.send();
}

// Processing for Webpage based
function processJSON(dataJSON) {
    console.log(dataJSON);
    addChildren(dataJSON);
}

// Import for File Writing
const fs = require("fs");

// Debug
const debug = true;

// PRIVATE - Sort Records into High, Meso, and Low
// Called within 'addChildren'
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

    if (debug) { console.log(sortedLevels); };

    return sortedLevels;
}

// PRIVATE - Remove Fields Property & Add Data Back to Item Un-Nested
// Called within addChildren
function removeFields(record) {
    const highKeys = Object.keys(record.fields);
    const highValues = Object.values(record.fields);
    for (let i = 0; i < highKeys.length; i++) {
        record[highKeys[i]] = highValues[i];
    }
    delete record.fields
}

// PRIVATE - Add Children List to Records
// Called within 'writeJSON'
function addChildren(dataJSON) {
    sortedLevels = sortLevels(dataJSON);

    // Add Children to High Level Patterns
    sortedLevels.Highs.forEach(high => {
        high.fields["Child Ontology Record"] = [];

        sortedLevels.Mesos.forEach(meso => {
            if (meso.fields["Parent Ontology Record"][0] === high.id) {
                high.fields["Child Ontology Record"].push(meso);
            }
        })

        removeFields(high);
    });

    // Add Children to Meso Level Patterns
    sortedLevels.Mesos.forEach(meso => {
        meso.fields["Child Ontology Record"] = [];

        sortedLevels.Lows.forEach(low => {
            if (low.fields["Parent Ontology Record"][0] === meso.id) {
                meso.fields["Child Ontology Record"].push(low);
            }
        })

        removeFields(meso);
    });

    // Remove 'Fields' from Low Level Patterns
    sortedLevels.Lows.forEach(low => {
        removeFields(low);
    });

    if (debug) { console.log(sortedLevels); };

    return sortedLevels;
}

function writeJSON(dataJSON) {
    sortedWithChildren = addChildren(dataJSON);

    if (debug) { console.log(sortedWithChildren); };

    fs.writeFileSync(
        "ontologySorted.json",
        JSON.stringify(sortedWithChildren.Highs),
        err => {
            if (err) throw err;

            console.log("Done Writing - New File Made");
        }
    )
}

function init() {
    // Call for Loading JSON for Webpage Based
    // loadJSON("ontology.json", processJSON);

    // JSON Parsing & File Writing for Terminal Based
    fs.readFile("ontology.json", function (err, data) {
        if (err) throw err;

        const dataJSON = JSON.parse(data);

        console.log(dataJSON);

        writeJSON(dataJSON)
    });
}
init();

module.exports = {sortLevels}