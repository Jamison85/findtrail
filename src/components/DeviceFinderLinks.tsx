export function DeviceFinderLinks() {
  return (
    <div className="device-finder" role="group" aria-label="Official phone-finding tools">
      <p>Use the account on your missing phone. Your trail stays open while you use the finder.</p>
      <div className="device-finder__links">
        <a className="button button--secondary" href="https://www.icloud.com/find" target="_blank" rel="noopener noreferrer">Apple Find My<span className="sr-only"> (opens a new tab)</span></a>
        <a className="button button--secondary" href="https://www.google.com/android/find" target="_blank" rel="noopener noreferrer">Google Find Hub<span className="sr-only"> (opens a new tab)</span></a>
      </div>
    </div>
  )
}
