import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME;
const JWT_SECRET = process.env.JWT_SECRET;

// Validate required environment variables
if (!MONGO_URL) {
  console.error('FATAL: MONGO_URL environment variable is not set');
}
if (!DB_NAME) {
  console.error('FATAL: DB_NAME environment variable is not set');
}
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
}

let cachedClient = null;
let cachedDb = null;

async function getDb() {
  if (!MONGO_URL || !DB_NAME) {
    throw new Error('Database configuration missing. Check MONGO_URL and DB_NAME environment variables.');
  }
  if (cachedDb) return cachedDb;
  if (!cachedClient) {
    cachedClient = new MongoClient(MONGO_URL);
    await cachedClient.connect();
  }
  cachedDb = cachedClient.db(DB_NAME);
  return cachedDb;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

function createToken(payload) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  const data = JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const encoded = Buffer.from(data).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function verifyToken(token) {
  if (!JWT_SECRET) {
    console.error('JWT_SECRET is not configured');
    return null;
  }
  try {
    const [encoded, signature] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(encoded).digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function getUser(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7));
}

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

// Helper: resolve effective org ID based on role
function getOrgId(user, request) {
  if (user.role === 'super_admin') {
    const url = new URL(request.url);
    return url.searchParams.get('organizationId') || null;
  }
  return user.organizationId;
}

// Helper: date range filter
function getDateFilter(request, field = 'createdAt') {
  const url = new URL(request.url);
  const dateRange = url.searchParams.get('dateRange');
  if (!dateRange || dateRange === 'all') return {};
  const now = new Date();
  let start;
  switch (dateRange) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      return {};
  }
  return { [field]: { $gte: start } };
}

// ============ AUTH ============
async function handleAuth(request, action, method) {
  if (method === 'POST' && action === 'register') {
    const db = await getDb();
    const { email, password, name, organizationName } = await request.json();
    if (!email || !password || !name || !organizationName) return json({ error: 'All fields required' }, 400);
    const existing = await db.collection('users').findOne({ email });
    if (existing) return json({ error: 'Email already registered' }, 400);
    const orgId = uuidv4();
    const userId = uuidv4();
    await db.collection('organizations').insertOne({ id: orgId, name: organizationName, createdAt: new Date() });
    await db.collection('users').insertOne({
      id: userId, email, password: hashPassword(password), name,
      role: 'admin', organizationId: orgId, createdAt: new Date()
    });
    const token = createToken({ id: userId, email, name, role: 'admin', organizationId: orgId });
    return json({ token, user: { id: userId, email, name, role: 'admin', organizationId: orgId, organizationName } });
  }
  if (method === 'POST' && action === 'login') {
    const db = await getDb();
    const { email, password } = await request.json();
    const user = await db.collection('users').findOne({ email });
    if (!user || !verifyPassword(password, user.password)) return json({ error: 'Invalid credentials' }, 401);
    const org = await db.collection('organizations').findOne({ id: user.organizationId });
    const token = createToken({ id: user.id, email: user.email, name: user.name, role: user.role, organizationId: user.organizationId });
    return json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, organizationId: user.organizationId, organizationName: org?.name } });
  }
  if (method === 'GET' && action === 'me') {
    const user = getUser(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const db = await getDb();
    const dbUser = await db.collection('users').findOne({ id: user.id });
    if (!dbUser) return json({ error: 'User not found' }, 404);
    const org = await db.collection('organizations').findOne({ id: dbUser.organizationId });
    return json({ user: { 
      id: dbUser.id, email: dbUser.email, name: dbUser.name, role: dbUser.role, 
      organizationId: dbUser.organizationId, organizationName: org?.name,
      designation: dbUser.designation || '', department: dbUser.department || '',
      phone: dbUser.phone || '', createdAt: dbUser.createdAt
    }});
  }
  // Update profile
  if (method === 'PUT' && action === 'profile') {
    const user = getUser(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const db = await getDb();
    const data = await request.json();
    const updateFields = { updatedAt: new Date() };
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.designation !== undefined) updateFields.designation = data.designation;
    if (data.department !== undefined) updateFields.department = data.department;
    if (data.phone !== undefined) updateFields.phone = data.phone;
    // Email change requires uniqueness check
    if (data.email !== undefined && data.email !== user.email) {
      const existing = await db.collection('users').findOne({ email: data.email });
      if (existing) return json({ error: 'Email already in use' }, 400);
      updateFields.email = data.email;
    }
    await db.collection('users').updateOne({ id: user.id }, { $set: updateFields });
    const dbUser = await db.collection('users').findOne({ id: user.id });
    const org = await db.collection('organizations').findOne({ id: dbUser.organizationId });
    // Generate new token if email changed
    const token = createToken({ id: dbUser.id, email: dbUser.email, name: dbUser.name, role: dbUser.role, organizationId: dbUser.organizationId });
    return json({ 
      token, 
      user: { 
        id: dbUser.id, email: dbUser.email, name: dbUser.name, role: dbUser.role, 
        organizationId: dbUser.organizationId, organizationName: org?.name,
        designation: dbUser.designation || '', department: dbUser.department || '',
        phone: dbUser.phone || ''
      }
    });
  }
  // Change password
  if (method === 'PUT' && action === 'password') {
    const user = getUser(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const db = await getDb();
    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword) return json({ error: 'Current and new password required' }, 400);
    if (newPassword.length < 6) return json({ error: 'New password must be at least 6 characters' }, 400);
    const dbUser = await db.collection('users').findOne({ id: user.id });
    if (!dbUser) return json({ error: 'User not found' }, 404);
    if (!verifyPassword(currentPassword, dbUser.password)) return json({ error: 'Current password is incorrect' }, 401);
    await db.collection('users').updateOne({ id: user.id }, { $set: { password: hashPassword(newPassword), updatedAt: new Date() } });
    return json({ success: true, message: 'Password updated successfully' });
  }
  return json({ error: 'Not found' }, 404);
}

