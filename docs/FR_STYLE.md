# 🇫🇷 Convention de rédaction française

Les commentaires, la documentation et la prose du projet sont rédigés en **français**. Cette convention décrit les formes à utiliser.

---

## 🟢 Formes par défaut — **Standard FR**

Privilégier les **formes standards** du français. Quand c'est possible, préférer une **construction neutre** : aucun accord de genre artificiel n'est imposé.

### Exemples recommandés

| Préférez | Évitez | Note |
|----------|--------|------|
| « la configuration enrichie » | « le config enrichi » | Forme féminine grammaticalement correcte ; évite le mot technique isolé. |
| « issu de » | « issu·e de » | Forme standard universelle, sans ambiguïté. |
| « l'auteur du correctif » | « le dev » | Évite l'anglicisme casual dans la doc technique. |
| « la cascade UI » | « le cascade UI » | « Cascade » au sens « enchaînement » est grammaticalement féminin. |

> **Pourquoi standardiser ?** Réduire l'ambiguïté et faciliter la lecture pour les contributeurs non-francophones ou les outils de relecture automatisés.

---

## 🟡 Formes inclusives — **Au choix du contributeur**

Les contributeurs qui le souhaitent peuvent utiliser des **formes inclusives** (point médian `·` ou formes épicènes) pour marquer l'inclusion explicite. Le projet **accueille favorablement** cette pratique mais ne l'**impose pas**.

### Exemples de formes acceptées

| Inclusive | Standard équivalent |
|-----------|---------------------|
| auteur·rice | auteur |
| lecteur·rice | lecteur |
| développeur·euse | développeur |
| issu·e | issu |

> Ces formes sont optionnelles et n'affectent pas la lisibilité du code ou des commentaires.

---

## 📝 Règle de cohérence

**Choisissez une approche par paragraphe et tenez-vous-y.**

Mélanger formes standard et inclusives à l'intérieur d'un même paragraphe nuit à la lisibilité. À l'échelle d'un paragraphe ou d'un fichier, la cohérence est de mise.

✅ OK : paragraphe en standard, paragraphe suivant en inclusif.
❌ À éviter : « l'auteur·rice issuedu correctif standardise... »

---

## 🚫 Anti-patterns

- ❌ **Commentaires promotionnels.** « Ce module est MAGNIFIQUE et révolutionne tout ! » — pas de valeur ajoutée.
- ❌ **Forme marketing dans la doc technique.** « Profitez de cette fonctionnalité géniale ! » — utiliser un ton neutre et descriptif.
- ❌ **Identifiers en formes inclusives.** Les noms de variables, fonctions, classes restent en anglais technique. Cette convention concerne uniquement les commentaires et la documentation.
- ❌ **Doubler standard et inclusif côte à côte** dans la même phrase.
