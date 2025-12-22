interface EligibilityCheckProps {
  isEligible: boolean | null
}

export default function EligibilityCheck({ isEligible }: EligibilityCheckProps) {
  if (isEligible === null) {
    return (
      <div className="eligibility-check">
        <h2>Eligibility Status</h2>
        <p>Checking...</p>
      </div>
    )
  }

  return (
    <div className="eligibility-check">
      <h2>Eligibility Status</h2>
      {isEligible ? (
        <div className="eligible">
          <span className="status-badge success">✓ Eligible to Trade</span>
          <p>You can start trading on o2 Exchange.</p>
        </div>
      ) : (
        <div className="not-eligible">
          <span className="status-badge error">✗ Not Eligible</span>
          <p>You need to be whitelisted or have an invite code to trade.</p>
          <p className="note">Visit o2.app to get access.</p>
        </div>
      )}
    </div>
  )
}

