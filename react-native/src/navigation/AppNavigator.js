import React from 'react';
import { useStore } from '../store/ticketStore';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import EventScreen from '../screens/EventScreen';
import SeatPickerScreen from '../screens/SeatPickerScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import TicketScreen from '../screens/TicketScreen';
import ScannerScreen from '../screens/ScannerScreen';

export default function AppNavigator() {
  const { state, dispatch } = useStore();
  if (state.phase === 'login') return <LoginScreen onLogin={() => dispatch({ type: 'COMPLETE_LOGIN' })} />;
  switch (state.phase) {
    case 'event':      return <EventScreen />;
    case 'seatPicker': return <SeatPickerScreen />;
    case 'checkout':   return <CheckoutScreen />;
    case 'ticket':     return <TicketScreen />;
    case 'scanner':    return <ScannerScreen />;
    default:           return <HomeScreen />;
  }
}
