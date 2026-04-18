import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Customer from './pages/Customer';
import Admin from './pages/Admin';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Customer />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
}
