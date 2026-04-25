export function getFriendlyErrorMessage(err: unknown, fallback: string = "An unexpected error occurred."): string {
  if (err instanceof Error || (typeof err === 'object' && err !== null)) {
    const msg = err instanceof Error ? err.message : String((err as any).message || err);
    if (msg.includes('auth/invalid-credential')) return "Invalid username/email or password.";
    if (msg.includes('auth/user-not-found')) return "User not found.";
    if (msg.includes('auth/wrong-password')) return "Invalid username/email or password.";
    if (msg.includes('auth/email-already-in-use')) return "This email is already in use by another account.";
    if (msg.includes('auth/weak-password')) return "Password is too weak. Must be at least 6 characters.";
    if (msg.includes('auth/network-request-failed')) return "Network error. Please check your internet connection.";
    if (msg.includes('auth/too-many-requests')) return "Too many attempts. Please try again later.";
    if (msg.includes('PERMISSION_DENIED') || msg.includes('permission_denied')) return "You do not have permission to perform this action.";
    if (msg.includes('Firebase:')) return "An unexpected system error occurred. Please try again.";
    return msg;
  }
  return typeof err === 'string' ? err : fallback;
}
