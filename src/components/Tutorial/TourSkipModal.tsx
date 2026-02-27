// components/TourSkipModal.tsx
import React, { useState } from "react";

import styles from "../../styles/TourSkipModal.module.css";

interface TourSkipModalProps {
  onDisable: () => void;
  onJustSkip: () => void;
  onCancel: () => void;
}

const TourSkipModal: React.FC<TourSkipModalProps> = ({ onDisable, onJustSkip, onCancel }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  const hoverProps = (key: string) => ({
    onMouseEnter: () => setHovered(key),
    onMouseLeave: () => setHovered(null),
  });

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.tooltip} onClick={(e) => e.stopPropagation()}>
        {/* Arrow notch */}
        <svg className={styles.arrow} viewBox="0 0 16 9" xmlns="http://www.w3.org/2000/svg">
          <polygon className={styles.arrowBorder} points="0,9 8,0 16,9" />
          <polygon className={styles.arrowFill} points="1.5,9 8,1.5 14.5,9" />
        </svg>

        {/* Close × */}
        <button
          className={`${styles.closeBtn} ${hovered === "close" ? styles.closeBtnHover : ""}`}
          onClick={onCancel}
          aria-label="Close"
          {...hoverProps("close")}
        >
          ×
        </button>

        <p className={styles.title}>Skip the tour?</p>

        <p className={styles.body}>
          Do you want to <strong className={styles.bodyStrong}>permanently disable</strong> the guided tour, or just skip it for now? You can always
          restart from the <strong className={styles.bodyStrong}>?</strong> button in the bottom-right corner.
        </p>

        <div className={styles.footer}>
          <button className={`${styles.ghostBtn} ${hovered === "cancel" ? styles.ghostBtnHover : ""}`} onClick={onCancel} {...hoverProps("cancel")}>
            Keep tour
          </button>

          <button className={`${styles.secBtn} ${hovered === "skip" ? styles.secBtnHover : ""}`} onClick={onJustSkip} {...hoverProps("skip")}>
            Skip for now
          </button>

          <button className={`${styles.primBtn} ${hovered === "disable" ? styles.primBtnHover : ""}`} onClick={onDisable} {...hoverProps("disable")}>
            Disable tour
          </button>
        </div>
      </div>
    </div>
  );
};

export default TourSkipModal;
