import { animateElement } from './animations.js';
import { createCardElement, findMatch, hasMultipleSumMatches } from './cards.js';
import { playCardSound, playScopaSound } from './audio.js';
import { renderBoard } from './render.js';
import { calculateRoundScore, calculateSbarazzoPoints } from './scoring.js';
import { game, suits, values } from './state.js';
import { disconnectNetwork, sendMessage } from './network.js';

const CAPTURE_PREVIEW_DURATION = 1000;
const SBARAZZO_ANNOUNCEMENT_DURATION = 2000;
const GAME_VARIANTS = ['classic', 'sbarazzo'];
let lastShownSbarazzoAnnouncementId = null;
let matchSequence = 0;

export function initGame(mode, gameVariant, playerName = 'Giocatore') {
    const matchTargets = { single: null, 11: 11, 21: 21 };
    if (!Object.hasOwn(matchTargets, mode)) {
        throw new Error(`Modalità di partita non valida: ${mode}`);
    }
    if (!GAME_VARIANTS.includes(gameVariant)) {
        throw new Error(`Variante di gioco non valida: ${gameVariant}`);
    }

    game.globalPScore = 0;
    game.globalAScore = 0;
    game.multiplayer = false;
    game.multiplayerHost = false;
    game.localSeat = 'player';
    game.handDealNumber = 0;
    game.matchId = createMatchId();
    lastShownSbarazzoAnnouncementId = null;
    game.matchMode = mode;
    game.matchTarget = matchTargets[mode];
    game.gameVariant = gameVariant;
    game.playerName = playerName;
    game.aiName = 'Computer';
    game.dealer = 'player';
    startRound();
}

export function initMultiplayer(
    mode,
    localSeat,
    isHost,
    gameVariant,
    playerName = 'Host',
    opponentName = 'Ospite'
) {
    const matchTargets = { single: null, 11: 11, 21: 21 };
    if (!Object.hasOwn(matchTargets, mode)) {
        throw new Error(`Modalità di partita non valida: ${mode}`);
    }
    if (!GAME_VARIANTS.includes(gameVariant)) {
        throw new Error(`Variante di gioco non valida: ${gameVariant}`);
    }

    game.multiplayer = true;
    game.multiplayerHost = isHost;
    game.localSeat = localSeat;
    game.matchMode = mode;
    game.matchTarget = matchTargets[mode];
    game.gameVariant = gameVariant;
    game.playerName = playerName;
    game.aiName = opponentName;

    if (isHost) {
        game.globalPScore = 0;
        game.globalAScore = 0;
        game.handDealNumber = 0;
        game.matchId = createMatchId();
        lastShownSbarazzoAnnouncementId = null;
        game.dealer = 'player';
        startRound();
    }
}

function startRound() {
    game.deck = [];
    game.pHand = [];
    game.aHand = [];
    game.tableCards = [];
    game.pCaptures = [];
    game.aCaptures = [];
    game.scopaCardsP = [];
    game.scopaCardsA = [];
    game.pScope = 0;
    game.aScope = 0;
    game.sbarazzoPointsP = 0;
    game.sbarazzoPointsA = 0;
    game.lastCapture = null;
    game.captureChoice = null;
    game.pendingCaptureIds = [];
    game.sbarazzoRevealedHands = [];
    game.sbarazzoAnnouncement = null;
    game.isLocked = false;

    for (const suit of suits) {
        for (const value of values) {
            game.deck.push({ id: `${value}-${suit}`, value, suit });
        }
    }
    let openingCards;
    do {
        game.deck.sort(() => Math.random() - 0.5);
        openingCards = [];
        for (let index = 0; index < 4; index++) {
            openingCards.push(game.deck.pop());
        }
        if (game.gameVariant === 'sbarazzo' &&
            openingCards.filter(card => card.value === 1).length >= 2) {
            game.deck.push(...openingCards);
        }
    } while (
        game.gameVariant === 'sbarazzo' &&
        openingCards.filter(card => card.value === 1).length >= 2
    );
    game.tableCards.push(...openingCards);
    const announcement = dealCards();

    game.turn = game.dealer === 'player' ? 'ai' : 'player';
    renderGameBoard();
    if (game.multiplayerHost) {
        sendMessage({ type: 'round-start', mode: game.matchMode, state: getSnapshot() });
    }
    if (announcement) {
        void finishSbarazzoAnnouncement(announcement);
    } else if (!game.multiplayer && game.turn === 'ai') {
        setTimeout(aiPlay, 800);
    }
}

