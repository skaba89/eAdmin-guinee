# Exploitation du corrélateur SOC

Le miroir d'audit écrit les signaux dans la même transaction que l'audit de sécurité. La corrélation en incidents est volontairement exécutée hors requête métier afin qu'une règle de détection coûteuse ne ralentisse jamais un parcours citoyen ou agent.

## Commande

Depuis le répertoire `backend` :

```bash
python scripts/run_soc_correlator.py
```

La commande traite un lot borné de signaux non encore corrélés, marque leur `processed_at`, crée ou enrichit les incidents et committe la transaction.

`SOC_CORRELATOR_BATCH_SIZE` vaut 500 par défaut et doit rester entre 1 et 2000.

## Production

L'exploitation nationale doit exécuter cette commande via un worker ou CronJob supervisé. Cadence recommandée au démarrage : une exécution par minute. Plusieurs instances peuvent fonctionner en parallèle : PostgreSQL utilise `FOR UPDATE SKIP LOCKED` afin que deux workers ne traitent pas le même lot.

La supervision doit alerter sur :

- l'échec du processus ;
- l'âge du plus ancien signal avec `processed_at IS NULL` ;
- le volume de signaux non traités ;
- le nombre d'incidents critical/high non acquittés ;
- le temps entre `occurred_at` et création de l'incident.

Un backlog de corrélation ne doit jamais entraîner la suppression de signaux. Après reprise PostgreSQL/PRA, relancer le worker jusqu'à épuisement des lignes `processed_at IS NULL`.

## Déploiement

Le worker utilise exactement la même image backend et les mêmes secrets PostgreSQL que l'API, mais ne nécessite pas de port HTTP. Il ne doit pas recevoir de secrets SIEM supplémentaires tant qu'aucun connecteur SIEM officiel n'est choisi.
