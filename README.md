# Scopa Napoletana

La cartella contiene una versione autonoma del gioco con partita singola, partita contro il computer e multiplayer online 1 contro 1. Prima di iniziare, scegli **Scopa classica** o **Sbarazzo Federiciano**.

Nello Sbarazzo Federiciano il dieci di denari assegna un punto a chi lo prende, il due di denari sottrae cinque punti a chi lo prende e un asso giocato senza altri assi sul tavolo prende tutte le carte e conta come scopa. Se sul tavolo c'è già un asso, un asso giocato ne prende uno senza fare scopa; se il tavolo è vuoto, l'asso viene lasciato sul tavolo senza assegnare una scopa. A inizio smazzata si ridanno le prime quattro carte se contengono almeno due assi. Quando la mano appena distribuita di un giocatore somma al massimo nove, viene annunciato **SBARAZZO**: si scoprono soltanto le carte di quel giocatore, non quelle dell'avversario. Lo sbarazzo assegna 2 punti, 3 se ci sono due carte dello stesso valore o 4 se tutte e tre hanno lo stesso valore. I punti vengono aggiunti al punteggio della smazzata anche se il giocatore non effettua prese; le carte che li rappresentano vengono scoperte dal suo mazzo delle prese appena disponibile, anche se la presa arriva dopo l'annuncio. Queste regole valgono sia contro il computer sia in multiplayer.

Il tavolo si adatta anche agli schermi dei telefoni. Quando una presa è individuata, le carte coinvolte vengono evidenziate per circa un secondo prima dell'animazione di raccolta.

## Avvio

Apri `index.html` in un browser moderno. Per giocare online, entrambi i browser devono essere connessi a Internet e la pagina deve essere servita da `localhost` o da un sito HTTPS, perché WebRTC richiede un contesto sicuro.

## Partita online

1. Un giocatore sceglie la durata e seleziona **Genera codice stanza (Host)**.
2. Il codice di sei caratteri appare subito; usa **Copia codice** per condividerlo. Attendi il messaggio che indica che la stanza è pronta.
3. L'avversario inserisce il codice nella propria schermata e seleziona **Unisciti**.
4. Il creatore della stanza gestisce lo stato della partita; le mosse e gli aggiornamenti viaggiano sulla connessione WebRTC diretta. PeerJS fornisce il servizio di segnalazione necessario a stabilire la connessione.

Il servizio di segnalazione e la connessione peer richiedono accesso Internet. Condividi il codice solo con la persona che vuoi invitare.
