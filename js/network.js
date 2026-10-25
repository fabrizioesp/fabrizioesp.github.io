let peer = null;
let connection = null;
let activeHandlers = null;

function reportError(error) {
    const message = error?.message || 'Connessione non riuscita. Controlla il codice e riprova.';
    activeHandlers?.onError(message);
}

function bindConnection(newConnection) {
    connection = newConnection;
    connection.on('open', () => activeHandlers?.onConnect());
    connection.on('data', data => activeHandlers?.onMessage(data));
    connection.on('close', () => {
        connection = null;
        activeHandlers?.onDisconnect();
    });
    connection.on('error', reportError);
}

function createPeer(peerId, handlers) {
    activeHandlers = handlers;
    if (!window.Peer) {
        throw new Error('PeerJS non è disponibile. Verifica la connessione Internet e ricarica la pagina.');
    }

    peer = new window.Peer(peerId);
    peer.on('error', reportError);
    peer.on('disconnected', () => activeHandlers?.onError('Connessione al servizio di segnalazione interrotta.'));
    return peer;
}

export function createRoom(roomCode, handlers) {
    const roomPeer = createPeer(`scopa-${roomCode.toLowerCase()}`, handlers);
    roomPeer.on('open', () => activeHandlers?.onRoomReady());
    roomPeer.on('connection', incoming => {
        if (connection) {
            incoming.close();
            return;
        }
        bindConnection(incoming);
    });
}

export function joinRoom(roomCode, handlers) {
    const roomPeer = createPeer(null, handlers);
    roomPeer.on('open', () => {
        bindConnection(roomPeer.connect(`scopa-${roomCode.toLowerCase()}`, { reliable: true }));
    });
}

export function sendMessage(message) {
    if (!connection?.open) return false;
    connection.send(message);
    return true;
}

export function disconnectNetwork() {
    if (connection) connection.close();
    if (peer) peer.destroy();
    connection = null;
    peer = null;
    activeHandlers = null;
}