function createMatchId() {
    matchSequence++;
    return `${Date.now()}-${matchSequence}`;
}

function dealCards() {
    if (game.deck.length === 0) return false;
    game.handDealNumber++;
    game.sbarazzoRevealedHands = [];
    game.sbarazzoAnnouncement = null;
    for (let index = 0; index < 3; index++) {
        game.pHand.push(game.deck.pop());
        game.aHand.push(game.deck.pop());
    }

    document.getElementById('deck-pile').style.display = game.deck.length === 0 ? 'none' : 'block';

    if (game.gameVariant !== 'sbarazzo') return null;
    const declarations = [
        ['player', game.pHand],
        ['ai', game.aHand]
    ]
        .filter(([, hand]) => hand.length === 3 && hand.reduce((sum, card) => sum + card.value, 0) <= 9)
        .map(([seat, hand]) => ({ seat, points: calculateSbarazzoPoints(hand) }));
    if (declarations.length === 0) return null;

    for (const { seat, points } of declarations) {
        const pointsKey = seat === 'player' ? 'sbarazzoPointsP' : 'sbarazzoPointsA';
        game[pointsKey] += points;
    }

    const seats = declarations.map(({ seat }) => seat);
    game.sbarazzoRevealedHands = seats;
    game.sbarazzoAnnouncement = {
        id: `${game.matchId}-${game.handDealNumber}`,
        seats
    };
    game.isLocked = true;
    return game.sbarazzoAnnouncement;
}

function showSbarazzoAnnouncement(announcement) {
    if (!announcement ||
        typeof announcement.id !== 'string' ||
        announcement.id.length === 0 ||
        !Array.isArray(announcement.seats) ||
        announcement.seats.length === 0 ||
        announcement.seats.some(seat => seat !== 'player' && seat !== 'ai') ||
        lastShownSbarazzoAnnouncementId === announcement.id) {
        return;
    }
    lastShownSbarazzoAnnouncementId = announcement.id;

    const banner = document.getElementById('sbarazzo-announcement');
    const players = announcement.seats.map(seat => {
        return getSeatName(seat);
    });
    document.getElementById('sbarazzo-announcement-player').textContent =
        players.length === 2 ? `${players[0]} e ${players[1]}` : players[0];
    banner.hidden = false;
    setTimeout(() => {
        if (lastShownSbarazzoAnnouncementId === announcement.id) {
            banner.hidden = true;
        }
    }, SBARAZZO_ANNOUNCEMENT_DURATION);
}

async function finishSbarazzoAnnouncement(announcement) {
    showSbarazzoAnnouncement(announcement);
    await new Promise(resolve => setTimeout(resolve, SBARAZZO_ANNOUNCEMENT_DURATION));
    if (game.sbarazzoAnnouncement?.id !== announcement.id) return;

    game.isLocked = false;
    renderGameBoard();
    if (!game.multiplayer && game.turn === 'ai') setTimeout(aiPlay, 800);
}

export function playerPlay(cardIndex) {
    if (game.isLocked || game.turn !== game.localSeat) return;
    if (game.multiplayer && !game.multiplayerHost) {
        if (!sendMessage({ type: 'play', index: cardIndex })) {
            document.getElementById('turn-status').textContent = 'Connessione assente: impossibile inviare la mossa.';
            return;
        }
        game.isLocked = true;
        renderGameBoard();
        return;
    }
    executePlay(cardIndex, game.localSeat === 'player');
}

export function receiveRemotePlay(cardIndex) {
    if (!game.multiplayerHost || game.turn !== 'ai' || game.isLocked ||
        !Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= game.aHand.length) {
        document.getElementById('turn-status').textContent = 'Mossa non valida o fuori turno.';
        return;
    }
    executePlay(cardIndex, false);
}

