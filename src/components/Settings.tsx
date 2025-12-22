import { O2_API_URL } from '../constants/o2Constants'

export default function Settings() {
  return (
    <div className="settings">
      <h2>Settings</h2>
      
      <div className="settings-group">
        <h3>Network Configuration</h3>
        <p className="setting-description">
          Network: <strong>Mainnet</strong>
        </p>
        <p className="setting-description">
          API URL: {O2_API_URL}
        </p>
      </div>
    </div>
  )
}

