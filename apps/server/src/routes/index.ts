import { Express } from 'express';
import { companiesRouter } from './companies';
import { productsRouter } from './products';
import { materialsRouter } from './materials';
import { inventoryRouter } from './inventory';
import { bomRouter } from './bom';
import { requestsRouter } from './requests';
import { schedulesRouter } from './schedules';
import { approvalsRouter } from './approvals';
import { notificationsRouter } from './notifications';
import { uploadsRouter } from './uploads';
import { usersRouter } from './users';
import ecountRoutes from './ecountRoutes';
import ecountPythonRoutes from './ecountPythonRoutes';
import orderPlansRouter from './orderPlans';
import activityLogsRouter from './activityLogs';
import changesRouter from './changes';
import dashboardRouter from './dashboard';

export const setupRoutes = (app: Express) => {
  app.use('/api/companies', companiesRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/materials', materialsRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/bom', bomRouter);
  app.use('/api/requests', requestsRouter);
  app.use('/api/schedules', schedulesRouter);
  app.use('/api/approvals', approvalsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/ecount', ecountRoutes);
  app.use('/api/ecount-python', ecountPythonRoutes);
  app.use('/api/order-plans', orderPlansRouter);
  app.use('/api/activity-logs', activityLogsRouter);
  app.use('/api/changes', changesRouter);
  app.use('/api/dashboard', dashboardRouter);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
};