function aiPlay() {
    let bestIndex = 0;
    for (let index = 0; index < game.aHand.length; index++) {
        if (findMatch(game.aHand[index], game.tableCards)) {
            bestIndex = index;
            break;
        }
    }
    executePlay(bestIndex, false);
}

let resolveCaptureChoice = null;

function renderGameBoard() {
    renderBoard(game.localSeat, playerPlay, selectCaptureCard, confirmCaptureChoice);
    publishState();
}

function publishState() {
    if (game.multiplayerHost) sendMessage({ type: 'state', state: getSnapshot() });
}

function getSnapshot() {
    const snapshot = JSON.parse(JSON.stringify(game));
    if (game.multiplayerHost) {
        snapshot.deck = snapshot.deck.map((_, index) => ({ id: `hidden-deck-${index}` }));
        if (!game.sbarazzoRevealedHands.includes('player')) {
            snapshot.pHand = snapshot.pHand.map((_, index) => ({ id: `hidden-hand-${index}` }));
        }
    }
    return snapshot;
}

export function applyRemoteState(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.deck) || !Array.isArray(snapshot.pHand) ||
        !Array.isArray(snapshot.aHand) || !Array.isArray(snapshot.tableCards) ||
        !Array.isArray(snapshot.sbarazzoRevealedHands) ||
        snapshot.sbarazzoRevealedHands.some(seat => seat !== 'player' && seat !== 'ai') ||
        !Number.isInteger(snapshot.sbarazzoPointsP) || snapshot.sbarazzoPointsP < 0 ||
        !Number.isInteger(snapshot.sbarazzoPointsA) || snapshot.sbarazzoPointsA < 0 ||
        typeof snapshot.playerName !== 'string' || snapshot.playerName.length > 20 ||
        typeof snapshot.aiName !== 'string' || snapshot.aiName.length > 20 ||
        !GAME_VARIANTS.includes(snapshot.gameVariant)) {
        return;
    }
    Object.assign(game, snapshot, { localSeat: 'ai', multiplayer: true, multiplayerHost: false });
    showSbarazzoAnnouncement(game.sbarazzoAnnouncement);
    renderBoard(game.localSeat, playerPlay, selectCaptureCard, confirmCaptureChoice);
}

function selectCaptureCard(cardId) {
    const choice = game.captureChoice;
    if (!choice || !choice.availableCardIds.includes(cardId)) return;

    const selected = new Set(choice.selectedIds);
    if (selected.has(cardId)) {
        selected.delete(cardId);
    } else {
        const card = game.tableCards.find(tableCard => tableCard.id === cardId);
        const selectedSum = game.tableCards
            .filter(tableCard => selected.has(tableCard.id))
            .reduce((sum, tableCard) => sum + tableCard.value, 0);
        if (!card || selectedSum + card.value > choice.targetValue) return;
        selected.add(cardId);
    }

    choice.selectedIds = [...selected];
    renderGameBoard();
}

function confirmCaptureChoice() {
    const choice = game.captureChoice;
    if (!choice) return;

    const selectedCards = game.tableCards.filter(card =>
        choice.selectedIds.includes(card.id)
    );
    const selectedSum = selectedCards.reduce((sum, card) => sum + card.value, 0);
    if (selectedSum !== choice.targetValue) return;

    if (game.multiplayer && !game.multiplayerHost) {
        sendMessage({ type: 'capture-confirm', selectedIds: choice.selectedIds });
        return;
    }
    if (!resolveCaptureChoice) return;

    game.captureChoice = null;
    const resolve = resolveCaptureChoice;
    resolveCaptureChoice = null;
    renderGameBoard();
    resolve(selectedCards);
}

