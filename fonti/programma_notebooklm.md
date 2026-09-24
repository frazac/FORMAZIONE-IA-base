# Programma del Corso: AI Base — Dalla Teoria alla Pratica in Azienda

> **Sintesi (Claude):** programma dettagliato generato con NotebookLM, coerente con `calendarioAi.pdf` (stessi 4 moduli, stessa sequenza). G1 teoria (storia, LLM, token, embeddings, Held & Hein, Turco Meccanico, allucinazioni, *mistakes mining*); G2 laboratorio testi/immagini (prompting, CoT, context rot, AI multimodali); G3 ufficio (ecosystem map, agenti/harness, RLVR, Google Sheets + AI, guardrail); G4 governance (GDPR, anonimizzazione, cybersecurity agenti, sycophancy e bias, copyright, **Cornice di Simmel**, checklist). ⚠️ Le "slide consigliate" (5–12/giorno) contraddicono il vincolo di CLAUDE.md (100–200/giorno).

**Sede:** Scuola Futuro Lavoro, Milano  
**Articolazione:** 16 ore complessive (4 lezioni da 4 ore ciascuna)  
**Destinatari:** Professionisti, dipendenti aziendali, studenti e lavoratori che desiderano acquisire competenze pratiche e teoriche sull'Intelligenza Artificiale Generativa.

---

## 📌 Panoramica e Tabella Sinottica

| Giornata | Modulo | Durata | Slide Consigliate | Focus Principale |
| :--- | :--- | :---: | :---: | :--- |
| **Giorno 1** | Introduzione all'AI Generativa | 4 ore | **8–10 slide** | Evoluzione storica, funzionamento degli LLM, probabilismo e allucinazioni |
| **Giorno 2** | Creare Testi e Immagini con l'AI | 4 ore | **5–7 slide** | Laboratorio intensivo, prompting, AI secondarie (video/audio) e tutorial |
| **Giorno 3** | Applicazioni dell'AI nel Lavoro d'Ufficio | 4 ore | **8–10 slide** | Ecosystem map, agenti, tutorial Google Sheets con AI, guardrail |
| **Giorno 4** | Norme, Privacy, Sicurezza e Governance | 4 ore | **10–12 slide** | GDPR, anonimizzazione per AI frontier, la Cornice di Simmel e controllo |

---

## 📅 Dettaglio del Programma per Giornata

