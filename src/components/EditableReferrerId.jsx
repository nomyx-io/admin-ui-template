import { useState, useRef, useEffect } from "react";

import { CheckOutlined, CloseOutlined, EditOutlined, LoadingOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";

const PARSE_OBJECT_ID_REGEX = /^[a-zA-Z0-9]{10}$/;

export const EditableReferrerId = ({ record, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(record.referrerId || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleEdit = () => {
    setValue(record.referrerId || "");
    setError("");
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setError("");
    setValue(record.referrerId || "");
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setValue(val);
    if (val && !PARSE_OBJECT_ID_REGEX.test(val)) {
      setError("Must be exactly 10 alphanumeric characters");
    } else {
      setError("");
    }
  };

  const handleSave = async () => {
    if (!PARSE_OBJECT_ID_REGEX.test(value)) {
      setError("Must be exactly 10 alphanumeric characters");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(record, value);
      setEditing(false);
    } catch (err) {
      setError(err?.message || "Failed to update referrer ID");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  if (!editing) {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
        {record.referrerId ? (
          <Tooltip
            title={
              record.referrer ? (
                <div style={{ lineHeight: "1.6" }}>
                  <div>
                    <strong>Name:</strong> {record.referrer.firstName} {record.referrer.lastName}
                  </div>
                  <div>
                    <strong>Email:</strong> {record.referrer.email}
                  </div>
                </div>
              ) : (
                "Referrer details unavailable"
              )
            }
            placement="left"
          >
            <span style={{ fontFamily: "monospace", fontSize: "12px", borderBottom: "1px dashed #8c8c8c", cursor: "default" }}>
              {record.referrerId}
            </span>
          </Tooltip>
        ) : (
          <span style={{ color: "#bfbfbf" }}>—</span>
        )}
        <Tooltip title="Edit Referrer ID">
          <EditOutlined
            onClick={handleEdit}
            style={{ fontSize: "12px", color: "#8c8c8c", cursor: "pointer", opacity: 0.6 }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.6)}
          />
        </Tooltip>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
        <input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          maxLength={10}
          placeholder="10-char ID"
          style={{
            fontFamily: "monospace",
            fontSize: "12px",
            width: "110px",
            padding: "2px 6px",
            border: `1px solid ${error ? "#ff4d4f" : "#d9d9d9"}`,
            borderRadius: "4px",
            outline: "none",
          }}
        />
        {saving ? (
          <LoadingOutlined style={{ color: "#1890ff", fontSize: "14px" }} />
        ) : (
          <>
            <Tooltip title="Save">
              <CheckOutlined onClick={handleSave} style={{ color: "#52c41a", cursor: "pointer", fontSize: "14px" }} />
            </Tooltip>
            <Tooltip title="Cancel">
              <CloseOutlined onClick={handleCancel} style={{ color: "#ff4d4f", cursor: "pointer", fontSize: "14px" }} />
            </Tooltip>
          </>
        )}
      </div>
      {error && <span style={{ color: "#ff4d4f", fontSize: "11px" }}>{error}</span>}
    </div>
  );
};

export default EditableReferrerId;
