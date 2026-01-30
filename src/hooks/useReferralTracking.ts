import { useEffect, useState } from "react";

interface ReferralData {
  code: string | null;
  agentCode: string | null;
  source: string | null;
}

/**
 * Track referral codes from URL parameters
 * Supports both customer referrals (?ref=CODE) and agent referrals (?agent=CODE)
 */
export const useReferralTracking = () => {
  const [referralData, setReferralData] = useState<ReferralData>({
    code: null,
    agentCode: null,
    source: null,
  });

  useEffect(() => {
    // Check URL parameters
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    const agentCode = params.get("agent");

    // Also check localStorage for previously stored referral
    const storedRef = localStorage.getItem("referral_code");
    const storedAgent = localStorage.getItem("agent_code");

    // URL params take priority over stored values
    const finalRefCode = refCode || storedRef;
    const finalAgentCode = agentCode || storedAgent;

    // Store in localStorage if found in URL
    if (refCode) {
      localStorage.setItem("referral_code", refCode);
      localStorage.setItem("referral_source", window.location.href);
    }

    if (agentCode) {
      localStorage.setItem("agent_code", agentCode);
      localStorage.setItem("agent_source", window.location.href);
    }

    // Determine source type
    let source: string | null = null;
    if (finalRefCode) source = "customer_referral";
    if (finalAgentCode) source = "agent_referral";

    setReferralData({
      code: finalRefCode,
      agentCode: finalAgentCode,
      source,
    });
  }, []);

  const clearReferral = () => {
    localStorage.removeItem("referral_code");
    localStorage.removeItem("referral_source");
    localStorage.removeItem("agent_code");
    localStorage.removeItem("agent_source");
    setReferralData({ code: null, agentCode: null, source: null });
  };

  const getReferralForSubmission = () => {
    return {
      referral_code: referralData.code,
      agent_code: referralData.agentCode,
    };
  };

  return {
    referralCode: referralData.code,
    agentCode: referralData.agentCode,
    referralSource: referralData.source,
    hasReferral: !!(referralData.code || referralData.agentCode),
    clearReferral,
    getReferralForSubmission,
  };
};

export default useReferralTracking;