// ============ ORGANIZATIONS ============
async function handleOrganizations(request, id, method) {
  const user = getUser(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const db = await getDb();

  if (method === 'GET' && !id) {
    if (user.role === 'super_admin') {
      const orgs = await db.collection('organizations').find({}).sort({ createdAt: -1 }).toArray();
      return json({ organizations: orgs });
    }
    const org = await db.collection('organizations').findOne({ id: user.organizationId });
    return json({ organizations: org ? [org] : [] });
  }
  if (method === 'GET' && id) {
    const org = await db.collection('organizations').findOne({ id });
    if (!org) return json({ error: 'Organization not found' }, 404);
    return json({ organization: org });
  }
  if (method === 'POST') {
    if (user.role !== 'super_admin') return json({ error: 'Super Admin only' }, 403);
    const data = await request.json();
    if (!data.name) return json({ error: 'Organization name required' }, 400);
    const org = { id: uuidv4(), name: data.name, industry: data.industry || '', address: data.address || '', phone: data.phone || '', createdAt: new Date() };
    await db.collection('organizations').insertOne(org);
    await db.collection('activity_logs').insertOne({ id: uuidv4(), organizationId: org.id, userId: user.id, userName: user.name, action: 'created', entityType: 'organization', entityId: org.id, details: `Created organization "${org.name}"`, createdAt: new Date() });
    return json({ organization: org }, 201);
  }
  if (method === 'PUT' && id) {
    if (user.role !== 'super_admin') return json({ error: 'Super Admin only' }, 403);
    const data = await request.json();
    const upd = {};
    if (data.name !== undefined) upd.name = data.name;
    if (data.industry !== undefined) upd.industry = data.industry;
    if (data.address !== undefined) upd.address = data.address;
    if (data.phone !== undefined) upd.phone = data.phone;
    upd.updatedAt = new Date();
    await db.collection('organizations').updateOne({ id }, { $set: upd });
    const org = await db.collection('organizations').findOne({ id });
    return json({ organization: org });
  }
  if (method === 'DELETE' && id) {
    if (user.role !== 'super_admin') return json({ error: 'Super Admin only' }, 403);
    const delOrg = await db.collection('organizations').findOne({ id });
    await db.collection('organizations').deleteOne({ id });
    await db.collection('activity_logs').insertOne({ id: uuidv4(), organizationId: id, userId: user.id, userName: user.name, action: 'deleted', entityType: 'organization', entityId: id, details: `Deleted organization "${delOrg?.name || id}"`, createdAt: new Date() });
    return json({ success: true });
  }
  return json({ error: 'Not found' }, 404);
}

// ============ CLIENTS ============
async function handleClients(request, id, method) {
  const user = getUser(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const db = await getDb();
  const orgId = getOrgId(user, request);

  if (method === 'GET' && !id) {
    const filter = orgId ? { organizationId: orgId } : {};
    const clients = await db.collection('clients').find(filter).sort({ createdAt: -1 }).toArray();
    return json({ clients });
  }
  if (method === 'GET' && id) {
    const filter = { id };
    if (orgId) filter.organizationId = orgId;
    const client = await db.collection('clients').findOne(filter);
    if (!client) return json({ error: 'Client not found' }, 404);
    return json({ client });
  }
  if (method === 'POST') {
    if (user.role === 'team_member') return json({ error: 'Not authorized' }, 403);
    const data = await request.json();
    const targetOrg = orgId || user.organizationId;
    const client = {
      id: uuidv4(), organizationId: targetOrg, name: data.name,
      contactPerson: data.contactPerson || '', email: data.email || '', phone: data.phone || '',
      industry: data.industry || '', status: 'active', createdAt: new Date()
    };
    await db.collection('clients').insertOne(client);
    await db.collection('activity_logs').insertOne({ id: uuidv4(), organizationId: targetOrg, userId: user.id, userName: user.name, action: 'created', entityType: 'client', entityId: client.id, details: `Created client "${client.name}"`, createdAt: new Date() });
    return json({ client }, 201);
  }
  if (method === 'PUT' && id) {
    const data = await request.json();
    const updateFields = {};
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.contactPerson !== undefined) updateFields.contactPerson = data.contactPerson;
    if (data.email !== undefined) updateFields.email = data.email;
    if (data.phone !== undefined) updateFields.phone = data.phone;
    if (data.industry !== undefined) updateFields.industry = data.industry;
    if (data.status !== undefined) updateFields.status = data.status;
    updateFields.updatedAt = new Date();
    const filter = { id };
    if (orgId) filter.organizationId = orgId;
    await db.collection('clients').updateOne(filter, { $set: updateFields });
    const client = await db.collection('clients').findOne({ id });
    await db.collection('activity_logs').insertOne({ id: uuidv4(), organizationId: client?.organizationId || orgId, userId: user.id, userName: user.name, action: 'modified', entityType: 'client', entityId: id, details: `Modified client "${client?.name}"`, createdAt: new Date() });
    return json({ client });
  }
  if (method === 'DELETE' && id) {
    if (user.role === 'team_member') return json({ error: 'Not authorized' }, 403);
    const delClient = await db.collection('clients').findOne({ id });
    await db.collection('clients').deleteOne({ id });
    await db.collection('activity_logs').insertOne({ id: uuidv4(), organizationId: delClient?.organizationId || orgId, userId: user.id, userName: user.name, action: 'deleted', entityType: 'client', entityId: id, details: `Deleted client "${delClient?.name || id}"`, createdAt: new Date() });
    return json({ success: true });
  }
  return json({ error: 'Not found' }, 404);
}

// ============ SERVICES ============
async function handleServices(request, id, method) {
  const user = getUser(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const db = await getDb();
  const orgId = getOrgId(user, request);

  if (method === 'GET' && !id) {
    const filter = orgId ? { organizationId: orgId } : {};
    const services = await db.collection('service_catalog').find(filter).sort({ createdAt: -1 }).toArray();
    return json({ services });
  }
  if (method === 'POST') {
    if (user.role === 'team_member') return json({ error: 'Not authorized' }, 403);
    const data = await request.json();
    const targetOrg = orgId || user.organizationId;
    const service = {
      id: uuidv4(), organizationId: targetOrg, name: data.name,
      defaultRate: Number(data.defaultRate) || 0, description: data.description || '', createdAt: new Date()
    };
    await db.collection('service_catalog').insertOne(service);
    await db.collection('activity_logs').insertOne({ id: uuidv4(), organizationId: targetOrg, userId: user.id, userName: user.name, action: 'created', entityType: 'service', entityId: service.id, details: `Created service "${service.name}" at ${service.defaultRate} BDT`, createdAt: new Date() });
    return json({ service }, 201);
  }
  if (method === 'PUT' && id) {
    const data = await request.json();
    const updateFields = {};
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.defaultRate !== undefined) updateFields.defaultRate = Number(data.defaultRate);
    if (data.description !== undefined) updateFields.description = data.description;
    updateFields.updatedAt = new Date();
    await db.collection('service_catalog').updateOne({ id }, { $set: updateFields });
    const service = await db.collection('service_catalog').findOne({ id });
    await db.collection('activity_logs').insertOne({ id: uuidv4(), organizationId: service?.organizationId || orgId, userId: user.id, userName: user.name, action: 'modified', entityType: 'service', entityId: id, details: `Modified service "${service?.name}"`, createdAt: new Date() });
    return json({ service });
  }
  if (method === 'DELETE' && id) {
    if (user.role === 'team_member') return json({ error: 'Not authorized' }, 403);
    const delSvc = await db.collection('service_catalog').findOne({ id });
    await db.collection('service_catalog').deleteOne({ id });
    await db.collection('activity_logs').insertOne({ id: uuidv4(), organizationId: delSvc?.organizationId || orgId, userId: user.id, userName: user.name, action: 'deleted', entityType: 'service', entityId: id, details: `Deleted service "${delSvc?.name || id}"`, createdAt: new Date() });
    return json({ success: true });
  }
  return json({ error: 'Not found' }, 404);
}

// ============ CAMPAIGNS ============
async function handleCampaigns(request, id, method) {
  const user = getUser(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const db = await getDb();
  const orgId = getOrgId(user, request);
  const dateFilter = getDateFilter(request);

  if (method === 'GET' && !id) {
    let filter = {};
    if (orgId) filter.organizationId = orgId;
    else if (user.role !== 'super_admin') filter.organizationId = user.organizationId;
    if (user.role === 'team_member') filter.assignedTo = user.id;
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const clientId = url.searchParams.get('clientId');
    const type = url.searchParams.get('type');
    if (status) filter.status = status;
    if (clientId) filter.clientId = clientId;
    if (type) filter.type = type;
    Object.assign(filter, dateFilter);
    const campaigns = await db.collection('campaigns').find(filter).sort({ createdAt: -1 }).toArray();
    return json({ campaigns });
  }

  if (method === 'GET' && id) {
    const campaign = await db.collection('campaigns').findOne({ id });
    if (!campaign) return json({ error: 'Campaign not found' }, 404);
    const lineItems = await db.collection('line_items').find({ campaignId: id }).toArray();
    const deliverables = await db.collection('deliverables').find({ campaignId: id }).sort({ serviceName: 1, unitIndex: 1 }).toArray();
    const client = await db.collection('clients').findOne({ id: campaign.clientId });
    return json({ campaign, lineItems, deliverables, client });
  }

  if (method === 'POST') {
    if (user.role === 'team_member') return json({ error: 'Not authorized' }, 403);
    const data = await request.json();
    const { name, clientId, type, startDate, endDate, assignedTo, lineItems } = data;
    if (!name || !clientId || !type || !lineItems?.length) return json({ error: 'Missing required fields' }, 400);
    const client = await db.collection('clients').findOne({ id: clientId });
    if (!client) return json({ error: 'Client not found' }, 404);
    const targetOrg = orgId || client.organizationId || user.organizationId;
    const campaignId = uuidv4();
    let totalProjected = 0;
    const lineItemDocs = [];
    const deliverableDocs = [];
    for (const item of lineItems) {
      const lineItemId = uuidv4();
      const total = item.quantity * item.rate;
      totalProjected += total;
      lineItemDocs.push({ id: lineItemId, campaignId, serviceId: item.serviceId || '', serviceName: item.serviceName, quantity: item.quantity, rate: item.rate, total, createdAt: new Date() });
      for (let i = 0; i < item.quantity; i++) {
        deliverableDocs.push({
          id: uuidv4(), campaignId, lineItemId, serviceName: item.serviceName, unitIndex: i + 1,
          status: 'pending', proofUrl: '', assignedTo: assignedTo?.[0] || '', rate: item.rate,
          createdAt: new Date(), updatedAt: new Date()
        });
      }
    }
    const campaign = {
      id: campaignId, organizationId: targetOrg, clientId, clientName: client.name, name, type,
      status: 'active', startDate: startDate || '', endDate: endDate || '', assignedTo: assignedTo || [],
      totalProjected, totalEarned: 0, createdAt: new Date(), updatedAt: new Date()
    };
    await db.collection('campaigns').insertOne(campaign);
    if (lineItemDocs.length) await db.collection('line_items').insertMany(lineItemDocs);
    if (deliverableDocs.length) await db.collection('deliverables').insertMany(deliverableDocs);
    await db.collection('activity_logs').insertOne({ id: uuidv4(), organizationId: targetOrg, userId: user.id, userName: user.name, action: 'created', entityType: 'campaign', entityId: campaignId, details: `Created campaign "${name}" for ${client.name} - ${totalProjected} BDT`, createdAt: new Date() });
    return json({ campaign, lineItems: lineItemDocs, deliverables: deliverableDocs }, 201);
  }

  if (method === 'PUT' && id) {
    const data = await request.json();
    const updateFields = {};
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.status !== undefined) updateFields.status = data.status;
    if (data.startDate !== undefined) updateFields.startDate = data.startDate;
    if (data.endDate !== undefined) updateFields.endDate = data.endDate;
    if (data.assignedTo !== undefined) updateFields.assignedTo = data.assignedTo;
    updateFields.updatedAt = new Date();
    await db.collection('campaigns').updateOne({ id }, { $set: updateFields });
    const campaign = await db.collection('campaigns').findOne({ id });
    await db.collection('activity_logs').insertOne({ id: uuidv4(), organizationId: campaign?.organizationId, userId: user.id, userName: user.name, action: 'modified', entityType: 'campaign', entityId: id, details: `Modified campaign "${campaign?.name}"`, createdAt: new Date() });
    return json({ campaign });
  }

  if (method === 'DELETE' && id) {
    if (user.role === 'team_member') return json({ error: 'Not authorized' }, 403);
    const delCampaign = await db.collection('campaigns').findOne({ id });
    await db.collection('campaigns').deleteOne({ id });
    await db.collection('line_items').deleteMany({ campaignId: id });
    await db.collection('deliverables').deleteMany({ campaignId: id });
    await db.collection('activity_logs').insertOne({ id: uuidv4(), organizationId: delCampaign?.organizationId, userId: user.id, userName: user.name, action: 'deleted', entityType: 'campaign', entityId: id, details: `Deleted campaign "${delCampaign?.name || id}"`, createdAt: new Date() });
    return json({ success: true });
  }
  return json({ error: 'Not found' }, 404);
}

// ============ DELIVERABLES ============
async function handleDeliverables(request, id, method) {
  const user = getUser(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const db = await getDb();

  if (method === 'GET' && !id) {
    const url = new URL(request.url);
    const campaignId = url.searchParams.get('campaignId');
    let filter = {};
    if (campaignId) filter.campaignId = campaignId;
    if (user.role === 'team_member') filter.assignedTo = user.id;
    const deliverables = await db.collection('deliverables').find(filter).sort({ serviceName: 1, unitIndex: 1 }).toArray();
    return json({ deliverables });
  }

  if (method === 'PUT' && id) {
    const data = await request.json();
    const deliverable = await db.collection('deliverables').findOne({ id });
    if (!deliverable) return json({ error: 'Deliverable not found' }, 404);
    const updateData = { updatedAt: new Date() };
    if (data.status !== undefined) updateData.status = data.status;
    if (data.proofUrl !== undefined) updateData.proofUrl = data.proofUrl;
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
    await db.collection('deliverables').updateOne({ id }, { $set: updateData });
    const allDeliverables = await db.collection('deliverables').find({ campaignId: deliverable.campaignId }).toArray();
    const totalEarned = allDeliverables.reduce((sum, d) => {
      const st = d.id === id ? (data.status || d.status) : d.status;
      return sum + (st === 'delivered' ? d.rate : 0);
    }, 0);
    await db.collection('campaigns').updateOne({ id: deliverable.campaignId }, { $set: { totalEarned, updatedAt: new Date() } });
    await db.collection('activity_logs').insertOne({ id: uuidv4(), organizationId: user.organizationId, userId: user.id, userName: user.name, action: 'updated', entityType: 'deliverable', entityId: id, details: `Updated "${deliverable.serviceName} #${deliverable.unitIndex}" to ${data.status || 'updated'}`, createdAt: new Date() });
    return json({ success: true, totalEarned });
  }
  return json({ error: 'Not found' }, 404);
}

// ============ DASHBOARD ============
async function handleDashboard(request, subPath, method) {
  const user = getUser(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const db = await getDb();
  const orgId = getOrgId(user, request);
  const dateFilter = getDateFilter(request);

  if (subPath === 'revenue-chart') {
    if (user.role === 'team_member') return json({ error: 'Not authorized' }, 403);
    let filter = {};
    if (orgId) filter.organizationId = orgId;
    else if (user.role !== 'super_admin') filter.organizationId = user.organizationId;
    Object.assign(filter, dateFilter);
    const campaigns = await db.collection('campaigns').find(filter).toArray();
    const monthlyData = {};
    for (const c of campaigns) {
      const month = new Date(c.createdAt).toISOString().slice(0, 7);
      if (!monthlyData[month]) monthlyData[month] = { month, projected: 0, earned: 0 };
      monthlyData[month].projected += c.totalProjected || 0;
      monthlyData[month].earned += c.totalEarned || 0;
    }
    const chartData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
    return json({ chartData });
  }

  let campaignFilter = {};
  if (orgId) campaignFilter.organizationId = orgId;
  else if (user.role !== 'super_admin') campaignFilter.organizationId = user.organizationId;
  if (user.role === 'team_member') campaignFilter.assignedTo = user.id;
  Object.assign(campaignFilter, dateFilter);
  const campaigns = await db.collection('campaigns').find(campaignFilter).toArray();
  const activeCampaigns = campaigns.filter(c => c.status === 'active');

  let financials = null;
  if (user.role !== 'team_member') {
    const totalProjected = activeCampaigns.reduce((sum, c) => sum + (c.totalProjected || 0), 0);
    const totalEarned = activeCampaigns.reduce((sum, c) => sum + (c.totalEarned || 0), 0);
    financials = { totalProjected, totalEarned, totalPending: totalProjected - totalEarned, totalCampaigns: campaigns.length, activeCampaigns: activeCampaigns.length };
  }

  let clientBreakdown = [];
  if (user.role !== 'team_member') {
    const clientMap = {};
    for (const c of activeCampaigns) {
      if (!clientMap[c.clientId]) clientMap[c.clientId] = { clientName: c.clientName, clientId: c.clientId, projected: 0, earned: 0 };
      clientMap[c.clientId].projected += c.totalProjected || 0;
      clientMap[c.clientId].earned += c.totalEarned || 0;
    }
    clientBreakdown = Object.values(clientMap);
  }

  const campaignIds = campaigns.map(c => c.id);
  let deliverableFilter = { campaignId: { $in: campaignIds } };
  if (user.role === 'team_member') deliverableFilter.assignedTo = user.id;
  const deliverables = await db.collection('deliverables').find(deliverableFilter).toArray();
  const deliverableStats = {
    total: deliverables.length,
    pending: deliverables.filter(d => d.status === 'pending').length,
    inProgress: deliverables.filter(d => d.status === 'in_progress').length,
    review: deliverables.filter(d => d.status === 'review').length,
    delivered: deliverables.filter(d => d.status === 'delivered').length
  };

  let orgFilter = {};
  if (orgId) orgFilter.organizationId = orgId;
  else if (user.role !== 'super_admin') orgFilter.organizationId = user.organizationId;
  const recentActivity = await db.collection('activity_logs').find(orgFilter).sort({ createdAt: -1 }).limit(10).toArray();
  return json({ financials, campaigns: campaigns.slice(0, 5), clientBreakdown, deliverableStats, recentActivity });
}

// ============ TEAM ============
async function handleTeam(request, action, method) {
  const user = getUser(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const db = await getDb();
  const orgId = getOrgId(user, request);

  if (method === 'GET') {
    let filter = {};
    if (user.role === 'super_admin') {
      if (orgId) filter.organizationId = orgId;
    } else {
      filter.organizationId = user.organizationId;
    }
    const members = await db.collection('users').find(filter, { projection: { password: 0 } }).toArray();
    return json({ members });
  }
  if (method === 'POST' && action === 'invite') {
    if (user.role === 'team_member') return json({ error: 'Not authorized' }, 403);
    const data = await request.json();
    if (!data.email || !data.name || !data.password) return json({ error: 'Email, name, and password required' }, 400);
    const existing = await db.collection('users').findOne({ email: data.email });
    if (existing) return json({ error: 'Email already exists' }, 400);
    const memberRole = data.role === 'admin' ? 'admin' : (data.role === 'super_admin' ? 'super_admin' : 'team_member');
    const targetOrg = (user.role === 'super_admin' && data.organizationId) ? data.organizationId : (orgId || user.organizationId);
    const member = {
      id: uuidv4(), email: data.email, password: hashPassword(data.password), name: data.name,
      role: memberRole, designation: data.designation || '', department: data.department || '',
      organizationId: targetOrg, createdAt: new Date()
    };
    await db.collection('users').insertOne(member);
    await db.collection('activity_logs').insertOne({ id: uuidv4(), organizationId: targetOrg, userId: user.id, userName: user.name, action: 'created', entityType: 'team_member', entityId: member.id, details: `Added team member "${member.name}" as ${memberRole}`, createdAt: new Date() });
    return json({ member: { id: member.id, email: member.email, name: member.name, role: member.role, designation: member.designation, department: member.department, organizationId: member.organizationId } }, 201);
  }
  return json({ error: 'Not found' }, 404);
}

// ============ ACTIVITY LOGS ============
async function handleActivityLogs(request, method) {
  const user = getUser(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  if (user.role === 'team_member') return json({ error: 'Not authorized' }, 403);
  const db = await getDb();
  const orgId = getOrgId(user, request);
  const dateFilter = getDateFilter(request);

  if (method === 'GET') {
    const url = new URL(request.url);
    const entityType = url.searchParams.get('entityType');
    const action = url.searchParams.get('action');
    const limit = parseInt(url.searchParams.get('limit')) || 100;
    const filter = {};
    if (orgId) filter.organizationId = orgId;
    else if (user.role !== 'super_admin') filter.organizationId = user.organizationId;
    if (entityType && entityType !== 'all') filter.entityType = entityType;
    if (action && action !== 'all') filter.action = action;
    Object.assign(filter, dateFilter);
    const logs = await db.collection('activity_logs').find(filter).sort({ createdAt: -1 }).limit(limit).toArray();
    return json({ logs });
  }
  return json({ error: 'Not found' }, 404);
}

// ============ SEED ============
async function handleSeed(request, method) {
  if (method !== 'POST') return json({ error: 'POST only' }, 405);
  const db = await getDb();

  const collections = ['organizations', 'users', 'clients', 'service_catalog', 'campaigns', 'line_items', 'deliverables', 'activity_logs'];
  for (const col of collections) { try { await db.collection(col).deleteMany({}); } catch (e) {} }

  // Org 1
  const org1Id = uuidv4();
  const org2Id = uuidv4();
  const superAdminId = uuidv4();
  const admin1Id = uuidv4();
  const member1Id = uuidv4();
  const admin2Id = uuidv4();
  const member2Id = uuidv4();

  await db.collection('organizations').insertMany([
    { id: org1Id, name: 'Digital Dynamix Agency', industry: 'Digital Marketing', createdAt: new Date() },
    { id: org2Id, name: 'CreativeEdge Media', industry: 'Social Media', createdAt: new Date() }
  ]);

  await db.collection('users').insertMany([
    { id: superAdminId, email: 'super@agency.com', password: hashPassword('super123'), name: 'Super Admin', role: 'super_admin', organizationId: org1Id, createdAt: new Date() },
    { id: admin1Id, email: 'admin@agency.com', password: hashPassword('admin123'), name: 'Rafiq Ahmed', role: 'admin', organizationId: org1Id, designation: 'Managing Director', department: 'Management', createdAt: new Date() },
    { id: member1Id, email: 'member@agency.com', password: hashPassword('member123'), name: 'Nusrat Jahan', role: 'team_member', organizationId: org1Id, designation: 'Graphic Designer', department: 'Creative', createdAt: new Date() },
    { id: admin2Id, email: 'admin2@agency.com', password: hashPassword('admin123'), name: 'Ayesha Khan', role: 'admin', organizationId: org2Id, designation: 'CEO', department: 'Management', createdAt: new Date() },
    { id: member2Id, email: 'member2@agency.com', password: hashPassword('member123'), name: 'Tanvir Hasan', role: 'team_member', organizationId: org2Id, designation: 'Video Editor', department: 'Production', createdAt: new Date() }
  ]);

  // Org 1 clients
  const c1 = [uuidv4(), uuidv4(), uuidv4(), uuidv4()];
  await db.collection('clients').insertMany([
    { id: c1[0], organizationId: org1Id, name: 'Tech Solutions Ltd', contactPerson: 'Karim Hassan', email: 'karim@techsolutions.bd', phone: '+880 1711-000001', industry: 'Technology', status: 'active', createdAt: new Date() },
    { id: c1[1], organizationId: org1Id, name: 'Fashion Forward', contactPerson: 'Tasnim Akter', email: 'tasnim@fashionforward.bd', phone: '+880 1711-000002', industry: 'Fashion', status: 'active', createdAt: new Date() },
    { id: c1[2], organizationId: org1Id, name: 'Green Foods Co', contactPerson: 'Imran Hossain', email: 'imran@greenfoods.bd', phone: '+880 1711-000003', industry: 'Food & Beverage', status: 'active', createdAt: new Date() },
    { id: c1[3], organizationId: org1Id, name: 'Urban Realty Group', contactPerson: 'Sadia Rahman', email: 'sadia@urbanrealty.bd', phone: '+880 1711-000004', industry: 'Real Estate', status: 'active', createdAt: new Date() }
  ]);

  // Org 2 clients
  const c2 = [uuidv4(), uuidv4()];
  await db.collection('clients').insertMany([
    { id: c2[0], organizationId: org2Id, name: 'Dhaka Motors', contactPerson: 'Zahid Ali', email: 'zahid@dhakamotors.bd', phone: '+880 1711-000010', industry: 'Automotive', status: 'active', createdAt: new Date() },
    { id: c2[1], organizationId: org2Id, name: 'Pearl Beauty', contactPerson: 'Rima Sultana', email: 'rima@pearlbeauty.bd', phone: '+880 1711-000011', industry: 'Beauty & Wellness', status: 'active', createdAt: new Date() }
  ]);

  // Org 1 services
  const s1 = [uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4()];
  await db.collection('service_catalog').insertMany([
    { id: s1[0], organizationId: org1Id, name: 'Static Post Design', defaultRate: 1600, description: 'Social media static post design', createdAt: new Date() },
    { id: s1[1], organizationId: org1Id, name: 'Motion Graphics/Reels', defaultRate: 5000, description: 'Animated reels and motion graphics', createdAt: new Date() },
    { id: s1[2], organizationId: org1Id, name: 'Video Editing', defaultRate: 4000, description: 'Professional video editing', createdAt: new Date() },
    { id: s1[3], organizationId: org1Id, name: 'Copywriting', defaultRate: 2000, description: 'Social media copywriting', createdAt: new Date() },
    { id: s1[4], organizationId: org1Id, name: 'AI Video Generation', defaultRate: 6000, description: 'AI-powered video content', createdAt: new Date() },
    { id: s1[5], organizationId: org1Id, name: 'SEO Activities', defaultRate: 3000, description: 'Search engine optimization', createdAt: new Date() },
    { id: s1[6], organizationId: org1Id, name: 'Media Buying', defaultRate: 10000, description: 'Paid media buying', createdAt: new Date() }
  ]);

  // Org 2 services
  const s2 = [uuidv4(), uuidv4(), uuidv4()];
  await db.collection('service_catalog').insertMany([
    { id: s2[0], organizationId: org2Id, name: 'Social Media Post', defaultRate: 1800, description: 'Social media content', createdAt: new Date() },
    { id: s2[1], organizationId: org2Id, name: 'Reels Production', defaultRate: 5500, description: 'Instagram/TikTok reels', createdAt: new Date() },
    { id: s2[2], organizationId: org2Id, name: 'Brand Strategy', defaultRate: 8000, description: 'Brand strategy consulting', createdAt: new Date() }
  ]);

  // Org 1 campaigns
  const camp1 = uuidv4(); const li1a = uuidv4(), li1b = uuidv4(), li1c = uuidv4();
  const d1 = [];
  for (let i = 0; i < 8; i++) d1.push({ id: uuidv4(), campaignId: camp1, lineItemId: li1a, serviceName: 'Static Post Design', unitIndex: i+1, status: i < 6 ? 'delivered' : 'in_progress', proofUrl: i < 6 ? 'https://facebook.com/post/' + (i+1) : '', assignedTo: member1Id, rate: 1600, createdAt: new Date(), updatedAt: new Date() });
  for (let i = 0; i < 4; i++) d1.push({ id: uuidv4(), campaignId: camp1, lineItemId: li1b, serviceName: 'Motion Graphics/Reels', unitIndex: i+1, status: i < 2 ? 'review' : i === 2 ? 'in_progress' : 'pending', proofUrl: '', assignedTo: member1Id, rate: 5000, createdAt: new Date(), updatedAt: new Date() });
  for (let i = 0; i < 4; i++) d1.push({ id: uuidv4(), campaignId: camp1, lineItemId: li1c, serviceName: 'Copywriting', unitIndex: i+1, status: i === 0 ? 'review' : i === 1 ? 'in_progress' : 'pending', proofUrl: '', assignedTo: member1Id, rate: 2000, createdAt: new Date(), updatedAt: new Date() });
  const e1 = d1.filter(d => d.status === 'delivered').reduce((s,d) => s+d.rate, 0);
  await db.collection('campaigns').insertOne({ id: camp1, organizationId: org1Id, clientId: c1[0], clientName: 'Tech Solutions Ltd', name: 'Tech Solutions - Q2 Social Media', type: 'retainer', status: 'active', startDate: '2025-04-01', endDate: '2025-06-30', assignedTo: [member1Id], totalProjected: 40800, totalEarned: e1, createdAt: new Date('2025-04-01'), updatedAt: new Date() });
  await db.collection('line_items').insertMany([ { id: li1a, campaignId: camp1, serviceId: s1[0], serviceName: 'Static Post Design', quantity: 8, rate: 1600, total: 12800, createdAt: new Date() }, { id: li1b, campaignId: camp1, serviceId: s1[1], serviceName: 'Motion Graphics/Reels', quantity: 4, rate: 5000, total: 20000, createdAt: new Date() }, { id: li1c, campaignId: camp1, serviceId: s1[3], serviceName: 'Copywriting', quantity: 4, rate: 2000, total: 8000, createdAt: new Date() } ]);
  await db.collection('deliverables').insertMany(d1);

  const camp2 = uuidv4(); const li2a = uuidv4(), li2b = uuidv4(), li2c = uuidv4();
  const d2 = [];
  for (let i = 0; i < 12; i++) d2.push({ id: uuidv4(), campaignId: camp2, lineItemId: li2a, serviceName: 'Static Post Design', unitIndex: i+1, status: i < 8 ? 'delivered' : 'in_progress', proofUrl: i < 8 ? 'https://instagram.com/p/' + (i+1) : '', assignedTo: member1Id, rate: 1600, createdAt: new Date(), updatedAt: new Date() });
  for (let i = 0; i < 6; i++) d2.push({ id: uuidv4(), campaignId: camp2, lineItemId: li2b, serviceName: 'Motion Graphics/Reels', unitIndex: i+1, status: i < 4 ? 'in_progress' : 'pending', proofUrl: '', assignedTo: member1Id, rate: 5000, createdAt: new Date(), updatedAt: new Date() });
  for (let i = 0; i < 2; i++) d2.push({ id: uuidv4(), campaignId: camp2, lineItemId: li2c, serviceName: 'AI Video Generation', unitIndex: i+1, status: 'pending', proofUrl: '', assignedTo: member1Id, rate: 6000, createdAt: new Date(), updatedAt: new Date() });
  const e2 = d2.filter(d => d.status === 'delivered').reduce((s,d) => s+d.rate, 0);
  await db.collection('campaigns').insertOne({ id: camp2, organizationId: org1Id, clientId: c1[1], clientName: 'Fashion Forward', name: 'Fashion Forward - Summer Launch', type: 'one-time', status: 'active', startDate: '2025-05-01', endDate: '2025-07-31', assignedTo: [member1Id], totalProjected: 61200, totalEarned: e2, createdAt: new Date('2025-05-01'), updatedAt: new Date() });
  await db.collection('line_items').insertMany([ { id: li2a, campaignId: camp2, serviceId: s1[0], serviceName: 'Static Post Design', quantity: 12, rate: 1600, total: 19200, createdAt: new Date() }, { id: li2b, campaignId: camp2, serviceId: s1[1], serviceName: 'Motion Graphics/Reels', quantity: 6, rate: 5000, total: 30000, createdAt: new Date() }, { id: li2c, campaignId: camp2, serviceId: s1[4], serviceName: 'AI Video Generation', quantity: 2, rate: 6000, total: 12000, createdAt: new Date() } ]);
  await db.collection('deliverables').insertMany(d2);

  const camp3 = uuidv4(); const li3a = uuidv4(), li3b = uuidv4(), li3c = uuidv4();
  const d3 = [];
  for (let i = 0; i < 6; i++) d3.push({ id: uuidv4(), campaignId: camp3, lineItemId: li3a, serviceName: 'Static Post Design', unitIndex: i+1, status: i < 3 ? 'delivered' : 'in_progress', proofUrl: i < 3 ? 'https://facebook.com/greenfoods/' + (i+1) : '', assignedTo: member1Id, rate: 1600, createdAt: new Date(), updatedAt: new Date() });
  for (let i = 0; i < 2; i++) d3.push({ id: uuidv4(), campaignId: camp3, lineItemId: li3b, serviceName: 'Video Editing', unitIndex: i+1, status: i === 0 ? 'in_progress' : 'pending', proofUrl: '', assignedTo: member1Id, rate: 4000, createdAt: new Date(), updatedAt: new Date() });
  for (let i = 0; i < 3; i++) d3.push({ id: uuidv4(), campaignId: camp3, lineItemId: li3c, serviceName: 'SEO Activities', unitIndex: i+1, status: 'pending', proofUrl: '', assignedTo: member1Id, rate: 3000, createdAt: new Date(), updatedAt: new Date() });
  const e3 = d3.filter(d => d.status === 'delivered').reduce((s,d) => s+d.rate, 0);
  await db.collection('campaigns').insertOne({ id: camp3, organizationId: org1Id, clientId: c1[2], clientName: 'Green Foods Co', name: 'Green Foods - Brand Refresh', type: 'custom', status: 'active', startDate: '2025-05-15', endDate: '2025-08-15', assignedTo: [member1Id], totalProjected: 26600, totalEarned: e3, createdAt: new Date('2025-05-15'), updatedAt: new Date() });
  await db.collection('line_items').insertMany([ { id: li3a, campaignId: camp3, serviceId: s1[0], serviceName: 'Static Post Design', quantity: 6, rate: 1600, total: 9600, createdAt: new Date() }, { id: li3b, campaignId: camp3, serviceId: s1[2], serviceName: 'Video Editing', quantity: 2, rate: 4000, total: 8000, createdAt: new Date() }, { id: li3c, campaignId: camp3, serviceId: s1[5], serviceName: 'SEO Activities', quantity: 3, rate: 3000, total: 9000, createdAt: new Date() } ]);
  await db.collection('deliverables').insertMany(d3);

  // Org 2 campaign
  const camp4 = uuidv4(); const li4a = uuidv4(), li4b = uuidv4();
  const d4 = [];
  for (let i = 0; i < 6; i++) d4.push({ id: uuidv4(), campaignId: camp4, lineItemId: li4a, serviceName: 'Social Media Post', unitIndex: i+1, status: i < 3 ? 'delivered' : i < 5 ? 'in_progress' : 'pending', proofUrl: i < 3 ? 'https://instagram.com/dhakamotors/' + (i+1) : '', assignedTo: member2Id, rate: 1800, createdAt: new Date(), updatedAt: new Date() });
  for (let i = 0; i < 3; i++) d4.push({ id: uuidv4(), campaignId: camp4, lineItemId: li4b, serviceName: 'Reels Production', unitIndex: i+1, status: i < 1 ? 'delivered' : 'pending', proofUrl: i < 1 ? 'https://instagram.com/reel/motors1' : '', assignedTo: member2Id, rate: 5500, createdAt: new Date(), updatedAt: new Date() });
  const e4 = d4.filter(d => d.status === 'delivered').reduce((s,d) => s+d.rate, 0);
  await db.collection('campaigns').insertOne({ id: camp4, organizationId: org2Id, clientId: c2[0], clientName: 'Dhaka Motors', name: 'Dhaka Motors - Launch Campaign', type: 'one-time', status: 'active', startDate: '2025-06-01', endDate: '2025-08-31', assignedTo: [member2Id], totalProjected: 27300, totalEarned: e4, createdAt: new Date('2025-06-01'), updatedAt: new Date() });
  await db.collection('line_items').insertMany([ { id: li4a, campaignId: camp4, serviceId: s2[0], serviceName: 'Social Media Post', quantity: 6, rate: 1800, total: 10800, createdAt: new Date() }, { id: li4b, campaignId: camp4, serviceId: s2[1], serviceName: 'Reels Production', quantity: 3, rate: 5500, total: 16500, createdAt: new Date() } ]);
  await db.collection('deliverables').insertMany(d4);

  await db.collection('activity_logs').insertMany([
    { id: uuidv4(), organizationId: org1Id, userId: admin1Id, userName: 'Rafiq Ahmed', action: 'created', entityType: 'campaign', entityId: camp1, details: 'Created "Tech Solutions - Q2 Social Media"', createdAt: new Date('2025-04-01') },
    { id: uuidv4(), organizationId: org1Id, userId: admin1Id, userName: 'Rafiq Ahmed', action: 'created', entityType: 'campaign', entityId: camp2, details: 'Created "Fashion Forward - Summer Launch"', createdAt: new Date('2025-05-01') },
    { id: uuidv4(), organizationId: org1Id, userId: admin1Id, userName: 'Rafiq Ahmed', action: 'created', entityType: 'campaign', entityId: camp3, details: 'Created "Green Foods - Brand Refresh"', createdAt: new Date('2025-05-15') },
    { id: uuidv4(), organizationId: org2Id, userId: admin2Id, userName: 'Ayesha Khan', action: 'created', entityType: 'campaign', entityId: camp4, details: 'Created "Dhaka Motors - Launch Campaign"', createdAt: new Date('2025-06-01') },
    { id: uuidv4(), organizationId: org1Id, userId: member1Id, userName: 'Nusrat Jahan', action: 'updated', entityType: 'deliverable', entityId: uuidv4(), details: 'Delivered 6 Static Posts for Tech Solutions', createdAt: new Date('2025-05-20') },
    { id: uuidv4(), organizationId: org1Id, userId: member1Id, userName: 'Nusrat Jahan', action: 'updated', entityType: 'deliverable', entityId: uuidv4(), details: 'Delivered 8 Static Posts for Fashion Forward', createdAt: new Date('2025-06-01') }
  ]);

  return json({ success: true, message: 'Seed data created with 2 organizations', credentials: {
    superAdmin: { email: 'super@agency.com', password: 'super123' },
    admin1: { email: 'admin@agency.com', password: 'admin123' },
    admin2: { email: 'admin2@agency.com', password: 'admin123' },
    teamMember1: { email: 'member@agency.com', password: 'member123' },
    teamMember2: { email: 'member2@agency.com', password: 'member123' }
  }});
}

// ============ MAIN HANDLERS ============
async function handleRequest(request, pathSegments, method) {
  const [resource, id, subResource] = pathSegments;
  try {
    switch (resource) {
      case 'auth': return await handleAuth(request, id, method);
      case 'organizations': return await handleOrganizations(request, id, method);
      case 'clients': return await handleClients(request, id, method);
      case 'services': return await handleServices(request, id, method);
      case 'campaigns': return await handleCampaigns(request, id, method);
      case 'deliverables': return await handleDeliverables(request, id, method);
      case 'dashboard': return await handleDashboard(request, id, method);
      case 'team': return await handleTeam(request, id, method);
      case 'activity-logs': return await handleActivityLogs(request, method);
      case 'seed': return await handleSeed(request, method);
      default: return json({ status: 'Campaign Tracker API running', version: '2.0' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return json({ error: error.message || 'Internal server error' }, 500);
  }
}

export async function GET(request, { params }) {
  const pathSegments = params?.path || [];
  return handleRequest(request, pathSegments, 'GET');
}

export async function POST(request, { params }) {
  const pathSegments = params?.path || [];
  return handleRequest(request, pathSegments, 'POST');
}

export async function PUT(request, { params }) {
  const pathSegments = params?.path || [];
  return handleRequest(request, pathSegments, 'PUT');
}

export async function DELETE(request, { params }) {
  const pathSegments = params?.path || [];
  return handleRequest(request, pathSegments, 'DELETE');
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}
