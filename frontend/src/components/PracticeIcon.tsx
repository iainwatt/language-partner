type IconName = "microphone" | "book" | "translate" | "arrow" | "close" | "check" | "menu" | "settings" | "sound" | "bookmark";
export function PracticeIcon({ name, className = "" }: { name: IconName; className?: string }) {
  return <svg className={`practice-icon ${className}`} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === "microphone" && <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v3M9 22h6"/></>}
    {name === "book" && <><path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1ZM12 5v15"/></>}
    {name === "translate" && <><path d="M2 5h12M8 3v2M12 5c-1 6-5 9-9 10M4 8c2 3 5 6 9 7M14 21l4-10 4 10M15.5 17h5"/></>}
    {name === "arrow" && <path d="M4 12h16M14 6l6 6-6 6"/>}
    {name === "close" && <path d="m6 6 12 12M18 6 6 18"/>}
    {name === "check" && <path d="m5 12 4 4L19 6"/>}
    {name === "menu" && <path d="M4 6h16M4 12h16M4 18h16"/>}
    {name === "settings" && <><path d="m9 3-1 3-3 1-2 3 2 2-1 3 3 2 1 3h4l1-3 3-1 2-3-2-2 1-3-3-2-1-3Z"/><circle cx="10" cy="11" r="3"/></>}
    {name === "sound" && <><path d="m3 9 4 0 5-4v14l-5-4H3ZM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14"/></>}
    {name === "bookmark" && <path d="M6 3h12v18l-6-4-6 4Z"/>}
  </svg>;
}
