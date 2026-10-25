# Scopa Napoletana

La cartella contiene una versione autonoma del gioco con partita singola, partita contro il computer e multiplayer online 1 contro 1. Prima di iniziare, inserisci il tuo nome e scegli **Scopa classica** o **Sbarazzo Federiciano**. Nelle partite online ciascun giocatore inserisce il proprio nome; entrambi i nomi vengono mostrati durante la partita.

Nello Sbarazzo Federiciano il dieci di denari assegna un punto a chi lo prende, il due di denari sottrae cinque punti a chi lo prende e un asso giocato senza altri assi sul tavolo prende tutte le carte e conta come scopa. Se sul tavolo c'è già un asso, un asso giocato ne prende uno senza fare scopa; se il tavolo è vuoto, l'asso viene lasciato sul tavolo senza assegnare una scopa. A inizio smazzata si ridanno le prime quattro carte se contengono almeno due assi. Quando la mano appena distribuita di un giocatore somma al massimo nove, viene annunciato **SBARAZZO**: si scoprono soltanto le carte di quel giocatore, non quelle dell'avversario. Lo sbarazzo assegna 2 punti, 3 se ci sono due carte dello stesso valore o 4 se tutte e tre hanno lo stesso valore. I punti vengono aggiunti al punteggio della smazzata anche se il giocatore non effettua prese; le carte che li rappresentano vengono scoperte dal suo mazzo delle prese appena disponibile, anche se la presa arriva dopo l'annuncio. Queste regole valgono sia contro il computer sia in multiplayer.

Il tavolo si adatta anche agli schermi dei telefoni. Quando una presa è individuata, le carte coinvolte vengono evidenziate per circa un secondo prima dell'animazione di raccolta.

## Avvio

Apri `index.html` in un browser moderno. Per giocare online, entrambi i browser devono essere connessi a Internet e la pagina deve essere servita da `localhost` o da un sito HTTPS, perché WebRTC richiede un contesto sicuro.

## Partita online

1. Ogni giocatore inserisce il proprio nome. L'host seleziona **Genera codice stanza (Host)**.
2. Nella lobby l'host condivide il codice con **Copia codice**, sceglie la modalità e la durata e attende il collegamento dell'avversario.
3. L'avversario inserisce il codice nella schermata iniziale e seleziona **Unisciti**. Nella lobby visualizza le impostazioni scelte dall'host, senza poterle modificare.
4. Quando l'avversario è collegato, l'host seleziona **Avvia partita**. Solo l'host decide la modalità e la durata; poi gestisce lo stato della partita. Le mosse e gli aggiornamenti viaggiano sulla connessione WebRTC diretta. PeerJS fornisce il servizio di segnalazione necessario a stabilire la connessione.

Il servizio di segnalazione e la connessione peer richiedono accesso Internet. Condividi il codice solo con la persona che vuoi invitare.

Durante la partita, il menu **Stanza multiplayer** mostra il codice stanza da condividere in caso di disconnessione. Sul browser dell'ospite, codice e nome vengono salvati per facilitare il rientro dopo un ricaricamento: inserisci nuovamente il codice precompilato e seleziona **Rientra nella partita**. Se l'host è ancora nella partita, lo stato corrente viene ripristinato e il gioco riprende; mentre l'ospite è disconnesso, l'host vede la partita in pausa.
