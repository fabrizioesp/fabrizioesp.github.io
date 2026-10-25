import { resumeAudioOnInteraction } from './audio.js';
import {
    applyRemoteState,
    initGame,
    initMultiplayer,
    receiveRemoteCapture,
    receiveRemotePlay,
    sendResumeState,
    setRemotePlayerConnected,
    showRemoteRoundResult
} from './game.js';
import { createRoom, disconnectNetwork, joinRoom, sendMessage } from './network.js';

resumeAudioOnInteraction();

let networkRole = null;
let chosenPlayerName = null;
let opponentPlayerName = null;
let hostPlayerConnected = false;
let hostedMatchStarted = false;
let activeRoomCode = '';
const ROOM_SESSION_STORAGE_KEY = 'scopa.multiplayer.session';

document.querySelectorAll('[data-game-mode]').forEach(button => {
    button.addEventListener('click', () => {
        clearSavedGuestSession();
        setActiveRoomCode('');
        joinRoomButton.textContent = 'Unisciti';
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
const lobby = document.getElementById('multiplayer-lobby');
const lobbyStatus = document.getElementById('lobby-status');
const lobbyStartButton = document.getElementById('lobby-start-btn');
const lobbyCancelButton = document.getElementById('lobby-cancel-btn');
const lobbyVariant = document.getElementById('lobby-game-variant');
const lobbyDuration = document.getElementById('lobby-game-duration');
const copyActiveRoomCodeButton = document.getElementById('copy-active-room-code-btn');

try {
    const savedSession = JSON.parse(localStorage.getItem(ROOM_SESSION_STORAGE_KEY) || 'null');
    if (savedSession?.role === 'guest' &&
        typeof savedSession.roomCode === 'string' &&
        /^[A-HJ-NP-Z2-9]{6}$/.test(savedSession.roomCode)) {
        activeRoomCode = savedSession.roomCode;
        document.getElementById('room-code-input').value = activeRoomCode;
        document.getElementById('join-room-btn').textContent = 'Rientra nella partita';
        if (typeof savedSession.playerName === 'string') {
            document.getElementById('player-name-input').value =
                savedSession.playerName.trim().slice(0, 20);
        }
    }
} catch (error) {
    console.warn('Impossibile ripristinare i dati per rientrare nella stanza.', error);
}

function setActiveRoomCode(roomCode) {
    activeRoomCode = roomCode;
    document.getElementById('active-room-code').textContent = roomCode;
}

function clearSavedGuestSession() {
    try {
        localStorage.removeItem(ROOM_SESSION_STORAGE_KEY);
    } catch (error) {
        console.warn('Impossibile cancellare i dati salvati della stanza.', error);
    }
}

function setNetworkBusy(isBusy) {
    createRoomButton.disabled = isBusy;
    joinRoomButton.disabled = isBusy;
}

function readPlayerName(fallback) {
    return document.getElementById('player-name-input').value.trim().slice(0, 20) || fallback;
}

function showLobby(role) {
    document.getElementById('mode-selection').style.display = 'none';
    document.getElementById('game-board').classList.add('is-hidden');
    lobby.hidden = false;
    const isHost = role === 'host';
    document.getElementById('lobby-host-settings').hidden = !isHost;
    document.getElementById('lobby-guest-settings').hidden = isHost;
    document.querySelector('.lobby-room-code').hidden = !isHost;
    copyRoomCodeButton.hidden = !isHost;
    lobbyStartButton.hidden = !isHost;
    lobbyStartButton.disabled = !isHost || !hostPlayerConnected;
}

function sendLobbySettings() {
    if (networkRole !== 'host') return;
    sendMessage({
        type: 'lobby-settings',
        variant: lobbyVariant.value,
        duration: lobbyDuration.value
    });
}

function updateGuestLobby(settings) {
    const variants = {
        classic: 'Scopa classica',
        sbarazzo: 'Sbarazzo Federiciano'
    };
    const durations = {
        11: 'Fino a 11 punti',
        21: 'Fino a 21 punti',
        single: 'Una smazzata'
    };
    if (!Object.hasOwn(variants, settings.variant) || !Object.hasOwn(durations, settings.duration)) {
        return;
    }
    document.getElementById('lobby-guest-variant').textContent = variants[settings.variant];
    document.getElementById('lobby-guest-duration').textContent = durations[settings.duration];
    lobbyStatus.textContent = 'In attesa che l’host avvii la partita...';
}

function networkHandlers(role) {
    return {
        onRoomReady() {
            lobbyStatus.textContent = 'Stanza pronta. In attesa dell’altro giocatore...';
            sendLobbySettings();
        },
        onConnect() {
            if (role === 'host' && hostedMatchStarted) {
                lobbyStatus.textContent = 'Ospite riconnesso. Ripristino la partita...';
                return;
            }
            showLobby(role);
            if (role === 'host') {
                hostPlayerConnected = true;
                lobbyStatus.textContent = 'Giocatore collegato. In attesa del suo nome...';
                lobbyStartButton.disabled = !opponentPlayerName;
                sendLobbySettings();
            } else {
                lobbyStatus.textContent = 'Connesso. Invio il tuo nome all’host...';
                if (!sendMessage({ type: 'player-name', name: chosenPlayerName })) {
                    lobbyStatus.textContent = 'Connessione assente: impossibile inviare il nome.';
                }
            }
        },
        onMessage(message) {
            if (!message || typeof message !== 'object') return;
            if (message.type === 'player-name' && role === 'host' &&
                typeof message.name === 'string') {
                opponentPlayerName = message.name.trim().slice(0, 20) || 'Ospite';
                if (hostedMatchStarted) {
                    setRemotePlayerConnected(true);
                    sendResumeState();
                    return;
                }
                lobbyStatus.textContent = `${opponentPlayerName} è nella lobby. Scegli le impostazioni e avvia la partita.`;
                lobbyStartButton.disabled = !hostPlayerConnected;
            } else if (message.type === 'lobby-settings' && role === 'guest') {
                updateGuestLobby(message);
            } else if (message.type === 'round-start' && message.state) {
                applyRemoteState(message.state);
                lobby.hidden = true;
                document.getElementById('game-board').classList.remove('is-hidden');
                document.getElementById('overlay').style.display = 'none';
                lobbyStatus.textContent = 'Partita online in corso.';
            } else if (message.type === 'resume-state' && role === 'guest' && message.state) {
                applyRemoteState(message.state);
                lobby.hidden = true;
                document.getElementById('game-board').classList.remove('is-hidden');
                lobbyStatus.textContent = 'Partita ripristinata.';
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
                clearSavedGuestSession();
                showMenu('L’avversario ha terminato la partita.');
            }
        },
        onDisconnect() {
            if (networkRole) {
                if (role === 'host' && hostedMatchStarted) {
                    setRemotePlayerConnected(false);
                } else if (!lobby.hidden) {
                    hostPlayerConnected = false;
                    lobbyStartButton.disabled = true;
                    lobbyStatus.textContent = 'Connessione interrotta. La lobby non è più disponibile.';
                } else if (!document.getElementById('game-board').classList.contains('is-hidden')) {
                    document.getElementById('turn-status').textContent =
                        'Connessione interrotta. Ricarica la pagina per avviare una nuova partita.';
                } else {
                    networkStatus.textContent = 'Connessione interrotta. Ricarica la pagina per iniziare una nuova partita.';
                }
            }
        },
        onError(message) {
            if (!lobby.hidden) lobbyStatus.textContent = message;
            else networkStatus.textContent = message;
            hostPlayerConnected = false;
            hostedMatchStarted = false;
            lobbyStartButton.disabled = true;
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
    lobby.hidden = true;
    document.getElementById('room-code').textContent = '';
    hostPlayerConnected = false;
    opponentPlayerName = null;
    hostedMatchStarted = false;
    setActiveRoomCode('');
}

createRoomButton.addEventListener('click', () => {
    networkRole = 'host';
    clearSavedGuestSession();
    chosenPlayerName = readPlayerName('Host');
    hostPlayerConnected = false;
    hostedMatchStarted = false;
    opponentPlayerName = null;
    lobbyVariant.value = document.getElementById('game-variant').value;
    lobbyStatus.textContent = 'Creazione della stanza...';
    setNetworkBusy(true);
    const roomCode = generateRoomCode();
    document.getElementById('room-code').textContent = roomCode;
    setActiveRoomCode(roomCode);
    showLobby('host');
    networkStatus.textContent = 'Creazione della stanza...';
    try {
        createRoom(roomCode, networkHandlers('host'));
    } catch (error) {
        networkStatus.textContent = error.message;
        setNetworkBusy(false);
    }
});

for (const control of [lobbyVariant, lobbyDuration]) {
    control.addEventListener('change', sendLobbySettings);
}

lobbyStartButton.addEventListener('click', () => {
    if (networkRole !== 'host' || !hostPlayerConnected || !opponentPlayerName) return;
    lobbyStartButton.disabled = true;
    lobbyStatus.textContent = 'Avvio della partita...';
    try {
        initMultiplayer(
            lobbyDuration.value,
            'player',
            true,
            lobbyVariant.value,
            chosenPlayerName,
            opponentPlayerName
        );
        hostedMatchStarted = true;
        lobby.hidden = true;
        document.getElementById('game-board').classList.remove('is-hidden');
        setRemotePlayerConnected(true);
    } catch (error) {
        lobbyStatus.textContent = error.message;
        lobbyStartButton.disabled = false;
    }
});

lobbyCancelButton.addEventListener('click', () => {
    disconnectNetwork();
    networkRole = null;
    clearSavedGuestSession();
    showMenu('Lobby chiusa.');
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
        lobbyStatus.textContent = 'Codice stanza non disponibile.';
        return;
    }

    try {
        await navigator.clipboard.writeText(roomCode);
        lobbyStatus.textContent = 'Codice stanza copiato.';
    } catch (error) {
        lobbyStatus.textContent =
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
    setActiveRoomCode(roomCode);
    try {
        localStorage.setItem(ROOM_SESSION_STORAGE_KEY, JSON.stringify({
            role: 'guest',
            roomCode,
            playerName: chosenPlayerName
        }));
    } catch (error) {
        console.warn('Impossibile salvare i dati per rientrare nella stanza.', error);
    }
    lobbyStatus.textContent = 'Connessione alla stanza...';
    setNetworkBusy(true);
    networkStatus.textContent = 'Connessione alla stanza...';
    try {
        joinRoom(roomCode, networkHandlers('guest'));
    } catch (error) {
        networkStatus.textContent = error.message;
        setNetworkBusy(false);
    }
});

copyActiveRoomCodeButton.addEventListener('click', async () => {
    if (!activeRoomCode) {
        document.getElementById('turn-status').textContent = 'Codice stanza non disponibile.';
        return;
    }

    try {
        await navigator.clipboard.writeText(activeRoomCode);
        document.getElementById('turn-status').textContent = 'Codice stanza copiato.';
    } catch (error) {
        document.getElementById('turn-status').textContent =
            `Impossibile copiare. Codice stanza: ${activeRoomCode}`;
        console.error('Copia del codice stanza non riuscita.', error);
    }
});
