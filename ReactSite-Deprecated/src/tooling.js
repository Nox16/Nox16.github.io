export const ontologyDataParser = (ontologyData) => {
    return ontologyData.records.map(datum => ({ id: datum.id, patternName: datum.fields["Pattern Name"], patternLevel: datum.fields["Hierarchical Type"], patternUnifiedDescription: datum.fields["Unified Definition"], parentRecordId: datum.fields["Parent Ontology Record"]}))
}