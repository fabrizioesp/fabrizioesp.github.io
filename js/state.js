export const suits = ['Denari', 'Coppe', 'Spade', 'Bastoni'];
export const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const primieraValues = {
    7: 21,
    6: 18,
    1: 16,
    5: 15,
    4: 14,
    3: 13,
    2: 12,
    8: 10,
    9: 10,
    10: 10
};

export const game = {
    deck: [],
    tableCards: [],
    pHand: [],
    aHand: [],
    pCaptures: [],
    aCaptures: [],
    scopaCardsP: [],
    scopaCardsA: [],
    pScope: 0,
    aScope: 0,
    globalPScore: 0,
    globalAScore: 0,
    matchMode: null,
    matchTarget: null,
    dealer: 'player',
    turn: 'ai',
    lastCapture: null,
    captureChoice: null,
    isLocked: false,
    multiplayer: false,
    multiplayerHost: false,
    localSeat: 'player'
};
