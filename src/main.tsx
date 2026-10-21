import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app';
import './styles/theme.css';
import './styles/base.css';
import './styles/storefront.css';
import './styles/commerce.css';
import './styles/account.css';
import './styles/refinements.css';
import './styles/custom-home.css';
import './styles/studio.css';
import './styles/custom-commerce.css';
import './styles/studio-assistance.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
