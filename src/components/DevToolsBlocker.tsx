import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export function DevToolsBlocker() {
  const { userData } = useAuth();

  useEffect(() => {
    // Only block if the user is not an admin, so admins can still debug if necessary
    if (userData?.admin) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent F12
      if (e.key === "F12") {
        e.preventDefault();
      }
      // Prevent Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (
        e.ctrlKey &&
        e.shiftKey &&
        (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c")
      ) {
        e.preventDefault();
      }
      // Prevent Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === "U" || e.key === "u")) {
        e.preventDefault();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      // Prevent Right Click
      e.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [userData]);

  return null;
}
