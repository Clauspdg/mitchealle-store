export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Mitchaella Store
      </h1>
      <p className="text-muted-foreground max-w-md text-sm">
        Infrastructure en place. Les fonctionnalités métier seront ajoutées une
        fois le modèle de données validé (voir{" "}
        <code className="font-mono">docs/</code>).
      </p>
    </div>
  )
}
