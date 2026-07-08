# Blatt 10 – Teil 1: User Stories (Tasks-API Kanban Board)

## Rollen im System
- **Projektmitglied** – benutzt das Kanban Board täglich
- **Scrum Master / Team Lead** – überwacht Fortschritt und Metriken
- **Stakeholder** – möchte Überblick über den Projektstatus

---

## User Stories

### US-01 – Task erstellen
**Als** Projektmitglied  
**möchte ich** einen neuen Task mit Titel, Beschreibung und Priorität anlegen,  
**damit** ich neue Aufgaben schnell ins Backlog aufnehmen kann.

| INVEST | ✅ | Begründung |
|--------|----|------------|
| Independent | ✅ | Steht für sich allein |
| Negotiable | ✅ | Pflichtfelder könnten angepasst werden |
| Valuable | ✅ | Grundfunktion des Boards |
| Estimable | ✅ | Klar abschätzbar |
| Small | ✅ | Einzelner API-Call (POST /api/tasks) |
| Testable | ✅ | Task erscheint im Board nach Erstellen |

**Story Points:** 3  
**Akzeptanzkriterien:**
- Titel ist Pflichtfeld (mind. 3 Zeichen)
- Priorität wählbar: low / medium / high
- Task landet automatisch im Backlog

---

### US-02 – Task auf dem Board sehen
**Als** Projektmitglied  
**möchte ich** alle Tasks nach Status gruppiert auf dem Kanban Board sehen,  
**damit** ich den aktuellen Stand des Projekts auf einen Blick erkenne.

| INVEST | ✅ |
|--------|----|
| Independent | ✅ |
| Negotiable | ✅ |
| Valuable | ✅ |
| Estimable | ✅ |
| Small | ✅ |
| Testable | ✅ |

**Story Points:** 2  
**Akzeptanzkriterien:**
- Spalten: Backlog, To Do, In Progress, Review, Done
- Tasks zeigen Titel und Priorität
- Board lädt automatisch beim Öffnen

---

### US-03 – Task-Status wechseln
**Als** Projektmitglied  
**möchte ich** einen Task per Drag & Drop oder Klick in eine andere Spalte verschieben,  
**damit** ich den Fortschritt einer Aufgabe schnell aktualisieren kann.

| INVEST | ✅ |
|--------|----|
| Independent | ✅ |
| Negotiable | ✅ (auch Dropdown statt Drag & Drop möglich) |
| Valuable | ✅ |
| Estimable | ✅ |
| Small | ✅ |
| Testable | ✅ |

**Story Points:** 5  
**Akzeptanzkriterien:**
- Nur erlaubte Übergänge sind möglich (z.B. backlog → todo)
- Fehlermeldung bei ungültigem Übergang
- Board aktualisiert sich nach Statuswechsel

---

### US-04 – Task bearbeiten
**Als** Projektmitglied  
**möchte ich** Titel, Beschreibung und Priorität eines Tasks nachträglich ändern,  
**damit** ich Aufgaben aktuell halten kann.

**Story Points:** 3  
**Akzeptanzkriterien:**
- Bearbeitungsformular öffnet sich beim Klick auf einen Task
- Änderungen werden sofort gespeichert
- Validierung: Titel mind. 3 Zeichen

---

### US-05 – Task löschen
**Als** Projektmitglied  
**möchte ich** einen Task löschen,  
**damit** ich abgebrochene oder falsch angelegte Aufgaben entfernen kann.

**Story Points:** 2  
**Akzeptanzkriterien:**
- Bestätigungsdialog vor dem Löschen
- Task verschwindet sofort aus dem Board

---

### US-06 – Metriken einsehen
**Als** Scrum Master  
**möchte ich** Metriken wie Cycle Time, Lead Time und Throughput sehen,  
**damit** ich die Effizienz des Teams bewerten kann.

**Story Points:** 5  
**Akzeptanzkriterien:**
- Metriken werden im Frontend angezeigt (z.B. als Karten)
- Werte werden automatisch berechnet
- Anzeige: durchschnittliche Cycle Time in Stunden, Throughput als Zahl

---

### US-07 – WIP-Limit überwachen
**Als** Scrum Master  
**möchte ich** sehen wie viele Tasks gleichzeitig in Bearbeitung sind,  
**damit** ich Engpässe im Workflow erkennen kann.

**Story Points:** 2  
**Akzeptanzkriterien:**
- Anzahl der Tasks in "In Progress" ist sichtbar
- Bei mehr als 3 Tasks in "In Progress" → visuelle Warnung

---

### US-08 – API-Dokumentation lesen
**Als** Stakeholder  
**möchte ich** auf eine einfache Übersichtsseite zugreifen,  
**damit** ich sehe dass das System läuft und welche Version bereitgestellt ist.

**Story Points:** 1  
**Akzeptanzkriterien:**
- GET / gibt Name und Version zurück
- GET /health gibt Status "ok" zurück

---

### US-09 – Docker-Deployment
**Als** Team Lead  
**möchte ich** die App mit einem einzigen Befehl starten können,  
**damit** alle Teammitglieder dieselbe Umgebung nutzen ohne Node.js zu installieren.

**Story Points:** 8  
**Akzeptanzkriterien:**
- `docker-compose up --build` startet API und Board
- App erreichbar unter http://localhost:3000
- Daten bleiben nach Neustart erhalten (Volume-Mount)

---

### US-10 – CI/CD Pipeline
**Als** Team Lead  
**möchte ich** dass bei jedem Git-Push automatisch Lint und Tests laufen,  
**damit** Fehler früh erkannt werden bevor sie in main landen.

**Story Points:** 5  
**Akzeptanzkriterien:**
- GitHub Actions führt Lint → Test → Docker Build aus
- Pipeline ist grün wenn alle Schritte erfolgreich sind
- Fehler werden in GitHub angezeigt

---

## Story Point Übersicht

| ID | User Story | Story Points |
|----|-----------|-------------|
| US-01 | Task erstellen | 3 |
| US-02 | Task auf dem Board sehen | 2 |
| US-03 | Task-Status wechseln | 5 |
| US-04 | Task bearbeiten | 3 |
| US-05 | Task löschen | 2 |
| US-06 | Metriken einsehen | 5 |
| US-07 | WIP-Limit überwachen | 2 |
| US-08 | API-Dokumentation lesen | 1 |
| US-09 | Docker-Deployment | 8 |
| US-10 | CI/CD Pipeline | 5 |
| **Gesamt** | | **36** |