export function receiveRemoteCapture(selectedIds) {
    const choice = game.captureChoice;
    if (!game.multiplayerHost || !choice || !Array.isArray(selectedIds) ||
        selectedIds.some(id => !choice.availableCardIds.includes(id))) {
        return;
    }

    const selectedCards = game.tableCards.filter(card => selectedIds.includes(card.id));
    const selectedSum = selectedCards.reduce((sum, card) => sum + card.value, 0);
    if (selectedSum !== choice.targetValue || selectedCards.length !== selectedIds.length) return;

    choice.selectedIds = [...selectedIds];
    confirmCaptureChoice();
}

function requestCaptureChoice(card) {
    return new Promise(resolve => {
        resolveCaptureChoice = resolve;
        game.captureChoice = {
            targetValue: card.value,
            availableCardIds: game.tableCards
                .filter(tableCard => tableCard.id !== card.id)
                .map(tableCard => tableCard.id),
            selectedIds: []
        };
        renderGameBoard();
    });
}

async function executePlay(cardIndex, isPlayer) {
    if (!Number.isInteger(cardIndex)) return;
    game.isLocked = true;
    const hand = isPlayer ? game.pHand : game.aHand;
    const handElement = document.getElementById(isPlayer ? 'player-hand' : 'ai-hand');
    const card = hand[cardIndex];
    if (!card) {
        game.isLocked = false;
        return;
    }
    const sourceCardElement = handElement.children[cardIndex];

    playCardSound();

    const temporaryTableSpot = document.createElement('div');
    temporaryTableSpot.className = 'card';
    temporaryTableSpot.style.visibility = 'hidden';
    document.getElementById('table').appendChild(temporaryTableSpot);

    if (!isPlayer) {
        sourceCardElement.className = 'card';
        const revealedCard = createCardElement(card);
        while (revealedCard.firstChild) {
            sourceCardElement.appendChild(revealedCard.firstChild);
        }
    }

    await animateElement(sourceCardElement, temporaryTableSpot, 400);

    hand.splice(cardIndex, 1);
    temporaryTableSpot.remove();

    const isFedericianAceMatch = game.gameVariant === 'sbarazzo' &&
        card.value === 1 &&
        game.tableCards.some(tableCard => tableCard.value === 1);
    const isFedericianAceSweep = game.gameVariant === 'sbarazzo' &&
        card.value === 1 &&
        game.tableCards.length > 0 &&
        !isFedericianAceMatch;
    let match = isFedericianAceSweep
        ? [...game.tableCards]
        : findMatch(card, game.tableCards);
    if (match) {
        const matchingValueOnTable = game.tableCards.some(tableCard => tableCard.value === card.value);
        if (!isFedericianAceSweep &&
            (isPlayer || game.multiplayer) &&
            !matchingValueOnTable &&
            hasMultipleSumMatches(card.value, game.tableCards)) {
            game.tableCards.push(card);
            renderGameBoard();
            match = await requestCaptureChoice(card);
        } else {
            game.tableCards.push(card);
            renderGameBoard();
        }

        await new Promise(resolve => setTimeout(resolve, 600));

        const tableElement = document.getElementById('table');
        const matchedCards = [card, ...match];
        game.pendingCaptureIds = matchedCards.map(matchedCard => matchedCard.id);
        renderGameBoard();
        await new Promise(resolve => setTimeout(resolve, CAPTURE_PREVIEW_DURATION));

        const elementsToAnimate = matchedCards
            .map(matchedCard => Array.from(tableElement.children)
                .find(child => child.id === `card-${matchedCard.id}`))
            .filter(Boolean);

        const targetPile = document.getElementById(isPlayer ? 'player-captures' : 'ai-captures');
        if (targetPile.children.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.className = 'card';
            targetPile.appendChild(placeholder);
        }

        playCardSound();
        await Promise.all(elementsToAnimate.map(element => animateElement(element, targetPile, 700)));
        game.pendingCaptureIds = [];

        for (const matchedCard of matchedCards) {
            const index = game.tableCards.findIndex(tableCard => tableCard.id === matchedCard.id);
            if (index > -1) game.tableCards.splice(index, 1);
        }

        const captures = isPlayer ? game.pCaptures : game.aCaptures;
        captures.push(...matchedCards);
        game.lastCapture = isPlayer ? 'player' : 'ai';

        if (isFedericianAceSweep ||
            (!isFedericianAceMatch &&
                game.tableCards.length === 0 &&
                (game.deck.length > 0 || game.pHand.length > 0 || game.aHand.length > 0))) {
            playScopaSound();
            if (isPlayer) {
                game.pScope++;
                game.scopaCardsP.push(card);
            } else {
                game.aScope++;
                game.scopaCardsA.push(card);
            }
        }
    } else {
        game.tableCards.push(card);
    }

    renderGameBoard();

    if (game.pHand.length === 0 && game.aHand.length === 0) {
        if (game.deck.length > 0) {
            const announcement = dealCards();
            game.turn = isPlayer ? 'ai' : 'player';
            if (announcement) {
                renderGameBoard();
                await finishSbarazzoAnnouncement(announcement);
                if (!game.multiplayer && game.turn === 'ai') setTimeout(aiPlay, 800);
            } else if (!game.multiplayer && game.turn === 'ai') {
                renderGameBoard();
                setTimeout(aiPlay, 800);
            } else {
                game.isLocked = false;
                renderGameBoard();
            }
        } else {
            if (game.tableCards.length > 0 && game.lastCapture) {
                const captures = game.lastCapture === 'player' ? game.pCaptures : game.aCaptures;
                captures.push(...game.tableCards);
                game.tableCards = [];
            }
            renderGameBoard();
            setTimeout(calculatePoints, 1000);
        }
    } else {
        game.turn = isPlayer ? 'ai' : 'player';
        if (!game.multiplayer && game.turn === 'ai') {
            renderGameBoard();
            setTimeout(aiPlay, 800);
        } else {
            game.isLocked = false;
            renderGameBoard();
        }
    }
}

