# CrouzetTheme

Thème Solarized pour Obsidian, avec adaptations des composants récents repérés dans [Minimal](https://github.com/kepano/obsidian-minimal). Les sources de départ sont [Solarized 1.1.5](https://github.com/harmtemolder/obsidian-solarized/tree/11cc702755b912abcedbebb6328a32ffddc03eff) et [Minimal 9.1.4](https://github.com/kepano/obsidian-minimal/tree/93321bdc23fc879966e1e3aa0cfeda77012f540f). Licences MIT conservées dans [LICENSE](LICENSE).

Les personnalisations de `tcrouzet.css` sont intégrées au thème : couleurs, typographie des notes, séparateurs, liens et mobile. Ce snippet peut être désactivé lorsque CrouzetTheme est sélectionné. La taille du texte est définie à `23px` par défaut et reste réglable dans Apparence ; le thème conserve la largeur de colonne native d'Obsidian, comme Solarized. Les styles de curseur épais s'appliquent seulement si Ninja Cursor est présent ; aucun plugin n'est installé par le thème.

## Modifier et construire

Prérequis : Dart Sass ≥ 1.79 disponible sous la commande `sass`, Python ≥ 3.9 et `curl`. Ces outils sont déjà présents sur la machine de développement.

- [scripts/scss/_palette.scss](scripts/scss/_palette.scss) : tons, accents, couleur d’accent par défaut, couleurs de base clair/sombre et réglages Style Settings. Les gris hérités restent disponibles pour conserver le rendu Solarized.
- [scripts/scss/_variables.scss](scripts/scss/_variables.scss) : association des couleurs aux éléments du thème.
- [scripts/scss/_solarized.scss](scripts/scss/_solarized.scss) : règles du thème d’origine.
- [scripts/scss/_modern.scss](scripts/scss/_modern.scss) : ajouts marqués `A AJUSTER` pour propriétés, tableaux éditables, Bases, Canvas, PDF, graphe, navigation et mobile. Vérifier leur rendu dans Obsidian en clair et sombre.

Depuis la racine, construire le fichier `theme.css` chargé par Obsidian :

```bash
python3 scripts/build.py
```

Reconstruire automatiquement à chaque modification SCSS ; arrêter avec Ctrl+C :

```bash
python3 scripts/build.py --watch
```

Modifier les sources SCSS ; `theme.css` est le résultat de compilation. La compilation conserve le bloc Style Settings et produit un CSS sans fichier source map. Le script compile en mémoire et écrit le résultat après réussite. Une erreur Sass conserve le CSS précédent, y compris en mode surveillance.

## Comparer les mises à jour

```bash
python3 scripts/update.py
```

La commande consulte les deux dépôts publics, compare leurs sources SCSS et manifestes aux révisions examinées inscrites dans `UPSTREAM`, reconstruit le CSS depuis les sources locales, puis écrit les différences dans [scripts/upstream-review.md](scripts/upstream-review.md). Elle ne télécharge aucun code à exécuter et ne lance aucune commande Git.

Adapter les différences utiles dans les sources locales, vérifier le rendu, puis remplacer les révisions dans `UPSTREAM` lorsque leur examen est terminé. Une différence reste signalée jusqu’à cette validation. En cas d’échec réseau, le rapport précédent et les sources locales sont conservés.

La comparaison amont signale les changements depuis les références examinées. Elle ne mesure pas la couverture complète des fonctionnalités de Minimal. Ses options de mise en page, thèmes alternatifs et intégrations de plugins restent des adaptations distinctes ; les composants natifs conservent aussi les styles fournis par Obsidian.

## Vérifier la construction

```bash
python3 -B scripts/check.py
```

Le contrôle compile en dossier temporaire, vérifie la synchronisation du CSS racine, la présence des réglages et des composants ajoutés, les ajouts/suppressions détectés par le comparateur et la conservation du CSS en cas d’erreur Sass. Il ne remplace pas une vérification visuelle dans Obsidian.

## Publier une release

Depuis la branche par défaut du dépôt, avec `gh` authentifié et `jq` installé :

```bash
bash release.sh
```

Le script vérifie la construction, incrémente automatiquement le patch de `manifest.json` (`0.0.1` → `0.0.2`), commite toutes les modifications présentes et pousse la branche, puis crée et pousse le tag correspondant sans préfixe `v`. Une collision de tag, un push refusé ou un manifeste distant différent interrompt la publication.

[GitHub Actions](.github/workflows/release.yml) reconstruit le thème depuis ce tag avec Sass 1.81.0, vérifie les sources et la correspondance du tag avec le manifeste, atteste les fichiers, puis publie la release avec `theme.css` et `manifest.json` en pièces jointes. Ces deux fichiers sont ceux qu’Obsidian installe. Le compilateur téléchargé est vérifié par SHA-256.

Pour tester le script sans commit, push ni publication réels :

```bash
python3 -B scripts/check_release.py
```