### **GIORNO 1: Introduzione all'AI Generativa**
* **Durata:** 4 ore
* **Obiettivo:** Inquadrare la transizione storica dai sistemi esperti al *machine learning* e comprendere il funzionamento interno probabilistico dei modelli linguistici di frontiera.
* **Volume Slide:** **8–10 slide** (sessione d'inquadramento teorico e decontrazione dei miti).

#### **Argomenti Dettagliati:**
1. **Introduzione ed Evoluzione Storica dell'AI**
   * Dalla Conferenza di Dartmouth (1956) ai sistemi esperti basati su regole rigide (*if-then-else*).
2. **Dal Machine Learning ai Large Language Models (LLM)**
   * Il passaggio all'estrazione automatica di *pattern* tramite reti neurali.
   * La perdita di trasparenza diretta (opacità della *black box*) e la rappresentazione dello spazio vettoriale (*embeddings*).
3. **Come Funziona la Generazione del Testo**
   * La predizione statistica del token successivo data una sequenza in input.
   * La natura del contesto e il calcolo della verosimiglianza sintattica.
4. **Apprendimento ed Esperienza nell'Umano e nella Macchina**
   * L'esperimento di Held e Hein (1963) sui gattini: apprendimento esperienziale e relazionale contrapposto all'addestramento statistico su dataset massivi.
5. **Narrow AI vs AGI e il Turco Meccanico**
   * La differenza tra IA deboli/verticali (es. Deep Blue) e modelli generativi attuali.
   * L'apparente comprensione dell'AI come illusione statistica simile all'automa del XVIII secolo.
6. **Allucinazioni e Natura degli Errori nei Modelli Generativi**
   * Perché l'allucinazione non è un bug accidentale, ma la natura stessa del motore probabilistico (il modello genera ciò che è *verosimile*, non ciò che è *vero*).
   * Come la scelta di un singolo token errato forza la sequenza verso completamenti incoerenti.
   * Introduzione al *mistakes mining* (l'esplorazione sistematica dell'errore come strumento di indagine).

---

### **GIORNO 2: Creare Testi e Immagini con l'AI**
* **Durata:** 4 ore
* **Obiettivo:** Laboratorio pratico incentrato su *prompting*, integrazione di strumenti multimediali e combinazione di diverse AI.
* **Volume Slide:** **5–7 slide** (set essenziale e snello per lasciare ampio spazio alle esercitazioni guidate).

#### **Argomenti Dettagliati:**
1. **Anatomia e Regole del Prompting**
   * Impostazione dei brief professionali: definizione di ruolo, contesto, vincoli, output attesi e *In-Context Learning*.
2. **Catena di Pensiero (Chain of Thought - CoT) e Gestione del Contesto**
   * Tecniche per stimolare il ragionamento esplicito (*reasoning traces*).
   * Come evitare il degrado del contesto (*context rot*) e le perdite da riassunto automatico (*compaction*).
3. **Tutorial e Esercitazione Pratica 1 - Generazione e Editing Testi**
   * Redazione, sintesi, riscrittura, strutturazione ed estrazione dati con modelli di testo.
4. **Panoramica AI Secondarie (Video, Audio e Multimodale)**
   * Mappatura delle piattaforme specializzate oltre al testo: generazione video, sintesi e clonazione vocale, musica ed elaborazione multimodale.
5. **Mix tra Diverse AI e Workflow Multimodali**
   * Come orchestrare e combinare più modelli (es. sintesi testuale su LLM + generazione di asset visivi su modelli dedicati) per la creazione di progetti complessi.
6. **Tutorial e Esercitazione Pratica 2 - Generazione Immagini e Asset Visivi**
   * Creazione guidata di immagini, descrittori di stile, composizione e analisi critica dei limiti visivi (deepfake e artefatti).
7. **Review Collettiva degli Output**
   * Analisi degli errori emersi durante i tutorial e affinamento progressivo dei prompt.

---

### **GIORNO 3: Applicazioni dell'AI nel Lavoro d'Ufficio**
* **Durata:** 4 ore
* **Obiettivo:** Automatizzare i flussi di lavoro aziendali e integrare l'IA nei fogli di calcolo e nelle analisi di produttività.
* **Volume Slide:** **8–10 slide** (ibrido tra dimostrazione operativa e lavoro pratico di gruppo).

#### **Argomenti Dettagliati:**
1. **Mappa della Produttività Aziendale e Stakeholder / Ecosystem Map**
   * Mappatura dei flussi d'ufficio idonei all'automazione (reportistica, e-mail, analisi dati).
   * Analisi dell'ecosistema di riferimento: identificazione degli stakeholder impattati e della gestione delle aspettative sull'output.
2. **Sistemi Agentici e l'Agentic Harness**
   * Come un LLM si trasforma in agente quando viene inserito in un'imbracatura software (*harness*) dotata di strumenti esterni (*connectors*, lettura PDF, esecuzione di codice Python).
3. **Apprendimento con Ricompense Verificabili (RLVR)**
   * Sfruttare modelli ottimizzati per settori ad alta accuratezza (matematica, logica, codice, tabelle).
4. **Tutorial Pratico - Arricchimento di Google Spreadsheet con l'AI**
   * Caso d'uso aziendale: integrazione di funzioni AI in Google Sheets per la pulizia dei dati, la classificazione automatica di elenchi, le traduzioni e l'arricchimento informativo riga per riga.
5. **Guardrail per l'Ufficio**
   * Applicazione di controlli deterministici e di contesto nell'harness per prevenire azioni dannose non autorizzate (invio errato di comunicazioni, cancellazione file).
6. **Esercitazione di Gruppo**
   * Simulazione di un workflow integrato di produttività personale e di team.

---

### **GIORNO 4: Norme, Privacy, Sicurezza e Governance dell'AI**
* **Durata:** 4 ore
* **Obiettivo:** Affrontare la protezione dei dati, le procedure di sanificazione e la cornice etico-critica per il controllo umano sull'AI.
* **Volume Slide:** **10–12 slide** (sessione conclusiva di sintesi e governance).

#### **Argomenti Dettagliati:**
1. **GDPR, Privacy e Modelli a Confronto**
   * Trattamento dei dati personali e riservati.
   * Analisi comparativa tra modelli cloud pubblici e modelli *open weight* eseguiti in locale su hardware dedicato.
2. **Anonimizzazione e Pulizia dei Dati per l'Uso con AI Frontier**
   * Tecniche pratiche di *Data Anonymization*, *PII Redaction* (rimozione delle informazioni personali identificabili) e sanificazione dei dati prima dell'invio a modelli di frontiera in cloud.
3. **Cybersecurity e Vulnerabilità degli Agenti**
   * Protezione degli accessi aziendali, prevenzione di *compaction leaks* ed esecuzione involontaria di comandi da parte di agenti autonomi.
4. **Allineamento, Bias e Asimmetria Culturale**
   * Il fenomeno della *sycophancy* (comportamento compiacente del modello) e lo scontro geopolitico/tecnologico tra modelli americani e cinesi.
5. **Copyright, Copyleft e Dati d'Addestramento**
   * Licenze dei dataset, licenze aperte e diritto d'autore sui contenuti sintetici.
6. **La Cornice di Simmel e il Controllo dell'AI**
   * Riprendendo la teoria di Georg Simmel (1902), la "cornice" nasce per separare l'opera d'arte dalla realtà, ma diventa il dispositivo epistemologico per **esercitare il controllo umano sulla macchina**.
   * L'assenza di supervisione e di una cornice critica ha storicamente generato disastri da automazione (es. *Flash Crash* 2010, vetrina IBM 1948).
   * **Incorniciare il macchinico:** delegare all'AI gli "enigmi" computazionali (risolvibili con algoritmi), mantenendo sotto la diretta responsabilità dell'uomo i "misteri" (etica, morale, valore politico e giudizio critico).
7. **Checklist Finale di Governance Aziendale**
   * Vademecum pratico con le regole auree per un'adozione sicura, conforme e responsabile dell'AI in azienda.
