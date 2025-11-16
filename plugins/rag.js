// plugins/rag.js
export const ragPlugin = {
  name: "Document Search",
  
  beforeQuery: async (data) => {
    // Search your documents before querying
    const relevantDocs = await searchDocuments(data.message);
    data.context = relevantDocs;
    return data;
  }
};