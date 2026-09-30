// Déclaration minimale de l'environnement Deno de Supabase, pour contrôler
// les types des fonctions avec TypeScript (npm run typecheck:fonctions) sans
// installer Deno. N'est pas déployé.
declare namespace Deno {
    const env: { get(nom: string): string | undefined };
    function serve(gestionnaire: (req: Request) => Response | Promise<Response>): unknown;
}
