import React from 'react';
import ContestManager from './components/ContestManager';
import MondayAuth from './components/MondayAuth';
import './App.css';

function App() {
  return (
    <div className="App">
      <MondayAuth>
        <ContestManager />
      </MondayAuth>
    </div>
  );
}

export default App;