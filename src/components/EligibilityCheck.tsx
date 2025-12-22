import './EligibilityCheck.css'

interface EligibilityCheckProps {
  isEligible: boolean | null
}

export default function EligibilityCheck({ isEligible }: EligibilityCheckProps) {
  if (isEligible === null) {
    return (
      <div className="eligibility-check">
        <h2>Eligibility Status</h2>
        <div className="whitelist-tag loading">Checking...</div>
      </div>
    )
  }

  return (
    <div className="eligibility-check">
      <h2>Eligibility Status</h2>
      <div className={`whitelist-tag ${isEligible ? 'whitelisted' : 'not-whitelisted'}`}>
        {isEligible ? 'Whitelisted' : 'Not Whitelisted'}
        </div>
    </div>
  )
}

