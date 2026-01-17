import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Routes, Route} from 'react-router-dom';
import { MakeShop } from './components/makeshop'
import { SignUp } from './components/signup'
import { ShopDisplay } from './components/shopdisplay';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<SignUp />} />
        <Route path="/makeshop" element={<MakeShop />} />
        <Route path="/shopdisplay" element={<ShopDisplay />} />
      </Routes>
    </>
  )
}

export default App
