/**
 * Renders a single `<script type="application/ld+json">` tag from a plain
 * object. `JSON.stringify` is safe here (no `dangerouslySetInnerHTML` XSS
 * risk from user input) because every caller passes structured data built
 * from our own typed fields, never raw user-submitted HTML/strings meant for
 * display — still, `<` is escaped defensively so a stray value can never
 * close the script tag early.
 */
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c")
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
