# Scopa Napoletana

La cartella contiene una versione autonoma del gioco con partita singola, partita contro il computer e multiplayer online 1 contro 1.

Il tavolo si adatta anche agli schermi dei telefoni. Quando una presa è individuata, le carte coinvolte vengono evidenziate per circa un secondo prima dell'animazione di raccolta.

## Avvio

Apri `index.html` in un browser moderno. Per giocare online, entrambi i browser devono essere connessi a Internet e la pagina deve essere servita da `localhost` o da un sito HTTPS, perché WebRTC richiede un contesto sicuro.

## Partita online

1. Un giocatore sceglie la durata e seleziona **Crea una stanza**.
2. Quando la stanza è pronta, condivide il codice di sei caratteri con l'avversario.
3. L'avversario inserisce il codice e seleziona **Unisciti**.
4. Il creatore della stanza gestisce lo stato della partita; le mosse e gli aggiornamenti viaggiano sulla connessione WebRTC diretta. PeerJS fornisce il servizio di segnalazione necessario a stabilire la connessione.

Il servizio di segnalazione e la connessione peer richiedono accesso Internet. Condividi il codice solo con la persona che vuoi invitare.
