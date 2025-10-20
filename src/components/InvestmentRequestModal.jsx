import { useState, useEffect } from "react";

import { Modal, Checkbox, Input, Button, Card, Spin } from "antd";
import ReactQuill from "react-quill";
import { toast } from "react-toastify";
import "react-quill/dist/quill.snow.css";

const { TextArea } = Input;

const InvestmentRequestModal = ({ visible, onClose, selectedIdentity, tokenProjects, onSubmit }) => {
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
          return `<div style="margin: 20px 0; padding: 15px; border-left: 4px solid #1890ff; background: #f5f5f5;">
  <h3 style="margin: 0 0 10px 0; color: #1890ff; font-weight: 500;">${index + 1}. ${project?.title || "Project"}</h3>
  <p style="margin: 0; color: #666;">${project?.description || "No description available"}</p>
</div>`;
        })
        .join("");

      const defaultTemplate = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <p>Dear ${selectedIdentity.displayName || "Investor"},</p>
  <p>We are pleased to present you with exclusive investment opportunities that align with your investment profile.</p><br />
  <h3 style="color: #1890ff; border-bottom: 2px solid #1890ff; padding-bottom: 10px;font-weight:bold">Investment Opportunities</h3>
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
      // Clear email body and subject when no projects are selected
      setEmailBody("");
      setSubject("");
    }
  }, [selectedProjects, selectedIdentity, tokenProjects]);

  const handleProjectToggle = (projectId) => {
    setSelectedProjects((prev) => (prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]));
  };

  const handleSubmit = async () => {
    if (selectedProjects.length === 0) {
      toast.error("Please select at least one token project");
      return;
    }

    if (!subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }

    if (!emailBody.trim()) {
      toast.error("Please enter an email body");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        identityId: selectedIdentity.id,
        identityAddress: selectedIdentity.identityAddress,
        projectIds: selectedProjects,
        subject,
        emailBody,
      });

      // Reset form
      setSelectedProjects([]);
      setSubject("");
      setEmailBody("");
      onClose();
    } catch (error) {
      console.error("Error submitting investment request:", error);
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
          📧 Request Investment from {selectedIdentity?.displayName || "Identity"}
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={null}
      destroyOnClose
    >
      <div style={{ maxHeight: "70vh", overflowY: "auto", padding: "20px 0" }}>
        {/* Token Projects Selection */}
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px", color: "#262626" }}>Select Token Projects</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "12px" }}>
            {tokenProjects && tokenProjects.length > 0 ? (
              tokenProjects.map((project) => (
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
                    // Prevent card click from interfering with checkbox
                    e.stopPropagation();
                    handleProjectToggle(project.id);
                  }}
                  bodyStyle={{ padding: "16px" }}
                >
                  <Checkbox
                    checked={selectedProjects.includes(project.id)}
                    style={{ marginBottom: "8px" }}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => handleProjectToggle(project.id)}
                  >
                    <span style={{ fontWeight: 600, fontSize: "14px" }}>{project.title}</span>
                  </Checkbox>
                  <p style={{ margin: "8px 0 0 24px", fontSize: "12px", color: "#666", lineHeight: "1.4" }}>
                    {project.description?.substring(0, 80)}
                    {project.description?.length > 80 ? "..." : ""}
                  </p>
                </Card>
              ))
            ) : (
              <p style={{ color: "#999", fontStyle: "italic" }}>No token projects available</p>
            )}
          </div>
        </div>

        {/* Subject Line */}
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px", color: "#262626" }}>Email Subject</h3>
          <Input
            placeholder="Enter email subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            size="large"
            style={{ fontSize: "14px" }}
          />
        </div>

        {/* Email Body Editor */}
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px", color: "#262626" }}>Email Body</h3>
          <div style={{ background: "#fff", border: "1px solid #d9d9d9", borderRadius: "4px" }}>
            <ReactQuill
              value={emailBody}
              onChange={setEmailBody}
              modules={modules}
              style={{ minHeight: "300px" }}
              placeholder="Compose your investment request email..."
            />
          </div>
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
            onClick={handleSubmit}
            loading={loading}
            disabled={selectedProjects.length === 0 || !subject.trim() || !emailBody.trim()}
            size="large"
            style={{ minWidth: "120px" }}
          >
            Send Request
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default InvestmentRequestModal;
