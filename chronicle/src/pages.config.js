import Journal from './pages/Journal';
import Settings from './pages/Settings';
import Insights from './pages/Insights';
import AIChat from './pages/AIChat';
import Journey from './pages/Journey';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Journal": Journal,
    "Settings": Settings,
    "Insights": Insights,
    "AIChat": AIChat,
    "Journey": Journey,
}

export const pagesConfig = {
    mainPage: "Journal",
    Pages: PAGES,
    Layout: __Layout,
};