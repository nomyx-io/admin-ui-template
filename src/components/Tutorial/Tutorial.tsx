import React, { useState, useEffect, useCallback } from "react";

import Parse from "parse";
import Joyride, { CallBackProps, STATUS, Step, EVENTS, ACTIONS } from "react-joyride";
import { useNavigate, useLocation } from "react-router-dom";

import TourSkipModal from "./TourSkipModal";

interface TutorialProps {
  role: string[];
}

interface StepWithRoute extends Step {
  /** Route to navigate to BEFORE this step is shown (forward direction only) */
  route?: string;
}

const centralAuthoritySteps: StepWithRoute[] = [
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
    route: "/topics",
  },
  {
    target: '[data-tour="compliance-rule-display-name"]',
    content: "Enter a user-friendly name for the Compliance Rule.",
    disableBeacon: true,
    spotlightPadding: 5,
    route: "/topics/create",
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
    route: "/topics",
  },
  {
    target: '[data-tour="create-trusted-issuer-btn"]',
    content: "Click here to add a new Trusted Issuer.",
    disableBeacon: true,
    spotlightPadding: 2,
    route: "/issuers",
  },
  {
    target: '[data-tour="trusted-issuer-display-name"]',
    content: "Enter the name of the Trusted Issuer.",
    disableBeacon: true,
    spotlightPadding: 5,
    route: "/issuers/create",
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
  {
    target: '[data-tour="nav-identities"]',
    content: "Navigate to Identities to manage user identities.",
    disableBeacon: true,
    spotlightPadding: 2,
    route: "/issuers",
  },
  {
    target: '[data-tour="identities-pending-tab"]',
    content: "Check the Pending tab for new identity requests.",
    disableBeacon: true,
    spotlightPadding: 2,
    route: "/identities",
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
  {
    target: '[data-tour="create-identity-btn"]',
    content: "Click 'Create Identity' to create a new identity.",
    disableBeacon: true,
    spotlightPadding: 2,
  },
  // ── Create Digital Id page (/identities/create) ──────────────────────────
  {
    target: '[data-tour="identity-display-name"]',
    content: "Enter a user-friendly display name for this identity. This name will be shown to end-users throughout the platform.",
    disableBeacon: true,
    spotlightPadding: 5,
    route: "/identities/create",
  },
  {
    target: '[data-tour="identity-wallet-address"]',
    content: "Enter the investor's wallet address. This is the blockchain address that will be linked to the new digital identity.",
    disableBeacon: true,
    spotlightPadding: 5,
  },
  {
    target: '[data-tour="identity-kyc-account-number"]',
    content: "Provide the investor's KYC ID Provider Account Number. This links the identity to an external KYC verification record.",
    disableBeacon: true,
    spotlightPadding: 5,
  },
  {
    target: '[data-tour="create-identity-submit"]',
    content:
      "Once all fields are filled in, click 'Create Digital Id' to register the new identity on-chain. Make sure the wallet address and KYC details are correct before submitting.",
    disableBeacon: true,
    spotlightPadding: 2,
  },
];

const trustedIssuerSteps: StepWithRoute[] = [
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
    route: "/identities",
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
  {
    target: '[data-tour="create-identity-btn"]',
    content: "Click 'Create Identity' to create a new identity.",
    disableBeacon: true,
    spotlightPadding: 2,
  },
  // ── Create Digital Id page (/identities/create) ──────────────────────────
  {
    target: '[data-tour="identity-display-name"]',
    content: "Enter a user-friendly display name for this identity. This name will be shown to end-users throughout the platform.",
    disableBeacon: true,
    spotlightPadding: 5,
    route: "/identities/create",
  },
  {
    target: '[data-tour="identity-wallet-address"]',
    content: "Enter the investor's wallet address. This is the blockchain address that will be linked to the new digital identity.",
    disableBeacon: true,
    spotlightPadding: 5,
  },
  {
    target: '[data-tour="identity-kyc-account-number"]',
    content: "Provide the investor's KYC ID Provider Account Number. This links the identity to an external KYC verification record.",
    disableBeacon: true,
    spotlightPadding: 5,
  },
  {
    target: '[data-tour="create-identity-submit"]',
    content:
      "Once all fields are filled in, click 'Create Digital Id' to register the new identity on-chain. Make sure the wallet address and KYC details are correct before submitting.",
    disableBeacon: true,
    spotlightPadding: 2,
  },
];

const STEP_DELAY_MS = 500;

/**
 * Finds the index of the first step that belongs to the current page.
 * Walks the steps array and tracks the last step whose `route` is a
 * prefix of `pathname` — that is the beginning of the current page's group.
 */
function getStartIndexForPath(steps: StepWithRoute[], pathname: string): number {
  let bestIndex = 0;

  for (let i = 0; i < steps.length; i++) {
    const route = steps[i].route;
    if (route && pathname.startsWith(route)) {
      bestIndex = i;
    }
  }

  return bestIndex;
}

const Tutorial: React.FC<TutorialProps> = ({ role }) => {
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<StepWithRoute[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [tourReady, setTourReady] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const isRoleSupported = role.includes("CentralAuthority") || role.includes("TrustedIssuer");

  const getStepsForRole = useCallback((): StepWithRoute[] | null => {
    if (role.includes("CentralAuthority")) return centralAuthoritySteps;
    if (role.includes("TrustedIssuer")) return trustedIssuerSteps;
    return null;
  }, [role]);

  // ─── Start tour from the right step for the current page ─────────────────

  const beginTour = useCallback((roleSteps: StepWithRoute[] | null, pathname: string) => {
    if (!roleSteps) return;
    const startIndex = getStartIndexForPath(roleSteps, pathname);
    setSteps(roleSteps);
    setStepIndex(startIndex);
    setRun(true);
  }, []);

  // ─── Load preference from server on mount ────────────────────────────────

  useEffect(() => {
    if (!isRoleSupported) return;

    const loadPreference = async () => {
      try {
        const sessionToken = Parse.User.current()?.getSessionToken();
        if (!sessionToken) {
          setTourReady(true);
          return;
        }

        const { tourDisabled } = await Parse.Cloud.run("getSiteTourPreference", { sessionToken });

        if (tourDisabled) {
          // Permanently disabled — never auto-start
          setTourReady(true);
          return;
        }

        // Check if user chose "Skip for now" this session
        const skippedThisSession = sessionStorage.getItem("tourSkippedThisSession");
        if (skippedThisSession) {
          setTourReady(true);
          return;
        }

        // Auto-start from the step matching the current page
        beginTour(getStepsForRole(), location.pathname);
      } catch (err) {
        console.error("Failed to load tour preference:", err);
      } finally {
        setTourReady(true);
      }
    };

    loadPreference();
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Restart (? button) — always starts from current page ────────────────

  const handleRestart = () => {
    sessionStorage.removeItem("tourSkippedThisSession");
    beginTour(getStepsForRole(), location.pathname);
  };

  // ─── Joyride callback ─────────────────────────────────────────────────────

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, action, index } = data;

    // Fix 3: X button fires ACTIONS.CLOSE — intercept before STATUS checks
    if (action === ACTIONS.CLOSE) {
      setRun(false);
      setShowSkipModal(true);
      return;
    }

    if (status === STATUS.FINISHED) {
      setRun(false);
      return;
    }

    // Skip button fires STATUS.SKIPPED
    if (status === STATUS.SKIPPED) {
      setRun(false);
      setShowSkipModal(true);
      return;
    }

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const isForward = action !== "prev";
      const nextIndex = index + (isForward ? 1 : -1);

      // Went past the last step — finish the tour
      if (nextIndex >= steps.length) {
        setRun(false);
        return;
      }

      // Went before the first step — just stop
      if (nextIndex < 0) {
        setRun(false);
        return;
      }

      if (isForward && steps[nextIndex]?.route) {
        navigate(steps[nextIndex].route!);
      }

      setTimeout(() => setStepIndex(nextIndex), STEP_DELAY_MS);
    }
  };

  // ─── Skip modal handlers ──────────────────────────────────────────────────

  const handleDisableTour = async () => {
    setShowSkipModal(false);
    try {
      const sessionToken = Parse.User.current()?.getSessionToken();
      if (sessionToken) {
        await Parse.Cloud.run("setSiteTourPreference", { sessionToken, disabled: true });
      }
    } catch (err) {
      console.error("Failed to disable tour:", err);
    }
  };

  const handleSkipForNow = () => {
    setShowSkipModal(false);
    sessionStorage.setItem("tourSkippedThisSession", "true");
  };

  const handleCancelSkip = () => {
    setShowSkipModal(false);
    setRun(true); // resume from where the user paused
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!isRoleSupported || !tourReady) return null;

  return (
    <>
      <Joyride
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        continuous
        showProgress
        showSkipButton
        disableCloseOnEsc={false}
        callback={handleJoyrideCallback}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: "#0fd795",
          },
        }}
      />

      {!run && !showSkipModal && (
        <button
          onClick={handleRestart}
          title="Restart Tutorial"
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
        >
          ?
        </button>
      )}

      {showSkipModal && <TourSkipModal onDisable={handleDisableTour} onJustSkip={handleSkipForNow} onCancel={handleCancelSkip} />}
    </>
  );
};

export default Tutorial;
