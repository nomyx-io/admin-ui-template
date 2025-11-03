import { useState, useEffect } from "react";

import { Modal, Checkbox, Input, Button, Card, Tag } from "antd";
import ReactQuill from "react-quill";
import { toast } from "react-toastify";
import "react-quill/dist/quill.snow.css";
// eslint-disable-next-line import/order
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
// eslint-disable-next-line import/order
import { saveAs } from "file-saver";

const { TextArea } = Input;

const InvestmentRequestModal = ({ visible, onClose, selectedIdentity, tokenProjects }) => {
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [subject, setSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [loading, setLoading] = useState(false);

  // Generate default email template when projects are selected
  useEffect(() => {
    if (selectedProjects.length > 0 && selectedIdentity) {
      const projectsList = selectedProjects
        .map((projectId, index) => {
          const project = tokenProjects.find((p) => p.id === projectId);

          // Parse projectInfo if it's a string
          let projectInfo = [];
          try {
            projectInfo = typeof project?.projectInfo === "string" ? JSON.parse(project.projectInfo) : project?.projectInfo || [];
          } catch (e) {
            projectInfo = [];
          }

          // Parse fields if it's a string
          let fields = [];
          try {
            fields = typeof project?.fields === "string" ? JSON.parse(project.fields) : project?.fields || [];
          } catch (e) {
            fields = [];
          }

          // Generate project info HTML
          const projectInfoHtml =
            projectInfo.length > 0
              ? `<div style="margin: 10px 0;">
                ${projectInfo
                  .map(
                    (info) =>
                      `<div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee;">
                    <p><span style="color: #666; font-weight: 500;">${info.key}:&nbsp;&nbsp;</span>
                    <span style="color: #262626;">${info.value}</span></p>
                  </div>`
                  )
                  .join("")}
              </div>`
              : "";

          // Generate interest rate HTML
          const interestRateHtml = project?.interestRate
            ? `<div style="margin: 10px 0; padding: 10px; background: #fff7e6; border-left: 3px solid #faad14; border-radius: 4px;">
                <span style="color: #fa8c16; font-weight: 600;">Interest Rate: ${project.interestRate}%</span>
              </div>`
            : "";

          // Generate required fields HTML
          const fieldsHtml =
            fields.length > 0
              ? `<div style="margin: 10px 0;">
                <div style="color: #1890ff; font-weight: 600; margin-bottom: 8px;">Required Information:</div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                  ${fields
                    .map(
                      (field) =>
                        `<span style="background: #f0f0f0; padding: 4px 12px; border-radius: 12px; font-size: 12px; color: #595959;">
                      ${field.name} (${field.type})
                    </span>`
                    )
                    .join("")}
                </div>
              </div>`
              : "";

          return `<div style="margin: 20px 0; padding: 15px; border: 1px solid #d9d9d9; border-radius: 8px; background: #fafafa;">
  <div style="display: flex; align-items: start; gap: 15px; margin-bottom: 12px;">
    <div style="flex: 1;">
      <br /> <h3 style="margin: 0 0 8px 0; color: #1890ff; font-weight: 600; font-size: 18px;">${index + 1}. ${project?.title || "Project"}</h3>
      <p style="margin: 0; color: #666; line-height: 1.6;">${project?.description || "No description available"}</p>
    </div>
  </div>
  ${interestRateHtml}
  ${projectInfoHtml}
  ${fieldsHtml}
</div>`;
        })
        .join("");

      const defaultTemplate = `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
  <p>Dear ${selectedIdentity.displayName || "Investor"},</p>
  <p>We are pleased to present you with exclusive investment opportunities that align with your investment profile.</p><br />
  <h3 style="color: #1890ff; border-bottom: 2px solid #1890ff; padding-bottom: 10px; font-weight: bold;">Investment Opportunities</h3>
  ${projectsList}
  <div style="margin-top: 30px; padding: 20px; background: #e6f7ff; border-radius: 8px;"><br />
    <h3 style="color: #1890ff; margin-top: 0;">Next Steps</h3>
    <p>We would be delighted to discuss these opportunities with you in more detail. Please let us know your availability for a call or meeting.</p>
  </div>
  <p style="margin-top: 30px;">Best regards,<br/>Investment Team</p>
</div>`;

      setEmailBody(defaultTemplate);
      setSubject(`Investment Opportunity: ${selectedProjects.length} Project${selectedProjects.length > 1 ? "s" : ""} Available`);
    } else {
      setEmailBody("");
      setSubject("");
    }
  }, [selectedProjects, selectedIdentity, tokenProjects]);

  const handleProjectToggle = (projectId) => {
    setSelectedProjects((prev) => (prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]));
  };

  const generateWordDocument = async () => {
    if (selectedProjects.length === 0) {
      toast.error("Please select at least one token project");
      return;
    }

    if (!subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }

    if (!emailBody.trim()) {
      toast.error("Please enter document content");
      return;
    }

    setLoading(true);
    try {
      const documentSections = [];

      // Title
      documentSections.push(
        new Paragraph({
          text: subject,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      );

      // Greeting
      documentSections.push(
        new Paragraph({
          text: `Dear ${selectedIdentity.displayName || "Investor"},`,
          spacing: { after: 200 },
        })
      );

      // Introduction
      documentSections.push(
        new Paragraph({
          text: "We are pleased to present you with exclusive investment opportunities that align with your investment profile.",
          spacing: { after: 400 },
        })
      );

      // Investment Opportunities Section
      documentSections.push(
        new Paragraph({
          text: "Investment Opportunities",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 },
        })
      );

      // Add each selected project
      selectedProjects.forEach((projectId, index) => {
        const project = tokenProjects.find((p) => p.id === projectId);

        // Parse projectInfo
        let projectInfo = [];
        try {
          projectInfo = typeof project?.projectInfo === "string" ? JSON.parse(project.projectInfo) : project?.projectInfo || [];
        } catch (e) {
          projectInfo = [];
        }

        // Parse fields
        let fields = [];
        try {
          fields = typeof project?.fields === "string" ? JSON.parse(project.fields) : project?.fields || [];
        } catch (e) {
          fields = [];
        }

        // Project Title
        documentSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${index + 1}. ${project?.title || "Project"}`,
                bold: true,
                size: 28,
              }),
            ],
            spacing: { before: 300, after: 100 },
          })
        );

        // Description
        documentSections.push(
          new Paragraph({
            text: project?.description || "No description available",
            spacing: { after: 200, left: 400 },
          })
        );

        // Interest Rate
        if (project?.interestRate) {
          documentSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `Interest Rate: ${project.interestRate}%`,
                  bold: true,
                  color: "FA8C16",
                }),
              ],
              spacing: { after: 150, left: 400 },
            })
          );
        }

        // Project Info
        if (projectInfo.length > 0) {
          documentSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "Project Information:",
                  bold: true,
                }),
              ],
              spacing: { before: 150, after: 100, left: 400 },
            })
          );

          projectInfo.forEach((info) => {
            documentSections.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${info.key}: `,
                    bold: true,
                  }),
                  new TextRun({
                    text: info.value,
                  }),
                ],
                spacing: { after: 50, left: 600 },
              })
            );
          });
        }

        // Required Fields
        if (fields.length > 0) {
          documentSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "Required Information:",
                  bold: true,
                }),
              ],
              spacing: { before: 150, after: 100, left: 400 },
            })
          );

          fields.forEach((field) => {
            documentSections.push(
              new Paragraph({
                text: `• ${field.name} (${field.type})`,
                spacing: { after: 50, left: 600 },
              })
            );
          });
        }

        // Add separator between projects
        if (index < selectedProjects.length - 1) {
          documentSections.push(
            new Paragraph({
              text: "",
              spacing: { after: 200 },
            })
          );
        }
      });

      // Next Steps Section
      documentSections.push(
        new Paragraph({
          text: "Next Steps",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
        })
      );

      documentSections.push(
        new Paragraph({
          text: "We would be delighted to discuss these opportunities with you in more detail. Please let us know your availability for a call or meeting.",
          spacing: { after: 400 },
        })
      );

      // Closing
      documentSections.push(
        new Paragraph({
          text: "Best regards,",
          spacing: { before: 200, after: 100 },
        })
      );

      documentSections.push(
        new Paragraph({
          text: "Investment Team",
          spacing: { after: 200 },
        })
      );

      // Create the document
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: documentSections,
          },
        ],
      });

      // Generate and download the file
      const blob = await Packer.toBlob(doc);
      const fileName = `Investment_Request_${selectedIdentity.displayName?.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.docx`;
      saveAs(blob, fileName);

      toast.success("Word document downloaded successfully!");

      // Reset form
      setSelectedProjects([]);
      setSubject("");
      setEmailBody("");
      onClose();
    } catch (error) {
      console.error("Error generating Word document:", error);
      toast.error("Failed to generate Word document");
    } finally {
      setLoading(false);
    }
  };

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ color: [] }, { background: [] }],
      ["link"],
      ["clean"],
    ],
  };

  return (
    <Modal
      title={
        <div style={{ fontSize: "20px", fontWeight: 600, color: "#1890ff" }}>
          📄 Create Investment Request Document for {selectedIdentity?.displayName || "Identity"}
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={null}
      destroyOnClose
    >
      <div style={{ maxHeight: "70vh", overflowY: "auto", padding: "20px 0" }}>
        {/* Token Projects Selection */}
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px", color: "#262626" }}>Select Token Projects</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
            {tokenProjects && tokenProjects.length > 0 ? (
              tokenProjects.map((project) => {
                // Parse projectInfo
                let projectInfo = [];
                try {
                  projectInfo = typeof project?.projectInfo === "string" ? JSON.parse(project.projectInfo) : project?.projectInfo || [];
                } catch (e) {
                  projectInfo = [];
                }

                // Parse fields
                let fields = [];
                try {
                  fields = typeof project?.fields === "string" ? JSON.parse(project.fields) : project?.fields || [];
                } catch (e) {
                  fields = [];
                }

                return (
                  <Card
                    key={project.id}
                    hoverable
                    style={{
                      border: selectedProjects.includes(project.id) ? "2px solid #1890ff" : "1px solid #d9d9d9",
                      background: selectedProjects.includes(project.id) ? "#e6f7ff" : "#fff",
                      cursor: "pointer",
                      transition: "all 0.3s",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProjectToggle(project.id);
                    }}
                    bodyStyle={{ padding: "16px" }}
                  >
                    <div style={{ display: "flex", alignItems: "start", gap: "12px", marginBottom: "12px" }}>
                      {project.logo && (
                        <img
                          src={project.logo.url()}
                          alt="Project Logo"
                          style={{
                            width: "48px",
                            height: "48px",
                            objectFit: "contain",
                            borderRadius: "6px",
                            background: "white",
                            padding: "4px",
                            border: "1px solid #d9d9d9",
                          }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <Checkbox
                          checked={selectedProjects.includes(project.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => handleProjectToggle(project.id)}
                        >
                          <span style={{ fontWeight: 600, fontSize: "14px" }}>{project.title}</span>
                        </Checkbox>
                      </div>
                    </div>

                    <p style={{ margin: "8px 0", fontSize: "12px", color: "#666", lineHeight: "1.4" }}>
                      {project.description?.substring(0, 100)}
                      {project.description?.length > 100 ? "..." : ""}
                    </p>

                    {project.interestRate && (
                      <Tag color="orange" style={{ marginTop: "8px" }}>
                        Interest: {project.interestRate}%
                      </Tag>
                    )}

                    {projectInfo.length > 0 && (
                      <div style={{ marginTop: "8px", fontSize: "11px", color: "#595959" }}>
                        {projectInfo.slice(0, 2).map((info, idx) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                            <span style={{ fontWeight: 500 }}>{info.key}:</span> <span>{info.value}</span>
                          </div>
                        ))}
                        {projectInfo.length > 2 && (
                          <div style={{ color: "#1890ff", fontSize: "10px", marginTop: "4px" }}>+{projectInfo.length - 2} more details</div>
                        )}
                      </div>
                    )}

                    {fields.length > 0 && (
                      <div style={{ marginTop: "8px" }}>
                        <div style={{ fontSize: "11px", color: "#1890ff", fontWeight: 600, marginBottom: "4px" }}>
                          Required Fields: {fields.length}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })
            ) : (
              <p style={{ color: "#999", fontStyle: "italic" }}>No token projects available</p>
            )}
          </div>
        </div>

        {/* Document Title */}
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px", color: "#262626" }}>Document Title</h3>
          <Input
            placeholder="Enter document title"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            size="large"
            style={{ fontSize: "14px" }}
          />
        </div>

        {/* Document Content Editor */}
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px", color: "#262626" }}>Document Content (Preview)</h3>
          <div style={{ background: "#fff", border: "1px solid #d9d9d9", borderRadius: "4px" }}>
            <ReactQuill
              value={emailBody}
              onChange={setEmailBody}
              modules={modules}
              style={{ minHeight: "300px" }}
              placeholder="Edit your investment request document content..."
            />
          </div>
          <p style={{ fontSize: "12px", color: "#999", marginTop: "8px" }}>
            Note: The Word document will be formatted with proper headings and spacing.
          </p>
        </div>

        {/* Action Buttons */}
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #f0f0f0" }}
        >
          <Button onClick={onClose} size="large">
            Cancel
          </Button>
          <Button
            type="primary"
            onClick={generateWordDocument}
            loading={loading}
            disabled={selectedProjects.length === 0 || !subject.trim() || !emailBody.trim()}
            size="large"
            style={{ minWidth: "150px" }}
            icon={<span style={{ marginRight: "8px" }}>📥</span>}
          >
            Download Word
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default InvestmentRequestModal;
