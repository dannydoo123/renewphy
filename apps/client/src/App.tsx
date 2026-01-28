import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MaterialDashboard from './pages/MaterialDashboard';
import ScheduleView from './pages/ScheduleView';
import PurchaseOrders from './pages/PurchaseOrders';
import Notifications from './pages/Notifications';
import { ScheduleProvider } from './contexts/ScheduleContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ScheduleProvider>
        <Router>
          <div className="App">
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/schedule" element={<ScheduleView />} />
                <Route path="/materials" element={<MaterialDashboard />} />
                <Route path="/purchase-orders" element={<PurchaseOrders />} />
                <Route path="/notifications" element={<Notifications />} />
              </Routes>
            </Layout>
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
          </div>
        </Router>
      </ScheduleProvider>
    </QueryClientProvider>
  );
}

export default App;