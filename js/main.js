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

document.querySelectorAll('[data-game-mode]').forEach(button => {
    button.addEventListener('click', () => {
        document.getElementById('mode-selection').style.display = 'none';
        document.getElementById('game-board').classList.remove('is-hidden');
        initGame(button.dataset.gameMode);
    });
});

const createRoomButton = document.getElementById('create-room-btn');
const joinRoomButton = document.getElementById('join-room-btn');
const networkStatus = document.getElementById('network-status');

function setNetworkBusy(isBusy) {
    createRoomButton.disabled = isBusy;
    joinRoomButton.disabled = isBusy;
}

function networkHandlers(role) {
    return {
        onRoomReady() {
            const roomCode = document.getElementById('room-code').textContent;
            networkStatus.textContent = `Stanza pronta. In attesa dell'avversario...`;
            document.getElementById('room-code-display').hidden = false;
            document.getElementById('room-code').textContent = roomCode;
        },
        onConnect() {
            networkStatus.textContent = 'Giocatore connesso. La partita sta per iniziare...';
            document.getElementById('room-code-display').hidden = true;
            document.getElementById('mode-selection').style.display = 'none';
            document.getElementById('game-board').classList.remove('is-hidden');
            if (role === 'host') {
                initMultiplayer(chosenOnlineMode, 'player', true);
            }
        },
        onMessage(message) {
            if (!message || typeof message !== 'object') return;
            if (message.type === 'round-start' && message.state) {
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
}

createRoomButton.addEventListener('click', () => {
    networkRole = 'host';
    chosenOnlineMode = document.getElementById('online-mode').value;
    setNetworkBusy(true);
    const roomCode = Array.from(crypto.getRandomValues(new Uint8Array(6)))
        .map(value => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[value % 32])
        .join('');
    document.getElementById('room-code').textContent = roomCode;
    networkStatus.textContent = 'Creazione della stanza...';
    try {
        createRoom(roomCode, networkHandlers('host'));
    } catch (error) {
        networkStatus.textContent = error.message;
        setNetworkBusy(false);
    }
});

joinRoomButton.addEventListener('click', () => {
    const roomCode = document.getElementById('room-code-input').value.trim().toUpperCase();
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(roomCode)) {
        networkStatus.textContent = 'Inserisci un codice stanza valido di 6 caratteri.';
        return;
    }

    networkRole = 'guest';
    setNetworkBusy(true);
    networkStatus.textContent = 'Connessione alla stanza...';
    try {
        joinRoom(roomCode, networkHandlers('guest'));
    } catch (error) {
        networkStatus.textContent = error.message;
        setNetworkBusy(false);
    }
});
