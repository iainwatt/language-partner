// Intentionally inactive until the app's public download is ready.
export function DownloadButton() {
  return (
    <button
      className="download-button"
      type="button"
      disabled
      aria-label="Download on the App Store (coming soon)"
    >
      <img
        src="/images/app-store-badge.svg"
        alt=""
        width={144}
        height={48}
      />
    </button>
  );
}
