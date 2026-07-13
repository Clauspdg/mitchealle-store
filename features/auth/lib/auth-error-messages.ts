import { FirebaseError } from "firebase/app"

const MESSAGES: Record<string, string> = {
  "auth/invalid-email": "Adresse email invalide.",
  "auth/user-disabled": "Ce compte a été désactivé.",
  "auth/user-not-found": "Aucun compte ne correspond à cet email.",
  "auth/wrong-password": "Mot de passe incorrect.",
  "auth/invalid-credential": "Email ou mot de passe incorrect.",
  "auth/email-already-in-use": "Un compte existe déjà avec cet email.",
  "auth/weak-password": "Mot de passe trop faible.",
  "auth/too-many-requests": "Trop de tentatives. Réessayez plus tard.",
  "auth/popup-closed-by-user": "Fenêtre de connexion fermée avant la fin.",
  "auth/network-request-failed": "Problème de connexion réseau.",
}

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return MESSAGES[error.code] ?? "Une erreur est survenue. Réessayez."
  }

  return "Une erreur est survenue. Réessayez."
}
