# Notifications multicanal — Outbox eAdmin Guinée

## Objectif

Le moteur de notification est séparé du workflow administratif. Une décision métier (soumission, validation, rejet, document prêt, livraison) ne doit jamais être annulée parce qu'un fournisseur email/SMS/WhatsApp est indisponible.

Le lot fondation fournit :

- outbox PostgreSQL persistée ;
- clé d'idempotence SHA-256 ;
- états `pending`, `processing`, `retry`, `sent`, `dead_letter`, `blocked` ;
- nombre maximal de tentatives ;
- backoff exponentiel borné ;
- récupération des traitements restés verrouillés ;
- `FOR UPDATE SKIP LOCKED` pour plusieurs workers ;
- fournisseur SMTP pour le canal email ;
- passerelle HTTPS générique pour SMS et WhatsApp ;
- worker explicite, hors processus FastAPI.

## Principe transactionnel

Le code métier ne contacte jamais directement un fournisseur externe. Il écrit une intention de livraison dans `notification_outbox`. Un worker distinct la prend ensuite en charge.

Ce modèle offre une livraison **au moins une fois**. Les fournisseurs ou passerelles doivent exploiter la clé `Idempotency-Key` lorsqu'ils la supportent afin de réduire les doublons lors d'une panne survenant après l'acceptation fournisseur mais avant l'enregistrement de l'accusé dans eAdmin.

## Configuration email SMTP

Le fournisseur email n'est activé que si `EADMIN_SMTP_HOST` et `EADMIN_SMTP_FROM_EMAIL` sont définis.

Variables :

```text
EADMIN_SMTP_HOST=
EADMIN_SMTP_PORT=587
EADMIN_SMTP_FROM_EMAIL=
EADMIN_SMTP_USERNAME=
EADMIN_SMTP_PASSWORD=
EADMIN_SMTP_STARTTLS=true
EADMIN_SMTP_SSL=false
```

Les secrets doivent être injectés via le gestionnaire de secrets de l'environnement cible et ne doivent jamais être commités dans le dépôt.

## Configuration SMS / WhatsApp

Le cœur eAdmin ne dépend pas d'un SDK opérateur. Il peut appeler une passerelle institutionnelle ou fournisseur via HTTPS.

```text
EADMIN_SMS_WEBHOOK_URL=https://...
EADMIN_SMS_WEBHOOK_TOKEN=...

EADMIN_WHATSAPP_WEBHOOK_URL=https://...
EADMIN_WHATSAPP_WEBHOOK_TOKEN=...
```

La passerelle reçoit :

```json
{
  "channel": "sms | whatsapp",
  "recipient": "+224...",
  "event_type": "request.status.changed",
  "template_key": "request_ready",
  "payload": {},
  "idempotency_key": "..."
}
```

Headers :

```text
Idempotency-Key: <clé eAdmin>
Authorization: Bearer <token>   # si configuré
```

Un endpoint non HTTPS est refusé.

## Exécution du worker

Une exécution traite un lot puis s'arrête :

```bash
cd backend
python -m app.workers.notification_outbox
```

Taille du lot :

```text
EADMIN_NOTIFICATION_BATCH_SIZE=50
```

Le modèle est adapté à un Kubernetes CronJob, un scheduler d'exploitation ou un service périodique supervisé. Le web FastAPI ne lance pas silencieusement un thread de notification.

## États

- `pending` : en attente d'un worker ;
- `processing` : revendiqué par un worker ;
- `retry` : échec fournisseur, nouvelle tentative planifiée ;
- `sent` : fournisseur a accepté la livraison ;
- `dead_letter` : nombre maximal de tentatives atteint ;
- `blocked` : aucun fournisseur n'est configuré pour le canal.

`sent` signifie **accepté par le fournisseur**, pas nécessairement lu par le citoyen. Les accusés de livraison/lecture fournisseur constituent une évolution séparée.

## Étapes suivantes

1. brancher les événements de demandes administratives sur `enqueue_notification` ;
2. ajouter préférences/consentement citoyen par canal ;
3. ajouter webhooks d'accusé fournisseur avec vérification de signature ;
4. exposer une vue d'exploitation des `retry`, `blocked` et `dead_letter` ;
5. ajouter métriques Prometheus et alertes ;
6. valider les fournisseurs retenus et les contraintes contractuelles avec l'environnement institutionnel cible.
