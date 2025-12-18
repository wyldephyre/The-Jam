import { Routes, Route } from 'react-router-dom';
import Gate from './pages/Gate';
import Hub from './pages/Hub';
import Admin from './pages/Admin';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Gate />} />
      <Route path="/hub" element={<Hub />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  );
}

export default App;

