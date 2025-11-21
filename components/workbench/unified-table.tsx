"use client";

import React, { useState } from "react";
import { AnalyzeDrawer } from "./analyze-drawer";

type UnifiedItemRow = {
  id: string;
  title: string;
  source?: string | null;
  kind?: string | null;
  snippet?: string | null;
  preview?: string | null;
  owner?: string | null;
  modified?: string | null;
  orgId?: string | null;
  documentId?: string | null;
};

export function UnifiedTable({ items }: { items: UnifiedItemRow[] }) {
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<UnifiedItemRow | null>(null);

  const handleOpenAnalyze = (item: UnifiedItemRow) => {
    // Map preview to snippet for the drawer
    const drawerItem = {
      ...item,
      snippet: item.snippet ?? item.preview ?? null,
    };
    setSelectedItem(drawerItem);
    setAnalyzeOpen(true);
  };

  const handleCloseAnalyze = () => {
    setAnalyzeOpen(false);
    setSelectedItem(null);
  };

  return (
    <>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ background: "#f9f9f9" }}>
          <tr>
            <th style={{ textAlign: "left", padding: 8 }}>Title</th>
            <th style={{ textAlign: "left", padding: 8 }}>Source</th>
            <th style={{ textAlign: "left", padding: 8 }}>Kind</th>
            <th style={{ textAlign: "left", padding: 8 }}>Owner</th>
            <th style={{ textAlign: "left", padding: 8 }}>Modified</th>
            <th style={{ textAlign: "left", padding: 8 }}>Actions</th>
            <th style={{ textAlign: "left", padding: 8 }}>Analyze</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: 12, color: "#777" }}>
                No items yet
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} style={{ borderTop: "1px solid #eee" }}>
                <td style={{ padding: 8 }}>
                  <div style={{ fontWeight: 600 }}>{item.title}</div>
                  <div
                    style={{
                      fontSize: 12,
                      opacity: 0.75,
                      maxWidth: 560,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={item.preview ?? item.snippet ?? undefined}
                  >
                    {item.preview ?? item.snippet ?? "—"}
                  </div>
                </td>
                <td style={{ padding: 8 }}>{item.source ?? "—"}</td>
                <td style={{ padding: 8 }}>{item.kind ?? "—"}</td>
                <td style={{ padding: 8 }}>{item.owner ?? "—"}</td>
                <td style={{ padding: 8 }}>{item.modified ?? "—"}</td>
                <td style={{ padding: 8 }}>—</td>
                <td style={{ padding: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleOpenAnalyze(item)}
                    style={{
                      border: "1px solid #ccc",
                      borderRadius: 8,
                      padding: "6px 12px",
                      cursor: "pointer",
                    }}
                  >
                    Analyze
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <AnalyzeDrawer
        item={selectedItem}
        open={analyzeOpen}
        onClose={handleCloseAnalyze}
      />
    </>
  );
}

