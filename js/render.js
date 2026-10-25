import { createCardElement } from './cards.js';
import { game } from './state.js';

export function renderBoard(localSeat, onPlayerPlay, onTableCardSelect, onConfirmCapture) {
    document.getElementById('p-score').innerText = game.globalPScore;
    document.getElementById('a-score').innerText = game.globalAScore;
    document.getElementById('p-score-label').innerText = game.multiplayer ? (localSeat === 'player' ? 'Tu' : 'Avversario') : 'Tu';
    document.getElementById('a-score-label').innerText = game.multiplayer ? (localSeat === 'ai' ? 'Tu' : 'Avversario') : 'IA';
    const deckPile = document.getElementById('deck-pile');
    deckPile.className = `card card-back ${game.dealer === 'player' ? 'deck-dealer-player' : 'deck-dealer-ai'}`;
    deckPile.style.display = game.deck.length === 0 ? 'none' : 'block';
    const turnStatus = document.getElementById('turn-status');
    turnStatus.textContent = game.isLocked
        ? (game.captureChoice ? 'Scegli la presa' : 'Giocata in corso...')
        : game.turn === localSeat ? 'Tocca a te' : game.multiplayer ? 'Tocca all’avversario' : 'Turno IA';
    document.getElementById('game-variant-status').textContent =
        game.gameVariant === 'sbarazzo' ? 'Sbarazzo Federiciano' : 'Scopa classica';

    const table = document.getElementById('table');
    table.innerHTML = '';
    game.tableCards.forEach(card => {
        const element = createCardElement(card);
        if (game.pendingCaptureIds.includes(card.id)) {
            element.classList.add('capture-pending');
        }
        const captureChoice = game.captureChoice;
        if (captureChoice?.availableCardIds.includes(card.id)) {
            element.classList.add('capture-selectable');
            if (captureChoice.selectedIds.includes(card.id)) {
                element.classList.add('capture-selected');
            }
            element.onclick = () => onTableCardSelect(card.id);
        }
        table.appendChild(element);
    });

    renderCaptureControls(onConfirmCapture);

    const localHand = document.getElementById('player-hand');
    const opponentHand = document.getElementById('ai-hand');
    const cardsInLocalHand = localSeat === 'player' ? game.pHand : game.aHand;
    const cardsInOpponentHand = localSeat === 'player' ? game.aHand : game.pHand;
    const opponentSeat = localSeat === 'player' ? 'ai' : 'player';
    localHand.innerHTML = '';
    cardsInLocalHand.forEach((card, index) => {
        const element = createCardElement(card);
        element.onclick = () => onPlayerPlay(index);
        if (game.turn !== localSeat || game.isLocked) element.style.cursor = 'default';
        localHand.appendChild(element);
    });

    opponentHand.innerHTML = '';
    cardsInOpponentHand.forEach(card => {
        const isRevealed = game.sbarazzoRevealedHands.includes(opponentSeat);
        opponentHand.appendChild(createCardElement(isRevealed ? card : null, !isRevealed));
    });

    renderCaptures();
}

function renderCaptureControls(onConfirmCapture) {
    const controls = document.getElementById('capture-controls');
    const instructions = document.getElementById('capture-instructions');
    const confirmButton = document.getElementById('confirm-capture-btn');
    const captureChoice = game.captureChoice;

    controls.hidden = !captureChoice;
    if (!captureChoice) return;

    const selectedCards = game.tableCards.filter(card =>
        captureChoice.selectedIds.includes(card.id)
    );
    const selectedSum = selectedCards.reduce((sum, card) => sum + card.value, 0);
    instructions.textContent =
        `Scegli le carte che sommano ${captureChoice.targetValue}. Selezionate: ${selectedSum}/${captureChoice.targetValue}`;
    confirmButton.disabled = selectedSum !== captureChoice.targetValue;
    confirmButton.onclick = onConfirmCapture;
}

function renderCaptures() {
    renderCapturePile(
        'player-captures',
        game.pCaptures,
        game.sbarazzoPointsP,
        game.scopaCardsP
    );
    renderCapturePile(
        'ai-captures',
        game.aCaptures,
        game.sbarazzoPointsA,
        game.scopaCardsA
    );
}

function renderCapturePile(elementId, captures, sbarazzoPoints, scopaCards) {
    const pile = document.getElementById(elementId);
    pile.innerHTML = '';
    if (captures.length === 0) return;

    pile.appendChild(createCardElement(null, true));
    const sbarazzoCards = captures.slice(0, sbarazzoPoints);
    sbarazzoCards.forEach((card, index) => {
        const element = createCardElement(card);
        element.className = 'scopa-card sbarazzo-point-card';
        element.title = 'Carta scoperta per i punti SBARAZZO';
        element.style.right = `${-25 - (index * 20)}px`;
        pile.appendChild(element);
    });
    scopaCards.forEach((card, index) => {
        const element = createCardElement(card);
        element.className = 'scopa-card';
        element.style.right = `${-25 - ((sbarazzoCards.length + index) * 20)}px`;
        pile.appendChild(element);
    });
}
