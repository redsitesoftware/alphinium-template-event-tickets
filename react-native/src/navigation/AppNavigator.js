import React from 'react';
import { useStore } from '../store/ticketStore';
import HomeScreen from '../screens/HomeScreen';
import EventScreen from '../screens/EventScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import TicketScreen from '../screens/TicketScreen';
import ScannerScreen from '../screens/ScannerScreen';

export default function AppNavigator() {
  const { state } = useStore();
  switch (state.phase) {
    case 'event':    return <EventScreen />;
    case 'checkout': return <CheckoutScreen />;
    case 'ticket':   return <TicketScreen />;
    case 'scanner':  return <ScannerScreen />;
    default:         return <HomeScreen />;
  }
}
