import { useState } from "react";
import { Tabs, Card } from "antd";
import DocumentUpload from "../components/Knowledge/DocumentUpload";
import DocumentList from "../components/Knowledge/DocumentList";
import DocumentEditor from "../components/Knowledge/DocumentEditor";
import ChunkPreview from "../components/Knowledge/ChunkPreview";
import QAPairTable from "./QAPairPage";
import { DocumentItem } from "../api/knowledge";
import apiClient from "../api/client";

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState("documents");

  // Document editing state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);

  // Chunk preview state
  const [chunkDrawerOpen, setChunkDrawerOpen] = useState(false);
  const [chunkDocId, setChunkDocId] = useState<string | null>(null);
  const [chunkDocTitle, setChunkDocTitle] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  const handleEditDocument = (doc: DocumentItem) => {
    setEditingDocId(doc.id);
    setEditorOpen(true);
  };

  const handleViewChunks = (doc: DocumentItem) => {
    setChunkDocId(doc.id);
    setChunkDocTitle(doc.title);
    setChunkDrawerOpen(true);
  };

  const handleDocumentSave = async (
    id: string,
    data: { title: string; tags: string[]; content: string }
  ) => {
    await apiClient.put(`/knowledge/documents/${id}`, data);
    handleRefresh();
  };

  const tabItems = [
    {
      key: "documents",
      label: "文档管理",
      children: (
        <>
          <DocumentUpload onSuccess={handleRefresh} />
          <Card>
            <DocumentList
              key={refreshKey}
              onEditDocument={handleEditDocument}
              onViewChunks={handleViewChunks}
            />
          </Card>

          <DocumentEditor
            open={editorOpen}
            documentId={editingDocId}
            onClose={() => {
              setEditorOpen(false);
              setEditingDocId(null);
            }}
            onSave={handleDocumentSave}
          />

          <ChunkPreview
            open={chunkDrawerOpen}
            documentId={chunkDocId}
            documentTitle={chunkDocTitle}
            onClose={() => {
              setChunkDrawerOpen(false);
              setChunkDocId(null);
              setChunkDocTitle("");
            }}
          />
        </>
      ),
    },
    {
      key: "qa-pairs",
      label: "问答对管理",
      children: <QAPairTable />,
    },
  ];

  return (
    <Card>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
      />
    </Card>
  );
}
