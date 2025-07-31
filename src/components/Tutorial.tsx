import React, { useState, useEffect } from "react";

import Joyride, { CallBackProps, STATUS, Step, EVENTS } from "react-joyride";
import { useNavigate, useLocation } from "react-router-dom";

interface TutorialProps {
  role: string[];
}

const Tutorial: React.FC<TutorialProps> = ({ role }) => {
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const centralAuthoritySteps: Step[] = [
    {
      target: '[data-tour="nav-compliance-rules"]',
      content: "Start by navigating to Compliance Rules to define the types of Claims.",
      disableBeacon: true,
      spotlightPadding: 2,
    },
    {
      target: '[data-tour="create-compliance-rule-btn"]',
      content: "Click here to create a new Compliance Rule.",
      disableBeacon: true,
      spotlightPadding: 2,
    },
    {
      target: '[data-tour="compliance-rule-display-name"]',
      content: "Enter a user-friendly name for the Compliance Rule.",
      disableBeacon: true,
      spotlightPadding: 5,
    },
    {
      target: '[data-tour="compliance-rule-topic-id"]',
      content: "This is the system-generated ID for the rule. It's used internally.",
      disableBeacon: true,
      spotlightPadding: 5,
    },
    {
      target: '[data-tour="create-compliance-rule-submit"]',
      content: "Click here to save the new Compliance Rule.",
      disableBeacon: true,
      spotlightPadding: 2,
    },
    {
      target: '[data-tour="nav-trusted-issuers"]',
      content: "Next, navigate to Trusted Issuers to manage entities that can issue identities.",
      disableBeacon: true,
      spotlightPadding: 2,
    },
    {
      target: '[data-tour="create-trusted-issuer-btn"]',
      content: "Click here to add a new Trusted Issuer.",
      disableBeacon: true,
      spotlightPadding: 2,
    },
    {
      target: '[data-tour="trusted-issuer-display-name"]',
      content: "Enter the name of the Trusted Issuer.",
      disableBeacon: true,
      spotlightPadding: 5,
    },
    {
      target: '[data-tour="trusted-issuer-wallet"]',
      content: "Enter the wallet address of the Trusted Issuer.",
      disableBeacon: true,
      spotlightPadding: 5,
    },
    {
      target: '[data-tour="trusted-issuer-compliance-rules"]',
      content: "Select the Compliance Rules this issuer is authorized to manage.",
      disableBeacon: true,
      spotlightPadding: 5,
    },
    {
      target: '[data-tour="create-trusted-issuer-submit"]',
      content: "Click here to create the Trusted Issuer.",
      disableBeacon: true,
      spotlightPadding: 2,
    },
  ];

  const trustedIssuerSteps: Step[] = [
    {
      target: '[data-tour="nav-identities"]',
      content: "Navigate to Identities to manage user identities.",
      disableBeacon: true,
      spotlightPadding: 2,
    },
    {
      target: '[data-tour="identities-pending-tab"]',
      content: "Check the Pending tab for new identity requests.",
      disableBeacon: true,
      spotlightPadding: 2,
    },
    {
      target: '[data-tour="identities-approve-btn"]',
      content: "Click 'Approve' to create a pending identity.",
      disableBeacon: true,
      spotlightPadding: 2,
    },
    {
      target: '[data-tour="identities-add-rules-tab"]',
      content: "Go to the 'Add Rules' tab to assign compliance rules to identities.",
      disableBeacon: true,
      spotlightPadding: 2,
    },
    {
      target: '[data-tour="identities-add-rules-btn"]',
      content: "Click 'Add Rules' to assign specific claims to an identity.",
      disableBeacon: true,
      spotlightPadding: 2,
    },
  ];

  useEffect(() => {
    // Check if tutorial has been completed
    const tutorialCompleted = localStorage.getItem("tutorialCompleted");
    if (!tutorialCompleted) {
      startTutorial();
    }
  }, [role]);

  const startTutorial = () => {
    if (role.includes("CentralAuthority")) {
      setSteps(centralAuthoritySteps);
      setRun(true);
      setStepIndex(0);
    } else if (role.includes("TrustedIssuer")) {
      setSteps(trustedIssuerSteps);
      setRun(true);
      setStepIndex(0);
    }
  };

  const handleRestart = () => {
    localStorage.removeItem("tutorialCompleted");
    startTutorial();
  };

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, action, index } = data;

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      setRun(false);
      localStorage.setItem("tutorialCompleted", "true");
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextStepIndex = index + (action === "prev" ? -1 : 1);

      if (role.includes("CentralAuthority")) {
        if (index === 0 && nextStepIndex === 1) {
          navigate("/topics");
        } else if (index === 1 && nextStepIndex === 2) {
          navigate("/topics/create");
        } else if (index === 4 && nextStepIndex === 5) {
          navigate("/topics");
        } else if (index === 5 && nextStepIndex === 6) {
          navigate("/issuers");
        } else if (index === 6 && nextStepIndex === 7) {
          navigate("/issuers/create");
        }
      } else if (role.includes("TrustedIssuer")) {
        if (index === 0 && nextStepIndex === 1) {
          navigate("/identities");
        }
      }

      // Delay updating the step index to allow navigation to complete
      setTimeout(() => {
        setStepIndex(nextStepIndex);
      }, 500);
    }
  };

  return (
    <>
      <Joyride
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        continuous
        showProgress
        showSkipButton
        callback={handleJoyrideCallback}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: "#0fd795",
          },
        }}
      />
      {!run && (role.includes("CentralAuthority") || role.includes("TrustedIssuer")) && (
        <button
          onClick={handleRestart}
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            backgroundColor: "#0fd795",
            color: "white",
            border: "none",
            fontSize: "20px",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Restart Tutorial"
        >
          ?
        </button>
      )}
    </>
  );
};

export default Tutorial;