function calculatePoints() {
    const score = calculateRoundScore(
        game.pCaptures,
        game.aCaptures,
        game.pScope,
        game.aScope,
        game.gameVariant,
        game.sbarazzoPointsP,
        game.sbarazzoPointsA
    );
    game.globalPScore += score.playerPoints;
    game.globalAScore += score.aiPoints;

    const result = createRoundResult(score);
    presentRoundResult(result, true);
    if (game.multiplayerHost) {
        sendMessage({ type: 'round-result', state: getSnapshot(), result });
    }
}

function createRoundResult(score) {
    const aiDenari = game.aCaptures.filter(card => card.suit === 'Denari').length;
    return {
        longCards: game.pCaptures.length > 20 ? 'player' :
            (game.aCaptures.length > 20 ? 'ai' : 'Nessuno'),
        denari: score.playerDenari > 5 ? 'player' :
            (aiDenari > 5 ? 'ai' : 'Nessuno'),
        settebello: score.playerSettebello ? 'player' : 'ai',
        dieciDenari: score.playerDieciDenari ? 'player' : 'ai',
        dueDenari: score.playerDueDenari ? 'player' : 'ai',
        primiera: score.playerPrimiera > score.aiPrimiera ? 'player' :
            (score.aiPrimiera > score.playerPrimiera ? 'ai' : 'Pari'),
        playerScope: game.pScope,
        aiScope: game.aScope,
        sbarazzoPlayerPoints: game.sbarazzoPointsP,
        sbarazzoAiPoints: game.sbarazzoPointsA,
        playerPoints: score.playerPoints,
        aiPoints: score.aiPoints,
        playerTotal: game.globalPScore,
        aiTotal: game.globalAScore,
        gameOver: isGameOver()
    };
}

