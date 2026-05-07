# Rapport — EC08-BDD : Plateforme de location d'hébergement

**Auteurs** : [Nom 1] · [Nom 2] · [Nom 3] · [Nom 4]
**Date** : 2026
**SGBDR** : MySQL 8

---

## Table des matières

1. [Contexte et problématique](#1-contexte-et-problématique)
2. [Modèle Conceptuel de Données (MCD)](#2-modèle-conceptuel-de-données-mcd)
3. [Modèle Logique / Schéma relationnel (MLD)](#3-modèle-logique--schéma-relationnel-mld)
4. [Choix de conception majeurs](#4-choix-de-conception-majeurs)
5. [Couverture des exigences du sujet](#5-couverture-des-exigences-du-sujet)
6. [Triggers et contraintes métier](#6-triggers-et-contraintes-métier)
7. [Vues et requêtes complexes](#7-vues-et-requêtes-complexes)
8. [Difficultés rencontrées et limites](#8-difficultés-rencontrées-et-limites)
9. [Répartition des tâches](#9-répartition-des-tâches)

> **Convention de marquage du code** — chaque bloc SQL des fichiers
> `01_schema.sql` à `05_data.sql` est précédé d'une annotation entre
> crochets indiquant la (ou les) section(s) du sujet PDF couverte(s) :
> `[§ 3]`, `[§ 4a]`, `[§ 4b]`, `[§ 4c]`, `[§ 4d]`, `[§ 4e]`, `[§ 4f]`.
> Cette convention permet de naviguer rapidement entre l'exigence
> énoncée dans le sujet et son implémentation dans le code.

---

## 1. Contexte et problématique

Le projet consiste à concevoir et implémenter la base de données d'une **plateforme P2P de location d'hébergement** comparable à Airbnb. La plateforme connecte des **hôtes** (qui mettent leur logement en location) à des **invités** (qui réservent un séjour). Un seul compte peut endosser les deux rôles.

Au-delà du couple « annonce ↔ réservation », le système doit gérer :

- la **disponibilité dans le temps** (périodes ouvertes / bloquées par l'hôte) ;
- des **règles tarifaires variables** (saisonnalité, événements, promotions) ;
- des **frais additionnels** (ménage, service, taxes, animaux) ;
- des **paiements multi-étapes** (acompte, solde, remboursement) ;
- des **politiques d'annulation** différentes selon l'hébergement, avec calcul du remboursement dû ;
- des **avis** rattachés aux séjours effectivement réalisés ;
- une **messagerie** entre utilisateurs.

Le projet doit couvrir tout le cycle de conception : **analyse des besoins → MCD → modèle relationnel normalisé (3NF) → contraintes d'intégrité → requêtes complexes → justification des choix techniques**.

---

## 2. Modèle Conceptuel de Données (MCD)

### 2.1 Entités identifiées

| Entité | Description | Décision |
|---|---|---|
| `USER` | Compte unique invité ET/OU hôte | Drapeau `is_host` plutôt que deux entités distinctes |
| `CANCELLATION_POLICY` | Politique d'annulation réutilisable | Table de référence (4 politiques) plutôt qu'un texte libre |
| `ACCOMMODATION` | Logement mis en location | FK vers `USER` (hôte) et `CANCELLATION_POLICY` |
| `AMENITY` | Équipement (Wi-Fi, piscine…) | Table de référence + table de jonction |
| `ACCOMMODATION_FEE` | Frais ménage / service / taxe | Séparée de `ACCOMMODATION` (1:N) |
| `AVAILABILITY` | Périodes ouvertes ou bloquées | Entité distincte de `BOOKING` |
| `PRICING_RULE` | Ajustement de prix sur une fenêtre | Permet hausse/baisse, fixe/pourcentage |
| `BOOKING` | Réservation à un moment donné | Statut : pending → confirmed → completed (ou cancelled) |
| `REVIEW` | Note + commentaire d'un séjour | 1:1 avec `BOOKING`, données reviewer dérivées |
| `PAYMENT` | Transaction financière | 1:N avec `BOOKING` (acompte + solde + refund) |
| `MESSAGE` | Message utilisateur ↔ utilisateur | Optionnellement rattaché à un `ACCOMMODATION` |

### 2.2 Cardinalités principales

```
USER  1 ──── 0..N  ACCOMMODATION              (un hôte → plusieurs logements)
USER  1 ──── 0..N  BOOKING                    (un invité → plusieurs séjours)
ACCOMMODATION  1 ──── 0..N  BOOKING
ACCOMMODATION  1 ──── 0..N  AVAILABILITY      (périodes bloquées/ouvertes)
ACCOMMODATION  1 ──── 0..N  PRICING_RULE
ACCOMMODATION  1 ──── 0..N  ACCOMMODATION_FEE
ACCOMMODATION  N ──── 1     CANCELLATION_POLICY
BOOKING  1 ──── 0..1  REVIEW                  (avis facultatif)
BOOKING  1 ──── 0..N  PAYMENT
```

Le diagramme complet est fourni dans [`mcd.mmd`](mcd.mmd) (Mermaid).

---

## 3. Modèle Logique / Schéma relationnel (MLD)

11 relations en 3NF, déclarées dans [`01_schema.sql`](01_schema.sql) :

```
users                  (id, email, password_hash, first_name, last_name,
                        phone, profile_picture, is_host, is_active,
                        created_at, updated_at)

cancellation_policies  (id, name, description, full_refund_days_before,
                        partial_refund_days_before, partial_refund_percentage,
                        created_at)

accommodations         (id, host_id*, cancellation_policy_id*, title,
                        description, type, address, city, country,
                        latitude, longitude, max_guests, bedrooms, beds,
                        bathrooms, price_per_night, minimum_nights,
                        maximum_nights, instant_book, house_rules,
                        is_active, is_validated, has_alarm_system,
                        has_smoke_detector, created_at, updated_at)

amenities              (id, name, category, icon)
accommodation_amenities(accommodation_id*, amenity_id*)
accommodation_fees     (id, accommodation_id*, fee_type, amount, is_percentage)
availability           (id, accommodation_id*, start_date, end_date,
                        is_available, reason, created_at, updated_at)
pricing_rules          (id, accommodation_id*, name, description,
                        start_date, end_date, rule_type, value, is_active,
                        created_at, updated_at)

bookings               (id, accommodation_id*, guest_id*, check_in_date,
                        check_out_date, num_guests, total_price, status,
                        special_requests, cancelled_at, created_at,
                        updated_at)

reviews                (id, booking_id*, rating, comment,
                        cleanliness_rating, accuracy_rating, checkin_rating,
                        communication_rating, location_rating, value_rating,
                        created_at)

messages               (id, sender_id*, receiver_id*, accommodation_id*,
                        content, is_read, created_at)

payments               (id, booking_id*, amount, payment_type,
                        payment_method, status, transaction_id, paid_at,
                        created_at)
```

*\* : clé étrangère*

---

## 4. Choix de conception majeurs

### 4.1 Reviews en 3NF — pas de `reviewer_id` ni de `accommodation_id`

La table `reviews` ne contient que `booking_id` (UNIQUE) en plus du contenu de l'avis. Le reviewer s'obtient via `bookings.guest_id` et l'hébergement via `bookings.accommodation_id` après un `JOIN`.

**Pourquoi ?** Stocker `reviewer_id` ou `accommodation_id` directement créerait une **dépendance transitive** (par rapport à `booking_id`). On pourrait avoir un avis dont le `reviewer_id` ne correspond pas au `guest_id` de la réservation associée — incohérence impossible avec le design actuel.

### 4.2 `cancellation_policies` en table de référence

La plateforme propose **4 politiques** (`flexible`, `moderate`, `strict`, `no_refund`). Chaque hébergement choisit la sienne (`accommodations.cancellation_policy_id`).

**Pourquoi pas un champ texte libre ?** Le calcul du remboursement dû en cas d'annulation (cf. Q9) nécessite des valeurs structurées : `full_refund_days_before`, `partial_refund_days_before`, `partial_refund_percentage`. Les centraliser dans une table garantit que la même politique appliquée à 1 000 hébergements n'est stockée qu'une fois.

### 4.3 `availability` séparée de `bookings`

Une période où l'hôte se réserve son logement n'est **pas** une réservation. Mélanger les deux dans `bookings` aurait obligé à inventer un `guest_id` fictif et un statut artificiel. La table `availability` représente proprement les périodes bloquées par l'hôte (renovation, usage personnel, etc.) et déclenche le rejet des `bookings` qui les chevauchent (trigger `trg_booking_validate_before_insert`).

### 4.4 Index composite pour la recherche [§ 4c]

```sql
INDEX idx_accommodations_search (type, city, is_validated, is_active)
```

L'ordre des colonnes est choisi pour la **sélectivité décroissante** : `type` (8 valeurs possibles) en tête car c'est le filtre principal du formulaire, puis `city`, puis les flags booléens. MySQL peut ainsi remonter la branche du B-tree avec un seul lookup pour la majorité des recherches du frontend.

### 4.5 Double barrière validation/sécurité [§ 4d + § 4e]

Trois mécanismes redondants protègent contre une réservation sur un hébergement non-conforme :

1. **Colonnes** : `is_validated`, `has_alarm_system`, `has_smoke_detector`.
2. **CHECK ligne** : `chk_acc_validation_requires_alarm` interdit `is_validated=TRUE` sans `has_alarm_system=TRUE`.
3. **Triggers** : `trg_booking_validate_before_insert` rejette toute réservation sur un hébergement non validé OU sans alarme.

La redondance est volontaire — chaque mécanisme produit un message d'erreur plus précis que le précédent.

### 4.6 `cancelled_at` auto-stamp via trigger

`bookings.cancelled_at` est rempli automatiquement lorsque le statut bascule à `cancelled` (cf. `trg_booking_validate_before_update`). Sans cela, la requête Q9 (calcul du remboursement) n'aurait pas la date d'annulation pour calculer le délai par rapport au check-in.

---

## 5. Couverture des exigences du sujet

Cette section répond point par point aux exigences listées dans le PDF (sections 3 et 4).

### § 3 — Périmètre fonctionnel

| Exigence du PDF | Implémentation |
|---|---|
| Compte utilisateur invité ET/OU hôte | `users.is_host` |
| Description détaillée de l'hébergement | Table `accommodations` (15+ colonnes descriptives) + `amenities` |
| Distinction caractéristiques propres / hôte | `accommodations` ne contient que des données du logement ; l'hôte est une FK vers `users` |
| Disponibilités garanties | Table `availability` + trigger `trg_booking_validate_before_insert` |
| Statuts de réservation | ENUM `pending` / `confirmed` / `cancelled` / `completed` |
| Tarif de base par nuit + ajustements | `accommodations.price_per_night` + table `pricing_rules` |
| Frais additionnels | Table `accommodation_fees` (cleaning / service / tax / pet / other) |
| Reconstruction du coût total | Q2 (CTE récursif nuit-par-nuit) |
| Paiements multi-étapes | Table `payments` avec `payment_type` (deposit / balance / full / refund / penalty) |
| Politiques d'annulation | Table `cancellation_policies` + Q9 (calcul du remboursement) |
| Avis liés aux séjours réalisés | `reviews.booking_id UNIQUE` + trigger `trg_review_status_before_insert` (status='completed' obligatoire) |
| Messagerie | Table `messages` + CHECK `chk_message_distinct` |

### § 4a — Contraintes métier

Les contraintes implicites et explicites sont implémentées par les mécanismes adaptés :

| Catégorie | Exemple | Mécanisme |
|---|---|---|
| Intégrité référentielle | `bookings.guest_id` ⇒ `users.id` | FK + ON DELETE CASCADE |
| Domaine de valeurs | `rating BETWEEN 1 AND 5` | CHECK |
| Format | `email LIKE '%_@_%._%'` | CHECK |
| Cohérence inter-colonnes | `is_validated ⇒ has_alarm_system` | CHECK |
| Unicité | 1 review max par booking | UNIQUE sur `reviews.booking_id` |
| Règles multi-tables | Pas d'overlap, pas d'avis sans booking complet | TRIGGER |

**Total** : 11 PK · 14 FK · 18 CHECK · 4 TRIGGER.

### § 4b — Dashboard pire note par hébergement

La vue [`v_dashboard_lowest_ratings`](03_views.sql) renvoie une ligne par hébergement contenant : la note minimale, le commentaire correspondant, le profil du reviewer, le total de réservations effectuées par ce reviewer.

```sql
-- Réutilisation simplissime depuis la requête métier (Q10) :
SELECT * FROM v_dashboard_lowest_ratings;
```

L'égalité sur la note minimale est tranchée par la date du commentaire la plus récente, garantissant **une seule ligne par hébergement**.

### § 4c — Performance de la recherche par type

**Solution** : index composite `idx_accommodations_search (type, city, is_validated, is_active)`.

**Justification** : un B-tree composite couvre l'intégralité du `WHERE` typique du formulaire de recherche (Q1 et Q5). MySQL peut alors **éviter le scan** de la table et lire directement la branche pertinente du B-tree. À mesure que la table grossit, le coût d'une recherche reste **logarithmique** au lieu de linéaire.

L'ordre des colonnes maximise la sélectivité décroissante : `type` (faible cardinalité, sépare le plus rapidement les branches) > `city` > flags booléens.

### § 4d — Sécurité (système d'alarme obligatoire)

Trois barrières (cf. § 4.5 ci-dessus) :

1. Colonne `has_alarm_system BOOLEAN NOT NULL DEFAULT FALSE`.
2. CHECK `is_validated = FALSE OR has_alarm_system = TRUE`.
3. TRIGGER `trg_booking_validate_before_insert` rejetant toute réservation sur un hébergement sans alarme.

**Démonstration** : la tentative #2 dans la section "INVALID ATTEMPTS" de [`05_data.sql`](05_data.sql) tente de réserver l'hébergement 13 (sans alarme) ; la base la refuse avec le message *"Accommodation does not meet mandatory security requirements (alarm system missing)"*.

### § 4e — Jeu de données contrasté

[`05_data.sql`](05_data.sql) contient :

| Cas requis par le sujet | Couverture dans le dataset |
|---|---|
| Hébergements validés / non-validés | IDs 1-11 validés ; ID 12 non-validé |
| Hébergements conformes / non-conformes | IDs 1-12 alarmés ; ID 13 sans alarme |
| Bookings confirmed / canceled / completed | 17 completed, 5 confirmed, 2 pending, 3 cancelled |
| Tentative invalide rejetée | 10 tentatives commentées en fin de fichier |
| Avis très négatifs vs très positifs | Notes 1, 2 (rejets) et 5 (excellents) présentes |
| Users à fort vs faible volume | User 6 → 3 séjours ; users 13–14 → 1 séjour |
| Hébergement jamais réservé | ID 11 (« New Listing — Boulder Loft ») |

### § 4f — Liste marketing avec note moyenne

La vue [`v_accommodations_with_avg_rating`](03_views.sql) inclut **tous** les hébergements grâce au `LEFT JOIN` sur `bookings` puis `reviews`. Pour les propriétés jamais notées, la colonne `avg_rating_display` affiche `'No reviews'` plutôt qu'un `NULL` brut :

```sql
COALESCE(CAST(ROUND(AVG(r.rating), 2) AS CHAR), 'No reviews') AS avg_rating_display
```

L'ID 11 (jamais réservé) apparaît bien dans le résultat avec `'No reviews'`.

---

## 6. Triggers et contraintes métier

| Trigger | Évènement | Rôle |
|---|---|---|
| `trg_booking_validate_before_insert` | INSERT bookings | Capacité, validation, alarme, listing actif, durée min/max, période bloquée, overlap |
| `trg_booking_validate_before_update` | UPDATE bookings | Re-vérifie les invariants si la booking redevient active ; auto-stamp `cancelled_at` |
| `trg_review_status_before_insert` | INSERT reviews | Avis autorisé uniquement sur booking `completed` ET dont le check-out est passé |
| `trg_accommodation_validation_consistency` | UPDATE accommodations | Refuse `is_validated=TRUE` sans alarme (en plus du CHECK) |

CHECK constraints notables : `chk_booking_dates`, `chk_review_rating`, `chk_payment_amount`, `chk_message_distinct`, `chk_pricing_pct_decrease_range`, `chk_acc_validation_requires_alarm`.

---

## 7. Vues et requêtes complexes

### Vues ([`03_views.sql`](03_views.sql))

| Vue | Couvre | Réutilisée par |
|---|---|---|
| `v_accommodations_with_avg_rating` | § 4f | Liste marketing |
| `v_dashboard_lowest_ratings` | § 4b | Q10 / dashboard |
| `v_booking_details_complete` | § 3 | Reporting |
| `v_host_earnings_summary` | § 3 | Q4 / dashboard hôte |
| `v_cancellation_analysis` | § 3 | Analyse business |

### 10 requêtes complexes ([`04_queries.sql`](04_queries.sql))

| ID | Section couverte | Particularité |
|---|---|---|
| Q1 | § 4c, § 3 | Filtre type + capacité + disponibilité (NOT EXISTS double : availability + bookings) |
| Q2 | § 3 | **CTE récursif** nuit-par-nuit + application des `pricing_rules` + ajout des fees |
| Q3 | § 3 | Historique de réservations avec agrégation des paiements |
| Q4 | § 3 | Synthèse hôte (vue) |
| Q5 | § 4c | Recherche par amenities multiples (HAVING COUNT) |
| Q6 | § 3 | Revenus mensuels via CTE récursif (12 mois) |
| Q7 | § 4a | Audit d'intégrité — détecte tout overlap résiduel |
| Q8 | § 3 | Fidélité invité (tiers Bronze/Silver/Gold) |
| Q9 | § 3 | Calcul du remboursement par politique vs paiements réels |
| Q10 | § 4b | Consume la vue dashboard |

### Focus : Q2 (CTE récursif)

La reconstruction du coût d'un séjour applique les `pricing_rules` nuit-par-nuit :

```sql
WITH RECURSIVE nights(d, accommodation_id, max_d) AS (
    SELECT b.check_in_date, b.accommodation_id,
           DATE_SUB(b.check_out_date, INTERVAL 1 DAY)
    FROM bookings b WHERE b.id = @booking_id
    UNION ALL
    SELECT DATE_ADD(d, INTERVAL 1 DAY), accommodation_id, max_d
    FROM nights WHERE d < max_d
),
night_prices AS (
    SELECT n.d, CASE pr.rule_type
        WHEN 'percentage_increase' THEN a.price_per_night * (1 + pr.value/100)
        WHEN 'percentage_decrease' THEN a.price_per_night * (1 - pr.value/100)
        WHEN 'fixed_increase'      THEN a.price_per_night + pr.value
        WHEN 'fixed_decrease'      THEN GREATEST(a.price_per_night - pr.value, 0)
        ELSE a.price_per_night
    END AS effective_price
    FROM nights n
    JOIN accommodations a ON a.id = n.accommodation_id
    LEFT JOIN pricing_rules pr
           ON pr.accommodation_id = n.accommodation_id
          AND pr.is_active = TRUE
          AND n.d BETWEEN pr.start_date AND pr.end_date
)
SELECT SUM(effective_price) FROM night_prices;
```

Sans CTE récursif, on aurait dû maintenir une table de calendrier pré-remplie ou émettre une requête par nuit côté application. Solution élégante mais nécessite **MySQL 8+**.

### Focus : Q9 (calcul du remboursement)

```sql
SELECT b.id, cp.name AS policy_name, b.total_price, b.cancelled_at,
    DATEDIFF(b.check_in_date, DATE(b.cancelled_at)) AS days_before_checkin,
    CASE
        WHEN DATEDIFF(b.check_in_date, DATE(b.cancelled_at)) >= cp.full_refund_days_before
            THEN ROUND(b.total_price, 2)
        WHEN DATEDIFF(b.check_in_date, DATE(b.cancelled_at)) >= cp.partial_refund_days_before
            THEN ROUND(b.total_price * cp.partial_refund_percentage / 100, 2)
        ELSE 0
    END AS refund_due,
    COALESCE((SELECT SUM(p.amount) FROM payments p
              WHERE p.booking_id = b.id AND p.status='refunded'), 0) AS refund_paid
FROM bookings b
JOIN accommodations a         ON a.id = b.accommodation_id
JOIN cancellation_policies cp ON cp.id = a.cancellation_policy_id
WHERE b.status = 'cancelled';
```

La requête fait apparaître les divergences entre `refund_due` (théorique) et `refund_paid` (réel) — utile pour l'audit comptable.

---

## 8. Difficultés rencontrées et limites

### Difficultés résolues

| Difficulté | Solution retenue |
|---|---|
| Incohérence possible entre `is_validated` et `has_alarm_system` | CHECK + trigger redondants pour message d'erreur explicite |
| Calcul du coût d'un séjour multi-tarifs | CTE récursif (`WITH RECURSIVE`) — MySQL 8 minimum |
| Empêcher les chevauchements de réservations sans race condition | Trigger `BEFORE INSERT` qui re-vérifie au moment de l'écriture |
| Conserver la date d'annulation pour le calcul du remboursement | Trigger qui auto-stamp `cancelled_at` lors du changement de statut |
| Distinguer en 3NF un avis de son auteur et de l'hébergement | Stocker uniquement `booking_id` ; le reste se déduit par JOIN |
| Recherche par type performante à grande échelle | Index composite `(type, city, is_validated, is_active)` |
| Cas « hébergement jamais réservé » dans la liste marketing | LEFT JOIN + `COALESCE(... , 'No reviews')` |
| Frontend en camelCase vs MySQL en snake_case | Transformation systématique au niveau des controllers Express |

### Limites assumées

- **Pas de versionnement des politiques d'annulation** : si la plateforme modifie une politique, les anciennes réservations héritent de la nouvelle. Une amélioration future serait de stocker `cancellation_policy_id` aussi sur `bookings` et de figer la politique au moment de la réservation.
- **Pas de cron** pour basculer automatiquement `confirmed → completed` une fois le check-out passé. Aujourd'hui, c'est l'hôte qui doit déclencher la transition manuellement.
- **Pas de table `images`** pour les photos d'hébergement — l'UI utilise un placeholder.
- **Pas d'historique des changements de statut** sur `bookings` (uniquement `created_at`, `updated_at`, `cancelled_at`). Une table `booking_status_history` aurait été un plus pour l'audit complet.
- **Trigger lourd à l'insertion** d'une booking : 6 lookups distincts. Acceptable pour un projet pédagogique, à optimiser via une procédure stockée si la charge augmente.
- **Pas de gestion multi-devises** ni multi-langue.

---

## 9. Répartition des tâches

> **À compléter par l'équipe avant rendu.**

| Membre | Périmètre principal |
|---|---|
| [Nom 1] | Modélisation conceptuelle (MCD), schéma relationnel `01_schema.sql`, contraintes CHECK |
| [Nom 2] | Triggers `02_constraints_triggers.sql`, vues `03_views.sql`, jeu de données `05_data.sql` |
| [Nom 3] | Requêtes complexes `04_queries.sql` (notamment Q2, Q6, Q9), optimisation et indexation |
| [Nom 4] | Backend (Express/TypeScript), frontend (React/Tailwind), intégration API ↔ SQL |

Travail commun : audit final, documentation (README + ce rapport), préparation de la soutenance.
