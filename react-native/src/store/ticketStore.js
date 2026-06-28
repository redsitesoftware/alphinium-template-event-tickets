import React, { createContext, useContext, useReducer } from 'react';

export const EVENTS = [
  { id: 'e1', name: 'Neon Nights Festival', emoji: '🎆', category: 'Festival', date: '2026-06-21', time: '6:00 PM', venue: 'Centennial Park, Sydney', capacity: 5000, sold: 3847, color: '#7C3AED', accent: '#A78BFA', hasSeatMap: true, tickets: [
    { type: 'GA', label: 'General Admission', price: 49, available: 800 },
    { type: 'VIP', label: 'VIP Lounge Access', price: 129, available: 120 },
    { type: 'VVIP', label: 'Artist Backstage Pass', price: 299, available: 15 },
  ]},
  { id: 'e2', name: 'TechSummit 2026', emoji: '💡', category: 'Conference', date: '2026-07-10', time: '9:00 AM', venue: 'ICC Sydney Convention Centre', capacity: 2000, sold: 1432, color: '#0EA5E9', accent: '#38BDF8', tickets: [
    { type: 'STD', label: 'Standard Pass', price: 299, available: 400 },
    { type: 'PRO', label: 'Pro Pass (all workshops)', price: 599, available: 100 },
    { type: 'ENT', label: 'Enterprise Table (10 seats)', price: 2499, available: 12 },
  ]},
  { id: 'e3', name: 'Comedy Night Live', emoji: '😂', category: 'Comedy', date: '2026-06-14', time: '8:00 PM', venue: 'The Enmore Theatre', capacity: 600, sold: 581, color: '#F59E0B', accent: '#FCD34D', hasSeatMap: true, tickets: [
    { type: 'STD', label: 'Standard Seat', price: 35, available: 12 },
    { type: 'PREM', label: 'Premium Front Row', price: 65, available: 7 },
  ]},
  { id: 'e4', name: 'Jazz Under the Stars', emoji: '🎷', category: 'Music', date: '2026-06-28', time: '7:30 PM', venue: 'Royal Botanic Gardens', capacity: 800, sold: 612, color: '#065F46', accent: '#34D399', tickets: [
    { type: 'GA', label: 'Lawn Pass', price: 42, available: 150 },
    { type: 'TABLE', label: 'Reserved Table (4 seats)', price: 199, available: 24 },
  ]},
  { id: 'e5', name: 'AI & The Future', emoji: '🤖', category: 'Keynote', date: '2026-07-03', time: '2:00 PM', venue: 'Town Hall, Melbourne', capacity: 1200, sold: 988, color: '#DC2626', accent: '#F87171', hasSeatMap: true, tickets: [
    { type: 'STD', label: 'General Admission', price: 89, available: 200 },
    { type: 'STREAM', label: 'Live Stream Access', price: 19, available: 9999 },
  ]},
];

const initialState = {
  phase: 'home',   // home | event | seatPicker | checkout | ticket | scanner
  selectedEvent: null,
  selectedTicket: null,
  selectedSection: null,     // section ID chosen in SeatPickerScreen
  reservationId: null,       // active reservation hold ID
  reservationExpiry: null,   // Unix ms timestamp when hold expires
  qty: 1,
  wallet: [
    // Pre-populated demo ticket
    { id: 'w1', eventId: 'e1', type: 'GA', qty: 2, totalPaid: 98, qrCode: 'QR-NEON-GA-2841', purchasedAt: '2026-05-15' },
  ],
  scanMode: false,
  scanned: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'VIEW_EVENT':
      return { ...state, phase: 'event', selectedEvent: action.eventId, selectedTicket: null, selectedSection: null, reservationId: null, reservationExpiry: null, qty: 1 };
    case 'SELECT_TICKET':
      return { ...state, selectedTicket: action.ticketType };
    case 'SET_QTY':
      return { ...state, qty: action.qty };
    case 'GO_SEAT_PICKER':
      return { ...state, phase: 'seatPicker' };
    case 'SELECT_SECTION':
      return { ...state, selectedSection: action.sectionId };
    case 'SET_RESERVATION':
      return {
        ...state,
        reservationId: action.reservationId,
        reservationExpiry: action.expiresAt,
      };
    case 'CLEAR_RESERVATION':
      return { ...state, reservationId: null, reservationExpiry: null, selectedSection: null };
    case 'GO_CHECKOUT':
      return { ...state, phase: 'checkout' };
    case 'CONFIRM_PURCHASE': {
      const event = EVENTS.find(e => e.id === state.selectedEvent);
      const ticket = event?.tickets.find(t => t.type === state.selectedTicket);
      const total = (ticket?.price || 0) * state.qty;
      const newTicket = {
        id: 'w' + Date.now(),
        eventId: state.selectedEvent,
        type: state.selectedTicket,
        section: state.selectedSection,
        qty: state.qty,
        totalPaid: total,
        qrCode: 'QR-' + state.selectedEvent.toUpperCase() + '-' + state.selectedTicket + '-' + Math.floor(Math.random() * 9000 + 1000),
        purchasedAt: new Date().toISOString().split('T')[0],
      };
      return {
        ...state,
        wallet: [newTicket, ...state.wallet],
        phase: 'ticket',
        selectedTicket: newTicket.id,
        reservationId: null,
        reservationExpiry: null,
      };
    }
    case 'VIEW_TICKET':
      return { ...state, phase: 'ticket', selectedTicket: action.ticketId };
    case 'GO_SCANNER':
      return { ...state, phase: 'scanner', scanned: null };
    case 'SIMULATE_SCAN':
      return { ...state, scanned: state.wallet[0] };
    case 'BACK':
      if (state.phase === 'checkout') return { ...state, phase: 'seatPicker' };
      if (state.phase === 'seatPicker') return { ...state, phase: 'event', selectedSection: null, reservationId: null, reservationExpiry: null };
      return { ...state, phase: 'home', scanned: null };
    case 'GO_HOME':
      return { ...state, phase: 'home', selectedEvent: null, selectedTicket: null, selectedSection: null, reservationId: null, reservationExpiry: null, scanned: null };
    default:
      return state;
  }
}

const StoreCtx = createContext(null);
export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <StoreCtx.Provider value={{ state, dispatch }}>{children}</StoreCtx.Provider>;
}
export const useStore = () => useContext(StoreCtx);
