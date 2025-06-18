// api/alexa-webhook.js
// Vercel serverless function to handle Alexa webhooks

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { credential } from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  initializeApp({
    credential: credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
}

const db = getFirestore();

// Request verification (Alexa or IFTTT)
function verifyRequest(req) {
  // Allow IFTTT requests (they come from known IPs)
  const userAgent = req.headers['user-agent'] || '';
  if (userAgent.includes('IFTTT')) {
    return true;
  }
  
  // For Alexa requests, check API key
  return req.headers['x-api-key'] === process.env.ALEXA_API_KEY;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-api-key');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify request is from Alexa or IFTTT
  if (!verifyRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { eventType, sessionId, familyId, data, timestamp } = req.body;

    if (!sessionId || !familyId || !eventType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const eventTime = timestamp ? new Date(timestamp) : new Date();

    switch (eventType) {
      case 'bark_detected':
        await handleBarkEvent(sessionId, familyId, data, eventTime);
        break;
      
      case 'motion_detected':
        await handleMotionEvent(sessionId, familyId, data, eventTime);
        break;
      
      case 'sound_level':
        await handleSoundLevel(sessionId, familyId, data, eventTime);
        break;
      
      case 'session_start':
        await handleSessionStart(sessionId, familyId, data, eventTime);
        break;
      
      case 'session_end':
        await handleSessionEnd(sessionId, familyId, data, eventTime);
        break;
      
      default:
        return res.status(400).json({ error: 'Unknown event type' });
    }

    res.status(200).json({ success: true, message: 'Event processed' });
  } catch (error) {
    console.error('Error processing Alexa webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleBarkEvent(sessionId, familyId, data, eventTime) {
  const { intensity = 'moderate', confidence = 0.8, duration = 1 } = data || {};
  
  // Store bark event
  await db.collection('alexaBarkEvents').add({
    sessionId,
    familyId,
    timestamp: Timestamp.fromDate(eventTime),
    intensity,
    confidence,
    duration,
    createdAt: Timestamp.now()
  });

  // Update session with real-time bark data
  const sessionRef = db.collection('dogLeaveSessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();
  
  if (sessionDoc.exists) {
    const sessionData = sessionDoc.data();
    const currentBarkEvents = sessionData.alexaMonitoring?.barkEvents || [];
    
    const newBarkEvent = {
      timestamp: eventTime,
      intensity,
      confidence,
      duration
    };

    await sessionRef.update({
      'alexaMonitoring.barkEvents': [...currentBarkEvents, newBarkEvent],
      'alexaMonitoring.lastBarkTime': Timestamp.fromDate(eventTime),
      'alexaMonitoring.totalBarks': currentBarkEvents.length + 1,
      updatedAt: Timestamp.now()
    });
  }
}

async function handleMotionEvent(sessionId, familyId, data, eventTime) {
  const { level = 'moderate', confidence = 0.8, duration = 1 } = data || {};
  
  // Store motion event
  await db.collection('alexaMotionEvents').add({
    sessionId,
    familyId,
    timestamp: Timestamp.fromDate(eventTime),
    level,
    confidence,
    duration,
    createdAt: Timestamp.now()
  });

  // Update session with real-time motion data
  const sessionRef = db.collection('dogLeaveSessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();
  
  if (sessionDoc.exists) {
    const sessionData = sessionDoc.data();
    const currentMotionEvents = sessionData.alexaMonitoring?.motionEvents || [];
    
    const newMotionEvent = {
      timestamp: eventTime,
      level,
      confidence,
      duration
    };

    await sessionRef.update({
      'alexaMonitoring.motionEvents': [...currentMotionEvents, newMotionEvent],
      'alexaMonitoring.lastMotionTime': Timestamp.fromDate(eventTime),
      'alexaMonitoring.totalMotion': currentMotionEvents.length + 1,
      updatedAt: Timestamp.now()
    });
  }
}

async function handleSoundLevel(sessionId, familyId, data, eventTime) {
  const { level = 0, type = 'ambient' } = data || {};
  
  // Store sound level reading
  await db.collection('alexaSoundLevels').add({
    sessionId,
    familyId,
    timestamp: Timestamp.fromDate(eventTime),
    level,
    type,
    createdAt: Timestamp.now()
  });
}

async function handleSessionStart(sessionId, familyId, data, eventTime) {
  const sessionRef = db.collection('dogLeaveSessions').doc(sessionId);
  
  await sessionRef.update({
    alexaMonitoring: {
      isActive: true,
      startTime: Timestamp.fromDate(eventTime),
      barkEvents: [],
      motionEvents: [],
      totalBarks: 0,
      totalMotion: 0,
      averageSoundLevel: 0
    },
    updatedAt: Timestamp.now()
  });
}

async function handleSessionEnd(sessionId, familyId, data, eventTime) {
  const sessionRef = db.collection('dogLeaveSessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();
  
  if (sessionDoc.exists) {
    const sessionData = sessionDoc.data();
    const alexaData = sessionData.alexaMonitoring || {};
    
    // Calculate analytics
    const barkEvents = alexaData.barkEvents || [];
    const motionEvents = alexaData.motionEvents || [];
    
    const totalBarkingMinutes = barkEvents.reduce((sum, event) => sum + (event.duration || 1), 0);
    const averageLoudness = barkEvents.length > 0 
      ? barkEvents.reduce((sum, event) => {
          const intensityMap = { light: 0.3, moderate: 0.6, heavy: 1.0 };
          return sum + (intensityMap[event.intensity] || 0.6);
        }, 0) / barkEvents.length
      : 0;
    
    const totalMotionMinutes = motionEvents.reduce((sum, event) => sum + (event.duration || 1), 0);
    
    // Calculate anxiety score (0-10, lower is better)
    let anxietyScore = 0;
    anxietyScore += Math.min(barkEvents.length * 0.5, 5); // Max 5 points for barking
    anxietyScore += Math.min(totalMotionMinutes * 0.1, 3); // Max 3 points for motion
    anxietyScore += Math.min(totalBarkingMinutes * 0.2, 2); // Max 2 points for duration
    anxietyScore = Math.min(anxietyScore, 10);
    
    // Calculate calm periods (times with no barking for 10+ minutes)
    const calmPeriods = calculateCalmPeriods(barkEvents, sessionData.departureTime, eventTime);
    
    await sessionRef.update({
      'alexaMonitoring.isActive': false,
      'alexaMonitoring.endTime': Timestamp.fromDate(eventTime),
      'alexaMonitoring.totalBarkingMinutes': totalBarkingMinutes,
      'alexaMonitoring.averageLoudness': averageLoudness,
      'alexaMonitoring.totalMotionMinutes': totalMotionMinutes,
      'alexaMonitoring.anxietyScore': anxietyScore,
      'alexaMonitoring.calmPeriods': calmPeriods,
      updatedAt: Timestamp.now()
    });
  }
}

function calculateCalmPeriods(barkEvents, startTime, endTime) {
  if (barkEvents.length === 0) {
    return [{
      start: startTime,
      end: endTime
    }];
  }

  const calmPeriods = [];
  const sortedEvents = barkEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  let lastEventTime = new Date(startTime);
  
  sortedEvents.forEach(event => {
    const eventTime = new Date(event.timestamp);
    const gapMinutes = (eventTime - lastEventTime) / (1000 * 60);
    
    if (gapMinutes >= 10) {
      calmPeriods.push({
        start: lastEventTime,
        end: eventTime
      });
    }
    
    lastEventTime = eventTime;
  });
  
  // Check for calm period after last event
  const finalGapMinutes = (new Date(endTime) - lastEventTime) / (1000 * 60);
  if (finalGapMinutes >= 10) {
    calmPeriods.push({
      start: lastEventTime,
      end: new Date(endTime)
    });
  }
  
  return calmPeriods;
}