import './App.css'
import { Routes, Route} from 'react-router-dom';
import { SignUp } from './components/signup'
import { ShopDisplay } from './components/shopdisplay';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<ShopDisplay />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/shopdisplay" element={<ShopDisplay />} />
      </Routes>
    </>
  )
}

export default App
