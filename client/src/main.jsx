import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><App /><Toaster position="bottom-right" toastOptions={{ style: { background: '#171e29', color: '#e8edf4', border: '1px solid #293342' } }} /></BrowserRouter></React.StrictMode>);
