import React from 'react';
import { ReactFlow } from '@xyflow/react';

import { ontologyDataParser } from './tooling';

import { ontology_data } from './data/ontology_fixture';

import '@xyflow/react/dist/style.css';

const extracted_json = ontologyDataParser(ontology_data);

const levelMap = new Map([["Low-level", 3], ["Meso-level", 2], ["High-level", 1]])

console.log("Extracted json", extracted_json, levelMap, levelMap.get(extracted_json[0].patternLevel) * 10)

const dataSortedOnLevel = extracted_json.sort((a, b) => {
    if (levelMap.get(a.patternLevel) >= levelMap.get(b.patternLevel)) {
        return 1;
    }
    else {
        return -1
    }
})

console.log("Data sorted on levels", dataSortedOnLevel);

const initialNodes = extracted_json.map((node, idx) => ({ id: node.id, position: { x: 400 + idx * 200, y: 0 + levelMap.get(node.patternLevel) * 100 }, data: { label: node.patternName } }))

console.log("Initial nodes", initialNodes)

const initialEdges = extracted_json.map((node, idx) => ({ id: `${node.parentRecordId}-${node.id}`, source: `${node.parentRecordId}`, target: `${node.id}` }));

console.log("Initial edges", initialEdges)

const OntologyVizLogic = () => {
    return (
        <div style={{ width: '100vw', height: '100vh' }}>
            <ReactFlow colorMode="dark" nodes={initialNodes} edges={initialEdges} />
        </div>
    );
}

export default OntologyVizLogic;