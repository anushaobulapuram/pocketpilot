import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { useContext } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import Dashboard from './pages/Dashboard/Dashboard';
import Transactions from './pages/Transactions/Transactions';
import GoalSetup from './pages/Goals/GoalSetup';
import Profile from './pages/Profile/Profile';
import Settings from './pages/Settings/Settings';
import About from './pages/Help/About';
import BudgetPlanner from './pages/BudgetPlanner/BudgetPlanner';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="flex justify-center items-center h-screen text-xl text-blue-600">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
};

function AppContent() {
  const { user, loading } = useContext(AuthContext);
  return (
    <Router>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        {user && !loading && <Sidebar />}

        {/* Main Content Area: Offset by sidebar width (w-64 = 16rem) if user is logged in */}
        <div className={`flex-1 flex flex-col min-h-screen transition-all ${user && !loading ? 'ml-64' : ''}`}>
          {user && !loading && <Navbar />}
          <main className="p-8 flex-1 w-full max-w-7xl mx-auto">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
              <Route path="/goals" element={<ProtectedRoute><GoalSetup /></ProtectedRoute>} />
              <Route path="/budget-planner" element={<ProtectedRoute><BudgetPlanner /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
            </Routes>
          </main>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
