import { PackageCheckIcon, RefreshCwIcon, ShieldCheckIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

const POLICY_ITEMS = [
  {
    icon: RefreshCwIcon,
    title: "Retours sous 30 jours",
    description: "Articles non portés, dans leur emballage d'origine.",
  },
  {
    icon: PackageCheckIcon,
    title: "Échanges simplifiés",
    description: "Changez de taille ou de couleur sans frais supplémentaires.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Emballage sécurisé",
    description: "Chaque commande est soigneusement protégée à l'expédition.",
  },
]

export function ReturnPolicyCard() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <h3 className="font-heading text-base font-medium">
          Politique de retour
        </h3>
        {POLICY_ITEMS.map((item) => (
          <div key={item.title} className="flex items-start gap-3">
            <item.icon className="text-accent-gold mt-0.5 size-5 shrink-0" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{item.title}</span>
              <span className="text-muted-foreground text-xs">
                {item.description}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
