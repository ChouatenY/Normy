"use client";

import React from "react";
import { motion } from "framer-motion";

export interface FormDocument {
  id: string;
  title: string;
  desc: string;
  color: string;
}

const defaultDocuments: FormDocument[] = [
  { id: 'cancel', title: "Cancellation", desc: "Validates subscription cancellation reasons.", color: "#111111" },
  { id: 'job', title: "Job Application", desc: "Evaluates structure and tone.", color: "#444444" },
  { id: 'feedback', title: "Feedback", desc: "Validates customer rating feedback.", color: "#777777" },
  { id: 'gov', title: "Gov Request", desc: "Ensures description has sufficient context.", color: "#999999" },
  { id: 'survey', title: "Stack Survey", desc: "Checks listed stack matches tools.", color: "#bbbbbb" },
];

export interface InteractiveFolderGalleryProps {
  documents?: FormDocument[];
  onSelectForm?: (id: string) => void;
  selectedFormId?: string | null;
}

export function InteractiveFolderGallery({
  documents = defaultDocuments,
  onSelectForm,
}: InteractiveFolderGalleryProps) {

  return (
    <motion.div
      style={{
        width: "100%",
        padding: "20px 0",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ position: "relative", width: "100%", minHeight: "450px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        
          {/* Document Cards - Spread out by default */}
          <div style={{ position: "absolute", bottom: "40px", zIndex: 10, display: "flex", justifyContent: "center" }}>
            {documents.map((doc, i) => {
              const offset = i - 2;

              const openY = -100;
              const openX = offset * 135;
              const openRotate = offset * 2; // slight fan out
              const openScale = 1.05;

              return (
                <motion.div
                  key={doc.id}
                  onClick={() => {
                    if (onSelectForm) {
                      onSelectForm(doc.id);
                    }
                  }}
                  style={{
                    position: "absolute",
                    bottom: 0,
                    width: "220px",
                    height: "300px",
                    borderRadius: "12px",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.2)",
                    transformOrigin: "bottom center",
                    cursor: "pointer",
                    pointerEvents: "auto",
                    background: "#fdfdfd",
                    color: "#000",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  animate={{
                    y: openY,
                    x: openX,
                    rotate: openRotate,
                    scale: openScale,
                    zIndex: 50
                  }}
                  whileHover={{ scale: openScale + 0.05, y: openY - 20, zIndex: 100 }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                >
                  {/* Paper Document Design */}
                  <div style={{ height: "6px", width: "100%", backgroundColor: doc.color }} />
                  <div style={{ padding: "20px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: "12px", color: doc.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
                      Form Template
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: 800, lineHeight: 1.1, marginBottom: "12px", color: "#111" }}>
                      {doc.title}
                    </div>
                    <div style={{ fontSize: "13px", color: "#555", lineHeight: 1.5 }}>
                      {doc.desc}
                    </div>
                    {/* Wireframe UI */}
                    <div style={{ flex: 1, marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ height: "14px", width: "100%", background: "#f0f0f0", borderRadius: "4px" }} />
                      <div style={{ height: "14px", width: "85%", background: "#f0f0f0", borderRadius: "4px" }} />
                      <div style={{ height: "14px", width: "95%", background: "#f0f0f0", borderRadius: "4px" }} />
                      <div style={{ height: "14px", width: "70%", background: "#f0f0f0", borderRadius: "4px" }} />
                    </div>
                    <div style={{ 
                      width: "100%", 
                      height: "32px", 
                      marginTop: "16px",
                      borderRadius: "6px", 
                      backgroundColor: "rgba(0,0,0,0.05)", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#444"
                    }}>
                      Select Template
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

      </div>
    </motion.div>
  );
}
