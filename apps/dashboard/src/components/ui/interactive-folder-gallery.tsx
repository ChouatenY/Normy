"use client";

import React, { useState, useEffect } from "react";
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
  folderName?: string;
  dragHintText?: string;
  onSelectForm?: (id: string) => void;
  selectedFormId?: string | null;
}

export function InteractiveFolderGallery({
  documents = defaultDocuments,
  folderName = "Test Forms",
  dragHintText = "Drag any card down to close",
  onSelectForm,
  selectedFormId = null,
}: InteractiveFolderGalleryProps) {
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [hoverFolder, setHoverFolder] = useState(false);

  // If a form is selected, we animate the entire gallery to the side
  const isSelected = selectedFormId !== null;

  useEffect(() => {
    if (isSelected) {
      setIsFolderOpen(false);
      setHoverFolder(false);
    }
  }, [isSelected]);

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
      <div style={{ position: "relative", width: "100%", minHeight: "500px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        
        <div style={{ position: "relative", width: "400px", height: "500px", display: "flex", justifyContent: "center", zIndex: 0 }}>
          
          {/* Back of the Folder */}
          <motion.div
            style={{
              position: "absolute",
              bottom: "24px",
              width: "320px",
              height: "224px",
              filter: "drop-shadow(0 20px 25px rgba(0,0,0,0.5))",
            }}
            animate={{ opacity: isFolderOpen ? 0 : 1, scale: isFolderOpen ? 0.9 : 1 }}
          >
            {/* Folder Tab */}
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "128px",
              height: "40px",
              background: "linear-gradient(to top, #1e1e1e, #2a2a2a)",
              borderRadius: "12px 12px 0 0",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              borderLeft: "1px solid rgba(255,255,255,0.1)",
              borderRight: "1px solid rgba(255,255,255,0.1)",
            }} />
            {/* Folder Body Back */}
            <div style={{
              position: "absolute",
              top: "32px",
              left: 0,
              right: 0,
              bottom: 0,
              background: "linear-gradient(to bottom, #1e1e1e, #0a0a0a)",
              borderRadius: "0 12px 12px 12px",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "inset 0 0 40px rgba(0,0,0,0.8)",
            }} />
            <div style={{
              position: "absolute",
              top: "40px",
              left: "8px",
              right: "8px",
              bottom: "8px",
              background: "#000",
              borderRadius: "8px",
              boxShadow: "inset 0 2px 10px rgba(0,0,0,0.8)",
              pointerEvents: "none"
            }} />
          </motion.div>

          {/* Document Cards */}
          <div style={{ position: "absolute", bottom: "40px", zIndex: 10, display: "flex", justifyContent: "center" }}>
            {documents.map((doc, i) => {
              const offset = i - 2;

              const stackY = hoverFolder ? offset * -5 + 20 : offset * -5;
              const stackX = hoverFolder ? offset * 30 : offset * 3;
              const stackRotate = hoverFolder ? offset * 8 : offset * 3;
              const stackScale = 1 - Math.abs(offset) * 0.03;

              const openY = -140;
              const openX = offset * 135;
              const openRotate = offset * 2; // slight fan out when open
              const openScale = 1.05;

              return (
                <motion.div
                  key={doc.id}
                  drag={isFolderOpen ? true : false}
                  dragSnapToOrigin={true}
                  onDragEnd={(_e: any, info: any) => {
                    if (info.offset.y > 100 && isFolderOpen) {
                      setIsFolderOpen(false);
                      setHoverFolder(false);
                    }
                  }}
                  onClick={() => {
                    if (isFolderOpen && onSelectForm) {
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
                    cursor: isFolderOpen ? "grab" : "default",
                    pointerEvents: isFolderOpen ? "auto" : "none",
                    background: "#fdfdfd",
                    color: "#000",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  whileDrag={isFolderOpen ? { cursor: "grabbing" } : {}}
                  animate={!isFolderOpen ? {
                    y: stackY,
                    x: stackX,
                    rotate: stackRotate,
                    scale: stackScale,
                    zIndex: i + 10
                  } : {
                    y: openY,
                    x: openX,
                    rotate: openRotate,
                    scale: openScale,
                    zIndex: 50
                  }}
                  whileHover={isFolderOpen ? { scale: openScale + 0.05, y: openY - 20, zIndex: 100 } : {}}
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
                    <div style={{ flex: 1 }} />
                    <div style={{ 
                      width: "100%", 
                      height: "32px", 
                      borderRadius: "6px", 
                      backgroundColor: "rgba(0,0,0,0.05)", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#444"
                    }}>
                      Select Form
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Front of the Folder */}
          <motion.div
            style={{
              position: "absolute",
              bottom: 0,
              width: "340px",
              height: "176px",
              filter: "drop-shadow(0 -20px 40px rgba(0,0,0,0.8))",
              cursor: "pointer",
              zIndex: 20,
              pointerEvents: "auto",
              transformOrigin: "bottom center"
            }}
            animate={{ 
              opacity: isFolderOpen ? 0 : 1, 
              rotateX: hoverFolder ? -35 : 0, 
              y: hoverFolder ? 30 : 0,
              pointerEvents: isFolderOpen ? "none" : "auto" 
            }}
            onMouseEnter={() => setHoverFolder(true)}
            onMouseLeave={() => setHoverFolder(false)}
            onClick={() => setIsFolderOpen(true)}
          >
            <div style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(to bottom, #2a2a2a, #111)",
              borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.2)",
              boxShadow: "inset 0 2px 10px rgba(255,255,255,0.1)",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              paddingBottom: "32px"
            }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(to right, transparent, rgba(255,255,255,0.4), transparent)" }} />
              
              <div style={{
                padding: "10px 20px",
                background: "#000",
                borderRadius: "8px",
                border: "1px solid rgba(0,0,0,0.8)",
                boxShadow: "inset 0 2px 4px rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "14px", fontWeight: 600, letterSpacing: "1px" }}>
                  {folderName}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Drag hint text */}
        <motion.div
          animate={{ opacity: isFolderOpen ? 1 : 0, y: isFolderOpen ? 0 : 50 }}
          style={{
            position: "absolute",
            bottom: "40px",
            padding: "12px 24px",
            borderRadius: "99px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.5)",
            fontSize: "14px",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "2px",
            pointerEvents: "none"
          }}
        >
          {dragHintText}
        </motion.div>

      </div>
    </motion.div>
  );
}
