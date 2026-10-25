import { resumeAudioOnInteraction } from './audio.js';
import {
    applyRemoteState,
    initGame,
    initMultiplayer,
    receiveRemoteCapture,
    receiveRemotePlay,
    showRemoteRoundResult
} from './game.js';
import { createRoom, disconnectNetwork, joinRoom, sendMessage } from './network.js';

resumeAudioOnInteraction();

let networkRole = null;
let chosenOnlineMode = null;
let chosenPlayerName = null;

document.querySelectorAll('[data-game-mode]').forEach(button => {
    button.addEventListener('click', () => {
        document.getElementById('mode-selection').style.display = 'none';
        document.getElementById('game-board').classList.remove('is-hidden');
        initGame(
            button.dataset.gameMode,
            document.getElementById('game-variant').value,
            readPlayerName('Giocatore')
        );
    });
});

const createRoomButton = document.getElementById('create-room-btn');
const joinRoomButton = document.getElementById('join-room-btn');
const copyRoomCodeButton = document.getElementById('copy-room-code-btn');
const networkStatus = document.getElementById('network-status');

function setNetworkBusy(isBusy) {
    createRoomButton.disabled = isBusy;
    joinRoomButton.disabled = isBusy;
}

function readPlayerName(fallback) {
    return document.getElementById('player-name-input').value.trim().slice(0, 20) || fallback;
}

function networkHandlers(role) {
    let hostedMatchStarted = false;
    return {
        onRoomReady() {
            networkStatus.textContent = 'Stanza pronta. In attesa dell’avversario...';
        },
        onConnect() {
            networkStatus.textContent = role === 'host'
                ? 'Giocatore connesso. Attendo il suo nome...'
                : 'Connesso. Invio il tuo nome all’host...';
            document.getElementById('room-code-display').hidden = true;
            document.getElementById('mode-selection').style.display = 'none';
            document.getElementById('game-board').classList.remove('is-hidden');
            if (role === 'guest' && !sendMessage({ type: 'player-name', name: chosenPlayerName })) {
                networkStatus.textContent = 'Connessione assente: impossibile inviare il tuo nome.';
            }
        },
        onMessage(message) {
            if (!message || typeof message !== 'object') return;
            if (message.type === 'player-name' && role === 'host' &&
                typeof message.name === 'string' && !hostedMatchStarted) {
                hostedMatchStarted = true;
                initMultiplayer(
                    chosenOnlineMode,
                    'player',
                    true,
                    document.getElementById('game-variant').value,
                    chosenPlayerName,
                    message.name.trim().slice(0, 20) || 'Ospite'
                );
            } else if (message.type === 'round-start' && message.state) {
                applyRemoteState(message.state);
                document.getElementById('mode-selection').style.display = 'none';
                document.getElementById('game-board').classList.remove('is-hidden');
                document.getElementById('overlay').style.display = 'none';
                networkStatus.textContent = 'Partita online in corso.';
            } else if (message.type === 'state' && role === 'guest' && message.state) {
                applyRemoteState(message.state);
            } else if (message.type === 'play' && role === 'host') {
                document.getElementById('turn-status').textContent = 'Mossa ricevuta...';
                receiveRemotePlay(message.index);
            } else if (message.type === 'capture-confirm' && role === 'host') {
                receiveRemoteCapture(message.selectedIds);
            } else if (message.type === 'round-result' && role === 'guest' && message.result) {
                if (message.state) applyRemoteState(message.state);
                showRemoteRoundResult(message.result);
            } else if (message.type === 'session-ended' && role === 'guest') {
                disconnectNetwork();
                networkRole = null;
                showMenu('L’avversario ha terminato la partita.');
            }
        },
        onDisconnect() {
            if (networkRole) {
                networkRole = null;
                if (!document.getElementById('game-board').classList.contains('is-hidden')) {
                    document.getElementById('turn-status').textContent =
                        'Connessione interrotta. Ricarica la pagina per avviare una nuova partita.';
                } else {
                    networkStatus.textContent = 'Connessione interrotta. Ricarica la pagina per iniziare una nuova partita.';
                }
            }
        },
        onError(message) {
            networkStatus.textContent = message;
            networkRole = null;
            disconnectNetwork();
            setNetworkBusy(false);
        }
    };
}

function showMenu(message = '') {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('game-board').classList.add('is-hidden');
    document.getElementById('mode-selection').style.display = 'flex';
    networkStatus.textContent = message;
    setNetworkBusy(false);
    document.getElementById('room-code-display').hidden = true;
    document.getElementById('room-code').textContent = '';
}

createRoomButton.addEventListener('click', () => {
    networkRole = 'host';
    chosenOnlineMode = document.getElementById('online-mode').value;
    chosenPlayerName = readPlayerName('Host');
    setNetworkBusy(true);
    const roomCode = generateRoomCode();
    document.getElementById('room-code').textContent = roomCode;
    document.getElementById('room-code-display').hidden = false;
    networkStatus.textContent = 'Creazione della stanza...';
    try {
        createRoom(roomCode, networkHandlers('host'));
    } catch (error) {
        networkStatus.textContent = error.message;
        setNetworkBusy(false);
    }
});

function generateRoomCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(12);
    const characters = [];
    while (characters.length < 6) {
        crypto.getRandomValues(bytes);
        for (const byte of bytes) {
            if (byte >= 224) continue;
            characters.push(alphabet[byte % alphabet.length]);
            if (characters.length === 6) break;
        }
    }
    return characters.join('');
}

copyRoomCodeButton.addEventListener('click', async () => {
    const roomCode = document.getElementById('room-code').textContent.trim();
    if (!roomCode) {
        networkStatus.textContent = 'Genera prima un codice stanza da condividere.';
        return;
    }

    try {
        await navigator.clipboard.writeText(roomCode);
        networkStatus.textContent = 'Codice stanza copiato.';
    } catch (error) {
        networkStatus.textContent =
            `Impossibile copiare automaticamente il codice. Copialo manualmente: ${roomCode}`;
        console.error('Copia del codice stanza non riuscita.', error);
    }
});

joinRoomButton.addEventListener('click', () => {
    const roomCode = document.getElementById('room-code-input').value.trim().toUpperCase();
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(roomCode)) {
        networkStatus.textContent = 'Inserisci un codice stanza valido di 6 caratteri.';
        return;
    }

    networkRole = 'guest';
    chosenPlayerName = readPlayerName('Ospite');
    setNetworkBusy(true);
    networkStatus.textContent = 'Connessione alla stanza...';
    try {
        joinRoom(roomCode, networkHandlers('guest'));
    } catch (error) {
        networkStatus.textContent = error.message;
        setNetworkBusy(false);
    }
});
