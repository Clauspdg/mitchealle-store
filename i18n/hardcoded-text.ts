/**
 * Finds text a migrated file still writes in French instead of reading it
 * from the dictionary. Comments are ignored; dictionary keys, paths and
 * class names don't look like French and pass.
 */
const FRENCH_WORDS =
  /\b(votre|vos|aucun|aucune|ajouter|voir|mon|mes|panier|commande|connexion|rechercher|livraison|boutique|produits?|paiement|adresse|mot de passe|créer|envoyer|continuer|fermer|accueil|réessayer|retour|avis|clients?|chargement|tout|plus|prix|taille|couleur|le|la|les|des|du|une|est|pour|avec|sur|dans)\b/i

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
}

function looksFrench(text: string): boolean {
  const value = text.trim()
  if (value.length < 2) return false
  if (/^[\w.-]+\.[\w.-]+$/.test(value)) return false // a dictionary key
  if (/^[/#@]|^https?:/.test(value)) return false // a path or a URL
  if (/^use (client|server)$/.test(value)) return false // a directive
  return /[À-ÿ]/.test(value) || (/\s/.test(value) && FRENCH_WORDS.test(value))
}

export function findHardcodedFrench(source: string): string[] {
  const code = stripComments(source)
  const found: string[] = []
  // String literals, then the text between JSX tags.
  for (const match of code.matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) {
    if (looksFrench(match[2])) found.push(match[2])
  }
  for (const match of code.matchAll(/>([^<>{}]+)</g)) {
    if (looksFrench(match[1])) found.push(match[1].trim())
  }
  return found
}
