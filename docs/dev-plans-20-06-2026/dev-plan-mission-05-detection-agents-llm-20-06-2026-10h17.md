# Plan de développement — Mission 05 : Détection réelle des agents LLM

**Date :** 20/06/2026 — 10h17  
**Projet :** Minautor Prompts Service  
**Mission :** 05/07 — Détection réelle des agents LLM  
**Effort estimé :** Moyen  
**Dépendances :** Aucune (indépendante des missions 01-04)

---

## Objectif

Remplacer le tableau statique `['ollama', 'lm-studio', 'codestral', 'generic']` en dur dans le composant `AnalyticsDashboard` par une vraie détection des LLM disponibles sur la machine. Actuellement, la carte "Agents" affiche "4 agents supportés" même si aucun LLM n'est installé ou en cours d'exécution.

---

## Tâches détaillées

### 5.1 — Créer un endpoint API de détection

**Description :** Créer une API serveur qui détecte les LLM disponibles sur la machine en vérifiant les ports et processus.

**Sous-tâches :**
- [ ] Créer `server/api/agents/detect.get.ts`
- [ ] Vérifier Ollama : requête HTTP GET vers `http://localhost:11434/api/tags` (port par défaut)
- [ ] Vérifier LM Studio : requête HTTP GET vers `http://localhost:1234/v1/models` (port par défaut)
- [ ] Vérifier un endpoint générique configurable (ex: `http://localhost:{port}/health`)
- [ ] Retourner la liste des agents détectés avec leur statut (online/offline, modèles disponibles)
- [ ] Gérer les timeouts (max 2s par requête) pour ne pas bloquer la réponse
- [ ] Gérer les erreurs réseau silencieusement (agent = non détecté)

**Fichiers impactés :**
- `server/api/agents/detect.get.ts` (nouveau)

---

### 5.2 — Créer un service AgentDetector côté client

**Description :** Créer un service (composable ou util) qui appelle l'API de détection et expose les résultats de manière réactive.

**Sous-tâches :**
- [ ] Créer `composables/useAgentDetection.ts`
- [ ] Définir l'interface `AgentStatus` : `{ name: string, displayName: string, available: boolean, models: string[], port: number, error?: string }`
- [ ] Créer une méthode `detectAgents()` qui appelle `/api/agents/detect`
- [ ] Exposer `agents: Ref<AgentStatus[]>` et `isDetecting: Ref<boolean>`
- [ ] Ajouter un cache court (30s) pour ne pas surcharger l'API

**Fichiers impactés :**
- `composables/useAgentDetection.ts` (nouveau)

---

### 5.3 — Mettre à jour AnalyticsDashboard

**Description :** Remplacer le tableau `agents` en dur par les données réelles du composable `useAgentDetection`.

**Sous-tâches :**
- [ ] Importer et utiliser `useAgentDetection()` dans `components/AnalyticsDashboard.vue`
- [ ] Remplacer `const agents = ['ollama', 'lm-studio', 'codestral', 'generic']` par les résultats réels
- [ ] Afficher le statut de chaque agent (en ligne / hors ligne) avec un indicateur visuel (vert/rouge)
- [ ] Afficher la liste des modèles disponibles pour chaque agent
- [ ] Ajouter un bouton "Rafraîchir" pour relancer la détection
- [ ] Afficher "Détection en cours..." pendant le chargement
- [ ] Si aucun agent détecté : afficher un message "Aucun agent LLM détecté" avec des instructions

**Fichiers impactés :**
- `components/AnalyticsDashboard.vue`

---

### 5.4 — Ajouter la détection par processus (amélioration)

**Description :** En complément de la détection par port, scanner les processus en cours pour détecter les LLM qui n'écoutent pas encore sur un port.

**Sous-tâches :**
- [ ] Sur Windows : `tasklist /FI "IMAGENAME eq ollama.exe"` etc.
- [ ] Sur Linux/Mac : `pgrep ollama` etc.
- [ ] Ajouter cette détection dans l'endpoint API
- [ ] Retourner des agents "process running but not responding" vs "fully available"

**Fichiers impactés :**
- `server/api/agents/detect.get.ts`

---

### 5.5 — Option : Ajouter un agent "generic" configurable

**Description :** Permettre à l'utilisateur d'ajouter manuellement un endpoint LLM personnalisé (URL + port) dans les paramètres.

**Sous-tâches :**
- [ ] Ajouter un champ de saisie "URL personnalisée" dans le dashboard
- [ ] Sauvegarder l'URL dans localStorage
- [ ] Vérifier la disponibilité via l'API
- [ ] Afficher l'agent personnalisé dans la liste

**Fichiers impactés :**
- `components/AnalyticsDashboard.vue`
- `composables/useAgentDetection.ts`

---

## Critères d'acceptation

- [ ] Ollama en cours d'exécution → affiché comme disponible avec ses modèles
- [ ] LM Studio en cours d'exécution → affiché comme disponible
- [ ] Aucun LLM lancé → message "Aucun agent LLM détecté"
- [ ] Le nombre d'agents n'est plus un chiffre en dur
- [ ] Le bouton "Rafraîchir" met à jour la détection
- [ ] Les tests existants passent toujours

---

## Notes d'implémentation

- Ollama expose son API REST sur `localhost:11434`. L'endpoint `/api/tags` retourne la liste des modèles téléchargés.
- LM Studio expose une API compatible OpenAI sur `localhost:1234/v1`.
- Attention aux timeouts : utiliser `AbortController` avec un timeout de 2s par requête.
- Sur Windows, le check par processus est plus fiable que le port (certains LLM n'écoutent pas tant qu'ils n'ont pas reçu de requête).
- Ne pas bloquer le rendu du dashboard : la détection doit être asynchrone avec un état de chargement.
- Structure de retour de l'API : `{ detected: AgentInfo[], timestamp: string }`.