function presentRoundResult(result, isController) {
    const scopeLabel = (side, value) => `${sideName(side)} (${value})`;
    const resultSideName = side => side === 'player' || side === 'ai' ? sideName(side) : side;
    const winner = result.playerTotal === result.aiTotal
        ? 'La partita è finita in pareggio.'
        : `Ha vinto ${sideName(result.playerTotal > result.aiTotal ? 'player' : 'ai')}.`;
    const content = `
        Carte Lunghe: ${resultSideName(result.longCards)}<br>
        Denari: ${resultSideName(result.denari)}<br>
        Settebello: ${resultSideName(result.settebello)}<br>
        ${game.gameVariant === 'sbarazzo' ? `
            Dieci di denari (+1): ${resultSideName(result.dieciDenari)}<br>
            Due di denari (-5): ${resultSideName(result.dueDenari)}<br>
            Punti SBARAZZO (+2/+3 coppia/+4 tris): ${scopeLabel('player', result.sbarazzoPlayerPoints)} - ${scopeLabel('ai', result.sbarazzoAiPoints)}<br>
        ` : ''}
        Primiera: ${resultSideName(result.primiera)}<br>
        Scope Fatte: ${scopeLabel('player', result.playerScope)} - ${scopeLabel('ai', result.aiScope)}<br><br>
        <b style="color:#ffd700;">Punti Round: ${sideName('player')} ${result.playerPoints} - ${sideName('ai')} ${result.aiPoints}</b><br>
        <b style="color:#00ff00;">Totale: ${sideName('player')} ${result.playerTotal} - ${sideName('ai')} ${result.aiTotal}</b>
        ${result.gameOver ? `<br><b>${game.multiplayer ? winner : getWinnerMessage()}</b>` : ''}
    `;
    game.isLocked = false;
    document.getElementById('overlay-content').innerHTML = content;
    document.getElementById('overlay').style.display = 'flex';

    const nextRoundButton = document.getElementById('next-round-btn');
    nextRoundButton.disabled = game.multiplayer && !isController;
    if (result.gameOver) {
        document.getElementById('overlay-title').innerText = 'PARTITA FINITA!';
        nextRoundButton.innerText = game.multiplayer && !isController ? 'Attendi l’host' : 'Nuova Partita';
        nextRoundButton.onclick = isController ? showModeSelection : null;
    } else {
        document.getElementById('overlay-title').innerText = 'Fine Smazzata';
        nextRoundButton.innerText = game.multiplayer && !isController ? 'Attendi l’host' : 'Continua';
        nextRoundButton.onclick = isController ? nextRound : null;
    }
}

export function showRemoteRoundResult(result) {
    if (!game.multiplayer || game.multiplayerHost || !isValidRoundResult(result)) return;
    presentRoundResult(result, false);
}

function isValidRoundResult(result) {
    const resultNames = ['player', 'ai', 'Nessuno', 'Pari'];
    const nonNegativeNumberFields = [
        'playerScope',
        'aiScope',
        'sbarazzoPlayerPoints',
        'sbarazzoAiPoints'
    ];
    const signedNumberFields = ['playerPoints', 'aiPoints', 'playerTotal', 'aiTotal'];
    return result && typeof result === 'object' &&
        ['longCards', 'denari', 'settebello', 'dieciDenari', 'dueDenari', 'primiera']
            .every(field => resultNames.includes(result[field])) &&
        nonNegativeNumberFields.every(field => Number.isInteger(result[field]) && result[field] >= 0) &&
        signedNumberFields.every(field => Number.isInteger(result[field])) &&
        typeof result.gameOver === 'boolean';
}

function sideName(side) {
    return escapeHtml(getSeatName(side));
}

function getSeatName(seat) {
    return seat === 'player' ? game.playerName : game.aiName;
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function isGameOver() {
    return game.matchMode === 'single' ||
        game.globalPScore >= game.matchTarget ||
        game.globalAScore >= game.matchTarget;
}

function getWinnerMessage() {
    if (game.globalPScore === game.globalAScore) return 'La partita è finita in pareggio.';
    return `Ha vinto ${sideName(game.globalPScore > game.globalAScore ? 'player' : 'ai')}.`;
}

function showModeSelection() {
    if (game.multiplayerHost) {
        sendMessage({ type: 'session-ended' });
        disconnectNetwork();
    }
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('game-board').classList.add('is-hidden');
    document.getElementById('mode-selection').style.display = 'flex';
}

function nextRound() {
    if (game.multiplayer && !game.multiplayerHost) return;
    document.getElementById('overlay').style.display = 'none';
    game.dealer = game.dealer === 'player' ? 'ai' : 'player';
    startRound();
}
