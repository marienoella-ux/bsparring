# B-Sparring by Brainiacs

Plateforme de sparring stratégique pour dirigeants : achat de crédits, soumission d'un dilemme, session (visio ou sparring écrit), livrable de décision, et back-office Brainiacs.

- `docs/00-architecture.md` — architecture validée (lot 0).
- `docs/01-acces-et-secrets.md` — accès à configurer et transmission des secrets.
- `docs/02-configuration-supabase.md` — configuration du projet Supabase de test, premier admin, vérification du lot 1.
- `docs/03-lot-2-credits.md` — lot 2 : règles de crédit, mise en place, critères d'acceptation.
- `design/` — charte graphique B-Sparring (tokens, logos, règles des composants).

## Développement

```bash
npm install
cp .env.example .env.local   # puis renseigner les valeurs du projet Supabase de test
npm run dev                  # http://localhost:3000
npm test                     # règles métier (Vitest)
npm run test:db              # règles de sécurité de la base, sur un PostgreSQL local jetable
npm run typecheck
```
