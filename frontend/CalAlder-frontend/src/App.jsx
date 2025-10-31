import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
// import './App.css'



// Injecting context providers
import { GoogleAPIContextProvider } from './context/GoogleAPIContext';
import { EventExtractionProvider } from './context/EventExtractionContext';

//importing components
import Popup from './popup/Popup'

function App() {
  return (
    <GoogleAPIContextProvider>
      <EventExtractionProvider>
        <Popup />
      </EventExtractionProvider>
    </GoogleAPIContextProvider>
  )
}

export default App
