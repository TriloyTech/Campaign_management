import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'campaign_tracker';
const JWT_SECRET = 'dmc-tracker-jwt-secret-2024-key';

let cachedClient = null;
let cachedDb = null;

async function getDb() {
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
  const data = JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const encoded = Buffer.from(data).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function verifyToken(token) {
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
    return json({ user: { id: dbUser.id, email: dbUser.email, name: dbUser.name, role: dbUser.role, organizationId: dbUser.organizationId, organizationName: org?.name } });
  }
  return json({ error: 'Not found' }, 404);
}

// ============ CLIENTS ============
async function handleClients(request, id, method) {
  const user = getUser(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const db = await getDb();

  if (method === 'GET' && !id) {
    const clients = await db.collection('clients').find({ organizationId: user.organizationId }).sort({ createdAt: -1 }).toArray();
    return json({ clients });
  }
  if (method === 'GET' && id) {
    const client = await db.collection('clients').findOne({ id, organizationId: user.organizationId });
    if (!client) return json({ error: 'Client not found' }, 404);
    return json({ client });
  }
  if (method === 'POST') {
    if (user.role !== 'admin') return json({ error: 'Admin only' }, 403);
    const data = await request.json();
    const client = {
      id: uuidv4(), organizationId: user.organizationId, name: data.name,
      contactPerson: data.contactPerson || '', email: data.email || '', phone: data.phone || '',
      industry: data.industry || '', status: 'active', createdAt: new Date()
    };
    await db.collection('clients').insertOne(client);
    await db.collection('activity_logs').insertOne({ id: uuidv4(), organizationId: user.organizationId, userId: user.id, userName: user.name, action: 'created', entityType: 'client', entityId: client.id, details: `Created client "${client.name}"`, createdAt: new Date() });
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
    await db.collection('clients').updateOne({ id, organizationId: user.organizationId }, { $set: updateFields });
    const client = await db.collection('clients').findOne({ id });
    await db.collection('activity_logs').insertOne({ id: uuidv4(), organizationId: user.organizationId, userId: user.id, userName: user.name, action: 'modified', entityType: 'client', entityId: id, details: `Modified client "${client.name}"`, createdAt: new Date() });
    return json({ client });
  }
  if (method === 'DELETE' && id) {
    if (user.role !== 'admin') return json({ error: 'Admin only' }, 403);
    const delClient = await db.collection('clients').findOne({ id });
    await db.collection('clients').deleteOne({ id, organizationId: user.organizationId });
    await db.collection('activity_logs').insertOne({ id: uuidv4(), organizationId: user.organizationId, userId: user.id, userName: user.name, action: 'deleted', entityType: 'client', entityId: id, details: `Deleted client "${delClient?.name || id}"`, createdAt: new Date() });
    return json({ success: true });
  }
  return json({ error: 'Not found' }, 404);
}

// ============ SERVICES ============
async function handleServices(request, id, method) {
  const user = getUser(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const db = await getDb();

  if (method === 'GET' && !id) {
    const services = await db.collection('service_catalog').find({ organizationId: user.organizationId }).sort({ createdAt: -1 }).toArray();
    return json({ services });
  }
  if (method === 'POST') {
    if (user.role !== 'admin') return json({ error: 'Admin only' }, 403);
    const data = await request.json();
    const service = {
      id: uuidv4(), organizationId: user.organizationId, name: data.name,
      defaultRate: Number(data.defaultRate) || 0, description: data.description || '', createdAt: new Date()
    };
    await db.collection('service_catalog').insertOne(service);
    await db.collection('activity_logs').insertOne({ id: uuidv4(), organizationId: user.organizationId, userId: user.id, userName: user.name, action: 'created', entityType: 'service', entityId: service.id, details: `Created service "${service.name}" at ${service.defaultRate} BDT`, createdAt: new Date() });
    return json({ service }, 201);
  }
  if (method === 'PUT' && id) {
    const data = await request.json();
    const updateFields = {};
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.defaultRate !== undefined) updateFields.defaultRate = Number(data.defaultRate);
    if (data.description !== undefined) updateFields.description = data.description;
    updateFields.updatedAt = new Date();
    await db.collection('service_catalog').updateOne({ id, organizationId: user.organizationId }, { $set: updateFields });
    const service = await db.collection('service_catalog').findOne({ id });
    await db.collection('activity_logs').insertOne({ id: uuidv4(), organizationId: user.organizationId, userId: user.id, userName: user.name, action: 'modified', entityType: 'service', entityId: id, details: `Modified service "${service.name}"`, createdAt: new Date() });
    return json({ service });
  }
  if (method === 'DELETE' && id) {
    if (user.role !== 'admin') return json({ error: 'Admin only' }, 403);
    await db.collection('service_catalog').deleteOne({ id, organizationId: user.organizationId });
    return json({ success: true });
  }
  return json({ error: 'Not found' }, 404);
}

// ============ CAMPAIGNS ============
async function handleCampaigns(request, id, method) {
  const user = getUser(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const db = await getDb();

  if (method === 'GET' && !id) {
    let filter = { organizationId: user.organizationId };
    if (user.role === 'team_member') filter.assignedTo = user.id;
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const clientId = url.searchParams.get('clientId');
    const type = url.searchParams.get('type');
    if (status) filter.status = status;
    if (clientId) filter.clientId = clientId;
    if (type) filter.type = type;
    const campaigns = await db.collection('campaigns').find(filter).sort({ createdAt: -1 }).toArray();
    return json({ campaigns });
  }

  if (method === 'GET' && id) {
    const campaign = await db.collection('campaigns').findOne({ id, organizationId: user.organizationId });
    if (!campaign) return json({ error: 'Campaign not found' }, 404);
    const lineItems = await db.collection('line_items').find({ campaignId: id }).toArray();
    const deliverables = await db.collection('deliverables').find({ campaignId: id }).sort({ serviceName: 1, unitIndex: 1 }).toArray();
    const client = await db.collection('clients').findOne({ id: campaign.clientId });
    return json({ campaign, lineItems, deliverables, client });
  }

  if (method === 'POST') {
    if (user.role !== 'admin') return json({ error: 'Admin only' }, 403);
    const data = await request.json();
    const { name, clientId, type, startDate, endDate, assignedTo, lineItems } = data;
    if (!name || !clientId || !type || !lineItems?.length) return json({ error: 'Missing required fields' }, 400);
    const client = await db.collection('clients').findOne({ id: clientId });
    if (!client) return json({ error: 'Client not found' }, 404);
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
      id: campaignId, organizationId: user.organizationId, clientId, clientName: client.name, name, type,
      status: 'active', startDate: startDate || '', endDate: endDate || '', assignedTo: assignedTo || [],
      totalProjected, totalEarned: 0, createdAt: new Date(), updatedAt: new Date()
    };
    await db.collection('campaigns').insertOne(campaign);
    if (lineItemDocs.length) await db.collection('line_items').insertMany(lineItemDocs);
    if (deliverableDocs.length) await db.collection('deliverables').insertMany(deliverableDocs);
    await db.collection('activity_logs').insertOne({ id: uuidv4(), organizationId: user.organizationId, userId: user.id, userName: user.name, action: 'created', entityType: 'campaign', entityId: campaignId, details: `Created campaign "${name}" for ${client.name} - ${totalProjected} BDT`, createdAt: new Date() });
    return json({ campaign, lineItems: lineItemDocs, deliverables: deliverableDocs }, 201);
  }

  if (method === 'PUT' && id) {
    if (user.role !== 'admin') return json({ error: 'Admin only' }, 403);
    const data = await request.json();
    const updateFields = {};
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.status !== undefined) updateFields.status = data.status;
    if (data.startDate !== undefined) updateFields.startDate = data.startDate;
    if (data.endDate !== undefined) updateFields.endDate = data.endDate;
    if (data.assignedTo !== undefined) updateFields.assignedTo = data.assignedTo;
    updateFields.updatedAt = new Date();
    await db.collection('campaigns').updateOne({ id, organizationId: user.organizationId }, { $set: updateFields });
    const campaign = await db.collection('campaigns').findOne({ id });
    return json({ campaign });
  }

  if (method === 'DELETE' && id) {
    if (user.role !== 'admin') return json({ error: 'Admin only' }, 403);
    await db.collection('campaigns').deleteOne({ id, organizationId: user.organizationId });
    await db.collection('line_items').deleteMany({ campaignId: id });
    await db.collection('deliverables').deleteMany({ campaignId: id });
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
    // Proof URL is optional for delivered status
    const updateData = { updatedAt: new Date() };
    if (data.status !== undefined) updateData.status = data.status;
    if (data.proofUrl !== undefined) updateData.proofUrl = data.proofUrl;
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
    await db.collection('deliverables').updateOne({ id }, { $set: updateData });
    // Recalculate campaign earned
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

  if (subPath === 'revenue-chart') {
    if (user.role !== 'admin') return json({ error: 'Admin only' }, 403);
    const campaigns = await db.collection('campaigns').find({ organizationId: user.organizationId }).toArray();
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

  let campaignFilter = { organizationId: user.organizationId };
  if (user.role === 'team_member') campaignFilter.assignedTo = user.id;
  const campaigns = await db.collection('campaigns').find(campaignFilter).toArray();
  const activeCampaigns = campaigns.filter(c => c.status === 'active');

  let financials = null;
  if (user.role === 'admin') {
    const totalProjected = activeCampaigns.reduce((sum, c) => sum + (c.totalProjected || 0), 0);
    const totalEarned = activeCampaigns.reduce((sum, c) => sum + (c.totalEarned || 0), 0);
    financials = { totalProjected, totalEarned, totalPending: totalProjected - totalEarned, totalCampaigns: campaigns.length, activeCampaigns: activeCampaigns.length };
  }

  let clientBreakdown = [];
  if (user.role === 'admin') {
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

  const recentActivity = await db.collection('activity_logs').find({ organizationId: user.organizationId }).sort({ createdAt: -1 }).limit(10).toArray();
  return json({ financials, campaigns: campaigns.slice(0, 5), clientBreakdown, deliverableStats, recentActivity });
}

// ============ TEAM ============
async function handleTeam(request, action, method) {
  const user = getUser(request);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const db = await getDb();

  if (method === 'GET') {
    const members = await db.collection('users').find({ organizationId: user.organizationId }, { projection: { password: 0 } }).toArray();
    return json({ members });
  }
  if (method === 'POST' && action === 'invite') {
    if (user.role !== 'admin') return json({ error: 'Admin only' }, 403);
    const data = await request.json();
    if (!data.email || !data.name || !data.password) return json({ error: 'Email, name, and password required' }, 400);
    const existing = await db.collection('users').findOne({ email: data.email });
    if (existing) return json({ error: 'Email already exists' }, 400);
    const member = {
      id: uuidv4(), email: data.email, password: hashPassword(data.password), name: data.name,
      role: 'team_member', organizationId: user.organizationId, createdAt: new Date()
    };
    await db.collection('users').insertOne(member);
    return json({ member: { id: member.id, email: member.email, name: member.name, role: member.role } }, 201);
  }
  return json({ error: 'Not found' }, 404);
}

// ============ SEED ============
async function handleSeed(request, method) {
  if (method !== 'POST') return json({ error: 'POST only' }, 405);
  const db = await getDb();

  // Clear all collections
  const collections = ['organizations', 'users', 'clients', 'service_catalog', 'campaigns', 'line_items', 'deliverables', 'activity_logs'];
  for (const col of collections) {
    try { await db.collection(col).deleteMany({}); } catch (e) { /* ignore */ }
  }

  const orgId = uuidv4();
  const adminId = uuidv4();
  const memberId = uuidv4();

  await db.collection('organizations').insertOne({ id: orgId, name: 'Digital Dynamix Agency', createdAt: new Date() });
  await db.collection('users').insertMany([
    { id: adminId, email: 'admin@agency.com', password: hashPassword('admin123'), name: 'Rafiq Ahmed', role: 'admin', organizationId: orgId, createdAt: new Date() },
    { id: memberId, email: 'member@agency.com', password: hashPassword('member123'), name: 'Nusrat Jahan', role: 'team_member', organizationId: orgId, createdAt: new Date() }
  ]);

  const clientIds = [uuidv4(), uuidv4(), uuidv4(), uuidv4()];
  await db.collection('clients').insertMany([
    { id: clientIds[0], organizationId: orgId, name: 'Tech Solutions Ltd', contactPerson: 'Karim Hassan', email: 'karim@techsolutions.bd', phone: '+880 1711-000001', industry: 'Technology', status: 'active', createdAt: new Date() },
    { id: clientIds[1], organizationId: orgId, name: 'Fashion Forward', contactPerson: 'Tasnim Akter', email: 'tasnim@fashionforward.bd', phone: '+880 1711-000002', industry: 'Fashion & Lifestyle', status: 'active', createdAt: new Date() },
    { id: clientIds[2], organizationId: orgId, name: 'Green Foods Co', contactPerson: 'Imran Hossain', email: 'imran@greenfoods.bd', phone: '+880 1711-000003', industry: 'Food & Beverage', status: 'active', createdAt: new Date() },
    { id: clientIds[3], organizationId: orgId, name: 'Urban Realty Group', contactPerson: 'Sadia Rahman', email: 'sadia@urbanrealty.bd', phone: '+880 1711-000004', industry: 'Real Estate', status: 'active', createdAt: new Date() }
  ]);

  const svcIds = [uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4()];
  await db.collection('service_catalog').insertMany([
    { id: svcIds[0], organizationId: orgId, name: 'Static Post Design', defaultRate: 1600, description: 'Social media static post design', createdAt: new Date() },
    { id: svcIds[1], organizationId: orgId, name: 'Motion Graphics/Reels', defaultRate: 5000, description: 'Animated reels and motion graphics', createdAt: new Date() },
    { id: svcIds[2], organizationId: orgId, name: 'Video Editing', defaultRate: 4000, description: 'Professional video editing', createdAt: new Date() },
    { id: svcIds[3], organizationId: orgId, name: 'Copywriting', defaultRate: 2000, description: 'Social media copywriting', createdAt: new Date() },
    { id: svcIds[4], organizationId: orgId, name: 'AI Video Generation', defaultRate: 6000, description: 'AI-powered video content', createdAt: new Date() },
    { id: svcIds[5], organizationId: orgId, name: 'SEO Activities', defaultRate: 3000, description: 'Search engine optimization', createdAt: new Date() },
    { id: svcIds[6], organizationId: orgId, name: 'Media Buying', defaultRate: 10000, description: 'Paid media buying and management', createdAt: new Date() }
  ]);

  // Campaign 1: Tech Solutions - Q2 Social Media
  const c1Id = uuidv4();
  const c1li1 = uuidv4(), c1li2 = uuidv4(), c1li3 = uuidv4();
  const c1Deliverables = [];
  // 8 Static Posts @ 1600
  for (let i = 0; i < 8; i++) {
    c1Deliverables.push({ id: uuidv4(), campaignId: c1Id, lineItemId: c1li1, serviceName: 'Static Post Design', unitIndex: i+1, status: i < 6 ? 'delivered' : 'in_progress', proofUrl: i < 6 ? 'https://facebook.com/post/' + (i+1) : '', assignedTo: memberId, rate: 1600, createdAt: new Date(), updatedAt: new Date() });
  }
  // 4 Reels @ 5000
  for (let i = 0; i < 4; i++) {
    const st = i < 2 ? 'review' : i === 2 ? 'in_progress' : 'pending';
    c1Deliverables.push({ id: uuidv4(), campaignId: c1Id, lineItemId: c1li2, serviceName: 'Motion Graphics/Reels', unitIndex: i+1, status: st, proofUrl: '', assignedTo: memberId, rate: 5000, createdAt: new Date(), updatedAt: new Date() });
  }
  // 4 Copywriting @ 2000
  for (let i = 0; i < 4; i++) {
    const st = i === 0 ? 'review' : i === 1 ? 'in_progress' : 'pending';
    c1Deliverables.push({ id: uuidv4(), campaignId: c1Id, lineItemId: c1li3, serviceName: 'Copywriting', unitIndex: i+1, status: st, proofUrl: '', assignedTo: memberId, rate: 2000, createdAt: new Date(), updatedAt: new Date() });
  }
  const c1Earned = c1Deliverables.filter(d => d.status === 'delivered').reduce((s,d) => s+d.rate, 0);

  await db.collection('campaigns').insertOne({ id: c1Id, organizationId: orgId, clientId: clientIds[0], clientName: 'Tech Solutions Ltd', name: 'Tech Solutions - Q2 Social Media', type: 'retainer', status: 'active', startDate: '2025-04-01', endDate: '2025-06-30', assignedTo: [memberId], totalProjected: 40800, totalEarned: c1Earned, createdAt: new Date('2025-04-01'), updatedAt: new Date() });
  await db.collection('line_items').insertMany([
    { id: c1li1, campaignId: c1Id, serviceId: svcIds[0], serviceName: 'Static Post Design', quantity: 8, rate: 1600, total: 12800, createdAt: new Date() },
    { id: c1li2, campaignId: c1Id, serviceId: svcIds[1], serviceName: 'Motion Graphics/Reels', quantity: 4, rate: 5000, total: 20000, createdAt: new Date() },
    { id: c1li3, campaignId: c1Id, serviceId: svcIds[3], serviceName: 'Copywriting', quantity: 4, rate: 2000, total: 8000, createdAt: new Date() }
  ]);
  await db.collection('deliverables').insertMany(c1Deliverables);

  // Campaign 2: Fashion Forward - Summer Launch
  const c2Id = uuidv4();
  const c2li1 = uuidv4(), c2li2 = uuidv4(), c2li3 = uuidv4();
  const c2Deliverables = [];
  for (let i = 0; i < 12; i++) {
    c2Deliverables.push({ id: uuidv4(), campaignId: c2Id, lineItemId: c2li1, serviceName: 'Static Post Design', unitIndex: i+1, status: i < 8 ? 'delivered' : 'in_progress', proofUrl: i < 8 ? 'https://instagram.com/p/post' + (i+1) : '', assignedTo: memberId, rate: 1600, createdAt: new Date(), updatedAt: new Date() });
  }
  for (let i = 0; i < 6; i++) {
    c2Deliverables.push({ id: uuidv4(), campaignId: c2Id, lineItemId: c2li2, serviceName: 'Motion Graphics/Reels', unitIndex: i+1, status: i < 4 ? 'in_progress' : 'pending', proofUrl: '', assignedTo: memberId, rate: 5000, createdAt: new Date(), updatedAt: new Date() });
  }
  for (let i = 0; i < 2; i++) {
    c2Deliverables.push({ id: uuidv4(), campaignId: c2Id, lineItemId: c2li3, serviceName: 'AI Video Generation', unitIndex: i+1, status: 'pending', proofUrl: '', assignedTo: memberId, rate: 6000, createdAt: new Date(), updatedAt: new Date() });
  }
  const c2Earned = c2Deliverables.filter(d => d.status === 'delivered').reduce((s,d) => s+d.rate, 0);

  await db.collection('campaigns').insertOne({ id: c2Id, organizationId: orgId, clientId: clientIds[1], clientName: 'Fashion Forward', name: 'Fashion Forward - Summer Launch', type: 'one-time', status: 'active', startDate: '2025-05-01', endDate: '2025-07-31', assignedTo: [memberId], totalProjected: 61200, totalEarned: c2Earned, createdAt: new Date('2025-05-01'), updatedAt: new Date() });
  await db.collection('line_items').insertMany([
    { id: c2li1, campaignId: c2Id, serviceId: svcIds[0], serviceName: 'Static Post Design', quantity: 12, rate: 1600, total: 19200, createdAt: new Date() },
    { id: c2li2, campaignId: c2Id, serviceId: svcIds[1], serviceName: 'Motion Graphics/Reels', quantity: 6, rate: 5000, total: 30000, createdAt: new Date() },
    { id: c2li3, campaignId: c2Id, serviceId: svcIds[4], serviceName: 'AI Video Generation', quantity: 2, rate: 6000, total: 12000, createdAt: new Date() }
  ]);
  await db.collection('deliverables').insertMany(c2Deliverables);

  // Campaign 3: Green Foods - Brand Refresh
  const c3Id = uuidv4();
  const c3li1 = uuidv4(), c3li2 = uuidv4(), c3li3 = uuidv4();
  const c3Deliverables = [];
  for (let i = 0; i < 6; i++) {
    c3Deliverables.push({ id: uuidv4(), campaignId: c3Id, lineItemId: c3li1, serviceName: 'Static Post Design', unitIndex: i+1, status: i < 3 ? 'delivered' : 'in_progress', proofUrl: i < 3 ? 'https://facebook.com/greenfoods/post' + (i+1) : '', assignedTo: memberId, rate: 1600, createdAt: new Date(), updatedAt: new Date() });
  }
  for (let i = 0; i < 2; i++) {
    c3Deliverables.push({ id: uuidv4(), campaignId: c3Id, lineItemId: c3li2, serviceName: 'Video Editing', unitIndex: i+1, status: i === 0 ? 'in_progress' : 'pending', proofUrl: '', assignedTo: memberId, rate: 4000, createdAt: new Date(), updatedAt: new Date() });
  }
  for (let i = 0; i < 3; i++) {
    c3Deliverables.push({ id: uuidv4(), campaignId: c3Id, lineItemId: c3li3, serviceName: 'SEO Activities', unitIndex: i+1, status: 'pending', proofUrl: '', assignedTo: memberId, rate: 3000, createdAt: new Date(), updatedAt: new Date() });
  }
  const c3Earned = c3Deliverables.filter(d => d.status === 'delivered').reduce((s,d) => s+d.rate, 0);

  await db.collection('campaigns').insertOne({ id: c3Id, organizationId: orgId, clientId: clientIds[2], clientName: 'Green Foods Co', name: 'Green Foods - Brand Refresh', type: 'custom', status: 'active', startDate: '2025-05-15', endDate: '2025-08-15', assignedTo: [memberId], totalProjected: 26600, totalEarned: c3Earned, createdAt: new Date('2025-05-15'), updatedAt: new Date() });
  await db.collection('line_items').insertMany([
    { id: c3li1, campaignId: c3Id, serviceId: svcIds[0], serviceName: 'Static Post Design', quantity: 6, rate: 1600, total: 9600, createdAt: new Date() },
    { id: c3li2, campaignId: c3Id, serviceId: svcIds[2], serviceName: 'Video Editing', quantity: 2, rate: 4000, total: 8000, createdAt: new Date() },
    { id: c3li3, campaignId: c3Id, serviceId: svcIds[5], serviceName: 'SEO Activities', quantity: 3, rate: 3000, total: 9000, createdAt: new Date() }
  ]);
  await db.collection('deliverables').insertMany(c3Deliverables);

  // Activity logs
  await db.collection('activity_logs').insertMany([
    { id: uuidv4(), organizationId: orgId, userId: adminId, userName: 'Rafiq Ahmed', action: 'created', entityType: 'campaign', entityId: c1Id, details: 'Created campaign "Tech Solutions - Q2 Social Media"', createdAt: new Date('2025-04-01') },
    { id: uuidv4(), organizationId: orgId, userId: adminId, userName: 'Rafiq Ahmed', action: 'created', entityType: 'campaign', entityId: c2Id, details: 'Created campaign "Fashion Forward - Summer Launch"', createdAt: new Date('2025-05-01') },
    { id: uuidv4(), organizationId: orgId, userId: adminId, userName: 'Rafiq Ahmed', action: 'created', entityType: 'campaign', entityId: c3Id, details: 'Created campaign "Green Foods - Brand Refresh"', createdAt: new Date('2025-05-15') },
    { id: uuidv4(), organizationId: orgId, userId: memberId, userName: 'Nusrat Jahan', action: 'updated', entityType: 'deliverable', entityId: uuidv4(), details: 'Delivered 6 Static Posts for Tech Solutions', createdAt: new Date('2025-05-20') },
    { id: uuidv4(), organizationId: orgId, userId: memberId, userName: 'Nusrat Jahan', action: 'updated', entityType: 'deliverable', entityId: uuidv4(), details: 'Delivered 8 Static Posts for Fashion Forward', createdAt: new Date('2025-06-01') }
  ]);

  return json({ success: true, message: 'Seed data created', credentials: { admin: { email: 'admin@agency.com', password: 'admin123' }, teamMember: { email: 'member@agency.com', password: 'member123' } } });
}

// ============ MAIN HANDLERS ============
async function handleRequest(request, pathSegments, method) {
  const [resource, id, subResource] = pathSegments;
  try {
    switch (resource) {
      case 'auth': return await handleAuth(request, id, method);
      case 'clients': return await handleClients(request, id, method);
      case 'services': return await handleServices(request, id, method);
      case 'campaigns': return await handleCampaigns(request, id, method);
      case 'deliverables': return await handleDeliverables(request, id, method);
      case 'dashboard': return await handleDashboard(request, id, method);
      case 'team': return await handleTeam(request, id, method);
      case 'seed': return await handleSeed(request, method);
      default: return json({ status: 'Campaign Tracker API running', version: '1.0' });
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
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
